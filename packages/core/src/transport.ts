import type { TransportEventMap } from './events/event-types'
import type { Sequence } from './sequence'
import { TypedEventEmitter } from './events/typed-event-emitter'
import { WorkerTimer } from './utils/worker-timer'

/**
 * Interface for BeatTracks that can sync to a Transport.
 * Provides the contract Transport needs without unsafe casts.
 * @internal
 */
export interface SyncableBeatTrack {
  /** The beats array for determining loop length. */
  beats: readonly { active: boolean }[]
  /** Note type this track syncs at (e.g., 1/4 for quarter notes). */
  _syncNoteType: number
  /** Schedule a single beat at the given audio time. */
  _scheduleBeatFromTransport: (beatIndex: number, time: number) => void
}

/**
 * Configuration options for creating a Transport.
 */
export interface TransportOptions {
  /** Tempo in beats per minute. Must be > 0. */
  bpm: number
  /** Time signature as [beatsPerBar, beatUnit]. Default: [4, 4] */
  timeSignature?: [number, number]
  /** Number of ticks per beat for position resolution. Default: 4 (16th note resolution) */
  ticksPerBeat?: number
}

/**
 * Musical time position reported by the Transport.
 */
export interface TransportPosition {
  /** Current bar number (1-indexed) */
  bar: number
  /** Current beat within the bar (1-indexed) */
  beat: number
  /** Current tick within the beat (0-indexed) */
  tick: number
  /** Elapsed time in seconds since playback started */
  seconds: number
}

/**
 * State tracked per synced BeatTrack for Transport-driven scheduling.
 * @internal
 */
interface SyncedTrackState {
  track: SyncableBeatTrack
  nextBeatTime: number
  currentBeatIndex: number
}

/**
 * Format a TransportPosition as a "bar:beat:tick" string.
 *
 * @example
 * ```typescript
 * formatPosition({ bar: 1, beat: 3, tick: 2, seconds: 1.5 })
 * // Returns "1:3:2"
 * ```
 */
export function formatPosition(pos: TransportPosition): string {
  return `${pos.bar}:${pos.beat}:${pos.tick}`
}

/**
 * Global Transport clock for multi-track synchronization.
 *
 * Transport provides a Worker-backed clock that multiple BeatTracks can lock to,
 * enabling perfect multi-track synchronization that survives background tab throttling.
 * It manages tempo, time signature, position tracking, and lifecycle events.
 *
 * @example
 * ```typescript
 * import { createTransport, createBeatTrack } from 'ez-web-audio'
 *
 * const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })
 * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 4 })
 * const hihat = await createBeatTrack(['hihat.mp3'], { numBeats: 16 })
 *
 * kick.setPattern([1, 0, 1, 0])
 * hihat.setPattern([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
 *
 * kick.syncTo(transport, { noteType: 1/4 })
 * hihat.syncTo(transport, { noteType: 1/16 })
 *
 * transport.on('tick', (e) => {
 *   console.log(`Position: ${e.detail.bar}:${e.detail.beat}:${e.detail.tick}`)
 * })
 *
 * transport.start()
 * ```
 */
export class Transport extends TypedEventEmitter<TransportEventMap> {
  private audioContext: AudioContext
  private workerTimer: WorkerTimer

  // Tempo and time signature
  private _bpm: number
  private _timeSignature: [number, number]
  private _ticksPerBeat: number

  // Playback state
  private _playing = false
  private _paused = false
  private _disposed = false

  // Scheduler state
  private scheduleAheadTime = 0.1 // 100ms lookahead
  private nextTickTime = 0
  private currentTickIndex = 0
  private startTime = 0

  // Position cache
  private _position: TransportPosition = { bar: 1, beat: 1, tick: 0, seconds: 0 }

  // Synced tracks
  private _syncedTracks: Set<SyncableBeatTrack> = new Set()
  private trackStates: Map<SyncableBeatTrack, SyncedTrackState> = new Map()
  private _tracksCache: readonly SyncableBeatTrack[] | null = null

  // Synced sequences
  private _syncedSequences: Set<Sequence> = new Set()

  // Pause state
  private pausedTickIndex = 0
  private pausedElapsed = 0

  constructor(audioContext: AudioContext, options: TransportOptions) {
    super()
    if (options.bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${options.bpm}`)
    }

    this.audioContext = audioContext
    this._bpm = options.bpm
    this._timeSignature = options.timeSignature ?? [4, 4]
    this._ticksPerBeat = options.ticksPerBeat ?? 4
    this.workerTimer = new WorkerTimer()
  }

  // ─── Getters / Setters ────────────────────────────────────────────

  /** Current tempo in beats per minute. Can be changed during playback. */
  get bpm(): number {
    return this._bpm
  }

  set bpm(value: number) {
    if (value <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${value}`)
    }
    this._bpm = value
  }

  /** Time signature as [beatsPerBar, beatUnit]. */
  get timeSignature(): [number, number] {
    return this._timeSignature
  }

  /** Number of ticks per beat (position resolution). */
  get ticksPerBeat(): number {
    return this._ticksPerBeat
  }

  /** Current playback position in musical time. */
  get position(): TransportPosition {
    return { ...this._position }
  }

  /** Whether the Transport is currently playing. */
  get playing(): boolean {
    return this._playing
  }

  /** Whether the Transport is currently paused. */
  get paused(): boolean {
    return this._paused
  }

  /** Read-only array of BeatTracks currently synced to this Transport. Cached for performance. */
  get tracks(): readonly SyncableBeatTrack[] {
    if (!this._tracksCache) {
      this._tracksCache = Object.freeze([...this._syncedTracks])
    }
    return this._tracksCache
  }

  // ─── Lifecycle ────────────────────────────────────────────────────

  /**
   * Start playback. Begins the Worker-driven scheduler and starts all synced tracks.
   * No-op if already playing.
   */
  start(): void {
    if (this._disposed) {
      throw new Error('Transport has been disposed')
    }
    if (this._playing)
      return

    if (this._paused) {
      // Resume from paused state
      this.currentTickIndex = this.pausedTickIndex
      this.startTime = this.audioContext.currentTime - this.pausedElapsed
      this._paused = false

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
      })

      // Resume sequences from paused position
      for (const seq of this._syncedSequences) {
        seq._onTransportResume(this.audioContext.currentTime, this.pausedElapsed)
      }
    }
    else {
      // Fresh start
      this.currentTickIndex = 0
      this.startTime = this.audioContext.currentTime
      this._position = { bar: 1, beat: 1, tick: 0, seconds: 0 }

      this.emit('start', {
        time: this.audioContext.currentTime,
        source: this,
      })

      // Notify sequences of fresh start
      for (const seq of this._syncedSequences) {
        seq._onTransportStart(this.audioContext.currentTime)
      }
    }

    this.nextTickTime = this.audioContext.currentTime
    this._playing = true

    // Initialize track states for all synced tracks
    for (const track of this._syncedTracks) {
      if (!this.trackStates.has(track)) {
        this.trackStates.set(track, {
          track,
          nextBeatTime: this.audioContext.currentTime,
          currentBeatIndex: 0,
        })
      }
    }

    this.workerTimer.start(() => this.schedulerTick())
  }

  /**
   * Pause playback. Freezes position for later resume via start().
   * No-op if not playing or already paused.
   */
  pause(): void {
    if (!this._playing || this._paused)
      return

    this.workerTimer.stop()
    this._playing = false
    this._paused = true

    this.pausedTickIndex = this.currentTickIndex
    this.pausedElapsed = this.audioContext.currentTime - this.startTime

    // Pause sequences (preserve position)
    for (const seq of this._syncedSequences) {
      seq._onTransportPause(this.audioContext.currentTime)
    }

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Stop playback and reset position to the beginning.
   */
  stop(): void {
    const wasPlaying = this._playing || this._paused

    this.workerTimer.stop()
    this._playing = false
    this._paused = false

    // Reset position
    this.currentTickIndex = 0
    this.nextTickTime = 0
    this.startTime = 0
    this.pausedTickIndex = 0
    this.pausedElapsed = 0
    this._position = { bar: 1, beat: 1, tick: 0, seconds: 0 }

    // Reset all track states
    for (const state of this.trackStates.values()) {
      state.currentBeatIndex = 0
      state.nextBeatTime = 0
    }

    // Reset all sequences to beginning
    for (const seq of this._syncedSequences) {
      seq._reset()
    }

    if (wasPlaying) {
      this.emit('stop', {
        time: this.audioContext.currentTime,
        source: this,
      })
    }
  }

  /**
   * Dispose the Transport, terminating the Worker and releasing all resources.
   * After disposal, the Transport should not be used.
   */
  dispose(): void {
    this.stop()
    this.workerTimer.dispose()

    // Unsync all tracks
    for (const track of [...this._syncedTracks]) {
      this._removeTrack(track)
    }

    // Remove all sequences
    for (const seq of [...this._syncedSequences]) {
      this._removeSequence(seq)
    }

    this._tracksCache = null
    this._disposed = true
  }

  // ─── Track Management (package-internal) ──────────────────────────

  /**
   * Register a BeatTrack as synced to this Transport.
   * Called by BeatTrack.syncTo().
   * @internal
   */
  _addTrack(track: SyncableBeatTrack): void {
    if (this._syncedTracks.has(track))
      return
    this._syncedTracks.add(track)
    this._tracksCache = null // Invalidate cache

    if (this._playing) {
      // Hot add: calculate next beat boundary for this track's noteType
      const noteType = track._syncNoteType
      const beatDuration = (240 * noteType) / this._bpm
      const elapsed = this.audioContext.currentTime - this.startTime
      const beatProgress = elapsed % beatDuration
      const nextBeatTime = beatProgress < 0.001
        ? this.audioContext.currentTime
        : this.audioContext.currentTime + (beatDuration - beatProgress)

      this.trackStates.set(track, {
        track,
        nextBeatTime,
        currentBeatIndex: 0,
      })
    }
  }

  /**
   * Unregister a BeatTrack from this Transport.
   * Called by BeatTrack.unsync().
   * @internal
   */
  _removeTrack(track: SyncableBeatTrack): void {
    this._syncedTracks.delete(track)
    this.trackStates.delete(track)
    this._tracksCache = null // Invalidate cache
  }

  // ─── Sequence Management (package-internal) ────────────────────────

  /**
   * Register a Sequence as synced to this Transport.
   * Called by Sequence constructor.
   * @internal
   */
  _addSequence(sequence: Sequence): void {
    if (this._syncedSequences.has(sequence))
      return
    this._syncedSequences.add(sequence)

    if (this._playing) {
      sequence._onTransportStart(this.audioContext.currentTime)
    }
  }

  /**
   * Unregister a Sequence from this Transport.
   * Called by Sequence.dispose().
   * @internal
   */
  _removeSequence(sequence: Sequence): void {
    this._syncedSequences.delete(sequence)
  }

  // ─── Scheduler ────────────────────────────────────────────────────

  /**
   * Lookahead scheduler tick. Called by WorkerTimer at regular intervals.
   * Schedules Transport ticks and synced track beats within the lookahead window.
   * @internal
   */
  private schedulerTick(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule Transport's own ticks (position tracking + tick events)
    while (this.nextTickTime < currentTime + this.scheduleAheadTime) {
      this.processTickAt(this.nextTickTime)
      this.advancePosition()
    }

    // Schedule each synced track's beats within lookahead window
    for (const state of this.trackStates.values()) {
      const noteType = state.track._syncNoteType
      const beatDuration = (240 * noteType) / this._bpm
      while (state.nextBeatTime < currentTime + this.scheduleAheadTime) {
        state.track._scheduleBeatFromTransport(state.currentBeatIndex, state.nextBeatTime)
        state.nextBeatTime += beatDuration
        state.currentBeatIndex = (state.currentBeatIndex + 1) % state.track.beats.length
      }
    }

    // Schedule sequence events within lookahead window
    for (const sequence of this._syncedSequences) {
      sequence._scheduleEventsInWindow(
        currentTime,
        this.scheduleAheadTime,
        this._bpm,
        this._timeSignature,
        this._ticksPerBeat,
      )
    }
  }

  /**
   * Process a single tick — emit tick event with current position.
   * @internal
   */
  private processTickAt(_time: number): void {
    this.emit('tick', {
      bar: this._position.bar,
      beat: this._position.beat,
      tick: this._position.tick,
      seconds: this._position.seconds,
      source: this,
    })
  }

  /**
   * Advance the internal position by one tick.
   * @internal
   */
  private advancePosition(): void {
    const tickDuration = 60 / (this._bpm * this._ticksPerBeat)
    this.nextTickTime += tickDuration
    this.currentTickIndex++

    // Derive bar/beat/tick from absolute tick count
    const beatsPerBar = this._timeSignature[0]
    const ticksPerBar = beatsPerBar * this._ticksPerBeat
    const bar = Math.floor(this.currentTickIndex / ticksPerBar) + 1
    const beatInBar = Math.floor((this.currentTickIndex % ticksPerBar) / this._ticksPerBeat) + 1
    const tickInBeat = this.currentTickIndex % this._ticksPerBeat

    this._position = {
      bar,
      beat: beatInBar,
      tick: tickInBeat,
      seconds: this.nextTickTime - this.startTime,
    }
  }
}

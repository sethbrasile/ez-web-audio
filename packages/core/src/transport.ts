import type { TransportEventMap } from './events/event-types'
import type { Sequence } from './sequence'
import type { MusicalTimeNotation } from './utils/musical-time'
import { TypedEventEmitter } from './events/typed-event-emitter'
import { musicalTimeToBeats } from './utils/musical-time'
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
  /** Absolute steps scheduled for this track since Transport start. Never wraps. */
  stepCount: number
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

  // Swing
  private _swing = 0
  private _swingSubdivision = 1 / 16

  // Loop region
  private _loop = false
  private _loopStartBeats = 0
  private _loopEndBeats = 0 // 0 = unset
  private loopIteration = 0

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

  /**
   * Swing amount (0–1). 0 = straight; 1 = full triplet feel — every other
   * swing subdivision is delayed to the triplet position. Applies to synced
   * BeatTrack beats and Sequence events that land exactly on an odd
   * subdivision; position/tick events are unaffected. Live-changeable —
   * safe to set while the Transport is playing.
   *
   * For synced Sequences, event positions are sequence-relative rather than
   * transport-absolute. Swing parity is only guaranteed correct when the
   * Sequence starts on a bar boundary and its length is a whole, even
   * number of subdivisions — true for all `Nm` (measure) lengths.
   *
   * Default: 0
   *
   * @example
   * ```typescript
   * transport.swing = 0.55 // MPC-style swing feel
   * ```
   */
  get swing(): number {
    return this._swing
  }

  set swing(value: number) {
    if (value < 0 || value > 1) {
      throw new Error(`swing must be between 0 and 1. Received: ${value}`)
    }
    this._swing = value
  }

  /**
   * The subdivision swing applies to: `1/8` (eighth notes) or `1/16`
   * (sixteenth notes, MPC-style).
   *
   * Default: 1/16
   *
   * @example
   * ```typescript
   * transport.swingSubdivision = 1 / 8
   * ```
   */
  get swingSubdivision(): number {
    return this._swingSubdivision
  }

  set swingSubdivision(value: number) {
    if (value !== 1 / 8 && value !== 1 / 16) {
      throw new Error(`swingSubdivision must be 1/8 or 1/16. Received: ${value}`)
    }
    this._swingSubdivision = value
  }

  /**
   * Whether the transport loops over the region [loopStart, loopEnd).
   * When enabled, position and synced-track pattern indices wrap at loopEnd
   * and a 'loop' event fires on each wrap. Sequences are not remapped — they
   * loop at their own length; give them the same length as the loop region
   * for lockstep. @default false
   *
   * The [loopStart, loopEnd) region is only validated (loopEnd must be
   * greater than loopStart) at the moment playback actually (re)starts —
   * see {@link start}. Setting `loop`, `loopStart`, or `loopEnd` to an
   * invalid combination while the Transport is already playing does NOT
   * throw immediately: playback silently continues without looping (as if
   * `loop` were false) until the next `start()`/resume, at which point an
   * invalid region throws.
   *
   * @example
   * ```typescript
   * transport.loopEnd = '2m'
   * transport.loop = true
   * ```
   */
  get loop(): boolean {
    return this._loop
  }

  set loop(value: boolean) {
    this._loop = value
  }

  /**
   * Loop region start. Set with musical notation (`'1m'`, `'2:1:0'`) or a
   * numeric beat count; reads back as beats. Not validated against
   * {@link loopEnd} until the next {@link start} call — see {@link loop}.
   * @default
   *
   * @example
   * ```typescript
   * transport.loopStart = '1m' // 4 beats in 4/4
   * ```
   */
  get loopStart(): number {
    return this._loopStartBeats
  }

  set loopStart(value: MusicalTimeNotation) {
    this._loopStartBeats = musicalTimeToBeats(value, this._timeSignature[0], this._ticksPerBeat)
  }

  /**
   * Loop region end. Set with musical notation (`'2m'`) or a numeric beat
   * count; reads back as beats. Must be greater than {@link loopStart} when
   * {@link loop} is enabled — validated only at the next {@link start} call,
   * not immediately on assignment; see {@link loop} for what happens to an
   * invalid region set while already playing.
   *
   * @example
   * ```typescript
   * transport.loopEnd = '2m' // 8 beats in 4/4
   * ```
   */
  get loopEnd(): number {
    return this._loopEndBeats
  }

  set loopEnd(value: MusicalTimeNotation) {
    this._loopEndBeats = musicalTimeToBeats(value, this._timeSignature[0], this._ticksPerBeat)
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
      if (this._loop && this._loopEndBeats <= this._loopStartBeats) {
        throw new Error('loopEnd must be greater than loopStart when loop is enabled')
      }
      this.currentTickIndex = this.pausedTickIndex
      this.startTime = this.audioContext.currentTime - this.pausedElapsed
      this._paused = false

      // Reset nextBeatTime for already-synced tracks to current time: their
      // pre-pause nextBeatTime is now in the past, and restoring it would
      // make schedulerTick()'s while-loop fire every beat missed during the
      // pause in a single burst. Mirrors BeatTrack.resume()'s identical fix
      // for the standalone (non-Transport) scheduling path. stepCount is
      // left untouched — pattern position resumes where it paused.
      for (const state of this.trackStates.values()) {
        state.nextBeatTime = this.audioContext.currentTime
      }

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
      if (this._loop && this._loopEndBeats <= this._loopStartBeats) {
        throw new Error('loopEnd must be greater than loopStart when loop is enabled')
      }
      this.currentTickIndex = 0
      this.startTime = this.audioContext.currentTime
      this._position = { bar: 1, beat: 1, tick: 0, seconds: 0 }
      this.loopIteration = 0

      // Unconditionally reset every existing trackStates entry. stop()
      // zeroes nextBeatTime/stepCount but does not delete the map entries
      // (so pause/resume can still find them); without this reset, a track
      // synced before a prior stop() would keep its now-stale
      // nextBeatTime=0 across this fresh start, and the shared init loop
      // below (which only touches entries NOT already in the map) would
      // skip it entirely. schedulerTick()'s while-loop would then replay
      // every step between 0 and "now" in a single burst (C2).
      for (const state of this.trackStates.values()) {
        state.nextBeatTime = this.audioContext.currentTime
        state.stepCount = 0
      }

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
          stepCount: 0,
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
    this.loopIteration = 0
    this._position = { bar: 1, beat: 1, tick: 0, seconds: 0 }

    // Reset all track states
    for (const state of this.trackStates.values()) {
      state.nextBeatTime = 0
      state.stepCount = 0
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

    // Release every registered listener now that the Transport is unusable
    this._clearListeners()
  }

  // ─── Track Management (package-internal) ──────────────────────────

  /**
   * Register a BeatTrack as synced to this Transport.
   * Called by BeatTrack.syncTo().
   *
   * Known limitation (R5 #6): a track hot-added while the Transport is
   * playing always starts its own `stepCount` at 0, aligned to its next
   * beat boundary — it does NOT derive a loop-relative step index from the
   * Transport's current position within an active loop region. If a loop
   * is active when the track is added, the new track's pattern position
   * will be out of phase with tracks that were synced before playback
   * started (which do wrap relative to the loop region — see the
   * scheduler's step-index wrap logic). Sync tracks before calling
   * {@link start} when using a loop region for lockstep phase.
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
        stepCount: 0,
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
   * Swing delay in seconds for an event at the given musical position (in
   * beats from transport start/loop origin). An event whose position lands
   * exactly (±1e-6) on an odd multiple of {@link swingSubdivision} is
   * delayed by `swing * subdivisionSeconds / 3` — at `swing = 1`, off-grid
   * subdivisions land on the triplet position. Off-grid positions and even
   * subdivisions are never delayed. Used by the scheduler and by synced
   * Sequences; position/tick events never call this — the playhead stays
   * on-grid.
   * @internal
   */
  _swingDelayFor(positionBeats: number): number {
    if (this._swing === 0)
      return 0
    const subdivisionBeats = 4 * this._swingSubdivision // 1/16 -> 0.25 beats
    const index = positionBeats / subdivisionBeats
    const nearest = Math.round(index)
    if (Math.abs(index - nearest) > 1e-6)
      return 0 // off-grid: never swung
    if (nearest % 2 === 0)
      return 0
    const subdivisionSeconds = (240 * this._swingSubdivision) / this._bpm
    return this._swing * subdivisionSeconds / 3
  }

  /**
   * Lookahead scheduler tick. Called by WorkerTimer at regular intervals.
   * Schedules Transport ticks and synced track beats within the lookahead window.
   * Any throw from user callbacks (track/sequence scheduling) is caught,
   * stops the Transport (so the WorkerTimer interval doesn't keep firing
   * against dead state forever), and is reported via an 'error' event
   * instead of propagating out of the timer callback.
   * @internal
   */
  private schedulerTick(): void {
    try {
      this.schedulerTickBody()
    }
    catch (error) {
      const time = this.audioContext.currentTime
      this.stop()
      this.emit('error', { error, time, source: this })
    }
  }

  private schedulerTickBody(): void {
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
      const noteTypeBeats = 4 * noteType // musical beats per step
      while (state.nextBeatTime < currentTime + this.scheduleAheadTime) {
        let positionBeats = state.stepCount * noteTypeBeats
        if (this._loop && this._loopEndBeats > this._loopStartBeats && positionBeats >= this._loopStartBeats) {
          // Wrap using integer step counts on THIS track's own step grid,
          // not a beats-based modulo + Math.round round-trip (M1). When
          // loopEnd-loopStart isn't an exact multiple of the track's step
          // duration, the beats-based wrap lands positionBeats between
          // step boundaries, and rounding back to a step index then
          // repeats or skips steps (e.g. 0,1,2,3,1,2,3,0,...). Snapping
          // the loop boundaries to this track's step grid and wrapping in
          // step-index space keeps the pattern index exact. Tracks with
          // different noteTypes may therefore loop at a slightly
          // different musical instant near the boundary; each stays
          // internally consistent with itself.
          const loopStartStep = Math.round(this._loopStartBeats / noteTypeBeats)
          const loopEndStep = Math.round(this._loopEndBeats / noteTypeBeats)
          const loopLenSteps = Math.max(1, loopEndStep - loopStartStep)
          const stepIndex = Math.round(positionBeats / noteTypeBeats)
          const wrappedStep = loopStartStep + (((stepIndex - loopStartStep) % loopLenSteps) + loopLenSteps) % loopLenSteps
          positionBeats = wrappedStep * noteTypeBeats
        }
        const patternIndex = Math.round(positionBeats / noteTypeBeats) % state.track.beats.length
        const swingDelay = this._swingDelayFor(positionBeats)
        state.track._scheduleBeatFromTransport(patternIndex, state.nextBeatTime + swingDelay)
        state.nextBeatTime += beatDuration
        state.stepCount++
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

    if (this._loop && this._loopEndBeats > this._loopStartBeats) {
      const loopStartTick = Math.round(this._loopStartBeats * this._ticksPerBeat)
      const loopEndTick = Math.round(this._loopEndBeats * this._ticksPerBeat)
      if (this.currentTickIndex >= loopEndTick) {
        this.currentTickIndex = loopStartTick
        this.loopIteration++
        this.emit('loop', {
          iteration: this.loopIteration,
          time: this.nextTickTime,
          source: this,
        })
      }
    }

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

import type { BeatTrackEventMap } from './events/event-types'
import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import type { SamplerOptions } from './sampler'
import type { Transport } from './transport'
import { Beat } from './beat'
import { Sampler } from './sampler'
import audioContextAwareTimeout from './utils/timeout'
import { WorkerTimer } from './utils/worker-timer'

export interface BeatTrackOptions extends SamplerOptions {
  numBeats?: number
  duration?: number
  /**
   * @method wrapWith
   * wrapWith allows you to run a function on each beat as it is created
   * This function must accept a beat and return a beat. An example use-case
   * appears in the docs site in the "Multisampled Drum Machine" example where
   * this method is used to wrap each beat in an nx-js observable proxy.
   *
   * @param beat
   * @returns
   */
  wrapWith?: (beat: Beat) => Beat
}

/**
 * Drum machine lane with rhythmic beat patterns.
 *
 * BeatTrack manages an array of Beat instances for creating drum patterns.
 * It extends Sampler for round-robin sample variation and adds tempo-synced
 * playback with beat events for visual synchronization.
 *
 * @example
 * ```typescript
 * import { createBeatTrack } from 'ez-web-audio'
 *
 * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 8 })
 *
 * // Set a basic 4-on-the-floor pattern
 * kick.beats[0].active = true  // beat 1
 * kick.beats[2].active = true  // beat 3
 * kick.beats[4].active = true  // beat 5
 * kick.beats[6].active = true  // beat 7
 *
 * kick.playBeats(120, 1/4) // Play quarter notes at 120 BPM
 *
 * // Listen for beat events
 * kick.on('beat', (e) => {
 *   console.log(`Beat ${e.detail.beatIndex}`)
 * })
 * ```
 */
export class BeatTrack extends Sampler {
  /**
   * BeatTrack uses its own EventTarget rather than TypedEventEmitter because
   * BeatTrack extends Sampler (for round-robin sample playback), not BaseSound.
   * TypedEventEmitter is mixed into BaseSound's inheritance chain, but BeatTrack
   * cannot extend both Sampler and TypedEventEmitter. Composition via a private
   * EventTarget achieves typed events without multiple inheritance.
   *
   * Event handler signatures use CustomEvent with .detail (standard DOM pattern)
   * matching BeatTrackEventMap types.
   * @internal
   */
  private eventTarget: EventTarget = new EventTarget()

  // Lookahead scheduler state
  private scheduleAheadTime = 0.1 // 100ms lookahead
  private workerTimer: WorkerTimer = new WorkerTimer()
  private nextBeatTime = 0
  private currentBeatIndex = 0
  private currentTempo: number = 120
  private noteType: number = 1 / 4

  // Play mode flag: true = play all beats unconditionally, false = play only active beats
  private _playAllBeats = false

  // Pause state
  private pausedBeatIndex: number | null = null

  // Beat cache (replaces module-level WeakMap for framework proxy compatibility)
  private _beats: Beat[] = []

  // Sync state
  private _syncedTo: Transport | null = null

  /**
   * The note type this track was synced with (e.g., 1/4, 1/8, 1/16).
   * Used by Transport to calculate beat duration.
   * @internal
   */
  _syncNoteType: number = 1 / 4

  /**
   * Whether this track is muted. When muted, beat scheduling continues
   * (events still fire for UI sync) but audio playback is silenced.
   */
  public muted = false

  /**
   * Whether this track is soloed. Solo is stackable — when any synced track
   * has solo=true, only soloed tracks produce audio. When no tracks are soloed,
   * all unmuted tracks produce audio.
   */
  public solo = false

  // AudioContext-aware setTimeout for precise event timing
  private acTimeout: (fn: () => void, delayMillis: number) => number

  constructor(private audioContext: AudioContext, sounds: (Playable & Connectable)[], opts?: BeatTrackOptions) {
    super(sounds, opts)
    const { setTimeout } = audioContextAwareTimeout(audioContext)
    this.acTimeout = setTimeout
    if (opts?.numBeats) {
      this.numBeats = opts.numBeats
    }
    if (opts?.duration) {
      this.duration = opts.duration
    }
    if (opts?.wrapWith) {
      this.wrapWith = opts.wrapWith
    }
    if (this.numBeats <= 0) {
      throw new Error(`numBeats must be greater than 0. Received: ${this.numBeats}`)
    }
  }

  /**
   * Optional function to wrap each beat as it's created (e.g., with observables).
   * @internal
   */
  private wrapWith?: (beat: Beat) => Beat

  /**
   * Number of beats in this track.
   * @default 4
   */
  public numBeats = 4

  /**
   * How long (in milliseconds) the `isPlaying` flag stays true after a beat plays.
   * Useful for visual feedback in the UI.
   * @default 100
   */
  public duration = 100

  /**
   * Array of Beat instances in this track.
   *
   * The array length always matches `numBeats`. Beats are reused when the
   * count changes, preserving their `active` state.
   *
   * @example
   * ```typescript
   * // Toggle individual beats
   * track.beats[0].active = true
   * track.beats[1].active = false
   *
   * // Check all beat states
   * track.beats.forEach((beat, i) => {
   *   console.log(`Beat ${i}: ${beat.active ? 'on' : 'off'}`)
   * })
   * ```
   */
  public get beats(): Beat[] {
    if (this._beats.length >= this.numBeats) {
      return this._beats
    }

    const needed = this.numBeats - this._beats.length

    for (let i = 0; i < needed; i++) {
      const beat = new Beat(this.audioContext, {
        duration: this.duration,
        playIn: this.playIn.bind(this),
        play: this.play.bind(this),
      })

      this._beats.push(this.wrapWith ? this.wrapWith(beat) : beat)
    }

    return this._beats
  }

  /**
   * Set beat active states from a pattern array.
   *
   * Each element maps to a beat: truthy values (1, true) set the beat active,
   * falsy values (0, false) set it inactive. If the array is shorter than
   * the number of beats, remaining beats are set inactive. If longer, extra
   * values are ignored.
   *
   * @param pattern - Array of 0/1 or boolean values representing the beat pattern
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 8 })
   *
   * // 4-on-the-floor pattern
   * kick.setPattern([1, 0, 1, 0, 1, 0, 1, 0])
   *
   * // Shorter array — remaining beats inactive
   * kick.setPattern([1, 0, 1]) // beats 3-7 become inactive
   *
   * // Chainable
   * kick.setPattern([1, 0, 1, 0]).playActiveBeats(120, 1/4)
   * ```
   */
  public setPattern(pattern: (number | boolean)[]): this {
    const beats = this.beats
    for (let i = 0; i < beats.length; i++) {
      beats[i].active = i < pattern.length ? !!pattern[i] : false
    }
    return this
  }

  /**
   * Start playing all beats in the pattern continuously.
   *
   * Starts a lookahead scheduler that triggers beats at precise audio times.
   * Emits 'beat' events for UI synchronization.
   *
   * Unlike `playActiveBeats()`, this plays ALL beats regardless of their `active` flag.
   *
   * @param bpm - Tempo in beats per minute
   * @param noteType - Rhythmic subdivision as a fraction. Common values: 1/4 (quarter notes), 1/8 (eighth notes), 1/16 (sixteenth notes). The beat duration in seconds is calculated as: (240 * noteType) / bpm.
   *
   * @example
   * ```typescript
   * track.playBeats(120, 1/4)  // 120 BPM, quarter notes — all beats play
   * track.playBeats(140, 1/8)  // 140 BPM, eighth notes
   * ```
   */
  public playBeats(bpm: number, noteType: number): void {
    this.guardSynced('playBeats')
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    if (noteType <= 0) {
      throw new Error(`noteType must be greater than 0. Received: ${noteType}`)
    }
    this._playAllBeats = true
    this.currentTempo = bpm
    this.noteType = noteType
    this.nextBeatTime = this.audioContext.currentTime
    this.currentBeatIndex = 0
    this.scheduler()
  }

  /**
   * Start playing only active beats in the pattern continuously.
   *
   * Same as playBeats(), but only plays beats where `active === true`.
   * Inactive beats become rests (silence), maintaining timing.
   *
   * @param bpm - Tempo in beats per minute
   * @param noteType - Rhythmic subdivision as a fraction. Common values: 1/4 (quarter notes), 1/8 (eighth notes), 1/16 (sixteenth notes). The beat duration in seconds is calculated as: (240 * noteType) / bpm.
   *
   * @example
   * ```typescript
   * // Set up a pattern with rests
   * track.beats[0].active = true
   * track.beats[2].active = true
   * track.playActiveBeats(120, 1/4)  // Only beats 0 and 2 play
   * ```
   */
  public playActiveBeats(bpm: number, noteType: number): void {
    this.guardSynced('playActiveBeats')
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    if (noteType <= 0) {
      throw new Error(`noteType must be greater than 0. Received: ${noteType}`)
    }
    this._playAllBeats = false
    this.currentTempo = bpm
    this.noteType = noteType
    this.nextBeatTime = this.audioContext.currentTime
    this.currentBeatIndex = 0
    this.scheduler()
  }

  /**
   * Stop playback and reset to the beginning.
   *
   * Emits a 'stop' event. Use pause() instead if you want to resume later.
   *
   * @example
   * ```typescript
   * track.stop()
   * track.on('stop', () => console.log('Stopped'))
   * ```
   */
  public stop(): void {
    this.guardSynced('stop')
    this.internalStop()
  }

  /**
   * Pause playback at the current position.
   *
   * Emits a 'pause' event with the current beat index.
   * Use resume() to continue from where you left off.
   *
   * @example
   * ```typescript
   * track.pause()
   * // later...
   * track.resume()
   * ```
   */
  public pause(): void {
    this.guardSynced('pause')
    this.workerTimer.stop()

    this.pausedBeatIndex = this.currentBeatIndex

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
      beatIndex: this.currentBeatIndex,
    })
  }

  /**
   * Resume playback from where it was paused.
   *
   * Emits a 'resume' event with the beat index where playback resumes.
   * Has no effect if not paused.
   *
   * @example
   * ```typescript
   * track.pause()
   * // ...user clicks play button...
   * track.resume() // continues from paused position
   * ```
   */
  public resume(): void {
    this.guardSynced('resume')
    if (this.pausedBeatIndex !== null) {
      this.currentBeatIndex = this.pausedBeatIndex
      // Reset nextBeatTime to current time to prevent scheduler catch-up:
      // pausedBeatTime is in the past; restoring it would cause hundreds of beats to fire immediately
      this.nextBeatTime = this.audioContext.currentTime

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        beatIndex: this.currentBeatIndex,
      })

      this.scheduler()

      this.pausedBeatIndex = null
    }
  }

  /**
   * Change the tempo while playing.
   *
   * The new tempo takes effect on the next scheduled beat.
   *
   * @param bpm - New tempo in beats per minute
   *
   * @example
   * ```typescript
   * track.playBeats(120, 1/4)
   * // later, speed up...
   * track.setTempo(140)
   * ```
   */
  public setTempo(bpm: number): void {
    this.guardSynced('setTempo')
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    this.currentTempo = bpm
  }

  /**
   * Whether this BeatTrack is currently synced to a Transport.
   */
  public get isSynced(): boolean {
    return this._syncedTo !== null
  }

  /**
   * Sync this BeatTrack to a Transport for clock-driven playback.
   *
   * When synced, the Transport's scheduler drives this track's beats.
   * Standalone methods (playBeats, playActiveBeats, stop, pause, resume, setTempo)
   * throw an error while synced — use transport.start()/stop() instead.
   *
   * @param transport - The Transport to sync to
   * @param opts - Sync options: noteType (rhythmic subdivision, e.g., 1/4, 1/16)
   *
   * @example
   * ```typescript
   * const transport = await createTransport({ bpm: 120 })
   * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 4 })
   *
   * kick.syncTo(transport, { noteType: 1/4 })
   * transport.start() // kicks play quarter notes at 120 BPM
   * ```
   */
  public syncTo(transport: Transport, opts: { noteType: number }): void {
    if (this._syncedTo === transport) return // already synced to this transport
    if (this._syncedTo) this.unsync() // detach from previous
    this._syncedTo = transport
    this._syncNoteType = opts.noteType
    transport._addTrack(this)
  }

  /**
   * Unsync this BeatTrack from its Transport.
   *
   * Re-enables standalone methods (playBeats, playActiveBeats, stop, etc.).
   * If the track was playing via Transport, it stops cleanly.
   *
   * @example
   * ```typescript
   * kick.unsync()
   * kick.playBeats(120, 1/4) // standalone mode works again
   * ```
   */
  public unsync(): void {
    if (!this._syncedTo) return
    this._syncedTo._removeTrack(this)
    this._syncedTo = null
    this.internalStop()
  }

  /**
   * Determine whether this track should produce audio on the current beat.
   *
   * Logic:
   * - If muted, never play audio
   * - If not synced (standalone), always play audio (solo has no effect standalone)
   * - If synced: if any sibling track is soloed, only soloed tracks play
   * - If no tracks are soloed, all unmuted tracks play
   *
   * @internal
   */
  _shouldPlay(): boolean {
    if (this.muted) return false
    if (!this._syncedTo) return true // standalone: solo has no effect
    const siblings = this._syncedTo.tracks
    const anySoloed = siblings.some(t => (t as BeatTrack).solo)
    return !anySoloed || this.solo
  }

  /**
   * Schedule a single beat from the Transport's scheduler.
   *
   * Called by Transport.schedulerTick() for each beat within the lookahead window.
   * Respects mute/solo state: muted or non-soloed tracks still emit beat events
   * (for UI sync) but skip audio playback.
   *
   * @param beatIndex - Index into this track's beats array
   * @param time - AudioContext time at which the beat should play
   * @internal
   */
  _scheduleBeatFromTransport(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex % this.beats.length]
    const offset = time - this.audioContext.currentTime

    if (this._shouldPlay()) {
      // Play audio: use playInIfActive (only active beats produce sound)
      beat.playInIfActive(offset)
    }
    else {
      // Muted or not soloed: visual-only (currentTimeIsPlaying) with no audio
      const msOffset = Math.max(0, offset * 1000)
      if (msOffset <= 0) {
        beat.triggerVisualOnly()
      }
      else {
        this.acTimeout(() => beat.triggerVisualOnly(), msOffset)
      }
    }

    // Always emit beat event (even when muted) for UI sync
    const active = beat.active
    const msOffset = offset * 1000
    const emitBeat = (): void => {
      this.emit('beat', { time, beatIndex: beatIndex % this.beats.length, active, source: this })
    }
    if (msOffset <= 0) {
      emitBeat()
    }
    else {
      this.acTimeout(emitBeat, msOffset)
    }
  }

  /**
   * Guard against calling standalone methods while synced to a Transport.
   * @internal
   */
  private guardSynced(methodName: string): void {
    if (this._syncedTo) {
      throw new Error(
        `Cannot call ${methodName}() on a synced BeatTrack. Use transport.start()/stop() instead.`,
      )
    }
  }

  /**
   * Internal stop implementation that doesn't check sync state.
   * Used by unsync() to cleanly stop without throwing.
   * @internal
   */
  private internalStop(): void {
    this.workerTimer.stop()

    // Cancel any pending beat-level timers to prevent post-stop visual flicker
    for (const beat of this.beats) {
      beat.cancelPendingTimers()
    }

    this.currentBeatIndex = 0
    this.nextBeatTime = 0
    this.pausedBeatIndex = null

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Start the lookahead scheduler using WorkerTimer for background-tab resilience.
   *
   * Runs the first tick synchronously (to schedule beats within the current
   * lookahead window immediately), then starts the WorkerTimer for subsequent
   * ticks at regular intervals (~20ms).
   *
   * Individual beat playback times are anchored to `audioContext.currentTime`
   * via `audioContextAwareTimeout`, so beats fire at the correct audio-clock instant.
   *
   * @internal
   */
  private scheduler(): void {
    // Run first tick synchronously to schedule beats immediately
    this.schedulerTick()
    this.workerTimer.start(() => this.schedulerTick())
  }

  /**
   * Single tick of the lookahead scheduler. Schedules all beats within
   * the lookahead window.
   * @internal
   */
  private schedulerTick(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule all beats within lookahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeatIndex, this.nextBeatTime)
      this.advanceToNextBeat()
    }
  }

  /**
   * Schedule a single beat and emit the beat event.
   * @internal
   */
  private scheduleBeat(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex]
    const offset = time - this.audioContext.currentTime

    if (this._playAllBeats) {
      // playBeats mode: play all beats unconditionally regardless of beat.active
      beat.playIn(offset)
    }
    else {
      // playActiveBeats mode: only active beats produce sound; inactive beats are rests
      // - Active beats: plays sound, sets isPlaying + currentTimeIsPlaying (both auto-reset)
      // - Inactive beats: sets currentTimeIsPlaying only (visual playhead on rests)
      beat.playInIfActive(offset)
    }

    // Emit beat event at play time using AudioContext-aware timeout
    // so consumers don't need to compensate for lookahead delay
    const active = beat.active
    const msOffset = offset * 1000
    const emitBeat = (): void => {
      this.emit('beat', { time, beatIndex, active, source: this })
    }

    if (msOffset <= 0) {
      emitBeat()
    }
    else {
      this.acTimeout(emitBeat, msOffset)
    }
  }

  /**
   * Advance to the next beat in the pattern using current tempo.
   * @internal
   */
  private advanceToNextBeat(): void {
    // Calculate beat duration from CURRENT tempo
    // http://bradthemad.org/guitar/tempo_explanation.php
    const beatDuration = (240 * this.noteType) / this.currentTempo
    this.nextBeatTime += beatDuration
    this.currentBeatIndex = (this.currentBeatIndex + 1) % this.beats.length
  }

  /**
   * The underlying method for playing beats at calculated intervals.
   * @internal
   */
  protected callPlayMethodOnBeats(method: 'playInIfActive' | 'playIn', bpm: number, noteType: number = 1 / 4): void {
    // http://bradthemad.org/guitar/tempo_explanation.php
    const duration = (240 * noteType) / bpm
    this.beats.forEach((beat, idx) => beat[method](idx * duration))
  }

  /**
   * Emit a typed event with the given detail.
   * @internal
   */
  protected emit<K extends keyof BeatTrackEventMap>(
    type: K,
    detail: BeatTrackEventMap[K]['detail'],
  ): void {
    const event = new CustomEvent(type, { detail })
    this.eventTarget.dispatchEvent(event)
  }

  /**
   * Add a typed event listener for BeatTrack lifecycle events.
   *
   * @param type - Event type: 'beat', 'stop', 'pause', 'resume'
   * @param listener - Handler function
   * @param options - Standard addEventListener options
   */
  addEventListener<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options)
  }

  /**
   * Remove a typed event listener.
   *
   * @param type - Event type to unsubscribe from
   * @param listener - Handler function to remove
   * @param options - Standard removeEventListener options
   */
  removeEventListener<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void {
    this.eventTarget.removeEventListener(type, listener as EventListener, options)
  }

  /**
   * Dispose this BeatTrack, stopping playback, clearing beats,
   * and releasing all audio resources.
   *
   * After disposal, the BeatTrack should not be used. Create a new instance instead.
   *
   * @example
   * ```typescript
   * const track = await createBeatTrack(['kick.mp3'], { numBeats: 8 })
   * track.playBeats(120, 1/4)
   * // When done:
   * track.dispose()
   * ```
   */
  public dispose(): void {
    // Unsync from Transport if synced (before stopping)
    if (this._syncedTo) {
      this._syncedTo._removeTrack(this)
      this._syncedTo = null
    }

    // Stop playback (stops WorkerTimer, resets beat index, cancels beat timers)
    this.internalStop()
    this.workerTimer.dispose()

    // Dispose all underlying sounds in the sampler
    for (const sound of this.sounds) {
      if ('dispose' in sound && typeof (sound as any).dispose === 'function') {
        (sound as any).dispose()
      }
    }
    this.sounds.clear()

    // Clear beats array and set numBeats to 0 to prevent lazy re-creation
    this._beats = []
    this.numBeats = 0

    // Clear event target by replacing it (no removeAllListeners on EventTarget)
    this.eventTarget = new EventTarget()
  }

  /**
   * Subscribe to an event. Supports chaining.
   *
   * @param type - Event type: 'beat', 'stop', 'pause', 'resume'
   * @param listener - Handler function
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * track.on('beat', (e) => {
   *   console.log(`Beat ${e.detail.beatIndex}`)
   *   highlightBeat(e.detail.beatIndex)
   * }).on('stop', () => {
   *   console.log('Stopped')
   * })
   * ```
   */
  on<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
  ): this {
    this.addEventListener(type, listener)
    return this
  }

  /**
   * Unsubscribe from an event. Supports chaining.
   *
   * @param type - Event type to unsubscribe from
   * @param listener - Handler function to remove
   * @returns this for chaining
   */
  off<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
  ): this {
    this.removeEventListener(type, listener)
    return this
  }

  /**
   * Subscribe to an event once. Handler is removed after first invocation.
   *
   * @param type - Event type to listen for
   * @param listener - Handler function (called only once)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * track.once('stop', () => {
   *   console.log('Track stopped for the first time')
   * })
   * ```
   */
  once<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }
}

import type { BeatTrackEventMap } from './events/event-types'
import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import type { SamplerOptions } from './sampler'
import { Beat } from './beat'
import { Sampler } from './sampler'
import audioContextAwareTimeout from './utils/timeout'

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
  // EventTarget for event emission
  private eventTarget: EventTarget = new EventTarget()

  // Lookahead scheduler state
  private scheduleAheadTime = 0.1 // 100ms lookahead
  private schedulerInterval = 25 // 25ms check interval
  private nextBeatTime = 0
  private currentBeatIndex = 0
  private timerID: number | null = null
  private currentTempo: number = 120
  private noteType: number = 1 / 4

  // Pause state
  private pausedBeatIndex: number | null = null
  private pausedBeatTime: number | null = null

  // Beat cache (replaces module-level WeakMap for framework proxy compatibility)
  private _beats: Beat[] = []

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
   * Start playing all beats in the pattern continuously.
   *
   * Starts a lookahead scheduler that triggers beats at precise audio times.
   * Emits 'beat' events for UI synchronization.
   *
   * @param bpm - Tempo in beats per minute
   * @param noteType - Rhythmic subdivision as a fraction. Common values: 1/4 (quarter notes), 1/8 (eighth notes), 1/16 (sixteenth notes). The beat duration in seconds is calculated as: (240 * noteType) / bpm.
   *
   * @example
   * ```typescript
   * track.playBeats(120, 1/4)  // 120 BPM, quarter notes
   * track.playBeats(140, 1/8)  // 140 BPM, eighth notes
   * ```
   */
  public playBeats(bpm: number, noteType: number): void {
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    if (noteType <= 0) {
      throw new Error(`noteType must be greater than 0. Received: ${noteType}`)
    }
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
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    if (noteType <= 0) {
      throw new Error(`noteType must be greater than 0. Received: ${noteType}`)
    }
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
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.currentBeatIndex = 0
    this.nextBeatTime = 0
    this.pausedBeatIndex = null
    this.pausedBeatTime = null

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this,
    })
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
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.pausedBeatIndex = this.currentBeatIndex
    this.pausedBeatTime = this.nextBeatTime

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
    if (this.pausedBeatIndex !== null) {
      this.currentBeatIndex = this.pausedBeatIndex
      this.nextBeatTime = this.pausedBeatTime ?? this.audioContext.currentTime

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        beatIndex: this.currentBeatIndex,
      })

      this.scheduler()

      this.pausedBeatIndex = null
      this.pausedBeatTime = null
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
    if (bpm <= 0) {
      throw new Error(`BPM must be greater than 0. Received: ${bpm}`)
    }
    this.currentTempo = bpm
  }

  /**
   * Lookahead scheduler that schedules beats 100ms ahead.
   *
   * This pattern checks every 25ms and schedules beats 100ms ahead of current time.
   * It prevents timing gaps from JS event loop jitter while keeping beat triggers
   * close to real-time for UI synchronization.
   *
   * @internal
   */
  private scheduler(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule all beats within lookahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeatIndex, this.nextBeatTime)
      this.advanceToNextBeat()
    }

    this.timerID = window.setTimeout(
      () => this.scheduler(),
      this.schedulerInterval,
    )
  }

  /**
   * Schedule a single beat and emit the beat event.
   * @internal
   */
  private scheduleBeat(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex]
    const offset = time - this.audioContext.currentTime

    // ifActivePlayIn handles everything:
    // - Active beats: plays sound, sets isPlaying + currentTimeIsPlaying (both auto-reset)
    // - Inactive beats: sets currentTimeIsPlaying only (visual playhead on rests)
    beat.ifActivePlayIn(offset)

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
  protected callPlayMethodOnBeats(method: 'ifActivePlayIn' | 'playIn', bpm: number, noteType: number = 1 / 4): void {
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

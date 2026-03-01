import type { RatioType } from '@controllers/base-param-controller'
import type { Analyzer } from './analyzer'
import type { Effect } from './effects'
import type { GrainPlayerEventMap } from './events/event-types'
import { TypedEventEmitter } from './events/typed-event-emitter'

/**
 * Configuration options for creating a GrainPlayer.
 */
export interface GrainPlayerOptions {
  /** Duration of each grain in seconds (default: 0.1, min: 0.01). */
  grainSize?: number
  /** Overlap between consecutive grains in seconds (default: 0.05). */
  overlap?: number
  /** Initial playback position in the buffer, normalized 0-1 (default: 0). */
  position?: number
  /** Pitch shift in semitones (default: 0). Converted to playbackRate via 2^(semitones/12). */
  pitch?: number
  /** Random scatter around the position for organic texture, 0-1 (default: 0). */
  jitter?: number
  /** Whether to loop back to buffer start when reaching the end (default: true). */
  loop?: boolean
  /** Initial master gain, 0-1 (default: 1). */
  gain?: number
  /** Initial master pan, -1 to 1 (default: 0). */
  pan?: number
}

/**
 * Granular synthesis player that generates continuous texture/pad sounds from an audio buffer.
 *
 * GrainPlayer works by scheduling many overlapping short "grains" of audio from a source
 * buffer. Each grain gets a Hann window envelope (ramp up -> ramp down) to prevent clicks.
 * Grains are scheduled slightly ahead of real time using a setTimeout loop for glitch-free
 * playback.
 *
 * Provides independent control over:
 * - **Position** (0-1): Which region of the buffer to sample grains from
 * - **Pitch** (semitones): Pitch shift via playbackRate on each grain's BufferSourceNode
 * - **Grain parameters**: grainSize, overlap, jitter — adjustable in real-time
 *
 * Note: Pitch shifting is implemented via playbackRate, which changes both pitch AND speed
 * of each grain. The overlap system compensates for the changed grain duration, but extreme
 * values (beyond +/-24 semitones) may affect texture quality.
 *
 * @example
 * ```typescript
 * import { createGrainPlayer, createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('pad.mp3')
 * const grains = await createGrainPlayer(sound.audioBuffer, {
 *   grainSize: 0.1,
 *   overlap: 0.05,
 *   jitter: 0.1
 * })
 *
 * grains.play()
 * grains.position = 0.5  // scrub to middle of buffer
 * grains.pitch = 7       // pitch up a fifth
 * ```
 */
export class GrainPlayer extends TypedEventEmitter<GrainPlayerEventMap> {
  private readonly buffer: AudioBuffer
  private _grainSize: number
  private _overlap: number
  private _position: number
  private _pitch: number
  private _playbackRateValue: number
  private _jitter: number
  private _loop: boolean
  private _playing = false
  private _paused = false
  private _disposed = false
  private _activeGrainCount = 0

  // Scheduling
  private nextGrainTime = 0
  private timerId: ReturnType<typeof setTimeout> | null = null
  private readonly LOOKAHEAD = 0.05 // seconds
  private readonly SCHEDULE_INTERVAL = 25 // ms

  // Shared output bus
  private readonly sharedBusInput: GainNode
  private readonly masterGain: GainNode
  private readonly masterPan: StereoPannerNode
  private _destination: AudioNode
  private _analyzer: Analyzer | null = null
  private effects: Effect[] = []

  constructor(
    public readonly audioContext: AudioContext,
    buffer: AudioBuffer,
    options?: GrainPlayerOptions,
  ) {
    super()
    this.buffer = buffer

    // Apply options with defaults
    this._grainSize = Math.max(0.01, options?.grainSize ?? 0.1)
    this._overlap = options?.overlap ?? 0.05
    this._position = Math.max(0, Math.min(1, options?.position ?? 0))
    this._pitch = options?.pitch ?? 0
    this._playbackRateValue = this.semitonesToRate(this._pitch)
    this._jitter = Math.max(0, Math.min(1, options?.jitter ?? 0))
    this._loop = options?.loop ?? true

    // Create shared output bus
    this.sharedBusInput = audioContext.createGain()
    this.masterGain = audioContext.createGain()
    this.masterPan = audioContext.createStereoPanner()
    this._destination = audioContext.destination

    // Apply initial gain/pan
    if (options?.gain !== undefined) {
      this.masterGain.gain.setValueAtTime(options.gain, audioContext.currentTime)
    }
    if (options?.pan !== undefined) {
      this.masterPan.pan.setValueAtTime(options.pan, audioContext.currentTime)
    }

    this.wireSharedBus()
  }

  // ─── Shared Bus Wiring ───────────────────────────────────────────

  /**
   * Wire the shared bus: sharedBusInput -> [effects] -> masterGain -> masterPan -> [analyzer] -> destination
   */
  private wireSharedBus(): void {
    this.safeDisconnect(this.sharedBusInput)
    this.safeDisconnect(this.masterGain)
    this.safeDisconnect(this.masterPan)

    for (const effect of this.effects) {
      this.safeDisconnect(effect.output)
    }

    if (this._analyzer) {
      this.safeDisconnect(this._analyzer.input)
    }

    // Build chain
    let currentNode: AudioNode = this.sharedBusInput

    for (const effect of this.effects) {
      if (!effect.bypass) {
        currentNode.connect(effect.input)
        currentNode = effect.output
      }
    }

    currentNode.connect(this.masterGain)
    this.masterGain.connect(this.masterPan)

    if (this._analyzer) {
      this.masterPan.connect(this._analyzer.input)
      this._analyzer.input.connect(this._destination)
    }
    else {
      this.masterPan.connect(this._destination)
    }
  }

  private safeDisconnect(node: AudioNode): void {
    try {
      node.disconnect()
    }
    catch { /* Already disconnected */ }
  }

  // ─── Grain Scheduling ───────────────────────────────────────────

  private semitonesToRate(semitones: number): number {
    return 2 ** (semitones / 12)
  }

  private getHopSize(): number {
    return Math.max(0.001, this._grainSize - this._overlap)
  }

  private scheduleLoop(): void {
    if (!this._playing || this._paused || this._disposed)
      return

    const now = this.audioContext.currentTime

    // Schedule grains until we've filled the lookahead window
    while (this.nextGrainTime < now + this.LOOKAHEAD) {
      this.scheduleGrain(this.nextGrainTime)
      this.nextGrainTime += this.getHopSize()
    }

    // Re-run in SCHEDULE_INTERVAL ms
    this.timerId = setTimeout(() => this.scheduleLoop(), this.SCHEDULE_INTERVAL)
  }

  private scheduleGrain(when: number): void {
    const source = this.audioContext.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this._playbackRateValue

    const grainGain = this.audioContext.createGain()

    // Hann window envelope
    const halfGrain = this._grainSize / 2
    grainGain.gain.setValueAtTime(0.0001, when)
    grainGain.gain.linearRampToValueAtTime(1, when + halfGrain)
    grainGain.gain.linearRampToValueAtTime(0.0001, when + this._grainSize)

    source.connect(grainGain)
    grainGain.connect(this.sharedBusInput)

    // Calculate buffer offset with optional jitter
    let offset = this._position * this.buffer.duration
    if (this._jitter > 0) {
      offset += (Math.random() * 2 - 1) * this._jitter * this.buffer.duration
    }

    // Clamp to buffer bounds
    const maxOffset = Math.max(0, this.buffer.duration - this._grainSize)
    offset = Math.max(0, Math.min(offset, maxOffset))

    // Handle looping
    if (this._loop && offset > maxOffset) {
      offset = offset % this.buffer.duration
    }

    // Compensate grain duration for playback rate
    const compensatedDuration = this._grainSize / this._playbackRateValue
    source.start(when, offset, compensatedDuration)

    this._activeGrainCount++

    // Cleanup on grain completion
    source.addEventListener('ended', () => {
      try {
        source.disconnect()
      }
      catch { /* Already disconnected */ }
      try {
        grainGain.disconnect()
      }
      catch { /* Already disconnected */ }
      this._activeGrainCount--
    }, { once: true })
  }

  // ─── Playback Lifecycle ──────────────────────────────────────────

  /**
   * Start grain playback. If already playing, this is a no-op.
   *
   * @example
   * ```typescript
   * grainPlayer.play()
   * ```
   */
  play(): void {
    if (this._disposed) {
      throw new Error('Cannot play a disposed GrainPlayer. Create a new instance.')
    }
    if (this._playing && !this._paused)
      return

    this._playing = true
    this._paused = false
    this.nextGrainTime = this.audioContext.currentTime
    this.scheduleLoop()

    this.emit('play', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Stop grain playback. Active grains will decay naturally (they're very short).
   *
   * @example
   * ```typescript
   * grainPlayer.stop()
   * ```
   */
  stop(): void {
    if (!this._playing)
      return

    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }

    this._playing = false
    this._paused = false

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Pause grain playback. Active grains will finish naturally.
   * Resume with {@link resume}.
   *
   * @example
   * ```typescript
   * grainPlayer.pause()
   * // later...
   * grainPlayer.resume()
   * ```
   */
  pause(): void {
    if (!this._playing || this._paused)
      return

    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }

    this._paused = true

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Resume grain playback from where it was paused.
   *
   * @example
   * ```typescript
   * grainPlayer.resume()
   * ```
   */
  resume(): void {
    if (!this._playing || !this._paused)
      return

    this._paused = false
    this.nextGrainTime = this.audioContext.currentTime
    this.scheduleLoop()

    this.emit('resume', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  // ─── Properties ──────────────────────────────────────────────────

  /** Whether the grain player is currently playing. */
  get playing(): boolean { return this._playing && !this._paused }

  /** Whether the grain player is paused. */
  get paused(): boolean { return this._paused }

  /** Whether this GrainPlayer has been disposed. */
  get disposed(): boolean { return this._disposed }

  /** Number of currently active (playing) grains. */
  get activeGrainCount(): number { return this._activeGrainCount }

  /**
   * Playback position in the buffer, normalized 0-1.
   * 0 = beginning of buffer, 1 = end of buffer.
   * Changes take effect on the next grain.
   */
  get position(): number { return this._position }
  set position(value: number) {
    this._position = Math.max(0, Math.min(1, value))
  }

  /**
   * Pitch shift in semitones. 0 = original pitch.
   * Internally converts to playbackRate via `2^(semitones/12)`.
   *
   * Note: This is playbackRate-based pitch shift. It changes grain duration,
   * which the overlap system compensates for, but extreme values will affect
   * texture quality.
   *
   * @example
   * ```typescript
   * grainPlayer.pitch = 7   // up a fifth
   * grainPlayer.pitch = 12  // up an octave
   * grainPlayer.pitch = -12 // down an octave
   * ```
   */
  get pitch(): number { return this._pitch }
  set pitch(semitones: number) {
    this._pitch = semitones
    this._playbackRateValue = this.semitonesToRate(semitones)
  }

  /**
   * Direct playback rate ratio. 1 = original speed, 2 = double speed (octave up).
   * Setting this also updates the `pitch` property accordingly.
   */
  get playbackRate(): number { return this._playbackRateValue }
  set playbackRate(value: number) {
    this._playbackRateValue = Math.max(0.01, value)
    // Convert back to semitones: semitones = 12 * log2(rate)
    this._pitch = 12 * Math.log2(this._playbackRateValue)
  }

  /**
   * Duration of each grain in seconds. Minimum 0.01s.
   * Changes take effect on the next grain.
   */
  get grainSize(): number { return this._grainSize }
  set grainSize(value: number) {
    this._grainSize = Math.max(0.01, value)
  }

  /**
   * Overlap between consecutive grains in seconds.
   * Changes take effect on the next grain.
   */
  get overlap(): number { return this._overlap }
  set overlap(value: number) {
    this._overlap = value
  }

  /**
   * Random scatter around the position for organic texture, 0-1.
   * 0 = no scatter, 1 = scatter across entire buffer.
   */
  get jitter(): number { return this._jitter }
  set jitter(value: number) {
    this._jitter = Math.max(0, Math.min(1, value))
  }

  /** Whether to loop when reaching the buffer end. */
  get loop(): boolean { return this._loop }
  set loop(value: boolean) {
    this._loop = value
  }

  // ─── Audio Node Accessors ─────────────────────────────────────────

  /** Returns the master GainNode (for LFO targeting and external routing). */
  getGainNode(): GainNode { return this.masterGain }

  /** Returns the master StereoPannerNode (for LFO targeting and external routing). */
  getPannerNode(): StereoPannerNode { return this.masterPan }

  // ─── Master Controls ─────────────────────────────────────────────

  /**
   * Update a master bus parameter immediately.
   *
   * @param type - 'gain' or 'pan'
   * @returns Fluent builder
   *
   * @example
   * ```typescript
   * grainPlayer.update('gain').to(0.5).as('ratio')
   * ```
   */
  update(type: 'gain' | 'pan'): {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  } {
    const param = type === 'gain' ? this.masterGain.gain : this.masterPan.pan
    return {
      to: (value: number) => ({
        as: (_method: RatioType): void => {
          param.setValueAtTime(value, this.audioContext.currentTime)
        },
      }),
    }
  }

  /**
   * Set the master gain for all grains.
   *
   * @param value - Gain from 0 (silent) to 1 (full volume)
   */
  changeGainTo(value: number): this {
    this.masterGain.gain.setValueAtTime(value, this.audioContext.currentTime)
    return this
  }

  /**
   * Set the master pan for all grains.
   *
   * @param value - Pan from -1 (left) to 1 (right)
   */
  changePanTo(value: number): this {
    this.masterPan.pan.setValueAtTime(value, this.audioContext.currentTime)
    return this
  }

  // ─── Effects ─────────────────────────────────────────────────────

  /**
   * Add an effect to the shared output bus.
   * All grains are affected.
   *
   * @param effect - The Effect instance to add
   * @param position - Optional index to insert at
   * @returns this for chaining
   */
  addEffect(effect: Effect, position?: number): this {
    if (position !== undefined && position <= this.effects.length) {
      this.effects.splice(position, 0, effect)
    }
    else {
      this.effects.push(effect)
    }
    this.wireSharedBus()
    return this
  }

  /**
   * Remove an effect from the shared output bus.
   *
   * @param effect - The Effect instance to remove
   * @returns this for chaining
   */
  removeEffect(effect: Effect): this {
    const index = this.effects.indexOf(effect)
    if (index > -1) {
      this.effects.splice(index, 1)
      this.wireSharedBus()
    }
    return this
  }

  /**
   * Get a readonly copy of the current effects array.
   */
  getEffects(): readonly Effect[] {
    return [...this.effects]
  }

  /**
   * Attach an analyzer to the shared bus output for visualization.
   *
   * @param analyzer - The Analyzer instance, or null to detach
   * @returns this for chaining
   */
  setAnalyzer(analyzer: Analyzer | null): this {
    this._analyzer = analyzer
    this.wireSharedBus()
    return this
  }

  /**
   * Get the currently attached analyzer.
   */
  getAnalyzer(): Analyzer | null {
    return this._analyzer
  }

  /**
   * Set a custom destination for audio output.
   *
   * @param node - The AudioNode to route output to
   * @returns this for chaining
   */
  setDestination(node: AudioNode): this {
    this._destination = node
    this.wireSharedBus()
    return this
  }

  // ─── Dispose ─────────────────────────────────────────────────────

  /**
   * Dispose this GrainPlayer, releasing all audio resources.
   *
   * Stops playback, disconnects the shared bus, and marks the instance as unusable.
   * Dispose is idempotent.
   */
  dispose(): void {
    if (this._disposed)
      return

    // Stop playback
    if (this._playing) {
      if (this.timerId !== null) {
        clearTimeout(this.timerId)
        this.timerId = null
      }
      this._playing = false
      this._paused = false
    }

    // Disconnect shared bus
    this.safeDisconnect(this.sharedBusInput)
    this.safeDisconnect(this.masterGain)
    this.safeDisconnect(this.masterPan)

    // Clear effects
    this.effects = []
    this._analyzer = null

    this._disposed = true
    this.emit('dispose', { source: this })

    // Silence future events
    this.dispatchEvent = () => false
  }
}

import type { ControlType, RampType, RatioType } from '@controllers/base-param-controller'
import type { Analyzer } from './analyzer'
import type { Effect } from './effects'
import type { EnvelopeOptions } from './envelope'
import type { PolySynthEventMap } from './events/event-types'
import type { OscillatorFilterOptions } from './oscillator'
import { TypedEventEmitter } from './events/typed-event-emitter'
import { Oscillator } from './oscillator'

/**
 * Voice stealing strategy when the voice pool is full.
 *
 * - `'lru'`: Steal oldest-released voice first, then oldest-active if no released voices (default)
 * - `'oldest-active'`: Always steal the voice that started playing earliest
 * - `'quietest'`: Steal the voice with the lowest current gain
 */
export type StealStrategy = 'lru' | 'oldest-active' | 'quietest'

/**
 * Configuration options for creating a PolySynth.
 */
export interface PolySynthOptions {
  /** Maximum number of simultaneous voices (default: 8). Immutable after creation. */
  maxVoices?: number
  /** Voice stealing strategy when pool is full (default: 'lru'). */
  stealStrategy?: StealStrategy
  /** Oscillator waveform type for default voice factory (default: 'sine'). */
  type?: OscillatorType
  /** Default frequency for voices — overridden by play() options (default: 440). */
  frequency?: number
  /** Default gain for voices (default: 1). */
  gain?: number
  /** ADSR envelope for default voice factory. */
  envelope?: EnvelopeOptions
  /** Highpass filter for default voice factory. */
  highpass?: OscillatorFilterOptions
  /** Bandpass filter for default voice factory. */
  bandpass?: OscillatorFilterOptions
  /** Lowpass filter for default voice factory. */
  lowpass?: OscillatorFilterOptions
  /** Lowshelf filter for default voice factory. */
  lowshelf?: OscillatorFilterOptions
  /** Highshelf filter for default voice factory. */
  highshelf?: OscillatorFilterOptions
  /** Peaking filter for default voice factory. */
  peaking?: OscillatorFilterOptions
  /** Notch filter for default voice factory. */
  notch?: OscillatorFilterOptions
  /** Allpass filter for default voice factory. */
  allpass?: OscillatorFilterOptions
  /** Custom voice factory. Overrides type/envelope/filter options. */
  createVoice?: (ctx: AudioContext) => Oscillator
}

/**
 * Options passed to PolySynth.play() for each note.
 */
export interface PlayOptions {
  /** Frequency of the note to play in Hz. */
  frequency: number
  /** Per-voice gain for velocity sensitivity (0-1, default: 1). */
  gain?: number
}

// ─── No-op builders for stale VoiceHandle ──────────────────────────

const NO_OP_AS = { as: (_method: RatioType): void => {} }
const NO_OP_UPDATE = { to: (_value: number) => NO_OP_AS }
const NO_OP_AT = { at: (_time: number): void => {}, endingAt: (_time: number, _rampType?: RampType): void => {} }
const NO_OP_ON_PLAY_SET = { to: (_value: number) => NO_OP_AT }
const NO_OP_IN = { in: (_endTime: number): void => {} }
const NO_OP_RAMP_TO = { to: (_endValue: number) => NO_OP_IN }
const NO_OP_ON_PLAY_RAMP = { from: (_startValue: number) => NO_OP_RAMP_TO }

/**
 * Handle returned by PolySynth.play() representing a single playing voice.
 *
 * The handle provides per-voice control through the full Oscillator fluent API.
 * When the voice is stolen or stopped, the handle becomes stale and all methods
 * silently no-op — no errors thrown, no accidental modification of other voices.
 *
 * @example
 * ```typescript
 * const handle = synth.play({ frequency: 440 })
 * handle.update('gain').to(0.5).as('ratio')  // per-voice volume
 * handle.update('frequency').to(450).as('ratio')  // pitch bend
 *
 * // After voice is stolen:
 * handle.active  // false
 * handle.update('gain')  // silently no-ops
 * ```
 */
export class VoiceHandle {
  private _active = true

  constructor(
    private oscillator: Oscillator,
    private onStop: () => void,
  ) {}

  /** Whether this handle still references an active voice. */
  get active(): boolean { return this._active }

  /**
   * Update a voice parameter immediately.
   * Returns no-op builder if handle is stale.
   */
  update(type: ControlType): {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  } {
    if (!this._active)
      return NO_OP_UPDATE
    return this.oscillator.update(type)
  }

  /**
   * Schedule a parameter value to be set when the voice next plays.
   * Returns no-op builder if handle is stale.
   */
  onPlaySet(type: ControlType): {
    to: (value: number) => {
      at: (time: number) => void
      endingAt: (time: number, rampType?: RampType) => void
    }
  } {
    if (!this._active)
      return NO_OP_ON_PLAY_SET
    return this.oscillator.onPlaySet(type)
  }

  /**
   * Schedule a parameter ramp when the voice next plays.
   * Returns no-op builder if handle is stale.
   */
  onPlayRamp(type: ControlType, rampType?: RampType): {
    from: (startValue: number) => {
      to: (endValue: number) => {
        in: (endTime: number) => void
      }
    }
  } {
    if (!this._active)
      return NO_OP_ON_PLAY_RAMP
    return this.oscillator.onPlayRamp(type, rampType)
  }

  /**
   * Stop this voice. The handle becomes stale after stopping.
   */
  async stop(): Promise<void> {
    if (!this._active)
      return
    this._active = false
    this.onStop()
    await this.oscillator.stop()
  }

  /** @internal */
  _invalidate(): void {
    this._active = false
  }
}

// ─── Voice Pool Entry ──────────────────────────────────────────────

interface VoiceEntry {
  oscillator: Oscillator
  handle: VoiceHandle | null
  state: 'active' | 'released' | 'available'
  startedAt: number
  releasedAt: number
  frequency: number
}

/**
 * Polyphonic synthesizer with automatic voice pool management.
 *
 * PolySynth manages a pool of Oscillator voices, handling allocation, recycling,
 * and voice stealing automatically. All voices route through a shared output bus
 * with master gain/pan controls and effect chain support.
 *
 * PolySynth has no musical identity — it works with frequencies, not note names.
 * Use `frequencyMap` at the application layer to convert note names to frequencies.
 *
 * @example
 * ```typescript
 * import { createPolySynth, frequencyMap } from 'ez-web-audio'
 *
 * const synth = await createPolySynth({
 *   maxVoices: 8,
 *   type: 'sawtooth',
 *   envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
 *   lowpass: { frequency: 2000, q: 1 }
 * })
 *
 * // Play a chord
 * synth.play({ frequency: 261.63 }) // C4
 * synth.play({ frequency: 329.63 }) // E4
 * synth.play({ frequency: 392.00 }) // G4
 *
 * // Add effects to all voices
 * const delay = createDelay({ time: 0.3, feedback: 0.4, wet: 0.3 })
 * synth.addEffect(delay)
 *
 * // Master volume
 * synth.update('gain').to(0.5).as('ratio')
 * ```
 */
export class PolySynth extends TypedEventEmitter<PolySynthEventMap> {
  private readonly _maxVoices: number
  private readonly _stealStrategy: StealStrategy
  private readonly voiceFactory: (ctx: AudioContext) => Oscillator
  private voices: VoiceEntry[] = []
  private _disposed = false

  // Shared output bus
  private readonly sharedBusInput: GainNode
  private readonly masterGain: GainNode
  private readonly masterPan: StereoPannerNode
  private _destination: AudioNode
  private _analyzer: Analyzer | null = null
  private effects: Effect[] = []

  constructor(
    private readonly audioContext: AudioContext,
    options?: PolySynthOptions,
  ) {
    super()
    this._maxVoices = options?.maxVoices ?? 8
    this._stealStrategy = options?.stealStrategy ?? 'lru'

    // Build voice factory
    if (options?.createVoice) {
      this.voiceFactory = options.createVoice
    }
    else {
      const oscOptions = {
        type: options?.type,
        frequency: options?.frequency,
        gain: options?.gain,
        envelope: options?.envelope,
        highpass: options?.highpass,
        bandpass: options?.bandpass,
        lowpass: options?.lowpass,
        lowshelf: options?.lowshelf,
        highshelf: options?.highshelf,
        peaking: options?.peaking,
        notch: options?.notch,
        allpass: options?.allpass,
      }
      this.voiceFactory = (ctx: AudioContext) => new Oscillator(ctx, oscOptions)
    }

    // Create shared output bus: sharedBusInput -> effects -> masterGain -> masterPan -> destination
    this.sharedBusInput = audioContext.createGain()
    this.masterGain = audioContext.createGain()
    this.masterPan = audioContext.createStereoPanner()
    this._destination = audioContext.destination

    this.wireSharedBus()
  }

  // ─── Shared Bus Wiring ───────────────────────────────────────────

  /**
   * Wire the shared bus: sharedBusInput -> [effects] -> masterGain -> masterPan -> [analyzer] -> destination
   */
  private wireSharedBus(): void {
    // Disconnect existing chain
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

  // ─── Voice Pool ──────────────────────────────────────────────────

  /** Maximum number of simultaneous voices. */
  get maxVoices(): number { return this._maxVoices }

  /** Number of currently active voices. */
  get activeVoices(): number {
    return this.voices.filter(v => v.state === 'active').length
  }

  /** Number of available voice slots. */
  get availableVoices(): number {
    return this._maxVoices - this.activeVoices
  }

  /** Whether this PolySynth has been disposed. */
  get disposed(): boolean { return this._disposed }

  /**
   * Play a note at the given frequency. Returns a VoiceHandle for per-voice control.
   *
   * @param options - Frequency and optional per-voice gain
   * @returns VoiceHandle for controlling the voice
   *
   * @example
   * ```typescript
   * const handle = synth.play({ frequency: 440 })
   * handle.update('gain').to(0.5).as('ratio')
   * await handle.stop()
   * ```
   */
  play(options: PlayOptions): VoiceHandle {
    if (this._disposed) {
      throw new Error('Cannot play a disposed PolySynth. Create a new instance.')
    }

    const { frequency, gain: voiceGain } = options
    const now = this.audioContext.currentTime

    // 1. Same-frequency retrigger — reuse existing active voice
    const existingVoice = this.voices.find(
      v => v.state === 'active' && v.frequency === frequency,
    )
    if (existingVoice) {
      return this.retriggerVoice(existingVoice, frequency, voiceGain, now)
    }

    // 2. Find an available voice (recycled)
    const available = this.voices.find(v => v.state === 'available')
    if (available) {
      return this.activateVoice(available, frequency, voiceGain, now)
    }

    // 3. Pool not full — create a new voice
    if (this.voices.length < this._maxVoices) {
      const entry = this.createVoiceEntry()
      this.voices.push(entry)
      return this.activateVoice(entry, frequency, voiceGain, now)
    }

    // 4. Pool full — steal a voice
    const victim = this.findVoiceToSteal()
    if (victim) {
      const stolenFreq = victim.frequency
      // Invalidate old handle
      victim.handle?._invalidate()
      // Stop the old voice (anti-click via stopAt)
      victim.oscillator.stopAt(now)
      victim.state = 'available'

      const handle = this.activateVoice(victim, frequency, voiceGain, now)

      // Emit voicestolen event
      this.emit('voicestolen', {
        stolenFrequency: stolenFreq,
        newFrequency: frequency,
        time: now,
        source: this,
      })

      return handle
    }

    // Should not reach here if maxVoices > 0
    throw new Error('No voice available for allocation')
  }

  private createVoiceEntry(): VoiceEntry {
    const oscillator = this.voiceFactory(this.audioContext)
    oscillator.setDestination(this.sharedBusInput)

    return {
      oscillator,
      handle: null,
      state: 'available',
      startedAt: 0,
      releasedAt: 0,
      frequency: 0,
    }
  }

  private activateVoice(
    entry: VoiceEntry,
    frequency: number,
    voiceGain: number | undefined,
    now: number,
  ): VoiceHandle {
    // If voice was previously used, we need a fresh oscillator because
    // OscillatorNode is single-use. Oscillator.play() calls setup() which
    // creates a new OscillatorNode internally.
    entry.frequency = frequency
    entry.startedAt = now
    entry.state = 'active'

    // Set frequency on the oscillator
    entry.oscillator.update('frequency').to(frequency).as('ratio')

    // Set per-voice gain if specified
    if (voiceGain !== undefined) {
      entry.oscillator.changeGainTo(voiceGain)
    }

    // Ensure voice routes to shared bus
    entry.oscillator.setDestination(this.sharedBusInput)

    // Play the oscillator
    void entry.oscillator.play()

    // Listen for stop/end to mark as released then available
    const onVoiceStopped = (): void => {
      if (entry.state === 'active') {
        entry.releasedAt = this.audioContext.currentTime
        entry.state = 'released'
        // Mark as available after a brief delay (allow envelope release)
        entry.state = 'available'
      }
    }
    entry.oscillator.once('stop', onVoiceStopped)
    entry.oscillator.once('end', onVoiceStopped)

    // Create handle
    const handle = new VoiceHandle(entry.oscillator, () => {
      entry.releasedAt = this.audioContext.currentTime
      entry.state = 'available'
      entry.handle = null
    })
    entry.handle = handle

    return handle
  }

  private retriggerVoice(
    entry: VoiceEntry,
    frequency: number,
    voiceGain: number | undefined,
    now: number,
  ): VoiceHandle {
    // Invalidate old handle
    entry.handle?._invalidate()

    // Stop and replay (Oscillator.play() -> setup() handles envelope retrigger)
    entry.oscillator.stopAt(now)
    entry.startedAt = now
    entry.frequency = frequency

    if (voiceGain !== undefined) {
      entry.oscillator.changeGainTo(voiceGain)
    }

    entry.oscillator.update('frequency').to(frequency).as('ratio')
    entry.oscillator.setDestination(this.sharedBusInput)
    void entry.oscillator.play()

    // Listen for stop/end
    const onVoiceStopped = (): void => {
      if (entry.state === 'active') {
        entry.releasedAt = this.audioContext.currentTime
        entry.state = 'available'
      }
    }
    entry.oscillator.once('stop', onVoiceStopped)
    entry.oscillator.once('end', onVoiceStopped)

    const handle = new VoiceHandle(entry.oscillator, () => {
      entry.releasedAt = this.audioContext.currentTime
      entry.state = 'available'
      entry.handle = null
    })
    entry.handle = handle

    return handle
  }

  private findVoiceToSteal(): VoiceEntry | null {
    if (this.voices.length === 0)
      return null

    switch (this._stealStrategy) {
      case 'lru':
        return this.stealLRU()
      case 'oldest-active':
        return this.stealOldestActive()
      case 'quietest':
        return this.stealQuietest()
      default:
        return this.stealLRU()
    }
  }

  private stealLRU(): VoiceEntry | null {
    // Prefer released voices (oldest releasedAt first)
    const released = this.voices
      .filter(v => v.state === 'released')
      .sort((a, b) => a.releasedAt - b.releasedAt)

    if (released.length > 0)
      return released[0]

    // No released voices — steal oldest active
    return this.stealOldestActive()
  }

  private stealOldestActive(): VoiceEntry | null {
    const active = this.voices
      .filter(v => v.state === 'active')
      .sort((a, b) => a.startedAt - b.startedAt)

    return active.length > 0 ? active[0] : null
  }

  private stealQuietest(): VoiceEntry | null {
    // Prefer released voices (quietest first)
    const released = this.voices.filter(v => v.state === 'released')
    if (released.length > 0) {
      return released.sort((a, b) =>
        a.oscillator.getGainNode().gain.value - b.oscillator.getGainNode().gain.value,
      )[0]
    }

    // No released — steal quietest active
    const active = this.voices.filter(v => v.state === 'active')
    if (active.length > 0) {
      return active.sort((a, b) =>
        a.oscillator.getGainNode().gain.value - b.oscillator.getGainNode().gain.value,
      )[0]
    }

    return null
  }

  // ─── Master Controls ─────────────────────────────────────────────

  /**
   * Stop all active voices immediately. All handles become stale.
   *
   * @example
   * ```typescript
   * synth.stopAll() // Panic button
   * ```
   */
  stopAll(): void {
    for (const voice of this.voices) {
      if (voice.state === 'active') {
        voice.handle?._invalidate()
        voice.handle = null
        try {
          void voice.oscillator.stop()
        }
        catch {
          // Already stopped
        }
        voice.state = 'available'
      }
    }
  }

  /**
   * Update a master bus parameter immediately.
   *
   * @param type - 'gain' or 'pan'
   * @returns Fluent builder
   *
   * @example
   * ```typescript
   * synth.update('gain').to(0.5).as('ratio')
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
   * Set the master gain for all voices.
   *
   * @param value - Gain from 0 (silent) to 1 (full volume)
   */
  changeGainTo(value: number): this {
    this.masterGain.gain.setValueAtTime(value, this.audioContext.currentTime)
    return this
  }

  /**
   * Set the master pan for all voices.
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
   * All voices are affected.
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
   * Dispose this PolySynth, releasing all audio resources.
   *
   * Stops all voices, disconnects the shared bus, and marks the instance as unusable.
   * Dispose is idempotent.
   */
  dispose(): void {
    if (this._disposed)
      return

    this.stopAll()

    // Dispose all oscillators
    for (const voice of this.voices) {
      voice.oscillator.dispose()
    }
    this.voices = []

    // Disconnect shared bus
    this.safeDisconnect(this.sharedBusInput)
    this.safeDisconnect(this.masterGain)
    this.safeDisconnect(this.masterPan)

    // Clear effects
    this.effects = []
    this._analyzer = null

    // Silence future events
    this.dispatchEvent = () => false

    this._disposed = true
  }
}

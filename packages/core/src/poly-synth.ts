import type { ControlType, RampType, RatioType } from '@controllers/base-param-controller'
import type { Analyzer } from './analyzer'
import type { Effect } from './effects'
import type { EnvelopeOptions } from './envelope'
import type { PolySynthEventMap } from './events/event-types'
import type { OscillatorFilterOptions } from './oscillator'
import { convertValue } from '@utils/convert-value'
import { getMasterDestination } from './audio-context'
import { ValidationError } from './errors'
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
   *
   * With an ADSR envelope, the voice enters its release phase and keeps
   * ringing until the tail completes — the pool reclaims it only then.
   */
  async stop(): Promise<void> {
    if (!this._active)
      return
    this._active = false
    try {
      // The oscillator's 'stop' event drives the active -> released pool
      // transition; its 'end' event (release tail finished) frees the voice.
      await this.oscillator.stop()
    }
    finally {
      this.onStop()
    }
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
  // Listener references for cleanup on reactivation (QC-1-09)
  onStop: ((event: any) => void) | null
  onEnd: ((event: any) => void) | null
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
  private _activeCount = 0
  private _disposed = false

  // Shared output bus
  private readonly sharedBusInput: GainNode
  private readonly masterGain: GainNode
  private readonly masterPan: StereoPannerNode
  private _destination: AudioNode
  private _analyzer: Analyzer | null = null
  private effects: Effect[] = []

  constructor(
    public readonly audioContext: AudioContext,
    options?: PolySynthOptions,
  ) {
    super()
    this._maxVoices = options?.maxVoices ?? 8
    // R7 low: maxVoices <= 0 previously failed late (and unhelpfully) inside
    // play()'s steal path — findVoiceToSteal() returns null on an empty
    // pool, hitting the generic "No voice available for allocation" throw
    // with no indication the real problem is construction-time config.
    if (!Number.isFinite(this._maxVoices) || this._maxVoices < 1) {
      throw new ValidationError(`PolySynth maxVoices must be a finite number >= 1. Received: ${this._maxVoices}`)
    }
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
    // Honor a global master bus if one is set; else the hardware destination.
    this._destination = getMasterDestination() ?? audioContext.destination

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
    return this._activeCount
  }

  /** Number of available voice slots. */
  get availableVoices(): number {
    return this._maxVoices - this.activeVoices
  }

  /** Whether this PolySynth has been disposed. */
  get disposed(): boolean { return this._disposed }

  // ─── Audio Node Accessors ─────────────────────────────────────────

  /** Returns the master GainNode (for LFO targeting and external routing). */
  getGainNode(): GainNode { return this.masterGain }

  /** Returns the master StereoPannerNode (for LFO targeting and external routing). */
  getPannerNode(): StereoPannerNode { return this.masterPan }

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
      throw new ValidationError('Cannot play a disposed PolySynth. Create a new instance.')
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
      const victimWasActive = victim.state === 'active'
      // Invalidate old handle
      victim.handle?._invalidate()
      // Clean up old listeners before stealing
      this.cleanupVoiceListeners(victim)
      // Stop the old voice (anti-click via stopAt)
      victim.oscillator.stopAt(now)
      if (victimWasActive) {
        this._activeCount--
      }
      victim.state = 'available'

      const handle = this.activateVoice(victim, frequency, voiceGain, now)

      // Emit voicestolen only when an actively-held note was cut. Reclaiming
      // a released voice (ringing tail) is normal pool recycling, not a steal
      // the player needs to hear about.
      if (victimWasActive) {
        this.emit('voicestolen', {
          stolenFrequency: stolenFreq,
          newFrequency: frequency,
          time: now,
          source: this,
        })
      }

      return handle
    }

    // Should not reach here if maxVoices > 0 — an internal invariant guard,
    // not caller misuse (maxVoices is already validated in the constructor),
    // so left as a plain Error rather than ValidationError (G10 ValidationError
    // sweep, R1#3).
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
      onStop: null,
      onEnd: null,
    }
  }

  /**
   * Clean up old listeners and register new lifecycle listeners on a voice entry.
   * Implements proper released -> available state transition (QC-1-01)
   * and prevents orphaned listeners on rapid reactivation (QC-1-09).
   * @internal
   */
  private setupVoiceListeners(entry: VoiceEntry): void {
    // Clean up old listeners from previous activation
    this.cleanupVoiceListeners(entry)

    // Register new listeners with proper state transitions:
    // stop -> released (voice is releasing envelope)
    // end -> available (voice playback fully complete)
    const onStop = (): void => {
      if (entry.state === 'active') {
        entry.releasedAt = this.audioContext.currentTime
        entry.state = 'released'
        this._activeCount--
      }
    }
    const onEnd = (): void => {
      if (entry.state === 'released') {
        entry.state = 'available'
      }
      // Clean up references
      entry.onStop = null
      entry.onEnd = null
    }

    entry.onStop = onStop
    entry.onEnd = onEnd
    entry.oscillator.once('stop', onStop)
    entry.oscillator.once('end', onEnd)
  }

  /**
   * Clean up listeners from a voice entry without triggering state transitions.
   * Used during stealing and stopAll to prevent stale listeners.
   * @internal
   */
  private cleanupVoiceListeners(entry: VoiceEntry): void {
    if (entry.onStop) {
      entry.oscillator.off('stop', entry.onStop)
      entry.onStop = null
    }
    if (entry.onEnd) {
      entry.oscillator.off('end', entry.onEnd)
      entry.onEnd = null
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
    this._activeCount++

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

    // Set up voice lifecycle listeners (handles cleanup of old listeners)
    this.setupVoiceListeners(entry)

    // Create handle
    entry.handle = this.createHandle(entry)
    return entry.handle
  }

  /**
   * Build a VoiceHandle for an entry. State transitions are driven by the
   * oscillator's 'stop' (active -> released) and 'end' (released -> available)
   * events so a released voice keeps ringing its ADSR tail until it truly
   * finishes. The handle callback only clears the handle reference, plus a
   * fallback transition for oscillators whose 'stop' event never fired
   * (e.g. stop() called before playback actually began).
   * @internal
   */
  private createHandle(entry: VoiceEntry): VoiceHandle {
    return new VoiceHandle(entry.oscillator, () => {
      entry.handle = null
      if (entry.state === 'active') {
        this._activeCount--
        entry.releasedAt = this.audioContext.currentTime
        entry.state = 'released'
      }
    })
  }

  private retriggerVoice(
    entry: VoiceEntry,
    frequency: number,
    voiceGain: number | undefined,
    now: number,
  ): VoiceHandle {
    // Invalidate old handle
    entry.handle?._invalidate()

    // Remove lifecycle listeners BEFORE stopping: the voice stays active
    // through a retrigger, so the old 'stop' listener must not fire and
    // demote it to released (which also corrupted activeVoices).
    this.cleanupVoiceListeners(entry)

    // Stop and replay (Oscillator.play() -> setup() handles envelope retrigger)
    entry.oscillator.stopAt(now)
    entry.startedAt = now
    entry.frequency = frequency
    entry.state = 'active'

    if (voiceGain !== undefined) {
      entry.oscillator.changeGainTo(voiceGain)
    }

    entry.oscillator.update('frequency').to(frequency).as('ratio')
    entry.oscillator.setDestination(this.sharedBusInput)
    void entry.oscillator.play()

    // Set up fresh voice lifecycle listeners
    this.setupVoiceListeners(entry)

    entry.handle = this.createHandle(entry)
    return entry.handle
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
   * Stop all active voices immediately, including voices already mid-release
   * from an earlier stop() call. All handles become stale.
   *
   * State is updated synchronously here rather than deferred to the
   * oscillator's own 'stop'/'end' events (as `setupVoiceListeners` does for
   * a normal single-voice stop) — those events depend on Oscillator's own
   * async play/stop machinery (e.g. an AudioContext.resume() still in
   * flight), which panic can't afford to wait on. Recycling the slot
   * immediately is click-safe: G1's `Oscillator.setup()` already detects a
   * still-audible outgoing node (via `_isPlaying`/`_releaseTailEndsAt`) on
   * the NEXT play() and routes it through a release-gain handoff instead of
   * a hard cut, regardless of whether this method's synchronous bookkeeping
   * or the oscillator's own async event fires first.
   *
   * @example
   * ```typescript
   * synth.stopAll() // Panic button
   * ```
   */
  stopAll(): void {
    const now = this.audioContext.currentTime
    const fadeTime = 0.01 // 10ms anti-click ramp, matches Oscillator.stopAt()

    for (const voice of this.voices) {
      if (voice.state === 'active') {
        voice.handle?._invalidate()
        voice.handle = null
        // Clean up listeners before stopping — state is being driven
        // synchronously below, so the async 'stop'/'end' this triggers must
        // not also try to transition it (double-decrement / stale-entry risk).
        this.cleanupVoiceListeners(voice)
        try {
          void voice.oscillator.stop()
        }
        catch {
          // Already stopped
        }
        voice.state = 'available'
        this._activeCount--
      }
      else if (voice.state === 'released') {
        // H5: previously skipped entirely — a mid-release tail from an
        // earlier stop() kept ringing for up to `release` seconds after
        // panic. Oscillator has no public API to force an already-released
        // voice silent early (its own stop()/stopAt() no-op once
        // `_isPlaying` is already false), so hard-neutralize the node
        // directly: cancel the in-flight release ramp and fade+stop it now.
        voice.handle?._invalidate()
        voice.handle = null
        this.cleanupVoiceListeners(voice)
        try {
          const { gain } = voice.oscillator.getGainNode()
          gain.cancelScheduledValues(now)
          gain.setValueAtTime(gain.value, now)
          gain.linearRampToValueAtTime(0, now + fadeTime)
          voice.oscillator.audioSourceNode.stop(now + fadeTime)
        }
        catch {
          // Already stopped/ended
        }
        voice.state = 'available'
      }
    }
  }

  /**
   * Update a master bus parameter immediately.
   *
   * Note: unlike {@link GrainPlayer}, PolySynth's master bus intentionally does
   * NOT have `onPlaySet()`/`onPlayRamp()` (R1#6 evaluated this and skipped it) —
   * PolySynth has no singular "play()" for the whole instance to hook a
   * consume-once schedule onto; `play(options)` triggers one voice at a time
   * and each returned {@link VoiceHandle} already exposes its own
   * `onPlaySet()`/`onPlayRamp()` (delegating to the voice's Oscillator) for
   * per-note envelopes. Use those for per-note fades, or `update('gain')` /
   * `changeGainTo()` here for master-bus-wide immediate changes.
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
        as: (method: RatioType): void => {
          param.setValueAtTime(convertValue(value, method, type), this.audioContext.currentTime)
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
    this._activeCount = 0 // Safety reset after stopAll

    // Dispose all oscillators
    for (const voice of this.voices) {
      voice.oscillator.dispose()
    }
    this.voices = []

    // Disconnect shared bus
    this.safeDisconnect(this.sharedBusInput)
    this.safeDisconnect(this.masterGain)
    this.safeDisconnect(this.masterPan)

    // Dispose each effect's own internal node graph + listeners (same class
    // as base-sound.ts H20 fix — previously effects were only dropped from
    // the array with no disconnect/dispose, leaking every attached effect's
    // internal nodes on PolySynth disposal).
    for (const effect of this.effects) {
      this.safeDisconnect(effect.output)
      effect.dispose?.()
    }
    this.effects = []
    this._analyzer = null

    this._disposed = true
    this.emit('dispose', { source: this })

    // Release every registered listener, then silence future events
    this._clearListeners()
    this.dispatchEvent = () => false
  }
}

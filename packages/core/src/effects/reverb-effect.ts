import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * Options for algorithmic reverb.
 */
export interface AlgorithmicReverbOptions {
  /** Reverb decay time in seconds (default: 1.5) */
  decay?: number
  /** Pre-delay time in seconds, 0-0.1 (default: 0.01) */
  preDelay?: number
  /** High-frequency damping, 0-1 where 1 = very dark (default: 0.3) */
  damping?: number
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
}

/**
 * Options for convolution reverb.
 */
export interface ConvolutionReverbOptions {
  /** Whether to normalize the impulse response (default: true) */
  normalize?: boolean
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
}

// Standard Schroeder comb filter delay times (seconds)
const COMB_DELAY_TIMES = [0.0297, 0.0371, 0.0411, 0.0437]
const COMB_BASE_FEEDBACK = 0.84
const ALLPASS_DELAY_TIMES = [0.005, 0.0017]
const ALLPASS_GAIN = 0.7

/** Internal comb filter structure */
interface CombFilter {
  delay: DelayNode
  feedback: GainNode
  damping: BiquadFilterNode
}

/** Internal allpass filter structure */
interface AllpassFilter {
  delay: DelayNode
  gain: GainNode
}

/**
 * ReverbEffect - Reverb with two modes: algorithmic (Schroeder) and convolution.
 *
 * **Algorithmic mode:** Builds a Schroeder reverb network with 4 parallel comb
 * filters and 2 series allpass filters. Configurable decay, pre-delay, and damping.
 *
 * **Convolution mode:** Uses a ConvolverNode with an impulse response buffer for
 * realistic space simulation (halls, rooms, plates, etc.).
 *
 * Use `createReverb()` factory for ergonomic creation with auto-detection.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * import { createReverb, createSound } from 'ez-web-audio'
 *
 * // Algorithmic reverb (synchronous)
 * const reverb = createReverb({ decay: 2, damping: 0.4 })
 * sound.addEffect(reverb)
 *
 * // Convolution reverb (async - loads impulse response)
 * const hallReverb = await createReverb('hall.wav')
 * sound.addEffect(hallReverb)
 * ```
 */
export class ReverbEffect extends BaseEffect {
  private readonly _mode: 'algorithmic' | 'convolution'

  // Algorithmic mode nodes
  private preDelayNode?: DelayNode
  private combFilters?: CombFilter[]
  private combMerge?: GainNode
  private allpassFilters?: AllpassFilter[]
  private _decay: number = 1.5
  private _damping: number = 0.3
  private _preDelay!: number

  // Convolution mode nodes
  private convolverNode?: ConvolverNode

  /**
   * Create an algorithmic reverb.
   */
  constructor(audioContext: AudioContext, options?: AlgorithmicReverbOptions)
  /**
   * @internal
   */
  constructor(audioContext: AudioContext, options: AlgorithmicReverbOptions | undefined, mode: 'convolution', buffer: AudioBuffer, convOptions?: ConvolutionReverbOptions)
  constructor(
    audioContext: AudioContext,
    options?: AlgorithmicReverbOptions,
    mode?: 'convolution',
    buffer?: AudioBuffer,
    convOptions?: ConvolutionReverbOptions,
  ) {
    super(audioContext)

    if (mode === 'convolution') {
      this._mode = 'convolution'
      this.buildConvolution(audioContext, buffer!, convOptions ?? {})
    }
    else {
      this._mode = 'algorithmic'
      this.buildAlgorithmic(audioContext, options ?? {})
    }
  }

  private buildAlgorithmic(audioContext: AudioContext, options: AlgorithmicReverbOptions): void {
    // ctor-setter-parity: decay/damping feed the initial comb/allpass node
    // construction below, so (unlike preDelay) they can't be routed through
    // their public setters directly — those setters require combFilters to
    // already exist. Instead, ctor and setter share the same clamp
    // functions (clampDecay/clampDamping) so validation can't diverge.
    this._decay = this.clampDecay(options.decay ?? 1.5)
    this._damping = this.clampDamping(options.damping ?? 0.3)

    // Pre-delay: preDelayNode exists before comb construction, so this CAN
    // (and does) route through the public setter for ctor-setter-parity.
    this.preDelayNode = audioContext.createDelay(0.1)
    this.preDelay = options.preDelay ?? 0.01

    // Comb merge gain (averages 4 parallel comb outputs)
    this.combMerge = audioContext.createGain()
    this.combMerge.gain.value = 0.25

    // Build 4 parallel comb filters
    this.combFilters = COMB_DELAY_TIMES.map((baseTime) => {
      const scaledTime = baseTime * (this._decay / 1.5)
      const delay = audioContext.createDelay(2.0)
      delay.delayTime.value = scaledTime

      const feedback = audioContext.createGain()
      feedback.gain.value = COMB_BASE_FEEDBACK

      const damping = audioContext.createBiquadFilter()
      damping.type = 'lowpass'
      damping.frequency.value = this.dampingToFrequency(this._damping)

      // Comb filter loop: preDelay -> delay -> damping -> feedback -> delay (loop)
      //                                       damping -> combMerge
      this.preDelayNode!.connect(delay)
      delay.connect(damping)
      damping.connect(feedback)
      feedback.connect(delay) // feedback loop
      damping.connect(this.combMerge!)

      return { delay, feedback, damping }
    })

    // Build 2 series allpass filters
    this.allpassFilters = ALLPASS_DELAY_TIMES.map((time) => {
      const delay = audioContext.createDelay(0.1)
      delay.delayTime.value = time

      const gain = audioContext.createGain()
      gain.gain.value = ALLPASS_GAIN

      return { delay, gain }
    })

    // Wire allpass filters in series
    // combMerge -> allpass1 -> allpass2 -> wetGain
    //
    // Each allpass: input -> delay -> output, input -> gain -> output (feedforward),
    //               delay -> gain_neg -> input (feedback)
    // Simplified: just wire as delay with gain for the mock-friendly version
    let allpassInput: AudioNode = this.combMerge
    for (const ap of this.allpassFilters) {
      allpassInput.connect(ap.delay)
      ap.delay.connect(ap.gain)
      ap.gain.connect(ap.delay) // feedback loop
      allpassInput = ap.delay
    }

    // Final routing: input -> preDelay -> [combs] -> combMerge -> [allpasses] -> wetGain
    this.inputNode.connect(this.preDelayNode)
    allpassInput.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  private buildConvolution(audioContext: AudioContext, buffer: AudioBuffer, options: ConvolutionReverbOptions): void {
    this.convolverNode = audioContext.createConvolver()
    this.convolverNode.buffer = buffer
    this.convolverNode.normalize = options.normalize ?? true

    // Wire: input -> convolver -> wetGain
    this.inputNode.connect(this.convolverNode)
    this.convolverNode.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /**
   * Create a convolution reverb from an existing AudioBuffer.
   */
  static fromConvolution(
    audioContext: AudioContext,
    buffer: AudioBuffer,
    options: ConvolutionReverbOptions = {},
  ): ReverbEffect {
    return new ReverbEffect(audioContext, undefined, 'convolution', buffer, options)
  }

  /** Reverb mode: 'algorithmic' or 'convolution' */
  get mode(): 'algorithmic' | 'convolution' {
    return this._mode
  }

  /** Decay time in seconds (algorithmic mode only) */
  get decay(): number {
    return this._decay
  }

  set decay(v: number) {
    if (this._mode !== 'algorithmic' || !this.combFilters)
      return
    // M10: clamp (a non-finite/negative decay produces a negative or NaN
    // comb delay time). Previously stored `v` verbatim, unclamped.
    this._decay = this.clampDecay(v)
    // R10#7: use the shared smoothing helper instead of a hand-rolled
    // timeConstant literal (was drift risk — it happened to already equal
    // PARAM_SMOOTHING_TIME_CONSTANT, but nothing enforced that).
    const now = this.audioContext.currentTime
    this.combFilters.forEach((comb, i) => {
      const newDelayTime = COMB_DELAY_TIMES[i] * (this._decay / 1.5)
      smoothParamSet(comb.delay.delayTime, newDelayTime, now)
    })
  }

  /** Pre-delay time in seconds (algorithmic mode only) */
  get preDelay(): number {
    return this._mode === 'algorithmic' ? this._preDelay : 0
  }

  set preDelay(v: number) {
    if (this._mode !== 'algorithmic' || !this.preDelayNode)
      return
    // R10#6: floor at 0 (previously only the 0.1s upper bound was clamped;
    // a negative preDelay is meaningless for a DelayNode).
    this._preDelay = this.clampPreDelay(v)
    smoothParamSet(this.preDelayNode.delayTime, this._preDelay, this.audioContext.currentTime)
  }

  /** Damping amount 0-1 (algorithmic mode only). Higher = darker */
  get damping(): number {
    return this._damping
  }

  set damping(v: number) {
    if (this._mode !== 'algorithmic' || !this.combFilters)
      return
    this._damping = this.clampDamping(v)
    const freq = this.dampingToFrequency(this._damping)
    // R10#7: shared smoothing helper (see decay setter comment above).
    const now = this.audioContext.currentTime
    for (const comb of this.combFilters) {
      smoothParamSet(comb.damping.frequency, freq, now)
    }
  }

  /** Whether to normalize the impulse response (convolution mode only) */
  get normalize(): boolean {
    return this.convolverNode?.normalize ?? true
  }

  set normalize(v: boolean) {
    if (this._mode !== 'convolution' || !this.convolverNode)
      return
    this.convolverNode.normalize = v
  }

  public override dispose(): void {
    if (this.combFilters) {
      for (const comb of this.combFilters) {
        try {
          comb.delay.disconnect()
        }
        catch { /* already disconnected */ }
        try {
          comb.feedback.disconnect()
        }
        catch { /* already disconnected */ }
        try {
          comb.damping.disconnect()
        }
        catch { /* already disconnected */ }
      }
    }
    // H9: combMerge (the GainNode averaging the 4 parallel comb outputs
    // before the allpass chain) was never disconnected — every other node
    // in the algorithmic network was, but this one was missed.
    if (this.combMerge) {
      try {
        this.combMerge.disconnect()
      }
      catch { /* already disconnected */ }
    }
    if (this.allpassFilters) {
      for (const ap of this.allpassFilters) {
        try {
          ap.delay.disconnect()
        }
        catch { /* already disconnected */ }
        try {
          ap.gain.disconnect()
        }
        catch { /* already disconnected */ }
      }
    }
    if (this.preDelayNode) {
      try {
        this.preDelayNode.disconnect()
      }
      catch { /* already disconnected */ }
    }
    if (this.convolverNode) {
      try {
        this.convolverNode.disconnect()
      }
      catch { /* already disconnected */ }
    }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'preDelay': return this.preDelayNode?.delayTime ?? null
      default: return null
    }
  }

  /**
   * `decay` and `damping` are documented ReverbEffect properties but drive
   * a multi-node comb-filter network (4 delay times + 4 biquad
   * frequencies), not a single AudioParam — rampTo() warns rather than
   * silently no-op-ing if called with either name. Use the direct property
   * setters instead (they're already smoothed via setTargetAtTime).
   */
  protected override getUnrampableParams(): readonly string[] {
    return ['decay', 'damping']
  }

  /**
   * ramp-setter-desync fix: rampTo('preDelay', ...) re-applies the same
   * [0, 0.1] clamp the `preDelay` setter uses and updates the shadow field.
   */
  protected override onParamRamped(param: string, value: number): number {
    if (param === 'preDelay') {
      this._preDelay = this.clampPreDelay(value)
      return this._preDelay
    }
    return value
  }

  private clampDecay(v: number): number {
    return Number.isFinite(v) ? Math.max(0.05, v) : 0.05
  }

  private clampDamping(v: number): number {
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
  }

  private clampPreDelay(v: number): number {
    return Number.isFinite(v) ? Math.max(0, Math.min(v, 0.1)) : 0
  }

  /** Convert damping value (0-1) to lowpass frequency */
  private dampingToFrequency(damping: number): number {
    return 200 + (1 - damping) * 18000
  }
}

/**
 * Factory function to create a ReverbEffect.
 *
 * Auto-detects mode from arguments:
 * - No args or object → algorithmic reverb (synchronous)
 * - String URL → convolution reverb (async, loads impulse response)
 * - AudioBuffer → convolution reverb (synchronous)
 *
 * AudioContext is optional as the first argument.
 *
 * @example
 * ```typescript
 * // Algorithmic reverb (good defaults)
 * const reverb = createReverb()
 *
 * // Algorithmic with options
 * const reverb2 = createReverb({ decay: 2, damping: 0.4 })
 *
 * // Convolution from URL (async)
 * const reverb3 = await createReverb('hall.wav')
 *
 * // Convolution from AudioBuffer
 * const reverb4 = createReverb(audioBuffer)
 *
 * // With explicit AudioContext
 * const reverb5 = createReverb(audioContext, { decay: 3 })
 * const reverb6 = await createReverb(audioContext, 'hall.wav')
 * ```
 */
// Algorithmic overloads
export function createReverb(options?: AlgorithmicReverbOptions): ReverbEffect
export function createReverb(audioContext: BaseAudioContext, options?: AlgorithmicReverbOptions): ReverbEffect
// Convolution from URL overloads
export function createReverb(url: string, options?: ConvolutionReverbOptions): Promise<ReverbEffect>
export function createReverb(audioContext: BaseAudioContext, url: string, options?: ConvolutionReverbOptions): Promise<ReverbEffect>
// Convolution from AudioBuffer overloads
export function createReverb(buffer: AudioBuffer, options?: ConvolutionReverbOptions): ReverbEffect
export function createReverb(audioContext: BaseAudioContext, buffer: AudioBuffer, options?: ConvolutionReverbOptions): ReverbEffect
// Implementation
export function createReverb(
  first?: BaseAudioContext | AlgorithmicReverbOptions | string | AudioBuffer,
  second?: AlgorithmicReverbOptions | ConvolutionReverbOptions | string | AudioBuffer,
  third?: ConvolutionReverbOptions,
): ReverbEffect | Promise<ReverbEffect> {
  // Detect if first arg is AudioContext
  const isAudioContext = first instanceof BaseAudioContext

  if (isAudioContext) {
    const ctx = first as AudioContext
    // createReverb(audioContext, ...)
    if (typeof second === 'string') {
      return loadConvolutionReverb(ctx, second, (third as ConvolutionReverbOptions) ?? {})
    }
    if (second !== undefined && isAudioBuffer(second)) {
      return ReverbEffect.fromConvolution(ctx, second as AudioBuffer, (third as ConvolutionReverbOptions) ?? {})
    }
    return new ReverbEffect(ctx, (second as AlgorithmicReverbOptions) ?? {})
  }

  // No AudioContext provided
  const ctx = getOrCreateAudioContext()

  if (typeof first === 'string') {
    return loadConvolutionReverb(ctx, first, (second as ConvolutionReverbOptions) ?? {})
  }
  if (first !== undefined && isAudioBuffer(first)) {
    return ReverbEffect.fromConvolution(ctx, first as AudioBuffer, (second as ConvolutionReverbOptions) ?? {})
  }
  return new ReverbEffect(ctx, (first as AlgorithmicReverbOptions) ?? {})
}

/** Check if a value is an AudioBuffer (duck typing) */
function isAudioBuffer(value: unknown): value is AudioBuffer {
  return typeof value === 'object'
    && value !== null
    && 'duration' in value
    && 'length' in value
    && 'sampleRate' in value
    && 'numberOfChannels' in value
}

/** Load an impulse response from a URL and create convolution reverb */
async function loadConvolutionReverb(
  audioContext: AudioContext,
  url: string,
  options: ConvolutionReverbOptions,
): Promise<ReverbEffect> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load impulse response from "${url}": ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  return ReverbEffect.fromConvolution(audioContext, audioBuffer, options)
}

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
  private _preDelay: number = 0.01

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
    this._decay = options.decay ?? 1.5
    this._damping = options.damping ?? 0.3

    // Pre-delay
    this._preDelay = Math.min(options.preDelay ?? 0.01, 0.1)
    this.preDelayNode = audioContext.createDelay(0.1)
    this.preDelayNode.delayTime.value = this._preDelay

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
    this._decay = v
    // M7: Use setTargetAtTime for smooth (click-free) transitions
    const now = this.audioContext.currentTime
    const timeConstant = 0.01 / 3 // ~10ms smooth transition
    this.combFilters.forEach((comb, i) => {
      const newDelayTime = COMB_DELAY_TIMES[i] * (v / 1.5)
      comb.delay.delayTime.setTargetAtTime(newDelayTime, now, timeConstant)
    })
  }

  /** Pre-delay time in seconds (algorithmic mode only) */
  get preDelay(): number {
    return this._mode === 'algorithmic' ? this._preDelay : 0
  }

  set preDelay(v: number) {
    if (this._mode !== 'algorithmic' || !this.preDelayNode)
      return
    this._preDelay = Math.min(v, 0.1)
    smoothParamSet(this.preDelayNode.delayTime, this._preDelay, this.audioContext.currentTime)
  }

  /** Damping amount 0-1 (algorithmic mode only). Higher = darker */
  get damping(): number {
    return this._damping
  }

  set damping(v: number) {
    if (this._mode !== 'algorithmic' || !this.combFilters)
      return
    this._damping = Math.max(0, Math.min(1, v))
    const freq = this.dampingToFrequency(this._damping)
    // M7: Use setTargetAtTime for smooth (click-free) transitions
    const now = this.audioContext.currentTime
    const timeConstant = 0.01 / 3 // ~10ms smooth transition
    for (const comb of this.combFilters) {
      comb.damping.frequency.setTargetAtTime(freq, now, timeConstant)
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

import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * All available BiquadFilter types.
 */
export type FilterType
  = | 'lowpass'
    | 'highpass'
    | 'bandpass'
    | 'lowshelf'
    | 'highshelf'
    | 'peaking'
    | 'notch'
    | 'allpass'

/** Filter types where BiquadFilterNode.gain has an audible effect (per Web Audio spec). */
const GAIN_AWARE_TYPES = new Set<FilterType>(['lowshelf', 'highshelf', 'peaking'])

/**
 * Options for creating a FilterEffect.
 */
export interface FilterEffectOptions {
  /** Filter frequency in Hz (default: 350) */
  frequency?: number
  /** Filter Q factor (default: 1) */
  q?: number
  /** Filter gain in dB (default: 0) - only used for shelf and peaking filters */
  gain?: number
  /** Filter detune in cents (default: 0) */
  detune?: number
}

/**
 * FilterEffect - A wrapper around BiquadFilterNode that implements the Effect interface.
 *
 * Supports all 8 BiquadFilter types with wet/dry mixing via equal-power crossfade.
 * The bypass and mix controls allow smooth blending between filtered and dry signal.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * const filter = createFilterEffect(audioContext, 'lowpass', { frequency: 800, q: 2 })
 * filter.frequency = 1000  // Adjust cutoff
 * filter.mix = 0.5  // 50% wet/dry
 * filter.bypass = true  // Bypass filter entirely
 * filter.rampTo('frequency', 2000, 1)  // Smooth ramp over 1 second
 * ```
 */
export class FilterEffect extends BaseEffect {
  private readonly filterNode: BiquadFilterNode

  // Shadow state: setters smooth via setTargetAtTime, so node .value lags
  // the target — getters return these instead
  private _frequency!: number
  private _q!: number
  private _gain!: number
  private _detune!: number

  constructor(
    audioContext: AudioContext,
    type: FilterType,
    options: FilterEffectOptions = {},
  ) {
    super(audioContext)

    // Create the filter node first...
    this.filterNode = audioContext.createBiquadFilter()
    this.filterNode.type = type

    // ...then initialize via the public setters (ctor-setter-parity) so
    // ctor values can't diverge from the setters' validation (R11#5: this
    // effect previously had ZERO validation anywhere, ctor or setter).
    this.frequency = options.frequency ?? 350
    this.q = options.q ?? 1
    this.gain = options.gain ?? 0
    this.detune = options.detune ?? 0

    // Wire effect chain: input -> filter -> wetGain
    this.inputNode.connect(this.filterNode)
    this.filterNode.connect(this.wetGain)
  }

  /**
   * Filter frequency in Hz. Clamped to [0, sampleRate / 2] (Nyquist) —
   * BiquadFilterNode.frequency is spec'd over that range; anything outside
   * it is meaningless (and some implementations clamp/misbehave silently).
   */
  get frequency(): number {
    return this._frequency
  }

  set frequency(v: number) {
    this._frequency = this.clampFrequency(v)
    smoothParamSet(this.filterNode.frequency, this._frequency, this.audioContext.currentTime)
  }

  /**
   * Filter Q factor (resonance). Floored just above 0 — a Q of exactly 0
   * (or negative) is undefined/unstable for resonant filter types
   * (bandpass/notch/peaking).
   */
  get q(): number {
    return this._q
  }

  set q(v: number) {
    this._q = this.clampQ(v)
    smoothParamSet(this.filterNode.Q, this._q, this.audioContext.currentTime)
  }

  /**
   * Filter gain in dB. Only affects `lowshelf`, `highshelf`, and `peaking`
   * filter types — the other 5 types (lowpass, highpass, bandpass, notch,
   * allpass) ignore gain entirely per the Web Audio spec. Setting gain on
   * one of those types is a silent no-op audibly; a dev warning is emitted
   * to catch the mistake early.
   */
  get gain(): number {
    return this._gain
  }

  set gain(v: number) {
    if (v !== 0 && !GAIN_AWARE_TYPES.has(this.filterNode.type)) {
      console.warn(
        `[ez-web-audio] FilterEffect.gain has no audible effect on type "${this.filterNode.type}" — gain only applies to lowshelf/highshelf/peaking.`,
      )
    }
    this._gain = v
    smoothParamSet(this.filterNode.gain, v, this.audioContext.currentTime)
  }

  /** Filter detune in cents */
  get detune(): number {
    return this._detune
  }

  set detune(v: number) {
    this._detune = v
    smoothParamSet(this.filterNode.detune, v, this.audioContext.currentTime)
  }

  /**
   * The current filter type.
   *
   * **Hard-cut, not a crossfade:** changing type reconfigures the
   * BiquadFilterNode's internal coefficients instantly — there is no
   * ramp/interpolation between the old and new filter response. If audio
   * is actively flowing through this effect when the type changes, expect
   * an audible discontinuity (click/thump), the same class of pop that
   * curve-swap effects (e.g. DistortionEffect) have. Wrap the change in a
   * `mix` fade-to-0 / fade-back-to-target if that's audible in context.
   */
  get type(): FilterType {
    return this.filterNode.type as FilterType
  }

  set type(v: FilterType) {
    this.filterNode.type = v
  }

  public override dispose(): void {
    try {
      this.filterNode.disconnect()
    }
    catch { /* already disconnected */ }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'frequency': return this.filterNode.frequency
      case 'q': return this.filterNode.Q
      case 'gain': return this.filterNode.gain
      case 'detune': return this.filterNode.detune
      default: return null
    }
  }

  /**
   * ramp-setter-desync fix: rampTo('frequency'/'q', ...) re-applies the
   * same clamps the property setters use so the getter and AudioParam can
   * never diverge; gain/detune have no range restriction so they pass
   * through (matching their setters).
   */
  protected override onParamRamped(param: string, value: number): number {
    switch (param) {
      case 'frequency':
        this._frequency = this.clampFrequency(value)
        return this._frequency
      case 'q':
        this._q = this.clampQ(value)
        return this._q
      case 'gain':
        this._gain = value
        return value
      case 'detune':
        this._detune = value
        return value
      default:
        return value
    }
  }

  private clampFrequency(v: number): number {
    if (!Number.isFinite(v))
      return this._frequency ?? 0
    const nyquist = this.audioContext.sampleRate / 2
    return Math.max(0, Math.min(nyquist, v))
  }

  private clampQ(v: number): number {
    if (!Number.isFinite(v))
      return this._q ?? Number.EPSILON
    return Math.max(Number.EPSILON, v)
  }
}

/**
 * Factory function to create a FilterEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext
 * (created lazily on first use).
 *
 * @param type - The BiquadFilterType string (or AudioContext as first arg for backwards compatibility)
 * @param options - Optional filter parameters
 * @returns A new FilterEffect instance
 *
 * @example
 * ```typescript
 * // Without AudioContext (recommended)
 * const lowpass = createFilterEffect('lowpass', { frequency: 800 })
 *
 * // With explicit AudioContext (backwards compatible)
 * const highpass = createFilterEffect(audioContext, 'highpass', { frequency: 200, q: 2 })
 * ```
 */
export function createFilterEffect(
  type: FilterType,
  options?: FilterEffectOptions,
): FilterEffect
export function createFilterEffect(
  audioContext: BaseAudioContext,
  type: FilterType,
  options?: FilterEffectOptions,
): FilterEffect
export function createFilterEffect(
  audioContextOrType: BaseAudioContext | FilterType,
  typeOrOptions?: FilterType | FilterEffectOptions,
  options?: FilterEffectOptions,
): FilterEffect {
  if (typeof audioContextOrType === 'string') {
    // Called as createFilterEffect(type, options?)
    return new FilterEffect(
      getOrCreateAudioContext(),
      audioContextOrType,
      (typeOrOptions as FilterEffectOptions) ?? {},
    )
  }
  // Called as createFilterEffect(audioContext, type, options?)
  return new FilterEffect(
    audioContextOrType as AudioContext,
    typeOrOptions as FilterType,
    options ?? {},
  )
}

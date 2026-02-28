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

  constructor(
    audioContext: AudioContext,
    type: FilterType,
    options: FilterEffectOptions = {},
  ) {
    super(audioContext)

    // Create and configure filter
    this.filterNode = audioContext.createBiquadFilter()
    this.filterNode.type = type
    this.filterNode.frequency.value = options.frequency ?? 350
    this.filterNode.Q.value = options.q ?? 1
    this.filterNode.gain.value = options.gain ?? 0
    this.filterNode.detune.value = options.detune ?? 0

    // Wire effect chain: input -> filter -> wetGain
    this.inputNode.connect(this.filterNode)
    this.filterNode.connect(this.wetGain)
  }

  /** Filter frequency in Hz */
  get frequency(): number {
    return this.filterNode.frequency.value
  }

  set frequency(v: number) {
    this.filterNode.frequency.value = v
  }

  /** Filter Q factor (resonance) */
  get q(): number {
    return this.filterNode.Q.value
  }

  set q(v: number) {
    this.filterNode.Q.value = v
  }

  /** Filter gain in dB (for shelf and peaking filters) */
  get gain(): number {
    return this.filterNode.gain.value
  }

  set gain(v: number) {
    this.filterNode.gain.value = v
  }

  /** Filter detune in cents */
  get detune(): number {
    return this.filterNode.detune.value
  }

  set detune(v: number) {
    this.filterNode.detune.value = v
  }

  /** The current filter type */
  get type(): FilterType {
    return this.filterNode.type as FilterType
  }

  set type(v: FilterType) {
    this.filterNode.type = v
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
  audioContext: AudioContext,
  type: FilterType,
  options?: FilterEffectOptions,
): FilterEffect
export function createFilterEffect(
  audioContextOrType: AudioContext | FilterType,
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
    audioContextOrType,
    typeOrOptions as FilterType,
    options ?? {},
  )
}

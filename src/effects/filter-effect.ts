import type { Effect } from './index'
import { getOrCreateAudioContext } from '@/audio-context'
import { applyEqualPowerCrossfade } from '@utils/equal-power-crossfade'

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
 * @example
 * ```typescript
 * const filter = createFilterEffect(audioContext, 'lowpass', { frequency: 800, q: 2 })
 * filter.frequency = 1000  // Adjust cutoff
 * filter.mix = 0.5  // 50% wet/dry
 * filter.bypass = true  // Bypass filter entirely
 * ```
 */
export class FilterEffect implements Effect {
  private readonly filterNode: BiquadFilterNode
  private readonly inputNode: GainNode
  private readonly outputNode: GainNode
  private readonly dryGain: GainNode
  private readonly wetGain: GainNode

  private _bypass = false
  private _mix = 1

  constructor(
    audioContext: AudioContext,
    type: FilterType,
    options: FilterEffectOptions = {},
  ) {
    // Create nodes
    this.filterNode = audioContext.createBiquadFilter()
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    this.dryGain = audioContext.createGain()
    this.wetGain = audioContext.createGain()

    // Configure filter
    this.filterNode.type = type
    this.filterNode.frequency.value = options.frequency ?? 350
    this.filterNode.Q.value = options.q ?? 1
    this.filterNode.gain.value = options.gain ?? 0
    this.filterNode.detune.value = options.detune ?? 0

    // Set up routing for wet/dry mix
    // Input splits to dry path and wet path (through filter)
    // Dry: input -> dryGain -> output
    // Wet: input -> filter -> wetGain -> output
    this.inputNode.connect(this.dryGain)
    this.inputNode.connect(this.filterNode)
    this.filterNode.connect(this.wetGain)
    this.dryGain.connect(this.outputNode)
    this.wetGain.connect(this.outputNode)

    // Apply initial mix (full wet by default)
    this.applyMix()
  }

  /** The input AudioNode (receives signal from chain) */
  get input(): AudioNode {
    return this.inputNode
  }

  /** The output AudioNode (sends signal to next in chain) */
  get output(): AudioNode {
    return this.outputNode
  }

  /**
   * When true, signal bypasses the filter entirely (100% dry).
   */
  get bypass(): boolean {
    return this._bypass
  }

  set bypass(v: boolean) {
    this._bypass = v
    this.applyMix()
  }

  /**
   * Wet/dry mix: 0 = fully dry (no filter), 1 = fully wet (all through filter).
   * Uses equal-power crossfade for natural mixing.
   */
  get mix(): number {
    return this._mix
  }

  set mix(v: number) {
    this._mix = Math.max(0, Math.min(1, v)) // Clamp to 0-1
    this.applyMix()
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

  /**
   * Apply wet/dry mix using equal-power crossfade.
   * Delegates to shared utility for consistent mixing across all effects.
   */
  private applyMix(): void {
    applyEqualPowerCrossfade(this.dryGain, this.wetGain, this._mix, this._bypass)
  }
}

/**
 * Factory function to create a FilterEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext
 * (created lazily on first use).
 *
 * @param audioContextOrType - Either an AudioContext or the filter type string
 * @param typeOrOptions - The filter type (when AudioContext is provided) or filter options
 * @param options - Optional filter parameters (when AudioContext is provided)
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

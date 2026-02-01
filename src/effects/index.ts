/**
 * Effect interface that all effect classes must implement.
 * Provides a common interface for effect chaining with bypass and wet/dry mix controls.
 */
export interface Effect {
  /** The input AudioNode that receives signal from the chain */
  input: AudioNode
  /** The output AudioNode that sends signal to the next in chain */
  output: AudioNode
  /** When true, effect is bypassed (passthrough) */
  bypass: boolean
  /** Wet/dry mix: 0 = fully dry (no effect), 1 = fully wet (full effect) */
  mix: number
}

// Re-export classes
export { GainEffect } from './gain-effect'
export { FilterEffect, type FilterType, type FilterEffectOptions } from './filter-effect'
export { EffectWrapper, type ExternalEffect } from './effect-wrapper'

// Factory functions
export { createGainEffect } from './gain-effect'
export { createFilterEffect } from './filter-effect'
export { wrapEffect } from './effect-wrapper'

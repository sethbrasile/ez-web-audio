/**
 * Common interface for all audio effects.
 *
 * Effects can be added to any Sound, Oscillator, or LayeredSound via addEffect().
 * All effects support bypass (passthrough) and wet/dry mix controls.
 *
 * @example
 * ```typescript
 * import { createSound, createGainEffect, createFilterEffect } from 'ez-web-audio'
 *
 * const sound = await createSound('audio.mp3')
 * const boost = createGainEffect(1.5)
 * const filter = createFilterEffect('lowpass', { frequency: 800 })
 *
 * sound.addEffect(boost)
 * sound.addEffect(filter)
 * sound.play()
 *
 * // Control effects
 * boost.bypass = true    // Bypass gain boost
 * filter.mix = 0.5       // 50% wet/dry mix on filter
 * ```
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

export { createEffect, EffectWrapper, type ExternalEffect } from './effect-wrapper'
export { wrapEffect } from './effect-wrapper'
export { FilterEffect, type FilterEffectOptions, type FilterType } from './filter-effect'

export { createFilterEffect } from './filter-effect'
// Re-export classes
export { GainEffect } from './gain-effect'
// Factory functions
export { createGainEffect } from './gain-effect'
// Base class
export { BaseEffect } from './base-effect'
// Delay effect
export { createDelay, DelayEffect, type DelayOptions } from './delay-effect'

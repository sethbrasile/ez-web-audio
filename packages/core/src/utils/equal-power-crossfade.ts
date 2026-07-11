import { smoothParamSet } from './param-smoothing'

/**
 * Apply equal-power crossfade to wet/dry gain nodes.
 *
 * Equal-power crossfade ensures constant perceived loudness when mixing two signals.
 * Uses cos(angle) for dry and sin(angle) for wet, where angle = mix * PI/2.
 *
 * When mix = 0: dry = cos(0) = 1, wet = sin(0) = 0 (fully dry)
 * When mix = 0.5: dry = cos(π/4) ≈ 0.707, wet = sin(π/4) ≈ 0.707 (equal power)
 * When mix = 1: dry = cos(π/2) = 0, wet = sin(π/2) = 1 (fully wet)
 *
 * @param dryGain - GainNode for the dry (unprocessed) signal
 * @param wetGain - GainNode for the wet (processed) signal
 * @param mix - Mix amount from 0 (dry) to 1 (wet)
 * @param bypass - When true, sets full dry (overrides mix parameter)
 * @param currentTime - When provided, gains transition smoothly via
 *   setTargetAtTime (click-free live changes); omit for instant assignment
 *   (e.g. initial setup before any signal flows)
 *
 * @example
 * ```typescript
 * const dryGain = audioContext.createGain()
 * const wetGain = audioContext.createGain()
 * applyEqualPowerCrossfade(dryGain, wetGain, 0.7, false) // 70% wet, instant
 * applyEqualPowerCrossfade(dryGain, wetGain, 0.7, false, ctx.currentTime) // smooth
 * ```
 */
export function applyEqualPowerCrossfade(
  dryGain: GainNode,
  wetGain: GainNode,
  mix: number,
  bypass: boolean,
  currentTime?: number,
): void {
  let dryValue: number
  let wetValue: number

  if (bypass) {
    // Full dry when bypassed
    dryValue = 1
    wetValue = 0
  }
  else {
    // Equal-power crossfade
    const angle = mix * 0.5 * Math.PI // 0 to PI/2
    dryValue = Math.cos(angle) // 1 -> 0
    wetValue = Math.sin(angle) // 0 -> 1
  }

  if (currentTime !== undefined) {
    smoothParamSet(dryGain.gain, dryValue, currentTime)
    smoothParamSet(wetGain.gain, wetValue, currentTime)
  }
  else {
    dryGain.gain.value = dryValue
    wetGain.gain.value = wetValue
  }
}

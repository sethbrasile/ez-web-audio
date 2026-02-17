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
 *
 * @example
 * ```typescript
 * const dryGain = audioContext.createGain()
 * const wetGain = audioContext.createGain()
 * applyEqualPowerCrossfade(dryGain, wetGain, 0.7, false) // 70% wet
 * applyEqualPowerCrossfade(dryGain, wetGain, 0, true) // bypass: full dry
 * ```
 */
export function applyEqualPowerCrossfade(
  dryGain: GainNode,
  wetGain: GainNode,
  mix: number,
  bypass: boolean,
): void {
  if (bypass) {
    // Full dry when bypassed
    dryGain.gain.value = 1
    wetGain.gain.value = 0
  }
  else {
    // Equal-power crossfade
    const angle = mix * 0.5 * Math.PI // 0 to PI/2
    dryGain.gain.value = Math.cos(angle) // 1 -> 0
    wetGain.gain.value = Math.sin(angle) // 0 -> 1
  }
}

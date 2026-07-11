/**
 * Time constant shared by all smoothed effect-parameter setters.
 *
 * setTargetAtTime reaches ~95% of the target after 3 time constants, so
 * 0.01 / 3 gives an ~10ms transition — fast enough to feel immediate on a
 * knob, slow enough to avoid audible clicks/zipper noise from AudioParam
 * discontinuities (which reverb tails smear into loud pops).
 */
export const PARAM_SMOOTHING_TIME_CONSTANT = 0.01 / 3

/**
 * Set an AudioParam smoothly via setTargetAtTime to avoid audible pops.
 *
 * Use instead of raw `param.value = x` assignments in real-time setters.
 *
 * Non-finite values (`NaN`, `Infinity`, `-Infinity`) are rejected with a
 * `console.warn` rather than being handed to `setTargetAtTime` — a NaN
 * written to a BiquadFilter/DynamicsCompressor AudioParam poisons the
 * node's internal IIR/DSP state permanently (it never recovers, even once
 * a valid value is set later), so this guard is defensive-in-depth on top
 * of any per-effect setter validation.
 *
 * @param param - The AudioParam to change
 * @param value - The target value
 * @param currentTime - The AudioContext's currentTime
 */
export function smoothParamSet(param: AudioParam, value: number, currentTime: number): void {
  if (!Number.isFinite(value)) {
    console.warn(`[ez-web-audio] smoothParamSet: ignoring non-finite value (${value}) — AudioParam left unchanged.`)
    return
  }
  param.setTargetAtTime(value, currentTime, PARAM_SMOOTHING_TIME_CONSTANT)
}

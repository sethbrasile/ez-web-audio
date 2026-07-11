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
 * @param param - The AudioParam to change
 * @param value - The target value
 * @param currentTime - The AudioContext's currentTime
 */
export function smoothParamSet(param: AudioParam, value: number, currentTime: number): void {
  param.setTargetAtTime(value, currentTime, PARAM_SMOOTHING_TIME_CONSTANT)
}

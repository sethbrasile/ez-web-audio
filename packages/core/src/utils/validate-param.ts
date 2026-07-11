import { ValidationError } from '../errors'

/**
 * Validate a gain value: throws if negative, warns if it exceeds 1.
 *
 * Shared by every gain-setting surface (`BaseSound.changeGainTo()`,
 * `BaseParamController`'s gain `update()` path, `LayeredSound.changeGainTo()`,
 * `Sampler.gain` setter) so they all enforce the exact same rule instead of
 * silently diverging — previously `changeGainTo()` validated while
 * `update('gain')` did not, producing two different behaviors for the same
 * underlying parameter (R1#1).
 *
 * @param value - The gain value to validate
 * @throws {ValidationError} if value is negative
 * @internal
 */
export function validateGain(value: number): void {
  if (value < 0) {
    throw new ValidationError(`Gain must be >= 0. Received: ${value}`)
  }
  if (value > 1) {
    console.warn(`ez-web-audio: Gain value ${value} exceeds 1.0. Values above 1 amplify the signal and may cause distortion.`)
  }
}

/**
 * Validate a pan value: warns (does not throw) if outside the [-1, 1] range,
 * since the Web Audio API clamps out-of-range pan values automatically.
 *
 * @param value - The pan value to validate
 * @internal
 */
export function validatePan(value: number): void {
  if (value < -1 || value > 1) {
    console.warn(
      `ez-web-audio: Pan value ${value} is outside the [-1, 1] range. `
      + 'Values are clamped by the Web Audio API. Use -1 (left) to 1 (right).',
    )
  }
}

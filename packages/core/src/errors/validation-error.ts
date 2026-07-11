import { AudioError } from './audio-error'

/**
 * Error thrown when caller-supplied input fails validation, or an API is
 * used in a way it does not support (calling a method after `dispose()`,
 * mutating a synced `BeatTrack` directly, an out-of-range parameter, etc).
 *
 * This is the "you called this wrong" error class — as opposed to
 * {@link AudioLoadError} (fetch/decode failures) or {@link AudioContextError}
 * (AudioContext state issues). Every parameter-range and misuse check across
 * the library (gain, pan, BPM, frequency, control-type names, disposed
 * instances, etc.) throws `ValidationError`.
 *
 * @example
 * ```typescript
 * import { ValidationError } from 'ez-web-audio'
 *
 * try {
 *   sound.changeGainTo(-1)
 * } catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.error(`Invalid input: ${e.message}`)
 *   }
 * }
 * ```
 */
export class ValidationError extends AudioError {
  /**
   * Create a new ValidationError.
   *
   * @param message - Human-readable error description with actionable fix
   */
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

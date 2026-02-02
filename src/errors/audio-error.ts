/**
 * Base error class for all audio-related errors.
 *
 * Provides a consistent error structure with optional error codes
 * for programmatic error handling. Subclasses add specific context
 * like URL, note identifier, or AudioContext state.
 *
 * @example
 * ```typescript
 * import { AudioError } from 'ez-web-audio'
 *
 * try {
 *   await sound.play()
 * } catch (e) {
 *   if (e instanceof AudioError) {
 *     console.error(`Audio error [${e.code}]: ${e.message}`)
 *   }
 * }
 * ```
 */
export class AudioError extends Error {
  /**
   * Create a new AudioError.
   *
   * @param message - Human-readable error description with actionable fix
   * @param code - Optional error code for programmatic handling
   */
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AudioError'
    // Maintains proper stack trace in V8 environments (Node.js, Chrome)
    if ('captureStackTrace' in Error) {
      (Error as { captureStackTrace?: (err: Error, constructor: Function) => void }).captureStackTrace?.(this, this.constructor)
    }
  }
}

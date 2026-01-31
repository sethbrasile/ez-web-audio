/**
 * Base error class for all audio-related errors.
 *
 * Provides a consistent error structure with optional error codes
 * for programmatic error handling.
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
    Error.captureStackTrace?.(this, this.constructor)
  }
}

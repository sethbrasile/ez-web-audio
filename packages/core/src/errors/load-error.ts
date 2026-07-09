import { AudioError } from './audio-error'

/**
 * Error thrown when audio loading fails.
 *
 * Common causes:
 * - Invalid URL (404, network error)
 * - CORS headers missing or misconfigured
 * - Unsupported audio format
 * - Audio decoding failure
 *
 * @example
 * ```typescript
 * try {
 *   await loadAudio(url);
 * } catch (e) {
 *   if (e instanceof AudioLoadError) {
 *     console.error(`Failed to load: ${e.url}`);
 *   }
 * }
 * ```
 */
export class AudioLoadError extends AudioError {
  /**
   * Create a new AudioLoadError.
   *
   * @param message - Human-readable error description with actionable fix
   * @param url - The URL that failed to load
   */
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message, 'LOAD_ERROR')
    this.name = 'AudioLoadError'
  }
}

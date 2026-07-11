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

/**
 * Error thrown when `preload()` fails to load one or more URLs in a batch.
 *
 * Extends {@link AudioError} (so `instanceof AudioError` still matches — see
 * the catch-all pattern documented there) while preserving the individual
 * per-URL failures via {@link errors}, so callers that need to know exactly
 * which URLs failed (and why) don't have to string-parse the aggregate
 * message.
 *
 * @example
 * ```typescript
 * try {
 *   await preload(['a.mp3', 'b.mp3']);
 * } catch (e) {
 *   if (e instanceof AggregateAudioLoadError) {
 *     for (const err of e.errors) {
 *       console.error(`Failed: ${err.url} — ${err.message}`);
 *     }
 *   }
 * }
 * ```
 */
export class AggregateAudioLoadError extends AudioError {
  /**
   * Create a new AggregateAudioLoadError.
   *
   * @param message - Human-readable summary of the batch failure
   * @param errors - The individual per-URL AudioLoadError failures
   */
  constructor(
    message: string,
    public readonly errors: AudioLoadError[],
  ) {
    super(message, 'LOAD_ERROR')
    this.name = 'AggregateAudioLoadError'
  }
}

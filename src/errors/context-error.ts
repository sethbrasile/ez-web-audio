import { AudioError } from './audio-error'

/**
 * Error thrown when AudioContext is in an invalid state.
 *
 * Common causes:
 * - AudioContext suspended (not yet resumed after user interaction)
 * - AudioContext closed
 *
 * @example
 * ```typescript
 * if (audioContext.state === 'suspended') {
 *   throw new AudioContextError(
 *     'AudioContext suspended. Call initAudio() after user interaction (click, tap).',
 *     audioContext.state
 *   );
 * }
 * ```
 */
export class AudioContextError extends AudioError {
  /**
   * Create a new AudioContextError.
   *
   * @param message - Human-readable error description with actionable fix
   * @param state - The current AudioContext state when the error occurred
   */
  constructor(
    message: string,
    public readonly state: AudioContextState,
  ) {
    super(message, 'CONTEXT_ERROR')
    this.name = 'AudioContextError'
  }
}

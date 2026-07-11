/**
 * Custom error classes for audio-related errors.
 *
 * All errors extend AudioError, enabling catch-all handling:
 * ```typescript
 * try {
 *   await sound.play();
 * } catch (e) {
 *   if (e instanceof AudioError) {
 *     // Handle any audio error
 *   }
 * }
 * ```
 *
 * Or catch specific error types:
 * ```typescript
 * try {
 *   await loadAudio(url);
 * } catch (e) {
 *   if (e instanceof AudioLoadError) {
 *     console.error(`Failed to load: ${e.url}`);
 *   } else if (e instanceof AudioContextError) {
 *     console.error(`Context issue: ${e.state}`);
 *   } else if (e instanceof ValidationError) {
 *     console.error(`Invalid input: ${e.message}`);
 *   }
 * }
 * ```
 */
export { AudioError } from './audio-error'
export { AudioContextError } from './context-error'
export { InvalidNoteError } from './invalid-note-error'
export { AggregateAudioLoadError, AudioLoadError } from './load-error'
export { ValidationError } from './validation-error'

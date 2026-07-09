import { AudioError } from './audio-error'

/**
 * Error thrown when a note identifier is invalid.
 *
 * Note identifiers follow the format: Letter + optional accidental + octave
 * - Letters: A-G (case insensitive)
 * - Accidentals: # (sharp), b (flat), or none (natural)
 * - Octave: 0-8
 *
 * Valid examples: A4, Bb3, C#5, D2, Eb6
 * Invalid examples: H4, A9, B##3, 4A
 *
 * @example
 * ```typescript
 * function parseNote(identifier: string) {
 *   if (!isValidNote(identifier)) {
 *     throw new InvalidNoteError(
 *       `Invalid note: "${identifier}". Expected format: Letter + optional accidental + octave (e.g., A4, Bb3, C#5).`,
 *       identifier
 *     );
 *   }
 * }
 * ```
 */
export class InvalidNoteError extends AudioError {
  /**
   * Create a new InvalidNoteError.
   *
   * @param message - Human-readable error description with actionable fix
   * @param identifier - The invalid note identifier that was provided
   */
  constructor(
    message: string,
    public readonly identifier: string,
  ) {
    super(message, 'INVALID_NOTE')
    this.name = 'InvalidNoteError'
  }
}

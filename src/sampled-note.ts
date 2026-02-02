import { Sound } from './sound'
import { MusicallyAware } from './musical-identity'

/**
 * A Sound with musical identity.
 *
 * SampledNote extends Sound with musical properties (letter, accidental, octave,
 * frequency) via the MusicallyAware mixin. Used in Font collections where each
 * sound represents a specific musical note.
 *
 * @example
 * ```typescript
 * import { createFont } from 'ez-web-audio'
 *
 * // SampledNote is typically created via createFont(), not directly
 * const piano = await createFont('piano.js')
 * const noteA4 = piano.getNote('A4')
 *
 * // Access musical properties
 * console.log(noteA4?.frequency)   // 440
 * console.log(noteA4?.identifier)  // "A4"
 * console.log(noteA4?.letter)      // "A"
 * console.log(noteA4?.octave)      // "4"
 *
 * // Use Sound methods
 * noteA4?.changeGainTo(0.5)
 * noteA4?.play()
 * ```
 */
export class SampledNote extends MusicallyAware(Sound) {
}

import type { AcceptableNote } from './musical-identity'
import type { SampledNote } from './sampled-note'

/**
 * Collection of sampled notes for instrument playback.
 *
 * Font holds multiple SampledNote instances, typically loaded from a soundfont.
 * Each note can be played by its identifier (e.g., "A4", "Bb3", "C#5").
 *
 * @example
 * ```typescript
 * import { createFont } from 'ez-web-audio'
 *
 * const piano = await createFont('piano.js')
 *
 * // Play notes by identifier
 * piano.play('C4')
 * piano.play('E4')
 * piano.play('G4')
 *
 * // Get a specific note for advanced control
 * const note = piano.getNote('A4')
 * note?.changeGainTo(0.5)
 * note?.play()
 * ```
 */
export class Font {
  /**
   * Array of all SampledNote instances in this font.
   */
  constructor(public notes: SampledNote[]) {}

  /**
   * Get a note by its identifier.
   *
   * @param identifier - Note identifier like "A4", "Bb3", "C#5"
   * @returns The SampledNote instance, or undefined if not found
   *
   * @example
   * ```typescript
   * const note = font.getNote('A4')
   * if (note) {
   *   console.log(note.frequency) // 440
   *   note.play()
   * }
   * ```
   */
  getNote(identifier: string): SampledNote | undefined {
    return this.notes.find(note => note.identifier === identifier)
  }

  /**
   * Play a note by its identifier.
   *
   * @param identifier - Note identifier like "A4", "Bb3", "C#5"
   * @throws Error if note identifier not found in font
   *
   * @example
   * ```typescript
   * // Play a chord
   * font.play('C4')
   * font.play('E4')
   * font.play('G4')
   * ```
   */
  play(identifier: AcceptableNote): void {
    const note = this.getNote(identifier)
    if (!note) {
      throw new Error(`EZ Web Audio: No note with identifier ${identifier} found.`)
    }
    note.play()
  }
}

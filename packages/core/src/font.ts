import type { AcceptableNote } from './musical-identity'
import { ValidationError } from './errors'
import { SampledNote } from './sampled-note'
import { sortNotes } from './utils/note-methods'

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
  private readonly noteMap: Map<string, SampledNote>

  constructor(public notes: SampledNote[]) {
    // Build Map for O(1) identifier lookup instead of O(n) array.find()
    this.noteMap = new Map(notes.map(note => [note.identifier, note]))
  }

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
    return this.noteMap.get(identifier)
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
      const availableNotes = this.notes.map(n => n.identifier).slice(0, 10).join(', ')
      const totalCount = this.notes.length > 10 ? ` (${this.notes.length} total)` : ''
      throw new ValidationError(`EZ Web Audio: No note with identifier '${identifier}' found. Available notes: ${availableNotes}${this.notes.length > 10 ? '...' : ''}${totalCount}`)
    }
    note.play()
  }

  /**
   * Dispose every SampledNote owned by this Font, releasing their audio
   * nodes/listeners. A Font can hold dozens of notes (a full soundfont) —
   * without this, loading a Font and discarding it leaks every note's
   * underlying AudioBufferSourceNode/gain/panner graph.
   *
   * Mirrors {@link BeatTrack.dispose}'s owned-sounds cascade: the Font
   * created (or was handed) these notes, so the Font disposes them.
   *
   * After disposal, the Font should not be used. Create a new instance
   * (e.g., via `createFont()`) instead.
   *
   * @example
   * ```typescript
   * const piano = await createFont('piano.js')
   * piano.play('C4')
   * // When done:
   * piano.dispose()
   * ```
   */
  dispose(): void {
    for (const note of this.notes) {
      note.dispose()
    }
  }
}

/**
 * Create SampledNote instances from decoded audio data.
 *
 * Takes an array of [noteName, audioBuffer] tuples and creates sorted
 * SampledNote instances for use in a Font.
 *
 * @param ctx - AudioContext for creating nodes
 * @param audioData - Array of [noteName, audioBuffer] tuples
 * @returns Sorted array of SampledNote instances
 * @internal
 */
export function createNoteObjectsForFont(ctx: AudioContext, audioData: [AcceptableNote, AudioBuffer][]): SampledNote[] {
  const notes = audioData.map((note) => {
    const [identifier, audioBuffer] = note
    const sampledNote = new SampledNote(ctx, audioBuffer)
    sampledNote.identifier = identifier
    return sampledNote
  })

  return sortNotes<SampledNote>(notes)
}

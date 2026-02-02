import type { AcceptableNote, Accidental, IMusicallyAware, NoteLetter, Octave } from '@/musical-identity'
import { MusicallyAware } from '@/musical-identity'

/**
 * A musical note without audio data.
 *
 * Note represents musical identity (letter, accidental, octave, frequency)
 * without any audio capabilities. Use SampledNote for notes with audio.
 * Note is useful for UI components that display note information.
 *
 * @example
 * ```typescript
 * import { Note } from 'ez-web-audio'
 *
 * const note = new Note({ letter: 'A', octave: '4' })
 * console.log(note.frequency)  // 440
 * console.log(note.identifier) // "A4"
 *
 * // Or create from frequency
 * const noteFromFreq = new Note({ frequency: 440 })
 * console.log(noteFromFreq.identifier) // "A4"
 *
 * // Or create from identifier
 * const noteFromId = new Note({ identifier: 'Bb3' })
 * console.log(noteFromId.letter)     // "B"
 * console.log(noteFromId.accidental) // "b"
 * console.log(noteFromId.octave)     // "3"
 * ```
 */
export class Note extends MusicallyAware(class {}) implements IMusicallyAware {
  constructor(opts?: { letter?: NoteLetter, accidental?: Accidental, octave?: Octave, frequency?: number, identifier?: AcceptableNote }) {
    super()
    this.letter = opts?.letter || 'A'
    this.accidental = opts?.accidental || ''
    this.octave = opts?.octave || '0'

    if (opts?.frequency) {
      this.frequency = opts?.frequency || 440
    }
    if (opts?.identifier) {
      this.identifier = opts.identifier
    }
  }
}

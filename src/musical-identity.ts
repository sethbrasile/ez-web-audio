import frequencyMap from '@utils/frequency-map'
import { get } from '@utils/prop-access'
import { InvalidNoteError } from './errors'

export type NoteLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type Accidental = '' | 'b' | '#'
export type Octave = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type AcceptableNote = keyof typeof frequencyMap
type Constructor<T = any> = new (...args: any[]) => T

export interface IMusicallyAware {
  letter: NoteLetter
  accidental: Accidental
  octave: Octave
  name: string
  frequency: number
  identifier: AcceptableNote
}

/**
 * Mixin that adds musical identity to any class.
 *
 * MusicallyAware provides note properties (letter, accidental, octave, frequency,
 * identifier) that are automatically calculated from any provided value.
 * Provide frequency, identifier (e.g., "A4"), or letter/octave/accidental.
 *
 * @example
 * ```typescript
 * import { MusicallyAware, Sound } from 'ez-web-audio'
 *
 * // Create a class with musical identity
 * class MyNote extends MusicallyAware(Sound) {
 *   customMethod() { return this.frequency * 2 }
 * }
 *
 * // Or with any base class
 * class NoteDisplay extends MusicallyAware(class {}) {
 *   render() { return `${this.letter}${this.accidental}${this.octave}` }
 * }
 *
 * // Usage
 * const note = new NoteDisplay({ identifier: 'A4' })
 * console.log(note.letter)     // "A"
 * console.log(note.octave)     // "4"
 * console.log(note.frequency)  // 440
 * console.log(note.render())   // "A4"
 * ```
 */
const { warn } = console
// eslint-disable-next-line ts/explicit-function-return-type
export function MusicallyAware<TBase extends Constructor>(Base: TBase) {
  return class MusicalIdentity extends Base implements IMusicallyAware {
    /**
     * Constructor accepts any args to pass through to the mixin base class.
     * The last argument is treated as note identifier options (frequency, identifier, letter, accidental, octave).
     * The any[] type is required by TypeScript's mixin pattern — the mixin must accept all possible base class constructor signatures.
     */
    constructor(...args: any[]) {
      super(...args)

      // opts should always be the last arg
      const opts = args[args.length - 1]

      if (opts) {
        const { identifier, frequency, letter, accidental, octave } = opts
        // identifier and frequency don't make sense if others are provided
        if ((identifier && frequency) || ((identifier || frequency) && (letter || accidental || octave))) {
          warn('ez-web-audio: upon instantiation, multiple note identifiers were provided which might be a mistake and ez-web-audio has no way to determine which should be preferred', opts, this)
        }
        if (identifier)
          this.identifier = identifier
        if (frequency)
          this.frequency = frequency
        if (letter)
          this.letter = letter
        if (accidental)
          this.accidental = accidental
        if (octave)
          this.octave = octave
      }
    }

    /**
     * The note letter (A-G). For note "Ab5", this would be "A".
     */
    letter: NoteLetter = 'A'

    /**
     * The accidental: "" (natural), "b" (flat), or "#" (sharp).
     * For note "Ab5", this would be "b".
     */
    accidental: Accidental = ''

    /**
     * The octave (0-8). For note "Ab5", this would be "5".
     */
    octave: Octave = '0'

    /**
     * The note name without octave (e.g., "A" or "Ab").
     * Computed from letter and accidental.
     */
    get name(): string {
      const { accidental, letter } = this

      if (accidental) {
        return `${letter}${accidental}`
      }
      else {
        return letter
      }
    }

    /**
     * The frequency of the note in hertz.
     *
     * Computed from the note identifier using standard piano frequencies.
     * Setting this value updates all other properties to match.
     *
     * @example
     * ```typescript
     * note.frequency = 440 // Sets to A4
     * console.log(note.identifier) // "A4"
     * ```
     */
    get frequency(): number {
      const { identifier } = this
      if (identifier) {
        return get(frequencyMap, identifier) || 0
      }
      return 0
    }

    set frequency(value) {
      let key: AcceptableNote
      for (key in frequencyMap) {
        if (value === get(frequencyMap, key)) {
          this.identifier = key
        }
      }
    }

    /**
     * The full note identifier (e.g., "A4", "Bb3", "C#5").
     *
     * Computed from letter, accidental, and octave.
     * Setting this value updates all other properties to match.
     *
     * @example
     * ```typescript
     * note.identifier = 'Bb3'
     * console.log(note.letter)     // "B"
     * console.log(note.accidental) // "b"
     * console.log(note.octave)     // "3"
     * console.log(note.frequency)  // 233.08
     * ```
     */
    get identifier(): AcceptableNote {
      const { accidental, letter, octave } = this
      let output: AcceptableNote = 'A0'

      if (accidental) {
        output = `${letter}${accidental}${octave}` as AcceptableNote
      }
      else {
        output = `${letter}${octave}` as AcceptableNote
      }

      if (get(frequencyMap, output)) {
        return output
      }
      else {
        throw new InvalidNoteError(
          `Invalid note: "${output}". Expected format: Letter + optional accidental + octave (e.g., A4, Bb3, C#5).`,
          output,
        )
      }
    }

    set identifier(value: AcceptableNote) {
      const [letter] = value
      const octave = value[2] || value[1]
      let accidental

      if (value[2]) {
        accidental = value[1]
      }
      else {
        accidental = ''
      }
      this.letter = letter as NoteLetter
      this.accidental = accidental as Accidental
      this.octave = octave as Octave
    }
  }
}

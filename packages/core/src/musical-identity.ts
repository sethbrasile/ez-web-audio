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
/**
 * Cents tolerance for matching a computed/non-tabled frequency to the nearest
 * known note. Half a semitone (50 cents) is the widest match before the
 * nearest table entry is unambiguously a different note.
 * @internal
 */
const FREQUENCY_MATCH_TOLERANCE_CENTS = 50

// eslint-disable-next-line ts/explicit-function-return-type
export function MusicallyAware<TBase extends Constructor>(Base: TBase) {
  return class MusicalIdentity extends Base implements IMusicallyAware {
    /**
     * Constructor accepts any args to pass through to the mixin base class.
     * The last argument is treated as note identifier options (frequency, identifier, letter, accidental, octave).
     * The any[] type is required by TypeScript's mixin pattern — the mixin must accept all possible base class constructor signatures.
     *
     * @remarks
     * If multiple, conflicting identifier options are provided (e.g. both
     * `identifier` and `frequency`, or `identifier`/`frequency` alongside
     * `letter`/`accidental`/`octave`), a console.warn is logged (this is
     * probably a mistake) but construction proceeds. Precedence is
     * last-property-wins in application order: `identifier`, then
     * `frequency`, then `letter`, then `accidental`, then `octave` — each
     * subsequent assignment can overwrite fields set by an earlier one
     * (e.g. `octave` applied last always wins over the octave implied by
     * `identifier` or `frequency`).
     */
    constructor(...args: any[]) {
      super(...args)

      // opts should always be the last arg
      const opts = args[args.length - 1]

      if (opts) {
        const { identifier, frequency, letter, accidental, octave } = opts
        // identifier and frequency don't make sense if others are provided
        if ((identifier && frequency) || ((identifier || frequency) && (letter || accidental || octave))) {
          console.warn('ez-web-audio: upon instantiation, multiple note identifiers were provided which might be a mistake and ez-web-audio has no way to determine which should be preferred', opts, this)
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

    /**
     * Setting frequency resolves to the nearest tabled note within
     * {@link FREQUENCY_MATCH_TOLERANCE_CENTS} cents (a computed/synthesized
     * frequency rarely lands on an exact table value). If nothing is close
     * enough, a warning is logged and the identifier is left unchanged
     * rather than silently going stale.
     */
    set frequency(value) {
      if (!(value > 0)) {
        console.warn(`ez-web-audio: cannot set frequency to a non-positive value (${value}); identifier left unchanged`, value, this)
        return
      }

      let key: AcceptableNote
      let nearestKey: AcceptableNote | undefined
      let nearestCents = Infinity

      for (key in frequencyMap) {
        const tableValue = get<number>(frequencyMap, key)
        if (!tableValue)
          continue
        // Exact matches short-circuit so precision loss in the cents
        // calculation can never cause an exact table value to resolve to a
        // neighboring note (preserves prior exact-match behavior exactly).
        if (value === tableValue) {
          this.identifier = key
          return
        }
        const cents = Math.abs(1200 * Math.log2(value / tableValue))
        if (cents < nearestCents) {
          nearestCents = cents
          nearestKey = key
        }
      }

      if (nearestKey && nearestCents <= FREQUENCY_MATCH_TOLERANCE_CENTS) {
        this.identifier = nearestKey
      }
      else {
        console.warn(`ez-web-audio: frequency ${value} does not match any known note within ${FREQUENCY_MATCH_TOLERANCE_CENTS} cents; identifier left unchanged`, value, this)
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

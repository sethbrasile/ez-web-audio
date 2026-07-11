import type { AcceptableNote, IMusicallyAware } from '@/musical-identity'
import { arraySwap, unique } from '@utils/array-methods'
import { base64ToUint8 } from '@utils/decode-base64'
import { SampledNote } from '@/sampled-note'

type NotesTuple = [IMusicallyAware[], string[]]

/**
 * Sort notes in piano order (by octave, then by letter with flats before naturals).
 *
 * @param notes - Array of notes to sort
 * @returns Sorted array of notes
 * @internal
 */
export function sortNotes<T extends IMusicallyAware>(notes: IMusicallyAware[]): T[] {
  // get octaves so that we can sort based on them
  let sortedNotes = extractOctaves(notes)

  // Each octave has tons of duplicates
  sortedNotes = stripDuplicateOctaves(sortedNotes)

  // Create array of arrays. Each inner array contains all the notes in an octave
  let octavesWithNotes = createOctavesWithNotes(sortedNotes)

  // Sort the notes in each octave, alphabetically, flats before naturals
  octavesWithNotes = octaveSort(octavesWithNotes)

  // Determine last note of first octave, then for each octave, split at
  // that note, then shift the beginning notes to the end
  octavesWithNotes = octaveShift(octavesWithNotes)
  // Flatten array of arrays into a flat array
  return octavesWithNotes.flat() as T[]
}

/**
 * Takes an array of arrays of notes, determines the last note of
 * the first array, then splits the rest of the arrays in the array at the last
 * note of the first array, and moves the beginning of the array to the end
 * so that each array starts at the next note after the last note of the first
 * array, instead of at "A" (alphabetically).
 *
 * @example
 *     This is hard to explain. Here's an example.
 *     (Simplified, as the real notes are objects)
 *
 *     Example input: [['A0', 'B0'], ['A1', 'B1', 'C1', 'D1']]
 *     Example output: [['A0', 'B0'], ['C1', 'D1', 'A1', 'B1']]
 *
 * @private
 * @method octaveShift
 *
 * @param {Array} octaves An array of octaves, each octave is an array of Notes.
 *
 * @return {Array} Input array after having been shifted.
 */
export function octaveShift(octaves: IMusicallyAware[][]): IMusicallyAware[][] {
  // Pull first octave from beginning of array
  const firstOctave = octaves.shift() || []
  // Single-octave collections (e.g. small/percussion soundfonts) have nothing
  // left to shift against after removing the first octave — return as-is
  // instead of crashing on octaves[0] being undefined.
  if (octaves.length === 0) {
    return [firstOctave]
  }
  // Get all the note names from the second octave for comparison
  const secondOctaveNames = octaves[0].map(note => note.name)
  // Get the note name of the last note in the first octave
  const lastNote = firstOctave[firstOctave.length - 1].name
  // Get the index of the occurence of the last note from the first
  // octave, in the second octave
  const indexToShiftAt = secondOctaveNames.lastIndexOf(lastNote) + 1
  // Split the octave array at that point, and move the first chunk to the end
  const result = octaves.map(octave => arraySwap(octave, indexToShiftAt))
  // Put first octave back at the beginning of the array

  result.unshift(firstOctave)
  return result
}

/**
 * Maps through an array of arrays and sorts each array with
 * "noteSort"
 *
 * @private
 * @method octaveSort
 *
 * @param  {Array} octaves array of arrays to be sorted
 *
 * @return {Array} array of sorted arrays
 */
export function octaveSort(octaves: IMusicallyAware[][]): IMusicallyAware[][] {
  return octaves.map(octave => octave.sort(noteSort))
}

/**
 * @method extractOctaves
 *
 * @description
 * Accepts an array of Note objects and passes back an array
 * like this: [original array, array of each octave in the orginal array]
 *
 * @param  {Array} notes array of note objects.
 * @return {Array} array containing two inner arrays, [0] is the untouched input
 * array, [1] is an array of all the octaves in the original array.
 */
export function extractOctaves(notes: IMusicallyAware[]): NotesTuple {
  return [notes, notes.map(note => note.octave)]
}

/**
 * @method stripDuplicateOctaves
 *
 * @description
 * Accepts an array of two arrays and returns the same
 * array, but with array at index [1] uniq'd and sorted alphabetically.
 *
 * @param input the output from extractOctaves.
 * @param input.0 the output from extractOctaves.
 * @param input.1 the output from extractOctaves.
 */
export function stripDuplicateOctaves([notes, octaves]: NotesTuple): NotesTuple {
  return [notes, unique(octaves).sort()]
}

/**
 * @method createOctavesWithNotes
 *
 * @description
 * Accepts an array of two arrays, [0] being an array
 * of Note objects, [1] being all the available octaves. Returns a single array
 * made up of arrays of Note objects, organized by octave. Each inner array
 * represents all of the notes in an octave.
 *
 * @param data The output of stripDuplicateOctaves.
 * @param data.0 The output of stripDuplicateOctaves.
 * @param data.1 The output of stripDuplicateOctaves.
 */
export function createOctavesWithNotes([notes, octaves]: NotesTuple): IMusicallyAware[][] {
  return octaves.map(octave => notes.filter(note => note.octave === octave))
}

/**
 * Comparator function for sorting notes alphabetically with flats before naturals.
 *
 * @param a - First note to compare
 * @param b - Second note to compare
 * @returns -1 or 1 for sort order
 * @internal
 */
export function noteSort(a: IMusicallyAware, b: IMusicallyAware): 1 | -1 {
  const aLet = a.letter
  const bLet = b.letter

  if (aLet < bLet) {
    return -1
  }

  if (aLet === bLet) {
    if (a.accidental === 'b') {
      return -1
    }
  }

  return 1
}

/**
 * @method extractDecodedKeyValuePairs
 *
 * @description
 * Takes an array of base64 encoded strings (notes) and returns an array of
 * arrays like [[name, audio], [name, audio]]
 *
 * @param ctx AudioContext
 * @param notes Array of base64 encoded strings.
 * @return Returns an Array of tuples. Each tuple looks like
 * `[noteName, decodedAudio]`
 */
export function extractDecodedKeyValuePairs(ctx: AudioContext, notes: string[]): Promise<[AcceptableNote, AudioBuffer][]> {
  const promises = []

  async function decodeNote(noteName: string, buffer: ArrayBuffer): Promise<(string | AudioBuffer)[]> {
    // Get web audio api audio data from array buffer
    const decodedNote = await ctx.decodeAudioData(buffer)
    return [noteName, decodedNote]
  }

  for (const noteName in notes) {
    if (Object.prototype.hasOwnProperty.call(notes, noteName)) {
      // Transform base64 note value to Uint8Array
      const noteValue = base64ToUint8(notes[noteName])
      promises.push(decodeNote(noteName, noteValue.buffer as ArrayBuffer))
    }
  }

  // Wait for array of promises to resolve before continuing
  return Promise.all(promises) as Promise<[AcceptableNote, AudioBuffer][]>
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

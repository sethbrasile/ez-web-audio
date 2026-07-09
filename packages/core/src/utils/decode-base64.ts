/**
 * @public
 * @class utils
 */

/**
 * Converts a base64 string into a Uint8Array of binary data.
 *
 * @private
 * @method base64ToUint8
 * @param  {string} base64String The base64 string that you'd like to be converted into a Uint8Array.
 * @return {Uint8Array} A Uint8Array of converted binary audio data.
 */
export function base64ToUint8(base64String: string): Uint8Array {
  return new Uint8Array(
    atob(base64String)
      .split('')
      .map(char => char.charCodeAt(0)),
  )
}

/**
 * Strips extraneous stuff from a soundfont and splits the soundfont into a JSON
 * object. Keys are note names and values are base64 encoded strings.
 *
 * @private
 * @method mungeSoundFont
 * @param {string} soundfont A soundfont as a long base64 string
 * @return {object} A JSON representation of all the notes in the font
 * @throws {Error} If the input is not a valid MIDI.js soundfont string
 */
export function mungeSoundFont(soundfont: string): string[] {
  if (typeof soundfont !== 'string' || soundfont.length === 0) {
    throw new Error('mungeSoundFont: input must be a non-empty string')
  }

  const markerIndex = soundfont.indexOf('MIDI.Soundfont.')
  if (markerIndex === -1) {
    throw new Error(
      'mungeSoundFont: input does not appear to be a valid MIDI.js soundfont. '
      + 'Expected to find "MIDI.Soundfont." in the string.',
    )
  }

  const equalIndex = soundfont.indexOf('=', markerIndex)
  if (equalIndex === -1) {
    throw new Error('mungeSoundFont: malformed soundfont — missing "=" assignment after MIDI.Soundfont.')
  }

  const begin = equalIndex + 2
  // Support both double-quoted and single-quoted soundfonts (e.g., linted/reformatted files)
  let end = soundfont.lastIndexOf('"')
  if (end < begin) {
    end = soundfont.lastIndexOf('\'')
  }
  end += 1

  if (end <= begin) {
    throw new Error('mungeSoundFont: malformed soundfont — could not locate note data boundaries')
  }

  const string = `${soundfont.slice(begin, end)}}`
    .replace(/'/g, '"') // normalize single quotes to double quotes for JSON.parse
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // quote unquoted keys for JSON.parse
    .replace(/data:audio\/mp3;base64,/g, '')
    .replace(/data:audio\/mpeg;base64,/g, '')
    .replace(/data:audio\/ogg;base64,/g, '')

  try {
    return JSON.parse(string)
  }
  catch {
    throw new Error(
      'mungeSoundFont: failed to parse soundfont JSON. The soundfont may be corrupted or in an unsupported format.',
    )
  }
}

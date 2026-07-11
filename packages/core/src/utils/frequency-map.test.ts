import { describe, expect, it } from 'vitest'
import frequencyMap from './frequency-map'

describe('frequency-map', () => {
  it('has A4 at 440 Hz (concert pitch reference)', () => {
    expect(frequencyMap.A4).toBe(440)
  })

  it('has C4 at 261.63 Hz (middle C)', () => {
    expect(frequencyMap.C4).toBe(261.63)
  })

  it('has A0 at 27.5 Hz (lowest standard piano note)', () => {
    expect(frequencyMap.A0).toBe(27.5)
  })

  it('has C8 at 4186.01 Hz (near top of range)', () => {
    expect(frequencyMap.C8).toBe(4186.01)
  })

  it('uses "b" notation for flats', () => {
    expect(frequencyMap.Bb4).toBe(466.16)
    expect(frequencyMap.Db4).toBe(277.18)
    expect(frequencyMap.Eb4).toBe(311.13)
  })

  it('follows octave doubling pattern', () => {
    expect(frequencyMap.A3).toBe(220)
    expect(frequencyMap.A4).toBe(440)
    expect(frequencyMap.A5).toBe(880)
  })

  it('has 142 entries (12 notes × 8 octaves + 4 notes in octave 8, plus sharp aliases for each flat/natural pair)', () => {
    const keys = Object.keys(frequencyMap)
    expect(keys.length).toBe(142)
  })

  it('contains all natural notes from C0 to B7', () => {
    const naturals = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    for (let octave = 0; octave <= 7; octave++) {
      for (const note of naturals) {
        const key = `${note}${octave}`
        expect(frequencyMap).toHaveProperty(key)
      }
    }
  })

  it('contains all flat notes from Db0 to Bb7', () => {
    const flats = ['Db', 'Eb', 'Gb', 'Ab', 'Bb']
    for (let octave = 0; octave <= 7; octave++) {
      for (const note of flats) {
        const key = `${note}${octave}`
        expect(frequencyMap).toHaveProperty(key)
      }
    }
  })

  it('includes C8, Db8, D8, Eb8 at the top of the range', () => {
    expect(frequencyMap.C8).toBe(4186.01)
    expect(frequencyMap.Db8).toBe(4434.92)
    expect(frequencyMap.D8).toBe(4698.64)
    expect(frequencyMap.Eb8).toBe(4978.03)
  })

  it('includes sharp notation as enharmonic aliases of the flat entries', () => {
    expect(frequencyMap).toHaveProperty('C#4')
    expect(frequencyMap).toHaveProperty('F#4')
    expect(frequencyMap).toHaveProperty('G#4')
    expect(frequencyMap['C#4']).toBe(frequencyMap.Db4)
    expect(frequencyMap['F#4']).toBe(frequencyMap.Gb4)
    expect(frequencyMap['G#4']).toBe(frequencyMap.Ab4)
  })

  it('sharp aliases exist for every flat entry, and vice versa', () => {
    const flats = ['Db', 'Eb', 'Gb', 'Ab', 'Bb']
    const sharps = ['C#', 'D#', 'F#', 'G#', 'A#']
    for (let octave = 0; octave <= 7; octave++) {
      for (let i = 0; i < flats.length; i++) {
        expect(frequencyMap).toHaveProperty(`${flats[i]}${octave}`)
        expect(frequencyMap).toHaveProperty(`${sharps[i]}${octave}`)
      }
    }
  })

  it('all frequencies are positive numbers', () => {
    for (const [_key, freq] of Object.entries(frequencyMap)) {
      expect(freq).toBeGreaterThan(0)
      expect(typeof freq).toBe('number')
    }
  })
})

import { describe, expect, it } from 'vitest'
import { Note } from './note'

describe('note', () => {
  it('constructs with letter and octave', () => {
    const note = new Note({ letter: 'A', octave: '4' })
    expect(note.identifier).toBe('A4')
    expect(note.frequency).toBe(440)
    expect(note.letter).toBe('A')
    expect(note.octave).toBe('4')
  })

  it('constructs with identifier', () => {
    const note = new Note({ identifier: 'Bb3' })
    expect(note.letter).toBe('B')
    expect(note.accidental).toBe('b')
    expect(note.octave).toBe('3')
    expect(note.identifier).toBe('Bb3')
  })

  it('constructs with frequency', () => {
    const note = new Note({ frequency: 440 })
    expect(note.frequency).toBe(440)
  })

  it('uses default values when no options provided', () => {
    const note = new Note()
    expect(note.letter).toBe('A')
    expect(note.accidental).toBe('')
    expect(note.octave).toBe('0')
  })

  it('constructs with letter, accidental, and octave', () => {
    const note = new Note({ letter: 'B', accidental: 'b', octave: '4' })
    expect(note.identifier).toBe('Bb4')
    expect(note.letter).toBe('B')
    expect(note.accidental).toBe('b')
    expect(note.octave).toBe('4')
  })

  it('constructs middle C correctly', () => {
    const note = new Note({ letter: 'C', octave: '4' })
    expect(note.identifier).toBe('C4')
    expect(note.frequency).toBe(261.63)
  })

  it('parses identifier with flat', () => {
    const note = new Note({ identifier: 'Db4' })
    expect(note.letter).toBe('D')
    expect(note.accidental).toBe('b')
    expect(note.octave).toBe('4')
    expect(note.frequency).toBe(277.18)
  })

  it('parses identifier with Eb flat', () => {
    const note = new Note({ identifier: 'Eb4' })
    expect(note.letter).toBe('E')
    expect(note.accidental).toBe('b')
    expect(note.octave).toBe('4')
    expect(note.frequency).toBe(311.13)
  })

  it('constructs low notes (octave 0)', () => {
    const note = new Note({ identifier: 'A0' })
    expect(note.frequency).toBe(27.5)
    expect(note.octave).toBe('0')
  })

  it('constructs high notes (octave 8)', () => {
    const note = new Note({ identifier: 'C8' })
    expect(note.frequency).toBe(4186.01)
    expect(note.octave).toBe('8')
  })
})

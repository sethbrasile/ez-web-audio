import type { AcceptableNote, Accidental, IMusicallyAware, NoteLetter, Octave } from './musical-identity'
import { assert, describe, expect, it, vi } from 'vitest'
import { MusicallyAware } from './musical-identity'

class Note extends MusicallyAware(class {}) implements IMusicallyAware {
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

it('exists', () => {
  expect(MusicallyAware).toBeTruthy()
})

it('can be created', () => {
  const track = new Note()
  expect(track).toBeTruthy()
})

it('identifier is formatted properly', () => {
  const note = new Note({ frequency: 51.91 })

  assert.strictEqual(note.identifier, 'Ab1')
})

it('identifier is formatted properly when note has no accidental', () => {
  const note = new Note({ frequency: 55 })

  assert.strictEqual(note.identifier, 'A1')
})

it('name is formatted properly', () => {
  const note = new Note({ frequency: 51.91 })

  assert.strictEqual(note.name, 'Ab')
})

it('setting frequency properly calculates other props', () => {
  const note = new Note({ frequency: 440 })

  assert.strictEqual(note.identifier, 'A4')
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, '')
})

it('setting identifier properly calculates other props', () => {
  const note = new Note({ identifier: 'A4' })

  assert.strictEqual(note.frequency, 440)
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, '')
})

it('setting identifier with accidental properly calculates other props', () => {
  const note = new Note({ identifier: 'Ab4' })

  assert.strictEqual(note.frequency, 415.3)
  assert.strictEqual(note.name, 'Ab')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, 'b')
})

it('still works if manually set letter, accidental and octave', () => {
  const note = new Note({ letter: 'A', accidental: 'b', octave: '4' })

  assert.strictEqual(note.frequency, 415.3)
  assert.strictEqual(note.name, 'Ab')
  assert.strictEqual(note.identifier, 'Ab4')
})

it('still works if manually set letter and octave (no accidental)', () => {
  const note = new Note({ letter: 'A', octave: '4' })

  assert.strictEqual(note.frequency, 440)
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.identifier, 'A4')
})

describe('frequency setter (H16)', () => {
  it('resolves an exact table value to the correct identifier (unchanged behavior)', () => {
    const note = new Note()
    note.frequency = 440
    assert.strictEqual(note.identifier, 'A4')
  })

  it('resolves a computed/non-tabled frequency to the nearest note within tolerance', () => {
    const note = new Note()
    // Slightly sharp of A4 (440) — well within 50 cents.
    note.frequency = 441
    assert.strictEqual(note.identifier, 'A4')
  })

  it('resolves a frequency a few cents flat of a table value to the same note', () => {
    const note = new Note()
    note.frequency = 439.5
    assert.strictEqual(note.identifier, 'A4')
  })

  it('warns and leaves identifier unchanged when nothing is within tolerance', () => {
    const note = new Note({ identifier: 'A4' })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Far below C0 (16.35 Hz, the bottom of the table) — thousands of cents
    // from the nearest tabled note, well outside the 50-cent tolerance.
    note.frequency = 1

    expect(warnSpy).toHaveBeenCalled()
    assert.strictEqual(note.identifier, 'A4')
    warnSpy.mockRestore()
  })

  it('warns and leaves identifier unchanged for non-positive frequency', () => {
    const note = new Note({ identifier: 'A4' })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    note.frequency = 0

    expect(warnSpy).toHaveBeenCalled()
    assert.strictEqual(note.identifier, 'A4')
    warnSpy.mockRestore()
  })

  it('resolves sharp-adjacent frequencies via enharmonic sharp alias too', () => {
    const note = new Note()
    note.identifier = 'C#4'
    assert.strictEqual(note.frequency, 277.18)
  })
})

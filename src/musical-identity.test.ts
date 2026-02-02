import { assert, expect, it } from 'vitest'
import type { AcceptableNote, Accidental, IMusicallyAware, NoteLetter, Octave } from './musical-identity'
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
  expect(1)

  const note = new Note({ frequency: 51.91 })

  assert.strictEqual(note.identifier, 'Ab1')
})

it('identifier is formatted properly when note has no accidental', () => {
  expect(1)

  const note = new Note({ frequency: 55 })

  assert.strictEqual(note.identifier, 'A1')
})

it('name is formatted properly', () => {
  expect(1)

  const note = new Note({ frequency: 51.91 })

  assert.strictEqual(note.name, 'Ab')
})

it('setting frequency properly calculates other props', () => {
  expect(5)

  const note = new Note({ frequency: 440 })

  assert.strictEqual(note.identifier, 'A4')
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, '')
})

it('setting identifier properly calculates other props', () => {
  expect(5)

  const note = new Note({ identifier: 'A4' })

  assert.strictEqual(note.frequency, 440)
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, '')
})

it('setting identifier with accidental properly calculates other props', () => {
  expect(5)

  const note = new Note({ identifier: 'Ab4' })

  assert.strictEqual(note.frequency, 415.3)
  assert.strictEqual(note.name, 'Ab')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, 'b')
})

it('still works if manually set letter, accidental and octave', () => {
  expect(3)

  const note = new Note({ letter: 'A', accidental: 'b', octave: '4' })

  assert.strictEqual(note.frequency, 415.3)
  assert.strictEqual(note.name, 'Ab')
  assert.strictEqual(note.identifier, 'Ab4')
})

it('still works if manually set letter and octave (no accidental)', () => {
  expect(3)

  const note = new Note({ letter: 'A', octave: '4' })

  assert.strictEqual(note.frequency, 440)
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.identifier, 'A4')
})

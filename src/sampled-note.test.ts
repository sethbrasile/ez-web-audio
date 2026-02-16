import { describe, it, expect, beforeEach } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { SampledNote } from './sampled-note'
import { Sound } from './sound'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSampledNote(context: AudioContext, identifier?: string) {
  // Create buffer (1 second at 44.1kHz)
  const audioBuffer = context.createBuffer(1, 44100, 44100)
  const note = new SampledNote(context, audioBuffer)
  // Set identifier after creation (matches how createNoteObjectsForFont does it)
  if (identifier) {
    note.identifier = identifier
  }
  return note
}

describe('SampledNote', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation and mixin composition', () => {
    it('exists', () => {
      expect(SampledNote).toBeTruthy()
    })

    it('can be created with AudioBuffer', () => {
      const note = createSampledNote(audioContext)
      expect(note).toBeTruthy()
      expect(note).toBeInstanceOf(SampledNote)
    })

    it('is instance of Sound (parent class)', () => {
      const note = createSampledNote(audioContext)
      expect(note).toBeInstanceOf(Sound)
    })
  })

  describe('Sound capabilities (inherited)', () => {
    it('has play() method', () => {
      const note = createSampledNote(audioContext)
      expect(typeof note.play).toBe('function')
    })

    it('has stop() method', () => {
      const note = createSampledNote(audioContext)
      expect(typeof note.stop).toBe('function')
    })

    it('has isPlaying property', () => {
      const note = createSampledNote(audioContext)
      expect(note.isPlaying).toBe(false)
    })

    it('can play and sets isPlaying to true', async () => {
      const note = createSampledNote(audioContext)
      await note.play()
      expect(note.isPlaying).toBe(true)
    })

    it('has changeGainTo() method', () => {
      const note = createSampledNote(audioContext)
      expect(typeof note.changeGainTo).toBe('function')
      const result = note.changeGainTo(0.5)
      expect(result).toBe(note) // Returns this for chaining
    })

    it('has changePanTo() method', () => {
      const note = createSampledNote(audioContext)
      expect(typeof note.changePanTo).toBe('function')
      const result = note.changePanTo(-0.5)
      expect(result).toBe(note) // Returns this for chaining
    })

    it('has gainNode', () => {
      const note = createSampledNote(audioContext)
      expect(note.gainNode).toBeDefined()
    })

    it('has audioSourceNode', () => {
      const note = createSampledNote(audioContext)
      expect(note.audioSourceNode).toBeDefined()
    })
  })

  describe('MusicallyAware capabilities (from mixin)', () => {
    it('has letter property', () => {
      const note = createSampledNote(audioContext)
      expect(note.letter).toBeDefined()
    })

    it('has accidental property', () => {
      const note = createSampledNote(audioContext)
      expect(note.accidental).toBeDefined()
    })

    it('has octave property', () => {
      const note = createSampledNote(audioContext)
      expect(note.octave).toBeDefined()
    })

    it('has frequency property', () => {
      const note = createSampledNote(audioContext)
      expect(typeof note.frequency).toBe('number')
    })

    it('has identifier property', () => {
      const note = createSampledNote(audioContext)
      expect(note.identifier).toBeDefined()
    })
  })

  describe('musical identity setting and reading', () => {
    it('setting letter and octave updates identifier', () => {
      const note = createSampledNote(audioContext)
      note.letter = 'A'
      note.octave = '4'
      expect(note.identifier).toBe('A4')
    })

    it('setting identifier to A4 gives frequency 440', () => {
      const note = createSampledNote(audioContext)
      note.identifier = 'A4'
      expect(note.frequency).toBe(440)
    })

    it('setting identifier updates letter, accidental, and octave', () => {
      const note = createSampledNote(audioContext)
      note.identifier = 'Bb3'
      expect(note.letter).toBe('B')
      expect(note.accidental).toBe('b')
      expect(note.octave).toBe('3')
    })

    it('identifier with flat accidental parses correctly', () => {
      const note = createSampledNote(audioContext)
      note.identifier = 'Db5'
      expect(note.letter).toBe('D')
      expect(note.accidental).toBe('b')
      expect(note.octave).toBe('5')
    })

    it('identifier without accidental parses correctly', () => {
      const note = createSampledNote(audioContext)
      note.identifier = 'G2'
      expect(note.letter).toBe('G')
      expect(note.accidental).toBe('')
      expect(note.octave).toBe('2')
    })

    it('frequency matches identifier', () => {
      const note = createSampledNote(audioContext)
      note.identifier = 'C4'
      // C4 is 261.63 Hz
      expect(note.frequency).toBeCloseTo(261.63, 1)
    })
  })

  describe('playback with musical identity', () => {
    it('can play a note with musical identity', async () => {
      const note = createSampledNote(audioContext, 'A4')
      expect(note.identifier).toBe('A4')
      await note.play()
      expect(note.isPlaying).toBe(true)
    })

    it('musical identity persists across play/stop cycles', async () => {
      const note = createSampledNote(audioContext, 'Bb3')
      await note.play()
      await note.stop()
      // Identity should be unchanged
      expect(note.identifier).toBe('Bb3')
      expect(note.frequency).toBeCloseTo(233.08, 1)
    })

    it('can change musical identity while playing', async () => {
      const note = createSampledNote(audioContext, 'A4')
      await note.play()
      note.identifier = 'C5'
      // Musical identity changes, but playback continues
      expect(note.isPlaying).toBe(true)
      expect(note.identifier).toBe('C5')
    })
  })

  describe('name property conflict (KNOWN ISSUE)', () => {
    it('name property is shadowed by BaseSound.name (returns empty string, not musical name)', () => {
      const note = createSampledNote(audioContext, 'A4')
      // Verify musical identity is set correctly
      expect(note.identifier).toBe('A4')
      expect(note.letter).toBe('A')
      expect(note.accidental).toBe('')

      // BUG: name property is shadowed by BaseSound.name property (for sound identification)
      // MusicallyAware mixin provides a name *getter* for musical name (e.g., "Ab", "C#")
      // But BaseSound has a name *property* for sound identification/debugging
      // The property shadows the getter, so SampledNote.name returns the sound name (empty string by default)
      // instead of the musical name
      expect(note.name).toBe('') // Should be 'A' but BaseSound.name shadows the getter

      // Workaround: Manually compute name from letter + accidental
      const musicalName = note.accidental ? `${note.letter}${note.accidental}` : note.letter
      expect(musicalName).toBe('A')
    })

    it('setting BaseSound.name works but does not provide musical name', () => {
      const note = createSampledNote(audioContext, 'Bb3')
      // Set the sound identification name (BaseSound.name property)
      note.name = 'myNote'
      expect(note.name).toBe('myNote') // BaseSound.name property

      // Musical properties still work
      expect(note.letter).toBe('B')
      expect(note.accidental).toBe('b')

      // But can't access musical name via .name getter (it's shadowed)
      const musicalName = note.accidental ? `${note.letter}${note.accidental}` : note.letter
      expect(musicalName).toBe('Bb')
    })
  })
})

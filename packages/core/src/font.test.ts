import type { SampledNote } from './sampled-note'
import { describe, expect, it, vi } from 'vitest'
import { Font } from './font'

// Create mock SampledNote instances for testing
function createMockNote(identifier: string): SampledNote {
  return {
    identifier,
    play: vi.fn(),
    dispose: vi.fn(),
  } as unknown as SampledNote
}

describe('font', () => {
  describe('getNote', () => {
    it('returns matching note from notes array', () => {
      const noteA4 = createMockNote('A4')
      const noteC4 = createMockNote('C4')
      const noteE4 = createMockNote('E4')
      const font = new Font([noteA4, noteC4, noteE4])

      expect(font.getNote('A4')).toBe(noteA4)
      expect(font.getNote('C4')).toBe(noteC4)
      expect(font.getNote('E4')).toBe(noteE4)
    })

    it('returns undefined for non-existent note', () => {
      const noteA4 = createMockNote('A4')
      const font = new Font([noteA4])

      expect(font.getNote('Z9')).toBeUndefined()
      expect(font.getNote('B3')).toBeUndefined()
    })

    it('returns undefined when font is empty', () => {
      const font = new Font([])
      expect(font.getNote('A4')).toBeUndefined()
    })

    it('finds notes with accidentals', () => {
      const noteBb3 = createMockNote('Bb3')
      const noteDb5 = createMockNote('Db5')
      const font = new Font([noteBb3, noteDb5])

      expect(font.getNote('Bb3')).toBe(noteBb3)
      expect(font.getNote('Db5')).toBe(noteDb5)
    })
  })

  describe('play', () => {
    it('calls play() on the matching note', () => {
      const noteA4 = createMockNote('A4')
      const noteC4 = createMockNote('C4')
      const font = new Font([noteA4, noteC4])

      font.play('A4')
      expect(noteA4.play).toHaveBeenCalledTimes(1)
      expect(noteC4.play).not.toHaveBeenCalled()
    })

    it('throws error for non-existent note', () => {
      const noteA4 = createMockNote('A4')
      const font = new Font([noteA4])

      expect(() => font.play('Z9')).toThrow(
        'EZ Web Audio: No note with identifier \'Z9\' found. Available notes: A4',
      )
    })

    it('throws error with multiple available notes listed', () => {
      const notes = [
        createMockNote('A4'),
        createMockNote('B4'),
        createMockNote('C4'),
      ]
      const font = new Font(notes)

      expect(() => font.play('D4')).toThrow(
        'EZ Web Audio: No note with identifier \'D4\' found. Available notes: A4, B4, C4',
      )
    })

    it('throws error showing only first 10 notes when font has many notes', () => {
      const notes = Array.from({ length: 15 }, (_, i) => createMockNote(`Note${i}`))
      const font = new Font(notes)

      const error = (() => {
        try {
          font.play('Missing')
        }
        catch (e: any) {
          return e.message
        }
      })()

      expect(error).toContain('Available notes: Note0, Note1, Note2, Note3, Note4, Note5, Note6, Note7, Note8, Note9...')
      expect(error).toContain('(15 total)')
    })

    it('throws error when font is empty', () => {
      const font = new Font([])

      expect(() => font.play('A4')).toThrow(
        'EZ Web Audio: No note with identifier \'A4\' found. Available notes:',
      )
    })

    it('can play same note multiple times', () => {
      const noteA4 = createMockNote('A4')
      const font = new Font([noteA4])

      font.play('A4')
      font.play('A4')
      font.play('A4')

      expect(noteA4.play).toHaveBeenCalledTimes(3)
    })

    it('plays notes with accidentals correctly', () => {
      const noteBb3 = createMockNote('Bb3')
      const noteDb5 = createMockNote('Db5')
      const font = new Font([noteBb3, noteDb5])

      font.play('Bb3')
      expect(noteBb3.play).toHaveBeenCalledTimes(1)

      font.play('Db5')
      expect(noteDb5.play).toHaveBeenCalledTimes(1)
    })
  })

  describe('notes property', () => {
    it('holds the array passed to constructor', () => {
      const noteA4 = createMockNote('A4')
      const noteC4 = createMockNote('C4')
      const notes = [noteA4, noteC4]
      const font = new Font(notes)

      expect(font.notes).toBe(notes)
      expect(font.notes).toHaveLength(2)
    })

    it('allows empty array', () => {
      const font = new Font([])
      expect(font.notes).toEqual([])
      expect(font.notes).toHaveLength(0)
    })
  })

  describe('dispose (G9 — disposal cascade)', () => {
    it('calls dispose() on every note', () => {
      const noteA4 = createMockNote('A4')
      const noteC4 = createMockNote('C4')
      const font = new Font([noteA4, noteC4])

      font.dispose()

      expect(noteA4.dispose).toHaveBeenCalledTimes(1)
      expect(noteC4.dispose).toHaveBeenCalledTimes(1)
    })

    it('does not throw when the font is empty', () => {
      const font = new Font([])
      expect(() => font.dispose()).not.toThrow()
    })
  })
})

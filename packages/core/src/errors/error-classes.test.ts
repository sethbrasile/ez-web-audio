import { describe, expect, it } from 'vitest'
import { AudioError } from './audio-error'
import { AudioContextError } from './context-error'
import { InvalidNoteError } from './invalid-note-error'
import { AudioLoadError } from './load-error'

describe('error Classes', () => {
  describe('audioError', () => {
    it('is an instance of Error', () => {
      const error = new AudioError('Test error')
      expect(error).toBeInstanceOf(Error)
    })

    it('has correct name property', () => {
      const error = new AudioError('Test error')
      expect(error.name).toBe('AudioError')
    })

    it('stores message property', () => {
      const error = new AudioError('Something went wrong')
      expect(error.message).toBe('Something went wrong')
    })

    it('stores optional code property', () => {
      const error = new AudioError('Test error', 'TEST_CODE')
      expect(error.code).toBe('TEST_CODE')
    })

    it('has undefined code when not provided', () => {
      const error = new AudioError('Test error')
      expect(error.code).toBeUndefined()
    })

    it('has stack trace', () => {
      const error = new AudioError('Test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AudioError')
    })
  })

  describe('audioContextError', () => {
    it('is an instance of Error', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of AudioError', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error).toBeInstanceOf(AudioError)
    })

    it('has correct name property', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error.name).toBe('AudioContextError')
    })

    it('stores message property', () => {
      const error = new AudioContextError('AudioContext suspended', 'suspended')
      expect(error.message).toBe('AudioContext suspended')
    })

    it('stores state property', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error.state).toBe('suspended')
    })

    it('has CONTEXT_ERROR code', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error.code).toBe('CONTEXT_ERROR')
    })

    it('works with different AudioContext states', () => {
      const suspendedError = new AudioContextError('Suspended', 'suspended')
      expect(suspendedError.state).toBe('suspended')

      const closedError = new AudioContextError('Closed', 'closed')
      expect(closedError.state).toBe('closed')

      const runningError = new AudioContextError('Running', 'running')
      expect(runningError.state).toBe('running')
    })

    it('has stack trace', () => {
      const error = new AudioContextError('Context error', 'suspended')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AudioContextError')
    })
  })

  describe('audioLoadError', () => {
    it('is an instance of Error', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of AudioError', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error).toBeInstanceOf(AudioError)
    })

    it('has correct name property', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error.name).toBe('AudioLoadError')
    })

    it('stores message property', () => {
      const error = new AudioLoadError('Failed to load audio', 'https://example.com/audio.mp3')
      expect(error.message).toBe('Failed to load audio')
    })

    it('stores url property', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error.url).toBe('https://example.com/audio.mp3')
    })

    it('has LOAD_ERROR code', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error.code).toBe('LOAD_ERROR')
    })

    it('works with different URL formats', () => {
      const httpError = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(httpError.url).toBe('https://example.com/audio.mp3')

      const relativeError = new AudioLoadError('Load failed', '/sounds/beep.wav')
      expect(relativeError.url).toBe('/sounds/beep.wav')

      const dataError = new AudioLoadError('Load failed', 'data:audio/wav;base64,ABC123')
      expect(dataError.url).toBe('data:audio/wav;base64,ABC123')
    })

    it('has stack trace', () => {
      const error = new AudioLoadError('Load failed', 'https://example.com/audio.mp3')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AudioLoadError')
    })
  })

  describe('invalidNoteError', () => {
    it('is an instance of Error', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of AudioError', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error).toBeInstanceOf(AudioError)
    })

    it('has correct name property', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error.name).toBe('InvalidNoteError')
    })

    it('stores message property', () => {
      const error = new InvalidNoteError('Note H4 is invalid', 'H4')
      expect(error.message).toBe('Note H4 is invalid')
    })

    it('stores identifier property', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error.identifier).toBe('H4')
    })

    it('has INVALID_NOTE code', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error.code).toBe('INVALID_NOTE')
    })

    it('works with different invalid identifiers', () => {
      const errorH4 = new InvalidNoteError('Invalid', 'H4')
      expect(errorH4.identifier).toBe('H4')

      const errorA9 = new InvalidNoteError('Invalid', 'A9')
      expect(errorA9.identifier).toBe('A9')

      const errorInvalid = new InvalidNoteError('Invalid', 'not-a-note')
      expect(errorInvalid.identifier).toBe('not-a-note')
    })

    it('has stack trace', () => {
      const error = new InvalidNoteError('Invalid note', 'H4')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('InvalidNoteError')
    })
  })

  describe('error instanceof chain', () => {
    it('audioContextError instanceof AudioError', () => {
      const error = new AudioContextError('Test', 'suspended')
      expect(error instanceof AudioError).toBe(true)
    })

    it('audioLoadError instanceof AudioError', () => {
      const error = new AudioLoadError('Test', 'http://test.com')
      expect(error instanceof AudioError).toBe(true)
    })

    it('invalidNoteError instanceof AudioError', () => {
      const error = new InvalidNoteError('Test', 'H4')
      expect(error instanceof AudioError).toBe(true)
    })

    it('all custom errors instanceof Error', () => {
      const audioError = new AudioError('Test')
      const contextError = new AudioContextError('Test', 'suspended')
      const loadError = new AudioLoadError('Test', 'http://test.com')
      const noteError = new InvalidNoteError('Test', 'H4')

      expect(audioError instanceof Error).toBe(true)
      expect(contextError instanceof Error).toBe(true)
      expect(loadError instanceof Error).toBe(true)
      expect(noteError instanceof Error).toBe(true)
    })
  })
})

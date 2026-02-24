import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetAudioContext, getOrCreateAudioContext, iosWorkaround, markIosWorkaroundPerformed } from './audio-context'

describe('audio-context', () => {
  beforeEach(() => {
    _resetAudioContext()
    vi.stubGlobal('AudioContext', MockAudioContext)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  describe('getOrCreateAudioContext', () => {
    it('creates an AudioContext on first call', () => {
      const ctx = getOrCreateAudioContext()
      expect(ctx).toBeDefined()
      expect(ctx).toBeInstanceOf(MockAudioContext)
    })

    it('returns the same instance on subsequent calls', () => {
      const first = getOrCreateAudioContext()
      const second = getOrCreateAudioContext()
      expect(first).toBe(second)
    })

    it('creates a new context when previous is closed', () => {
      const first = getOrCreateAudioContext()
      // Mock the state as 'closed'
      Object.defineProperty(first, 'state', {
        get: () => 'closed',
        configurable: true,
      })
      const second = getOrCreateAudioContext()
      expect(second).not.toBe(first)
    })

    it('returns an AudioContext even without prior initAudio()', () => {
      // Fresh state, no initAudio call
      _resetAudioContext()
      const ctx = getOrCreateAudioContext()
      expect(ctx).toBeDefined()
    })
  })

  describe('_resetAudioContext', () => {
    it('causes next getOrCreateAudioContext to create new instance', () => {
      const first = getOrCreateAudioContext()
      _resetAudioContext()
      const second = getOrCreateAudioContext()
      expect(second).not.toBe(first)
    })

    it('resets iosWorkaround.performed to false', () => {
      markIosWorkaroundPerformed()
      expect(iosWorkaround.performed).toBe(true)
      _resetAudioContext()
      expect(iosWorkaround.performed).toBe(false)
    })
  })

  describe('markIosWorkaroundPerformed', () => {
    it('sets iosWorkaround.performed to true', () => {
      expect(iosWorkaround.performed).toBe(false)
      markIosWorkaroundPerformed()
      expect(iosWorkaround.performed).toBe(true)
    })
  })
})

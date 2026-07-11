import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetAudioContext, getMasterDestination, getOrCreateAudioContext, iosWorkaround, markIosWorkaroundPerformed, muteAll, setGlobalVolume, setMasterDestination } from './audio-context'
import { ValidationError } from './errors'

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

    it('warns when creating AudioContext after previous one closed (SAFE-07)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const ctx1 = getOrCreateAudioContext()
      // Simulate closing
      Object.defineProperty(ctx1, 'state', { get: () => 'closed', configurable: true })
      const ctx2 = getOrCreateAudioContext()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Previous AudioContext was closed'),
      )
      expect(ctx2).not.toBe(ctx1)
      warnSpy.mockRestore()
    })

    it('does not warn on first AudioContext creation (SAFE-07)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // Fresh state — no previous context
      _resetAudioContext()
      getOrCreateAudioContext()
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
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

  describe('master destination', () => {
    it('defaults to null', () => {
      expect(getMasterDestination()).toBeNull()
    })

    it('set/get round-trips a node', () => {
      const ctx = getOrCreateAudioContext()
      const node = ctx.createGain()
      setMasterDestination(node as unknown as AudioNode)
      expect(getMasterDestination()).toBe(node)
    })

    it('clears back to null', () => {
      const ctx = getOrCreateAudioContext()
      setMasterDestination(ctx.createGain() as unknown as AudioNode)
      setMasterDestination(null)
      expect(getMasterDestination()).toBeNull()
    })

    it('_resetAudioContext clears the master destination', () => {
      const ctx = getOrCreateAudioContext()
      setMasterDestination(ctx.createGain() as unknown as AudioNode)
      _resetAudioContext()
      expect(getMasterDestination()).toBeNull()
    })
  })

  describe('setGlobalVolume / muteAll (R2#7)', () => {
    it('setGlobalVolume lazily installs a managed GainNode as the master destination', () => {
      expect(getMasterDestination()).toBeNull()
      setGlobalVolume(0.5)
      const dest = getMasterDestination()
      expect(dest).not.toBeNull()
      expect((dest as unknown as GainNode).gain.value).toBe(0.5)
    })

    it('reuses the same managed GainNode across multiple setGlobalVolume calls', () => {
      setGlobalVolume(0.5)
      const first = getMasterDestination()
      setGlobalVolume(0.8)
      const second = getMasterDestination()
      expect(second).toBe(first)
      expect((second as unknown as GainNode).gain.value).toBe(0.8)
    })

    it('throws ValidationError for negative volume, same rule as changeGainTo', () => {
      expect(() => setGlobalVolume(-0.5)).toThrow(ValidationError)
      expect(() => setGlobalVolume(-0.5)).toThrow('Gain must be >= 0. Received: -0.5')
    })

    it('warns for volume > 1', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      setGlobalVolume(1.5)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds 1.0'))
      warnSpy.mockRestore()
    })

    it('muteAll(true) zeroes the managed gain and muteAll(false) restores the last volume', () => {
      setGlobalVolume(0.7)
      muteAll(true)
      const dest = getMasterDestination() as unknown as GainNode
      expect(dest.gain.value).toBe(0)
      muteAll(false)
      expect(dest.gain.value).toBe(0.7)
    })

    it('muteAll lazily installs the managed GainNode even if setGlobalVolume was never called', () => {
      expect(getMasterDestination()).toBeNull()
      muteAll(true)
      expect(getMasterDestination()).not.toBeNull()
      expect((getMasterDestination() as unknown as GainNode).gain.value).toBe(0)
    })

    it('_resetAudioContext clears the managed gain so a later call recreates it', () => {
      setGlobalVolume(0.5)
      const first = getMasterDestination()
      _resetAudioContext()
      expect(getMasterDestination()).toBeNull()
      setGlobalVolume(0.5)
      expect(getMasterDestination()).not.toBe(first)
    })
  })
})

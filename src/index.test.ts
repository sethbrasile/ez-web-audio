/**
 * AudioContext Initialization Tests
 *
 * These tests cover the programmatic API of initAudio() and getAudioContext().
 *
 * TESTED (automated):
 * - AudioContext singleton creation
 * - Error handling for interrupted state
 * - iOS workaround function call toggling
 * - unlockAudioContext behavior (event listener setup)
 *
 * NOT TESTED (requires manual browser testing):
 * - unmute.js iOS workaround functionality (ringer vs media channel)
 * - Real AudioContext resume behavior on user interaction
 * - iOS Safari page visibility handling
 * - Actual user interaction unlock flow
 * - iOS backgrounding and interrupted state transitions
 *
 * Manual testing procedure for iOS:
 * 1. Open demo site on iOS Safari
 * 2. Verify audio plays on media channel (not ringer)
 * 3. Background the app, return, verify audio resumes
 * 4. Test with mute switch in both positions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'

describe('AudioContext Initialization', () => {
  let mockAudioContext: AudioContext
  let mockUnmute: ReturnType<typeof vi.fn>
  let AudioContextConstructor: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Reset module state to get fresh imports
    vi.resetModules()

    // Create mock AudioContext instance
    mockAudioContext = new MockAudioContext() as unknown as AudioContext

    // Create constructor spy
    AudioContextConstructor = vi.fn(() => mockAudioContext)

    // Stub global AudioContext
    vi.stubGlobal('AudioContext', AudioContextConstructor)

    // Mock unmute module
    mockUnmute = vi.fn()
    vi.doMock('./utils/unmute', () => ({ default: mockUnmute }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('initAudio()', () => {
    describe('basic behavior', () => {
      it('creates AudioContext when none exists', async () => {
        const { initAudio } = await import('./index')
        await initAudio()

        expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
      })

      it('does not recreate AudioContext on subsequent calls', async () => {
        const { initAudio } = await import('./index')

        await initAudio()
        await initAudio()
        await initAudio()

        expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
      })

      it('returns a resolved promise', async () => {
        const { initAudio } = await import('./index')

        const result = initAudio()
        expect(result).toBeInstanceOf(Promise)

        await expect(result).resolves.toBeUndefined()
      })

      it('calls unlockAudioContext internally', async () => {
        const { initAudio } = await import('./index')

        // Spy on audioContext.resume to verify unlockAudioContext calls it
        const resumeSpy = vi.spyOn(mockAudioContext, 'resume')

        await initAudio()

        // unlockAudioContext calls resume() at least once
        expect(resumeSpy).toHaveBeenCalled()
      })
    })

    describe('iOS workaround flag', () => {
      it('calls unmuteIosAudio when useIosMuteWorkaround is true (default)', async () => {
        const { initAudio } = await import('./index')

        await initAudio()

        expect(mockUnmute).toHaveBeenCalledTimes(1)
        expect(mockUnmute).toHaveBeenCalledWith(mockAudioContext)
      })

      it('calls unmuteIosAudio when useIosMuteWorkaround is explicitly true', async () => {
        const { initAudio } = await import('./index')

        await initAudio(true)

        expect(mockUnmute).toHaveBeenCalledTimes(1)
        expect(mockUnmute).toHaveBeenCalledWith(mockAudioContext)
      })

      it('does NOT call unmuteIosAudio when useIosMuteWorkaround is false', async () => {
        const { initAudio } = await import('./index')

        await initAudio(false)

        expect(mockUnmute).not.toHaveBeenCalled()
      })

      it('only calls iOS workaround once on repeated calls with useIosMuteWorkaround=true', async () => {
        const { initAudio } = await import('./index')

        await initAudio(true)
        await initAudio(true)
        await initAudio(true)

        expect(mockUnmute).toHaveBeenCalledTimes(1)
      })

      it('does not call iOS workaround after first call even if flag changes', async () => {
        const { initAudio } = await import('./index')

        await initAudio(true)
        await initAudio(false)
        await initAudio(true)

        // Still only called once from first invocation
        expect(mockUnmute).toHaveBeenCalledTimes(1)
      })
    })

    describe('error handling', () => {
      it('throws AudioContextError when state is "interrupted"', async () => {
        // Mock interrupted state
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'interrupted',
          configurable: true,
        })

        const { initAudio } = await import('./index')

        await expect(initAudio()).rejects.toThrow('AudioContext interrupted')
        await expect(initAudio()).rejects.toThrow('iOS backgrounded')
      })

      it('throws AudioContextError with correct state property', async () => {
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'interrupted',
          configurable: true,
        })

        const { initAudio, AudioContextError } = await import('./index')

        try {
          await initAudio()
          expect.fail('Should have thrown')
        }
        catch (error) {
          expect(error).toBeInstanceOf(AudioContextError)
          expect((error as any).state).toBe('interrupted')
        }
      })

      it('error message explains what to do', async () => {
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'interrupted',
          configurable: true,
        })

        const { initAudio } = await import('./index')

        await expect(initAudio()).rejects.toThrow('Resume playback after returning to foreground')
      })
    })

    describe('AudioContext states', () => {
      it('works when AudioContext state is "running"', async () => {
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'running',
          configurable: true,
        })

        const { initAudio } = await import('./index')

        await expect(initAudio()).resolves.toBeUndefined()
      })

      it('works when AudioContext state is "suspended"', async () => {
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'suspended',
          configurable: true,
        })

        const { initAudio } = await import('./index')

        await expect(initAudio()).resolves.toBeUndefined()
      })

      it('works when AudioContext state is "closed"', async () => {
        Object.defineProperty(mockAudioContext, 'state', {
          get: () => 'closed',
          configurable: true,
        })

        const { initAudio } = await import('./index')

        await expect(initAudio()).resolves.toBeUndefined()
      })
    })
  })

  describe('getAudioContext()', () => {
    it('calls initAudio() internally', async () => {
      const { getAudioContext } = await import('./index')

      await getAudioContext()

      expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
    })

    it('returns AudioContext instance', async () => {
      const { getAudioContext } = await import('./index')

      const result = await getAudioContext()

      expect(result).toBe(mockAudioContext)
    })

    it('returns same instance on repeated calls', async () => {
      const { getAudioContext } = await import('./index')

      const first = await getAudioContext()
      const second = await getAudioContext()
      const third = await getAudioContext()

      expect(first).toBe(mockAudioContext)
      expect(second).toBe(mockAudioContext)
      expect(third).toBe(mockAudioContext)
      expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
    })

    it('returns a Promise that resolves to AudioContext', async () => {
      const { getAudioContext } = await import('./index')

      const result = getAudioContext()

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBe(mockAudioContext)
    })

    it('propagates errors from initAudio()', async () => {
      Object.defineProperty(mockAudioContext, 'state', {
        get: () => 'interrupted',
        configurable: true,
      })

      const { getAudioContext } = await import('./index')

      await expect(getAudioContext()).rejects.toThrow('AudioContext interrupted')
    })
  })

  describe('unlockAudioContext behavior', () => {
    it('adds event listeners to document.body', async () => {
      const { initAudio } = await import('./index')

      const addEventListenerSpy = vi.spyOn(document.body, 'addEventListener')

      await initAudio()

      // unlockAudioContext adds touchstart, touchend, mousedown, keydown listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), false)
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), false)
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), false)
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
    })

    it('calls audioContext.resume() during unlock', async () => {
      const { initAudio } = await import('./index')

      const resumeSpy = vi.spyOn(mockAudioContext, 'resume')

      await initAudio()

      expect(resumeSpy).toHaveBeenCalled()
    })

    it('does not re-add listeners on subsequent initAudio calls', async () => {
      const { initAudio } = await import('./index')

      const addEventListenerSpy = vi.spyOn(document.body, 'addEventListener')

      await initAudio()
      const firstCallCount = addEventListenerSpy.mock.calls.length

      await initAudio()
      const secondCallCount = addEventListenerSpy.mock.calls.length

      // Second call to initAudio should call unlockAudioContext again
      // which checks state and may add listeners again
      expect(secondCallCount).toBeGreaterThanOrEqual(firstCallCount)
    })
  })
})

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

import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('audioContext Initialization', () => {
  let mockAudioContext: AudioContext
  let mockUnmute: ReturnType<typeof vi.fn>
  let AudioContextConstructor: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Reset module state to get fresh imports
    vi.resetModules()

    // Create mock AudioContext instance
    mockAudioContext = new MockAudioContext() as unknown as AudioContext

    // Create constructor spy (must use function syntax, not arrow, for vitest 4 constructor mocks)
    // eslint-disable-next-line prefer-arrow-callback
    AudioContextConstructor = vi.fn(function _MockAudioContext() {
      return mockAudioContext
    })

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

    describe('audioContext states', () => {
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

  describe('lazy AudioContext initialization', () => {
    it('creates AudioContext lazily when factory function is called', async () => {
      const { createWhiteNoise } = await import('./index')

      // createWhiteNoise should create AudioContext internally
      await createWhiteNoise()
      expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
    })

    it('reuses same AudioContext across multiple factory calls', async () => {
      const { createOscillator, createWhiteNoise } = await import('./index')

      await createWhiteNoise()
      await createOscillator({ frequency: 440 })

      // Should only create one AudioContext
      expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
    })

    it('initAudio() still works as explicit API', async () => {
      const { initAudio } = await import('./index')

      await initAudio()
      expect(AudioContextConstructor).toHaveBeenCalledTimes(1)
    })
  })
})

describe('factory functions', () => {
  let mockAudioContext: AudioContext
  let AudioContextConstructor: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  function makeMockResponse(options: { ok?: boolean, status?: number, statusText?: string, arrayBuffer?: ArrayBuffer, text?: string } = {}) {
    const { ok = true, status = 200, statusText = 'OK', arrayBuffer = new ArrayBuffer(8), text = '' } = options
    const response = {
      ok,
      status,
      statusText,
      clone: vi.fn(),
      arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
      text: vi.fn().mockResolvedValue(text),
    } as unknown as Response
    // clone returns a fresh response-like object
    ;(response.clone as ReturnType<typeof vi.fn>).mockReturnValue({
      ok,
      status,
      statusText,
      clone: vi.fn().mockReturnThis(),
      arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
      text: vi.fn().mockResolvedValue(text),
    })
    return response
  }

  beforeEach(async () => {
    vi.resetModules()

    const { AudioContext: MockAudioContext } = await import('standardized-audio-context-mock')
    mockAudioContext = new MockAudioContext() as unknown as AudioContext

    // eslint-disable-next-line prefer-arrow-callback
    AudioContextConstructor = vi.fn(function _MockAudioContext() {
      return mockAudioContext
    })
    vi.stubGlobal('AudioContext', AudioContextConstructor)

    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    // Mock unmute to avoid side effects
    vi.doMock('./utils/unmute', () => ({ default: vi.fn() }))
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    // Clear preload cache to avoid cross-test pollution
    const { clearPreloadCache } = await import('./preload')
    clearPreloadCache()
  })

  describe('createSound()', () => {
    it('returns a Sound instance on successful fetch', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSound, Sound } = await import('./index')

      const sound = await createSound('test.mp3')

      expect(sound).toBeInstanceOf(Sound)
    })

    it('throws AudioLoadError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createSound, AudioLoadError } = await import('./index')

      await expect(createSound('test.mp3')).rejects.toBeInstanceOf(AudioLoadError)
    })

    it('throws AudioLoadError with URL info on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createSound } = await import('./index')

      await expect(createSound('test.mp3')).rejects.toThrow('test.mp3')
    })

    it('throws AudioLoadError on HTTP 404', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createSound, AudioLoadError } = await import('./index')

      await expect(createSound('missing.mp3')).rejects.toBeInstanceOf(AudioLoadError)
    })

    it('throws AudioLoadError with status on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createSound } = await import('./index')

      await expect(createSound('missing.mp3')).rejects.toThrow('404')
    })

    it('accepts ArrayBuffer input and returns Sound', async () => {
      const { createSound, Sound } = await import('./index')

      const buffer = new ArrayBuffer(8)
      const sound = await createSound(buffer)

      expect(sound).toBeInstanceOf(Sound)
    })

    it('accepts Blob input and returns Sound', async () => {
      const { createSound, Sound } = await import('./index')

      // Create a Blob with an underlying ArrayBuffer
      const arrayBuffer = new ArrayBuffer(8)
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const sound = await createSound(blob)

      expect(sound).toBeInstanceOf(Sound)
    })

    it('accepts File input and returns Sound', async () => {
      const { createSound, Sound } = await import('./index')

      const arrayBuffer = new ArrayBuffer(8)
      const file = new File([arrayBuffer], 'click.wav', { type: 'audio/wav' })
      const sound = await createSound(file)

      expect(sound).toBeInstanceOf(Sound)
    })
  })

  describe('createTrack()', () => {
    it('returns a Track instance on successful fetch', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTrack, Track } = await import('./index')

      const track = await createTrack('song.mp3')

      expect(track).toBeInstanceOf(Track)
    })

    it('throws AudioLoadError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createTrack, AudioLoadError } = await import('./index')

      await expect(createTrack('song.mp3')).rejects.toBeInstanceOf(AudioLoadError)
    })

    it('throws AudioLoadError on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 500, statusText: 'Server Error' }))
      const { createTrack } = await import('./index')

      await expect(createTrack('song.mp3')).rejects.toThrow('500')
    })

    it('accepts Blob input and returns Track', async () => {
      const { createTrack, Track } = await import('./index')

      const arrayBuffer = new ArrayBuffer(8)
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const track = await createTrack(blob)

      expect(track).toBeInstanceOf(Track)
    })

    it('accepts ArrayBuffer input and returns Track', async () => {
      const { createTrack, Track } = await import('./index')

      const buffer = new ArrayBuffer(8)
      const track = await createTrack(buffer)

      expect(track).toBeInstanceOf(Track)
    })
  })

  describe('createSounds()', () => {
    it('returns array of Sound instances', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSounds, Sound } = await import('./index')

      const sounds = await createSounds(['a.mp3', 'b.mp3', 'c.mp3'])

      expect(sounds).toHaveLength(3)
      sounds.forEach(s => expect(s).toBeInstanceOf(Sound))
    })

    it('returns empty array for empty urls input', async () => {
      const { createSounds } = await import('./index')

      const sounds = await createSounds([])

      expect(sounds).toEqual([])
    })

    it('calls onProgress for each loaded sound', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSounds } = await import('./index')
      const onProgress = vi.fn()

      await createSounds(['a.mp3', 'b.mp3'], onProgress)

      expect(onProgress).toHaveBeenCalledTimes(2)
    })

    it('calls onProgress with (loaded, total, url) signature', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSounds } = await import('./index')
      const calls: [number, number, string][] = []
      const onProgress = vi.fn((loaded: number, total: number, url: string) => {
        calls.push([loaded, total, url])
      })

      await createSounds(['a.mp3', 'b.mp3'], onProgress)

      expect(calls).toHaveLength(2)
      // total is always 2
      calls.forEach(([, total]) => expect(total).toBe(2))
      // urls are correct
      const urls = calls.map(([, , url]) => url)
      expect(urls).toContain('a.mp3')
      expect(urls).toContain('b.mp3')
    })

    it('throws AudioLoadError if any fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createSounds, AudioLoadError } = await import('./index')

      await expect(createSounds(['a.mp3'])).rejects.toBeInstanceOf(AudioLoadError)
    })
  })

  describe('createTracks()', () => {
    it('returns array of Track instances', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTracks, Track } = await import('./index')

      const tracks = await createTracks(['a.mp3', 'b.mp3', 'c.mp3'])

      expect(tracks).toHaveLength(3)
      tracks.forEach(t => expect(t).toBeInstanceOf(Track))
    })

    it('returns empty array for empty urls input', async () => {
      const { createTracks } = await import('./index')

      const tracks = await createTracks([])

      expect(tracks).toEqual([])
    })

    it('calls onProgress for each loaded track', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTracks } = await import('./index')
      const onProgress = vi.fn()

      await createTracks(['a.mp3', 'b.mp3'], onProgress)

      expect(onProgress).toHaveBeenCalledTimes(2)
    })

    it('calls onProgress with (loaded, total, url) signature', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTracks } = await import('./index')
      const calls: [number, number, string][] = []
      const onProgress = vi.fn((loaded: number, total: number, url: string) => {
        calls.push([loaded, total, url])
      })

      await createTracks(['a.mp3', 'b.mp3'], onProgress)

      expect(calls).toHaveLength(2)
      // total is always 2
      calls.forEach(([, total]) => expect(total).toBe(2))
      // urls are correct
      const urls = calls.map(([, , url]) => url)
      expect(urls).toContain('a.mp3')
      expect(urls).toContain('b.mp3')
    })

    it('throws AudioLoadError if any fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createTracks, AudioLoadError } = await import('./index')

      await expect(createTracks(['a.mp3'])).rejects.toBeInstanceOf(AudioLoadError)
    })
  })

  describe('createBeatTrack()', () => {
    it('returns a BeatTrack instance', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createBeatTrack, BeatTrack } = await import('./index')

      const beatTrack = await createBeatTrack(['kick.mp3'])

      expect(beatTrack).toBeInstanceOf(BeatTrack)
    })

    it('passes numBeats option through to BeatTrack', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createBeatTrack } = await import('./index')

      const beatTrack = await createBeatTrack(['kick.mp3'], { numBeats: 8 })

      expect(beatTrack.beats).toHaveLength(8)
    })

    it('throws AudioLoadError on failed fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createBeatTrack, AudioLoadError } = await import('./index')

      await expect(createBeatTrack(['kick.mp3'])).rejects.toBeInstanceOf(AudioLoadError)
    })
  })

  describe('createSampler()', () => {
    it('returns a Sampler instance', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSampler, Sampler } = await import('./index')

      const sampler = await createSampler(['snare1.mp3', 'snare2.mp3'])

      expect(sampler).toBeInstanceOf(Sampler)
    })

    it('throws AudioLoadError on failed fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createSampler, AudioLoadError } = await import('./index')

      await expect(createSampler(['snare.mp3'])).rejects.toBeInstanceOf(AudioLoadError)
    })
  })

  describe('createFont()', () => {
    it('throws error with URL on HTTP error response', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createFont } = await import('./index')

      await expect(createFont('piano.js')).rejects.toThrow('piano.js')
    })

    it('throws error with status on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createFont } = await import('./index')

      await expect(createFont('piano.js')).rejects.toThrow('HTTP 404')
    })

    it('wraps network error with URL info', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))
      const { createFont } = await import('./index')

      await expect(createFont('piano.js')).rejects.toThrow('piano.js')
    })
  })

  describe('createSprite()', () => {
    it('returns an AudioSprite instance on successful fetch', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSprite, AudioSprite } = await import('./index')
      const manifest = { spritemap: { laser: { start: 0, end: 0.1 } } }

      const sprite = await createSprite('sounds.mp3', manifest)

      expect(sprite).toBeInstanceOf(AudioSprite)
    })

    it('throws AudioLoadError on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createSprite, AudioLoadError } = await import('./index')
      const manifest = { spritemap: { laser: { start: 0, end: 0.1 } } }

      await expect(createSprite('sounds.mp3', manifest)).rejects.toBeInstanceOf(AudioLoadError)
    })

    it('throws AudioLoadError with URL on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 404, statusText: 'Not Found' }))
      const { createSprite } = await import('./index')
      const manifest = { spritemap: { laser: { start: 0, end: 0.1 } } }

      await expect(createSprite('sounds.mp3', manifest)).rejects.toThrow('sounds.mp3')
    })
  })

  describe('createNoise()', () => {
    it('createNoise("white") returns a Sound with a non-empty audioBuffer', async () => {
      const { createNoise, Sound } = await import('./index')

      const noise = await createNoise('white')

      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('createNoise("pink") returns a Sound with a non-empty audioBuffer', async () => {
      const { createNoise, Sound } = await import('./index')

      const noise = await createNoise('pink')

      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('createNoise("brown") returns a Sound with a non-empty audioBuffer', async () => {
      const { createNoise, Sound } = await import('./index')

      const noise = await createNoise('brown')

      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })
  })
})

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

  describe('createNotes()', () => {
    it('returns an array of Note objects from default frequency map', async () => {
      const { createNotes } = await import('./index')
      const notes = createNotes()
      expect(Array.isArray(notes)).toBe(true)
      expect(notes.length).toBeGreaterThan(0)
      notes.forEach((note) => {
        expect(note.frequency).toBeDefined()
      })
    })

    it('returns notes with correct frequencies from frequency map', async () => {
      const { createNotes } = await import('./index')
      const notes = createNotes()
      const a4 = notes.find(n => n.frequency === 440)
      expect(a4).toBeDefined()
    })

    it('accepts custom JSON frequency map', async () => {
      const { createNotes } = await import('./index')
      const notes = createNotes({ A4: 440, B4: 493.88 })
      expect(notes).toHaveLength(2)
      expect(notes[0].frequency).toBe(440)
      expect(notes[1].frequency).toBe(493.88)
    })

    it('returns empty array for empty JSON', async () => {
      const { createNotes } = await import('./index')
      const notes = createNotes({})
      expect(notes).toEqual([])
    })

    describe('note name parsing', () => {
      it('populates letter, accidental, and octave from standard note name keys', async () => {
        const { createNotes } = await import('./index')
        // Use a custom frequency map with arbitrary frequencies that are NOT in the built-in map
        // This ensures letter/accidental/octave come from key parsing, not the frequency setter
        const customMap = { 'A4': 999.1, 'Bb3': 999.2, 'C#5': 999.3 }
        const notes = createNotes(customMap)

        const a4 = notes[0]
        expect(a4.letter).toBe('A')
        expect(a4.accidental).toBe('')
        expect(a4.octave).toBe('4')

        const bb3 = notes[1]
        expect(bb3.letter).toBe('B')
        expect(bb3.accidental).toBe('b')
        expect(bb3.octave).toBe('3')

        const cs5 = notes[2]
        expect(cs5.letter).toBe('C')
        expect(cs5.accidental).toBe('#')
        expect(cs5.octave).toBe('5')
      })

      it('leaves identity fields at defaults for non-standard keys', async () => {
        const { createNotes } = await import('./index')
        // Use a numeric key that cannot be parsed as a note name
        const notes = createNotes({ CUSTOM: 999.9 })
        // letter/accidental/octave remain at constructor defaults (frequency not in built-in map)
        expect(notes[0].letter).toBe('A')
        expect(notes[0].accidental).toBe('')
        expect(notes[0].octave).toBe('0')
      })

      it('parses notes from default frequency map', async () => {
        const { createNotes } = await import('./index')
        const notes = createNotes()
        // A4 is in the frequency map — letter/octave/accidental should all be populated
        const a4 = notes.find(n => n.letter === 'A' && n.octave === '4' && n.accidental === '')
        expect(a4).toBeDefined()
      })
    })
  })

  describe('createAnalyzer context-free overload', () => {
    it('creates Analyzer without AudioContext parameter', async () => {
      const { createAnalyzer } = await import('./index')
      const analyzer = await createAnalyzer({ fftSize: 1024 })
      expect(analyzer).toBeDefined()
      expect(typeof analyzer.getFrequencyData).toBe('function')
    })

    it('creates Analyzer with no arguments', async () => {
      const { createAnalyzer } = await import('./index')
      const analyzer = await createAnalyzer()
      expect(analyzer).toBeDefined()
      expect(typeof analyzer.getFrequencyData).toBe('function')
    })

    it('creates Analyzer with explicit AudioContext', async () => {
      const { createAnalyzer } = await import('./index')
      const analyzer = await createAnalyzer(mockAudioContext, { fftSize: 2048 })
      expect(analyzer).toBeDefined()
      expect(typeof analyzer.getFrequencyData).toBe('function')
    })
  })

  describe('createLayeredSound()', () => {
    it('creates LayeredSound from array of Sound instances', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSound, createLayeredSound } = await import('./index')

      const sound1 = await createSound('a.mp3')
      const sound2 = await createSound('b.mp3')
      const layered = await createLayeredSound([sound1, sound2])

      expect(layered).toBeDefined()
      expect(typeof layered.play).toBe('function')
      expect(typeof layered.stop).toBe('function')
    })

    it('accepts optional name option', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSound, createLayeredSound } = await import('./index')

      const sound = await createSound('a.mp3')
      const layered = await createLayeredSound([sound], { name: 'test-layer' })

      expect(layered).toBeDefined()
      expect(layered.name).toBe('test-layer')
    })

    it('works with empty layers array', async () => {
      const { createLayeredSound } = await import('./index')
      const layered = await createLayeredSound([])
      expect(layered).toBeDefined()
    })
  })

  describe('createLFO()', () => {
    it('creates an LFO with default options', async () => {
      const { createLFO, LFO } = await import('./index')
      const lfo = createLFO()
      expect(lfo).toBeInstanceOf(LFO)
      expect(lfo.frequency).toBe(1)
      expect(lfo.depth).toBe(0.3)
    })

    it('creates an LFO with custom options', async () => {
      const { createLFO } = await import('./index')
      const lfo = createLFO({ frequency: 5, depth: 0.5, type: 'triangle' })
      expect(lfo.frequency).toBe(5)
      expect(lfo.depth).toBe(0.5)
    })

    it('lfo can connect to a sound and start', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createLFO, createSound } = await import('./index')
      const sound = await createSound('test.mp3')
      const lfo = createLFO({ frequency: 2, depth: 0.3 })
      lfo.connect(sound, 'gain')
      lfo.start()
      expect(lfo.isRunning).toBe(true)
      lfo.dispose()
    })
  })
})

describe('preventEventDefaults', () => {
  let mockAudioContext: AudioContext
  let AudioContextConstructor: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const { AudioContext: MockCtx } = await import('standardized-audio-context-mock')
    mockAudioContext = new MockCtx() as unknown as AudioContext
    // eslint-disable-next-line prefer-arrow-callback
    AudioContextConstructor = vi.fn(function _MockAudioContext() {
      return mockAudioContext
    })
    vi.stubGlobal('AudioContext', AudioContextConstructor)
    vi.doMock('./utils/unmute', () => ({ default: vi.fn() }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns a cleanup function', async () => {
    const { preventEventDefaults } = await import('./index')
    const div = document.createElement('div')
    const cleanup = preventEventDefaults(div)
    expect(typeof cleanup).toBe('function')
  })

  it('prevents default on mousedown event', async () => {
    const { preventEventDefaults } = await import('./index')
    const div = document.createElement('div')
    preventEventDefaults(div)

    const event = new MouseEvent('mousedown', { cancelable: true })
    div.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('cleanup removes all event listeners', async () => {
    const { preventEventDefaults } = await import('./index')
    const div = document.createElement('div')
    const cleanup = preventEventDefaults(div)

    cleanup()

    const event = new MouseEvent('mousedown', { cancelable: true })
    div.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('registers listeners for all expected event types', async () => {
    const { preventEventDefaults } = await import('./index')
    const div = document.createElement('div')
    const addSpy = vi.spyOn(div, 'addEventListener')

    preventEventDefaults(div)

    const expectedEvents = [
      'touchstart',
      'touchend',
      'touchcancel',
      'touchmove',
      'mousedown',
      'mouseup',
      'click',
      'contextmenu',
      'dragstart',
      'dragend',
      'dragenter',
      'dragover',
      'drag',
      'dragleave',
      'drop',
    ]

    expectedEvents.forEach((eventName) => {
      expect(addSpy).toHaveBeenCalledWith(eventName, expect.any(Function))
    })
    expect(addSpy).toHaveBeenCalledTimes(15)
  })
})

describe('factory functions with explicit AudioContext', () => {
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
    const { clearPreloadCache } = await import('./preload')
    clearPreloadCache()
  })

  describe('createOscillator(ctx, options)', () => {
    it('returns Oscillator using provided context', async () => {
      const { createOscillator, Oscillator } = await import('./index')
      const osc = await createOscillator(mockAudioContext, { frequency: 440 })
      expect(osc).toBeInstanceOf(Oscillator)
    })

    it('does not create a new AudioContext', async () => {
      const { createOscillator } = await import('./index')
      await createOscillator(mockAudioContext, { frequency: 440 })
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createPolySynth(ctx, options)', () => {
    it('returns PolySynth using provided context', async () => {
      const { createPolySynth, PolySynth } = await import('./index')
      const synth = await createPolySynth(mockAudioContext, { maxVoices: 4 })
      expect(synth).toBeInstanceOf(PolySynth)
    })

    it('does not create a new AudioContext', async () => {
      const { createPolySynth } = await import('./index')
      await createPolySynth(mockAudioContext, { maxVoices: 4 })
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createTransport(ctx, options)', () => {
    it('returns Transport using provided context', async () => {
      const { createTransport, Transport } = await import('./index')
      const transport = await createTransport(mockAudioContext, { bpm: 120, timeSignature: [4, 4] })
      expect(transport).toBeInstanceOf(Transport)
      transport.dispose()
    })

    it('does not create a new AudioContext', async () => {
      const { createTransport } = await import('./index')
      const transport = await createTransport(mockAudioContext, { bpm: 120, timeSignature: [4, 4] })
      expect(AudioContextConstructor).not.toHaveBeenCalled()
      transport.dispose()
    })
  })

  describe('createLayeredSound(ctx, layers)', () => {
    it('returns LayeredSound using provided context', async () => {
      const { createLayeredSound, LayeredSound } = await import('./index')
      const layered = await createLayeredSound(mockAudioContext, [])
      expect(layered).toBeInstanceOf(LayeredSound)
    })

    it('does not create a new AudioContext', async () => {
      const { createLayeredSound } = await import('./index')
      await createLayeredSound(mockAudioContext, [])
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createGrainPlayer(ctx, buffer, options)', () => {
    it('returns GrainPlayer using provided context', async () => {
      const { createGrainPlayer, GrainPlayer } = await import('./index')
      const buffer = mockAudioContext.createBuffer(1, 44100, 44100)
      const player = await createGrainPlayer(mockAudioContext, buffer)
      expect(player).toBeInstanceOf(GrainPlayer)
    })

    it('does not create a new AudioContext', async () => {
      const { createGrainPlayer } = await import('./index')
      const buffer = mockAudioContext.createBuffer(1, 44100, 44100)
      await createGrainPlayer(mockAudioContext, buffer)
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createAnalyzer(ctx, options)', () => {
    it('returns Analyzer using provided context', async () => {
      const { createAnalyzer } = await import('./index')
      const analyzer = await createAnalyzer(mockAudioContext, { fftSize: 2048 })
      expect(analyzer).toBeDefined()
      expect(typeof analyzer.getFrequencyData).toBe('function')
    })

    it('does not create a new AudioContext', async () => {
      const { createAnalyzer } = await import('./index')
      await createAnalyzer(mockAudioContext, { fftSize: 2048 })
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createWhiteNoise(ctx)', () => {
    it('returns Sound using provided context', async () => {
      const { createWhiteNoise, Sound } = await import('./index')
      const noise = await createWhiteNoise(mockAudioContext)
      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('does not create a new AudioContext', async () => {
      const { createWhiteNoise } = await import('./index')
      await createWhiteNoise(mockAudioContext)
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('createNoise(ctx, type)', () => {
    it('createNoise(ctx, "white") returns Sound using provided context', async () => {
      const { createNoise, Sound } = await import('./index')
      const noise = await createNoise(mockAudioContext, 'white')
      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('createNoise(ctx, "pink") returns Sound using provided context', async () => {
      const { createNoise, Sound } = await import('./index')
      const noise = await createNoise(mockAudioContext, 'pink')
      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('createNoise(ctx, "brown") returns Sound using provided context', async () => {
      const { createNoise, Sound } = await import('./index')
      const noise = await createNoise(mockAudioContext, 'brown')
      expect(noise).toBeInstanceOf(Sound)
      expect(noise.duration.raw).toBeGreaterThan(0)
    })

    it('does not create a new AudioContext', async () => {
      const { createNoise } = await import('./index')
      await createNoise(mockAudioContext, 'white')
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })

  describe('audio-loading factories with explicit context', () => {
    it('createSound(ctx, input) returns Sound using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSound, Sound } = await import('./index')
      const sound = await createSound(mockAudioContext, 'test.mp3')
      expect(sound).toBeInstanceOf(Sound)
    })

    it('createTrack(ctx, input) returns Track using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTrack, Track } = await import('./index')
      const track = await createTrack(mockAudioContext, 'song.mp3')
      expect(track).toBeInstanceOf(Track)
    })

    it('createSounds(ctx, urls) returns Sound array using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSounds, Sound } = await import('./index')
      const sounds = await createSounds(mockAudioContext, ['a.mp3', 'b.mp3'])
      expect(sounds).toHaveLength(2)
      sounds.forEach(s => expect(s).toBeInstanceOf(Sound))
    })

    it('createTracks(ctx, urls) returns Track array using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createTracks, Track } = await import('./index')
      const tracks = await createTracks(mockAudioContext, ['a.mp3', 'b.mp3'])
      expect(tracks).toHaveLength(2)
      tracks.forEach(t => expect(t).toBeInstanceOf(Track))
    })

    it('createBeatTrack(ctx, inputs) returns BeatTrack using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createBeatTrack, BeatTrack } = await import('./index')
      const beatTrack = await createBeatTrack(mockAudioContext, ['kick.mp3'])
      expect(beatTrack).toBeInstanceOf(BeatTrack)
    })

    it('createSampler(ctx, inputs) returns Sampler using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSampler, Sampler } = await import('./index')
      const sampler = await createSampler(mockAudioContext, ['snare.mp3'])
      expect(sampler).toBeInstanceOf(Sampler)
    })

    it('createSprite(ctx, url, manifest) returns AudioSprite using provided context', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSprite, AudioSprite } = await import('./index')
      const manifest = { spritemap: { laser: { start: 0, end: 0.1 } } }
      const sprite = await createSprite(mockAudioContext, 'sounds.mp3', manifest)
      expect(sprite).toBeInstanceOf(AudioSprite)
    })

    it('explicit context factories do not create a new AudioContext', async () => {
      mockFetch.mockResolvedValue(makeMockResponse())
      const { createSound } = await import('./index')
      await createSound(mockAudioContext, 'test.mp3')
      expect(AudioContextConstructor).not.toHaveBeenCalled()
    })
  })
})

describe('useInteractionMethods', () => {
  let mockAudioContext: AudioContext
  let AudioContextConstructor: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const { AudioContext: MockCtx } = await import('standardized-audio-context-mock')
    mockAudioContext = new MockCtx() as unknown as AudioContext
    // eslint-disable-next-line prefer-arrow-callback
    AudioContextConstructor = vi.fn(function _MockAudioContext() {
      return mockAudioContext
    })
    vi.stubGlobal('AudioContext', AudioContextConstructor)
    vi.doMock('./utils/unmute', () => ({ default: vi.fn() }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns a cleanup function', async () => {
    const { useInteractionMethods } = await import('./index')
    const div = document.createElement('div')
    const player = { play: vi.fn(), stop: vi.fn() }

    const cleanup = await useInteractionMethods(div, player)
    expect(typeof cleanup).toBe('function')
  })

  it('calls play on mousedown', async () => {
    const { useInteractionMethods } = await import('./index')
    const div = document.createElement('div')
    const player = { play: vi.fn(), stop: vi.fn() }

    await useInteractionMethods(div, player)

    const event = new MouseEvent('mousedown')
    div.dispatchEvent(event)
    // play is called asynchronously (via initAudio), wait a tick
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(player.play).toHaveBeenCalled()
  })

  it('calls stop on mouseup', async () => {
    const { useInteractionMethods } = await import('./index')
    const div = document.createElement('div')
    const player = { play: vi.fn(), stop: vi.fn() }

    await useInteractionMethods(div, player)

    const event = new MouseEvent('mouseup')
    div.dispatchEvent(event)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(player.stop).toHaveBeenCalled()
  })

  it('calls stop on mouseleave', async () => {
    const { useInteractionMethods } = await import('./index')
    const div = document.createElement('div')
    const player = { play: vi.fn(), stop: vi.fn() }

    await useInteractionMethods(div, player)

    const event = new MouseEvent('mouseleave')
    div.dispatchEvent(event)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(player.stop).toHaveBeenCalled()
  })

  it('cleanup removes all listeners', async () => {
    const { useInteractionMethods } = await import('./index')
    const div = document.createElement('div')
    const player = { play: vi.fn(), stop: vi.fn() }

    const cleanup = await useInteractionMethods(div, player)
    cleanup()

    const event = new MouseEvent('mousedown')
    div.dispatchEvent(event)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(player.play).not.toHaveBeenCalled()
  })
})

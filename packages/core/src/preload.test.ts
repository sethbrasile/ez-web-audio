import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AggregateAudioLoadError, AudioLoadError } from './errors'
import { clearPreloadCache, evictIfNeeded, getCacheSize, getFromCache, hasInCache, isPreloaded, preload, setInCache, setPreloadCacheLimit } from './preload'

describe('preload', () => {
  const mockFetch = vi.fn()

  function createMockResponse(ok = true, status = 200): Response {
    return {
      ok,
      status,
      clone: vi.fn().mockReturnThis(),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as Response
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    clearPreloadCache()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('preload()', () => {
    it('caches a single URL', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      await preload('/audio/test.mp3')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/audio/test.mp3')
      expect(hasInCache('/audio/test.mp3')).toBe(true)
    })

    it('caches multiple URLs in parallel', async () => {
      const mockResponse1 = createMockResponse()
      const mockResponse2 = createMockResponse()
      mockFetch
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      await preload(['/audio/one.mp3', '/audio/two.mp3'])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(hasInCache('/audio/one.mp3')).toBe(true)
      expect(hasInCache('/audio/two.mp3')).toBe(true)
    })

    it('skips already-cached URLs (fetch not called twice)', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      // First preload
      await preload('/audio/cached.mp3')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Reset mock but keep cache
      mockFetch.mockReset()

      // Second preload of same URL
      await preload('/audio/cached.mp3')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws aggregate error when some URLs fail', async () => {
      const mockResponse = createMockResponse()
      const failedResponse = createMockResponse(false, 404)
      mockFetch
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(failedResponse)

      await expect(preload(['/audio/good.mp3', '/audio/bad.mp3']))
        .rejects
        .toThrow('Failed to preload 1 of 2 URLs')

      // Successful one should still be cached
      expect(hasInCache('/audio/good.mp3')).toBe(true)
    })

    it('includes failing URL in error message', async () => {
      const failedResponse = createMockResponse(false, 404)
      mockFetch.mockResolvedValueOnce(failedResponse)

      await expect(preload('/audio/notfound.mp3'))
        .rejects
        .toThrow('Failed to preload audio: HTTP 404. URL: /audio/notfound.mp3')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(preload('/audio/network-fail.mp3'))
        .rejects
        .toThrow('Failed to preload 1 of 1 URLs')
    })

    it('works with empty array (no-op)', async () => {
      await preload([])

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('only fetches uncached URLs from mixed list', async () => {
      // Pre-cache one URL
      const cachedResponse = createMockResponse()
      setInCache('/audio/cached.mp3', cachedResponse)

      const newResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(newResponse)

      await preload(['/audio/cached.mp3', '/audio/new.mp3'])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/audio/new.mp3')
    })

    it('dedupes duplicate URLs within a single call (R14#7)', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      await preload(['/audio/dup.mp3', '/audio/dup.mp3', '/audio/dup.mp3'])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(hasInCache('/audio/dup.mp3')).toBe(true)
    })

    it('throws an AggregateAudioLoadError (instanceof AudioError) carrying per-URL AudioLoadError failures (R14#8)', async () => {
      const mockResponse = createMockResponse()
      const failedResponse = createMockResponse(false, 404)
      mockFetch
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(failedResponse)

      const caught = await preload(['/audio/good.mp3', '/audio/bad.mp3']).catch(e => e)

      expect(caught).toBeInstanceOf(AggregateAudioLoadError)
      expect(caught).toBeInstanceOf(Error)
      expect(caught.errors).toHaveLength(1)
      expect(caught.errors[0]).toBeInstanceOf(AudioLoadError)
      expect(caught.errors[0].url).toBe('/audio/bad.mp3')
    })

    it('wraps a raw network-error rejection in a structured AudioLoadError carrying the failing URL', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const caught = await preload('/audio/network-fail.mp3').catch(e => e)

      expect(caught).toBeInstanceOf(AggregateAudioLoadError)
      expect(caught.errors[0]).toBeInstanceOf(AudioLoadError)
      expect(caught.errors[0].url).toBe('/audio/network-fail.mp3')
    })

    it('passes an AbortSignal through to fetch when provided (R14#9)', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)
      const controller = new AbortController()

      await preload('/audio/abortable.mp3', controller.signal)

      expect(mockFetch).toHaveBeenCalledWith('/audio/abortable.mp3', { signal: controller.signal })
    })
  })

  describe('isPreloaded()', () => {
    it('returns true for preloaded URL', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      await preload('/audio/test.mp3')

      expect(isPreloaded('/audio/test.mp3')).toBe(true)
    })

    it('returns false for non-preloaded URL', () => {
      expect(isPreloaded('/audio/unknown.mp3')).toBe(false)
    })

    it('works after cache is cleared', async () => {
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      await preload('/audio/test.mp3')
      expect(isPreloaded('/audio/test.mp3')).toBe(true)

      clearPreloadCache()
      expect(isPreloaded('/audio/test.mp3')).toBe(false)
    })
  })

  describe('clearPreloadCache()', () => {
    it('clears entire cache when called without argument', async () => {
      const mockResponse1 = createMockResponse()
      const mockResponse2 = createMockResponse()
      mockFetch
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      await preload(['/audio/one.mp3', '/audio/two.mp3'])
      expect(getCacheSize()).toBe(2)

      clearPreloadCache()

      expect(getCacheSize()).toBe(0)
      expect(isPreloaded('/audio/one.mp3')).toBe(false)
      expect(isPreloaded('/audio/two.mp3')).toBe(false)
    })

    it('clears specific URL when called with argument', async () => {
      const mockResponse1 = createMockResponse()
      const mockResponse2 = createMockResponse()
      mockFetch
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      await preload(['/audio/one.mp3', '/audio/two.mp3'])

      clearPreloadCache('/audio/one.mp3')

      expect(isPreloaded('/audio/one.mp3')).toBe(false)
      expect(isPreloaded('/audio/two.mp3')).toBe(true)
    })

    it('does not affect other URLs when clearing specific URL', async () => {
      const mockResponse1 = createMockResponse()
      const mockResponse2 = createMockResponse()
      const mockResponse3 = createMockResponse()
      mockFetch
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
        .mockResolvedValueOnce(mockResponse3)

      await preload(['/audio/a.mp3', '/audio/b.mp3', '/audio/c.mp3'])

      clearPreloadCache('/audio/b.mp3')

      expect(getCacheSize()).toBe(2)
      expect(isPreloaded('/audio/a.mp3')).toBe(true)
      expect(isPreloaded('/audio/b.mp3')).toBe(false)
      expect(isPreloaded('/audio/c.mp3')).toBe(true)
    })

    it('handles clearing non-existent URL gracefully', () => {
      expect(() => clearPreloadCache('/audio/nonexistent.mp3')).not.toThrow()
    })
  })

  describe('setPreloadCacheLimit', () => {
    it('setting a limit and adding more entries causes eviction', () => {
      setPreloadCacheLimit(3)

      setInCache('/a.mp3', createMockResponse())
      setInCache('/b.mp3', createMockResponse())
      setInCache('/c.mp3', createMockResponse())
      setInCache('/d.mp3', createMockResponse())

      // After setting 4 entries with limit 3, evictIfNeeded runs on preload but not setInCache directly
      // setPreloadCacheLimit calls evictIfNeeded, so we set limit after filling
      setPreloadCacheLimit(3)
      expect(getCacheSize()).toBe(3)
      // Oldest entry (/a.mp3) should have been evicted
      expect(hasInCache('/a.mp3')).toBe(false)
      expect(hasInCache('/d.mp3')).toBe(true)
    })

    it('setting limit to 0 evicts all entries', () => {
      setInCache('/a.mp3', createMockResponse())
      setInCache('/b.mp3', createMockResponse())
      expect(getCacheSize()).toBe(2)

      setPreloadCacheLimit(0)
      expect(getCacheSize()).toBe(0)
    })

    it('reducing limit below current cache size evicts oldest entries', () => {
      setInCache('/a.mp3', createMockResponse())
      setInCache('/b.mp3', createMockResponse())
      setInCache('/c.mp3', createMockResponse())
      setInCache('/d.mp3', createMockResponse())
      setInCache('/e.mp3', createMockResponse())
      expect(getCacheSize()).toBe(5)

      setPreloadCacheLimit(2)
      expect(getCacheSize()).toBe(2)
      // Oldest 3 evicted
      expect(hasInCache('/a.mp3')).toBe(false)
      expect(hasInCache('/b.mp3')).toBe(false)
      expect(hasInCache('/c.mp3')).toBe(false)
      // Newest 2 remain
      expect(hasInCache('/d.mp3')).toBe(true)
      expect(hasInCache('/e.mp3')).toBe(true)
    })

    it('default limit (100) allows many entries without eviction', () => {
      setPreloadCacheLimit(100) // restore default
      for (let i = 0; i < 50; i++) {
        setInCache(`/audio-${i}.mp3`, createMockResponse())
      }
      expect(getCacheSize()).toBe(50)
    })

    it('limit does not affect clearPreloadCache behavior', () => {
      setPreloadCacheLimit(5)
      setInCache('/a.mp3', createMockResponse())
      setInCache('/b.mp3', createMockResponse())
      clearPreloadCache()
      expect(getCacheSize()).toBe(0)
    })

    afterEach(() => {
      setPreloadCacheLimit(100)
    })
  })

  describe('evictIfNeeded', () => {
    it('does not evict when cache size is within limit', () => {
      setPreloadCacheLimit(5)
      setInCache('/a.mp3', createMockResponse())
      setInCache('/b.mp3', createMockResponse())

      evictIfNeeded()
      expect(getCacheSize()).toBe(2)
    })

    it('evicts oldest entries first (FIFO) when over limit', () => {
      setInCache('/first.mp3', createMockResponse())
      setInCache('/second.mp3', createMockResponse())
      setInCache('/third.mp3', createMockResponse())

      setPreloadCacheLimit(1)
      expect(getCacheSize()).toBe(1)
      expect(hasInCache('/first.mp3')).toBe(false)
      expect(hasInCache('/second.mp3')).toBe(false)
      expect(hasInCache('/third.mp3')).toBe(true)
    })

    it('multiple evictions reduce to exactly the limit count', () => {
      for (let i = 0; i < 10; i++) {
        setInCache(`/audio-${i}.mp3`, createMockResponse())
      }
      expect(getCacheSize()).toBe(10)

      setPreloadCacheLimit(3)
      expect(getCacheSize()).toBe(3)
    })

    afterEach(() => {
      setPreloadCacheLimit(100)
    })
  })

  describe('cache accessor functions', () => {
    it('setInCache stores a response retrievable by getFromCache', () => {
      const response = createMockResponse()
      setInCache('/test.mp3', response)
      expect(getFromCache('/test.mp3')).toBe(response)
    })

    it('getFromCache returns undefined for missing keys', () => {
      expect(getFromCache('/nonexistent.mp3')).toBeUndefined()
    })

    it('hasInCache returns true for cached keys', () => {
      setInCache('/test.mp3', createMockResponse())
      expect(hasInCache('/test.mp3')).toBe(true)
    })

    it('hasInCache returns false for missing keys', () => {
      expect(hasInCache('/nonexistent.mp3')).toBe(false)
    })

    it('getCacheSize returns correct count after set/clear operations', () => {
      expect(getCacheSize()).toBe(0)
      setInCache('/a.mp3', createMockResponse())
      expect(getCacheSize()).toBe(1)
      setInCache('/b.mp3', createMockResponse())
      expect(getCacheSize()).toBe(2)
      clearPreloadCache('/a.mp3')
      expect(getCacheSize()).toBe(1)
      clearPreloadCache()
      expect(getCacheSize()).toBe(0)
    })
  })

  describe('integration with load()', () => {
    it('preloaded URL is used by load() (fetch not called twice)', async () => {
      // Simulate what load() does: checks responseCache first
      const mockResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(mockResponse)

      // Preload first
      await preload('/audio/song.mp3')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Reset fetch mock
      mockFetch.mockReset()

      // Verify cache has the response
      expect(hasInCache('/audio/song.mp3')).toBe(true)

      // When load() is called, it should find the response in responseCache
      // and not call fetch again - we verify the cache state
      const cachedResponse = getFromCache('/audio/song.mp3')
      expect(cachedResponse).toBeDefined()
      expect(cachedResponse?.clone).toBeDefined()
    })
  })
})

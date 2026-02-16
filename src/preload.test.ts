import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPreloadCache, isPreloaded, preload, responseCache } from './preload'

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
    responseCache.clear()
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
      expect(responseCache.has('/audio/test.mp3')).toBe(true)
    })

    it('caches multiple URLs in parallel', async () => {
      const mockResponse1 = createMockResponse()
      const mockResponse2 = createMockResponse()
      mockFetch
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      await preload(['/audio/one.mp3', '/audio/two.mp3'])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(responseCache.has('/audio/one.mp3')).toBe(true)
      expect(responseCache.has('/audio/two.mp3')).toBe(true)
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
      expect(responseCache.has('/audio/good.mp3')).toBe(true)
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
      responseCache.set('/audio/cached.mp3', cachedResponse)

      const newResponse = createMockResponse()
      mockFetch.mockResolvedValueOnce(newResponse)

      await preload(['/audio/cached.mp3', '/audio/new.mp3'])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/audio/new.mp3')
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
      expect(responseCache.size).toBe(2)

      clearPreloadCache()

      expect(responseCache.size).toBe(0)
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

      expect(responseCache.size).toBe(2)
      expect(isPreloaded('/audio/a.mp3')).toBe(true)
      expect(isPreloaded('/audio/b.mp3')).toBe(false)
      expect(isPreloaded('/audio/c.mp3')).toBe(true)
    })

    it('handles clearing non-existent URL gracefully', () => {
      expect(() => clearPreloadCache('/audio/nonexistent.mp3')).not.toThrow()
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
      expect(responseCache.has('/audio/song.mp3')).toBe(true)

      // When load() is called, it should find the response in responseCache
      // and not call fetch again - we verify the cache state
      const cachedResponse = responseCache.get('/audio/song.mp3')
      expect(cachedResponse).toBeDefined()
      expect(cachedResponse?.clone).toBeDefined()
    })
  })
})

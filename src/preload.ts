/**
 * Preload cache for audio URLs.
 * Shared with src/index.ts load() function for automatic cache hits.
 */
export const responseCache = new Map<string, Response>()

/**
 * Preload audio URLs into cache for faster Sound/Track creation.
 * @param urls - Single URL or array of URLs to preload
 * @returns Promise that resolves when all URLs are cached
 * @throws Error if any URL fails to load (after attempting all)
 */
export async function preload(urls: string | string[]): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls]

  // Filter out already-cached URLs
  const uncachedUrls = urlArray.filter(url => !responseCache.has(url))

  if (uncachedUrls.length === 0) {
    return
  }

  // Fetch all uncached URLs in parallel
  const results = await Promise.allSettled(
    uncachedUrls.map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${url}`)
      }
      return { url, response }
    }),
  )

  // Collect errors and successes
  const errors: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      responseCache.set(result.value.url, result.value.response)
    }
    else {
      errors.push(result.reason.message)
    }
  }

  // Throw aggregate error if any failed
  if (errors.length > 0) {
    throw new Error(
      `Failed to preload ${errors.length} of ${urlArray.length} URLs: ${errors.join('; ')}`,
    )
  }
}

/**
 * Check if a URL is already preloaded.
 * @param url - URL to check
 * @returns true if URL is in cache
 */
export function isPreloaded(url: string): boolean {
  return responseCache.has(url)
}

/**
 * Clear preload cache.
 * @param url - Optional specific URL to clear. If omitted, clears entire cache.
 */
export function clearPreloadCache(url?: string): void {
  if (url !== undefined) {
    responseCache.delete(url)
  }
  else {
    responseCache.clear()
  }
}

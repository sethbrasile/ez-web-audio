import { AudioLoadError } from './errors'

/**
 * Maximum number of cached responses. Oldest entries are evicted when exceeded.
 * Can be changed via `setPreloadCacheLimit()`.
 */
let _cacheLimit = 100

/**
 * Preload cache for audio URLs.
 * Shared with src/index.ts load() function for automatic cache hits.
 * Bounded to `_cacheLimit` entries with FIFO eviction.
 */
const responseCache = new Map<string, Response>()

/** Get a cached response by URL. Returns undefined if not cached. */
export function getFromCache(url: string): Response | undefined {
  return responseCache.get(url)
}

/** Store a response in cache for the given URL. */
export function setInCache(url: string, response: Response): void {
  responseCache.set(url, response)
}

/** Check if a URL is in the response cache. */
export function hasInCache(url: string): boolean {
  return responseCache.has(url)
}

/** Get the number of entries in the response cache. */
export function getCacheSize(): number {
  return responseCache.size
}

export function evictIfNeeded(): void {
  while (responseCache.size > _cacheLimit) {
    const oldest = responseCache.keys().next().value
    if (oldest !== undefined)
      responseCache.delete(oldest)
  }
}

/**
 * Set the maximum number of cached preload responses.
 * Oldest entries are evicted when the limit is exceeded.
 * @param limit - Maximum number of entries (default: 100)
 */
export function setPreloadCacheLimit(limit: number): void {
  _cacheLimit = limit
  evictIfNeeded()
}

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
        throw new AudioLoadError(`Failed to preload audio: HTTP ${response.status}. URL: ${url}`, url)
      }
      return { url, response }
    }),
  )

  // Collect errors and successes
  const errors: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      // Store a clone so the cached response body is always unconsumed.
      // Response.body can only be read once; cloning preserves re-readability.
      responseCache.set(result.value.url, result.value.response.clone())
    }
    else {
      errors.push(result.reason.message)
    }
  }

  evictIfNeeded()

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

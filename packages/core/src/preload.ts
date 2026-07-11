import { AggregateAudioLoadError, AudioLoadError } from './errors'

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
 * @param signal - Optional AbortSignal to cancel in-flight fetches
 * @returns Promise that resolves when all URLs are cached
 * @throws {AggregateAudioLoadError} If any URL fails to load (after attempting all).
 *   `instanceof AudioError` still matches; `.errors` carries the per-URL
 *   {@link AudioLoadError} failures for callers that need to know which
 *   URLs failed and why.
 */
export async function preload(urls: string | string[], signal?: AbortSignal): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls]

  // Dedup URLs within this call — without this, passing the same URL twice
  // (e.g. from two independently-built lists) fires two parallel fetches for
  // it, and whichever settles last silently wins the cache entry.
  const dedupedUrls = [...new Set(urlArray)]

  // Filter out already-cached URLs
  const uncachedUrls = dedupedUrls.filter(url => !responseCache.has(url))

  if (uncachedUrls.length === 0) {
    return
  }

  // Fetch all uncached URLs in parallel
  const results = await Promise.allSettled(
    uncachedUrls.map(async (url) => {
      try {
        const response = signal ? await fetch(url, { signal }) : await fetch(url)
        if (!response.ok) {
          throw new AudioLoadError(`Failed to preload audio: HTTP ${response.status}. URL: ${url}`, url)
        }
        return { url, response }
      }
      catch (err) {
        if (err instanceof AudioLoadError)
          throw err
        const message = err instanceof Error ? err.message : String(err)
        throw new AudioLoadError(`Failed to preload audio: ${message}. URL: ${url}`, url)
      }
    }),
  )

  // Collect errors and successes
  const errors: AudioLoadError[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      // Store a clone so the cached response body is always unconsumed.
      // Response.body can only be read once; cloning preserves re-readability.
      responseCache.set(result.value.url, result.value.response.clone())
    }
    else {
      errors.push(result.reason as AudioLoadError)
    }
  }

  evictIfNeeded()

  // Throw a structured aggregate error if any failed — preserves the
  // individual per-URL AudioLoadError instances (previously discarded in
  // favor of a plain Error with a flattened message string).
  if (errors.length > 0) {
    throw new AggregateAudioLoadError(
      `Failed to preload ${errors.length} of ${uncachedUrls.length} URLs: ${errors.map(e => e.message).join('; ')}`,
      errors,
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

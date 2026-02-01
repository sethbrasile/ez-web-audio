---
phase: 03-02
subsystem: preload
tags: [cache, performance, loading, fetch]
dependency-graph:
  requires: [02-04]
  provides: [preload-api, response-cache]
  affects: [future-loading-optimizations]
tech-stack:
  added: []
  patterns: [shared-cache, promise-allsettled]
key-files:
  created:
    - src/preload.ts
    - src/preload.test.ts
  modified:
    - src/index.ts
decisions:
  - id: preload-shared-cache
    choice: Export responseCache from preload.ts, import in index.ts
    reason: Single source of truth for cached responses, seamless integration with load()
  - id: promise-allsettled
    choice: Use Promise.allSettled for parallel fetching
    reason: Allows partial success - some URLs can succeed even if others fail
  - id: aggregate-errors
    choice: Collect all errors and throw single aggregate error
    reason: User sees all failures at once, successful preloads are still cached
metrics:
  duration: 7 minutes
  completed: 2026-01-31
---

# Phase 3 Plan 02: Preload API Summary

**Preload cache for audio URLs with automatic integration into createSound/createTrack**

## What Was Built

Added preload API functions that allow users to warm the response cache before creating Sound or Track instances, improving perceived load times for audio-heavy applications.

### Key Deliverables

| Artifact | Purpose | Lines |
|----------|---------|-------|
| `src/preload.ts` | Preload cache API functions | 74 |
| `src/preload.test.ts` | Comprehensive test coverage | 227 |
| `src/index.ts` | Integration and exports | +13 |

### API Surface

```typescript
// Preload single or multiple URLs
await preload('/audio/sound.mp3')
await preload(['/audio/a.mp3', '/audio/b.mp3', '/audio/c.mp3'])

// Check if URL is cached
if (isPreloaded('/audio/sound.mp3')) {
  // Sound will load instantly from cache
}

// Clear cache
clearPreloadCache()              // Clear all
clearPreloadCache('/audio/a.mp3') // Clear specific URL
```

### Integration with load()

The key design decision was to share a single `responseCache` Map between `preload.ts` and `index.ts`. This means:

1. `preload('/audio/song.mp3')` stores the Response in responseCache
2. `createSound('/audio/song.mp3')` checks responseCache first
3. If found, uses cached Response (no network request)
4. If not found, fetches and caches for future use

No changes required to createSound/createTrack - they automatically benefit from preloaded URLs.

## Technical Implementation

### Preload Module (`src/preload.ts`)

```typescript
export const responseCache = new Map<string, Response>()

export async function preload(urls: string | string[]): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls]
  const uncachedUrls = urlArray.filter(url => !responseCache.has(url))

  // Parallel fetch with partial failure handling
  const results = await Promise.allSettled(
    uncachedUrls.map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`)
      return { url, response }
    })
  )

  // Cache successes, aggregate failures
  const errors: string[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      responseCache.set(result.value.url, result.value.response)
    } else {
      errors.push(result.reason.message)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Failed to preload ${errors.length} of ${urlArray.length} URLs: ${errors.join('; ')}`)
  }
}
```

### Key Design Decisions

1. **Shared responseCache**: Single Map exported from preload.ts, imported by index.ts. This ensures preloaded URLs are automatically available to load().

2. **Promise.allSettled**: Parallel fetching with partial success. If user preloads 10 URLs and 2 fail, the 8 successful ones are still cached.

3. **Aggregate errors**: Instead of failing fast on first error, we attempt all URLs and report all failures. Error message includes count and details.

4. **Skip already-cached**: preload() checks responseCache before fetching, avoiding redundant network requests.

## Test Coverage

16 test cases covering:
- Single and multiple URL preloading
- Cache hit behavior (no duplicate fetches)
- HTTP error handling (404, 500, etc.)
- Network error handling
- Empty array handling
- isPreloaded() accuracy
- clearPreloadCache() for full and partial clearing
- Integration verification with responseCache

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 463e5df | feat | Create preload module with cache management |
| f116b5e | feat | Integrate preload cache with load() function |
| 964298d | test | Add comprehensive tests for preload API |

Note: Commit f116b5e also includes collection utilities export from plan 03-01 (linter merged concurrent changes).

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Satisfied

- [x] PRE-01: User can preload a sound URL before creating a Sound instance
- [x] PRE-02: User can preload multiple URLs in parallel
- [x] PRE-03: Preloaded audio is cached and reused by createSound/createTrack
- [x] PRE-04: User can check if a URL is preloaded via isPreloaded()
- [x] PRE-05: User can clear preload cache entirely or for specific URLs

## Next Phase Readiness

Ready for:
- Plan 03-03 (if exists): Additional utility features
- Phase 4: LayeredSound implementation

No blockers or concerns.

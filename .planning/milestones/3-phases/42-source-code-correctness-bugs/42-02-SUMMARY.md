---
phase: 42-source-code-correctness-bugs
plan: 02
subsystem: audio
tags: [preload, cache, ios, init, encapsulation]

requires:
  - phase: none
    provides: n/a
provides:
  - Correct iOS init ordering in load()
  - Bounded cache with eviction after every write
  - Encapsulated responseCache behind access functions
affects: []

tech-stack:
  added: []
  patterns: [module-private cache with exported access functions]

key-files:
  created: []
  modified:
    - src/index.ts
    - src/preload.ts
    - src/preload.test.ts

key-decisions:
  - "Added getCacheSize() export for test assertions rather than restructuring size-based tests"
  - "Kept internal responseCache usage within preload.ts unchanged (same module access is fine)"

patterns-established:
  - "Cache encapsulation: module-private Map with exported get/set/has functions"
  - "evictIfNeeded() called after every cache write to bound memory usage"

requirements-completed: [BUG-03, BUG-04, BUG-05]

duration: 5min
completed: 2026-02-24
---

# Plan 42-02: Fix iOS Init Ordering, Cache Eviction, Cache Encapsulation

**load() calls initAudio() before AudioContext usage; cache bounded with eviction; responseCache encapsulated behind access functions**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed load() to call initAudio() before getOrCreateAudioContext(), ensuring iOS cache-hit path works (silent first play fix)
- Added evictIfNeeded() calls after every responseCache.set() in load() and createSprite()
- Made responseCache module-private with getFromCache/setInCache/hasInCache/getCacheSize exports
- Updated all preload tests to use the new access functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix init ordering and add cache eviction** + **Task 2: Encapsulate cache** - `292bf69` (fix)
2. **Test updates for encapsulated cache API** - `76823e1` (test)

## Files Created/Modified
- `src/index.ts` - Moved initAudio() before getOrCreateAudioContext() in load(), replaced responseCache direct access with access functions, added evictIfNeeded() calls
- `src/preload.ts` - Removed export from responseCache, added getFromCache/setInCache/hasInCache/getCacheSize/evictIfNeeded exports
- `src/preload.test.ts` - Updated all test imports and assertions to use new access functions

## Decisions Made
- Added getCacheSize() export for test assertions (cleaner than restructuring all size-based tests)

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three cache/init bugs fixed and tested
- 1119 tests pass, typecheck clean

---
*Phase: 42-source-code-correctness-bugs*
*Completed: 2026-02-24*

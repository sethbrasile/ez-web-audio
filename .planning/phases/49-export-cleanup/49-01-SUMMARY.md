---
phase: 49-export-cleanup
plan: 01
subsystem: api
tags: [typescript, errors, public-api, AudioLoadError, InvalidNoteError]

# Dependency graph
requires:
  - phase: 48-safety-correctness
    provides: Typed error classes (AudioLoadError, InvalidNoteError) already defined in src/errors/
provides:
  - _disposeUnmute removed from public export surface (internal helper stays private)
  - createFont failure paths throw AudioLoadError (not plain Error)
  - Oscillator invalid note throws InvalidNoteError with identifier property
affects: [consumers catching errors by type, docs generation, public API surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Domain-specific error classes (AudioLoadError, InvalidNoteError) used for all typed throws"
    - "Internal helpers prefixed with lowercase disposeUnmute, called by initAudio — not exported"

key-files:
  created: []
  modified:
    - src/index.ts
    - src/index.test.ts
    - src/oscillator.ts
    - src/oscillator.test.ts

key-decisions:
  - "Removed _disposeUnmute function entirely from exports; renamed to disposeUnmute (private), called within initAudio to reset listeners on re-init"
  - "Removed _disposeUnmute test describe block — function is private, behavior tested indirectly through initAudio"
  - "Both HTTP-error and catch-all paths in createFont now throw AudioLoadError with url field"

patterns-established:
  - "All thrown errors in public API use domain-specific error subclasses, never plain Error"

requirements-completed: [EXPORT-01, EXPORT-02]

# Metrics
duration: 8min
completed: 2026-02-27
---

# Phase 49 Plan 01: Export Cleanup Summary

**Removed _disposeUnmute from public API, replaced plain Error throws with AudioLoadError and InvalidNoteError in createFont and Oscillator**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T09:21:00Z
- **Completed:** 2026-02-27T09:29:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `_disposeUnmute` is no longer exported from `src/index.ts` — internal helper renamed to `disposeUnmute` and called within `initAudio`
- `createFont` now throws `AudioLoadError` on all failure paths (HTTP errors and catch-all), enabling typed error handling for consumers
- `Oscillator` constructor now throws `InvalidNoteError` (with `identifier` property containing the attempted note name) instead of plain `Error`
- Test suite updated: 4 `_disposeUnmute` unit tests removed (function private), oscillator test updated to assert `instanceof InvalidNoteError` and `identifier`

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove _disposeUnmute from public exports and fix createFont error type** - `2a9d908` (feat)
2. **Task 2: Replace plain Error with InvalidNoteError in Oscillator constructor** - `6143636` (feat)

## Files Created/Modified
- `src/index.ts` - Removed `export` from `_disposeUnmute`, renamed to private `disposeUnmute`, fixed createFont to throw `AudioLoadError` on all paths
- `src/index.test.ts` - Removed `_disposeUnmute` describe block (4 tests removed)
- `src/oscillator.ts` - Added `InvalidNoteError` import, changed note validation throw to `InvalidNoteError` with identifier
- `src/oscillator.test.ts` - Added `InvalidNoteError` import, updated test to assert `instanceof` and `identifier` property

## Decisions Made
- **Renamed rather than deleted `_disposeUnmute`:** The function was renamed to `disposeUnmute` (private) and called within `initAudio` to clean up listeners on re-init. Deleting it entirely would leave `_unmuteDispose` as write-only (TypeScript `noUnusedLocals` would flag it). Calling it in `initAudio` is also a correctness improvement.
- **Removed _disposeUnmute tests:** The 4 tests in the `_disposeUnmute` describe block were removed rather than rewritten. The function is a 2-line private helper; its behavior is tested indirectly through `initAudio`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript noUnusedLocals flagged private disposeUnmute function**
- **Found during:** Task 1 (after removing `export` keyword)
- **Issue:** With `export` removed and tests deleted, the function was called nowhere — TypeScript `noUnusedLocals: true` flagged it as declared but never read
- **Fix:** Renamed to `disposeUnmute` (no underscore prefix), called it at the start of the `initAudio` mute-workaround block to clean up any previous listeners before re-registering. Also resolved the downstream `_unmuteDispose` write-only flag.
- **Files modified:** src/index.ts
- **Verification:** `pnpm typecheck` passes, `pnpm test src/index.test.ts` 85/85 pass
- **Committed in:** 2a9d908 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/compilation error)
**Impact on plan:** Required to satisfy TypeScript strict mode. The fix is also a minor correctness improvement (disposeUnmute called on re-init).

## Issues Encountered
- TypeScript `noUnusedLocals` caught the private function immediately after export removal — resolved cleanly by calling it within `initAudio`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Export cleanup complete; `_disposeUnmute` no longer importable from public entry point
- All error throws use domain-specific error classes (AudioLoadError, InvalidNoteError)
- 1208 unit tests passing, typecheck clean

---
*Phase: 49-export-cleanup*
*Completed: 2026-02-27*

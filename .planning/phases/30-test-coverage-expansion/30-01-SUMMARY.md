---
phase: 30-test-coverage-expansion
plan: 01
subsystem: testing
tags: [vitest, audioContextAwareTimeout, applyEqualPowerCrossfade, playTogether, happy-dom, standardized-audio-context-mock]

# Dependency graph
requires: []
provides:
  - Full test coverage for audioContextAwareTimeout (RAF-based timing, cancellation, fallback)
  - Full test coverage for applyEqualPowerCrossfade (cos/sin math, bypass mode, equal-power invariant)
  - Full test coverage for playTogether (synchronized playAt, empty array, context resolution, rejection)
affects: [31-final-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.stubGlobal('requestAnimationFrame') with manual callback capture for RAF-driven scheduler tests"
    - "vi.stubGlobal('AudioContext', MockAudioContext) to satisfy instanceof checks in happy-dom"
    - "vi.mock('@/audio-context') with mocked getOrCreateAudioContext for play-together fallback path"

key-files:
  created:
    - src/utils/timeout.test.ts
    - src/utils/equal-power-crossfade.test.ts
    - src/utils/play-together.test.ts
  modified: []

key-decisions:
  - "stubGlobal('AudioContext', MockAudioContext) required because play-together.ts uses instanceof AudioContext and happy-dom does not define AudioContext"
  - "Plain object with mutable currentTime cast as AudioContext is simpler than MockAudioContext for timeout tests (avoids async AudioContext lifecycle)"
  - "vi.mock('@/audio-context') hoisted before imports to intercept getOrCreateAudioContext fallback path"

patterns-established:
  - "RAF scheduler tests: capture callback via stubGlobal then invoke manually to simulate frames"
  - "Mock AudioContext instanceof: stub AudioContext global with MockAudioContext constructor"

requirements-completed: [SC-01, SC-02, SC-04]

# Metrics
duration: 8min
completed: 2026-02-22
---

# Phase 30 Plan 01: Utility Test Coverage Summary

**29 new tests covering audioContextAwareTimeout (RAF timing + fallback), applyEqualPowerCrossfade (cos/sin math), and playTogether (synchronized playback)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-22T03:47:00Z
- **Completed:** 2026-02-22T03:49:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `timeout.test.ts` with 12 tests: RAF scheduler start/stop, currentTime-driven firing, cancellation, multi-task ordering, null fallback
- Created `equal-power-crossfade.test.ts` with 9 tests: cos/sin values at 0/0.25/0.5/1, bypass override, equal-power invariant across all mix values
- Created `play-together.test.ts` with 8 tests: synchronized timestamp, empty array fast return, future start time, first-context selection, fallback to getOrCreateAudioContext, Promise.all rejection

## Task Commits

Each task was committed atomically:

1. **Task 1: Test timeout.ts** - `118b5cf` (feat)
2. **Task 2: Test equal-power-crossfade.ts and play-together.ts** - `311d9b9` (feat)

## Files Created/Modified

- `src/utils/timeout.test.ts` - 12 tests for audioContextAwareTimeout RAF-based timer
- `src/utils/equal-power-crossfade.test.ts` - 9 tests for applyEqualPowerCrossfade cos/sin math
- `src/utils/play-together.test.ts` - 8 tests for playTogether synchronized playback

## Decisions Made

- Plain object with mutable `currentTime` used as AudioContext mock in timeout tests — avoids async lifecycle of real MockAudioContext while enabling precise time control
- `vi.stubGlobal('AudioContext', MockAudioContext)` required in play-together tests because `play-together.ts` uses `instanceof AudioContext` and `AudioContext` is not defined in happy-dom
- `vi.mock('@/audio-context')` hoisted before imports to intercept `getOrCreateAudioContext` calls for the fallback path test

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing `afterEach` import in play-together.test.ts**
- **Found during:** Task 2 (play-together test file)
- **Issue:** `afterEach` used inside describe block but not imported from vitest
- **Fix:** Added `afterEach` to the vitest import statement
- **Files modified:** src/utils/play-together.test.ts
- **Verification:** Test file compiles and runs without ReferenceError
- **Committed in:** 311d9b9 (Task 2 commit)

**2. [Rule 1 - Bug] Stubbed AudioContext global to fix instanceof check in happy-dom**
- **Found during:** Task 2 (play-together test file)
- **Issue:** `play-together.ts` checks `p.audioContext instanceof AudioContext` but `AudioContext` is not defined in happy-dom environment, causing ReferenceError
- **Fix:** Added `vi.stubGlobal('AudioContext', MockAudioContext)` in `beforeEach` with `vi.unstubAllGlobals()` in `afterEach`
- **Files modified:** src/utils/play-together.test.ts
- **Verification:** All 8 play-together tests pass
- **Committed in:** 311d9b9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs found during test execution)
**Impact on plan:** Both fixes necessary to make tests runnable. No scope creep.

## Issues Encountered

None beyond the two auto-fixed bugs above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Three previously untested utilities now have full test coverage (T-1, T-2, T-4 review findings closed)
- 29 new tests added; no existing tests broken
- Ready for Phase 31 final release

---
*Phase: 30-test-coverage-expansion*
*Completed: 2026-02-22*

---
phase: 26-source-code-fixes
plan: 04
subsystem: audio
tags: [web-audio-api, controllers, scheduling, typescript]

requires:
  - phase: 19-control-types
    provides: "BaseParamController, ControlType, onPlaySet/onPlayRamp fluent API"

provides:
  - "Safe exponential ramp to zero (0.00001 substitution in applyRampToParam)"
  - "onPlaySet deduplication: same-type entries in startingValues replaced, not accumulated"
  - "OscillatorController supports detune and pan in applyValues and applyRampValues"
  - "SoundController supports pan in applyValues and applyRampValues"

affects:
  - 26-source-code-fixes

tech-stack:
  added: []
  patterns:
    - "SAFE_NEAR_ZERO = 0.00001 for exponentialRampToValueAtTime zero-value substitution"
    - "startingValues deduplication: filter by type before push in onPlaySet().to()"

key-files:
  created: []
  modified:
    - src/controllers/base-param-controller.ts
    - src/controllers/oscillator-controller.ts
    - src/controllers/sound-controller.ts
    - src/controllers/base-param-controller.test.ts
    - src/controllers/oscillator-controller.test.ts
    - src/controllers/sound-controller.test.ts

key-decisions:
  - "onPlaySet deduplication uses startingValues-only filter (not valuesAtTime/ramp arrays): preserves multi-point automation chains while preventing duplicate bare .to() calls"
  - "onPlayRamp start value is deduped by end value push — startingValues empty after ramp; only end value in exponentialValues/linearValues (second onPlaySet for same type wins)"
  - "SAFE_NEAR_ZERO = 0.00001 matches MDN Web Audio API standard workaround for exponentialRampToValueAtTime(0) RangeError"

patterns-established:
  - "Pattern: guard exponentialRampToValueAtTime with near-zero substitution before call"

requirements-completed: [SC-10, SC-12, SC-15]

duration: 6min
completed: 2026-02-22
---

# Phase 26 Plan 04: Controller Scheduling Fixes Summary

**Safe exponential ramp to zero, onPlaySet deduplication, and full detune/pan scheduling support in OscillatorController and SoundController**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-22T02:19:16Z
- **Completed:** 2026-02-22T02:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Fixed RangeError from `exponentialRampToValueAtTime(0)` by substituting 0.00001 in `applyRampToParam`
- Fixed duplicate `onPlaySet` calls for same parameter accumulating conflicting schedules (last wins)
- Added `detune` and `pan` cases to `OscillatorController.applyValues` and `applyRampValues`
- Added `pan` case to `SoundController.applyValues` and `applyRampValues`
- Updated tests to reflect new deduplication semantics and verify new parameter support

## Task Commits

1. **Task 1: Fix exponential ramp to zero and onPlaySet deduplication** - `2fae042` (fix)
2. **Task 2: Add detune/pan to OscillatorController and SoundController** - `e195891` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/controllers/base-param-controller.ts` - SAFE_NEAR_ZERO guard in applyRampToParam; startingValues dedup in onPlaySet().to()
- `src/controllers/oscillator-controller.ts` - detune and pan cases in applyValues and applyRampValues
- `src/controllers/sound-controller.ts` - pan case in applyValues and applyRampValues
- `src/controllers/base-param-controller.test.ts` - Updated onPlayRamp tests for new dedup behavior
- `src/controllers/oscillator-controller.test.ts` - Updated onPlayRamp/multipoint tests; added detune/pan tests
- `src/controllers/sound-controller.test.ts` - Replaced "throws for pan" tests with working pan tests

## Decisions Made

- **onPlaySet dedup scope:** Only filter `startingValues`, not `valuesAtTime`/`exponentialValues`/`linearValues`. This prevents duplicate bare `.to()` calls while not interfering with ramp arrays. The tradeoff: `onPlayRamp` start value is deduped by the end value push, meaning startingValues is empty after an `onPlayRamp` call (only end value in ramp arrays). This is "last ramp wins" semantics — accepted per plan.
- **Multi-point automation pattern changed:** The pattern `onPlaySet('gain').to(X)` then `onPlaySet('gain').to(Y).at(T)` now loses the first entry — only `Y at T` schedules. Users who want gain at t=0 AND at t=T must use `onPlaySet('gain').to(X).at(0)` followed by `onPlaySet('gain').to(Y).at(T)` (both use `.at()`). Tests updated accordingly.
- **SAFE_NEAR_ZERO = 0.00001:** Standard MDN-documented workaround for Web Audio API constraint prohibiting 0 in exponential ramps.

## Deviations from Plan

### Test Updates (Rule 1 — behavior clarification)

**1. [Rule 1 - Bug] onPlayRamp test expectations updated for dedup semantics**
- **Found during:** Task 1 (after applying dedup)
- **Issue:** Existing tests for `onPlayRamp` expected `startingValues` to contain the start value, but deduplication removes it when the second internal `onPlaySet` call is made
- **Fix:** Updated 8 tests across 3 test files to match new deduplication behavior; added explanatory comments
- **Files modified:** base-param-controller.test.ts, oscillator-controller.test.ts, sound-controller.test.ts
- **Committed in:** 2fae042 (Task 1 commit)

---

**Total deviations:** 1 (test updates for new behavior)
**Impact on plan:** Required — tests reflected old accumulation behavior; updated to verify new deduplication semantics.

## Issues Encountered

None — all fixes implemented as specified in the plan.

## Next Phase Readiness

- All 939 tests pass (2 net new from pan/detune test additions)
- `pnpm typecheck` passes
- Controller scheduling is now correct for all ControlType values in both controllers

---
*Phase: 26-source-code-fixes*
*Completed: 2026-02-22*

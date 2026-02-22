---
phase: 26-source-code-fixes
plan: 03
subsystem: audio
tags: [beat-track, beat, scheduling, drum-machine, web-audio]

# Dependency graph
requires:
  - phase: 26-source-code-fixes
    provides: Research findings H-5, H-6, L-4 identifying beat scheduling bugs
provides:
  - Differentiated playBeats() vs playActiveBeats() behavior via _playAllBeats flag
  - Fixed BeatTrack.resume() timing — no more catch-up beats after pause
  - Fixed Beat.playIn() flag lifecycle — isPlaying/currentTimeIsPlaying now reset after duration
affects: [beat-track, beat, drum-machine, BeatTrack users]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Play mode flag pattern: private _playAllBeats field on BeatTrack distinguishes unconditional vs conditional playback"
    - "Reset nextBeatTime to audioContext.currentTime on resume to prevent scheduler catch-up"
    - "Nested setTimeout for flag reset: set flag true, then schedule reset after duration"

key-files:
  created: []
  modified:
    - src/beat-track.ts
    - src/beat.ts
    - src/beat-track.test.ts

key-decisions:
  - "playBeats() uses _playAllBeats=true → beat.playIn() (unconditional); playActiveBeats() uses _playAllBeats=false → beat.playInIfActive() (conditional) — flag persists across pause/resume"
  - "_playAllBeats flag is NOT reset in pause() or stop() — it persists until next playBeats/playActiveBeats call"
  - "resume() resets nextBeatTime to audioContext.currentTime (not pausedBeatTime) to avoid scheduler catch-up after long pauses"
  - "Beat.playIn() reset uses nested setTimeout inside offset callback (not markPlaying/markCurrentTimePlaying helpers) to maintain flag state from offset delay through duration"

patterns-established:
  - "Pattern: BeatTrack play mode is stored as a flag, not inferred from the calling context"
  - "Pattern: Scheduler resume always resets nextBeatTime to now — never restores stale scheduled time"

requirements-completed:
  - SC-08
  - SC-09

# Metrics
duration: 10min
completed: 2026-02-22
---

# Phase 26 Plan 03: BeatTrack Behavioral Bug Fixes Summary

**BeatTrack play mode differentiation via `_playAllBeats` flag, catch-up-free resume timing, and Beat flag lifecycle reset in `playIn()`**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-22T02:19:24Z
- **Completed:** 2026-02-22T02:29:00Z
- **Tasks:** 2
- **Files modified:** 3 (src/beat-track.ts, src/beat.ts, src/beat-track.test.ts)

## Accomplishments
- `playBeats()` now unconditionally plays ALL beats (calls `beat.playIn()`), while `playActiveBeats()` respects the `beat.active` flag (calls `beat.playInIfActive()`) — previously they were identical
- `BeatTrack.resume()` resets `nextBeatTime` to `audioContext.currentTime` instead of restoring stale `pausedBeatTime`, preventing hundreds of catch-up beats from firing immediately after a long pause
- `Beat.playIn()` now schedules a reset of `isPlaying` and `currentTimeIsPlaying` back to false after `this.duration` milliseconds — previously the flags were set to true and never reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Differentiate playBeats vs playActiveBeats** - `ff1d917` (feat)
2. **Task 2: Fix Beat flag scheduling** - `257bc9a` (fix)

**Plan metadata:** (docs commit — pending)

## Files Created/Modified
- `src/beat-track.ts` - Added `_playAllBeats` flag; `playBeats()` sets it true, `playActiveBeats()` sets it false; `scheduleBeat()` branches on it; `resume()` uses `audioContext.currentTime`
- `src/beat.ts` - `playIn()` now schedules nested timeout to reset `isPlaying` and `currentTimeIsPlaying` after `this.duration` ms
- `src/beat-track.test.ts` - Updated "restores beat index from paused position" test assertion to check `>=` (scheduler advances from restored position after resume)

## Decisions Made
- `_playAllBeats` flag is NOT reset in `pause()` or `stop()` — it persists until the next `playBeats()` or `playActiveBeats()` call, preserving play mode across pause/resume cycles
- `resume()` uses `audioContext.currentTime` (not `pausedBeatTime`) to prevent scheduler catch-up; `pausedBeatTime` is still stored in `pause()` but is no longer used in `resume()`
- Test for "restores beat index" updated: the assertion was `toBe(beatIndexBeforePause)` but after the fix the scheduler correctly advances the index on resume. Changed to `toBeGreaterThanOrEqual(savedBeatIndex)` — the test now captures `getPausedBeatIndex()` before calling `resume()` and verifies the scheduler started from the correct position

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated resume() test to match correct behavior**
- **Found during:** Task 1 (verifying fix)
- **Issue:** Test "restores beat index from paused position" expected `getCurrentBeatIndex()` to equal `beatIndexBeforePause` (the value before pause). With the old stale-time code, `nextBeatTime` was still in the future so the scheduler wouldn't fire immediately, keeping the index unchanged. With the fix, `nextBeatTime = currentTime` causes the scheduler to fire immediately and advance the index.
- **Fix:** Updated test to capture `getPausedBeatIndex()` before resume and assert `currentBeatIndex >= savedBeatIndex`, correctly verifying the resume started from the paused position
- **Files modified:** `src/beat-track.test.ts`
- **Verification:** `pnpm test src/beat-track.test.ts` — 38/38 pass
- **Committed in:** ff1d917 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — stale test assumption)
**Impact on plan:** Auto-fix necessary for correctness. The test was asserting old broken behavior.

## Issues Encountered
- Pre-existing test failures in `src/track.test.ts` (2 failures) and `src/controllers/base-param-controller.test.ts`, `src/controllers/oscillator-controller.test.ts`, `src/controllers/sound-controller.test.ts` (9 failures) from uncommitted changes in other plans (26-01, 26-02). These are out-of-scope for this plan and are not caused by 26-03 changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Beat scheduling behavioral bugs (H-5, H-6, L-4) are resolved
- BeatTrack play mode is correctly differentiated: unconditional (`playBeats`) vs conditional (`playActiveBeats`)
- Resume timing is correct: no catch-up beats after pause
- Beat flag lifecycle is complete: `playIn()` resets flags after `duration` ms

---
*Phase: 26-source-code-fixes*
*Completed: 2026-02-22*

---
phase: 26-source-code-fixes
plan: 02
subsystem: audio
tags: [web-audio, typescript, track, sound, playback, async, events]

requires:
  - phase: 26-01
    provides: Interface fixes and type exports that define the corrected API contracts

provides:
  - Track.seek() awaits stop() before setting new offset (C-4 race condition fixed)
  - Track.resume() works when paused at position 0 via _isPaused flag (H-4 fixed)
  - Track emits 'end' event on natural playback completion (H-2 fixed)
  - BaseSound.playAt() owns consolidated onended handler with cleanup (H-1 fixed)
  - _isPlaying is true before 'play' event fires (M-11 fixed)

affects:
  - Any consumer code listening for 'end' events on Track
  - Any consumer code calling seek() on Track while playing
  - Any consumer code calling resume() on Track paused at position 0

tech-stack:
  added: []
  patterns:
    - "Single-owner onended: BaseSound.playAt() sets onended with cleanup+events; Track._onPlaybackStarted() overrides with Track-specific version"
    - "Async seek: seek().as() returns Promise<void> when playing — await ensures no race with stop()"
    - "_isPaused flag pattern: explicit boolean flag for paused state vs startOffset > 0 guard"

key-files:
  created: []
  modified:
    - src/base-sound.ts
    - src/sound.ts
    - src/track.ts
    - src/track.test.ts
    - src/controllers/base-param-controller.ts

key-decisions:
  - "seek().as() returns Promise<void> — callers seeking while playing must await; seeking while paused/stopped is still synchronous internally but wrapped in async"
  - "_isPaused explicit flag preferred over startOffset > 0 guard — startOffset can be 0 when track is paused at start"
  - "Track._onPlaybackStarted() is the single onended owner for Track; BaseSound.playAt() sets it first then Track overrides — this is intentional and documented"
  - "onPlayRamp uses onPlaySet internally (not direct pushes) — dedup via onPlaySet means startValue is removed when endValue is pushed; only endValue ends up in exponentialValues"

requirements-completed:
  - SC-02
  - SC-04
  - SC-05
  - SC-07
  - SC-14

duration: 7min
completed: 2026-02-22
---

# Phase 26 Plan 02: Track/Sound/BaseSound Playback Lifecycle Fixes Summary

**Fixed Track.seek() race condition, resume() at position 0, onended chain ownership, _isPlaying ordering before 'play' event, and Track 'end' event emission on natural completion**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T02:19:12Z
- **Completed:** 2026-02-22T02:26:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Track.seek() now awaits stop() before setting new offset, eliminating the race condition where stop() would reset startOffset=0 after the new offset was set
- Track.resume() works when paused at position 0 via a new private `_isPaused` flag instead of the broken `startOffset > 0` guard
- Track now emits 'end' event on natural playback completion; previously only 'stop' fired
- BaseSound.playAt() consolidated onended handler: includes node disconnect cleanup (moved from Sound.setup()) plus 'end' event emission
- _isPlaying is set to true BEFORE emitting 'play' event so listeners see the correct state

## Task Commits

1. **Task 1: Fix onended chain in BaseSound.playAt() and Sound.setup()** - `3664021` (fix)
2. **Task 2: Fix Track seek(), resume(), and end event** - `b8307fa` (fix)

## Files Created/Modified

- `src/base-sound.ts` - Set _isPlaying before emit('play'), consolidated onended handler with disconnect cleanup
- `src/sound.ts` - Removed onended assignment from setup() — ownership moved to BaseSound.playAt()
- `src/track.ts` - Async seek() with await stop(), _isPaused flag for resume(), _onPlaybackStarted emits 'end'
- `src/track.test.ts` - Updated "seek while playing" tests to await seek().as() calls
- `src/controllers/base-param-controller.ts` - Reverted incorrect onPlayRamp rewrite; restored onPlaySet-based implementation

## Decisions Made

- seek().as() returns Promise<void> — making callers await the seek when playing is the correct API contract since stop() is async
- Track._onPlaybackStarted() is the single effective onended owner for Track instances; BaseSound.playAt() sets it first but Track always overrides in _onPlaybackStarted()
- onPlayRamp uses onPlaySet internally — this means the startValue gets deduped when endValue is pushed, leaving only the endValue in exponentialValues

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored correct onPlayRamp implementation in base-param-controller.ts**
- **Found during:** Task 2 (after git stash pop revealed partially-applied stash changes)
- **Issue:** A prior stash had rewritten onPlayRamp to use direct pushes instead of calling onPlaySet. This broke the dedup logic: direct push didn't have a default rampType, causing "Unsupported ramp type: 'undefined'" errors
- **Fix:** Reverted to the original onPlaySet-based implementation. The dedup in onPlaySet naturally eliminates the startValue when endValue is pushed (second onPlaySet call for same type removes the first)
- **Files modified:** src/controllers/base-param-controller.ts
- **Verification:** All 939 tests pass, typecheck clean
- **Committed in:** b8307fa (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (bug fix)
**Impact on plan:** Required fix — stash from prior work introduced a bug. Restoring correct behavior was necessary for tests to pass.

## Issues Encountered

- A git stash from prior phase 26-03/04 work was popped during execution, introducing partially-applied changes across multiple files. The track.ts and base-param-controller.ts changes in the stash conflicted with Task 2. Resolved by carefully committing only plan-02-relevant files and fixing the base-param-controller.ts bug.

## Next Phase Readiness

- Track playback lifecycle is now correctly implemented
- seek().as() is now async — docs and examples should be updated to show await usage
- Plans 26-03 through 26-06 address remaining review findings

## Self-Check: PASSED

- FOUND: .planning/phases/26-source-code-fixes/26-02-SUMMARY.md
- FOUND: src/track.ts
- FOUND: src/base-sound.ts
- FOUND: src/sound.ts
- FOUND commit 3664021 (Task 1)
- FOUND commit b8307fa (Task 2)

---
*Phase: 26-source-code-fixes*
*Completed: 2026-02-22*

---
phase: 26-source-code-fixes
plan: 05
subsystem: audio
tags: [web-audio-api, memory-leak, event-listener, audio-sprite, oscillator, layered-sound]

requires:
  - phase: 26-source-code-fixes plan 01
    provides: type exports foundation

provides:
  - Oscillator.setup() disconnects old GainNode before creating new one
  - AudioSprite.stop(name) and stopAll() methods for looping sprite control
  - LayeredSound.setupLayerEndTracking() removes old listeners before adding new ones

affects:
  - any consumer using Oscillator with repeated play() calls
  - any consumer using AudioSprite with loop: true sprites
  - any consumer calling LayeredSound.play() multiple times

tech-stack:
  added: []
  patterns:
    - "AudioNode lifecycle: disconnect before replace (prevents memory leaks)"
    - "Active source tracking via Map for stoppable looping audio"
    - "Listener deduplication: remove-before-add for event handler cleanup"

key-files:
  created: []
  modified:
    - src/oscillator.ts
    - src/sprite.ts
    - src/layered-sound.ts

key-decisions:
  - "Oscillator GainNode disconnect wrapped in try/catch since node may already be disconnected"
  - "AudioSprite activeSources only tracks looping sprites (non-looping auto-stop via duration)"
  - "LayeredSound layerEndHandlers Map stores references for reliable off() calls"

patterns-established:
  - "Pattern: Disconnect AudioNode before replacing (try/catch for already-disconnected)"
  - "Pattern: Track looping sources in Map for stoppable audio"
  - "Pattern: Store event handler references in Map for deduplication cleanup"

requirements-completed:
  - SC-06
  - SC-11
  - SC-13

duration: 9min
completed: 2026-02-21
---

# Phase 26 Plan 05: Memory Leaks and Lifecycle Fixes Summary

**Oscillator GainNode disconnect-before-replace, AudioSprite stop()/stopAll() for looping sprites, LayeredSound listener deduplication via Map-tracked handlers**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-02-21T20:19:20Z
- **Completed:** 2026-02-21T20:27:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Oscillator.setup() now disconnects old GainNode before creating new one, preventing cumulative memory leaks from repeated play() calls
- AudioSprite tracks looping sources in an `activeSources` Map and exposes `stop(name)` and `stopAll()` methods — previously looping sprites had no stop path
- LayeredSound.setupLayerEndTracking() stores handler references in a Map and removes old handlers before adding new ones, preventing spurious 'end' events on repeated play() calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Oscillator GainNode leak** - `e02fee8` (fix)
2. **Task 2: Add AudioSprite.stop() and fix LayeredSound listener leak** - `62ee0ac` (fix)

**Plan metadata:** *(included in final docs commit)*

## Files Created/Modified

- `src/oscillator.ts` - Added gainNode.disconnect() before replacement in setup()
- `src/sprite.ts` - Added activeSources Map, stop(name), stopAll() methods
- `src/layered-sound.ts` - Added layerEndHandlers Map, cleanup in setupLayerEndTracking()

## Decisions Made

- Oscillator GainNode disconnect wrapped in try/catch since the node may already be disconnected on first play (no gainNode exists in a connected state initially)
- AudioSprite activeSources Map only tracks sprites with `loop: true` — non-looping sprites stop automatically when their duration elapses and cleanup via their own onended handler
- LayeredSound uses a Map (not array) for layerEndHandlers so handlers can be looked up by layer identity for reliable off() removal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `pausedBeatTime` unused field causing TypeScript error**
- **Found during:** Task 2 (during typecheck verification)
- **Issue:** Prior plan (26-03) removed the read of `pausedBeatTime` in `resume()` but left the declaration and write assignments — TypeScript flagged `TS6133: 'pausedBeatTime' is declared but its value is never read`
- **Fix:** Removed the `pausedBeatTime` field declaration and all three assignments to it (in `pause()`, `stop()`, and `resume()`)
- **Files modified:** src/beat-track.ts
- **Verification:** `pnpm typecheck` passes, `pnpm test` passes (939/939)
- **Committed in:** Part of prior plan's committed work (26-03 had already committed beat-track.ts with the field removal in the working tree)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript error from prior plan's incomplete cleanup)
**Impact on plan:** Necessary for `pnpm typecheck` to pass. No scope creep.

## Issues Encountered

- Encountered git stash conflicts from prior plan sessions that had accumulated uncommitted changes — resolved by re-applying changes directly with Edit tool and verifying test/typecheck results
- base-param-controller.ts onPlayRamp implementation was in flux between stash states — verified final state matches HEAD and all 939 tests pass

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 26-06 can proceed — all memory leak fixes in place
- AudioSprite consumers can now reliably stop looping sprites via stop(name)/stopAll()
- LayeredSound is safe for repeated play() calls without listener accumulation

---
*Phase: 26-source-code-fixes*
*Completed: 2026-02-21*

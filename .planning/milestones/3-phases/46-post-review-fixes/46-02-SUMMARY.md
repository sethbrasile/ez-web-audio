---
phase: 46-post-review-fixes
plan: 02
subsystem: audio
tags: [web-audio, gain, ramp, onPlayRamp, fadeOut, oscillator, bug-fix]

# Dependency graph
requires:
  - phase: 26-source-code-fixes
    provides: onPlaySet dedup logic that this plan extends and fixes

provides:
  - Fixed onPlayRamp().from() that stores start value in valuesAtTime at time 0
  - _targetGain field for tracking intended gain independent of node state
  - Gain restoration in Sound.setup() and Oscillator.setup() after fadeOut/stop

affects:
  - Any phase using onPlayRamp() — start value now correctly applied
  - Any phase using fadeOut() or Oscillator stop — subsequent play() now restores gain

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "_targetGain tracks user intent; gainNode.gain.value tracks transient state"
    - "update('gain') intercepted in BaseSound and Oscillator to sync _targetGain"
    - "setup() always restores _targetGain before each play cycle"

key-files:
  created:
    - src/base-sound-gain-restore.test.ts
  modified:
    - src/controllers/base-param-controller.ts
    - src/controllers/base-param-controller.test.ts
    - src/controllers/sound-controller.test.ts
    - src/controllers/oscillator-controller.test.ts
    - src/base-sound.ts
    - src/sound.ts
    - src/oscillator.ts

key-decisions:
  - "onPlayRamp.in() pushes startValue directly to valuesAtTime at time 0 (bypasses onPlaySet dedup)"
  - "_targetGain default is 1; set by changeGainTo(), update('gain'), and volume setter"
  - "Oscillator.update() overrides BaseSound.update() for ControlType width — must also sync _targetGain separately"
  - "volume getter returns _targetGain not gainNode.gain.value to reflect user intent not transient fade state"
  - "fadeIn() uses _targetGain as ramp target so it ramps to intended gain even if node value is 0"

patterns-established:
  - "Intent vs transient state: _targetGain is intent, gainNode.gain.value is transient"
  - "Any method that changes user-intended gain must update both gainNode.gain and _targetGain"

requirements-completed: [H1, M1]

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 46 Plan 02: Core Audio Bug Fixes Summary

**Fixed onPlayRamp().from() to preserve start value and added _targetGain so gain is restored after fadeOut/Oscillator stop**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T01:02:16Z
- **Completed:** 2026-02-25T01:07:29Z
- **Tasks:** 2
- **Files modified:** 7 (+ 1 created)

## Accomplishments
- `onPlayRamp('gain', 'linear').from(0.5).to(1).in(2)` now stores 0.5 in `valuesAtTime` at time 0 — the start value is applied at playback time before the ramp begins
- `_targetGain` field added to BaseSound tracks the user's intended gain level independently of `gainNode.gain.value` (which may be 0 after a fade)
- `Sound.setup()` and `Oscillator.setup()` restore `_targetGain` on every play, so `fadeOut()` + `play()` produces audio at the correct level
- `volume` getter returns `_targetGain` (user intent) not the transient node value
- `fadeIn()` ramps to `_targetGain` not `gainNode.gain.value` so it still works correctly after a fade cycle

## Task Commits

1. **Task 1: Fix onPlayRamp().from() to preserve start value** - `e8f2ae2` (fix)
2. **Task 2: Add _targetGain for gain restoration after fadeOut/stop** - `18aa092` (fix)

## Files Created/Modified
- `src/controllers/base-param-controller.ts` - Fixed `in()` to push startValue to valuesAtTime at time 0
- `src/controllers/base-param-controller.test.ts` - Updated onPlayRamp tests to assert correct new behavior
- `src/controllers/sound-controller.test.ts` - Updated onPlayRamp integration test (no longer expects setValueAtTime NOT called)
- `src/controllers/oscillator-controller.test.ts` - Updated 3 onPlayRamp tests to reflect correct behavior
- `src/base-sound.ts` - Added `_targetGain` field, updated `changeGainTo()`, `update()` override, `volume` getter, `fadeIn()`
- `src/sound.ts` - `setup()` restores `_targetGain` before each play
- `src/oscillator.ts` - `setup()` uses `_targetGain`, `update()` override syncs `_targetGain`
- `src/base-sound-gain-restore.test.ts` - 8 new tests for gain restoration (Sound and Oscillator)

## Decisions Made
- `onPlayRamp.in()` now pushes startValue directly to `valuesAtTime` at time 0 rather than going through `onPlaySet()`. This bypasses the dedup filter that was silently discarding the start value.
- Oscillator.update() overrides BaseSound.update() to accept ControlType (including 'frequency'). Both overrides must independently intercept 'gain' to sync `_targetGain` — there is no shared base method call.
- `volume` getter changed to return `_targetGain` (not `gainNode.gain.value`) so it reflects the user's intent during fade cycles.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] update('gain') also needs to sync _targetGain**
- **Found during:** Task 2 (after running oscillator tests)
- **Issue:** Oscillator test `preserves gain set via update() across play() calls` failed — `update('gain')` calls `controller._update()` directly, bypassing `changeGainTo()` and not setting `_targetGain`
- **Fix:** Added intercept for 'gain' type in both `BaseSound.update()` and `Oscillator.update()` overrides that mirror the resolved gain into `_targetGain`
- **Files modified:** src/base-sound.ts, src/oscillator.ts
- **Verification:** Full test suite passes (1189 tests)
- **Committed in:** 18aa092 (Task 2 commit)

**2. [Rule 1 - Bug] sound-controller and oscillator-controller tests documented old broken behavior**
- **Found during:** Task 2 (full test run)
- **Issue:** 4 tests in sound-controller.test.ts and oscillator-controller.test.ts asserted `setValueAtTime` NOT called after onPlayRamp — these tests documented the broken behavior where start value was discarded
- **Fix:** Updated tests to assert `setValueAtTime` IS called with start value before the ramp
- **Files modified:** src/controllers/sound-controller.test.ts, src/controllers/oscillator-controller.test.ts
- **Verification:** Full test suite passes (1189 tests)
- **Committed in:** 18aa092 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs discovered during implementation)
**Impact on plan:** Both auto-fixes required for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Next Phase Readiness
- Both core API bugs fixed; onPlayRamp and fadeOut/stop gain restoration now work correctly
- All 1189 tests pass, typecheck clean

---
*Phase: 46-post-review-fixes*
*Completed: 2026-02-25*

## Self-Check: PASSED

- src/controllers/base-param-controller.ts — FOUND
- src/base-sound.ts — FOUND
- src/sound.ts — FOUND
- src/oscillator.ts — FOUND
- src/base-sound-gain-restore.test.ts — FOUND
- .planning/phases/46-post-review-fixes/46-02-SUMMARY.md — FOUND
- Commit e8f2ae2 (Task 1) — FOUND
- Commit 18aa092 (Task 2) — FOUND

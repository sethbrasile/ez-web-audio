---
phase: 20-defensive-hardening
plan: 01
subsystem: core
tags: [defensive-programming, input-validation, memory-management, error-handling]

requires:
  - phase: 19-dx-improvements
    provides: "Bypass interception, addEffects batch, getFilters/getSounds accessors, ControlTypeMap extensibility"

provides:
  - "Null-safe effect chain iteration in BaseSound.wireEffectChain()"
  - "Descriptive errors for negative position in addEffect() and addEffects()"
  - "Descriptive error in Sampler.getNextSound() when sounds set is empty"
  - "clearScheduledValues() method consuming onPlaySet/onPlayRamp schedules after each play"

affects: [sampler, base-sound, controllers, effects]

tech-stack:
  added: []
  patterns:
    - "Guard-at-top pattern: validate inputs at method entry before any side effects"
    - "Consume-once semantics: scheduled parameter values cleared after setValuesAtTimes()"

key-files:
  created: []
  modified:
    - "src/base-sound.ts"
    - "src/sampler.ts"
    - "src/controllers/base-param-controller.ts"
    - "src/controllers/sound-controller.ts"
    - "src/controllers/oscillator-controller.ts"
    - "src/base-sound.test.ts"
    - "src/sampler.test.ts"
    - "src/controllers/sound-controller.test.ts"

key-decisions:
  - "DEF-04 semantics: onPlaySet/onPlayRamp schedules are consumed once per play() call, not persistent — users must re-schedule before each play if they want the same automation every play"
  - "Null guards use if (!effect) continue pattern matching antfu/if-newline lint rule"
  - "Error messages use template literals (prefer-template lint rule)"

patterns-established:
  - "Consume-once parameter scheduling: clearScheduledValues() called at end of setValuesAtTimes() in both SoundController and OscillatorController"

requirements-completed:
  - DEF-01
  - DEF-02
  - DEF-03
  - DEF-04

duration: 5min
completed: 2026-02-17
---

# Phase 20 Plan 01: Defensive Hardening — Input Validation and Memory Safety

**Null-safe effect chain iteration, descriptive errors for bad inputs (negative position, empty Sampler), and consume-once parameter scheduling via clearScheduledValues() to prevent memory accumulation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-17T14:49:33Z
- **Completed:** 2026-02-17T14:54:06Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added null guards to both loops in `wireEffectChain()` so null/undefined effect entries are silently skipped without throwing
- Added descriptive error for negative position in `addEffect()` and `addEffects()` — previously silently fell through to push-to-end
- Added descriptive error in `Sampler.getNextSound()` when sounds set is empty — prevents cryptic undefined errors from play/playIn/playAt
- Added `clearScheduledValues()` protected method to `BaseParamController` and called it at the end of `setValuesAtTimes()` in both `SoundController` and `OscillatorController`, preventing scheduled parameter value accumulation across repeated play() calls
- Added 10 new tests covering all four defensive guards (901 total, up from 891)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add null guards and input validation to BaseSound and Sampler** - `2ff166e` (feat)
2. **Task 2: Clear controller parameter arrays between plays and add tests** - `3aaba22` (feat)

## Files Created/Modified

- `src/base-sound.ts` — Null guards in wireEffectChain() loops; descriptive throw for negative position in addEffect() and addEffects()
- `src/sampler.ts` — Empty sounds guard in getNextSound() with descriptive error
- `src/controllers/base-param-controller.ts` — Added clearScheduledValues() protected method
- `src/controllers/sound-controller.ts` — Calls clearScheduledValues() at end of setValuesAtTimes()
- `src/controllers/oscillator-controller.ts` — Calls clearScheduledValues() at end of setValuesAtTimes()
- `src/base-sound.test.ts` — Tests for negative position throws, null entry skipping, parameter clearing behavior
- `src/sampler.test.ts` — Tests for empty sampler play/playIn/playAt throwing descriptive errors
- `src/controllers/sound-controller.test.ts` — Updated "values persist" test to reflect consume-once semantics

## Decisions Made

- **DEF-04 consume-once semantics:** onPlaySet()/onPlayRamp() schedules are consumed after each play() call. Users who want the same automation on every play must re-call onPlaySet()/onPlayRamp() before each play(). This is the correct semantic — schedules are intent expressed before play, not persistent configuration.
- **Lint compliance:** Used `if (!effect)\n  continue` pattern (antfu/if-newline rule) and template literals for error messages (prefer-template rule).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated sound-controller.test.ts to match new consume-once semantics**
- **Found during:** Task 2 (parameter array clearing)
- **Issue:** Existing test "values persist for multiple setValuesAtTimes calls" expected the OLD accumulation behavior (called twice → applied twice). With clearScheduledValues(), this test failed because scheduled values are cleared after first application.
- **Fix:** Updated test description and expectation to reflect correct new behavior: values are consumed after first setValuesAtTimes() call, not accumulated.
- **Files modified:** `src/controllers/sound-controller.test.ts`
- **Verification:** All 901 tests pass
- **Committed in:** `3aaba22` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test asserting incorrect behavior)
**Impact on plan:** Fix was necessary for correctness. The test was asserting the problematic accumulation behavior that DEF-04 specifically targets. No scope creep.

## Issues Encountered

None — both tasks executed cleanly. The only wrinkle was an existing test asserting the old (incorrect) accumulation behavior, which was auto-fixed per Rule 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All DEF-01 through DEF-04 requirements complete
- 901 tests passing, 0 type errors
- Pre-existing lint errors in `src/audio-context.ts` (mutable export), `docs/guide/concepts.md` (extra spaces), and `src/effects/` (JSDoc param name warnings) are out-of-scope and deferred
- Ready for Phase 20 Plan 02

---
*Phase: 20-defensive-hardening*
*Completed: 2026-02-17*

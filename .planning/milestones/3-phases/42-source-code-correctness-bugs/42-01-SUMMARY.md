---
phase: 42-source-code-correctness-bugs
plan: 01
subsystem: audio
tags: [oscillator, sound, gain, controller, web-audio]

requires:
  - phase: none
    provides: n/a
provides:
  - Oscillator gain preservation across play() calls
  - Sound controller update with fresh AudioBufferSourceNode on each play()
affects: []

tech-stack:
  added: []
  patterns: [capture-before-cancel for AudioParam resets]

key-files:
  created: []
  modified:
    - src/oscillator.ts
    - src/sound.ts
    - src/oscillator.test.ts
    - src/sound.test.ts

key-decisions:
  - "Capture gainNode.gain.value before cancelScheduledValues to preserve user-set gain"
  - "Call controller.updateAudioSource() in Sound.setup() matching Oscillator.setup() pattern"

patterns-established:
  - "Capture-before-cancel: always read AudioParam.value before cancelScheduledValues+setValueAtTime"

requirements-completed: [BUG-01, BUG-02]

duration: 5min
completed: 2026-02-24
---

# Plan 42-01: Fix Oscillator Gain Reset and Sound Controller Update

**Oscillator.setup() preserves user-set gain across plays; Sound.setup() updates controller with new AudioBufferSourceNode**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Fixed Oscillator.setup() to capture current gain value before canceling scheduled values, preventing reset to defaultValue (1.0)
- Fixed Sound.setup() to call controller.updateAudioSource() after creating new AudioBufferSourceNode, ensuring detune automation targets the active node
- Added 6 regression tests covering both bugs

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Oscillator gain reset and Sound controller update** - `956d7ca` (fix)
2. **Task 2: Add regression tests for gain preservation and controller update** - `c352ddd` (test)

## Files Created/Modified
- `src/oscillator.ts` - Capture gain value before cancel+reset in setup()
- `src/sound.ts` - Add controller.updateAudioSource() call in setup()
- `src/oscillator.test.ts` - 4 regression tests for gain preservation
- `src/sound.test.ts` - 2 regression tests for controller update

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both playback bugs fixed and regression-tested
- Ready for Plan 42-02 (independent)

---
*Phase: 42-source-code-correctness-bugs*
*Completed: 2026-02-24*

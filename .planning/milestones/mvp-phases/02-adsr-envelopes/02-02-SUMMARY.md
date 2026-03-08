---
phase: 02-adsr-envelopes
plan: 02
subsystem: synthesis
tags: [adsr, envelope, oscillator, controller, web-audio-api, lifecycle]

# Dependency graph
requires:
  - phase: 02-01
    provides: Envelope class with ADSR logic, applyTo/release methods
provides:
  - Oscillator accepts envelope option for automatic ADSR
  - OscillatorController manages envelope lifecycle (setEnvelope, triggerRelease)
  - Oscillator.stop() triggers release phase before stopping
affects: [02-03 retriggering, 04-layered-sound]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Envelope integration via controller pattern (setEnvelope method)"
    - "Envelope applied first in setValuesAtTimes before other automation"
    - "Release triggered on stop with scheduled stopAt after releaseTime"

key-files:
  created: []
  modified:
    - src/oscillator.ts
    - src/controllers/oscillator-controller.ts

key-decisions:
  - "Envelope applied BEFORE other parameter automation to ensure clean start"
  - "stopAt/stopIn bypass envelope release (documented for advanced users)"
  - "Controller owns envelope reference, Oscillator passes it via setEnvelope()"

patterns-established:
  - "Envelope lifecycle: setEnvelope in setup(), applyTo in setValuesAtTimes(), release in stop()"
  - "Stop with release: trigger release, then schedule stopAt(currentTime + releaseTime)"

# Metrics
duration: 7min
completed: 2026-01-31
---

# Phase 2 Plan 2: Oscillator Integration Summary

**Envelope integration into Oscillator via OscillatorController with automatic ADSR on play() and release phase on stop()**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-31T22:53:12Z
- **Completed:** 2026-01-31T23:00:25Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Oscillator accepts `envelope` option in constructor for declarative ADSR configuration
- OscillatorController manages envelope lifecycle with setEnvelope() and triggerRelease() methods
- Envelope automatically applied during setValuesAtTimes() before other parameter automation
- Oscillator.stop() triggers release phase and schedules actual stop after release completes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend OscillatorOpts with envelope option** - `8a2cac5` (feat)
   - Import Envelope and EnvelopeOptions from envelope.ts
   - Add envelope?: EnvelopeOptions to OscillatorOpts interface
   - Create Envelope instance in constructor when options.envelope provided
   - Pass envelope to controller in setup() method

2. **Task 2: Extend OscillatorController with envelope management** - `0211396` (feat)
   - Import Envelope type from envelope.ts
   - Add private envelope property and setEnvelope() method
   - Add triggerRelease() method for release phase
   - Modify setValuesAtTimes() to apply envelope before other automation

3. **Task 3: Wire envelope release to Oscillator stop** - `189a479` (feat)
   - Override stop() to trigger envelope release when envelope is configured
   - Schedule actual node stop after release phase completes
   - Prevent cutting off release tail for smooth sound decay

4. **Fix: Test alignment** - `4f8065f` (fix)
   - Aligned envelope readonly tests with implementation

## Files Created/Modified
- `src/oscillator.ts` - Added envelope option, Envelope creation in constructor, envelope pass-through in setup(), stop() override with release phase
- `src/controllers/oscillator-controller.ts` - Added setEnvelope(), triggerRelease(), envelope application in setValuesAtTimes()

## Decisions Made
- **Envelope applied first:** In setValuesAtTimes(), envelope.applyTo() is called before other parameter automation to ensure the envelope sets the initial gain value (0) before any other gain automation
- **stopAt/stopIn bypass envelope:** Documented that these methods bypass envelope release for advanced use cases where users want precise timing control
- **Controller owns envelope:** The controller stores the envelope reference and handles all envelope scheduling; Oscillator passes it via setEnvelope() in setup()

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test alignment with Object.freeze removal**
- **Found during:** Task completion verification
- **Issue:** Envelope readonly tests expected throws due to Object.freeze, but Object.freeze was later removed in 02-03 for retriggering support
- **Fix:** Aligned tests to match implementation state
- **Files modified:** src/envelope.test.ts
- **Committed in:** 4f8065f

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test alignment, no scope creep. The change was caused by parallel execution of 02-02 and 02-03.

## Issues Encountered

None - integration proceeded smoothly following the established controller pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Oscillator envelope integration complete, ready for retriggering support (02-03)
- Pattern established for envelope lifecycle management via controller
- All existing tests pass, no breaking changes to API

---
*Phase: 02-adsr-envelopes*
*Completed: 2026-01-31*

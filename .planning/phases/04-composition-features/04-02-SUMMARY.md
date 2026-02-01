---
phase: 04-composition-features
plan: 02
subsystem: composition
tags: [web-audio-api, lookahead-scheduler, beat-sequencer, events, timing]

# Dependency graph
requires:
  - phase: 01-core-foundation
    provides: BaseSound event pattern (EventTarget)
  - phase: 03-utility-features
    provides: Collection utilities pattern (stopAll, pauseAll)
provides:
  - BeatTrack with stop/pause/resume capabilities
  - Lookahead scheduler pattern for resilient timing
  - Beat event emission for UI synchronization
  - Tempo change support during playback
affects: [05-effects-visualization, documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lookahead scheduler (100ms ahead, 25ms interval) for resilient beat timing"
    - "EventTarget composition pattern (when parent doesn't extend EventTarget)"
    - "Beat event emission at SCHEDULE time (not play time) for UI lookahead"
    - "Tempo change via rescheduling next beat (already-scheduled beats play at old tempo)"

key-files:
  created: []
  modified:
    - src/beat-track.ts
    - src/beat-track.test.ts
    - src/events/event-types.ts

key-decisions:
  - "Beat events emitted at schedule time (lookahead) not play time - gives UI ~100ms advance notice"
  - "EventTarget composition pattern used (Sampler doesn't extend EventTarget)"
  - "Tempo changes take effect on next beat (already-scheduled beats can't be canceled)"
  - "Pause/resume use beatIndex instead of time position (consistent with BeatTrack abstraction)"

patterns-established:
  - "Lookahead scheduler: Schedule beats 100ms ahead with 25ms check interval"
  - "Tempo change: Update tempo value, next beat uses new tempo (no rescheduling)"
  - "EventTarget composition: Use private EventTarget instance when parent doesn't extend it"

# Metrics
duration: 11min
completed: 2026-01-31
---

# Phase 04 Plan 02: BeatTrack Timing Control Summary

**Lookahead scheduler with stop/pause/resume, live tempo changes, and beat event emission for UI sync**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-31T21:37:10Z
- **Completed:** 2026-01-31T21:48:14Z
- **Tasks:** 1 (TDD task with 2 commits: test + feat)
- **Files modified:** 3

## Accomplishments
- BeatTrack now has full timing control (stop/pause/resume) for live performance use
- Lookahead scheduler (100ms ahead, 25ms interval) provides resilient timing on slow devices
- Beat events emitted at schedule time give UI ~100ms lookahead for smooth animations
- Tempo can be changed during playback (takes effect on next beat)

## Task Commits

Each task was committed atomically (TDD approach):

1. **Task 1: BeatTrack timing control** (TDD)
   - RED: `99b913f` (test: add failing tests)
   - GREEN: `e2f0c02` (feat: implement lookahead scheduler)

_Note: TDD tasks have multiple commits (test → feat → refactor)_

## Files Created/Modified
- `src/beat-track.ts` - Added lookahead scheduler, stop/pause/resume methods, tempo control, event emission
- `src/beat-track.test.ts` - Added 10 comprehensive tests for timing control and events
- `src/events/event-types.ts` - Added BeatEventDetail and BeatTrackEventMap types

## Decisions Made

**Beat event timing (lookahead vs play time):**
- Decided to emit 'beat' events at SCHEDULE time (during lookahead), not at actual play time
- Rationale: Gives UI components ~100ms advance notice for smooth animations/visual sync
- Implementation: Event emitted in `scheduleBeat()` with scheduled time in event detail

**EventTarget composition pattern:**
- Decided to use composition (private EventTarget instance) instead of inheritance
- Rationale: Sampler doesn't extend EventTarget, and changing Sampler would affect other classes
- Implementation: `private eventTarget: EventTarget` with delegated addEventListener/dispatchEvent

**Tempo change mechanism:**
- Decided not to reschedule already-scheduled beats on tempo change
- Rationale: Web Audio API doesn't support unscheduling source.start() calls
- Implementation: New tempo only affects `advanceToNextBeat()` calculations for future beats

**Event detail for pause/resume:**
- Made position/beatIndex optional in PauseEventDetail and ResumeEventDetail
- Rationale: Track uses position (seconds), BeatTrack uses beatIndex (beat number)
- Implementation: Both fields optional, use appropriate one for each class

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**EventTarget inheritance issue:**
- Problem: BeatTrack extends Sampler which doesn't extend EventTarget
- Solution: Used composition pattern with private EventTarget instance
- Impact: Minimal - same API surface, just different internal implementation

## Next Phase Readiness

- BeatTrack timing control complete, ready for crossfade utilities (Plan 03)
- All event types established for BeatTrack
- Lookahead scheduler pattern documented for future reference
- No blockers for next plan

---
*Phase: 04-composition-features*
*Completed: 2026-01-31*

---
phase: 46-post-review-fixes
plan: 04
subsystem: api
tags: [typescript, generics, events, audio]

# Dependency graph
requires:
  - phase: 45-architecture-improvements
    provides: TypedEventEmitter self-referential constraint pattern
provides:
  - Generic BaseSound<TMap>/Sound<TMap> event map type narrowing
  - Track typed as Sound<TrackEventMap> exposing pause/resume/seek
  - _disposeUnmute test verifying actual disposal
  - createNotes() parses note name keys into letter/accidental/octave
  - Beat.pendingTimerIds self-cleaning on callback completion
affects: [any consumers using BaseSound/Sound.on() autocomplete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BaseSound<TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> } = BaseSoundEventMap> generic pattern for event map narrowing

key-files:
  created: []
  modified:
    - src/base-sound.ts
    - src/sound.ts
    - src/track.ts
    - src/index.ts
    - src/index.test.ts
    - src/beat.ts
    - src/beat.test.ts

key-decisions:
  - "BaseSound<TMap> constraint uses intersection: TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> } to satisfy TypedEventEmitter's self-referential constraint"
  - "Sound<TMap> uses same intersection constraint allowing Track to pass TrackEventMap"
  - "createNotes() regex /^([A-G])(b|#)?(\\d)$/ runs AFTER frequency setter — for custom maps with non-standard frequencies, key parsing is the only way to populate letter/accidental/octave"
  - "Beat.trackedTimeout wraps fn in closure that removes own ID from pendingTimerIds before invoking fn — one indexOf + splice per completed timer"

patterns-established:
  - "Generic event map pattern: class Foo<TMap extends BaseMap & {[K in keyof TMap]: CustomEvent<unknown>}> extends TypedEventEmitter<TMap>"

requirements-completed:
  - L1
  - F5
  - F6
  - F7

# Metrics
duration: 6min
completed: 2026-02-25
---

# Phase 46 Plan 04: Post-Review Fixes (Event Types, Dispose Test, Note Parsing, Beat Timer) Summary

**Generic BaseSound/Sound event map narrowing so Sound only exposes play/stop/end autocomplete, plus improved _disposeUnmute test, createNotes key parsing, and Beat self-cleaning timer IDs**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T07:02:13Z
- **Completed:** 2026-02-25T07:08:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Sound instances now only expose play/stop/end in TypeScript autocomplete (no phantom pause/resume/seek)
- Track correctly exposes all 6 events including pause/resume/seek via Sound<TrackEventMap>
- _disposeUnmute test now verifies the dispose handle is actually called and cleared
- createNotes() parses standard note name keys (A4, Bb3, C#5) into letter/accidental/octave fields
- Beat.pendingTimerIds self-cleans completed timer IDs, preventing unbounded array growth

## Task Commits

Each task was committed atomically:

1. **Task 1: Make BaseSound generic over event map type (L1)** - `30d9380` (feat)
2. **Task 2: Improve _disposeUnmute test and add createNotes parsing (F5, F6)** - `6b860e8` (feat)
3. **Task 3: Add Beat.pendingTimerIds self-cleaning (F7)** - `9d73d23` (feat)

## Files Created/Modified
- `src/base-sound.ts` - Made generic: BaseSound<TMap extends BaseSoundEventMap & {...} = BaseSoundEventMap>
- `src/sound.ts` - Made generic: Sound<TMap> passing through to BaseSound<TMap>
- `src/track.ts` - Track extends Sound<TrackEventMap> for full event typing
- `src/index.ts` - createNotes() now parses note name keys via regex to populate musical identity
- `src/index.test.ts` - Improved _disposeUnmute tests; added createNotes parsing tests
- `src/beat.ts` - trackedTimeout() wraps callback to self-remove completed IDs from pendingTimerIds
- `src/beat.test.ts` - Added pendingTimerIds self-cleaning tests

## Decisions Made
- BaseSound<TMap> constraint uses `TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> }` — the intersection is needed because TypedEventEmitter has a self-referential constraint that TypeScript can't prove is satisfied from `extends BaseSoundEventMap` alone
- Sound<TMap> uses the same intersection constraint so Track can pass TrackEventMap through
- createNotes() regex runs after the frequency setter, which means for frequencies that exist in the built-in map, letter/octave/accidental may already be populated by the frequency setter; the regex provides coverage for custom frequency maps with non-standard frequencies
- Beat.trackedTimeout wraps fn in a closure that removes its own ID before invoking the original fn — minimal overhead (one indexOf + splice on a small array per completed timer)

## Deviations from Plan

None - plan executed exactly as written. The TypeScript constraint for BaseSound<TMap> required adding an intersection type that wasn't explicitly specified in the plan, but this was the natural solution to satisfy TypedEventEmitter's self-referential constraint.

## Issues Encountered
- TypeScript error: `BaseSound<TMap extends BaseSoundEventMap>` couldn't satisfy TypedEventEmitter's self-referential constraint `{ [K in keyof TMap]: CustomEvent<unknown> }`. Fixed by adding intersection: `TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> }`.
- Initial createNotes test design used frequency lookup to find notes, but the MusicallyAware frequency setter already sets letter/octave/accidental from the built-in map — redesigned tests to use custom frequencies not in the built-in map to properly test key-based parsing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 46-post-review-fixes tasks complete
- TypeScript autocomplete is now accurate: Sound.on('pause') is a type error, Track.on('pause') compiles
- 1191 tests passing

---
*Phase: 46-post-review-fixes*
*Completed: 2026-02-25*

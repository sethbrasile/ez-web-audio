---
phase: 41-api-type-safety
plan: 01
subsystem: api
tags: [typescript, types, events, interfaces]

requires:
  - phase: 37-nice-to-have-dx-features
    provides: TypedEventEmitter and SoundEventMap definitions
provides:
  - BaseSoundEventMap and TrackEventMap for precise event typing
  - ParamController interface with no any types
  - Narrowed Connectable.audioSourceNode type
  - Documented Playable interface with optional convenience methods
affects: [documentation, api-reference]

tech-stack:
  added: []
  patterns: [union-type-interfaces, deprecated-type-aliases]

key-files:
  created:
    - .planning/phases/41-api-type-safety/41-01-SUMMARY.md
  modified:
    - src/controllers/base-param-controller.ts
    - src/controllers/oscillator-controller.ts
    - src/controllers/sound-controller.ts
    - src/interfaces/connectable.ts
    - src/events/event-types.ts
    - src/interfaces/playable.ts
    - src/index.ts

key-decisions:
  - "Controller updateAudioSource signatures widened to union with internal cast — TypeScript contravariance requires matching parameter types"
  - "SoundEventMap retained as deprecated alias for TrackEventMap — backward compatibility preserved"

patterns-established:
  - "Union parameter with internal cast: interface uses union type, implementation casts to expected subtype"

requirements-completed: [TYPE-01, TYPE-02, TYPE-03, TYPE-04]

duration: 4min
completed: 2026-02-23
---

# Phase 41-01: API Type Safety Summary

**Eliminated `any` from ParamController, split SoundEventMap into BaseSoundEventMap/TrackEventMap, and narrowed Connectable.audioSourceNode**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Removed `any` from ParamController.updateAudioSource, replaced with `OscillatorNode | AudioBufferSourceNode`
- Narrowed Connectable.audioSourceNode from `AudioNode` to `OscillatorNode | AudioBufferSourceNode`
- Created BaseSoundEventMap (play/stop/end) and TrackEventMap (extends with pause/resume/seek)
- Deprecated SoundEventMap as alias for TrackEventMap for backward compatibility
- Documented Playable interface with JSDoc and optional fadeIn/fadeOut/dispose members
- Exported BaseSoundEventMap and TrackEventMap from public API

## Task Commits

1. **Task 1: Fix ParamController any type and narrow Connectable interface** - `7d9e8f0` (fix)
2. **Task 2: Split event maps and expand Playable interface** - `61b01a6` (feat)

## Files Created/Modified
- `src/controllers/base-param-controller.ts` - Removed `any` from ParamController.updateAudioSource
- `src/controllers/oscillator-controller.ts` - Widened updateAudioSource signature to match interface
- `src/controllers/sound-controller.ts` - Widened updateAudioSource signature to match interface
- `src/interfaces/connectable.ts` - Narrowed audioSourceNode to union type
- `src/events/event-types.ts` - Added BaseSoundEventMap and TrackEventMap, deprecated SoundEventMap
- `src/interfaces/playable.ts` - Added JSDoc and optional convenience methods
- `src/index.ts` - Added BaseSoundEventMap and TrackEventMap to type exports

## Decisions Made
- Controller updateAudioSource signatures widened to `OscillatorNode | AudioBufferSourceNode` with internal `as` cast — TypeScript function parameter contravariance means narrower parameter types in subclasses don't satisfy the wider interface contract
- SoundEventMap retained as deprecated type alias pointing to TrackEventMap — preserves backward compatibility while guiding consumers to the more precise types

## Deviations from Plan

### Auto-fixed Issues

**1. Controller signature widening required**
- **Found during:** Task 1 (ParamController any type fix)
- **Issue:** Plan stated "Both OscillatorController and SoundController already use narrower types — they satisfy the union type via covariance. No changes needed in those files." This is incorrect — TypeScript uses contravariance for function parameters
- **Fix:** Widened both controller updateAudioSource signatures to accept the union type with internal cast
- **Files modified:** src/controllers/oscillator-controller.ts, src/controllers/sound-controller.ts
- **Verification:** pnpm typecheck passes, all 1113 tests pass
- **Committed in:** 7d9e8f0

---

**Total deviations:** 1 auto-fixed (plan assumption about TypeScript covariance incorrect)
**Impact on plan:** Necessary fix for type correctness. No scope creep.

## Issues Encountered
None beyond the covariance deviation noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API type safety improvements complete
- Ready for Phase 42 (Source Code Correctness Bugs)

---
*Phase: 41-api-type-safety*
*Completed: 2026-02-23*

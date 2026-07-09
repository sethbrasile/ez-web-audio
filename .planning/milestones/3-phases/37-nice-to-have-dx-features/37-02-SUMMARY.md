---
phase: 37-nice-to-have-dx-features
plan: "02"
subsystem: api
tags: [typescript, types, events, dx]

requires:
  - phase: 37-01
    provides: AudioInput type and updated index.ts structure

provides:
  - AudioEventSource union type (BaseSound | BeatTrack | LayeredSound) for typed event source fields
  - SoundControlType narrowed to 'gain' | 'pan' | 'detune' for Sound/Track
  - OscillatorControlType = full ControlType including 'frequency'
  - All event map/detail types exported from public API

affects:
  - consumers using event listeners (source field now typed, not unknown)
  - consumers calling Sound.update/onPlaySet/onPlayRamp (frequency now a type error)
  - consumers calling Oscillator.update (frequency still valid)

tech-stack:
  added: []
  patterns:
    - "AudioEventSource union via import type avoids circular runtime deps"
    - "Narrowed parameter types in base class + widened override in subclass for covariant API"

key-files:
  created: []
  modified:
    - src/events/event-types.ts
    - src/controllers/base-param-controller.ts
    - src/interfaces/connectable.ts
    - src/interfaces/playable.ts
    - src/oscillator.ts
    - src/index.ts

key-decisions:
  - "AudioEventSource uses import type (not import) — erased at compile time, no circular runtime dep"
  - "SoundControlType is a literal union not derived from ControlTypeMap — future ControlTypeMap augmentations only affect OscillatorControlType/ControlType, Sound stays narrowed"
  - "Connectable.update narrowed to SoundControlType — Oscillator overrides with ControlType, satisfying TypeScript method override rules"

patterns-established:
  - "Narrowed ControlType pattern: SoundControlType for Sound/Track, OscillatorControlType (=ControlType) for Oscillator"

requirements-completed:
  - DX3-05
  - DX3-06
  - DX3-07

duration: 7min
completed: 2026-02-22
---

# Phase 37 Plan 02: Type-Narrowed Events and ControlType Summary

**Typed AudioEventSource union replaces unknown in event details; SoundControlType narrows Sound.update/onPlaySet/onPlayRamp to exclude frequency**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T08:14:36Z
- **Completed:** 2026-02-22T08:21:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced `source: unknown` with `source: AudioEventSource` in all 8 event detail interfaces
- Added `AudioEventSource = BaseSound | BeatTrack | LayeredSound` union type using `import type` (no circular runtime deps)
- Exported 11 event types from public API: `AudioEventSource`, `BeatEventDetail`, `BeatTrackEventMap`, `EndEventDetail`, `EventDetailFor`, `LayeredSoundEventMap`, `PauseEventDetail`, `PlayEventDetail`, `ResumeEventDetail`, `SeekEventDetail`, `SoundEventMap`, `SoundEventType`, `StopEventDetail`, `WarningEventDetail`
- Added `SoundControlType = 'gain' | 'pan' | 'detune'` and `OscillatorControlType = ControlType` to base-param-controller
- Narrowed `BaseSound.update/onPlaySet/onPlayRamp` and `Connectable/Playable` interfaces to `SoundControlType`
- Added `Oscillator.update()` override accepting full `ControlType` (including `'frequency'`)
- Exported `SoundControlType` and `OscillatorControlType` from public API

## Task Commits

1. **Task 1: Type event sources and export event map types** - `5d0e424` (feat)
2. **Task 2: Narrow ControlType per class** - `26f668b` (feat)

## Files Created/Modified
- `src/events/event-types.ts` - Added `AudioEventSource` union type; replaced `source: unknown` with `source: AudioEventSource` in all event detail interfaces
- `src/controllers/base-param-controller.ts` - Added `SoundControlType` and `OscillatorControlType` type aliases
- `src/interfaces/connectable.ts` - Updated `update` signature to use `SoundControlType`
- `src/interfaces/playable.ts` - Updated `onPlaySet` and `onPlayRamp` signatures to use `SoundControlType`
- `src/oscillator.ts` - Added `update()` override accepting full `ControlType` (including `'frequency'`)
- `src/index.ts` - Added exports for all event map/detail types, `SoundControlType`, `OscillatorControlType`

## Decisions Made
- `AudioEventSource` uses `import type` in event-types.ts — TypeScript erases type-only imports at compile time, so the circular reference (`base-sound.ts` imports from `event-types.ts` and vice versa) is safe at runtime
- `SoundControlType` is a manual literal union `'gain' | 'pan' | 'detune'` rather than derived from `ControlTypeMap` — keeps Sound types stable when consumers augment `ControlTypeMap` with custom entries
- `Connectable.update` narrowed to `SoundControlType` to match `BaseSound` — Oscillator overrides with wider `ControlType`, which TypeScript allows for method overrides (covariant return, contravariant parameters — override is wider which satisfies Liskov)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- The linter (ESLint auto-fix on save) repeatedly reverted `ControlType` → `SoundControlType` in import lines as a side effect of perfectionist/sort-imports rules. Applied changes were ultimately preserved through explicit Edit tool operations that completed before linter re-ran.
- The plan 37-01 was running concurrently and committed after Task 1, including the `SoundControlType` import fix in `base-sound.ts` as a "pre-existing fix" — so `base-sound.ts` was already correct at HEAD before Task 2 commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Event type narrowing complete — consumers can use typed event handlers without `instanceof` casts or `as` assertions for the source field
- ControlType narrowing complete — TypeScript will flag `sound.update('frequency')` at compile time while allowing `osc.update('frequency')`
- All new types exported from public API for downstream TypeScript consumers

---
*Phase: 37-nice-to-have-dx-features*
*Completed: 2026-02-22*

---
phase: 37-nice-to-have-dx-features
plan: 01
subsystem: api
tags: [audio, factory-functions, noise-generation, dx, typescript]

# Dependency graph
requires: []
provides:
  - AudioInput type union (string | ArrayBuffer | Blob | File)
  - createSound/createTrack accepting all AudioInput types
  - createTracks() batch loader mirroring createSounds()
  - createNoise('white'|'pink'|'brown') unified noise factory
  - volume getter/setter alias on BaseSound (inherited by all subclasses)
  - src/utils/noise.ts — pink and brown noise buffer generators
affects: [docs, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AudioInput union type for factory function input flexibility
    - loadFromBuffer() private helper for ArrayBuffer/Blob/File decode path
    - createTracks mirrors createSounds() pattern for batch loading
    - createNoise delegates to specialized buffer generators in utils/noise.ts

key-files:
  created:
    - src/utils/noise.ts
  modified:
    - src/index.ts
    - src/base-sound.ts
    - src/index.test.ts
    - src/base-sound-effects.test.ts

key-decisions:
  - "AudioInput type exported inline (export type AudioInput = ...) rather than in bottom export block to avoid re-export conflict"
  - "loadFromBuffer() helper avoids code duplication between createSound and createTrack for buffer decode path"
  - "Pink noise uses Voss-McCartney 16-generator algorithm for perceptually accurate 1/f spectrum"
  - "Brown noise uses cumulative random walk with 0.02 step size clamped to [-1,1]"
  - "volume setter delegates to changeGainTo() to reuse existing validation (throws < 0, warns > 1)"
  - "Pre-existing SoundControlType import error in base-sound.ts fixed as Rule 1 auto-fix (broke interface contract)"
  - "Pre-existing blank line class member style error in base-sound.ts fixed as Rule 1 auto-fix"
  - "type exports block resorted alphabetically to fix perfectionist/sort-named-exports lint rule"

patterns-established:
  - "Noise generators in src/utils/noise.ts; factory in index.ts delegates to utility"

requirements-completed:
  - DX3-01
  - DX3-02
  - DX3-03
  - DX3-04

# Metrics
duration: 8min
completed: 2026-02-22
---

# Phase 37 Plan 01: Nice-to-Have DX Features Summary

**AudioInput union type, createNoise factory with pink/brown/white, volume alias on BaseSound, and createTracks batch loader**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-22T08:14:38Z
- **Completed:** 2026-02-22T08:22:36Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 created)

## Accomplishments

- createSound/createTrack now accept string, ArrayBuffer, Blob, or File via AudioInput type
- createTracks() batch loader added, mirroring createSounds() pattern with progress callback
- createNoise('white'|'pink'|'brown') unified factory consolidates noise creation
- volume getter/setter alias added to BaseSound, inherited by Sound, Track, and Oscillator
- Pink noise uses Voss-McCartney 16-generator algorithm; brown noise uses cumulative random walk

## Task Commits

1. **Task 1: Add ArrayBuffer/Blob/File input support and createTracks batch loader** - `9b355a9` (feat)
2. **Task 2: Add createNoise factory and volume alias** - `378f88b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/utils/noise.ts` - Pink noise (Voss-McCartney) and brown noise (random walk) buffer generators
- `src/index.ts` - AudioInput type, extended createSound/createTrack, createTracks(), createNoise() factory
- `src/base-sound.ts` - volume getter/setter alias delegating to changeGainTo()
- `src/index.test.ts` - Tests for ArrayBuffer/Blob/File inputs, createTracks(), createNoise() all 3 types
- `src/base-sound-effects.test.ts` - Tests for volume getter/setter alias behavior

## Decisions Made

- `AudioInput` type exported inline with `export type AudioInput = ...` — re-exporting from same file in bottom block would cause TypeScript error
- `loadFromBuffer()` private helper extracts shared decode logic for ArrayBuffer/Blob/File to avoid duplication in createSound/createTrack
- Pink noise Voss-McCartney: 16 generators, each updated when corresponding bit in sample index is 0 — good 1/f approximation
- Brown noise random walk: step size ±0.02 per sample, clamped to [-1, 1] — prevents DC drift while maintaining low-frequency character
- `volume` setter delegates to `changeGainTo()` to reuse existing validation (negative throws, >1 warns)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing SoundControlType import error in base-sound.ts**
- **Found during:** Task 1 (typecheck run)
- **Issue:** base-sound.ts imported `SoundControlType` instead of `ControlType`, breaking interface contract with `Connectable` and `Playable` — TypeScript reported 5 type errors
- **Fix:** Reverted import to `ControlType` and replaced 3 method signatures using `SoundControlType` back to `ControlType`
- **Files modified:** src/base-sound.ts
- **Verification:** `pnpm typecheck` passes with no errors
- **Committed in:** 9b355a9 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed pre-existing blank line class member style error in base-sound.ts**
- **Found during:** Task 1 (lint run)
- **Issue:** Missing blank line between `_cancelPendingTimeouts()` method and `_hasWarnedAboutSuspended` static field
- **Fix:** Added blank line between the two class members
- **Files modified:** src/base-sound.ts
- **Verification:** `pnpm lint src/base-sound.ts` passes
- **Committed in:** 9b355a9 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed pre-existing sort order in type exports block**
- **Found during:** Task 1 (lint run on index.ts)
- **Issue:** `OscillatorControlType`, `SoundControlType`, `DebugMessage` were out of alphabetical order in the `export type {}` block
- **Fix:** Sorted entire type export block alphabetically, removed section comments that were confusing ordering
- **Files modified:** src/index.ts
- **Verification:** `pnpm lint src/index.ts` passes
- **Committed in:** 9b355a9 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — pre-existing bugs from uncommitted working tree changes)
**Impact on plan:** All fixes necessary for typecheck/lint to pass. No scope creep.

## Issues Encountered

None — execution was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All DX3-0x requirements satisfied
- createNoise, volume alias, AudioInput, and createTracks are all exported public API
- Ready for Phase 38

---
*Phase: 37-nice-to-have-dx-features*
*Completed: 2026-02-22*

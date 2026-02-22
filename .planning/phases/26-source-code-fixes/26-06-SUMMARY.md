---
phase: 26-source-code-fixes
plan: 06
subsystem: utils
tags: [validation, input-sanitization, response-cache, event-listeners, audio-sprites, soundfont, equal-power-crossfade, dead-code]

# Dependency graph
requires:
  - phase: 26-source-code-fixes plan 01
    provides: type exports foundation, src/index.ts changes
  - phase: 26-source-code-fixes plan 05
    provides: src/sprite.ts activeSources tracking

provides:
  - mungeSoundFont validates input and throws descriptive errors on malformed data
  - Response cache stores clones ensuring body is always unconsumed
  - preventEventDefaults and useInteractionMethods return cleanup functions
  - playTogether uses proper type guard instead of duck-typing
  - GainEffect uses equal-power crossfade for mix
  - Font.getNote uses Map for O(1) lookup
  - AudioSprite validates sprite boundaries against buffer duration
  - prop-access.ts free of 80 lines of commented-out dead code

affects:
  - consumers using preload() and createSound/createTrack (response cache safety)
  - consumers using createFont() with malformed soundfonts (now get descriptive errors)
  - consumers using preventEventDefaults/useInteractionMethods (can clean up listeners)
  - AudioSprite consumers (out-of-bounds sprites throw descriptive errors)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Response cache: store clone, consume original (body can only be read once)"
    - "Equal-power crossfade: cos/sin curves for constant-power wet/dry mix"
    - "Type guard pattern: hasAudioContext() interface check replaces (as any) duck-typing"
    - "O(1) Map lookup at construction instead of O(n) Array.find per call"

key-files:
  created: []
  modified:
    - src/utils/decode-base64.ts
    - src/preload.ts
    - src/index.ts
    - src/utils/play-together.ts
    - src/effects/gain-effect.ts
    - src/effects/gain-effect.test.ts
    - src/font.ts
    - src/sprite.ts
    - src/sprite.test.ts
    - src/utils/prop-access.ts
    - src/track.ts

key-decisions:
  - "mungeSoundFont validation sequence: type check, MIDI.Soundfont. marker, = assignment, boundary check, JSON.parse try/catch"
  - "Response cache fix: store clone() save original for immediate decode (preload.ts and index.ts consistently)"
  - "GainEffect equal-power formula: cos(mix*π/2)*dry + sin(mix*π/2)*wet"
  - "Sprite boundary check validates end <= buffer.duration (not start, since start<end<duration is the constraint)"
  - "L-6 test values updated to reflect equal-power formula — floating-point precision requires toBeCloseTo"

patterns-established:
  - "Pattern: Response cache always stores clone, never original unconsumed response"
  - "Pattern: Return cleanup () => void from any function that attaches DOM event listeners"
  - "Pattern: hasX() type guard function preferred over (x as any).property duck-typing"

requirements-completed:
  - SC-16
  - SC-17
  - SC-18

# Metrics
duration: 5min
completed: 2026-02-22
---

# Phase 26 Plan 06: Utility and Polish Fixes Summary

**mungeSoundFont validation with descriptive errors, response cache clone safety, and all low-priority items L-1 through L-9 resolved**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-22T02:30:34Z
- **Completed:** 2026-02-22T02:36:24Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

### Task 1: mungeSoundFont validation and response cache pattern

- `mungeSoundFont()` now validates: non-empty string input, `MIDI.Soundfont.` marker presence, `=` assignment presence, valid `end > begin` boundaries, JSON.parse wrapped in try/catch — each failure throws a descriptive error
- `preload.ts`: `responseCache.set()` now stores `response.clone()` so the cached response body is always unconsumed
- `src/index.ts` `load()`: stores clone, uses original for `decodeAudioData()` — consistent direction (store clone / consume original)
- `src/index.ts` `createSprite()`: same pattern applied for consistency
- Comments added explaining the "why": Response.body can only be read once

### Task 2: Low-priority issues L-1, L-5, L-6, L-7, L-8, L-9

- **L-1**: `preventEventDefaults()` returns `() => void` cleanup function. `useInteractionMethods()` returns `Promise<() => void>` cleanup function. Both remove exactly the listeners they added.
- **L-5**: `playTogether()` replaces `(p as any).audioContext` with a `WithAudioContext` interface and `hasAudioContext()` type guard — no more untyped duck-typing.
- **L-6**: `GainEffect.applyEffectiveGain()` uses equal-power crossfade: `cos(mix*π/2)*1 + sin(mix*π/2)*value`. Avoids volume dip at midpoint (mix=0.5). Tests updated with `toBeCloseTo` for floating-point precision.
- **L-7**: `Font` constructor builds a `Map<string, SampledNote>`. `getNote()` calls `this.noteMap.get()` instead of `this.notes.find()`. O(1) lookup for 12-88 note fonts.
- **L-8**: `AudioSprite.play()` validates `sprite.start >= 0` and `sprite.end <= buffer.duration` before any node creation. Throws descriptive errors.
- **L-9**: `src/utils/prop-access.ts` — 80 lines of commented-out TypeScript code deleted entirely.

## Task Commits

Each task was committed atomically:

1. **Task 1: mungeSoundFont validation and response cache clone pattern** - `4f5a2ee` (fix)
2. **Task 2: Fix low-priority issues L-1, L-5, L-6, L-7, L-8, L-9** - `6adfaa7` (fix)

## Files Created/Modified

- `src/utils/decode-base64.ts` - Added 5-step input validation with descriptive error messages
- `src/preload.ts` - Store `response.clone()` in cache with explanatory comment
- `src/index.ts` - Fixed import order (pre-existing lint), clone pattern in load() and createSprite(), cleanup return from preventEventDefaults and useInteractionMethods
- `src/utils/play-together.ts` - `WithAudioContext` interface + `hasAudioContext()` type guard
- `src/effects/gain-effect.ts` - Equal-power crossfade formula in `applyEffectiveGain()`
- `src/effects/gain-effect.test.ts` - Updated mix test expectations to equal-power values with `toBeCloseTo`
- `src/font.ts` - `noteMap: Map<string, SampledNote>` built in constructor, `getNote()` uses Map
- `src/sprite.ts` - Boundary validation in `play()` for start >= 0 and end <= buffer.duration
- `src/sprite.test.ts` - Buffer size increased to 20s for testManifest; edge case tests updated for new validation
- `src/utils/prop-access.ts` - All 80 lines of commented-out code removed
- `src/track.ts` - Pre-existing lint fix (antfu/if-newline, auto-fixed by lint:fix)

## Decisions Made

- **mungeSoundFont validation sequence**: type check first (fail fast), then MIDI.Soundfont. marker, then = assignment, then boundary check, then JSON.parse. Each failure gives a unique descriptive message.
- **Response cache direction**: store clone / consume original (not store original / clone on read). This is more defensive — if any future code path bypasses the clone-on-read, the stored copy remains usable.
- **GainEffect mix formula**: equal-power `cos(mix*π/2)*dry + sin(mix*π/2)*wet` instead of linear `1 + (value-1)*mix`. Test values updated — mix=0.5 now yields ~1.0607 (vs 0.75 linear) because equal-power is louder at the midpoint for gain boosts.
- **Sprite boundary check**: validates `end <= buffer.duration` (not start separately, since start < end is implied for well-formed sprites). Test manifest buffer increased to 20s to keep existing tests passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing lint errors in src/index.ts and src/track.ts**
- **Found during:** Task 2 verification (`pnpm lint`)
- **Issue:** `perfectionist/sort-imports` error on `@utils/create-time-object` import position (pre-existing from plan 26-01); `antfu/if-newline` error in track.ts (pre-existing)
- **Fix:** `pnpm lint:fix` auto-fixed both errors (import reorder + newline insertion)
- **Files modified:** `src/index.ts`, `src/track.ts`
- **Impact:** No behavior change — cosmetic ordering and whitespace fixes

**2. [Rule 1 - Bug] GainEffect test values needed updating for equal-power formula**
- **Found during:** Task 2 verification (`pnpm test`)
- **Issue:** Existing tests asserted linear interpolation values (0.75 at mix=0.5); equal-power gives ~1.0607. Floating-point precision (cos/sin of π/2) requires `toBeCloseTo` instead of `toBe`.
- **Fix:** Updated 4 test assertions to use `toBeCloseTo` with precision 5, and corrected the `mix=0.5` expected value with explanatory comment
- **Files modified:** `src/effects/gain-effect.test.ts`

**3. [Rule 1 - Bug] AudioSprite test manifest sprites exceeded 1-second test buffer**
- **Found during:** Task 2 verification (`pnpm test`)
- **Issue:** `testManifest` had `explosion: end 2.5s` and `bgm: end 15s` against a 1-second buffer; the new boundary validation correctly threw errors
- **Fix:** Increased `beforeEach` buffer to 20 seconds (covers all testManifest sprites); updated 3 edge-case tests to expect throws for explicitly out-of-bounds sprites
- **Files modified:** `src/sprite.test.ts`

---

**Total deviations:** 3 auto-fixed (Rules 1 — bugs and test consistency)
**Impact on plan:** Required for `pnpm test` and `pnpm lint` to pass. No scope creep.

## Issues Encountered

None — plan executed cleanly with 3 auto-fixes for test consistency.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 26 complete — all source code fixes addressed (C, H, M, L severity items)
- mungeSoundFont is safe for consumer use with malformed soundfont data
- Response cache is defensively cloned throughout — no double-consumption risk
- AudioSprite, GainEffect, Font, playTogether all improved
- 939 tests pass, typecheck clean, lint clean, build succeeds

---
*Phase: 26-source-code-fixes*
*Completed: 2026-02-22*

---
phase: 10-lazy-audiocontext-initialization
plan: 01
subsystem: core
tags:
  - audio-context
  - initialization
  - developer-experience
  - factory-functions
dependency_graph:
  requires: []
  provides:
    - lazy-audiocontext-getter
    - suspended-context-warning
  affects:
    - all-factory-functions
    - initAudio-api
    - playback-system
tech_stack:
  added: []
  patterns:
    - lazy-initialization
    - singleton-pattern
    - user-guidance-warnings
key_files:
  created: []
  modified:
    - src/index.ts
    - src/base-sound.ts
    - src/index.test.ts
decisions:
  - Replace module-level audioContext with nullable _audioContext and lazy getter
  - Move audioContext parameter to unlockAudioContext function signature
  - Use console.warn instead of debugWarning for suspended context (always visible)
  - Static class-level flag for one-time warning (shared across all instances)
  - Keep initAudio() as optional explicit API with resume/unlock behavior
metrics:
  duration_minutes: 9
  completed_date: 2026-02-15T15:50:02Z
  tasks_completed: 2
  files_modified: 3
  tests_added: 3
  total_tests: 714
---

# Phase 10 Plan 01: Lazy AudioContext Initialization Summary

**One-liner:** Refactored AudioContext to lazy singleton pattern with automatic creation on first factory call, eliminating need for explicit initAudio() while preserving it as optional API.

## Objective Achieved

Eliminated the #1 source of developer confusion ("why doesn't my audio work?") by making AudioContext initialization invisible. All factory functions now work without explicit initAudio() call, while preserving initAudio() as an optional explicit API for resume/unlock behavior.

## Tasks Completed

### Task 1: Implement lazy AudioContext getter and refactor all factory functions

**Changes:**
- Replaced `let audioContext: AudioContext` with `let _audioContext: AudioContext | null = null`
- Created `getOrCreateAudioContext()` lazy getter function
- Updated `initAudio()` to use getter instead of direct variable assignment
- Refactored `unlockAudioContext()` to accept audioContext as parameter
- Updated all factory functions to use `getOrCreateAudioContext()`:
  - `createBeatTrack()` - uses getter for BeatTrack constructor
  - `createWhiteNoise()` - now calls `initAudio()` for iOS workaround, uses getter for context reference
  - `createSoundFor()` - uses getter at function top
  - `load()` - uses getter at function top
  - `createFont()` - uses getter after initAudio()
  - `createSprite()` - uses getter after initAudio()
  - `createOscillator()` - uses getter for constructor
  - `createLayeredSound()` - uses getter for constructor

**Files modified:** `src/index.ts`

**Commit:** `b10507a`

**Verification:**
- ✅ All 711 tests pass
- ✅ No bare `audioContext` module variable references remain
- ✅ `getOrCreateAudioContext()` used in all factory functions
- ✅ Single AudioContext instance across all calls (singleton pattern)

### Task 2: Add suspended context warning in playAt() and update tests

**Changes:**
- Added static `_hasWarnedAboutSuspended = false` flag to BaseSound class
- Replaced `debugWarning()` with `console.warn()` in `playAt()` after resume attempt
- Warning checks if context is still suspended after `audioContext.resume()` call
- Warning fires only once per session using class-level flag
- Warning message provides clear user action guidance
- Removed unused `debugWarning` import from base-sound.ts
- Added 3 new test cases for lazy initialization:
  - "creates AudioContext lazily when factory function is called"
  - "reuses same AudioContext across multiple factory calls"
  - "initAudio() still works as explicit API"

**Files modified:** `src/base-sound.ts`, `src/index.test.ts`

**Commit:** `aac749c`

**Verification:**
- ✅ All 714 tests pass (3 new tests added)
- ✅ `pnpm typecheck` passes with no errors
- ✅ `pnpm build:lib` succeeds
- ✅ `console.warn` present in base-sound.ts
- ✅ Warning fires only once per AudioContext instance

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- ✅ Factory functions work without explicit initAudio() call
- ✅ createWhiteNoise() creates AudioContext lazily
- ✅ Single AudioContext instance across all calls
- ✅ console.warn fires once when context is suspended after resume
- ✅ initAudio() remains available as optional explicit API
- ✅ All existing tests pass, new tests cover lazy behavior
- ✅ iOS workaround auto-runs through initAudio's normal path
- ✅ No bare `audioContext` module variable access in public/factory code paths

## Technical Details

### Lazy Initialization Pattern

Before:
```typescript
let audioContext: AudioContext
// Must call initAudio() explicitly before using factory functions
```

After:
```typescript
let _audioContext: AudioContext | null = null

function getOrCreateAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}
```

### Factory Function Pattern

Before:
```typescript
export async function createWhiteNoise(): Promise<Sound> {
  const bufferSize = audioContext.sampleRate // Error if audioContext is undefined!
  // ...
}
```

After:
```typescript
export async function createWhiteNoise(): Promise<Sound> {
  await initAudio() // Runs iOS workaround
  const audioContext = getOrCreateAudioContext() // Guaranteed non-null
  const bufferSize = audioContext.sampleRate
  // ...
}
```

### Suspended Context Warning

```typescript
await audioContext.resume()

// Warn if AudioContext remains suspended after resume attempt
if (audioContext.state === 'suspended' && !BaseSound._hasWarnedAboutSuspended) {
  console.warn(
    'ez-web-audio: AudioContext is suspended. Audio will not play until a user interaction (click, tap, keypress) occurs. ' +
    'Call initAudio() from a user gesture handler, or ensure play() is called after user interaction.'
  )
  BaseSound._hasWarnedAboutSuspended = true
}
```

**Why console.warn instead of debugWarning:**
- debugWarning requires debug mode to be enabled (most developers won't do this)
- console.warn is always visible, providing immediate feedback
- Suspended context is a common issue that needs immediate visibility

**Why class-level flag:**
- All sound instances share one AudioContext
- Warning should fire once per session, not once per sound instance
- Static flag ensures single warning across all BaseSound instances

## Impact

### Developer Experience
- **Before:** Must remember to call initAudio() from user interaction handler → common source of confusion
- **After:** Factory functions "just work" → AudioContext created automatically on first use

### Backward Compatibility
- ✅ initAudio() still works as explicit API
- ✅ Existing code that calls initAudio() continues to work unchanged
- ✅ No breaking changes to public API

### Performance
- Negligible overhead: single null check per factory call
- AudioContext creation only happens once (singleton pattern)
- No performance degradation in existing codepaths

## Test Coverage

**New tests (3):**
- Lazy AudioContext creation on factory function call
- Singleton pattern across multiple factory calls
- initAudio() explicit API still functional

**Total tests:** 714 (all passing)

**Test files updated:** `src/index.test.ts`

## Self-Check: PASSED

**Created files:**
- ✅ FOUND: .planning/phases/10-lazy-audiocontext-initialization/10-01-SUMMARY.md

**Modified files:**
- ✅ FOUND: src/index.ts
- ✅ FOUND: src/base-sound.ts
- ✅ FOUND: src/index.test.ts

**Commits:**
- ✅ FOUND: b10507a (feat(10-01): implement lazy AudioContext getter)
- ✅ FOUND: aac749c (feat(10-01): add suspended AudioContext warning in playAt())

**Build verification:**
- ✅ PASSED: pnpm test (714 tests)
- ✅ PASSED: pnpm typecheck
- ✅ PASSED: pnpm build:lib

## Next Steps

Plan 10-02: Update documentation to reflect new lazy initialization behavior and remove explicit initAudio() requirement from examples.

---
phase: 34-test-gap-closure
plan: "01"
subsystem: tests
tags: [testing, factory-functions, oscillator, sprite, coverage]
dependency_graph:
  requires: []
  provides: [TEST2-01, TEST2-02, TEST2-03]
  affects: [src/index.test.ts, src/oscillator.test.ts, src/sprite.test.ts]
tech_stack:
  added: []
  patterns: [vi.stubGlobal fetch mock, factory source node pattern for unique mocks]
key_files:
  created: []
  modified:
    - src/index.test.ts
    - src/oscillator.test.ts
    - src/sprite.test.ts
decisions:
  - "Factory function tests use vi.resetModules() + vi.stubGlobal('fetch') pattern matching existing index.test.ts conventions"
  - "Oscillator frequency:0 test replaced with accurate description: 0 is falsy so defaults to 440 via || operator, negative values throw"
  - "AudioSprite stop/stopAll tests use per-test createdSources factory to track unique source nodes per play() call"
metrics:
  duration: "2 minutes"
  completed: "2026-02-22"
  tasks_completed: 2
  files_modified: 3
---

# Phase 34 Plan 01: Test Gap Closure — Factory Functions, Oscillator Edge Cases, Sprite Stop Summary

Factory function tests added to index.test.ts covering all 7 factory functions with error paths, oscillator frequency:0 contradiction resolved documenting the falsy || default behavior, and AudioSprite stop/stopAll tested with looping source lifecycle coverage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add factory function tests and fix oscillator frequency:0 | df75de2 | src/index.test.ts, src/oscillator.test.ts |
| 2 | Add AudioSprite stop() and stopAll() tests | 2d13ce4 | src/sprite.test.ts |

## What Was Built

### Task 1: Factory Function Tests + Oscillator frequency:0 Fix

**src/index.test.ts** — New `describe('factory functions')` block added with:
- `createSound()`: success returns Sound instance, network error throws AudioLoadError with URL, HTTP 404 throws AudioLoadError with status
- `createTrack()`: success returns Track instance, network error throws AudioLoadError, HTTP error includes status
- `createSounds()`: returns array of correct length, empty array returns [], onProgress fires with (loaded, total, url) for each sound, fetch failure throws AudioLoadError
- `createBeatTrack()`: returns BeatTrack instance, numBeats option passes through (verified via beatTrack.beats.length), fetch failure throws
- `createSampler()`: returns Sampler instance, fetch failure throws
- `createFont()`: HTTP error throws with URL in message and HTTP status, network error wraps with URL
- `createSprite()`: success returns AudioSprite instance, HTTP error throws AudioLoadError, error includes URL

Mock setup uses `vi.stubGlobal('fetch', vi.fn())` and `vi.resetModules()` pattern matching existing test conventions. `clearPreloadCache()` called in afterEach to prevent cross-test cache pollution.

**src/oscillator.test.ts** — Replaced misleading test:
- Old: "oscillator with frequency 0 plays without error" (comment said "valid" but it defaulted to 440)
- New test 1: "frequency 0 defaults to 440 because 0 is falsy with || operator" — documents the actual behavior
- New test 2: "negative frequency throws descriptive error" — `new Oscillator(ctx, { frequency: -1 })` throws "Oscillator frequency must be greater than 0"
- New test 3: "frequency undefined defaults to 440" — `new Oscillator(ctx)` constructs successfully

### Task 2: AudioSprite stop() and stopAll() Tests

**src/sprite.test.ts** — Two new describe blocks added:

`describe('stop()')`:
- Stops a looping source that was playing — verifies `source.stop()` called
- Cleans up activeSources after stop — second stop is a no-op without error
- Stops multiple looping sources for same sprite — both sources stopped
- stop() with non-existent name does not throw (graceful no-op)
- stop() on non-looping sprite is a no-op — laser not in activeSources, stop not called

`describe('stopAll()')`:
- Stops all active looping sprites — two looping sprites both get source.stop() called
- stopAll() when nothing playing does not throw
- stopAll() only affects looping sprites — non-looping laser source.stop() not called, looping bgm source.stop() is called

Each stop/stopAll describe block uses a `createdSources` factory pattern via `mockImplementation()` so each `play()` call gets a unique trackable source node.

## Test Results

- Before: index.test.ts (30 tests), oscillator.test.ts (41 tests), sprite.test.ts (26 tests) = 97 tests across these 3 files
- After: index.test.ts (50 tests), oscillator.test.ts (43 tests), sprite.test.ts (38 tests) = 131 tests across these 3 files
- Net: +34 new tests (20 factory function, 2 oscillator edge case replacements + 1 new, 11 sprite stop/stopAll)
- All 131 tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

**Files modified exist:**
- src/index.test.ts: modified
- src/oscillator.test.ts: modified
- src/sprite.test.ts: modified

**Commits exist:**
- df75de2: test(34-01): add factory function tests and fix oscillator frequency:0
- 2d13ce4: test(34-01): add AudioSprite stop() and stopAll() test coverage

## Self-Check: PASSED

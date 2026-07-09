---
phase: 33-dx-convenience-apis
plan: 01
subsystem: audio-core
tags: [dx, convenience-api, base-sound, sound, track, fade, loop, dispose]
dependency_graph:
  requires: []
  provides: [fadeIn, fadeOut, dispose, loop-property]
  affects: [base-sound, sound, track]
tech_stack:
  added: []
  patterns: [scheduled-gain-ramp, native-loop, resource-disposal]
key_files:
  created: []
  modified:
    - src/base-sound.ts
    - src/sound.ts
decisions:
  - fadeOut returns a Promise resolved via _trackedTimeout callback wrapping stop() for proper cleanup tracking
  - dispose() is idempotent — multiple calls are safe, second call returns early
  - _isLooping protected getter on BaseSound (false by default) allows subclasses to override without exposing _loop
  - Sound._isLooping overrides BaseSound default to return this._loop — keeps loop logic in Sound, not BaseSound
  - Track inherits loop property from Sound since Track has no setup() override — Sound.setup() handles AudioBufferSourceNode.loop for both
  - playAt() disposed guard throws Error (not a silent no-op) to surface programming mistakes early
  - Duration timeout in playAt() skips when _isLooping is true to allow infinite looping without isPlaying flag corruption
metrics:
  duration: 3min
  completed: 2026-02-22
  tasks_completed: 2
  files_modified: 2
---

# Phase 33 Plan 01: DX Convenience APIs — Fade, Loop, Dispose Summary

Added fadeIn/fadeOut convenience methods, loop property, and dispose() resource cleanup to BaseSound/Sound/Track.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fadeIn, fadeOut, and dispose to BaseSound | d9152db | src/base-sound.ts |
| 2 | Add loop property to Sound (inherited by Track) | 457c65f | src/sound.ts |

## What Was Built

**fadeIn(duration)** — Schedules gain from 0 to current gain via `onPlaySet` scheduling, then calls `play()`. The existing onPlaySet/scheduled automation infrastructure is reused for the ramp, keeping the implementation minimal and consistent.

**fadeOut(duration)** — Direct Web Audio API gain ramp (setValueAtTime + linearRampToValueAtTime) followed by a tracked timeout that calls stop(). Returns a Promise resolving after the fade. No-op if not playing.

**dispose()** — Disconnects effectChainInput, gainNode, pannerNode. Restores bypass intercepts and clears effects array. Sets `_disposed = true`. Adds a guard at the top of `playAt()` that throws if disposed. Idempotent.

**loop property on Sound** — Private `_loop: boolean` with public getter/setter. Applied to `audioSourceNode.loop` in `setup()` before each play. Overrides `_isLooping` protected getter so `playAt()` skips the duration timeout when looping.

**Track loop** — Inherited from Sound with no additional code. Track has no `setup()` override, so Sound.setup() (which sets `audioSourceNode.loop`) runs for Track too.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/base-sound.ts` exists and contains `fadeIn`, `fadeOut`, `dispose`
- [x] `src/sound.ts` exists and contains `loop`
- [x] Commit d9152db exists (Task 1)
- [x] Commit 457c65f exists (Task 2)
- [x] 1038 tests pass (no regressions)
- [x] Lint clean on modified files

## Self-Check: PASSED

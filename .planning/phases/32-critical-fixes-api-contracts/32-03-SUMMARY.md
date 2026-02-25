---
phase: 32-critical-fixes-api-contracts
plan: 03
status: complete
date: 2026-02-22
---

## Summary

Fixed two bugs: AudioSprite loop behavior and stale setTimeout _isPlaying corruption.

### AudioSprite loop fix (src/sprite.ts)

**Problem:** When `sprite.loop = true`, the `source.start(time, offset, duration)` call passed a `duration` argument which causes the Web Audio API to stop the source after that duration regardless of the loop property.

**Fix:** Conditionally omit the duration argument when looping. When `sprite.loop` is true:
- Set `source.loop = true`, `source.loopStart = offset`, `source.loopEnd = sprite.end`
- Call `source.start(time, offset)` without duration
- Non-looping sprites still pass `duration` as before

### Stale setTimeout _isPlaying fix (src/base-sound.ts)

**Problem:** `playAt()` used `this.setTimeout()` to schedule `_isPlaying = true` (for future plays) and `_isPlaying = false` (after duration), but timeout IDs were never stored. If `stop()` then `play()` were called quickly, old timeouts could fire and corrupt `_isPlaying` state.

**Fix:**
1. Added `clearTimeout` property alongside `setTimeout` on BaseSound (from same `audioContextAwareTimeout` call)
2. Added `BaseSoundOptions.clearTimeout` for custom implementations
3. Added `_pendingTimeoutIds: number[]` to track all timeout IDs
4. Added `_trackedTimeout()` helper that wraps `setTimeout` and records the ID
5. Added `_cancelPendingTimeouts()` to clear all pending timeouts
6. `playAt()` calls `_cancelPendingTimeouts()` at the start to clear stale timeouts
7. `stop()` closure calls `_cancelPendingTimeouts()` before resetting state
8. All `this.setTimeout()` calls in `playFor`, `playAt`, `stopAt`, and `later` replaced with `this._trackedTimeout()`

## Verification

- `pnpm typecheck` passes
- `pnpm test` passes (1038 tests, 0 failures)
- `_pendingTimeoutIds` and `_cancelPendingTimeouts` present in base-sound.ts
- Sprite loop conditional present in sprite.ts

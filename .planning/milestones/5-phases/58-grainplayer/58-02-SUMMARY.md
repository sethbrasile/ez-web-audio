# Phase 58, Plan 02: Public API Exports — Summary

**Status:** Complete
**Completed:** 2026-02-28

## What was built

Wired GrainPlayer into the library's public API via `src/index.ts`:

- `createGrainPlayer(buffer, options?)` factory function with full JSDoc documentation
- `GrainPlayer` class exported as value
- `GrainPlayerOptions` and `GrainPlayerEventMap` exported as types
- Factory function follows established pattern: `await initAudio()` then construct

### Files modified
- `src/index.ts` — Added import, factory function, value export, type exports

## Decisions made
- Factory function signature: `createGrainPlayer(buffer: AudioBuffer, options?: GrainPlayerOptions)` — takes a pre-decoded AudioBuffer (not a URL), since GrainPlayer operates on buffer data
- JSDoc includes prominent note about playbackRate-based pitch shifting limitation
- Placed alphabetically in all export blocks (between G entries)

## Self-Check: PASSED
- [x] TypeScript compiles cleanly
- [x] Library builds successfully (`pnpm build:lib`)
- [x] All grain-player tests pass (71/71)
- [x] No regressions in other tests (5 pre-existing crossfade failures unrelated)

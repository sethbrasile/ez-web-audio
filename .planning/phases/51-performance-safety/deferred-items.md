# Phase 51 Deferred Items

## Pre-existing Unstaged Changes (Out of Scope for 51-02)

These files have unstaged changes from prior plan work that need to be committed/addressed:

### src/sprite.ts, src/sprite.test.ts, src/utils/crossfade.ts
- Origin: Appears to be from Phase 51-01 or a related plan
- Issue: `src/sprite.test.ts` has tests expecting optimized behavior (skip gain/panner when default values) that doesn't match current `src/sprite.ts`
- Failing tests: `wires nodes correctly: source -> gain -> pan -> destination`, `disconnects nodes when onended fires`
- These are not caused by 51-02 changes

### src/sound.test.ts (unstaged PERF-02/PERF-04 tests)
- Origin: Phase 51-01
- Issue: `returns 0 when buffer is null` test fails because `AudioBufferSourceNodeMock` doesn't support `null` buffer assignment
- Workaround needed: Use `Object.defineProperty` or spy instead of direct assignment

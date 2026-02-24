---
status: passed
phase: 42
phase_name: Source Code Correctness Bugs
verified_at: 2026-02-24
---

# Phase 42: Source Code Correctness Bugs — Verification

## Goal
Fix real bugs where audio behavior doesn't match user intent — gain reset, stale controller references, iOS init ordering, and cache safety.

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Oscillator preserves user-set gain value across play() calls | PASS | `src/oscillator.ts:289` captures `gainNode.gain.value` before cancel; 4 regression tests |
| 2 | Sound.setup() updates controller with new AudioBufferSourceNode | PASS | `src/sound.ts:122` calls `controller.updateAudioSource(audioSourceNode)`; 2 regression tests |
| 3 | load() calls initAudio() before any AudioContext usage including cache-hit path | PASS | `src/index.ts:770` — `await initAudio()` is first statement in load(), before `getOrCreateAudioContext()` |
| 4 | Cache eviction runs after every responseCache.set() in load() and createSprite() | PASS | `src/index.ts:800` and `src/index.ts:635` — `evictIfNeeded()` after each `setInCache()` |
| 5 | responseCache is not directly exported as a mutable Map | PASS | `src/preload.ts:14` — `const responseCache = new Map<>()` (no export); access via `getFromCache/setInCache/hasInCache` |

## Requirements Traceability

| Requirement | Plan | Status |
|-------------|------|--------|
| BUG-01 (Oscillator gain reset) | 42-01 | Resolved |
| BUG-02 (Sound controller update) | 42-01 | Resolved |
| BUG-03 (iOS init ordering) | 42-02 | Resolved |
| BUG-04 (Missing cache eviction) | 42-02 | Resolved |
| BUG-05 (Exported mutable cache) | 42-02 | Resolved |

## Test Results

- **Unit tests:** 1119 passed, 0 failed
- **Typecheck:** Clean (no errors)
- **New regression tests:** 6 added (4 gain preservation, 2 controller update)

## Conclusion

All 5 success criteria verified against the codebase. All 5 bug requirements resolved with regression tests. Phase goal achieved.

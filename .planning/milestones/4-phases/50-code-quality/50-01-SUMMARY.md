---
phase: 50-code-quality
plan: "01"
subsystem: controllers
tags: [refactor, deduplication, gain-sync, param-controller]
dependency_graph:
  requires: []
  provides: [REFAC-01, REFAC-02]
  affects: [src/oscillator.ts, src/controllers/base-param-controller.ts, src/controllers/sound-controller.ts, src/controllers/oscillator-controller.ts]
tech_stack:
  added: []
  patterns: [template-method, protected-hook]
key_files:
  created: []
  modified:
    - src/oscillator.ts
    - src/controllers/base-param-controller.ts
    - src/controllers/sound-controller.ts
    - src/controllers/oscillator-controller.ts
decisions:
  - "Typed AudioSource.detune as AudioParam (not {value:number}) since both OscillatorNode and AudioBufferSourceNode expose it as full AudioParam"
  - "Added audioSource sync in updateAudioSource() for both subcontrollers so resolveParam() uses fresh nodes across play() calls"
  - "resolveParam() template method pattern — base handles gain/pan/detune, OscillatorController overrides to add frequency"
metrics:
  duration: "2 minutes"
  completed: "2026-02-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 50 Plan 01: Gain Interception & Controller Deduplication Summary

**One-liner:** Single-source gain sync via BaseSound.update() + template-method resolveParam() in BaseParamController eliminates two sets of duplicated switch blocks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract gain-interception into single BaseSound.update() (REFAC-01) | 655e58a | src/oscillator.ts |
| 2 | Extract applyValues/applyRampValues into BaseParamController (REFAC-02) | 7e36e6b | src/controllers/base-param-controller.ts, sound-controller.ts, oscillator-controller.ts |

## What Was Built

**REFAC-01 — Gain interception consolidation (Task 1):**

`Oscillator.update()` previously duplicated the entire gain-interception block from `BaseSound.update()` (identical `_targetGain` sync logic for ratio/percent/inverseRatio). The fix: `Oscillator.update()` now checks `if (type === 'frequency')` and routes to the controller directly; all other types (gain, pan, detune) delegate to `super.update()` which owns the `_targetGain` sync. Net removal: 23 lines of duplicated logic.

**REFAC-02 — Parameter application consolidation (Task 2):**

Both `SoundController` and `OscillatorController` had private `applyValues()` and `applyRampValues()` methods that were nearly identical switch statements. Extracted to `BaseParamController` using the template-method pattern:

- `resolveParam(type: ControlType): AudioParam` — maps a type to its AudioParam; subclasses override to extend
- `applyValues(values, currentTime)` — calls `resolveParam()` then `setValueAtTime()`
- `applyRampValues(values, currentTime, rampType)` — calls `resolveParam()` then `applyRampToParam()`

`OscillatorController` overrides `resolveParam()` to handle `'frequency'` before calling `super.resolveParam()` for the rest. Both subcontrollers now also sync `this.audioSource` in `updateAudioSource()` so the base's `resolveParam('detune')` always accesses the current node.

The `AudioSource` duck-type interface was updated from `detune: { value: number }` to `detune: AudioParam` since both `OscillatorNode.detune` and `AudioBufferSourceNode.detune` are full `AudioParam` instances.

## Verification Results

```
pnpm test run    → 1219 tests passed (47 test files)
pnpm typecheck   → no errors
grep _targetGain src/oscillator.ts  → appears only in comment and setup() (not update())
grep private applyValues src/controllers/  → no matches
```

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] Sync audioSource in updateAudioSource()**
- **Found during:** Task 2
- **Issue:** Both `SoundController.updateAudioSource()` and `OscillatorController.updateAudioSource()` updated their local node fields but not `BaseParamController.audioSource`. When `resolveParam('detune')` is called after a node refresh (e.g., on second play()), it would use the stale original node.
- **Fix:** Added `this.audioSource = this.bufferSourceNode` / `this.audioSource = this.oscillator` in each `updateAudioSource()` implementation.
- **Files modified:** sound-controller.ts, oscillator-controller.ts
- **Commit:** 7e36e6b

## Self-Check: PASSED

- [x] `src/oscillator.ts` — modified, no `_targetGain` in `update()` body
- [x] `src/controllers/base-param-controller.ts` — contains `resolveParam`, `applyValues`, `applyRampValues`
- [x] `src/controllers/sound-controller.ts` — no private `applyValues`/`applyRampValues`
- [x] `src/controllers/oscillator-controller.ts` — no private `applyValues`/`applyRampValues`, has `resolveParam` override
- [x] Commit 655e58a exists (Task 1)
- [x] Commit 7e36e6b exists (Task 2)

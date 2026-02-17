---
phase: 22-demo-app-release
plan: 01
subsystem: docs
tags: [api-migration, demo-components, vitepress, vue]
dependency_graph:
  requires: []
  provides: [consistent-api-demos, context-free-factory-examples]
  affects: [docs]
tech_stack:
  added: []
  patterns: [context-free-factories, fluent-as-api, addEffects-batch]
key_files:
  modified:
    - docs/.vitepress/theme/components/TrackDemo.vue
    - docs/.vitepress/theme/components/VisualizationDemo.vue
    - docs/.vitepress/theme/components/XYPad.vue
    - docs/.vitepress/theme/components/AmbientGenerator.vue
    - docs/.vitepress/theme/components/FilterDemo.vue
    - docs/.vitepress/theme/components/SynthDrumKit.vue
    - docs/examples/effects.md
    - docs/examples/synth-drum-kit.md
    - docs/examples/synthesis.md
    - docs/examples/ambient-generator.md
decisions:
  - ".as() is the correct API for update/seek type hints (not .from() which is reserved for onPlayRamp value-from semantics)"
  - "createFilterEffect/createGainEffect are context-free — AudioContext resolved internally"
  - "addEffects([]) batch replaces consecutive addEffect() calls in SynthDrumKit hi-hat"
metrics:
  duration: 5min
  completed: 2026-02-17
  tasks_completed: 3
  files_modified: 10
---

# Phase 22 Plan 01: API Migration — Vue Components and Markdown Examples Summary

All Vue demo components and VitePress markdown example files updated to use the 1.0 API exclusively: `.as()` on update/seek chains, context-free effect factories, and `addEffects()` batch API.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Replace `.from()` with `.as()` on all update/seek chains in Vue components | `3b9833c` |
| 2 | Adopt context-free `createFilterEffect()` and `addEffects()` batch in Vue components | `f5d4fb0` |
| 3 | Update VitePress markdown examples to use context-free effect factories | `2cf5a8e` |

## What Was Done

### Task 1: .from() to .as() Replacements (7 sites)

Replaced all `.from('string')` calls on `update().to()` and `seek()` chains with `.as('string')`. The `.from()` method on `onPlayRamp()` chains was intentionally left unchanged — those mean "from value X" and are semantically different.

Files changed:
- **TrackDemo.vue**: `seek().from('seconds')` → `seek().as('seconds')`
- **VisualizationDemo.vue**: `update('frequency').to().from('number')` → `.as('number')`
- **XYPad.vue**: two `update().from('ratio')` → `.as('ratio')`
- **AmbientGenerator.vue**: two `update().from('number')` → `.as('number')`
- **FilterDemo.vue**: `update('gain').to().from('ratio')` → `.as('ratio')`

### Task 2: Context-Free Factories and addEffects Batch

**FilterDemo.vue**: Removed `ctx = await lib.getAudioContext()` in both `playSound()` and the `filterType` watcher. All `createFilterEffect(ctx, ...)` → `createFilterEffect(...)`.

**AmbientGenerator.vue**: Removed `audioContext` module-level variable, removed `getAudioContext` from import, dropped `audioContext = await getAudioContext()` call. `createFilterEffect(audioContext, ...)` → `createFilterEffect(...)`.

**SynthDrumKit.vue**:
- `createSnareCrack()`: removed `ctx = await lib.getAudioContext()`, `createFilterEffect(ctx, 'highpass', ...)` → `createFilterEffect('highpass', ...)`
- `playHiHat()`: removed `ctx = await lib.getAudioContext()`, two `createFilterEffect(ctx, ...)` calls → context-free
- Replaced two consecutive `osc.addEffect(highpass)` + `osc.addEffect(bandpass)` with `osc.addEffects([highpass, bandpass])`

### Task 3: Markdown Examples — Context-Free Factories

Updated all code blocks in the example pages to remove the `ctx`/`audioContext` first argument from `createFilterEffect()` and `createGainEffect()` calls. Also removed `getAudioContext()` calls that were only used to obtain context for these factory functions. Context was preserved where still needed for other operations (e.g., `createAnalyzer(ctx, ...)`, `wrapEffect(ctx, ...)`, `new Tuna(ctx)`).

Affected examples:
- **effects.md**: 18+ `createFilterEffect(ctx, ...)` and `createGainEffect(ctx, ...)` → context-free. Removed `getAudioContext` imports where no longer needed.
- **synth-drum-kit.md**: 3 `createFilterEffect(ctx, ...)` → context-free in snare and hi-hat examples
- **synthesis.md**: 1 `createFilterEffect(ctx, ...)` → context-free in "Adding Filters" section
- **ambient-generator.md**: 1 `createFilterEffect(audioContext, ...)` → context-free, removed `getAudioContext` import

## Verification

- `grep -rn ".from('[\"']" docs/.vitepress/theme/components/ | grep -v onPlayRamp` → 0 results
- `grep -rn "createFilterEffect(ctx" docs/.vitepress/theme/components/ docs/examples/` → 0 results
- `grep -rn "createGainEffect(ctx" docs/examples/` → 0 results
- `pnpm typecheck` → passes (no errors)
- `pnpm build` → passes (lib + docs build complete in 6.94s)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files modified exist:
- docs/.vitepress/theme/components/TrackDemo.vue: FOUND
- docs/.vitepress/theme/components/FilterDemo.vue: FOUND
- docs/.vitepress/theme/components/SynthDrumKit.vue: FOUND
- docs/examples/effects.md: FOUND
- docs/examples/synth-drum-kit.md: FOUND

Commits exist:
- 3b9833c: FOUND (feat(22-01): replace .from() with .as())
- f5d4fb0: FOUND (feat(22-01): adopt context-free createFilterEffect())
- 2cf5a8e: FOUND (feat(22-01): update VitePress markdown examples)

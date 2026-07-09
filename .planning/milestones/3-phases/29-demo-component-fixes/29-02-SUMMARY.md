---
phase: 29-demo-component-fixes
plan: "02"
subsystem: demo-components
tags: [touch-events, mobile-ux, audio-cleanup, piano-keyboard, soundfont]
dependency_graph:
  requires: []
  provides: [touch-slide-support, soundfont-cleanup]
  affects: [PianoKeyboard.vue, SoundfontPiano.vue, AmbientGenerator.vue]
tech_stack:
  added: []
  patterns: [elementFromPoint-touch-tracking, ref-based-note-tracking, font-notes-cleanup]
key_files:
  created: []
  modified:
    - docs/.vitepress/theme/components/PianoKeyboard.vue
    - docs/.vitepress/theme/components/SoundfontPiano.vue
decisions:
  - "Font.notes (public array) used directly in cleanup instead of getNotes() — Font has no getNotes() method"
  - "AmbientGenerator.vue confirmed correct — textureFilter.frequency setter assignment requires no change"
  - "Single-line if returns expanded to block form per antfu/if-newline ESLint rule"
metrics:
  duration: "2min"
  completed: 2026-02-21
  tasks_completed: 2
  files_modified: 2
requirements: [SC-03, SC-04, SC-10]
---

# Phase 29 Plan 02: Touch Handling and Cleanup Fixes Summary

Mobile touch sliding in PianoKeyboard now correctly emits noteOff/noteOn as finger slides between keys using elementFromPoint; SoundfontPiano cleanup now stops actively-playing SampledNote instances before disposing the Font reference.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix PianoKeyboard touchmove for sliding between keys | 05f33d4 | PianoKeyboard.vue |
| 2 | Verify AmbientGenerator filter proxy and fix SoundfontPiano cleanup | 5d6eea9 | SoundfontPiano.vue |

## What Was Built

### Task 1: PianoKeyboard Touch Slide Support

Added a `currentTouchNote` ref and `handleTouchMove` function to `PianoKeyboard.vue`. Previously, touch sliding from one key to another would leave the first note stuck playing (no `noteOff` emitted) and never trigger the new note. The fix:

- `currentTouchNote` ref tracks which note the finger is currently over
- `handleTouchStart` sets `currentTouchNote` before emitting `noteOn`
- `handleTouchMove` uses `document.elementFromPoint(touch.clientX, touch.clientY)` to find the key element under the finger, extracts the note from the aria-label, and emits `noteOff`/`noteOn` only when the note changes
- `handleTouchEnd` reads from `currentTouchNote` (no longer needs the note passed as arg)
- Template updated: `@touchmove.prevent="handleTouchMove"` added, `@touchend.prevent` no longer passes note arg

### Task 2: SoundfontPiano Cleanup + AmbientGenerator Verification

**AmbientGenerator.vue**: Confirmed `textureFilter.frequency = textureFilterCutoff.value` at line 172 is correct — uses the `FilterEffect.frequency` setter (established in Phase 23-03). No change needed.

**SoundfontPiano.vue**: Updated `onUnmounted` to iterate `font.notes` (the public array of `SampledNote` instances) and call `stop()` on any that have `isPlaying === true`. Also clears `activeNotes` set for UI consistency. The `Font` class has no `getNotes()` method — `notes` is the public accessor.

## Verification

- `pnpm typecheck`: passes
- `pnpm lint`: PianoKeyboard/SoundfontPiano clean; 4 pre-existing `concepts.md` errors (out of scope, deferred)
- `handleTouchMove` function present and bound in PianoKeyboard template
- SoundfontPiano cleanup iterates `font.notes` and calls `stop()` on playing notes

## Deviations from Plan

### Auto-fixed Issues

None.

### Verification Notes

1. `Font.getNotes()` mentioned in plan does not exist — `font.notes` is the correct public property (array). Used `font.notes as any[]` since `font` is typed as `any` in the component.
2. Pre-existing `concepts.md` ESLint errors logged to deferred items (not caused by this plan's changes).

## Deferred Items

- `docs/guide/concepts.md` has 4 `perfectionist/sort-named-imports` errors — pre-existing, out of scope for this plan.

## Self-Check: PASSED

- [x] `docs/.vitepress/theme/components/PianoKeyboard.vue` — modified
- [x] `docs/.vitepress/theme/components/SoundfontPiano.vue` — modified
- [x] Commit 05f33d4 exists: `feat(29-02): add touch slide support to PianoKeyboard`
- [x] Commit 5d6eea9 exists: `fix(29-02): stop playing notes and clear activeNotes in SoundfontPiano cleanup`

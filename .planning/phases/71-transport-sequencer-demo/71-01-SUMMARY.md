---
phase: 71-transport-sequencer-demo
plan: "01"
subsystem: docs-demos
tags: [transport, sequencer, beattrack, sequence, demo, vue, step-grid]
dependency_graph:
  requires: []
  provides: [transport-sequencer-demo-component, transport-sequencer-page]
  affects: [docs-sidebar, milestone-7-completion]
tech_stack:
  added: []
  patterns: [ensureLoaded-lazy-init, module-level-audio-instances, watch-based-sync, tick-driven-playhead]
key_files:
  created:
    - docs/.vitepress/theme/components/TransportSequencerDemo.vue
    - docs/examples/transport-sequencer.md
  modified:
    - docs/.vitepress/config.mts
decisions:
  - "Tick handler drives currentStep via ((bar-1)*16)+((beat-1)*4)+tick % 32 — same formula as plan specified"
  - "shouldPlay() callback guard for melody tracks; BeatTrack.muted/solo for drum tracks"
  - "applyPreset() calls bassSeq.clear()/pianoSeq.clear() then re-registers events — safe during playback"
  - "stepCells computed property maps preset note arrays to 32-step grid for melody row note name display"
  - "freqToNoteName() lookup table converts oscillator frequency to readable note name in grid cells"
  - "Bar divider via .bar-divider CSS class on step 17 (index 16) with left border instead of separate element"
metrics:
  duration_seconds: 228
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_changed: 3
---

# Phase 71 Plan 01: Transport + Sequencer Demo Summary

**One-liner:** Multi-track Transport+Sequence demo with 5 tracks, 32-step CSS grid playhead, mute/solo, and 3 musical presets (straight rock, funk, triplets).

## What Was Built

Created `TransportSequencerDemo.vue` — the final Milestone 7 feature demo. The component shows the Transport clock, BeatTrack.syncTo, and Sequence.at() musical time notation all working together in a cohesive interactive UI.

### Component Architecture

- **Module-level audio instances**: `transport`, `kickTrack`, `snareTrack`, `hihatTrack`, `bassOsc`, `pianoFont`, `bassSeq`, `pianoSeq`, `audioContext` all live outside reactive state
- **Lazy init**: `ensureLoaded()` called on first Play click — no load button, fully visible on page load
- **tick event → playhead**: `transport.on('tick', ...)` computes `((bar-1)*16)+((beat-1)*4)+tick % 32` → `currentStep.value`
- **Preset switching**: `applyPreset(name)` updates drum patterns via `setPattern()` and re-registers melody callbacks via `seq.clear()` + `seq.at()`
- **Mute/solo**: `BeatTrack.muted/solo` for drums; `shouldPlay()` callback guard for melody tracks

### 3 Presets

| Preset | Feel | Time Notation |
|--------|------|---------------|
| Straight Rock | 4/4 straight 8ths/quarters | `'2n'`, `'1m'`, `'1:1:0'` |
| Funk Groove | 16th-note syncopation | `'1:2:2'`, `'2:3:0'`, fractional beats |
| Triplet Feel | Swung triplet feel | `1/3`, `4/3`, `8/3` beat values |

### Step Grid

- 32 cells per track × 5 tracks = 160 step cells total
- Drum rows: filled `#555` background when active, transparent otherwise
- Melody rows: `#3a5a8a` background when active, note name shown (`C4`, `E4`, etc.)
- Playhead: yellow `outline: 2px solid #f90` on `currentStep` column
- Bar divider: `border-left: 2px solid var(--vp-c-brand)` at step 17 (bar 2 start)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `TransportSequencerDemo.vue`: 953 lines (min 200)
- `pnpm typecheck`: PASSED (no errors)
- `pnpm exec playwright test e2e/demos.spec.ts`: 19/19 PASSED (no regressions)
- `grep "transport-sequencer" docs/.vitepress/config.mts`: entry found in Timing & Sequencing section
- Component renders fully on page load (no load button)

## Self-Check: PASSED

- [x] docs/.vitepress/theme/components/TransportSequencerDemo.vue — EXISTS
- [x] docs/examples/transport-sequencer.md — EXISTS
- [x] Sidebar entry in docs/.vitepress/config.mts — EXISTS
- [x] Task 1 commit cb818af — EXISTS
- [x] Task 2 commit 32c37bd — EXISTS

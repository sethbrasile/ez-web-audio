---
phase: 35-documentation-expansion
plan: "01"
subsystem: docs
tags: [documentation, guide, vitepress, api-corrections]
dependency_graph:
  requires: []
  provides:
    - docs/guide/parameter-control.md
    - docs/guide/utilities.md
    - docs/guide/concepts.md (trimmed)
  affects:
    - docs/.vitepress/config.mts
    - docs/examples/synthesis.md
    - docs/examples/audio-routing.md
tech_stack:
  added: []
  patterns:
    - VitePress sidebar config
    - Markdown guide split pattern
key_files:
  created:
    - docs/guide/parameter-control.md
    - docs/guide/utilities.md
  modified:
    - docs/guide/concepts.md
    - docs/.vitepress/config.mts
    - docs/examples/synthesis.md
    - docs/examples/audio-routing.md
decisions:
  - concepts.md trimmed to 245 lines by consolidating How Sound Works and Track Position Tracking into parent sections, tightening Other Sound Types examples, and condensing AudioContext lifecycle section
  - parameter-control.md (151 lines) covers immediate update(), onPlaySet(), onPlayRamp(), patterns, and ControlType augmentation
  - utilities.md (198 lines) covers collection control, synchronized playback, batch loading, crossfade, preloading, cache, debug, and interaction helpers
  - synthesis.md changeFrequencyTo() replaced with update('frequency').to().as('ratio') — fluent API is the recommended pattern
  - audio-routing.md all 4 wrapEffect(ctx, node) calls changed to wrapEffect(node) 1-arg form, including API Used summary section
metrics:
  duration: "10min"
  completed: "2026-02-22"
  tasks: 2
  files: 6
---

# Phase 35 Plan 01: Guide Split and API Corrections Summary

Split the oversized concepts.md (693 lines) into three focused guide pages under ~250 lines each, and corrected two incorrect API examples in synthesis.md and audio-routing.md.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Split concepts.md into three focused guide pages | 3c3b9e4 | docs/guide/concepts.md, docs/guide/parameter-control.md, docs/guide/utilities.md, docs/.vitepress/config.mts |
| 2 | Fix incorrect API examples in synthesis.md and audio-routing.md | 72ccac5 | docs/examples/synthesis.md, docs/examples/audio-routing.md |

## Outcome

**concepts.md** trimmed from 693 → 245 lines. Covers: class hierarchy, Sound, Track, Oscillator (with waveform types and ADSR), AudioContext lifecycle, audio routing, events, and other sound types (Sampler, BeatTrack, LayeredSound, AudioSprite, WhiteNoise).

**parameter-control.md** (new, 151 lines) covers: immediate `update().to().as()`, scheduled `onPlaySet()` and `onPlayRamp()`, common patterns (fade in/out, pitch bend), and `ControlTypeMap` module augmentation.

**utilities.md** (new, 198 lines) covers: collection control (`pauseAll`/`playAll`/`stopAll`), `playTogether`, `createSounds`, `crossfade`, `preload`/`isPreloaded`, `clearPreloadCache`, `setDebugMode`/`setDebugHandler`, `useInteractionMethods`/`preventEventDefaults`.

**VitePress sidebar** updated to include "Parameter Control" and "Utilities" links in the Introduction group.

**synthesis.md** `changeFrequencyTo(523.25)` replaced with `update('frequency').to(523.25).as('ratio')` — fluent API is the recommended and consistent pattern.

**audio-routing.md** all 4 `wrapEffect(ctx, node)` calls updated to `wrapEffect(node)` 1-arg form (distortionNode, convolver, delay, chorus), and the API Used section signature updated accordingly.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- concepts.md: 245 lines (under 250)
- parameter-control.md: 151 lines (under 250)
- utilities.md: 198 lines (under 250)
- `changeFrequencyTo` in synthesis.md: 0 matches
- `wrapEffect(ctx` in audio-routing.md: 0 matches
- `parameter-control` in config.mts: 1 match
- `utilities` in config.mts: 1 match

## Self-Check: PASSED

Files exist:
- docs/guide/concepts.md — FOUND
- docs/guide/parameter-control.md — FOUND
- docs/guide/utilities.md — FOUND

Commits exist:
- 3c3b9e4 — FOUND (feat(35-01): split concepts.md)
- 72ccac5 — FOUND (fix(35-01): correct API examples)

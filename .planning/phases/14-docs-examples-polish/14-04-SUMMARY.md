---
phase: 14-docs-examples-polish
plan: 04
subsystem: documentation
tags: [guides, homepage, API-verification, code-examples]

dependency_graph:
  requires: []
  provides: [verified-guides, accurate-homepage]
  affects: [getting-started-guide, core-concepts-guide, homepage]

tech_stack:
  added: []
  patterns: [API-verification, documentation-accuracy]

key_files:
  created: []
  modified:
    - docs/guide/getting-started.md
    - docs/guide/concepts.md
    - docs/index.md

decisions:
  - Added utility functions section to Core Concepts (debug mode, crossfade, collections, white noise)
  - Fixed seek() API calls to use required fluent .from() syntax
  - Updated test count on homepage from 711 to 714 per STATE.md

metrics:
  duration_seconds: 385
  task_count: 1
  files_modified: 3
  completed_date: 2026-02-16
---

# Phase 14 Plan 04: Guide Pages & Homepage API Verification Summary

Updated guide pages and homepage for accuracy against current API with verified code examples.

## What Was Done

### Task 1: Verify and update Getting Started guide, Core Concepts, and homepage

**API Verification:**
- Verified all factory functions against src/index.ts exports
- Confirmed method signatures for createSound, createTrack, createOscillator, createSampler, createBeatTrack, createLayeredSound, createSprite, createWhiteNoise, createFont
- Verified fluent API syntax for parameter control (onPlaySet, onPlayRamp, update)
- Verified Track.seek() requires .from() method call

**Issues Fixed:**

1. **Getting Started guide** (docs/guide/getting-started.md):
   - Fixed `track.seek(30)` to `track.seek(30).from('seconds')` (line 80)
   - Verified AudioContext lifecycle documentation matches Phase 10 lazy initialization
   - Verified parameter control examples use correct API

2. **Core Concepts guide** (docs/guide/concepts.md):
   - Fixed `song.seek(60)` to `song.seek(60).from('seconds')` (line 71)
   - Added missing "Utility Functions" section covering:
     - Collection utilities (stopAll, pauseAll, playAll)
     - Crossfade utility
     - Debug mode (setDebugMode, setDebugHandler)
     - White noise generation (createWhiteNoise)
   - Verified all code examples against current API

3. **Homepage** (docs/index.md):
   - Updated test count from 711 to 714 (per STATE.md)

**Verification:**
- Build succeeded: `pnpm build` completed without errors
- All internal links verified (getting-started → concepts, concepts → examples)
- All code examples compile with current API signatures

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

**API Patterns Verified:**
- Factory functions all use `create*` pattern
- Lazy AudioContext initialization (no explicit initAudio() required)
- Fluent API for parameter control (update().to().from(), onPlaySet().to().endingAt())
- Track.seek() requires .from(type) call for unit specification

**Coverage Completeness:**
All major library features now documented in Core Concepts:
- Core sound types (Sound, Track, Oscillator)
- Advanced types (Sampler, BeatTrack, LayeredSound, AudioSprite, Font)
- Parameter control patterns
- Effect chains
- Events
- Utility functions (collections, crossfade, debug, white noise)

## Self-Check: PASSED

**Modified files exist:**
```bash
FOUND: docs/guide/getting-started.md
FOUND: docs/guide/concepts.md
FOUND: docs/index.md
```

**Commit exists:**
```bash
FOUND: d004aa7
```

**Build verification:**
```bash
pnpm build succeeded with no errors
```

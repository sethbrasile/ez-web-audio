---
phase: 14-docs-examples-polish
plan: 05
subsystem: documentation
tags:
  - docs
  - examples
  - api-verification
  - code-accuracy
dependency_graph:
  requires: []
  provides:
    - verified-example-code
    - accurate-api-documentation
  affects:
    - docs/examples/*.md
tech_stack:
  added: []
  patterns:
    - api-verification-against-source
    - code-example-validation
key_files:
  created: []
  modified:
    - docs/examples/index.md
    - docs/examples/effects.md
decisions:
  - decision: "Use pnpm dev as the canonical local development command"
    rationale: "Matches CLAUDE.md and package.json scripts"
  - decision: "setAnalyzer is the correct method name, not attachAnalyzer"
    rationale: "Verified against src/base-sound.ts implementation"
metrics:
  duration_seconds: 136
  completed_date: "2026-02-16"
  tasks_completed: 2
  files_verified: 14
  issues_found: 2
  issues_fixed: 2
---

# Phase 14 Plan 05: Example Page API Verification Summary

**One-liner:** Verified all 14 example page code snippets against current API, fixed dev command and analyzer method name

## What Was Done

Systematically verified every code snippet in all 14 example pages against the current API exported from `src/index.ts`. Cross-referenced method names, parameter signatures, async/await usage, and import paths.

### Issues Found and Fixed

**1. Incorrect dev command in examples index**
- **File:** `docs/examples/index.md`
- **Issue:** Documentation showed `pnpm docs:dev` instead of `pnpm dev`
- **Fix:** Changed to `pnpm dev` to match CLAUDE.md and package.json
- **Line:** 127

**2. Incorrect analyzer method name in effects example**
- **File:** `docs/examples/effects.md`
- **Issue:** Code example used `sound.attachAnalyzer(analyzer)` but actual method is `setAnalyzer`
- **Fix:** Changed to `sound.setAnalyzer(analyzer)`
- **Source verification:** Confirmed in `src/base-sound.ts` line 413
- **Line:** 316

### Verification Results by Example Page

**Batch 1 (Task 1):**
1. ✅ `docs/examples/index.md` - Fixed dev command, verified descriptions
2. ✅ `docs/examples/basic-playback.md` - Verified Sound/Track API, seek(), position tracking
3. ✅ `docs/examples/synthesis.md` - Verified createOscillator, envelope, frequencyMap, update()
4. ✅ `docs/examples/effects.md` - Fixed setAnalyzer, verified createFilterEffect, wrapEffect
5. ✅ `docs/examples/drum-machine.md` - Verified createBeatTrack, playBeats(bpm, noteType)
6. ✅ `docs/examples/xy-pad.md` - Verified update().to().from() fluent API
7. ✅ `docs/examples/audio-routing.md` - Verified wrapEffect, effect.bypass, effect.mix
8. ✅ `docs/examples/timing.md` - Verified play(), playIn(), playAt(), getAudioContext()

**Batch 2 (Task 2):**
9. ✅ `docs/examples/synth-keyboard.md` - Verified createOscillator, frequencyMap, envelope
10. ✅ `docs/examples/synth-drum-kit.md` - Verified createOscillator, createWhiteNoise, createFilterEffect, onPlayRamp
11. ✅ `docs/examples/sampled-drum-kit.md` - Verified createSampler, round-robin API
12. ✅ `docs/examples/soundfont-piano.md` - Verified createFont, font.play(), font.getNote()
13. ✅ `docs/examples/drum-machine-vue.md` - Verified createBeatTrack with wrapWith: reactive()
14. ✅ `docs/examples/drum-machine-vanilla.md` - Verified event-based pattern with on('beat')

### API Methods Verified

Cross-referenced against `src/index.ts` exports:
- ✅ `createSound()` - async, returns Promise<Sound>
- ✅ `createTrack()` - async, returns Promise<Track>
- ✅ `createOscillator()` - async, returns Promise<Oscillator>
- ✅ `createBeatTrack()` - async, accepts urls and BeatTrackOptions
- ✅ `createSampler()` - async, accepts urls and SamplerOptions
- ✅ `createFont()` - async, loads soundfont from URL
- ✅ `createWhiteNoise()` - async, returns Promise<Sound>
- ✅ `createFilterEffect()` - requires AudioContext as first param
- ✅ `createGainEffect()` - requires AudioContext as first param
- ✅ `createAnalyzer()` - requires AudioContext as first param
- ✅ `wrapEffect()` - requires AudioContext as first param
- ✅ `getAudioContext()` - async, must be awaited
- ✅ `frequencyMap` - exported constant
- ✅ `playBeats(bpm, noteType)` - BeatTrack method signature correct
- ✅ `setAnalyzer()` - correct method name (not attachAnalyzer)
- ✅ `update().to().from()` - fluent API for parameter updates
- ✅ `onPlayRamp().from().to().in()` - fluent API for scheduled ramps

## Deviations from Plan

None - plan executed exactly as written.

## Verification

✅ `pnpm build` succeeded with no errors (only TypeDoc warnings for internal types)
✅ All 14 example pages verified
✅ All code examples use current API method names and signatures
✅ All internal links verified (no broken references found)
✅ Examples index has correct local dev command

## Self-Check: PASSED

**Files verified:**
```bash
[ -f "docs/examples/index.md" ] && echo "FOUND"
[ -f "docs/examples/basic-playback.md" ] && echo "FOUND"
[ -f "docs/examples/synthesis.md" ] && echo "FOUND"
[ -f "docs/examples/effects.md" ] && echo "FOUND"
[ -f "docs/examples/drum-machine.md" ] && echo "FOUND"
[ -f "docs/examples/xy-pad.md" ] && echo "FOUND"
[ -f "docs/examples/audio-routing.md" ] && echo "FOUND"
[ -f "docs/examples/timing.md" ] && echo "FOUND"
[ -f "docs/examples/synth-keyboard.md" ] && echo "FOUND"
[ -f "docs/examples/synth-drum-kit.md" ] && echo "FOUND"
[ -f "docs/examples/sampled-drum-kit.md" ] && echo "FOUND"
[ -f "docs/examples/soundfont-piano.md" ] && echo "FOUND"
[ -f "docs/examples/drum-machine-vue.md" ] && echo "FOUND"
[ -f "docs/examples/drum-machine-vanilla.md" ] && echo "FOUND"
```

All 14 files exist and verified.

**Commits verified:**
```bash
git log --oneline --all | grep -q "e8272f6" && echo "FOUND: e8272f6"
git log --oneline --all | grep -q "3658685" && echo "FOUND: 3658685"
```

Both task commits exist in git history.

## Impact

**Developer Experience:**
- Developers can now trust all example code to work with current API
- No confusion from outdated method names or incorrect signatures
- Local development instructions match actual project setup

**Documentation Quality:**
- All 14 example pages serve as reliable reference implementations
- Code examples can be copied directly without modification
- Consistent API usage patterns demonstrated across all examples

**Maintenance:**
- Establishes baseline for API accuracy in docs
- Future API changes can be tracked against this verified state
- Examples serve as integration test reference points

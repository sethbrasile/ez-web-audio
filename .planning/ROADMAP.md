# Roadmap: EZ Audio v1

**Project:** EZ Web Audio Library
**Core Value:** Make the Web Audio API easy to use
**Depth:** Standard (8 phases)
**Created:** 2026-01-31

## Overview

EZ Audio v1 roadmap delivers a complete Web Audio API wrapper with advanced synthesis features (ADSR envelopes, effects presets, layered sounds) while maintaining zero dependencies and TypeScript-first simplicity. The phase structure follows a foundation-first approach where events and bug fixes establish stability, then advanced features build incrementally on proven patterns.

Research findings drive the phase order: Events system is foundational for all advanced features, ADSR requires events for testing, utility features are independent and can be built in parallel, and LayeredSound depends on all previous capabilities being stable.

## Phases

### Phase 1: Foundation

**Goal:** Users have a stable, well-tested event system and all critical bugs are resolved.

**Dependencies:** None (foundation work)

**Requirements:** EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, EVT-06, EVT-07, FIX-01, FIX-02, FIX-03, FIX-04, ERR-01, ERR-02, ERR-03, ERR-04

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Event types and custom error classes
- [x] 01-02-PLAN.md — Bug fixes (inheritance, RAF, memory leaks, duration)
- [x] 01-03-PLAN.md — Core event system (EventTarget, .on/.once/.off, emit)
- [x] 01-04-PLAN.md — Track events and error integration

**Success Criteria:**
1. User can subscribe to play/stop/end events on any Playable and receive typed event payloads
2. User can subscribe to pause/resume/seek events on Track instances
3. User can unsubscribe from events and subscriptions properly clean up
4. Track.play override pattern is refactored to _play method (fixes inheritance fragility)
5. All error messages include actionable guidance (what went wrong, how to fix)
6. AudioContext initialization errors provide clear debugging steps

**Research Notes:** Standard EventTarget pattern, well-documented. Event timing uses audioContext.currentTime to avoid timer desynchronization (critical pitfall #2).

---

### Phase 2: ADSR Envelopes

**Goal:** Users can create professional-quality synthesized sounds with attack/decay/sustain/release envelopes.

**Dependencies:** Phase 1 (events system for envelope phase events)

**Requirements:** ADSR-01, ADSR-02, ADSR-03, ADSR-04, ADSR-05, ADSR-06, ADSR-07

**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md — Envelope class with ADSR logic (TDD)
- [x] 02-02-PLAN.md — Controller and Oscillator integration
- [x] 02-03-PLAN.md — Retriggering without clicks (TDD)
- [x] 02-04-PLAN.md — Integration tests and exports

**Success Criteria:**
1. User can create Oscillator with ADSR envelope options using simple configuration
2. Attack phase smoothly ramps gain from 0 to peak without clicks
3. Decay phase transitions from peak to sustain level
4. Sustain holds gain while note is active
5. Release phase smoothly ramps to zero when stop() is called
6. Rapid retriggering (fast note changes) does not cause audible clicks or pops
7. ADSR integrates with existing onPlaySet/onPlayRamp API without breaking changes

**Research Notes:** Moderately complex timing math. Critical pitfall #1 (retriggering discontinuities) addressed by picking up from current value using setTargetAtTime. Critical pitfall #5 (direct AudioParam assignment) prevented by always using AudioParam methods.

---

### Phase 3: Utility Features

**Goal:** Users can efficiently manage audio loading, playback collections, and sprite-based assets.

**Dependencies:** Phase 1 (events for sprite playback tracking)

**Requirements:** SPRITE-01, SPRITE-02, SPRITE-03, SPRITE-04, SPRITE-05, COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, PRE-01, PRE-02, PRE-03, PRE-04, PRE-05

**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Collection utilities (stopAll, pauseAll, playAll)
- [x] 03-02-PLAN.md — Preload API (cache management)
- [x] 03-03-PLAN.md — Audio sprites (segment playback)

**Success Criteria:**
1. User can create audio sprite from file + JSON metadata (audiosprite-compatible format)
2. User can play individual sounds from sprite by name with independent gain/pan control
3. User can call stopAll/pauseAll/playAll on arrays of Playables (including nested arrays)
4. User can preload sound URLs before creating Sound instances, and preloaded audio is automatically reused
5. Collection utilities are tree-shakeable (only imported if used)

**Research Notes:** Standard patterns, well-documented. Audio sprites use native AudioBufferSourceNode.start(when, offset, duration). Critical pitfall #4 (source reuse) prevented by creating new source per sprite play.

---

### Phase 4: Composition Features

**Goal:** Users can create complex musical compositions with layered sounds, synchronized drum patterns, and smooth track transitions.

**Dependencies:** Phase 1 (events for sync), Phase 2 (ADSR for per-layer envelopes)

**Requirements:** LAYER-01, LAYER-02, LAYER-03, LAYER-04, LAYER-05, LAYER-06, BEAT-01, BEAT-02, BEAT-03, FADE-01, FADE-02, FADE-03, FADE-04

**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — LayeredSound class (synchronized multi-voice playback)
- [x] 04-02-PLAN.md — BeatTrack timing control (stop/pause/resume/tempo/events)
- [x] 04-03-PLAN.md — Crossfade utility (equal-power track transitions)

**Success Criteria:**
1. User can create LayeredSound from multiple Sound/Oscillator instances and play all layers simultaneously
2. LayeredSound supports master gain/pan control affecting all layers, plus individual layer access
3. User can stop/pause/resume BeatTrack mid-playback
4. User can crossfade from one Track to another with configurable duration
5. Crossfading uses equal-power curve (no volume dip during transition)
6. BeatTrack emits events for beat triggers (supports visual sync)

**Research Notes:** Most complex phase. Composition pattern prevents inheritance fragility. Critical pitfall #1 (retriggering) handled per-layer. Voice pooling strategy deferred to implementation (start simple, optimize later).

---

### Phase 5: Effects & Advanced Features

**Goal:** Users can add professional-quality effects and visualizations without manual node wiring.

**Dependencies:** Phase 1 (events for visualization updates), Phase 4 (effects apply to LayeredSound)

**Requirements:** FX-01, FX-02, FX-03, FX-04, FX-05, FX-06, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, DBG-01, DBG-02, DBG-03, DBG-04, DBG-05

**Plans:** 4 plans

Plans:
- [x] 05-01-PLAN.md — Effect interface and built-in effects (GainEffect, FilterEffect)
- [x] 05-02-PLAN.md — Effects integration into BaseSound (addEffect, removeEffect, persistent chain)
- [x] 05-03-PLAN.md — Analyzer for visualization (frequency/waveform data)
- [x] 05-04-PLAN.md — Debug mode (global/per-sound logging, custom handlers)

**Success Criteria:**
1. User can add effects via adapter pattern (external libraries like Tuna.js work via wrapEffect)
2. Built-in GainEffect and FilterEffect provide common functionality
3. User can get frequency/waveform data from any playing Playable for visualization
4. User can enable debug mode and see play/stop/seek events with timestamps
5. Debug mode logs connection chains and warns about common issues (e.g., suspended AudioContext)
6. Visualization does not significantly impact playback performance

**Research Notes:** Adapter pattern per CONTEXT.md - ez-audio does NOT bundle effect libraries. Users bring their own (Tuna, Tone.js). Built-in effects are thin Web Audio wrappers only. Effects are "always connected" - persist across play() calls.

---

### Phase 6: Testing

**Goal:** All core classes and new features have comprehensive test coverage.

**Dependencies:** Phases 1-5 (tests validate all features)

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08

**Plans:** 4 plans

Plans:
- [x] 06-01-PLAN.md — Sound and Track class comprehensive tests
- [x] 06-02-PLAN.md — Sampler class tests and BeatTrack enhancements
- [x] 06-03-PLAN.md — Controller classes tests (Base, Sound, Oscillator)
- [x] 06-04-PLAN.md — AudioContext initialization tests (gap closure)

**Success Criteria:**
1. Sound, Track, Oscillator, Sampler, BeatTrack classes have comprehensive test coverage
2. Controllers (BaseParamController, SoundController, OscillatorController) have test coverage
3. Event system has comprehensive test coverage including edge cases
4. ADSR envelopes have test coverage including fast retriggering and polyphonic scenarios
5. AudioContext initialization and iOS workarounds have test coverage
6. All new features (LayeredSound, sprites, effects, visualization) have test coverage

**Research Notes:** Use standardized-audio-context-mock for AudioParam automation testing. Each phase can be tested independently, Phase 6 adds integration tests.

---

### Phase 7: Documentation & Demo Site

**Goal:** Users have complete API documentation and interactive examples for all features.

**Dependencies:** Phases 1-5 (documents all features), Phase 6 (examples use tested code)

**Requirements:** DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, SITE-01, SITE-02, SITE-03, SITE-04

**Plans:** 7 plans

Plans:
- [x] 07-01-PLAN.md — VitePress setup and TypeDoc integration
- [x] 07-02-PLAN.md — JSDoc enhancement for core classes (Sound, Track, Oscillator, BaseSound)
- [x] 07-02b-PLAN.md — JSDoc enhancement for remaining classes (Sampler, BeatTrack, effects, errors, etc.)
- [x] 07-03-PLAN.md — Getting Started guide and Core Concepts docs
- [x] 07-04-PLAN.md — Interactive Vue demo components
- [x] 07-05-PLAN.md — Interactive example pages
- [x] 07-06-PLAN.md — Deployment and verification

**Success Criteria:**
1. All public classes and methods have complete TypeDoc/JSDoc with examples
2. Getting started guide walks users through basic usage (Sound, Track, Oscillator)
3. API reference is complete and navigable (generated TypeDoc)
4. Demo site (Vue + Vitepress) has interactive examples for each major feature
5. Interactive examples work in browser and demonstrate real-world use cases
6. Demo site is deployed and accessible

**Research Notes:** Vue + Vitepress for docs site (per PROJECT.md decision). Documentation can be written in parallel with testing.

---

### Phase 8: Build & Distribution

**Goal:** EZ Audio is published to npm with tree-shakeable exports and complete TypeScript support.

**Dependencies:** Phases 1-7 (all features complete and documented)

**Requirements:** BUILD-01, BUILD-02, BUILD-03, BUILD-04

**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Build configuration (vite.config.js, package.json, tsconfig.json)
- [ ] 08-02-PLAN.md — Publishing pipeline (GitHub Actions workflow, local verification)
- [ ] 08-03-PLAN.md — First release and verification (npm publish, consumer testing)

**Success Criteria:**
1. Library exports are tree-shakeable (unused features don't bloat bundles)
2. ESM-only build (per CONTEXT decision, no CJS)
3. TypeScript declaration files (.d.ts) with declaration maps included
4. Package is published to npm and installable via npm/pnpm/yarn
5. Bundle size is reasonable (core library < 50kb gzipped)

**Research Notes:** Vite build system already configured. ESM-only per user decision. OIDC trusted publishing for security.

---

### Phase 9: Interactive Examples

**Goal:** Users can experience the full power of EZ Web Audio through 9 rich interactive demos, letting people try the library before reading a line of code.

**Depends on:** Phase 8

**Plans:** 10 plans

Plans:
- [x] 09-01-PLAN.md — Audio assets, sidebar restructure, and examples overview
- [x] 09-02-PLAN.md — PianoKeyboard shared component and Synth Keyboard
- [x] 09-03-PLAN.md — Drum Machine step sequencer
- [x] 09-04-PLAN.md — XY Pad and Synth Drum Kit
- [x] 09-05-PLAN.md — Sampled Drum Kit and Soundfont Piano
- [x] 09-06-PLAN.md — Timing Basics and Audio Routing
- [x] 09-07-PLAN.md — Filter Demo, global registration, and verification
- [ ] 09-08-PLAN.md — Gap closure: Fix critical audio bugs (DrumMachine, FilterDemo, XYPad, SynthDrumKit)
- [ ] 09-09-PLAN.md — Gap closure: UI/UX fixes (layout shift, flicker, warnings, distortion waveform)
- [ ] 09-10-PLAN.md — Gap closure: Timing demo code snippets

**Success Criteria:**
1. 9 new interactive examples are accessible from the docs site sidebar
2. Drum Machine plays patterns with visual playhead sync
3. Synth Keyboard supports polyphonic playback with ADSR presets
4. XY Pad demonstrates real-time frequency/gain control via canvas
5. All synthesis demos work with zero audio file dependencies
6. Sampling demos load and play real audio samples with round-robin
7. All components follow established patterns (dynamic imports, cleanup, VitePress theming)
8. VitePress docs build succeeds with all new pages

---

### Phase 10: Lazy AudioContext Initialization

**Goal:** Developers using ez-web-audio never need to think about AudioContext initialization. The library lazily creates and resumes the AudioContext on first use, warns clearly if audio can't start yet, and keeps `initAudio()` available for developers who want explicit control.

**Dependencies:** Phase 1 (modifies core AudioContext management in index.ts)

**Plans:** 4 plans

Plans:
- [x] 10-01-PLAN.md — Lazy AudioContext getter, factory function refactor, suspended warning, tests
- [x] 10-02-PLAN.md — Documentation updates (Getting Started, Core Concepts, JSDoc)
- [x] 10-03-PLAN.md — Vue demo component cleanup (remove initAudio calls)
- [x] 10-04-PLAN.md — Example markdown code snippet updates

**Success Criteria:**
1. Developer can call `createSound()`, `createOscillator()`, etc. without ever calling `initAudio()` first — the AudioContext is created lazily on first use
2. `play()` automatically resumes a suspended AudioContext and logs a `console.warn` if the context remains suspended (no user gesture yet), rather than silently failing
3. `initAudio()` remains available as an optional explicit API for developers who need to control initialization timing (e.g., iOS mute workaround timing, pre-warming the context)
4. The iOS mute workaround runs automatically on first `play()` if it hasn't been run yet
5. `createWhiteNoise()` and any other functions that use the module-level `audioContext` directly are updated to use the lazy initializer
6. All existing tests continue to pass — this is a non-breaking change
7. Documentation is updated to reflect that `initAudio()` is optional (Getting Started guide, Core Concepts, API docs)
8. Interactive example components (Vue demos) are updated to remove explicit `initAudio()` calls and "Browser Audio Requirement" warnings, demonstrating the simpler usage pattern
9. Example code snippets in markdown pages show the new simplified API (no `initAudio()` boilerplate)

**Research Notes:** The library already calls `initAudio()` inside most factory functions and calls `audioContext.resume()` in `playAt()`. The main change is replacing the raw module-level `let audioContext` with a lazy getter, ensuring all code paths go through it, and adding a user-visible warning when the context can't resume.

---

### Phase 11: Drum Machine Example Pages

**Goal:** Two fully fleshed-out drum machine example pages — one Vue (reactive properties) and one vanilla TypeScript (event-based) — that validate both UI sync approaches work correctly and serve as real-world reference implementations.

**Dependencies:** Phase 9 (existing drum machine component and docs infrastructure)

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 11 to break down)

**Success Criteria:**
1. Vue drum machine page (`/examples/drum-machine-vue`) demonstrates the reactive property pattern — `beat.currentTimeIsPlaying` and `beat.isPlaying` drive UI directly via `wrapWith: reactive`, no event listeners needed for visual sync
2. Vanilla TS drum machine page (`/examples/drum-machine-vanilla`) demonstrates the event-based pattern — `track.on('beat', ...)` drives UI updates using plain DOM manipulation, proving events fire at the correct time without setTimeout workarounds
3. Both pages use 16th notes (`1/16`) with 16-step grids at configurable BPM (60-200)
4. Both pages include: play/stop controls, BPM slider, per-track mute/solo, visual playhead that highlights the current step in sync with audio
5. Both pages use round-robin samples (kick, snare, hihat with 3 variations each) to demonstrate the anti-machine-gun pattern
6. Vanilla TS page proves the AudioContext-aware event timing works — no visible drift between audio and visual playhead even under sustained playback (2+ minutes)
7. Vue page proves reactive Beat properties toggle correctly without markRaw workaround (validates the WeakMap→instance property refactor)
8. Both pages have clear code examples showing the pattern being used, with explanation of why each approach suits different frameworks
9. Sidebar navigation groups both pages under an "Integration Patterns" or similar section

**Research Notes:** The BeatTrack `beat` event now fires at play time (not schedule time) using `audioContextAwareTimeout`, which uses `requestAnimationFrame` + `audioContext.currentTime` for precise timing. The reactive property approach uses the same timing internally in the Beat class. Both approaches should produce identical visual results — this phase validates that claim.

---

## Progress

| Phase | Status | Requirements | Completion |
|-------|--------|--------------|------------|
| 1 - Foundation | Complete | 15 | 100% |
| 2 - ADSR Envelopes | Complete | 7 | 100% |
| 3 - Utility Features | Complete | 15 | 100% |
| 4 - Composition Features | Complete | 13 | 100% |
| 5 - Effects & Advanced | Complete | 16 | 100% |
| 6 - Testing | Complete | 8 | 100% |
| 7 - Documentation & Demo | Complete | 9 | 100% |
| 8 - Build & Distribution | Planned | 4 | 0% |

**Overall:** 71/71 requirements complete (100%)

---

## Coverage Validation

All 71 v1 requirements mapped to phases:

- Phase 1: 15 requirements (EVT-01 to EVT-07, FIX-01 to FIX-04, ERR-01 to ERR-04)
- Phase 2: 7 requirements (ADSR)
- Phase 3: 15 requirements (SPRITE + COLL + PRE)
- Phase 4: 13 requirements (LAYER + BEAT + FADE)
- Phase 5: 16 requirements (FX + VIZ + DBG)
- Phase 6: 8 requirements (TEST)
- Phase 7: 9 requirements (DOC + SITE)
- Phase 8: 4 requirements (BUILD)

**Total mapped:** 71/71
**Orphaned requirements:** 0

## Dependency Graph

```
Phase 1: Foundation (Events + Bug Fixes + Error Handling)
    |-> Phase 2: ADSR Envelopes (depends on events)
    |-> Phase 3: Utility Features (depends on events)
    +-> Phase 4: Composition Features (depends on events + ADSR)
            +-> Phase 5: Effects & Advanced (depends on composition)
                    +-> Phase 6: Testing (validates all features)
                            +-> Phase 7: Documentation & Demo (documents tested features)
                                    +-> Phase 8: Build & Distribution (publishes complete library)
                                            +-> Phase 9: Interactive Examples (docs enhancement)
                                                    +-> Phase 10: Lazy AudioContext Init (DX improvement)
                                            +-> Phase 11: Drum Machine Example Pages (Vue + vanilla TS)
```

*Last updated: 2026-02-14 after Phase 9 gap closure planning*

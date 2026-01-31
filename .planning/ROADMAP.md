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
- [ ] 02-01-PLAN.md — Envelope class with ADSR logic (TDD)
- [ ] 02-02-PLAN.md — Controller and Oscillator integration
- [ ] 02-03-PLAN.md — Retriggering without clicks (TDD)
- [ ] 02-04-PLAN.md — Integration tests and exports

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

**Success Criteria:**
1. User can add reverb/delay/distortion effects with simple options (no manual node wiring)
2. Effect presets are available (e.g., "cathedral reverb", "telephone filter")
3. User can get frequency/waveform data from any playing Playable for visualization
4. User can enable debug mode and see play/stop/seek events with timestamps
5. Debug mode logs connection chains and warns about common issues (e.g., suspended AudioContext)
6. Visualization does not significantly impact playback performance

**Research Notes:** Effects use native nodes (ConvolverNode, BiquadFilterNode, DelayNode, WaveShaperNode). Impulse response sourcing needs verification during implementation. Critical pitfall #6 (FFT performance) addressed with minimum FFT size and throttled updates.

---

### Phase 6: Testing

**Goal:** All core classes and new features have comprehensive test coverage.

**Dependencies:** Phases 1-5 (tests validate all features)

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08

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

**Success Criteria:**
1. Library exports are tree-shakeable (unused features don't bloat bundles)
2. ESM and CJS builds are available and working
3. TypeScript declaration files (.d.ts) are included and accurate
4. Package is published to npm and installable via npm/pnpm/yarn
5. Bundle size is reasonable (core library < 50kb gzipped)

**Research Notes:** Vite build system already configured. Verify tree-shaking with bundle analyzer before publish.

---

## Progress

| Phase | Status | Requirements | Completion |
|-------|--------|--------------|------------|
| 1 - Foundation | Complete | 15 | 100% |
| 2 - ADSR Envelopes | Planning Complete | 7 | 0% |
| 3 - Utility Features | Pending | 15 | 0% |
| 4 - Composition Features | Pending | 13 | 0% |
| 5 - Effects & Advanced | Pending | 16 | 0% |
| 6 - Testing | Pending | 8 | 0% |
| 7 - Documentation & Demo | Pending | 9 | 0% |
| 8 - Build & Distribution | Pending | 4 | 0% |

**Overall:** 15/71 requirements complete (21%)

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

---

## Dependency Graph

```
Phase 1: Foundation (Events + Bug Fixes + Error Handling)
    ├─→ Phase 2: ADSR Envelopes (depends on events)
    ├─→ Phase 3: Utility Features (depends on events)
    └─→ Phase 4: Composition Features (depends on events + ADSR)
            └─→ Phase 5: Effects & Advanced (depends on composition)
                    └─→ Phase 6: Testing (validates all features)
                            └─→ Phase 7: Documentation & Demo (documents tested features)
                                    └─→ Phase 8: Build & Distribution (publishes complete library)
```

---

*Last updated: 2026-01-31 after Phase 2 planning complete*

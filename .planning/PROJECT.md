# EZ Audio

## What This Is

EZ Audio is a TypeScript library that wraps the Web Audio API with a simpler, more intuitive interface. A spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt from scratch as a framework-agnostic, pure TypeScript library that makes audio on the web accessible without requiring deep Web Audio API knowledge.

## Core Value

Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

## Requirements

### Validated

Existing functionality that's working and relied upon:

- [x] **Sound** — one-shot audio playback from AudioBuffer
- [x] **Track** — music track with pause/resume/seek/position tracking
- [x] **Oscillator** — synthesizer with filter support (highpass, lowpass, bandpass, etc.)
- [x] **Sampler** — round-robin playback of multiple sounds
- [x] **BeatTrack** — drum machine lane with Beat instances for rhythmic patterns
- [x] **Beat** — single rhythmic position (active/inactive)
- [x] **Note** — musical identity without audio (letter, accidental, octave, frequency)
- [x] **SampledNote** — Sound with musical identity via MusicallyAware mixin
- [x] **Font** — collection of SampledNotes for soundfont playback
- [x] **MusicallyAware mixin** — adds musical identity to any sound class
- [x] **Playable interface** — contract for play/stop/scheduling methods
- [x] **Connectable interface** — contract for audio routing and parameter control
- [x] **Factory functions** — createSound, createTrack, createOscillator, createBeatTrack, createSampler, createFont, createWhiteNoise
- [x] **Parameter control API** — fluent API for gain/pan/frequency scheduling (onPlaySet, onPlayRamp, update)
- [x] **iOS audio unlock** — automatic workaround for browser muting restrictions

### Active

Requirements for v1 release, grouped by priority:

**Must-Have (Core Functionality):**

- [ ] **LAYER-01**: LayeredSound class — play multiple sounds simultaneously as a single unit
- [ ] **ADSR-01**: ADSR envelope abstraction for Oscillator — attack/decay/sustain/release without manual scheduling
- [ ] **EVENT-01**: Event system — subscribe to play/stop/seek/end events on any Playable
- [ ] **BEAT-01**: BeatTrack stop mechanism — ability to stop drum patterns mid-playback
- [ ] **UTIL-01**: Collection utilities — stopAll/pauseAll/playAll that work on arrays (including nested)
- [ ] **FIX-01**: Track.play override fragility — refactor to _play method pattern
- [ ] **FIX-02**: Oscillator.duration — implement or explicitly document as not applicable
- [ ] **TEST-01**: Comprehensive test coverage for all core classes (Sound, Track, Oscillator, Sampler, BeatTrack)
- [ ] **TEST-02**: Test coverage for controllers (BaseParamController, SoundController, OscillatorController)
- [ ] **TEST-03**: Test coverage for audio context initialization and iOS workarounds
- [ ] **DOC-01**: Complete API documentation with TypeDoc
- [ ] **DOC-02**: Usage guides and examples

**Nice-to-Have (Enhanced Features):**

- [ ] **VIZ-01**: Audio visualization — expose AnalyserNode data for waveform/spectrum display
- [ ] **SPRITE-01**: Audio sprites — multiple sounds in one file with timing metadata
- [ ] **FX-01**: Effects presets — simple reverb/delay/distortion without manual node wiring
- [ ] **FADE-01**: Crossfading — smooth transitions between tracks
- [ ] **ERR-01**: Better error messages — clear, actionable guidance when things go wrong
- [ ] **DEBUG-01**: Debug mode — logging of audio events, node connections, timing
- [ ] **TREE-01**: Tree-shakeable exports — only bundle features you use
- [ ] **PRELOAD-01**: Preloading API — preload sounds before they're needed
- [ ] **SITE-01**: Demo site migration to Vue + Vitepress
- [ ] **REACT-01**: React hooks package (separate npm package)
- [ ] **VUE-01**: Vue composables package (separate npm package)

### Out of Scope

Explicitly excluded from v1, documented to prevent scope creep:

- **Spatial audio (3D positioning)** — complexity, specialized use case, defer to v2
- **Ducking/sidechain compression** — can be added in v2
- **Recording/capture** — requires MediaRecorder API integration, v2 feature
- **Microphone input** — requires MediaStream API integration, v2 feature
- **Central AudioManager/registry** — users manage their own collections; collection utilities are sufficient
- **Multiple simultaneous AudioContexts** — single context pattern is simpler and sufficient

## Context

**Origins:** This is a spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), a library written 10+ years ago for Ember.js. The goal is to recreate the good parts of that API while making it:
- Pure TypeScript with full type safety
- Framework-agnostic (no Ember, React, Vue dependency)
- Usable in any JavaScript/TypeScript context

**Current state:** The core architecture is solid. BaseSound abstract class with Playable/Connectable interfaces, controller pattern for parameter management, and MusicallyAware mixin for musical identity are all working well.

**Reference:** ember-audio documentation and API docs are the reference for API design decisions.

## Constraints

- **Tech stack**: Pure TypeScript, no runtime dependencies, Vite for building, Vitest for testing
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Bundle size**: Core library should be tree-shakeable; unused features shouldn't bloat bundles
- **API stability**: v1 release means API is stable; breaking changes require major version bump
- **iOS compatibility**: Must handle iOS audio context restrictions automatically

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep MusicallyAware mixin | It's solving the right problem (adding musical identity to sounds) in a way TypeScript supports well. The "mixins are harmful" advice applies to React component patterns, not this use case. | — Pending |
| No AudioManager/registry | ember-audio's registration pattern was solving an Ember DI problem. In vanilla TS, collection utilities (stopAll, pauseAll on arrays) are simpler and more flexible. | — Pending |
| Keep BaseSound + interfaces pattern | Current architecture (abstract class implementing interfaces) is cleaner than chained mixins and provides proper TypeScript typing. | — Pending |
| Vue + Vitepress for docs | Markdown-based docs with Vue components for interactive examples. Better DX than vanilla approach. | — Pending |
| Framework bindings as separate packages | Keep core library dependency-free; React hooks and Vue composables are separate npm packages. | — Pending |

---
*Last updated: 2026-01-31 after initialization*

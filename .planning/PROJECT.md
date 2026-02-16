# EZ Audio

## What This Is

EZ Audio is a TypeScript library that wraps the Web Audio API with a simpler, more intuitive interface. A spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt from scratch as a framework-agnostic, pure TypeScript library that makes audio on the web accessible without requiring deep Web Audio API knowledge. Includes ADSR envelopes, effects presets, drum machine patterns, visualization, and interactive documentation with 11+ demos.

## Core Value

Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

## Requirements

### Validated

- ✓ Sound, Track, Oscillator, Sampler, BeatTrack, Beat, Note, SampledNote, Font — v1.0
- ✓ MusicallyAware mixin, Playable/Connectable interfaces — v1.0
- ✓ Factory functions (createSound, createTrack, createOscillator, etc.) — v1.0
- ✓ Parameter control API (onPlaySet, onPlayRamp, update) — v1.0
- ✓ ADSR envelopes with click-free retriggering — v1.0
- ✓ Audio sprites, collection utilities, preload/cache — v1.0
- ✓ LayeredSound, BeatTrack timing, crossfade — v1.0
- ✓ Effects adapter pattern, visualization analyzer, debug mode — v1.0
- ✓ iOS audio unlock — v1.0
- ✓ Lazy AudioContext initialization — v1.0
- ✓ VitePress docs site with interactive demos — v1.0
- ✓ npm published (ESM-only, tree-shakeable) — v1.0
- ✓ Code quality audit and refactoring — v1.1
- ✓ DX review (API consistency, error messages, input validation) — v1.1
- ✓ Documentation polish and 2 new creative demos — v1.1
- ✓ Test coverage expansion (913 tests: 893 unit + 20 E2E) — v1.1
- ✓ SEO optimization (meta tags, structured data, homepage messaging) — v1.1

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- **Spatial audio (3D positioning)** — complexity, specialized use case, defer to v2
- **Ducking/sidechain compression** — can be added in v2
- **Recording/capture** — requires MediaRecorder API integration, v2 feature
- **Microphone input** — requires MediaStream API integration, v2 feature
- **Central AudioManager/registry** — users manage their own collections; collection utilities are sufficient
- **Multiple simultaneous AudioContexts** — single context pattern is simpler and sufficient
- **MIDI support** — specialized, can be a separate package
- **Audio worklets** — too low-level for "easy" API

## Context

**Origins:** Spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt for vanilla TypeScript with no dependencies.

**Current state:** v1.1 shipped. 9,988 LOC TypeScript library, 913 tests (893 unit + 20 E2E), published to npm as `ez-web-audio`. VitePress docs site with 11+ interactive demos, SEO-optimized with structured data. All 93 requirements across 2 milestones satisfied.

**Tech stack:** Pure TypeScript, Vite build, Vitest + Playwright testing, VitePress + Vue docs site, TypeDoc API reference.

**Bundle:** 125 kB (30.4 kB gzipped), tree-shakeable ESM-only.

## Constraints

- **Tech stack**: Pure TypeScript, no runtime dependencies, Vite for building, Vitest for testing
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Bundle size**: Core library should be tree-shakeable; unused features shouldn't bloat bundles
- **API stability**: v1 release means API is stable; breaking changes require major version bump
- **iOS compatibility**: Must handle iOS audio context restrictions automatically

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep MusicallyAware mixin | Solves the right problem (musical identity on sounds) in a TS-supported way | ✓ Good |
| No AudioManager/registry | Collection utilities (stopAll, pauseAll) are simpler than DI pattern | ✓ Good |
| BaseSound + interfaces pattern | Abstract class + interfaces cleaner than chained mixins, proper TS typing | ✓ Good |
| Vue + VitePress for docs | Markdown docs + Vue interactive examples, better DX than vanilla | ✓ Good |
| Framework bindings as separate packages | Keep core dependency-free; React/Vue packages separate | — Pending (not yet needed) |
| ESM-only build | Modern consumers only; no CJS compatibility burden | ✓ Good |
| Lazy AudioContext | Reduces boilerplate; initAudio() optional for explicit control | ✓ Good |
| Single global AudioContext | Simpler for v1; blocks spatial audio — needs opt-in multi-context for v2 | ⚠️ Revisit for v2 |
| Effects adapter pattern | ez-audio wraps, users bring own effect libs (Tuna, Tone.js) | ✓ Good |
| String concat for error messages | Consistency across codebase (decided in Phase 13) | ✓ Good |
| Keep deprecated type aliases | Backwards compat for OscillatorOpts → OscillatorOptions rename | ✓ Good |
| E2E error-detection focus | VitePress SPA hydration timing too unreliable for element checks | ✓ Good |

---
*Last updated: 2026-02-16 after v1.1 milestone*

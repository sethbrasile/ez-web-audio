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
- ✓ Dependency security upgrades (vite 7, vitest 4, happy-dom 20, ESLint 10, TS 5.9) — v1.0 stable Phase 17
- ✓ Breaking API cleanup (.as(), playInIfActive, protected internals, removed deprecated APIs) — v1.0 stable Phase 18
- ✓ DX improvements (auto-rewire bypass, context-free effect factories, batch APIs, extensible ControlType) — v1.0 stable Phase 19
- ✓ Defensive hardening (null guards, input validation, memory management) — v1.0 stable Phase 20

- ✓ Source code fixes: race conditions, memory leaks, missing exports, API contract violations — v1.0 stable Phase 26
- ✓ Package quality: professional README, package.json metadata, CI gates, controller exports — v1.0 stable Phase 27
- ✓ Documentation corrections: fixed 6 critical doc errors, added narrative docs for 7 features — v1.0 stable Phase 28
- ✓ Demo component fixes: accessibility, touch handling, TypeScript types, API corrections — v1.0 stable Phase 29
- ✓ DX convenience APIs: fadeIn/fadeOut, loop, dispose, context-free createAnalyzer, note-based oscillator, BeatTrack.setPattern — v1.0 stable Phase 33
- ✓ Test gap closure: factory function tests, oscillator freq:0 fix, AudioSprite stop, gain guards, effects batch, BeatTrack events — v1.0 stable Phase 34
- ✓ Documentation expansion: concepts split, AudioSprite/LayeredSound/Crossfade examples, React integration guide, API fixes — v1.0 stable Phase 35
- ✓ Documentation sync: guide pages updated for Phase 33 APIs, TypeDoc regenerated, CHANGELOG updated, stale API sweep clean — v1.0 stable Phase 36

### Active

Requirements for v1.0 stable npm release — see `.planning/REQUIREMENTS.md` for detailed REQ-IDs

### Out of Scope

- **Spatial audio (3D positioning)** — complexity, specialized use case, defer to v2
- **Ducking/sidechain compression** — can be added in v2
- **Recording/capture** — requires MediaRecorder API integration, v2 feature
- **Microphone input** — requires MediaStream API integration, v2 feature
- **Central AudioManager/registry** — users manage their own collections; collection utilities are sufficient
- **Multiple simultaneous AudioContexts** — single context pattern is simpler and sufficient
- **MIDI support** — specialized, can be a separate package
- **Audio worklets** — too low-level for "easy" API

## Current Milestone: v1.0 First Stable Release

**Goal:** Implement all deferred audit improvements, fix breaking API issues (free pre-1.0), upgrade dependencies for security, add convenience APIs, harden defensive code, expand test coverage, and update all documentation. Ship as first stable npm 1.0.0 release.

**Target features:**
- Breaking API cleanup: rename `.from()` → `.as()`, `ifActivePlayIn` → `playInIfActive`, make internal nodes protected, remove deprecated `connections` API
- Auto-rewire effect chain on bypass toggle (remove footgun)
- Effect factories without AudioContext arg (reduce boilerplate)
- Convenience APIs: `addEffects([])`, `playTogether([])`, `createSounds([])` with progress
- Defensive code: null/bounds checks, controller array cleanup, ControlType extensibility
- New accessors: `getFilters()`, `getSounds()`
- Dependency security upgrades (happy-dom, vitest, vite, eslint)
- Integration test suite and test file reorganization
- All JSDoc and demo app documentation updated for every change

**Vision:** Ship a stable, secure, well-documented 1.0.0 that developers can depend on without hitting API footguns or security warnings.

## Context

**Origins:** Spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt for vanilla TypeScript with no dependencies.

**Current state:** Internal milestones v1.0-MVP and v1.1-Quality&Polish complete. TypeScript library with 1038+ tests, published to npm as `ez-web-audio@0.1.0`. VitePress docs site with 11+ interactive demos, SEO-optimized with structured data. Phases 17-33 of v1.0 Stable complete (deps, API cleanup, DX, defensive hardening, test coverage, demo app, demo bugfixes, source code fixes, package quality, documentation corrections, demo fixes, E2E expansion, convenience APIs).

**Tech stack:** Pure TypeScript, Vite build, Vitest + Playwright testing, VitePress + Vue docs site, TypeDoc API reference.

**Bundle:** 125 kB (30.4 kB gzipped), tree-shakeable ESM-only.

**Note:** npm 0.1.0 is the only public release. Internal planning milestones v1.0/v1.1 were project phases, not npm versions. This milestone ships the actual npm 1.0.0.

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
| Remove deprecated type aliases for 1.0 | No public 1.0 API exists — clean break, no aliases needed | ✓ Good |
| E2E error-detection focus | VitePress SPA hydration timing too unreliable for element checks | ✓ Good |
| Vitest 4 constructor mocks need function syntax | Arrow functions can't be constructors; vi.fn(function(){}) required | ✓ Good |
| ESLint per-directory rule overrides | Docs Vue components get relaxed rules until Phase 22 cleanup | ✓ Good |
| TS 5.9 typed arrays need explicit ArrayBuffer generic | Web Audio API methods require Uint8Array<ArrayBuffer> not Uint8Array | ✓ Good |
| onPlayRamp().from() NOT renamed | Different semantic ("from value X") vs update().to().from() ("from unit") | ✓ Good |
| Bypass interception via Object.defineProperty | Simpler than Proxy, auto-rewires effect chain on toggle | ✓ Good |
| ControlTypeMap interface for extensibility | Module augmentation lets downstream users add custom parameter types | ✓ Good |
| DEF-04 consume-once semantics | onPlaySet/onPlayRamp schedules cleared after each play; re-schedule before each play() for repeated automation | ✓ Good |

| Phase 26 source code fixes | 18 bugs/leaks/contract violations fixed from code review | ✓ Good |

---
*Last updated: 2026-02-22 after Phase 36*

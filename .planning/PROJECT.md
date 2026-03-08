# EZ Audio

## What This Is

EZ Audio is a TypeScript library that wraps the Web Audio API with a simpler, more intuitive interface. A spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt from scratch as a framework-agnostic, pure TypeScript library that makes audio on the web accessible without requiring deep Web Audio API knowledge. Includes ADSR envelopes, built-in effects (delay, reverb, distortion, compressor, EQ), LFO modulation, transport/clock, sequencer, PolySynth, GrainPlayer, drum machine patterns, visualization, audio sprites, and interactive documentation with 11+ demos. AI-discoverable via llms.txt.

## Core Value

Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

## Requirements

### Validated

- ✓ Sound, Track, Oscillator, Sampler, BeatTrack, Beat, Note, SampledNote, Font — M1
- ✓ MusicallyAware mixin, Playable/Connectable interfaces — M1
- ✓ Factory functions (createSound, createTrack, createOscillator, etc.) — M1
- ✓ Parameter control API (onPlaySet, onPlayRamp, update) — M1
- ✓ ADSR envelopes with click-free retriggering — M1
- ✓ Audio sprites, collection utilities, preload/cache — M1
- ✓ LayeredSound, BeatTrack timing, crossfade — M1
- ✓ Effects adapter pattern, visualization analyzer, debug mode — M1
- ✓ iOS audio unlock — M1
- ✓ Lazy AudioContext initialization — M1
- ✓ VitePress docs site with interactive demos — M1
- ✓ npm published (ESM-only, tree-shakeable) — M1
- ✓ Code quality audit and refactoring — M2
- ✓ DX review (API consistency, error messages, input validation) — M2
- ✓ Documentation polish and 2 new creative demos — M2
- ✓ Test coverage expansion (913 tests: 893 unit + 20 E2E) — M2
- ✓ SEO optimization (meta tags, structured data, homepage messaging) — M2
- ✓ Dependency security upgrades (vite 7, vitest 4, happy-dom 20, ESLint 10, TS 5.9) — M3 Phase 17
- ✓ Breaking API cleanup (.as(), playInIfActive, protected internals, removed deprecated APIs) — M3 Phase 18
- ✓ DX improvements (auto-rewire bypass, context-free effect factories, batch APIs, extensible ControlType) — M3 Phase 19
- ✓ Defensive hardening (null guards, input validation, memory management) — M3 Phase 20

- ✓ Source code fixes: race conditions, memory leaks, missing exports, API contract violations — M3 Phase 26
- ✓ Package quality: professional README, package.json metadata, CI gates, controller exports — M3 Phase 27
- ✓ Documentation corrections: fixed 6 critical doc errors, added narrative docs for 7 features — M3 Phase 28
- ✓ Demo component fixes: accessibility, touch handling, TypeScript types, API corrections — M3 Phase 29
- ✓ DX convenience APIs: fadeIn/fadeOut, loop, dispose, context-free createAnalyzer, note-based oscillator, BeatTrack.setPattern — M3 Phase 33
- ✓ Test gap closure: factory function tests, oscillator freq:0 fix, AudioSprite stop, gain guards, effects batch, BeatTrack events — M3 Phase 34
- ✓ Documentation expansion: concepts split, AudioSprite/LayeredSound/Crossfade examples, React integration guide, API fixes — M3 Phase 35
- ✓ Documentation sync: guide pages updated for Phase 33 APIs, TypeDoc regenerated, CHANGELOG updated, stale API sweep clean — M3 Phase 36
- ✓ Nice-to-have DX: AudioInput flexibility, createNoise, volume alias, createTracks, typed events, narrowed ControlType, TypedEventEmitter mixin, onPlaySet docs — M3 Phase 37
- ✓ Docs site SEO and accessibility: OG image, per-page meta, canonical URLs, JSON-LD, WCAG focus-visible, canvas ARIA, DrumMachine a11y, XY Pad keyboard operation — M3 Phase 44

- ✓ Built-in effects: delay, reverb, distortion, compressor, EQ with BaseEffect pattern — M5
- ✓ LFO modulation: connectable to any AudioParam, syncLifecycle, retrigger modes — M5
- ✓ Transport/Clock: global BPM-synced timeline with mute/solo, BeatTrack sync — M5
- ✓ Sequencer: musical time notation ("4n", "8t", "2m"), live BPM changes — M5
- ✓ PolySynth: voice allocation with 3 steal strategies, custom voice factory — M5
- ✓ GrainPlayer: granular synthesis with independent pitch/time control — M5
- ✓ Audio Sprites Redesign: Howler + audiosprite manifest auto-detection — M6
- ✓ Multiple AudioContext Support: optional BaseAudioContext first-param on all factories — M6
- ✓ llms.txt AI Discoverability: llms.txt/llms-full.txt with llm-exclude/llm-only annotations — M6
- ✓ Demo UX: lazy init on first interaction, no load buttons, animated playheads — M6

### Active

**Milestone 7: Feature Demos** — Interactive demo pages for all M5 features lacking examples.

- [ ] Effects chain demo (delay, reverb, compressor, EQ)
- [ ] LFO modulation demo (tremolo, vibrato, filter sweep)
- [ ] PolySynth demo (voice allocation, steal strategies)
- [ ] Transport + Sequencer demo (BPM clock, musical time, mute/solo)
- [ ] GrainPlayer demo (independent pitch/time control)

### Out of Scope

- **Spatial audio (3D positioning)** — complexity, specialized use case, defer to v2
- **Ducking/sidechain compression** — can be added in v2
- **Recording/capture** — requires MediaRecorder API integration, v2 feature
- **Microphone input** — requires MediaStream API integration, v2 feature
- **Central AudioManager/registry** — users manage their own collections; collection utilities are sufficient
- **MIDI support** — specialized, can be a separate package
- **Audio worklets** — too low-level for "easy" API

## Current Milestone: Milestone 7 — Feature Demos

**Goal:** Build interactive demo pages for all M5 features (effects, LFO, PolySynth, Transport/Sequencer, GrainPlayer) that currently lack examples.

**Target features:**
- Effects chain demo page (delay, reverb, compressor, EQ — toggle, adjust, stack)
- LFO modulation demo page (tremolo, vibrato, wah — visual modulation wave)
- PolySynth demo page (keyboard with voice allocation and steal strategies)
- Transport + Sequencer demo page (BPM clock, musical time notation, mute/solo)
- GrainPlayer demo page (granular synthesis with independent pitch/time)

**Note:** Milestones are numbered sequentially and do not correspond to npm versions. The library ships when it's ready.

## Context

**Origins:** Spiritual successor to [ember-audio](https://sethbrasile.github.io/ember-audio/), rebuilt for vanilla TypeScript with no dependencies.

**Current state:** All 6 milestones complete (MVP, Quality & Polish, Stable Release, Deep Review Hardening, Effects & Transport, DX & Discoverability). TypeScript library with 1920+ unit tests + 20 E2E tests, published to npm as `ez-web-audio@0.1.0` (pre-release). VitePress docs site with 11+ interactive demos, SEO-optimized, AI-discoverable via llms.txt. Full feature set: ADSR, effects, LFO, transport, sequencer, PolySynth, GrainPlayer, audio sprites, multiple AudioContext support.

**Tech stack:** Pure TypeScript, Vite build, Vitest + Playwright testing, VitePress + Vue docs site, TypeDoc API reference, vitepress-plugin-llms.

**Bundle:** ~62,570 LOC TypeScript, tree-shakeable ESM-only.

**Note:** npm 0.1.0 is the only public release. Milestones are numbered project phases, not npm versions. A versioned npm release happens when the library is ready.

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
| Howler manifest auto-detection | normalizeManifest() converts Howler tuples to audiosprite format; single internal type | ✓ Good |
| BaseAudioContext overloads on all factories | Optional first-param pattern, non-breaking; instanceof detection | ✓ Good |
| vitepress-plugin-llms for AI discoverability | llms.txt/llms-full.txt auto-generated; llm-exclude/llm-only for Vue demos | ✓ Good |
| Lazy init pattern for demos | No load buttons; first user interaction triggers AudioContext + asset loading | ✓ Good |

---
*Last updated: 2026-03-08 after Milestone 7 (Feature Demos) started*

# Roadmap: EZ Audio

**Project:** EZ Web Audio Library
**Core Value:** Make the Web Audio API easy to use
**Created:** 2026-01-31
**Last Updated:** 2026-02-28

## Milestones

- ✅ **Milestone 1: MVP** — Phases 1-11 (shipped 2026-02-14)
- ✅ **Milestone 2: Quality & Polish** — Phases 12-16 (shipped 2026-02-16)
- ✅ **Milestone 3: Stable Release** — Phases 17-46 (complete)
- ✅ **Milestone 4: Deep Review Hardening** — Phases 47-52 (complete)
- ✅ **Milestone 5: Effects & Transport** — Phases 53-60 (complete)
- 📋 **Milestone 6: DX & Discoverability** — Phases 61-63

## Phases

<details>
<summary>✅ Milestone 1: MVP (Phases 1-11) — SHIPPED 2026-02-14</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-02-01
- [x] Phase 2: ADSR Envelopes (4/4 plans) — completed 2026-02-02
- [x] Phase 3: Utility Features (3/3 plans) — completed 2026-02-03
- [x] Phase 4: Composition Features (3/3 plans) — completed 2026-02-04
- [x] Phase 5: Effects & Advanced (4/4 plans) — completed 2026-02-05
- [x] Phase 6: Testing (4/4 plans) — completed 2026-02-06
- [x] Phase 7: Documentation & Demo (7/7 plans) — completed 2026-02-08
- [x] Phase 8: Build & Distribution (3/3 plans) — completed 2026-02-09
- [x] Phase 9: Interactive Examples (10/10 plans) — completed 2026-02-12
- [x] Phase 10: Lazy AudioContext (4/4 plans) — completed 2026-02-13
- [x] Phase 11: Drum Machine Examples (2/2 plans) — completed 2026-02-14

</details>

<details>
<summary>✅ Milestone 2: Quality & Polish (Phases 12-16) — SHIPPED 2026-02-16</summary>

- [x] Phase 12: Comprehensive Audit (5/5 plans) — completed 2026-02-16
- [x] Phase 13: Code Quality Implementation (3/3 plans) — completed 2026-02-16
- [x] Phase 14: Documentation & Examples Polish (6/6 plans) — completed 2026-02-16
- [x] Phase 15: Test Coverage Implementation (4/4 plans) — completed 2026-02-16
- [x] Phase 16: SEO & Discoverability (2/2 plans) — completed 2026-02-16

</details>

### Milestone 3: Stable Release (Phases 17-46)

**Milestone Goal:** Implement all deferred audit improvements, fix breaking API issues, upgrade dependencies for security, add convenience APIs, harden defensive code, expand test coverage, and update all documentation.

- [x] **Phase 17: Dependency Security Upgrades** - Upgrade all vulnerable dependencies before any code changes (completed 2026-02-17)
- [x] **Phase 18: Breaking API Cleanup** - Rename fluent API methods, enforce encapsulation, remove deprecated APIs, update JSDoc (completed 2026-02-17)
- [x] **Phase 19: DX Improvements** - Add convenience methods, auto-rewire effects, batch loaders, extensible ControlType, update guides (completed 2026-02-17)
- [x] **Phase 20: Defensive Hardening** - Add null checks, input validation, memory management, and code clarity (completed 2026-02-17)
- [x] **Phase 21: Test Coverage** - Add integration tests, split test files by concern, add concurrent operation tests (completed 2026-02-17)
- [x] **Phase 22: Demo App & Release** - Update demo Vue components for all API changes, update TypeDoc, publish npm 1.0.0 (completed 2026-02-17)
- [x] **Phase 23: Demo Example Bugfixes** - Fix runtime API bugs, design issues, and polish in all VitePress demo components (completed 2026-02-17)
- [x] **Phase 24: Milestone Verification & Release Documentation** _(2026-02-27)_ - Create missing VERIFICATION.md for phases 18 and 19, fix stale JSDoc, update CHANGELOG, clean up tracking docs ~~and trigger npm 1.0.0 publish~~
- [x] **Phase 25: New Example Pages** _(2026-02-27)_ - AudioSprite + Crossfade examples completed via Phase 35; playTogether example deferred to consolidated phase
- [x] **Phase 26: Source Code Fixes** - Fix all runtime bugs, race conditions, memory leaks, and validation gaps found in code review (completed 2026-02-22)
- [x] **Phase 27: Package Quality & README** - Write proper README, fix package.json config, add CI quality gates (completed 2026-02-22)
- [x] **Phase 28: Documentation Corrections** - Fix all incorrect docs, add missing feature documentation (completed 2026-02-22)
- [x] **Phase 29: Demo Component Fixes** - Fix demo bugs, accessibility issues, and polish (completed 2026-02-22)
- [x] **Phase 30: Test Coverage Expansion** - Add tests for untested modules and missing scenarios (completed 2026-02-22)
- [x] **Phase 31: E2E & Integration Test Expansion** - Add interaction E2E tests, integration coverage, mobile viewport testing (completed 2026-02-22)
- [x] **Phase 32: Critical Fixes & API Contract Corrections** _(2026-02-22)_ - Fix bugs, type contract violations, and safety issues found in comprehensive code review
- [x] **Phase 33: DX Convenience APIs** - Add fadeIn/fadeOut, loop, dispose, note-based oscillators, and pattern-setting convenience methods (completed 2026-02-22)
- [x] **Phase 34: Test Gap Closure** - Add tests for untested factory functions, guards, cleanup methods, and edge cases (completed 2026-02-22)
- [x] **Phase 35: Documentation Expansion & Fixes** - Add missing example pages, fix incorrect code examples, split oversized guide pages (completed 2026-02-22)
- [x] **Phase 36: Documentation Sync (Post-Fixes)** - Cross-reference all Phase 32-35 changes against docs, verify every API is accurately documented (completed 2026-02-22)
- [x] **Phase 37: Nice-to-Have DX Features** - ArrayBuffer/Blob input, noise types, volume alias, createTracks, event type improvements, DRY event system (completed 2026-02-22)
- [x] **Phase 38: Final Documentation Sync** - Document all Phase 37 additions, final verification pass, CHANGELOG update, release gate (completed 2026-02-22)
- [x] **Phase 39: Documentation Code Correctness** - Fix all broken/wrong code examples in docs and JSDoc (completed 2026-02-22)
- [x] **Phase 40: Build and Type Declaration Fixes** - Ensure published package works for all TS moduleResolution modes (completed 2026-02-22)
- [x] **Phase 41: API Type Safety** - Eliminate `any` from published types and fix misleading type contracts (completed 2026-02-22)
- [x] **Phase 42: Source Code Correctness Bugs** - Fix gain reset, stale controller, iOS init, cache safety bugs (completed 2026-02-22)
- [x] **Phase 43: Test Coverage Gaps** - Cover untested public API functions from code review (completed 2026-02-23)
- [x] **Phase 44: Docs Site SEO and Accessibility** - SEO infrastructure and WCAG 2.1 AA accessibility (completed 2026-02-24)
- [x] **Phase 45: Architecture Improvements** - Internal code clarity, named methods, resource cleanup (completed 2026-02-24)
- [x] **Phase 46: Post-Review Fixes** - Fix build compatibility, onPlayRamp bug, broken doc examples, gain restoration after fadeOut (completed 2026-02-25)

<details>
<summary>✅ Milestone 4: Deep Review Hardening (Phases 47-52) — COMPLETE 2026-02-28</summary>

**Milestone Goal:** Address all findings from the 2026-02-26 deep review — fix the ship-blocker type declaration bug, eliminate runtime crashes and unhandled rejections, clean up public exports, optimize hot-path performance, fix misleading docs, strengthen test assertions, and improve build/refactoring quality.

- [x] **Phase 47: Ship-Blocker Fix** - Remove test-only mock type from published declarations (completed 2026-02-27)
- [x] **Phase 48: Safety & Correctness** - Guard unhandled rejections, add missing dispose() methods, fix divide-by-zero and race conditions (completed 2026-02-27)
- [x] **Phase 49: Export Cleanup** - Remove internal function exports, use domain error classes (completed 2026-02-27)
- [x] **Phase 50: Code Quality** - Extract duplicated gain-interception and controller logic, strengthen test assertions, add publish tag verification (completed 2026-02-27)
- [x] **Phase 51: Performance & Safety** - Guard audioContext.resume(), add durationRaw accessor, pan validation, crossfade cache, AudioSprite node optimization, context warning, dispose cleanup, LayeredSound dispose (completed 2026-02-27)
- [x] **Phase 52: Documentation & Examples** - Fix vibrato example, correct README seek await, document soundfont blocking, add playTogether example page, widen AudioInput signatures (completed 2026-02-28)

</details>

### ✅ Milestone 5: Effects & Transport (Phases 53-60)

**Milestone Goal:** Close the feature gap between EZ Audio and full-featured audio frameworks by adding built-in effects, modulation (LFO), dynamics processing, and a global transport/clock for tempo-synced sequencing.

- [x] **Phase 53: Built-in Effects** - Delay, reverb, distortion, compressor, and EQ effects implementing the existing Effect interface (completed 2026-02-28)
- [x] **Phase 54: LFO** - Low-frequency oscillator for tremolo, vibrato, auto-filter, and auto-pan modulation (completed 2026-02-28)
- [x] **Phase 54.2: Effects & LFO Lifecycle Fixes** - Fix LFO syncLifecycle multi-target bug, add missing dispose() overrides, document BaseEffect disposal contract (QC round 1) (completed 2026-03-07)
- [x] **Phase 55: Transport + BeatTrack Sync** - Global BPM-synced clock with Web Worker reliability and multi-BeatTrack synchronization (completed 2026-02-28)
- [x] **Phase 56: Sequencer + Musical Time** - Arbitrary event sequencing with musical time notation (4n, 1m, 8t) tied to Transport (completed 2026-02-28)
- [x] **Phase 57: PolySynth** - Polyphonic oscillator voice pool with LRU stealing and shared output bus (completed 2026-02-28)
- [ ] **Phase 57.1: Transport, Sequence & PolySynth Core Fixes** - Fix voice state machine, TypedEventEmitter migration, SyncableBeatTrack interface, performance getters (QC round 1)
- [x] **Phase 58: GrainPlayer** - Granular synthesis with independent pitch shift, position scrubbing, and configurable grain parameters (completed 2026-03-01)
- [x] **Phase 58.1: GrainPlayer Hardening** - Overlap validation, WorkerTimer migration, dead code removal (QC round 1) (completed 2026-03-07)
- [x] **Phase 59: LayeredSound Effects + LFO-Effect Dispose** - Add addEffect() to LayeredSound, add dispose event to BaseEffect for LFO cleanup (completed 2026-03-01)
- [ ] **Phase 59.1: Shared API Utilities & Crossfade Fixes** - Extract convertValue utility, fix crossfade state sync, LayeredSound gain routing, AudioSprite validation (QC round 1)
- [x] **Phase 60: Milestone Verification & Checkpoint** - Write missing VERIFICATION.md files for Phases 53/56/57/58, update REQUIREMENTS.md checkboxes (completed 2026-03-01)
- [ ] **Phase 60.1: Test Coverage Gaps** - Tests for crossfade afterFade, BeatTrack.setPattern, LFO depth, createFont overload, edge cases (QC round 1)
- [ ] **Phase 60.2: Documentation Sync** - Update homepage/getting-started for M5 features, fix multiple-contexts guide, add M5 guide pages (QC round 1)

## Phase Details

### Phase 17: Dependency Security Upgrades
**Goal**: The project runs on a fully up-to-date, vulnerability-free dependency stack with all tests passing
**Depends on**: Nothing (first phase of milestone)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. `pnpm audit` reports zero vulnerabilities (no critical or moderate CVEs)
  2. All existing tests (893 unit + 20 E2E) pass after dependency upgrades
  3. The library builds successfully with the upgraded toolchain
  4. Unused dependencies are removed and package.json is clean
**Plans**: 3 plans
- [ ] 17-01-PLAN.md — Remove unused deps, upgrade vite/vitest/happy-dom
- [ ] 17-02-PLAN.md — Upgrade ESLint and @antfu/eslint-config
- [ ] 17-03-PLAN.md — Upgrade TypeScript 5.9, full stack verification

### Phase 18: Breaking API Cleanup
**Goal**: The public API is clean, consistent, and correctly encapsulated — all breaking changes applied before 1.0 locks the API
**Depends on**: Phase 17
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, DOC-01
**Success Criteria** (what must be TRUE):
  1. `.as()` is the method name on fluent `update().to()` and `seek()` chains; `.from()` no longer exists
  2. `playInIfActive()` is the method name; `ifActivePlayIn()` no longer exists
  3. `gainNode`, `pannerNode`, `effectChainInput`, and `startOffset` are protected on BaseSound and not accessible from user code
  4. The entire `connections` API (`addConnection`, `removeConnection`, `getConnection`, `getNodeFrom`, `connections`) is gone with no trace
  5. `OscillatorOpts` and `OscillatorOptsFilterValues` type aliases are removed; only `OscillatorOptions` and `OscillatorFilterOptions` remain
  6. All JSDoc comments reflect the renamed methods and removed APIs
**Plans**: 3 plans
- [x] 18-01-PLAN.md — Rename .from() to .as() on fluent chains, rename ifActivePlayIn to playInIfActive
- [x] 18-02-PLAN.md — Make internal properties protected, remove connections API, deprecated aliases, dead code
- [x] 18-03-PLAN.md — Standardize JSDoc on all public methods, create CHANGELOG.md, update guide pages

### Phase 19: DX Improvements
**Goal**: Developers can accomplish common audio tasks with less boilerplate, and the documentation reflects all new capabilities
**Depends on**: Phase 18
**Requirements**: DX-01, DX-02, DX-03, DX-04, DX-05, DX-06, DX-07, DX-08, DOC-03, DEF-05
**Success Criteria** (what must be TRUE):
  1. Toggling `effect.bypass` automatically rewires the effect chain without any manual call
  2. Effect factory functions (`createFilterEffect`, `createGainEffect`) work without passing an AudioContext argument
  3. `addEffects([effect1, effect2])` on BaseSound adds multiple effects in one call
  4. `playTogether([sound1, sound2])` plays multiple sounds synchronized to the same AudioContext timestamp
  5. `createSounds(urls[])` loads a batch of sounds and fires progress events during loading
  6. `getFilters()` on Oscillator and `getSounds()` on Sampler return readonly arrays
  7. `ControlType` is defined as a mapped type so downstream users can extend it without modifying library source
  8. Getting Started and Core Concepts guide pages reflect the renamed methods and all new convenience APIs
**Plans**: 3 plans
- [ ] 19-01-PLAN.md — Effect bypass auto-rewire, context-free factories, addEffects batch, generic createEffect
- [ ] 19-02-PLAN.md — playTogether, createSounds batch loader, getFilters/getSounds accessors, extensible ControlType
- [ ] 19-03-PLAN.md — Update Getting Started and Core Concepts guide pages

### Phase 20: Defensive Hardening
**Goal**: The library handles bad inputs and edge cases gracefully with clear errors rather than silent crashes
**Depends on**: Phase 19
**Requirements**: DEF-01, DEF-02, DEF-03, DEF-04
**Success Criteria** (what must be TRUE):
  1. Null entries in effect, filter, and sound iterations are skipped without throwing
  2. Calling `addEffect()` with a negative position throws a descriptive error
  3. Calling `Sampler.play()` with an empty sounds set throws a clear error message
  4. Controller parameter arrays are cleared between plays, eliminating the memory accumulation over repeated playback
**Plans**: 1 plan
- [ ] 20-01-PLAN.md — Null guards, input validation, empty sampler guard, controller memory cleanup

### Phase 21: Test Coverage
**Goal**: The test suite validates end-to-end audio chains, concurrent edge cases, and is organized by concern for maintainability
**Depends on**: Phase 20
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. An integration test runs a full Sound → Effect → Analyzer chain and asserts the output is audible and measurable
  2. An integration test runs the full soundfont workflow from font load through note playback
  3. `base-sound.test.ts` is split into focused files by concern (events, effects, debug, analyzer) with no file exceeding a manageable size
  4. Tests for concurrent operations exist: play-while-playing, rapid seek, and double-stop all produce predictable behavior
**Plans**: 2 plans
- [ ] 21-01-PLAN.md — Split base-sound.test.ts into focused files by concern
- [ ] 21-02-PLAN.md — Integration tests and concurrent operation tests

### Phase 22: Demo App & Release
**Goal**: The demo site reflects the final 1.0 API with no references to removed or renamed APIs, and npm 1.0.0 is published
**Depends on**: Phase 21
**Requirements**: DOC-02, DOC-04
**Success Criteria** (what must be TRUE):
  1. All demo Vue components use the new API exclusively: `.as()`, `playInIfActive()`, no deprecated `connections` calls, new convenience methods where applicable
  2. The TypeDoc API reference shows `gainNode`, `pannerNode`, `effectChainInput`, `startOffset` as protected and omits all removed deprecated exports
  3. npm 1.0.0 is published with a clean changelog documenting all breaking changes
**Plans**: 3 plans
- [ ] 22-01-PLAN.md — Update Vue demo components for 1.0 API (.as(), context-free factories, addEffects)
- [ ] 22-02-PLAN.md — TypeDoc config for protected members, comprehensive 1.0.0 CHANGELOG
- [ ] 22-03-PLAN.md — CI pipeline gates, version bump to 1.0.0, final verification

### Phase 23: Demo Example Bugfixes
**Goal**: All VitePress demo components call the correct API, follow web audio best practices, and render correctly on HiDPI displays. `audioContextAwareTimeout` is exported as a public API for consumers.
**Depends on**: Phase 22
**Success Criteria** (what must be TRUE):
  1. `audioContextAwareTimeout` is exported from `ez-web-audio` with JSDoc documentation
  2. `createAnalyzer()` receives AudioContext as first parameter in VisualizationDemo
  3. All `.as()` calls use valid RatioType values (`'ratio'`, `'inverseRatio'`, `'percent'`) — zero `.as('number')` remaining
  4. `FilterEffectOptions` properties use correct casing (`q:` not `Q:`)
  5. All effect factories use context-free API (`wrapEffect(node)` not `wrapEffect(ctx, node)`)
  6. OscillatorDemo frequency/gain sliders update in real-time without stop/recreate gaps
  7. XYPad mouseup handler is on document, not canvas — sound stops on release outside bounds
  8. TimingDemo uses the exported `audioContextAwareTimeout` for visual sync, not window.setTimeout
  9. SynthKeyboard ADSR release phase completes audibly on noteOff
  10. Canvas elements on XYPad and VisualizationDemo render crisply on HiDPI/Retina displays
  11. All demo components use public API accessors, not internal property access where avoidable
**Plans**: 4 plans
- [x] 23-01-PLAN.md — Export audioContextAwareTimeout, fix critical API bugs: createAnalyzer, .as('number'), uppercase Q, wrapEffect
- [x] 23-02-PLAN.md — Fix design issues: OscillatorDemo gaps, XYPad mouseup, TimingDemo uses exported timeout, SynthKeyboard release
- [x] 23-03-PLAN.md — Fix minor issues: canvas DPI, filter property access, distortion internals, final validation
- [x] 23-04-PLAN.md — Gap closure: fix XYPad HiDPI logical dimension reads in drawGrid and updateFromPosition

### Phase 24: Milestone Verification & Release Documentation
**Goal**: All phases are formally verified, all documentation is accurate, and npm 1.0.0 is published
**Depends on**: Phase 23
**Requirements**: API-01–07, DOC-01, DX-01–08, DEF-05, DOC-03 (verification docs only — code complete)
**Gap Closure**: Closes gaps from Milestone 3 audit
**Success Criteria** (what must be TRUE):
  1. `18-VERIFICATION.md` exists and confirms all 8 Phase 18 requirements satisfied via code inspection
  2. `19-VERIFICATION.md` exists and confirms all 10 Phase 19 requirements satisfied via code inspection
  3. `createWhiteNoise()` JSDoc example uses context-free API (`createFilterEffect('lowpass', {...})`)
  4. CHANGELOG.md 1.0.0 entry includes `audioContextAwareTimeout` as a new export
  5. All 27 REQUIREMENTS.md checkboxes marked `[x]` for completed requirements
  6. Stale `docs/classes/` directory removed from git tracking
  7. ~~npm `ez-web-audio@1.0.0` is published~~ _(deferred — publish when owner decides milestone is complete)_
**Plans**: 1 plan
- [x] 24-01-PLAN.md — Verification docs, doc fixes, tracking cleanup _(npm publish deferred)_

### ~~Phase 25~~ — New Example Pages (CONSOLIDATED into Phase 35)
**Status**: Completed via Phase 35 (Documentation Expansion). No separate directory — work was merged into Phase 35 plans.

### Phase 26: Source Code Fixes
**Goal**: All runtime bugs, race conditions, memory leaks, and API contract violations identified in code review are fixed
**Depends on**: Phase 24 (verification docs complete first)
**Gap Closure**: Closes review findings C-3, C-4, C-5, H-1–H-6, M-1–M-13, L-1–L-9
**Success Criteria** (what must be TRUE):
  1. `BeatTrackOptions`, `SamplerOptions`, `TimeObject`, `RatioType`, `SeekType` are exported from `src/index.ts`
  2. `Track.seek()` awaits `stop()` before setting new offset — no race condition
  3. `Connectable` interface `update()` signature matches `BaseSound.update()` implementation
  4. `Sound.setup()` onended cleanup is preserved through `playAt()` — nodes disconnect after natural completion
  5. `Track` emits 'end' event on natural playback completion (not just 'stop')
  6. `Oscillator.setup()` disconnects old GainNode before creating new one
  7. `Track.resume()` works when paused at position 0
  8. `playBeats()` plays ALL beats unconditionally; `playActiveBeats()` plays only active beats
  9. `BeatTrack.resume()` recalculates nextBeatTime relative to current audioContext.currentTime
  10. `exponentialRampToValueAtTime` with value 0 uses a safe near-zero value instead of throwing
  11. `AudioSprite` has a `stop()` method for looping sprites
  12. `onPlaySet` replaces (not accumulates) schedules for the same parameter
  13. `LayeredSound` removes old 'end' listeners before adding new ones on play()
  14. `_isPlaying` is set before emitting 'play' event
  15. `OscillatorController` and `SoundController` support detune/pan in scheduled values
  16. `mungeSoundFont` validates input and throws descriptive errors
  17. Response cache clone pattern is safe against double-consumption
  18. All low-priority source issues (L-1 through L-9) resolved
**Plans**: 6 plans
Plans:
- [ ] 26-01-PLAN.md — Add missing type exports, fix Connectable and Playable interfaces
- [ ] 26-02-PLAN.md — Fix BaseSound/Sound/Track playback lifecycle (seek race, onended chain, resume, _isPlaying)
- [ ] 26-03-PLAN.md — Fix BeatTrack playBeats/playActiveBeats differentiation and resume timing
- [ ] 26-04-PLAN.md — Fix controller scheduling (exponential ramp, onPlaySet dedup, detune/pan support)
- [ ] 26-05-PLAN.md — Fix memory leaks (Oscillator GainNode, AudioSprite stop, LayeredSound listeners)
- [ ] 26-06-PLAN.md — Fix utilities and low-priority issues (mungeSoundFont, response cache, L-1 through L-9)

### Phase 27: Package Quality & README
**Goal**: The npm package page is professional, discoverable, and correctly configured for all bundler environments
**Depends on**: Phase 26 (source fixes complete before package polish)
**Gap Closure**: Closes review findings C-1, C-2, H-12–H-16, L-13–L-15
**Success Criteria** (what must be TRUE):
  1. README.md has: project description, installation instructions, quick-start code examples, feature list, docs site link, badges (npm version, CI status, license)
  2. No "WORK IN PROGRESS" text remains in README
  3. `package.json` has `homepage`, `bugs`, and `main` fields
  4. Keywords include: drum-machine, synthesizer, soundfont, audio-sprite, beat, rhythm, filter, sampler, envelope, effects, typescript
  5. `publish.yml` runs lint before publish
  6. `deploy-docs-site.yml` runs typecheck and lint before deploying
  7. `SoundController`, `OscillatorController`, and `Player` interface are exported
  8. ESM-only nature is documented in README
**Plans**: 2 plans
Plans:
- [ ] 27-01-PLAN.md — Fix package.json metadata, CI quality gates, export controllers and Player
- [ ] 27-02-PLAN.md — Write professional README with badges, install, quick-start, features, ESM docs

### Phase 28: Documentation Corrections
**Goal**: All documentation accurately reflects the library's actual API behavior and all significant features have narrative docs
**Depends on**: Phase 26 (source fixes may change API behavior docs reference)
**Gap Closure**: Closes review findings C-6–C-9, H-9, H-17, M-19–M-25
**Success Criteria** (what must be TRUE):
  1. `percentPlayed` documented correctly as returning 0-100 (not 0-1) in all guide and example pages
  2. `createAnalyzer()` examples show AudioContext as first parameter
  3. FilterEffect property access uses setter pattern (`lowpass.frequency = 1200`) and lowercase `q`
  4. `addEffect()` JSDoc in base-sound.ts uses current context-free factory signature
  5. `rewireEffects()` documentation is consistent — auto-rewire for bypass, manual only for add/remove
  6. Synth keyboard example has `async` on functions using `await`
  7. AudioSprite/createSprite has narrative docs (example page deferred to Phase 25)
  8. crossfade utility has narrative docs (example deferred to Phase 25)
  9. playTogether utility has narrative docs (example deferred to Phase 25)
  10. useInteractionMethods, preventEventDefaults, clearPreloadCache, debug utilities, and Envelope class all documented
**Plans**: 2 plans
Plans:
- [ ] 28-01-PLAN.md — Fix incorrect docs (percentPlayed, createAnalyzer, FilterEffect, addEffect JSDoc, rewireEffects, async)
- [ ] 28-02-PLAN.md — Add missing feature documentation (AudioSprite, crossfade, playTogether, interaction helpers, cache, debug, Envelope)

### Phase 29: Demo Component Fixes
**Goal**: All VitePress demo components work correctly, are accessible, and follow best practices
**Depends on**: Phase 26 (source fixes may affect demo behavior)
**Gap Closure**: Closes review findings H-7, H-8, M-14–M-18, L-10–L-12
**Success Criteria** (what must be TRUE):
  1. SampledDrumKit.vue cleanup uses correct API (not nonexistent `sampler.stop()`)
  2. DrumMachineVue.vue BPM watcher uses `setTempo(bpm)` instead of setTimeout stop/restart
  3. PianoKeyboard touchmove handles sliding between keys without stuck notes
  4. AmbientGenerator filter frequency assignment works correctly through proxy
  5. FilterDemo does not call `rewireEffects()` manually (auto-rewire handles it)
  6. All interactive elements have aria-labels (sliders, play buttons)
  7. Volume warnings use accessible text (not emoji-only)
  8. XYPad height calculation doesn't fall back to clientWidth
  9. Demo components use proper TypeScript types instead of `any` for library instances
  10. SoundfontPiano cleanup stops playing notes before disposing
**Plans**: 3 plans
Plans:
- [ ] 29-01-PLAN.md — Fix SampledDrumKit cleanup, DrumMachineVue BPM watcher, FilterDemo rewireEffects
- [ ] 29-02-PLAN.md — Fix PianoKeyboard touch sliding, verify AmbientGenerator filter, fix SoundfontPiano cleanup
- [ ] 29-03-PLAN.md — Add aria-labels, fix volume warnings, fix XYPad height, replace any types

### Phase 30: Test Coverage Expansion
**Goal**: All untested modules and missing test scenarios identified in code review are covered
**Depends on**: Phase 26 (test the fixed code, not the buggy code)
**Gap Closure**: Closes review findings T-1–T-9, M-27
**Success Criteria** (what must be TRUE):
  1. `timeout.ts` has tests covering RAF-based timing, audioContext.currentTime drift correction, cancellation
  2. `equal-power-crossfade.ts` has tests verifying cos/sin curve math and edge cases (0, 0.5, 1)
  3. `beat.ts` has tests for `playIfActive()` and `playInIfActive()` — the primary BeatTrack scheduler methods
  4. `play-together.ts` has tests for synchronized playback, error handling, empty array
  5. BaseSound timing methods tested: `playFor()`, `playInAndStopAfter()`, `stopIn()`, `stopAt()`
  6. Oscillator `addFilter()`, filter wiring, and anti-click fade-out tested
  7. OscillatorController frequency ramp scheduling tested
  8. Integration tests exist for Track+effects and BeatTrack+effects combinations
  9. Factory function error propagation paths tested
  10. Cleanup/dispose pattern has at least one integration test
**Plans**: 3 plans
Plans:
- [ ] 30-01-PLAN.md — Test untested utilities: timeout.ts, equal-power-crossfade.ts, play-together.ts
- [ ] 30-02-PLAN.md — Expand beat.ts, sound.ts timing, and oscillator-controller.ts ramp tests
- [ ] 30-03-PLAN.md — Oscillator filter chain tests, integration tests (Track+effects, factory errors, dispose)

### Phase 31: E2E & Integration Test Expansion
**Goal**: E2E tests verify actual user interactions and the test infrastructure is robust
**Depends on**: Phase 29 (demo fixes complete before testing demos)
**Gap Closure**: Closes review findings H-10, H-11, T-10, M-26, L-17
**Success Criteria** (what must be TRUE):
  1. At least 5 demo pages have E2E tests that click buttons, toggle beats, or interact with controls
  2. E2E tests verify DOM changes after interaction (not just absence of JS errors)
  3. Integration tests cover Track+effects, Oscillator+filters, BeatTrack+effects, Sampler, and LayeredSound
  4. All `waitForTimeout(3000)` calls replaced with condition-based waits (`waitForSelector`, `waitForFunction`)
  5. At least one Playwright test runs with a mobile viewport configuration
**Plans**: 2 plans
Plans:
- [ ] 31-01-PLAN.md — E2E interaction tests: replace waitForTimeout, add DOM verification, mobile viewport
- [ ] 31-02-PLAN.md — Integration test additions: Oscillator+filters, Sampler, LayeredSound suites

### Phase 32: Critical Fixes & API Contract Corrections
**Goal**: All bugs, type contract violations, and safety issues identified in comprehensive code review are fixed
**Depends on**: Phase 31
**Requirements**: FIX-01 through FIX-09
**Gap Closure**: Closes code review critical findings C-1 through C-5, S-1, S-2, S-5, S-12
**Success Criteria** (what must be TRUE):
  1. MIT LICENSE file exists at project root and is included in npm package
  2. `AudioSprite` with `loop: true` actually loops (duration arg not passed to `source.start()` when looping)
  3. `EnvelopeOptions` uses short property names (`attack`, `decay`, `sustain`, `release`) matching standard ADSR convention and all JSDoc examples
  4. `Playable` interface return types match implementations (`Promise<void>` for async methods)
  5. Stale setTimeout from previous play cannot corrupt `_isPlaying` of current play (timeout ID stored and cancelled in `stop()`)
  6. `Sound` constructor `opts` parameter is typed (not `any`)
  7. `createFont()` checks `response.ok` and wraps fetch in try/catch with descriptive errors
  8. `CLAUDE.md` uses `.as('ratio')` not `.from('ratio')`
  9. `Oscillator.setup()` documents or mitigates GainNode replacement (consumers warned about cached references)
**Plans**: 3 plans
Plans:
- [ ] 32-01-PLAN.md — Quick fixes: LICENSE, CLAUDE.md, Playable interface, Sound opts type, createFont error handling
- [ ] 32-02-PLAN.md — EnvelopeOptions short ADSR names rename, Oscillator GainNode replacement warning
- [ ] 32-03-PLAN.md — AudioSprite loop fix, BaseSound stale setTimeout _isPlaying safety

### Phase 33: DX Convenience APIs
**Goal**: Common audio operations that currently require multiple API calls are available as single convenience methods
**Depends on**: Phase 32
**Requirements**: DX2-01 through DX2-06
**Success Criteria** (what must be TRUE):
  1. `sound.fadeIn(duration)` plays with a gain ramp from 0 to current gain over `duration` seconds
  2. `sound.fadeOut(duration)` ramps gain to 0 over `duration` seconds then stops
  3. `Sound.loop` and `Track.loop` properties enable native looping without timing gaps
  4. `BaseSound.dispose()` disconnects all audio nodes, removes event listeners, and marks instance as disposed
  5. `createAnalyzer()` has an overload that works without AudioContext parameter (matching other factory patterns)
  6. `createOscillator({ note: 'A4' })` accepts a note name and looks up frequency from `frequencyMap`
  7. `BeatTrack.setPattern([1,0,1,0])` sets beat active states from an array
**Plans**: 2 plans
Plans:
- [ ] 33-01-PLAN.md — Add fadeIn/fadeOut, loop property, and dispose() to BaseSound/Sound/Track
- [ ] 33-02-PLAN.md — Add context-free createAnalyzer, note-based oscillator, BeatTrack.setPattern

### Phase 34: Test Gap Closure
**Goal**: All untested public methods, guards, and edge cases identified in test coverage review are covered
**Depends on**: Phase 33 (test the new APIs too)
**Requirements**: TEST2-01 through TEST2-09
**Success Criteria** (what must be TRUE):
  1. Factory functions (`createSound`, `createTrack`, `createSounds`, `createBeatTrack`, `createSampler`, `createFont`, `createSprite`) have dedicated tests including error paths
  2. Oscillator `frequency: 0` behavior is consistent between source guard and test (contradiction resolved)
  3. `AudioSprite.stop(name)` and `stopAll()` have test coverage
  4. `changeGainTo()` negative value rejection and gain > 1 warning are tested
  5. `getGainNode()` returns correct node and is tested
  6. `addEffects()` happy path (batch adding multiple effects) is tested
  7. `BeatTrack.on()`, `.off()`, `.once()` convenience methods are tested
  8. `Envelope.estimateCurrentValue()` and `isActive` are tested through lifecycle
  9. `Analyzer.fftSize` setter validation (non-power-of-2 rejection) is tested
**Plans**: 2 plans
Plans:
- [ ] 34-01-PLAN.md — Factory function tests, oscillator frequency:0 fix, AudioSprite stop/stopAll tests
- [ ] 34-02-PLAN.md — changeGainTo guards, getGainNode, addEffects happy path, BeatTrack events, verify Envelope/Analyzer

### Phase 35: Documentation Expansion & Fixes
**Goal**: Every significant library feature has an interactive example, all code examples are correct, and guides are well-organized
**Depends on**: Phase 33 (document new convenience APIs)
**Requirements**: DOC2-01 through DOC2-09
**Success Criteria** (what must be TRUE):
  1. AudioSprite interactive example page exists with Vue demo component
  2. LayeredSound interactive example page exists with Vue demo component
  3. Crossfade interactive demo page exists with Vue demo component
  4. React integration example exists (hooks pattern with useRef, useEffect)
  5. `concepts.md` split into focused pages (concepts, parameter-control, utilities) each under ~250 lines
  6. `changeFrequencyTo()` removed from synthesis.md, replaced with correct `.update('frequency')` API
  7. `audio-routing.md` uses recommended 1-arg `wrapEffect()` form consistently
  8. All example pages have proper `<script setup>` imports for their components
  9. Integration patterns (Vue, Vanilla TS) listed on examples index page
**Plans**: 3 plans
Plans:
- [ ] 35-01-PLAN.md — Split concepts.md into focused pages, fix synthesis.md and audio-routing.md API examples
- [ ] 35-02-PLAN.md — Create AudioSprite, LayeredSound, Crossfade interactive example pages with Vue components
- [ ] 35-03-PLAN.md — Create React integration example, update examples index with integration patterns

### Phase 36: Documentation Sync (Post-Fixes)
**Goal**: All documentation accurately reflects every change made in Phases 32-35
**Depends on**: Phase 35
**Requirements**: SYNC-01 through SYNC-04
**Success Criteria** (what must be TRUE):
  1. Every public API method signature in guide/example pages matches actual implementation
  2. Every code example in docs compiles against current TypeScript types (no references to removed/renamed APIs)
  3. API reference (TypeDoc) regenerated and reflects Phase 32-33 changes
  4. Navigation sidebar, example index, and cross-links all resolve correctly
  5. CHANGELOG.md updated with all Phase 32-35 changes
**Plans**: 2 plans
Plans:
- [ ] 36-01-PLAN.md — Update guide pages with Phase 33 convenience APIs, update CHANGELOG with Phase 32-35 entries
- [ ] 36-02-PLAN.md — Regenerate TypeDoc API reference, final cross-reference verification

### Phase 37: Nice-to-Have DX Features
**Goal**: The library covers all common audio development patterns with ergonomic APIs
**Depends on**: Phase 34 (tests pass before adding new features)
**Requirements**: DX3-01 through DX3-09
**Success Criteria** (what must be TRUE):
  1. `createSound()` and `createTrack()` accept `ArrayBuffer`, `Blob`, or `File` as input (not just URLs)
  2. `createNoise('pink' | 'brown' | 'white')` factory exists for noise generation
  3. `volume` is an alias property for gain on BaseSound (get/set)
  4. `createTracks(urls[], onProgress?)` batch loader matches `createSounds()` pattern
  5. Event detail `source` typed as `BaseSound | BeatTrack | LayeredSound` instead of `unknown`
  6. `ControlType` narrowed per class — `Sound.update()` only accepts `'gain' | 'pan' | 'detune'`
  7. `SoundEventType`, `BeatTrackEventMap`, `BeatEventDetail` exported from public API
  8. Event system `on/off/once/emit` extracted into shared `TypedEventTarget<TMap>` mixin (DRY)
  9. `onPlaySet()` behavior documented prominently — schedules consumed after one play
**Plans**: 3 plans
Plans:
- [ ] 37-01-PLAN.md — ArrayBuffer/Blob/File input, createNoise factory, volume alias, createTracks batch loader
- [ ] 37-02-PLAN.md — Type event sources, narrow ControlType per class, export event map types
- [ ] 37-03-PLAN.md — Extract shared TypedEventEmitter mixin, document onPlaySet consumption

### Phase 38: Final Documentation Sync
**Goal**: All Phase 37 additions are fully documented with examples, and the entire docs site is verified accurate
**Depends on**: Phase 37
**Requirements**: SYNC2-01 through SYNC2-04
**Success Criteria** (what must be TRUE):
  1. All Phase 37 new APIs (ArrayBuffer input, noise types, volume alias, createTracks, typed events) have docs coverage
  2. Every public export in `src/index.ts` has a corresponding mention in guide or example pages
  3. Full lint + typecheck + test suite passes
  4. CHANGELOG.md has complete record of all Phases 32-38
  5. Documentation site builds without warnings
**Plans**: 2 plans
Plans:
- [ ] 38-01-PLAN.md — Document Phase 37 APIs in guide pages, audit all public exports for docs coverage
- [ ] 38-02-PLAN.md — Update CHANGELOG with Phase 37 additions, run full verification suite

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-11 | M1: MVP | 48/48 | Complete | 2026-02-14 |
| 12-16 | M2: Quality & Polish | 20/20 | Complete | 2026-02-16 |
| 17-46 | M3: Stable Release | 52+/52+ | Complete | 2026-02-25 |
| 47-52 | M4: Deep Review Hardening | 13/13 | Complete | 2026-02-28 |
| 53. Built-in Effects | M5: Effects & Transport | 4/4 | Complete | 2026-02-28 |
| 54. LFO | M5 | 2/2 | Complete | 2026-02-28 |
| 54.1. Deep Review Fixes | M5 | 4/4 | Complete | 2026-02-28 |
| 55. Transport + BeatTrack Sync | M5 | 0/? | Not started | - |
| 56. Sequencer + Musical Time | 1/2 | In Progress|  | - |
| 57. PolySynth | M5 | 2/2 | Complete | 2026-02-28 |
| 58. GrainPlayer | 2/2 | Complete    | 2026-03-01 | - |

### Phase 39: Documentation Code Correctness

**Goal:** Fix all broken/wrong code examples in docs and JSDoc before users copy them
**Depends on:** Phase 38
**Requirements:** CR2, HI2, HI3, M9, M10, M11, M12
**Success Criteria** (what must be TRUE):
  1. Landing page synthesizer example uses only real exported APIs with correct async/await
  2. Every `createAnalyzer()` call in docs and JSDoc has `await`
  3. React oscillator example uses `type`, not `waveType`
  4. README Node.js version matches package.json engines (18+)
  5. Bundle size claim is verified and accurate
  6. Noise docs accurately describe non-auto-looped Sound instance
  7. Tone.js TypeScript column is factually correct
**Plans:** 2/2 plans complete

Plans:
- [ ] 39-01-PLAN.md — Fix createAnalyzer await, React waveType, README Node.js version, noise docs
- [ ] 39-02-PLAN.md — Fix landing page synthesizer example, bundle size claim, Tone.js TypeScript claim

### Phase 40: Build and Type Declaration Fixes

**Goal:** Ensure published package works for all TS moduleResolution modes; CI catches build failures
**Depends on:** Phase 39
**Requirements:** CR1, HI1, M19, M20, L23, L24, L25, L27
**Success Criteria** (what must be TRUE):
  1. Every `.d.ts` barrel file in `dist/` has a corresponding `.js` file (nodenext-compatible)
  2. CI runs `pnpm build:lib` and catches build failures before merge
  3. `prepublishOnly` runs typecheck, lint, test, and build
  4. deploy-docs uses `--frozen-lockfile` for reproducible installs
  5. No redundant build scripts in package.json
  6. No stale tsconfig path aliases
  7. Publish workflow builds library exactly once
**Plans:** 2/2 plans complete

Plans:
- [ ] 40-01-PLAN.md — Fix dist barrel JS files, clean build scripts, remove stale tsconfig aliases
- [ ] 40-02-PLAN.md — Add build:lib to CI, fix deploy-docs lockfile, harden prepublishOnly, deduplicate publish

### Phase 41: API Type Safety

**Goal:** Eliminate `any` from published types and fix misleading type contracts
**Depends on:** Phase 40
**Requirements:** TYPE-01, TYPE-02, TYPE-03, TYPE-04
**Success Criteria** (what must be TRUE):
  1. `ParamController.updateAudioSource` parameter typed as `OscillatorNode | AudioBufferSourceNode` (no `any`)
  2. `BaseSoundEventMap` and `TrackEventMap` exported as separate types for precise consumer typing
  3. `Connectable.audioSourceNode` typed as `OscillatorNode | AudioBufferSourceNode` (not `AudioNode`)
  4. `Playable` interface documents its scope and includes optional convenience method signatures
**Plans:** 1/1 plans complete

Plans:
- [ ] 41-01-PLAN.md — Fix ParamController any, split event maps, narrow Connectable, expand Playable

### Phase 42: Source Code Correctness Bugs

**Goal:** Fix real bugs where audio behavior doesn't match user intent — gain reset, stale controller references, iOS init ordering, and cache safety
**Depends on:** Phase 41
**Requirements:** BUG-01, BUG-02, BUG-03, BUG-04, BUG-05
**Gap Closure:** Closes review findings M1, M2, M3, M4, L9
**Success Criteria** (what must be TRUE):
  1. Oscillator preserves user-set gain value across play() calls
  2. Sound.setup() updates controller with new AudioBufferSourceNode
  3. load() calls initAudio() before any AudioContext usage including cache-hit path
  4. Cache eviction runs after every responseCache.set() in load() and createSprite()
  5. responseCache is not directly exported as a mutable Map
**Plans:** 2/2 plans complete

Plans:
- [ ] 42-01-PLAN.md — Fix Oscillator gain reset and Sound controller update
- [ ] 42-02-PLAN.md — Fix load() init ordering, cache eviction, and responseCache encapsulation

### Phase 43: Test Coverage Gaps

**Goal:** Cover untested public API functions identified in code review to prevent regressions — cache management, DOM helpers, Sound.loop, note-based oscillators, Sampler.stop, AudioContext singleton, and factory functions
**Depends on:** Phase 42
**Requirements:** TCOV-01 through TCOV-13
**Gap Closure:** Closes review findings M13, M14, M15, M16, M17, M18, L15-L20
**Success Criteria** (what must be TRUE):
  1. `setPreloadCacheLimit` and cache eviction have tests for limit setting, eviction, and edge cases
  2. `preventEventDefaults` and `useInteractionMethods` tested with DOM simulation
  3. `Sound.loop` property has get/set and lifecycle tests
  4. `createOscillator({ note: 'A4' })` note lookup path tested
  5. `Sampler.stop()` has stop propagation and state tests
  6. `audio-context.ts` has dedicated test file with singleton and recovery tests
  7. `createNotes()`, `_disposeUnmute()`, context-free `createAnalyzer`, `createLayeredSound` factory functions tested
  8. Oscillator `frequency: 0` behavior verified in tests
  9. Envelope negative value handling tested or documented
  10. Preload cache accessor functions tested
**Plans:** 3/3 plans complete

Plans:
- [ ] 43-01-PLAN.md — Cache management, AudioContext singleton, and envelope edge case tests
- [ ] 43-02-PLAN.md — Sound.loop, oscillator note path, Sampler stop, frequency:0 tests
- [ ] 43-03-PLAN.md — DOM helpers, createNotes, _disposeUnmute, createAnalyzer, createLayeredSound tests

### Phase 44: Docs Site SEO and Accessibility

**Goal:** Ensure the docs site has proper SEO infrastructure (OG images, per-page meta, canonical URLs) and meets WCAG 2.1 AA accessibility standards for all interactive demos
**Depends on:** Phase 43
**Requirements:** SEO-01, SEO-02, SEO-03, SEO-04, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07
**Success Criteria** (what must be TRUE):
  1. OG image is a 1200x630 PNG with proper `og:image:width`/`og:image:height` tags and `twitter:card` is `summary_large_image`
  2. Each docs page has its own OG title, description, and canonical URL via `transformHead`
  3. JSON-LD structured data includes `version` and `dateCreated`
  4. Every interactive demo button has visible `focus-visible` outline styles
  5. Visualization canvases have `role="img"` and descriptive `aria-label`
  6. XY Pad canvas is keyboard operable via arrow keys
  7. DrumMachine active beats have secondary visual indicator beyond color
  8. DrumMachine grid has mobile scroll affordance and loading state on first play
  9. Piano keyboard shortcut hint is announced to screen readers
**Plans:** 3/3 plans complete

Plans:
- [ ] 44-01-PLAN.md — SEO infrastructure: OG image PNG, per-page meta via transformHead, canonical URLs, JSON-LD enrichment
- [ ] 44-02-PLAN.md — Demo accessibility: focus-visible styles, canvas a11y, DrumMachine beat indicators/scroll/loading
- [ ] 44-03-PLAN.md — XY Pad keyboard operation, piano keyboard hint screen reader access

### Phase 45: Architecture Improvements

**Goal:** Improve internal code clarity by documenting architectural decisions (BeatTrack events, Sampler override), extracting implicit cleanup into named methods (Track._resetPosition), adding resource release (AudioSprite.dispose), annotating internal state, and simplifying stopAt scheduling
**Depends on:** Phase 44
**Requirements:** ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06
**Plans:** 2/2 plans complete

Plans:
- [ ] 45-01-PLAN.md — Extract Track _resetPosition, add AudioSprite dispose, annotate _unmuteDispose
- [ ] 45-02-PLAN.md — Document BeatTrack events, Sampler override warning, simplify stopAt scheduling

### Phase 46: Post-Review Fixes

**Goal:** Fix all actionable findings from the 2026-02-25 health check review — build compatibility, core API bugs, broken doc examples, type correctness, and minor leaks
**Depends on:** Phase 45
**Gap Closure:** Closes 2026-02-25 deep review findings C1, H1, H2, M1, M2, L1, F5, F6, F7
**Success Criteria** (what must be TRUE):
  1. `dist/index.d.ts` is a single bundled declaration file with no cross-file `.d.ts` imports — `moduleResolution: "nodenext"` consumers get zero TS errors
  2. `onPlayRamp('gain').from(0.5).to(1).in(2)` actually sets gain to 0.5 at time 0, then ramps to 1 — the `from` value is not silently discarded
  3. Landing page drum machine example uses `createBeatTrack(urls[], opts)` with correct `playBeats()` API
  4. Landing page effects example uses `createFilterEffect(type, options)` positional signature
  5. `docs/examples/effects.md` createAnalyzer has `await`, uses Analyzer wrapper API not raw AnalyserNode
  6. `docs/examples/layered-sound.md` event handlers destructure from `event.detail`
  7. After `fadeOut()` on Sound/Track, subsequent `play()` produces audio at the expected gain (not silence)
  8. After Oscillator stop (anti-click fade), subsequent `play()` produces audio at the expected gain
  9. `Sound` type only exposes events it actually emits — no phantom `pause`/`resume`/`seek` from Track inheritance
  10. `_disposeUnmute` test asserts dispose handle is actually called (not just "doesn't throw")
  11. `createNotes()` parses standard note name keys to populate `letter`, `accidental`, and `octave` on Note objects
  12. `Beat.pendingTimerIds` self-cleans completed timer IDs during playback — no unbounded growth
  13. L2 (`unmute.js` missing `.d.ts`) verified resolved by C1 rollupTypes fix
**Plans:** 4/4 plans complete

Plans:
- [ ] 46-01-PLAN.md — Enable rollupTypes for bundled .d.ts output (C1)
- [ ] 46-02-PLAN.md — Fix onPlayRamp().from() bug and gain restoration after fadeOut/stop (H1, M1)
- [ ] 46-03-PLAN.md — Fix broken code examples in landing page and doc pages (H2, M2)
- [ ] 46-04-PLAN.md — Generic BaseSound event map, createNotes parsing, Beat timer cleanup, _disposeUnmute test (L1, F5, F6, F7)



### Phase 47: Ship-Blocker Fix
**Goal**: Published type declarations no longer import test-only dependencies
**Depends on**: Phase 46
**Requirements**: SHIP-01
**Success Criteria** (what must be TRUE):
  1. `pnpm build:lib` produces declarations that do not reference `standardized-audio-context-mock`
  2. A TypeScript consumer project with `moduleResolution: "nodenext"` can import `ez-web-audio` without seeing test-mock types in `ContextLike`
  3. `timeout.ts` compiles correctly using only production-safe types for its `AudioContext`-like parameter
**Plans**: 1 plan
Plans:
- [ ] 47-01-PLAN.md — Remove mock type import from timeout.ts and verify clean declarations

### Phase 48: Safety & Correctness
**Goal**: Fire-and-forget play methods handle errors, dispose properly cleans up nodes, and divide-by-zero and race conditions are eliminated
**Depends on**: Phase 47
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, SAFE-06
**Success Criteria** (what must be TRUE):
  1. Calling `playFor()`, `playIn()`, `playInAndStopAfter()`, `Sampler.play()`, and `Track.resume()` — if the underlying play rejects — the error is caught and does not surface as an unhandled promise rejection
  2. After `dispose()` on a Sound, the `audioSourceNode` is disconnected and its `onended` handler is null
  3. After `BeatTrack.dispose()`, playback has stopped, all beats are cleared, and no audio resources remain referenced
  4. `Track.percentPlayed` returns 0 when duration is 0 (no NaN, no divide-by-zero exception)
  5. Rapid sequential calls to `Track.seek()` do not corrupt `startOffset` (last seek wins, no race condition)
  6. When one layer of a `LayeredSound` fails to play, the other layers still play to completion
**Plans**: 2 plans
- [ ] 48-01-PLAN.md — Fire-and-forget error handling, dispose cleanup, divide-by-zero guard, seek race condition fix
- [ ] 48-02-PLAN.md — BeatTrack.dispose(), LayeredSound.play() allSettled resilience

### Phase 49: Export Cleanup
**Goal**: The public API surface is free of internal test helpers, and error paths throw domain-specific error types
**Depends on**: Phase 48
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. `_disposeUnmute` is not importable from the public `ez-web-audio` package entry point
  2. When `createFont()` fails to load a soundfont, the thrown error is an `AudioLoadError` instance (not a plain `Error`)
  3. When an oscillator is created with an unrecognized note name, the thrown error is an `InvalidNoteError` instance
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 50: Code Quality
**Goal**: Duplicated logic is extracted, test assertions verify real behavior, and the publish CI prevents version mismatches
**Depends on**: Phase 49
**Requirements**: REFAC-01, REFAC-02, TEST-01, TEST-02, TEST-03, BUILD-01
**Success Criteria** (what must be TRUE):
  1. The `_targetGain` syncing logic exists in exactly one place on `BaseSound` — `base-sound.ts` and `oscillator.ts` do not each maintain their own copy
  2. The `applyValues` and `applyRampValues` shared logic exists in exactly one place in `BaseParamController` — `SoundController` and `OscillatorController` do not each maintain their own copy
  3. `onPlaySet` and `onPlayRamp` tests assert that the scheduled parameter value is actually applied to the audio node during playback (not just that the call completes without error)
  4. A dedicated test verifies that the `end` event fires on a `Sound` instance when natural playback completes (not just when `stop()` is called)
  5. A test verifies that event listeners registered before `dispose()` stop firing after `dispose()` is called
  6. The publish workflow fails fast when the git tag does not match `package.json` version — publishing with a mismatched tag is not possible
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 51: Performance & Safety
**Goal**: Hot-path audio operations avoid redundant work, and remaining safety gaps from the deep review are closed
**Depends on**: Phase 50
**Requirements**: PERF-02, PERF-04, SAFE-07, SAFE-08, SAFE-09, SAFE-10, PERF-05, PERF-06
**Success Criteria** (what must be TRUE):
  1. A hot-path caller using `durationRaw` (or equivalent numeric accessor) gets a number directly without constructing a `TimeObject`
  2. `audioContext.resume()` is only called when `audioContext.state === 'suspended'` — calling `play()` on an already-running context does not invoke `resume()`
  3. Creating a new `AudioContext` after a previous one closed logs a console warning identifying any orphaned sounds
  4. After `dispose()`, event listeners registered on a sound no longer fire (or the docs explicitly state consumers must call `off()` before `dispose()`)
  5. `LayeredSound.dispose()` stops and disposes all layers
  6. Calling `changePanTo()` with a value outside `[-1, 1]` logs a console warning
  7. `AudioSprite` skips gain or panner node creation when the value is at its default (gain=1, pan=0)
  8. Crossfade curve arrays are cached at module level and not regenerated on every call
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 52: Documentation & Examples
**Goal**: All documentation examples are correct, limitations are documented, and every significant feature has an interactive example
**Depends on**: Phase 51
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DX-01
**Success Criteria** (what must be TRUE):
  1. The vibrato example in `docs/guide/parameter-control.md` either works correctly with consume-once semantics or clearly explains that `onPlaySet`/`onPlayRamp` must be re-scheduled before each play
  2. The README `song.seek(30)` example does not show `await` — `seek().as()` returns void and is not a Promise
  3. Soundfont parsing is documented with a note that large files (5-20 MB) may cause a UI freeze on mobile
  4. `createBeatTrack()` and `createSampler()` accept `AudioInput[]` (not just `string[]`), or their limitation is documented
  5. A playTogether example page exists at `docs/examples/play-together.md` with a Vue component demonstrating synchronized sound triggering
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 53: Built-in Effects
**Goal**: Developers can apply professional-quality delay, reverb, distortion, compressor, and EQ effects to any sound using the existing addEffect() API — no third-party libraries required
**Depends on**: Phase 52
**Requirements**: FX-01, FX-02, FX-03, FX-04, FX-05, FX-06
**Success Criteria** (what must be TRUE):
  1. Developer can call `createDelay({ time: 0.3, feedback: 0.5, mix: 0.4 })` and add it to any Sound, Oscillator, or LayeredSound via `addEffect()`
  2. Developer can call `createReverb(url)` (or `createReverb({ decay, preDelay })` for algorithmic) and the effect applies convolution reverb to playback
  3. Developer can call `createDistortion({ amount: 50, mix: 0.6 })` and the WaveShaper curve distorts the signal at the configured amount
  4. Developer can call `createCompressor({ threshold: -24, ratio: 4, knee: 30, attack: 0.003, release: 0.25 })` and the DynamicsCompressorNode reduces dynamic range
  5. Developer can call `createEQ({ low: 3, mid: -2, high: 4 })` and the three-band filter adjusts frequency balance
**Plans**: 4 plans
- [x] 53-01-PLAN.md — BaseEffect + FilterEffect refactor + DelayEffect
- [x] 53-02-PLAN.md — Distortion + Compressor effects
- [x] 53-03-PLAN.md — Reverb (algorithmic + convolution)
- [x] 53-04-PLAN.md — EQ (three-band equalizer)

### Phase 54: LFO
**Goal**: Developers can create a low-frequency oscillator and connect it to any audio parameter on any sound, enabling tremolo, vibrato, auto-filter, and auto-pan effects with no memory leaks
**Depends on**: Phase 53
**Requirements**: MOD-01, MOD-02, MOD-03
**Success Criteria** (what must be TRUE):
  1. Developer can call `createLFO({ frequency: 5, depth: 0.3, type: 'sine' })` and receive an LFO instance with start/stop/dispose methods
  2. Developer can call `lfo.connect(sound, 'gain')` and the sound's gain oscillates at the LFO frequency — producing an audible tremolo effect
  3. After calling `sound.dispose()`, the LFO connected to that sound stops running and releases all AudioNode references (no memory leak, no zombie OscillatorNode)
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 54.1: Effects and LFO Deep Review Fixes (INSERTED)

**Goal:** Fix all LFO lifecycle bugs, complete BaseEffect API surface, add input validation to all parameter setters, and apply performance optimizations identified in the 2026-02-28 deep review of Phases 53-54
**Requirements**: C1, H1, H2, H3, H4, M1, M2, M3, M4, M5, M6, M7, M8, M9, L1, L2, L3, L4, L8
**Depends on:** Phase 54
**Plans:** 4/4 plans complete

Plans:
- [ ] 54.1-01-PLAN.md — LFO lifecycle: event-based dispose, mutual exclusion, error handling (C1, H1, H2, M1)
- [ ] 54.1-02-PLAN.md — BaseEffect completeness: JSDoc, getAudioContext(), dispose(), export (H3, M2, M3, M4)
- [ ] 54.1-03-PLAN.md — Validation and performance: input guards, clamping, curve optimization, smooth transitions (H4, M5-M9, L1-L4)
- [ ] 54.1-04-PLAN.md — Test coverage: disconnect-all, getParam, convolution URL, edge cases (L8)

### Phase 55: Transport + BeatTrack Sync
**Goal**: Developers can create a global Transport clock that multiple BeatTracks lock to, enabling perfect multi-track synchronization that survives background tab throttling
**Depends on**: Phase 54
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04
**Success Criteria** (what must be TRUE):
  1. Developer can call `createTransport({ bpm: 120, timeSignature: [4, 4] })` and the Transport starts a Web Worker-backed clock that is not throttled when the tab is hidden
  2. Developer can call `transport.start()`, `transport.pause()`, and `transport.stop()` — position advances during play, freezes on pause, and resets to 0 on stop
  3. Developer can call `beatTrack.syncTo(transport)` and the BeatTrack's internal `setTimeout` scheduler is disabled — beats are triggered by the Transport clock instead
  4. Two BeatTracks both synced to the same Transport play in lockstep with no audible drift between their beat patterns
Plans:
- [x] 55-01-PLAN.md — WorkerTimer shared utility (Wave 1)
- [x] 55-02-PLAN.md — Transport class with lifecycle, position, events (Wave 2)
- [x] 55-03-PLAN.md — BeatTrack WorkerTimer migration (Wave 2)
- [x] 55-04-PLAN.md — syncTo/unsync integration with mute/solo (Wave 3)

### Phase 56: Sequencer + Musical Time
**Goal**: Developers can schedule arbitrary callbacks at musical time positions using human-readable notation, and live BPM changes take effect immediately without re-scheduling
**Depends on**: Phase 55
**Requirements**: SEQ-01, SEQ-02, SEQ-03
**Success Criteria** (what must be TRUE):
  1. Developer can call `sequence.at('1m', callback)` and `sequence.at('2:2', callback)` — callbacks fire at the correct musical positions when the Transport is running
  2. Developer can use musical time strings `"4n"` (quarter note), `"8t"` (eighth triplet), `"2m"` (two bars) — all parse correctly and schedule at the right beat offset relative to current BPM
  3. Changing `transport.bpm` during playback causes subsequent beat scheduling to use the new BPM without needing to call `sequence.reschedule()` or restart the Transport
**Plans**:
- [x] 56-01-PLAN.md — Musical time parser utility (TDD, Wave 1)
- [x] 56-02-PLAN.md — Sequence class + Transport integration (Wave 2)

### Phase 57: PolySynth
**Goal**: Developers can play multiple simultaneous notes through a single PolySynth instance without manual voice management — chords and rapid melodic passages play cleanly with no clicks when voices are stolen
**Depends on**: Phase 53 (effects integration patterns inform output bus design)
**Requirements**: SYNTH-01, SYNTH-02
**Success Criteria** (what must be TRUE):
  1. Developer can call `polySynth.play('C4')`, `polySynth.play('E4')`, `polySynth.play('G4')` within the same event handler and all three notes sound simultaneously
  2. When the voice pool is full and a new note is requested, the oldest-released voice is stolen — the stolen voice fades out over 10ms before the new note begins (no audible click)
  3. Developer can call `polySynth.addEffect(delay)` and the effect applies to all voices through the shared output bus
**Plans**:
- [x] 57-01-PLAN.md — PolySynth core class with voice pool and TDD (Wave 1)
- [x] 57-02-PLAN.md — createPolySynth factory and exports (Wave 2)

### Phase 58: GrainPlayer
**Goal**: Developers can create texture and pad sounds from an audio buffer with independent control over pitch and playback position — without requiring any external library
**Depends on**: Phase 55 (lookahead scheduler pattern refined in Transport/Sequencer phases)
**Requirements**: SYNTH-03, SYNTH-04
**Success Criteria** (what must be TRUE):
  1. Developer can call `createGrainPlayer(buffer, { grainSize: 0.1, overlap: 0.05 })` and the GrainPlayer emits a continuous texture from overlapping audio grains
  2. Developer can set `grainPlayer.position` to scrub through different parts of the source buffer while the GrainPlayer is playing — position changes are audible within one lookahead window
  3. Developer can set `grainPlayer.pitch` to shift pitch in semitones (e.g., `+7` for a fifth up) without changing the playback rate — the documentation prominently notes this is pitch-shift via `playbackRate` and cannot time-stretch independently
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 59: LayeredSound Effects + LFO-Effect Dispose
**Goal**: LayeredSound supports addEffect() for unified effect application, and LFO auto-cleans up when connected BaseEffect targets are disposed
**Depends on**: Phase 53, Phase 54
**Requirements**: FX-06, MOD-03
**Gap Closure**: Closes MC-01 (LayeredSound missing addEffect), MC-02 (LFO-to-BaseEffect dispose), broken flow "Add effect to LayeredSound"
**Success Criteria** (what must be TRUE):
  1. Developer can call `layeredSound.addEffect(delay)` and the effect applies to all layers through a shared output bus
  2. Developer can call `layeredSound.removeEffect(delay)` to remove the effect
  3. When an LFO is connected to a BaseEffect target and that effect is disposed, the LFO automatically disconnects and cleans up (no stale AudioParam references)
  4. BaseEffect emits a `'dispose'` event when disposed, matching BaseSound's dispose event pattern
**Plans:** 2/2 plans complete
Plans:
- [ ] 59-01-PLAN.md — BaseEffect dispose event + LFO BaseEffect cleanup (MOD-03)
- [ ] 59-02-PLAN.md — LayeredSound shared output bus + addEffect/removeEffect (FX-06)

### Phase 60: Milestone Verification & Checkpoint
**Goal**: All M5 phases have formal VERIFICATION.md files and all REQUIREMENTS.md checkboxes accurately reflect implementation status
**Depends on**: Phase 59
**Requirements**: FX-01, FX-02, FX-03, FX-04, FX-05, FX-06, TRANS-01, TRANS-02, TRANS-03, TRANS-04, SEQ-01, SEQ-02, SEQ-03, SYNTH-01, SYNTH-02, SYNTH-03, SYNTH-04
**Gap Closure**: Closes verification gaps for Phases 53, 56, 57, 58; updates stale REQUIREMENTS.md checkboxes
**Success Criteria** (what must be TRUE):
  1. `53-VERIFICATION.md` exists and confirms FX-01 through FX-06 against codebase evidence
  2. `56-VERIFICATION.md` exists and confirms SEQ-01 through SEQ-03 against codebase evidence
  3. `57-VERIFICATION.md` exists and confirms SYNTH-01 and SYNTH-02 against codebase evidence
  4. `58-VERIFICATION.md` exists and confirms SYNTH-03 and SYNTH-04 against codebase evidence
  5. All 19 REQUIREMENTS.md checkboxes show `[x]` (Complete)
  6. Traceability table Status column shows `Complete` for all 19 requirements
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

---

### 📋 Milestone 6: DX & Discoverability (Phases 61-63)

- [x] **Phase 61: Audio Sprites Redesign** - Howler-style manifest support, new demo with soundfx sounds + visual timeline, rewritten docs page (completed 2026-03-07)
- [x] **Phase 62: Multiple AudioContext Support** - Optional AudioContext first-param overloads on all factory functions, advanced usage docs (completed 2026-03-07)
- [x] **Phase 63: llms.txt Support** - vitepress-plugin-llms integration, auto-sized footer message on every page, frontmatter descriptions (completed 2026-03-07)

### Phase 61: Audio Sprites Redesign
**Goal**: Users form the correct mental model ("many distinct sounds packed into one file") through a compelling demo, and can use either Howler-style or audiosprite-style manifests
**Depends on**: None
**Spec**: `.planning/specs/audio-sprites-redesign.md`
**Success Criteria** (what must be TRUE):
  1. `SpriteManifest` accepts both Howler-style tuples (`sprite` key, ms) and audiosprite-style objects (`spritemap` key, seconds)
  2. Format detection is automatic — no user configuration needed
  3. Demo page plays the full combined file first, then individual named segments
  4. Visual timeline shows colored segments with highlight on play
  5. Spritemap JSON is displayed on the page
  6. Both manifest formats documented with use cases
  7. audiosprite CLI and soundfx library mentioned in docs
  8. CC-BY-3.0 attribution displayed on page
  9. All existing sprite tests continue to pass
**Plans**: 2 plans
- [ ] 61-01-PLAN.md — Howler-style manifest types, normalizeManifest, TDD tests
- [ ] 61-02-PLAN.md — Sprite audio file, AudioSpriteDemo.vue with timeline, docs rewrite

### Phase 62: Multiple AudioContext Support
**Goal**: Power users can use multiple AudioContexts via optional first-param overloads on factory functions, following the existing effect factory convention
**Depends on**: None
**Spec**: `.planning/specs/multiple-audiocontext.md`
**Success Criteria** (what must be TRUE):
  1. All factory functions accept optional AudioContext as first parameter
  2. Existing code without AudioContext param works identically (no breaking changes)
  3. Sounds created with an explicit AudioContext use that context, not the singleton
  4. Effect factories already have the pattern — verify consistency
  5. Advanced usage guide documents: why, browser limits, the shared-context constraint, full example
  6. Tests verify both overloaded and default paths
**Plans**: 3 plans
- [ ] 62-01-PLAN.md — Migrate effect factories and playTogether to instanceof BaseAudioContext
- [ ] 62-02-PLAN.md — Add BaseAudioContext overloads to all 16 index.ts factory functions
- [ ] 62-03-PLAN.md — Tests for overloaded paths and multiple-contexts guide page

### Phase 63: llms.txt Support
**Goal**: AI coding assistants can efficiently discover and ingest the full documentation (guides + API reference) via standard llms.txt files
**Depends on**: None
**Spec**: `.planning/specs/llms-txt.md`
**Success Criteria** (what must be TRUE):
  1. `vitepress-plugin-llms` installed and configured
  2. `/llms.txt` generated at build time with useful section descriptions
  3. `/llms-full.txt` generated containing both guide pages AND TypeDoc API reference
  4. Guide/example pages have `description` frontmatter
  5. Every page footer includes message pointing to llms.txt with auto-generated file size of llms-full.txt
  6. Build order correct (TypeDoc → VitePress build → llms.txt generation)
**Plans**: 2 plans
- [ ] 63-01-PLAN.md — Install vitepress-plugin-llms, footer component, custom layout, post-build size script
- [ ] 63-02-PLAN.md — Annotate 20 Vue demos with llm-exclude/llm-only, build and verify output

### Phase 54.2: Effects & LFO Lifecycle Fixes
**Goal**: Fix LFO multi-target lifecycle bug, add missing dispose() overrides to 4 effect subclasses, document BaseEffect disposal contract
**Depends on**: None
**QC Findings**: QC-1-04 (high), QC-1-13 (medium), QC-1-14 (medium)
**Structural Pattern**: missing-effect-dispose
**Success Criteria** (what must be TRUE):
  1. LFO `syncLifecycle` disconnects only the stopped target, not the entire oscillator
  2. CompressorEffect, DistortionEffect, EQEffect, FilterEffect all override dispose() to disconnect internal nodes
  3. BaseEffect has documentation of the subclass disposal contract
  4. LFO depth limitation (baked at connection time) is documented in JSDoc
  5. All existing LFO and effects tests pass
**Plans**: TBD

### Phase 57.1: Transport, Sequence & PolySynth Core Fixes
**Goal**: Fix architectural bugs in M5 orchestration classes — voice state machine, type safety, event system consistency, performance
**Depends on**: None
**QC Findings**: QC-1-01 (high), QC-1-02 (high), QC-1-08 (medium), QC-1-09 (medium), QC-1-10 (medium), QC-1-12 (medium), QC-1-21 (medium), QC-1-22 (medium)
**Structural Pattern**: inconsistent-event-systems
**Success Criteria** (what must be TRUE):
  1. PolySynth voice state machine has proper `released` → `available` transition after envelope release
  2. Transport uses a `SyncableBeatTrack` interface instead of `(track as any)` casts
  3. Transport and Sequence use TypedEventEmitter instead of manual EventTarget
  4. Sequence correctly handles multiple events at the same beat position
  5. PolySynth cleans up event listeners on voice stealing (no orphaned listeners)
  6. Sequence position is correct across loop iterations
  7. MusicalTime correctly handles beatUnit from time signature
  8. PolySynth.activeVoices and Transport.tracks getters don't allocate on every access
  9. All existing Transport, Sequence, and PolySynth tests pass
**Plans**: TBD

### Phase 58.1: GrainPlayer Hardening
**Goal**: Fix performance cliffs and architectural gaps in GrainPlayer
**Depends on**: None
**QC Findings**: QC-1-03 (high), QC-1-11 (medium), QC-1-25 (medium)
**Success Criteria** (what must be TRUE):
  1. GrainPlayer overlap setter validates and clamps to prevent 1000+ grains/sec
  2. GrainPlayer uses WorkerTimer instead of setTimeout for background-tab resilience
  3. Dead code in loop offset handling is removed
  4. All existing GrainPlayer tests pass
**Plans**: TBD

### Phase 59.1: Shared API Utilities & Crossfade Fixes
**Goal**: Fix fluent API conversion bug, crossfade state sync, LayeredSound gain routing, AudioSprite validation
**Depends on**: None
**QC Findings**: QC-1-07 (high), QC-1-16 (medium), QC-1-18 (medium), QC-1-19 (medium), QC-1-20 (medium)
**Structural Pattern**: fluent-api-conversion-gap
**Success Criteria** (what must be TRUE):
  1. A shared `convertValue(value, method: RatioType)` utility exists and is used by BaseParamController, GrainPlayer, and PolySynth
  2. GrainPlayer and PolySynth `update().as('decibels')` correctly converts values
  3. AudioSprite validates `end < start` at creation time with descriptive error
  4. LayeredSound `setGain()` modifies the output bus, not individual layer gains
  5. crossfade `afterFade:'stop'` doesn't produce unhandled rejections
  6. crossfade restores `_targetGain` via `changeGainTo()` instead of raw AudioParam manipulation
  7. All existing tests pass
**Plans**: TBD

### Phase 60.1: Test Coverage Gaps
**Goal**: Close testing gaps for new M5 features and options
**Depends on**: Phases 54.2, 57.1, 58.1, 59.1 (tests verify fixed behavior)
**QC Findings**: QC-1-05 (high), QC-1-06 (high), QC-1-15 (medium), QC-1-17 (medium) + L4-L6, L10-L11, L21
**Success Criteria** (what must be TRUE):
  1. crossfade `afterFade: 'continue'` and `afterFade: 'stop'` have dedicated tests
  2. BeatTrack.setPattern() has tests for basic, short/long arrays, booleans, chaining
  3. LFO depth calculation tests verify numeric values for ratio/cents/absolute modes
  4. createFont(ctx) explicit-context overload is tested
  5. Edge case tests for PolySynth rapid play/stop, Transport live BPM change, Sequence post-dispose
  6. GrainPlayer edge case tests for overlap boundaries
  7. createSprite with Howler manifest format has a factory test
**Plans**: TBD

### Phase 60.2: Documentation Sync
**Goal**: Update docs to reflect M5 capabilities
**Depends on**: None
**QC Findings**: QC-1-23 (medium), QC-1-24 (medium) + L20, L22
**Success Criteria** (what must be TRUE):
  1. Homepage features list and comparison table mention Transport, PolySynth, GrainPlayer, LFO, built-in effects
  2. Getting-started includes M5 factory function examples
  3. Multiple-contexts guide: sinkId example uses `ctx.setSinkId()`, reference table includes all M5 factories
  4. Howler manifest example in audio-sprite docs is consistent with implementation
  5. At least stub guide pages exist for Transport, Sequence, PolySynth, GrainPlayer, LFO
**Plans**: TBD

---

**Archives:**
- `milestones/mvp-phases/` — Milestone 1 phase directories (Phases 1-11)
- `milestones/v1.1-phases/` — Milestone 2 phase directories (Phases 12-16)
- `milestones/v1.1-ROADMAP.md` — Milestone 2 phase details
- `milestones/v1.1-REQUIREMENTS.md` — Milestone 2 requirements with outcomes

*Last updated: 2026-03-01 after Milestone 6 phases 61-63 added*

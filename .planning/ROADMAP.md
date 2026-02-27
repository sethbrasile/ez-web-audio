# Roadmap: EZ Audio

**Project:** EZ Web Audio Library
**Core Value:** Make the Web Audio API easy to use
**Created:** 2026-01-31
**Last Updated:** 2026-02-26

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-02-14)
- ✅ **v1.1 Quality & Polish** — Phases 12-16 (shipped 2026-02-16)
- ✅ **v1.0 Stable** — Phases 17-46 (complete)
- 📋 **Deep Review Hardening** — Phases 47-54 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-11) — SHIPPED 2026-02-14</summary>

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
<summary>✅ v1.1 Quality & Polish (Phases 12-16) — SHIPPED 2026-02-16</summary>

- [x] Phase 12: Comprehensive Audit (5/5 plans) — completed 2026-02-16
- [x] Phase 13: Code Quality Implementation (3/3 plans) — completed 2026-02-16
- [x] Phase 14: Documentation & Examples Polish (6/6 plans) — completed 2026-02-16
- [x] Phase 15: Test Coverage Implementation (4/4 plans) — completed 2026-02-16
- [x] Phase 16: SEO & Discoverability (2/2 plans) — completed 2026-02-16

</details>

### 🚧 v1.0 First Stable Release (Phases 17-38)

**Milestone Goal:** Implement all deferred audit improvements, fix breaking API issues (free pre-1.0), upgrade dependencies for security, add convenience APIs, harden defensive code, expand test coverage, update all documentation, and ship as npm 1.0.0.

- [x] **Phase 17: Dependency Security Upgrades** - Upgrade all vulnerable dependencies before any code changes (completed 2026-02-17)
- [x] **Phase 18: Breaking API Cleanup** - Rename fluent API methods, enforce encapsulation, remove deprecated APIs, update JSDoc (completed 2026-02-17)
- [x] **Phase 19: DX Improvements** - Add convenience methods, auto-rewire effects, batch loaders, extensible ControlType, update guides (completed 2026-02-17)
- [x] **Phase 20: Defensive Hardening** - Add null checks, input validation, memory management, and code clarity (completed 2026-02-17)
- [x] **Phase 21: Test Coverage** - Add integration tests, split test files by concern, add concurrent operation tests (completed 2026-02-17)
- [x] **Phase 22: Demo App & Release** - Update demo Vue components for all API changes, update TypeDoc, publish npm 1.0.0 (completed 2026-02-17)
- [x] **Phase 23: Demo Example Bugfixes** - Fix runtime API bugs, design issues, and polish in all VitePress demo components (completed 2026-02-17)
- [ ] **Phase 24: Milestone Verification & Release Documentation** - Create missing VERIFICATION.md for phases 18 and 19, fix stale JSDoc, update CHANGELOG, clean up tracking docs, and trigger npm 1.0.0 publish
- [ ] **Phase 25: New Example Pages** - Add interactive examples for AudioSprite, crossfade, and playTogether — features with no demo coverage
- [x] **Phase 26: Source Code Fixes** - Fix all runtime bugs, race conditions, memory leaks, and validation gaps found in code review (completed 2026-02-22)
- [x] **Phase 27: Package Quality & README** - Write proper README, fix package.json config, add CI quality gates (completed 2026-02-22)
- [x] **Phase 28: Documentation Corrections** - Fix all incorrect docs, add missing feature documentation (completed 2026-02-22)
- [x] **Phase 29: Demo Component Fixes** - Fix demo bugs, accessibility issues, and polish (completed 2026-02-22)
- [x] **Phase 30: Test Coverage Expansion** - Add tests for untested modules and missing scenarios (completed 2026-02-22)
- [x] **Phase 31: E2E & Integration Test Expansion** - Add interaction E2E tests, integration coverage, mobile viewport testing (completed 2026-02-22)
- [ ] **Phase 32: Critical Fixes & API Contract Corrections** - Fix bugs, type contract violations, and safety issues found in comprehensive code review
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

### 📋 Deep Review Hardening (Phases 47-54)

**Milestone Goal:** Address all findings from the 2026-02-26 deep review — fix the ship-blocker type declaration bug, eliminate runtime crashes and unhandled rejections, clean up public exports, optimize hot-path performance, fix misleading docs, strengthen test assertions, and improve build/refactoring quality.

- [x] **Phase 47: Ship-Blocker Fix** - Remove test-only mock type from published declarations (completed 2026-02-27)
- [ ] **Phase 48: Safety & Correctness** - Guard unhandled rejections, add missing dispose() methods, fix divide-by-zero and race conditions
- [ ] **Phase 49: Export Cleanup** - Remove internal function exports, use domain error classes
- [ ] **Phase 50: Performance** - Cache decoded AudioBuffers, optimize hot-path allocations, reduce per-frame overhead
- [ ] **Phase 51: Documentation Fixes** - Fix misleading vibrato example, correct await usage in README
- [ ] **Phase 52: Test Strengthening** - Strengthen weak assertions, add missing end event and dispose cleanup tests
- [ ] **Phase 53: Build & Refactoring** - Add publish tag verification, extract duplicated gain-interception and controller logic
- [ ] **Phase 54: Remaining Safety, DX & Performance** - Context warning, event listener cleanup, LayeredSound dispose, pan validation, AudioInput flexibility, node optimization

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
- [ ] 23-04-PLAN.md — Gap closure: fix XYPad HiDPI logical dimension reads in drawGrid and updateFromPosition

### Phase 24: Milestone Verification & Release Documentation
**Goal**: All phases are formally verified, all documentation is accurate, and npm 1.0.0 is published
**Depends on**: Phase 23
**Requirements**: API-01–07, DOC-01, DX-01–08, DEF-05, DOC-03 (verification docs only — code complete)
**Gap Closure**: Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. `18-VERIFICATION.md` exists and confirms all 8 Phase 18 requirements satisfied via code inspection
  2. `19-VERIFICATION.md` exists and confirms all 10 Phase 19 requirements satisfied via code inspection
  3. `createWhiteNoise()` JSDoc example uses context-free API (`createFilterEffect('lowpass', {...})`)
  4. CHANGELOG.md 1.0.0 entry includes `audioContextAwareTimeout` as a new export
  5. All 27 REQUIREMENTS.md checkboxes marked `[x]` for completed requirements
  6. Stale `docs/classes/` directory removed from git tracking
  7. npm `ez-web-audio@1.0.0` is published (human gate: `git tag v1.0.0 && git push origin v1.0.0`)
**Plans**: 1 plan
- [ ] 24-01-PLAN.md — Verification docs, doc fixes, tracking cleanup, npm publish trigger

### Phase 25: New Example Pages
**Goal**: Every significant library feature has an interactive example on the docs site — no feature is "hidden" from developers browsing examples
**Depends on**: Phase 24 (or can run in parallel with review fix phases)
**Success Criteria** (what must be TRUE):
  1. An AudioSprite example page exists at `docs/examples/audio-sprite.md` with a Vue component demonstrating sprite loading, named segment playback, and overlapping plays
  2. A Crossfade example page exists at `docs/examples/crossfade.md` with a Vue component demonstrating smooth transition between two tracks (e.g., DJ crossfader or ambient scene transition)
  3. A playTogether example page exists at `docs/examples/play-together.md` with a Vue component demonstrating synchronized sound triggering (e.g., chord builder or layered SFX)
  4. All three examples appear in `docs/examples/index.md` with descriptions
  5. All three examples appear in the VitePress sidebar navigation
  6. All example code uses the current 1.0 API correctly
**Plans**: TBD (created during `/gsd:plan-phase`)

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

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 MVP | 4/4 | Complete | 2026-02-01 |
| 2. ADSR Envelopes | v1.0 MVP | 4/4 | Complete | 2026-02-02 |
| 3. Utility Features | v1.0 MVP | 3/3 | Complete | 2026-02-03 |
| 4. Composition Features | v1.0 MVP | 3/3 | Complete | 2026-02-04 |
| 5. Effects & Advanced | v1.0 MVP | 4/4 | Complete | 2026-02-05 |
| 6. Testing | v1.0 MVP | 4/4 | Complete | 2026-02-06 |
| 7. Documentation & Demo | v1.0 MVP | 7/7 | Complete | 2026-02-08 |
| 8. Build & Distribution | v1.0 MVP | 3/3 | Complete | 2026-02-09 |
| 9. Interactive Examples | v1.0 MVP | 10/10 | Complete | 2026-02-12 |
| 10. Lazy AudioContext | v1.0 MVP | 4/4 | Complete | 2026-02-13 |
| 11. Drum Machine Examples | v1.0 MVP | 2/2 | Complete | 2026-02-14 |
| 12. Comprehensive Audit | v1.1 | 5/5 | Complete | 2026-02-16 |
| 13. Code Quality | v1.1 | 3/3 | Complete | 2026-02-16 |
| 14. Docs & Examples Polish | v1.1 | 6/6 | Complete | 2026-02-16 |
| 15. Test Coverage | v1.1 | 4/4 | Complete | 2026-02-16 |
| 16. SEO & Discoverability | v1.1 | 2/2 | Complete | 2026-02-16 |
| 17. Dependency Security Upgrades | v1.0 Stable | 3/3 | Complete | 2026-02-17 |
| 18. Breaking API Cleanup | v1.0 Stable | 3/3 | Complete | 2026-02-17 |
| 19. DX Improvements | v1.0 Stable | 3/3 | Complete | 2026-02-17 |
| 20. Defensive Hardening | v1.0 Stable | Complete    | 2026-02-17 | - |
| 21. Test Coverage | v1.0 Stable | Complete    | 2026-02-17 | - |
| 22. Demo App & Release | v1.0 Stable | Complete    | 2026-02-17 | - |
| 23. Demo Example Bugfixes | v1.0 Stable | Complete    | 2026-02-17 | - |
| 24. Milestone Verification & Release | v1.0 Stable | 0/1 | Pending | - |
| 25. New Example Pages | v1.0 Stable | 0/? | Pending | - |
| 26. Source Code Fixes | 6/6 | Complete    | 2026-02-22 | - |
| 27. Package Quality & README | 2/2 | Complete    | 2026-02-22 | - |
| 28. Documentation Corrections | 2/2 | Complete    | 2026-02-22 | - |
| 29. Demo Component Fixes | 3/3 | Complete    | 2026-02-22 | - |
| 30. Test Coverage Expansion | 3/3 | Complete    | 2026-02-22 | - |
| 31. E2E & Integration Test Expansion | 2/2 | Complete    | 2026-02-22 | - |
| 32. Critical Fixes & API Contracts | v1.0 Stable | 0/? | Pending | - |
| 33. DX Convenience APIs | 2/2 | Complete    | 2026-02-22 | - |
| 34. Test Gap Closure | 2/2 | Complete    | 2026-02-22 | - |
| 35. Documentation Expansion & Fixes | 3/3 | Complete    | 2026-02-22 | - |
| 36. Documentation Sync (Post-Fixes) | 2/2 | Complete    | 2026-02-22 | - |
| 37. Nice-to-Have DX Features | 3/3 | Complete    | 2026-02-22 | - |
| 38. Final Documentation Sync | 2/2 | Complete   | 2026-02-22 | - |
| 39. Documentation Code Correctness | 2/2 | Complete | 2026-02-22 | - |
| 40. Build and Type Declaration Fixes | 2/2 | Complete | 2026-02-22 | - |
| 41. API Type Safety | 1/1 | Complete | 2026-02-22 | - |
| 42. Source Code Correctness Bugs | 2/2 | Complete | 2026-02-22 | - |
| 43. Test Coverage Gaps | 3/3 | Complete | 2026-02-23 | - |
| 44. Docs Site SEO and Accessibility | 3/3 | Complete | 2026-02-24 | - |
| 45. Architecture Improvements | 2/2 | Complete | 2026-02-24 | - |
| 46. Post-Review Fixes | 4/4 | Complete    | 2026-02-25 |
| 47. Ship-Blocker Fix | 1/1 | Complete    | 2026-02-27 | - |
| 48. Safety & Correctness | Deep Review Hardening | 0/? | Not started | - |
| 49. Export Cleanup | Deep Review Hardening | 0/? | Not started | - |
| 50. Performance | Deep Review Hardening | 0/? | Not started | - |
| 51. Documentation Fixes | Deep Review Hardening | 0/? | Not started | - |
| 52. Test Strengthening | Deep Review Hardening | 0/? | Not started | - |
| 53. Build & Refactoring | Deep Review Hardening | 0/? | Not started | - |
| 54. Remaining Safety, DX & Performance | Deep Review Hardening | 0/? | Not started | - |

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
**Plans**: TBD

### Phase 50: Performance
**Goal**: Hot-path audio operations avoid redundant work — decoded buffers are cached, TimeObject allocation is skippable, the scheduler iterates only once per frame, and AudioContext.resume() is not called unnecessarily
**Depends on**: Phase 49
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Playing a preloaded Sound a second time does not call `decodeAudioData()` — the decoded `AudioBuffer` is returned from cache
  2. A hot-path caller using `durationRaw` (or equivalent numeric accessor) gets a number directly without constructing a `TimeObject`
  3. The scheduler `tick()` combines beat execution and array filtering into a single pass over the scheduled beats array
  4. `audioContext.resume()` is only called when `audioContext.state === 'suspended'` — calling `play()` on an already-running context does not invoke `resume()`
**Plans**: TBD

### Phase 51: Documentation Fixes
**Goal**: All documentation examples are correct and non-misleading for the patterns they demonstrate
**Depends on**: Phase 50
**Requirements**: DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. The vibrato example in `docs/guide/parameter-control.md` either works correctly with consume-once semantics or clearly explains that `onPlaySet`/`onPlayRamp` must be re-scheduled before each play
  2. The README `song.seek(30)` example does not show `await` — `seek().as()` returns void and is not a Promise
**Plans**: TBD

### Phase 52: Test Strengthening
**Goal**: Critical test assertions verify actual audio behavior, not just that functions do not throw
**Depends on**: Phase 51
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. `onPlaySet` and `onPlayRamp` tests assert that the scheduled parameter value is actually applied to the audio node during playback (not just that the call completes without error)
  2. A dedicated test verifies that the `end` event fires on a `Sound` instance when natural playback completes (not just when `stop()` is called)
  3. A test verifies that event listeners registered before `dispose()` stop firing after `dispose()` is called
**Plans**: TBD

### Phase 53: Build & Refactoring
**Goal**: The publish workflow prevents version mismatches, and duplicated gain-interception and controller logic is extracted into shared helpers
**Depends on**: Phase 52
**Requirements**: BUILD-01, REFAC-01, REFAC-02
**Success Criteria** (what must be TRUE):
  1. The publish workflow fails fast when the git tag does not match `package.json` version — publishing with a mismatched tag is not possible
  2. The `_targetGain` syncing logic exists in exactly one place on `BaseSound` — `base-sound.ts` and `oscillator.ts` do not each maintain their own copy
  3. The `applyValues` and `applyRampValues` shared logic exists in exactly one place in `BaseParamController` — `SoundController` and `OscillatorController` do not each maintain their own copy
**Plans**: TBD

### Phase 54: Remaining Safety, DX & Performance
**Goal**: All lower-priority safety gaps, DX limitations, and performance opportunities from the deep review are addressed
**Depends on**: Phase 53
**Requirements**: SAFE-07, SAFE-08, SAFE-09, SAFE-10, DOCS-03, DX-01, PERF-05, PERF-06
**Success Criteria** (what must be TRUE):
  1. Creating a new `AudioContext` after a previous one closed logs a console warning identifying any orphaned sounds
  2. After `dispose()`, event listeners registered on a sound no longer fire (or the docs explicitly state consumers must call `off()` before `dispose()`)
  3. `LayeredSound.dispose()` stops and disposes all layers
  4. Calling `changePanTo()` with a value outside `[-1, 1]` logs a console warning
  5. Soundfont parsing is documented with a note that large files (5-20 MB) may cause a UI freeze on mobile
  6. `createBeatTrack()` and `createSampler()` accept `AudioInput[]` (not just `string[]`), or their limitation is documented
  7. `AudioSprite` skips gain or panner node creation when the value is at its default (gain=1, pan=0)
  8. Crossfade curve arrays are cached at module level and not regenerated on every call
**Plans**: TBD

---

**Archives:**
- `milestones/v1.1-ROADMAP.md` — full v1.1 phase details
- `milestones/v1.1-REQUIREMENTS.md` — v1.1 requirements with outcomes

*Last updated: 2026-02-26 after Deep Review Hardening roadmap created*

# Project State: EZ Audio

**Last Updated:** 2026-02-17 (23-04 completed: XYPad HiDPI logical dimension fix — final gap closure)
**Current Focus:** Phase 23 — Demo Example Bugfixes (Complete)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Make the Web Audio API easy to use
**Current focus:** Phase 23 — Demo Example Bugfixes

## Current Position

Phase: 23 of 23 (Demo Example Bugfixes)
Plan: 4 of 4 in current phase
Status: Complete — Phase 23 done
Last activity: 2026-02-17 — Completed 23-04 (XYPad drawGrid/updateFromPosition now use dataset.logicalWidth/logicalHeight for HiDPI correctness — final gap closed)

**Progress:** [████████████████████] 100%

## Performance Metrics

**Velocity (prior milestones):**
- Total plans completed: 48 (v1.0 MVP) + 20 (v1.1) = 68 total
- Prior milestone avg: ~4 plans/phase

**By Phase (v1.0 Stable):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 17-01 | 1/3 | 3min | 3min |
| 17-02 | 2/3 | 10min | 6.5min |
| 17-03 | 3/3 | 3min | 5.3min |
| 18-01 | 1/3 | 4min | 4min |
| 18-02 | 2/3 | 6min | 5min |
| 18-03 | 3/3 | 8min | 6min |
| 19-01 | 1/3 | 4min | 4min |
| 19-02 | 2/3 | 4min | 4min |
| 19-03 | 3/3 | 3min | 3.7min |
| 20-01 | 1/TBD | 5min | 5min |
| 21-01 | 1/TBD | 8min | 8min |
| 21-02 | 2/TBD | 7min | 7.5min |
| 22-01 | 1/TBD | 6min | 6min |
| 22-02 | 2/TBD | 1min | 3.5min |
| 22-03 | 3/TBD | 8min | 5min |
| 23-01 | 1/2 | 3min | 3min |
| 23-02 | 2/2 | 2min | 2.5min |
| 23-03 | 3/3 | 12min | 5.7min |
| 23-04 | 4/4 | 2min | 4.8min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

See .planning/PROJECT.md Key Decisions table for full history.

Recent decisions affecting current work:
- Pre-1.0: Breaking changes are free — no backwards compatibility required
- Phase 13: String concat for error messages (consistency across codebase)
- Phase 16: E2E tests focus on error-detection, not element checks (VitePress SPA timing)
- Phase 17-01: Vitest 4 constructor mocks require function syntax, not arrow functions
- Phase 17-02: ESLint config uses per-directory overrides; docs Vue rules relaxed for Phase 22
- Phase 17-03: TS 5.9 typed arrays require explicit ArrayBuffer generic for Web Audio API
- Phase 18: onPlayRamp().from() NOT renamed (different semantic: "from value X")
- Phase 18: debugConnection kept despite name (logs effect chain changes, not public API)
- Phase 18: 885 tests (9 connection tests removed)
- Phase 19: Bypass interception via Object.defineProperty (simpler than Proxy)
- Phase 19: ControlTypeMap interface for module augmentation extensibility
- Phase 19: 891 tests (6 new tests added)
- Phase 20: 901 tests (10 new tests added in 20-01)
- [Phase 20]: DEF-04 consume-once semantics: onPlaySet/onPlayRamp schedules cleared after each setValuesAtTimes() call — users re-schedule before each play() for repeated automation
- Phase 21-02: Integration test assertion depth uses node presence checks (getEffects/getAnalyzer), not AnalyserNode data (impractical with mock)
- Phase 21-02: Soundfont integration tests use mock SampledNote pattern (duck-typed identifier+play) — fetch/decode tested elsewhere
- Phase 21-02: 937 tests (36 new tests added in 21-02: 16 integration + 20 concurrent)
- Phase 21-01: base-sound.test.ts split into 4 focused files (events, effects, debug, analyzer) — 937 tests unchanged
- Phase 22-01: .as() is correct API for update/seek type hints — .from() is reserved for onPlayRamp value semantics
- Phase 22-01: createFilterEffect/createGainEffect are context-free — AudioContext resolved internally
- Phase 22-01: addEffects([]) batch replaces consecutive addEffect() calls (SynthDrumKit hi-hat)
- Phase 22-02: excludeProtected=false in typedoc.json so protected members appear in API reference with visibility badges
- Phase 22-02: CHANGELOG.md fully rewritten covering all breaking changes (renames, visibility, removed APIs), migration guide, features from phases 17-21, and 0.1.0 MVP feature set
- Phase 22-03: CI pipeline runs pnpm build (full: lib+typedoc+docs) before E2E — E2E tests need the built docs site
- Phase 22-03: Playwright installs only chromium --with-deps matching playwright.config.ts targeting Chromium only
- Phase 23-01: audioContextAwareTimeout exported as public API — consumers need audio-sync timers for beat UIs, not just library internals
- Phase 23-01: wrapEffect() context-free overload preferred — consistent with createFilterEffect/createGainEffect pattern
- Phase 23-01: .as('ratio') is correct for update().to().as() — 'number' was never a valid RatioType value
- Phase 23-02: waveType requires stop/recreate in OscillatorDemo — Web Audio API OscillatorNode.type immutable after start; freq/gain update in real-time
- Phase 23-02: document-level mouseup for XYPad canvas drag interactions — canvas-only misses out-of-bounds releases
- Phase 23-02: Oscillator.stop() already respects ADSR release — no additional scheduling needed in demo components
- Phase 23-02: Remove oscillator from map before stop() in SynthKeyboard so re-press during release creates fresh oscillator
- Phase 23-03: HiDPI canvas pattern — store logical dims as data-logical-width/height attributes for drawing functions; context scaled by devicePixelRatio
- Phase 23-03: EffectWrapper.effect is the accessor for the wrapped node; .input is the routing GainNode (not the effect node)
- Phase 23-03: FilterEffect.frequency setter (not .frequency.value AudioParam) is the correct public API
- Phase 23-04: XYPad canvas drawing functions read dataset.logicalWidth/logicalHeight (not canvas.width/height) — canvas.width is physical pixels after HiDPI setup

### Pending Todos

None active.

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 23-04-PLAN.md (XYPad HiDPI logical dimension fix — Phase 23 fully complete)
Resume file: .planning/phases/23-demo-example-bugfixes/23-04-SUMMARY.md

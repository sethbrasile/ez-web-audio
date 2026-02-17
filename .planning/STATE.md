# Project State: EZ Audio

**Last Updated:** 2026-02-17 (22-03 completed: CI pipeline gates + version 1.0.0)
**Current Focus:** Milestone v1.0 Stable — First Stable Release (npm 1.0.0)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Make the Web Audio API easy to use
**Current focus:** Phase 22 — Demo App & Release

## Current Position

Phase: 22 of 22 (Demo App & Release)
Plan: 3 of TBD in current phase
Status: Awaiting human verification (checkpoint:human-verify at Task 2 of 22-03)
Last activity: 2026-02-17 — Completed 22-03 Task 1 (CI pipeline + version 1.0.0); checkpoint pending human verification

**Progress:** [████████████████████] 99%

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

### Pending Todos

Awaiting human verification of demo site and release artifacts before tagging v1.0.0.

### Blockers/Concerns

None active. Checkpoint at Task 2 of 22-03 awaiting human approval.

## Session Continuity

Last session: 2026-02-17
Stopped at: 22-03 Task 1 complete (CI pipeline + version 1.0.0); awaiting human verify at Task 2 checkpoint.
Resume file: .planning/phases/22-demo-app-release/22-03-SUMMARY.md

### To resume after human verification

When user approves, the release is ready. No further automated tasks remain in Phase 22.
Publish via: `git tag v1.0.0 && git push origin v1.0.0`

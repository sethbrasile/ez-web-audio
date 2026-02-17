# Roadmap: EZ Audio

**Project:** EZ Web Audio Library
**Core Value:** Make the Web Audio API easy to use
**Created:** 2026-01-31
**Last Updated:** 2026-02-16

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-02-14)
- ✅ **v1.1 Quality & Polish** — Phases 12-16 (shipped 2026-02-16)
- 🚧 **v1.0 First Stable Release** — Phases 17-22 (in progress)

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

### 🚧 v1.0 First Stable Release (Phases 17-22)

**Milestone Goal:** Implement all deferred audit improvements, fix breaking API issues (free pre-1.0), upgrade dependencies for security, add convenience APIs, harden defensive code, expand test coverage, update all documentation, and ship as npm 1.0.0.

- [x] **Phase 17: Dependency Security Upgrades** - Upgrade all vulnerable dependencies before any code changes (completed 2026-02-17)
- [x] **Phase 18: Breaking API Cleanup** - Rename fluent API methods, enforce encapsulation, remove deprecated APIs, update JSDoc (completed 2026-02-17)
- [x] **Phase 19: DX Improvements** - Add convenience methods, auto-rewire effects, batch loaders, extensible ControlType, update guides (completed 2026-02-17)
- [x] **Phase 20: Defensive Hardening** - Add null checks, input validation, memory management, and code clarity (completed 2026-02-17)
- [x] **Phase 21: Test Coverage** - Add integration tests, split test files by concern, add concurrent operation tests (completed 2026-02-17)
- [ ] **Phase 22: Demo App & Release** - Update demo Vue components for all API changes, update TypeDoc, publish npm 1.0.0

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
| 22. Demo App & Release | v1.0 Stable | 0/TBD | Not started | - |

---

**Archives:**
- `milestones/v1.1-ROADMAP.md` — full v1.1 phase details
- `milestones/v1.1-REQUIREMENTS.md` — v1.1 requirements with outcomes

*Last updated: 2026-02-17 after Phase 19 completion*

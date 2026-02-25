# Milestone Context: v1.0 Deep Review v2 Phases

**Source:** `.planning/reviews/2026-02-23-deep-review-v2.md`
**Action:** Add 7 new phases (39-45) to existing v1.0 First Stable Release milestone

## Phases to Add

All findings from the deep review v2, organized into 7 groupings that become phases 39-45. Continue from Phase 38 (Final Documentation Sync).

### Phase 39: Documentation Code Correctness
- **Goal:** Fix all broken/wrong code examples in docs and JSDoc before users copy them
- **Effort:** Small
- **Findings:** CR2, HI2, HI3, M9, M10, M11, M12
- **Files:** docs/index.md, docs/guide/utilities.md, docs/examples/visualization.md, docs/examples/react-integration.md, docs/guide/concepts.md, src/index.ts (JSDoc), README.md

### Phase 40: Build & Type Declaration Fixes
- **Goal:** Ensure published package works for all TS moduleResolution modes; CI catches build failures
- **Effort:** Small
- **Findings:** CR1, HI1, M19, M20, L23, L24, L25, L27
- **Files:** vite.config.js, .github/workflows/ci.yml, .github/workflows/deploy-docs-site.yml, package.json, tsconfig.json

### Phase 41: API Type Safety
- **Goal:** Eliminate `any` from published types and fix misleading type contracts
- **Effort:** Small
- **Findings:** HI6, M7, L5, L6
- **Files:** src/controllers/base-param-controller.ts, src/events/event-types.ts, src/interfaces/connectable.ts, src/interfaces/playable.ts

### Phase 42: Source Code Correctness Bugs
- **Goal:** Fix real bugs where audio behavior doesn't match user intent
- **Effort:** Medium
- **Findings:** M1, M2, M3, M4, L1, L9
- **Files:** src/oscillator.ts, src/sound.ts, src/index.ts, src/preload.ts, src/base-sound.ts, src/beat.ts

### Phase 43: Test Coverage Gaps
- **Goal:** Cover untested public API functions to prevent regressions
- **Effort:** Medium
- **Findings:** M13, M14, M15, M16, M17, M18, L15-L20
- **Files:** New: src/audio-context.test.ts, src/utils/noise.test.ts; Existing: src/preload.test.ts, src/index.test.ts, src/sound.test.ts, src/oscillator.test.ts, src/sampler.test.ts
- **Dependencies:** Phase 42 (fix bugs before testing them)

### Phase 44: Docs Site SEO + Accessibility
- **Goal:** Ensure docs site is shareable and usable by all users
- **Effort:** Medium
- **Findings:** HI4, HI5, M21, M22, M23, M24, L29-L36
- **Files:** docs/.vitepress/config.mts, docs/public/og-image.png (new), all Vue demo components

### Phase 45: Architecture Improvements
- **Goal:** Unify event system, fix Sampler behavior, clarify Track lifecycle
- **Effort:** Large
- **Findings:** M5, M6, M8, L4, L7, L8
- **Files:** src/beat-track.ts, src/sampler.ts, src/track.ts, src/sprite.ts, src/index.ts

## Notes
- Phases 39-42 are pre-publish blockers
- Phases 43-44 are high-value polish
- Phase 45 can be deferred post-1.0 if needed
- Full finding details in `.planning/reviews/2026-02-23-deep-review-v2.md`

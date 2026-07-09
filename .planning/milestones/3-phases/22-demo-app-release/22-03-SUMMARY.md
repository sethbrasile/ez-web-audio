---
phase: 22-demo-app-release
plan: 03
subsystem: infra
tags: [ci, github-actions, npm-publish, playwright, e2e, versioning]

# Dependency graph
requires:
  - phase: 22-01
    provides: API migration complete (.as(), context-free factories, addEffects batch)
  - phase: 22-02
    provides: TypeDoc protected members visible, comprehensive CHANGELOG.md
provides:
  - CI pipeline with full pre-publish gates (typecheck + unit tests + build + E2E)
  - package.json bumped to version 1.0.0
  - publish.yml with ordered pipeline: install → typecheck → tests → build:lib → build → playwright → E2E → publish
affects: [release, npm-publish, v1.0-stable]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CI gating: typecheck → unit → build → E2E before publish", "Playwright install in CI with --with-deps chromium"]

key-files:
  created: []
  modified:
    - .github/workflows/publish.yml
    - package.json

key-decisions:
  - "pnpm build (full: lib+typedoc+docs) runs in CI before E2E, not just build:lib — ensures demo site is built for E2E tests"
  - "Playwright installs only chromium (--with-deps chromium) matching existing test configuration"
  - "E2E test failure caused by stale dev server reuse (reuseExistingServer) is not a code issue — CI always starts fresh"

patterns-established:
  - "CI pipeline order: install → typecheck → unit tests → build:lib → build (full) → playwright install → E2E → publish"

requirements-completed: [DOC-02, DOC-04]

# Metrics
duration: 8min
completed: 2026-02-17
---

# Phase 22 Plan 03: CI Pipeline & Version 1.0.0 Summary

**Comprehensive CI pipeline with typecheck, 937 unit tests, full build, and 20 E2E gates before npm publish — version bumped to 1.0.0**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-17T17:30:00Z
- **Completed:** 2026-02-17T17:38:48Z
- **Tasks:** 1 completed (1 checkpoint pending human verification)
- **Files modified:** 2

## Accomplishments

- Updated `.github/workflows/publish.yml` with full pre-publish gate sequence: typecheck → unit tests → build:lib → full build (docs+typedoc) → Playwright install → E2E → publish
- Bumped `package.json` version from `0.1.0` to `1.0.0`
- All local verification passes: typecheck clean, 937 unit tests pass, full build succeeds (lib + docs + typedoc), 20 E2E tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CI pipeline and bump version** - `30ca7f9` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `.github/workflows/publish.yml` - Added typecheck, full build (docs+typedoc), Playwright install, and E2E gate steps before npm publish
- `package.json` - Version bumped from `0.1.0` to `1.0.0`

## Decisions Made

- `pnpm build` (full: lib+typedoc+docs) runs in CI before E2E rather than just `build:lib` — the E2E tests test the built docs site, so the full build is required
- Playwright installs only `chromium --with-deps` matching the existing `playwright.config.ts` which targets Chromium only
- Ordering: `build:lib` runs before `build` (full) since `build:lib` is faster and fails early on library issues before investing in the full docs build

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Stale dev server caused first E2E run failure:** A VitePress dev server was already running at port 5173 (from a prior session). Playwright's `reuseExistingServer: !process.env.CI` reused it, and that stale server had an empty `<title>`. Killed the stale process and re-ran — all 20 tests passed. This is not a code issue; CI always starts a fresh server.

## User Setup Required

None - no external service configuration required.

## Checkpoint: Human Verification Required

**Task 2 is a `checkpoint:human-verify` gate.** All automated work is complete. The release is ready for human verification before tagging.

### What was built across Phase 22

- **22-01:** All Vue demo components updated to final API (`.as()`, context-free factories, `addEffects` batch)
- **22-02:** TypeDoc regenerated with `excludeProtected=false`, comprehensive CHANGELOG.md with all breaking changes and migration guide
- **22-03:** CI pipeline with full pre-publish gates, version 1.0.0

### How to verify

1. Run `pnpm dev` and browse the demo site — check interactive examples work (synth drum kit, filter demo, track demo)
2. Check API reference section at `/api/` — protected members should appear with visibility badges
3. Review `/CHANGELOG.md` for completeness (breaking changes, migration guide)
4. Review `.github/workflows/publish.yml` CI gates
5. When ready to publish: `git tag v1.0.0 && git push origin v1.0.0` to trigger GitHub Actions

## Next Phase Readiness

- All automated work for 1.0.0 release is complete
- Waiting for human approval of demo site and release artifacts
- Publish via git tag: `git tag v1.0.0 && git push origin v1.0.0`

---
*Phase: 22-demo-app-release*
*Completed: 2026-02-17*

## Self-Check: PASSED

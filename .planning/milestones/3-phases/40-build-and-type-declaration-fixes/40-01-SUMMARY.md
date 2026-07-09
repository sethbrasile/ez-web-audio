---
phase: 40-build-and-type-declaration-fixes
plan: 01
subsystem: build
tags: [vite, rollup, tsconfig, barrel-files, nodenext]

requires:
  - phase: none
    provides: n/a
provides:
  - Barrel JS files for effects/ and errors/ in dist output
  - Clean build:lib script using tsc --noEmit
  - Removed redundant build:ci and build:base scripts
affects: [ci-cd, publish, type-resolution]

tech-stack:
  added: []
  patterns: [explicit-rollup-inputs-for-barrel-files]

key-files:
  created: []
  modified:
    - vite.config.js
    - package.json
    - tsconfig.json

key-decisions:
  - "Only @common/* removed from tsconfig paths (truly stale); @app/*, @components/*, @test/* retained (actively used by app and tests)"
  - "Barrel files added as explicit Rollup input entries to prevent tree-shaking"

patterns-established:
  - "Barrel re-export files must be listed as Rollup inputs when preserveModules is enabled"

requirements-completed: [CR1, L23, L24, L27]

duration: 5min
completed: 2026-02-23
---

# Phase 40 Plan 01: Fix Barrel JS Files and Clean Up Build Scripts Summary

**Explicit Rollup inputs for barrel files, tsc --noEmit build:lib, redundant scripts removed, stale @common/* path alias cleaned**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-23T23:53:00Z
- **Completed:** 2026-02-23T23:58:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- dist/effects/index.js and dist/errors/index.js now emitted alongside .d.ts barrels (fixes nodenext resolution)
- build:lib uses tsc --noEmit to skip wasted emit pass before Vite build
- Redundant build:ci and build:base scripts removed from package.json
- Stale @common/* path alias removed from tsconfig.json

## Task Commits

1. **Task 1: Fix barrel JS files and clean up build scripts** - `22d27b1` (fix)
2. **Task 1 fix: Restore active path aliases and fix lint** - `9f04eeb` (fix)

## Files Created/Modified
- `vite.config.js` - Added explicit Rollup input entries for effects/index and errors/index barrels
- `package.json` - Removed build:ci and build:base; changed build:lib to tsc --noEmit
- `tsconfig.json` - Removed only @common/* (truly stale path alias)

## Decisions Made
- Plan specified removing @app/*, @common/*, @components/*, @test/* from tsconfig paths, but @app/*, @components/*, and @test/* are actively used by the app code and tests. Only @common/* was truly stale (no src/common directory). Deviation applied to prevent breaking tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored @app/*, @components/*, @test/* path aliases**
- **Found during:** Task 2 (verification)
- **Issue:** Plan incorrectly identified @app/*, @components/*, @test/* as stale. They are actively used by src/app/ code (15 imports) and test files (note-methods.test.ts). Removing them broke 1 test suite.
- **Fix:** Restored all three path aliases; only removed @common/* which has no directory
- **Files modified:** tsconfig.json
- **Verification:** All 1113 tests pass, typecheck passes
- **Committed in:** 9f04eeb

**2. [Rule 1 - Bug] Fixed lint error in vite.config.js**
- **Found during:** Task 2 (verification)
- **Issue:** Unquoted `index` key alongside quoted `'effects/index'` triggered style/quote-props ESLint error
- **Fix:** Quoted all keys consistently in rollupOptions.input
- **Files modified:** vite.config.js
- **Verification:** pnpm lint passes
- **Committed in:** 9f04eeb

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Path alias fix prevented test breakage. Only @common/* was truly stale.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build output now correct for nodenext consumers
- Ready for Plan 40-02 (CI/CD hardening)

---
*Phase: 40-build-and-type-declaration-fixes*
*Completed: 2026-02-23*

---
phase: 17-dependency-security-upgrades
plan: 01
subsystem: infra
tags: [vite, vitest, happy-dom, dependency-upgrade]

requires:
  - phase: none
    provides: none
provides:
  - "Upgraded build/test toolchain (vite 7, vitest 4, happy-dom 20)"
  - "Clean dependency tree with unused packages removed"
affects: [17-02, 17-03]

tech-stack:
  added: []
  patterns: ["vitest 4 constructor mocks require function syntax, not arrow functions"]

key-files:
  created: []
  modified: [package.json, pnpm-lock.yaml, src/index.test.ts]

key-decisions:
  - "Fixed vi.fn() constructor mock to use function syntax for vitest 4 compatibility"

patterns-established:
  - "Constructor mocks must use `vi.fn(function() {...})` not `vi.fn(() => ...)`"

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-06]

duration: 3min
completed: 2026-02-17
---

# Phase 17 Plan 01: Remove Unused Deps, Upgrade Vite/Vitest/Happy-DOM Summary

**Upgraded core build/test toolchain to vite 7.3.1, vitest 4.0.18, happy-dom 20.6.1 with all 894 tests passing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T05:40:52Z
- **Completed:** 2026-02-17T05:44:02Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Removed unused dependencies (@dotenvx/dotenvx, concurrently)
- Upgraded vite 5.4.8 to 7.3.1, vitest 2.1.1 to 4.0.18, happy-dom 15.7.4 to 20.6.1
- Upgraded vite-plugin-dts 4.2.2 to 4.5.4 and vite-tsconfig-paths 5.0.1 to 6.1.1
- Fixed vitest 4 breaking change: constructor mocks require function syntax

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove unused deps, upgrade core build/test stack** - `1ad843b` (chore)

## Files Created/Modified
- `package.json` - Updated dependency versions, removed unused packages
- `pnpm-lock.yaml` - Resolved dependency tree (+75 -53 packages)
- `src/index.test.ts` - Fixed vi.fn() constructor mock for vitest 4 compatibility

## Decisions Made
- Fixed `vi.fn(() => mockAudioContext)` to `vi.fn(function () { return mockAudioContext })` because vitest 4 enforces that mock implementations used as constructors must use `function` or `class` syntax (arrow functions cannot be used with `new`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vitest 4 constructor mock syntax**
- **Found during:** Task 1 (test suite verification)
- **Issue:** Vitest 4 enforces `function` or `class` syntax for mocks used as constructors; arrow function mock caused 26 test failures
- **Fix:** Changed `vi.fn(() => mockAudioContext)` to `vi.fn(function () { return mockAudioContext })`
- **Files modified:** src/index.test.ts
- **Verification:** All 894 tests pass
- **Committed in:** 1ad843b (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for vitest 4 compatibility. No scope creep.

## Issues Encountered
- Remaining audit vulnerabilities (13 total) are all in transitive dependencies of other packages (eslint, vitepress, standardized-audio-context, vite-plugin-prismjs, typedoc). The cross-spawn vulnerability via eslint will be addressed in plan 17-02.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build/test toolchain fully upgraded and verified
- Ready for plan 17-02 (ESLint upgrade) and plan 17-03 (TypeScript upgrade)

---
*Phase: 17-dependency-security-upgrades*
*Completed: 2026-02-17*

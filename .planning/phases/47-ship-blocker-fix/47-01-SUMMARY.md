---
phase: 47-ship-blocker-fix
plan: 01
subsystem: testing
tags: [typescript, web-audio-api, types, declarations, devdependency]

requires:
  - phase: 46-rollup-types
    provides: vite build with rollupTypes bundling declarations into dist/index.d.ts

provides:
  - Published type declarations (dist/index.d.ts) free of standardized-audio-context-mock references
  - ContextLike type using only production-safe AudioContext | BaseAudioContext

affects: [48-export-cleanup, dist publishing, TypeScript consumers with skipLibCheck: false]

tech-stack:
  added: []
  patterns:
    - "Use only built-in Web Audio API types in production source files; confine mock types to test files"

key-files:
  created: []
  modified:
    - src/utils/timeout.ts

key-decisions:
  - "Removed AudioContextMock from ContextLike union — mock is structurally assignable to AudioContext so test files continue to compile without the explicit union member"

patterns-established:
  - "Production source: never import from devDependencies — type-only imports leak into dist/index.d.ts"

requirements-completed: [SHIP-01]

duration: 5min
completed: 2026-02-27
---

# Phase 47 Plan 01: Ship-Blocker Fix Summary

**Removed test-only `standardized-audio-context-mock` import from `timeout.ts` so TypeScript consumers with `skipLibCheck: false` no longer get a compile error on install.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T02:56:43Z
- **Completed:** 2026-02-27T02:57:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Deleted the `import type { AudioContext as AudioContextMock } from 'standardized-audio-context-mock'` line from `src/utils/timeout.ts`
- Changed `ContextLike` from `AudioContext | BaseAudioContext | AudioContextMock` to `AudioContext | BaseAudioContext`
- Rebuilt library — `dist/index.d.ts` contains zero references to `standardized-audio-context-mock`
- All 1191 unit tests pass without modification (mock satisfies `AudioContext` structurally)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove mock type import and fix ContextLike** - `54a1404` (fix)
2. **Task 2: Rebuild and verify clean declarations** - verified via `pnpm build:lib` + grep; no new commit needed (dist is gitignored)

## Files Created/Modified
- `src/utils/timeout.ts` - Removed devDependency import; ContextLike now uses only built-in Web Audio API types

## Decisions Made
- Removed `AudioContextMock` from `ContextLike` without adding a test-only override — the mock library implements the same interface as `AudioContext`, making it structurally assignable. No test changes were needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SHIP-01 is resolved — published declarations are clean for TypeScript consumers
- Ready to proceed to Phase 48 (export cleanup / EXPORT-01)

## Self-Check: PASSED

- `src/utils/timeout.ts` exists with correct ContextLike type
- `47-01-SUMMARY.md` created at expected path
- Commit `54a1404` verified in git log

---
*Phase: 47-ship-blocker-fix*
*Completed: 2026-02-27*

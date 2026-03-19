---
phase: 71-transport-sequencer-demo
plan: 02
subsystem: testing
tags: [playwright, e2e, transport, sequencer, demo]

# Dependency graph
requires:
  - phase: 71-01
    provides: TransportSequencerDemo.vue component with CSS classes used as test selectors
provides:
  - E2E smoke test for examples/transport-sequencer page
  - 4 interaction tests covering TSEQ-01 through TSEQ-04
  - Bug fix for invalid '1m+2n' musical time notation in Straight Rock preset
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use .transport-buttons (not .transport-controls) for TransportSequencer button selectors"
    - "Use [aria-label^='BPM:'] prefix selector for dynamic aria-label values"
    - "30-second timeout for waitForFunction that depends on audio loading (large assets like piano.js)"

key-files:
  created: []
  modified:
    - e2e/demos.spec.ts
    - e2e/interactions.spec.ts
    - docs/.vitepress/theme/components/TransportSequencerDemo.vue

key-decisions:
  - "Use '.transport-buttons' selector (not '.transport-controls') — actual class name from Phase 71-01 component"
  - "Use [aria-label^='BPM:'] prefix selector since BPM aria-label is dynamic ('BPM: 120')"
  - "Use 30s waitForFunction timeout for play-state assertions — piano.js (1.4MB) must fully load before transport starts"
  - "[Rule 1 - Bug] Replace invalid '1m+2n' time notation with '2:3:0' — Sequence API doesn't support compound notation"

patterns-established:
  - "Verify actual class names from the component before writing tests — plan may use planned names that differ from implementation"

requirements-completed:
  - TSEQ-01
  - TSEQ-02
  - TSEQ-03
  - TSEQ-04

# Metrics
duration: 30min
completed: 2026-03-19
---

# Phase 71 Plan 02: TransportSequencer E2E Tests Summary

**Playwright E2E tests for the 5-track transport+sequencer demo — 4 interaction tests covering play/pause/stop, mute/solo visual state, step grid structure, and live playhead advancement, plus a bug fix for invalid Sequence time notation**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-19T22:30:00Z
- **Completed:** 2026-03-19T23:00:00Z
- **Tasks:** 1 auto + 1 auto-approved checkpoint
- **Files modified:** 3

## Accomplishments

- Added `examples/transport-sequencer` to smoke test list in `demos.spec.ts`
- Added `TransportSequencer page interactions` describe block with 4 tests in `interactions.spec.ts`
- Fixed invalid musical time notation `'1m+2n'` in TransportSequencerDemo component (caused play to silently fail)
- All 49 transport-sequencer tests pass (1 pre-existing unrelated Basic Playback failure documented)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add E2E tests for TransportSequencer** - `42814ff` (feat)
2. **Task 2: Human verify (auto-approved)** - no additional commit

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `e2e/demos.spec.ts` - Added `'examples/transport-sequencer'` to demoPages smoke test array
- `e2e/interactions.spec.ts` - Added `TransportSequencer page interactions` describe block with 4 tests (TSEQ-01 through TSEQ-04)
- `docs/.vitepress/theme/components/TransportSequencerDemo.vue` - Fixed invalid `'1m+2n'` time notation → `'2:3:0'`; removed dead `else if` branch for `'1m+2n'` in stepCells computed

## Decisions Made

- Used `.transport-buttons` selector instead of `.transport-controls` — plan specified the latter but the actual component used the former class name
- Used `[aria-label^="BPM:"]` prefix selector because the aria-label is dynamic (`BPM: 120`, `BPM: 140`, etc.)
- Used 30-second `waitForFunction` timeout for assertions that depend on transport starting — the piano soundfont (`piano.js`, 1.4MB) must fully load before `playing.value` is set to true
- Pre-existing Basic Playback test failure (`.play-btn` strict mode with 2 matching elements) documented as out-of-scope — not caused by this plan's changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid musical time notation '1m+2n' in Straight Rock preset**
- **Found during:** Task 1 (Add E2E tests) — TSEQ-01 test timed out; debug revealed `.error-bar` showing "Invalid musical time notation: '1m+2n'"
- **Issue:** `bassNotes` in Straight Rock preset used `{ time: '1m+2n', ... }` which the `Sequence.at()` API doesn't support (only supports note values like `'2n'`, measures like `'1m'`, bar:beat:tick like `'2:3:0'`, and numbers). The error was caught by the `try/catch` in `play()` — `error.value` was set but `playing.value` was never set to `true`, causing the pause button to never appear.
- **Fix:** Replaced `'1m+2n'` with `'2:3:0'` (bar 2, beat 3, tick 0 — same 32nd-step position = step 24). Removed the now-dead `else if (note.time === '1m+2n')` branch from `stepCells` computed property (the `:` branch now handles `'2:3:0'`).
- **Files modified:** `docs/.vitepress/theme/components/TransportSequencerDemo.vue`
- **Verification:** Debug test confirmed pause button appears within 500ms of clicking Play, no error bar displayed
- **Committed in:** `42814ff` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Essential fix — without it, clicking Play displayed a silent error and transport never started, causing all transport-dependent tests to time out.

## Issues Encountered

- The plan specified `.transport-controls` as the selector prefix for Play/Pause/Stop buttons, but the actual component used `.transport-buttons`. Adjusted selectors before running tests.
- Pre-existing test failure: `Basic Playback page interactions → Play Sound button is present and clickable` fails with "strict mode violation: locator('.play-btn') resolved to 2 elements." This was failing before this plan's changes (confirmed via `git stash`). Not related to TransportSequencer. Deferred to separate fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 71 complete — all 4 TSEQ requirements covered by E2E tests
- Milestone 7 (Feature Demos) complete — all 5 demo phases (67-71) done
- Pre-existing Basic Playback test failure should be fixed in a future cleanup pass

---
*Phase: 71-transport-sequencer-demo*
*Completed: 2026-03-19*

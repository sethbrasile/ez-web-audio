---
phase: 05-effects-advanced
plan: 04
subsystem: debug
tags: [debug, logging, developer-tools, tree-shakeable]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BaseSound class for debug integration
provides:
  - Debug mode with global and per-sound control
  - setDebugMode() and setDebugHandler() API
  - Zero-overhead debug logging when disabled
  - Play/stop/end event logging with timestamps
  - Connection chain change logging
  - Suspended AudioContext warnings
affects: [all-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debug short-circuit pattern (boolean check for zero overhead)"
    - "Per-instance debug override pattern"
    - "Custom handler injection for logging flexibility"

key-files:
  created:
    - src/debug/index.ts
    - src/debug/logger.ts
    - src/debug/messages.ts
    - src/debug/debug.test.ts
  modified:
    - src/base-sound.ts
    - src/base-sound.test.ts
    - src/index.ts

key-decisions:
  - "Debug module uses boolean short-circuit for zero overhead when disabled"
  - "Per-sound debug override with explicit false to silence individual sounds"
  - "Custom handler via setDebugHandler(fn) for flexibility (testing, external logging)"
  - "Connection logging on addConnection/removeConnection (not wireConnections)"

patterns-established:
  - "debugLog/debugEvent/debugWarning pattern for consistent logging"
  - "DebugMessage interface for typed debug data"
  - "Per-instance debug property pattern for sound-level control"

# Metrics
duration: 7min
completed: 2026-02-01
---

# Phase 05 Plan 04: Debug Mode Summary

**Tree-shakeable debug system with global setDebugMode(), per-sound override, and custom handler support for troubleshooting audio issues**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-01T20:53:36Z
- **Completed:** 2026-02-01T21:00:48Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Debug infrastructure with DebugMessage interface and formatDebugMessage utility
- Global debug via setDebugMode(true) with zero overhead when disabled
- Per-sound debug override (sound.debug = false silences, sound.debug = true enables)
- Custom handler support via setDebugHandler(fn) for testing and external logging
- Play/stop/end event logging with timestamps and details
- Connection chain change logging on addConnection/removeConnection
- Suspended AudioContext warning before play attempts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create debug infrastructure with global/per-sound control** - `ee02173` (feat)
2. **Task 2: Integrate debug logging into BaseSound and export from main** - `832a35f` (feat)
3. **Task 3: Add integration tests for debug mode with sounds** - `e9b16f6` (test)

## Files Created/Modified

- `src/debug/messages.ts` - DebugMessage interface and formatDebugMessage utility
- `src/debug/logger.ts` - Internal logger state and handler management
- `src/debug/index.ts` - Public API (setDebugMode, setDebugHandler, debugLog, etc.)
- `src/debug/debug.test.ts` - 19 unit tests for debug module
- `src/base-sound.ts` - Added debug property, integrated debug logging into lifecycle
- `src/base-sound.test.ts` - Added 10 integration tests for debug mode with sounds
- `src/index.ts` - Export setDebugMode, setDebugHandler, DebugMessage

## Decisions Made

- **Boolean short-circuit pattern:** debugLog checks `!isGlobalDebugEnabled() && !source.debug` as first line for fast path when debug disabled
- **Per-sound override semantics:** `debug = true` enables even when global off; `debug = false` silences even when global on; `undefined` follows global
- **Connection logging location:** Logging in addConnection/removeConnection (user-facing API) rather than wireConnections (internal)
- **Default handler to console.log:** setDebugHandler(null) restores default behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Debug system complete and exported from main entry
- Ready for effects integration (debug can log effect chain changes)
- Ready for visualization features (Phase 5 continuation)

---
*Phase: 05-effects-advanced*
*Completed: 2026-02-01*

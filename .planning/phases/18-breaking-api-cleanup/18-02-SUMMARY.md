---
phase: 18-breaking-api-cleanup
plan: 02
subsystem: api
tags: [encapsulation, breaking-change, deprecated-removal]

requires:
  - phase: 17-dependency-security-upgrades
    provides: clean dependency stack
provides:
  - "gainNode/startOffset protected with getGainNode() accessor"
  - "Connections API fully removed (addConnection, removeConnection, getConnection, getNodeFrom)"
  - "Deprecated type aliases OscillatorOpts/OscillatorOptsFilterValues removed"
  - "Connectable interface cleaned of all deprecated members"
affects: [phase-18-plan-03, phase-19, phase-22]

tech-stack:
  added: []
  patterns:
    - "Protected properties with public getter accessors (getGainNode())"
    - "Effect system (addEffect/wrapEffect) is the sole audio routing API"

key-files:
  created: []
  modified:
    - src/base-sound.ts
    - src/sound.ts
    - src/oscillator.ts
    - src/index.ts
    - src/interfaces/connectable.ts
    - src/utils/crossfade.ts
    - src/app/pages/distortable-play-button.ts
    - src/app/pages/audio-routing.ts

key-decisions:
  - "gainNode gets getGainNode() accessor to preserve crossfade utility functionality"
  - "pannerNode and effectChainInput were already protected — no change needed"
  - "API-07 (stopAfter) already satisfied — playInAndStopAfter is a real method, no commented-out code exists"
  - "wireConnections() simplified but preserved — it wires internal audio nodes, not just legacy connections"
  - "debugConnection function kept — it logs effect chain changes, not the removed connections API"

patterns-established:
  - "Pattern: protected node properties with public getter methods"
  - "Pattern: addEffect()/wrapEffect() as sole effect routing API"

requirements-completed: [API-03, API-04, API-05, API-06, API-07]

duration: 6min
completed: 2026-02-17
---

# Phase 18-02: Protected enforcement and deprecated API removal Summary

**Enforced encapsulation on internal properties and removed all deprecated APIs**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-17
- **Completed:** 2026-02-17
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Made `gainNode` protected with `getGainNode()` public accessor (API-03)
- Made `startOffset` protected (API-03)
- Confirmed `pannerNode` and `effectChainInput` already protected (API-03)
- Removed entire connections API: `connections`, `addConnection`, `removeConnection`, `getConnection`, `getNodeFrom` (API-04)
- Removed deprecated type aliases `OscillatorOpts` and `OscillatorOptsFilterValues` (API-05)
- Cleaned Connectable interface of all deprecated members (API-06)
- Confirmed API-07 already satisfied (no commented-out stopAfter code exists)
- Simplified `wireConnections()` in Sound and Oscillator
- Rewrote demo pages to use modern effect API

## Task Commits

1. **Task 1: Protected enforcement** - `50b5df4`
2. **Task 2: Remove connections API, type aliases, cleanup** - `c512b4f`

## Files Created/Modified
- `src/base-sound.ts` - gainNode/startOffset protected, getGainNode() added, connections API removed
- `src/sound.ts` - wireConnections() simplified (direct source→effectChainInput)
- `src/oscillator.ts` - wireConnections() simplified, deprecated type aliases removed
- `src/index.ts` - Deprecated type alias re-exports removed
- `src/interfaces/connectable.ts` - All deprecated members removed
- `src/utils/crossfade.ts` - Uses getGainNode() instead of direct .gainNode access
- `src/app/pages/distortable-play-button.ts` - Rewritten with wrapEffect/addEffect
- `src/app/pages/audio-routing.ts` - Rewritten with wrapEffect/addEffect, updated descriptions
- `src/sound.test.ts` - Removed 7 connections (legacy) tests
- `src/base-sound.test.ts` - Removed 2 connection logging tests

## Decisions Made
- `getGainNode()` accessor needed because crossfade utility schedules gain ramps on tracks
- `wireConnections()` is not part of the connections API — it's internal audio graph wiring
- `debugConnection` function kept since it now logs effect chain changes
- API-07 was already satisfied — `playInAndStopAfter` is fully implemented, no dead code

## Deviations from Plan
- Plan mentioned removing commented-out `stopAfter` from Playable interface, but investigation showed no such commented-out code exists. `playInAndStopAfter` is a real implemented method. API-07 required no changes.

## Issues Encountered
- `crossfade.ts` accessed `.gainNode` directly — caught by TypeScript after making it protected, fixed with `getGainNode()`
- Connection-related tests in sound.test.ts and base-sound.test.ts needed removal (9 tests total)

## Next Phase Readiness
- All breaking API changes complete (API-01 through API-07)
- Ready for Plan 18-03 (JSDoc standardization, CHANGELOG, docs update)

---
*Phase: 18-breaking-api-cleanup*
*Completed: 2026-02-17*

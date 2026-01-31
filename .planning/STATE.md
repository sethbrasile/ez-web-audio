# Project State: EZ Audio

**Last Updated:** 2026-01-31
**Current Focus:** Phase 1 - Foundation

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 1 of 8 (Foundation)
**Plan:** 1 of 4 complete
**Status:** In progress

**Progress:** [██░░░░░░░░░░░░░░░░░░] 5% (1/18 requirements complete)

**Phase Goal:** Users have a stable, well-tested event system and all critical bugs are resolved.

**Next Action:** Execute Plan 02 (Bug Fixes) or Plan 03 (Event System).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 1
- Completed phases: 0
- Overall completion: 1% (1/71 requirements)

**Current Phase:**
- Requirements: 18 (EVT-01 to EVT-07, FIX-01 to FIX-04, ERR-01 to ERR-04)
- Plans: 4 (01-Foundation Types, 02-Bug Fixes, 03-Event System, 04-Error Integration)
- Completed: 1 plan (01-01)
- Remaining: 3 plans

**Velocity:**
- Requirements completed this session: 1 (plan 01 types/errors foundation)
- Sessions on current phase: 1
- Estimated remaining sessions: 3-4 (one per plan)

## Accumulated Context

### Decisions Made

**Architectural:**
- BaseSound extends EventTarget pattern (Phase 1) - native browser API for events
- ADSR as separate Envelope class, integrated via controllers (Phase 2)
- LayeredSound uses composition over inheritance (Phase 4)
- Effects integrate with existing connections array (Phase 5)

**Technical:**
- All features use native Web Audio API (zero dependencies maintained)
- Event timing uses audioContext.currentTime (prevents timer desynchronization)
- AudioParam automation always uses scheduling methods (never direct assignment)
- Tree-shakeable exports (Phase 8)

**Phase 1 Plan 01 Decisions:**
- Used 'unknown' for event source type to avoid circular imports (Plan 03 can refine)
- Error classes use readonly properties for immutable metadata
- Each error has unique code (CONTEXT_ERROR, LOAD_ERROR, INVALID_NOTE) for programmatic handling

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 1 Execution:**
- [x] Plan 01: Foundation Types (event types, error classes)
- [ ] Plan 02: Bug Fixes (Track async, MusicalIdentity)
- [ ] Plan 03: Event System Implementation
- [ ] Plan 04: Error Integration

**Cross-Phase:**
- [ ] Verify standardized-audio-context-mock supports event testing (Phase 1/6)
- [ ] Research impulse response libraries for effects presets (Phase 5)
- [ ] Determine voice pooling strategy for LayeredSound (Phase 4)

### Known Blockers

**Pre-existing TypeScript Errors (discovered in Plan 01):**
- Track.play() and Track.stop() return void but should return Promise<void> (to be fixed in Plan 02)
- Unused imports in src/index.ts and synthesis/index.ts (minor, can be fixed in Plan 02)

### Research Findings

**From research/SUMMARY.md:**

**Critical Pitfalls to Prevent:**
1. ADSR envelope retriggering discontinuities (Phase 2) - pick up from current value, use setTargetAtTime
2. JavaScript timer / AudioContext clock desynchronization (Phase 1) - use audioContext.currentTime for scheduling
3. AudioParam event accumulation performance (Phase 2, 5) - swap nodes periodically, use cancelScheduledValues
4. AudioBufferSourceNode single-use violation (Phase 3, 4) - create new source per playback
5. Direct AudioParam assignment during automation (Phase 2, 5) - always use AudioParam methods

**Phase-Specific Research Flags:**
- Phase 1: Standard EventTarget pattern, well-documented (no deep research needed)
- Phase 2: Fast retriggering edge cases, polyphonic note management (needs research)
- Phase 3: Standard patterns (no deep research needed)
- Phase 4: Voice pooling strategies (needs research during planning)
- Phase 5: Impulse response sourcing, FFT optimization (needs research during planning)

**Dependency Chain:**
- Events foundational for all features
- ADSR requires events for testing
- LayeredSound depends on events + ADSR + effects being stable
- Testing can parallelize with documentation

### Files Modified This Session

**Plan 01-01:**
- Created: src/events/event-types.ts
- Created: src/errors/audio-error.ts
- Created: src/errors/context-error.ts
- Created: src/errors/load-error.ts
- Created: src/errors/invalid-note-error.ts
- Created: src/errors/index.ts

## Session Continuity

**Last session:** 2026-01-31T22:02:37Z
**Stopped at:** Completed 01-01-PLAN.md
**Resume file:** None

**Where we are:**
Plan 01 (Foundation Types) complete. Event type definitions and custom error classes created. Ready for Plan 02 (Bug Fixes) or Plan 03 (Event System) - these can run in parallel.

**What's next:**
Execute Plan 02 to fix Track async/Promise issues, or Plan 03 to implement event system on BaseSound. Plan 02 fixes pre-existing TypeScript errors discovered during Plan 01 verification.

**Context to preserve:**
- Event types use 'unknown' for source - Plan 03 integration can refine
- Error classes have unique codes (CONTEXT_ERROR, LOAD_ERROR, INVALID_NOTE)
- Pre-existing Track async issues should be fixed in Plan 02
- Research strongly recommends Events → ADSR → Sprites → Effects → LayeredSound order

---

*STATE.md updated: 2026-01-31*

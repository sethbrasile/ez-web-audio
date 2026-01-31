# Project State: EZ Audio

**Last Updated:** 2026-01-31
**Current Focus:** Phase 1 - Foundation

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 1 - Foundation
**Plan:** Not yet created
**Status:** Ready to plan

**Progress:** [░░░░░░░░░░░░░░░░░░░░] 0% (0/18 requirements complete)

**Phase Goal:** Users have a stable, well-tested event system and all critical bugs are resolved.

**Next Action:** Run `/gsd:plan-phase 1` to create execution plan for Foundation phase.

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 1
- Completed phases: 0
- Overall completion: 0% (0/71 requirements)

**Current Phase:**
- Requirements: 18 (EVT-01 to EVT-07, FIX-01 to FIX-04, ERR-01 to ERR-04)
- Must-haves: Not yet derived (pending plan)
- Completed: 0
- Remaining: 18

**Velocity:**
- Requirements completed this session: 0
- Sessions on current phase: 0
- Estimated remaining sessions: Unknown (no plan yet)

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

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 1 Planning:**
- [ ] Run `/gsd:plan-phase 1` to derive must-haves and execution plan
- [ ] Review research notes on EventTarget pattern
- [ ] Identify critical path for event system implementation

**Cross-Phase:**
- [ ] Verify standardized-audio-context-mock supports event testing (Phase 1/6)
- [ ] Research impulse response libraries for effects presets (Phase 5)
- [ ] Determine voice pooling strategy for LayeredSound (Phase 4)

### Known Blockers

None currently. Phase 1 has no dependencies.

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

None yet (roadmap creation session).

## Session Continuity

**Session started:** 2026-01-31
**Last command:** Roadmap creation
**Working branch:** main

**Where we are:**
Roadmap and STATE.md just created. 8 phases defined, 71 requirements mapped. Phase 1 (Foundation) is ready for planning. Research findings loaded and critical pitfalls documented.

**What's next:**
User should run `/gsd:plan-phase 1` to derive must-haves and create execution plan for the Foundation phase (Events + Bug Fixes + Error Handling).

**Context to preserve:**
- Research strongly recommends Events → ADSR → Sprites → Effects → LayeredSound order
- All features use native Web Audio API (zero dependencies)
- Event timing must use audioContext.currentTime (not setTimeout/setInterval)
- Testing can run in parallel with documentation (Phase 6 + 7)
- Build/distribution is final phase (Phase 8)

---

*STATE.md initialized: 2026-01-31*

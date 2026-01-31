# Project State: EZ Audio

**Last Updated:** 2026-01-31
**Current Focus:** Phase 1 - Foundation

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 1 of 8 (Foundation)
**Plan:** 3 of 4 complete
**Status:** In progress

**Progress:** [██████░░░░░░░░░░░░░░] 33% (12/18 requirements complete)

**Phase Goal:** Users have a stable, well-tested event system and all critical bugs are resolved.

**Next Action:** Execute Plan 04 (Error Integration).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 1
- Completed phases: 0
- Overall completion: 15% (12/71 requirements)

**Current Phase:**
- Requirements: 18 (EVT-01 to EVT-07, FIX-01 to FIX-04, ERR-01 to ERR-04)
- Plans: 4 (01-Foundation Types, 02-Bug Fixes, 03-Event System, 04-Error Integration)
- Completed: 3 plans (01-01, 01-02, 01-03)
- Remaining: 1 plan

**Velocity:**
- Requirements completed this session: 7 (EVT-01, EVT-02, EVT-03, EVT-06, EVT-07 + FIX-01 to FIX-04 earlier)
- Sessions on current phase: 3
- Estimated remaining sessions: 1 (one plan left)

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

**Phase 1 Plan 02 Decisions:**
- Used _onPlaybackStarted() hook at end of playAt() instead of _play() override - cleaner template method pattern
- Oscillator.duration returns Infinity (semantically correct for indefinite playback)
- Track.stop() made async to match base class signature

**Phase 1 Plan 03 Decisions:**
- Used function overloads for addEventListener/removeEventListener to maintain EventTarget compatibility while adding type safety
- Event 'end' only fires on natural completion (checked via _isPlaying flag)
- .off() requires listener reference (native EventTarget limitation documented)

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 1 Execution:**
- [x] Plan 01: Foundation Types (event types, error classes)
- [x] Plan 02: Bug Fixes (Track inheritance, RAF cleanup, memory leaks, Oscillator.duration)
- [x] Plan 03: Event System Implementation
- [ ] Plan 04: Error Integration

**Cross-Phase:**
- [ ] Verify standardized-audio-context-mock supports event testing (Phase 1/6)
- [ ] Research impulse response libraries for effects presets (Phase 5)
- [ ] Determine voice pooling strategy for LayeredSound (Phase 4)

### Known Blockers

**Resolved (Plan 02):**
- ~~Track.play() and Track.stop() return void but should return Promise<void>~~ - Fixed via _onPlaybackStarted() hook and async stop()
- Unused imports in src/index.ts and synthesis/index.ts (minor, pre-existing)

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

**Plan 01-02:**
- Modified: src/base-sound.ts (_onPlaybackStarted hook, finite duration check)
- Modified: src/track.ts (override hook, rafId tracking, RAF cleanup)
- Modified: src/sound.ts (disconnect in setup, onended cleanup)
- Modified: src/oscillator.ts (Infinity duration)

**Plan 01-03:**
- Modified: src/base-sound.ts (EventTarget extension, typed events, .on/.once/.off, lifecycle emission)

## Session Continuity

**Last session:** 2026-01-31T22:16:03Z
**Stopped at:** Completed 01-03-PLAN.md
**Resume file:** None

**Where we are:**
Plan 03 (Event System) complete. BaseSound extends EventTarget with typed addEventListener/removeEventListener overloads, .on()/.once()/.off() convenience methods, and lifecycle event emission (play/stop/end).

**What's next:**
Execute Plan 04 (Error Integration) to integrate error classes into existing code paths.

**Context to preserve:**
- Event subscription: sound.on('play', handler).on('stop', handler2) for chaining
- Single-fire events: sound.once('end', cleanupHandler)
- Event emission: this.emit('play', { time, source }) in lifecycle methods
- 'end' event only fires on natural completion (when _isPlaying is still true in onended)
- .off() requires same listener reference (EventTarget limitation)

---

*STATE.md updated: 2026-01-31*

# Project State: EZ Audio

**Last Updated:** 2026-01-31
**Current Focus:** Phase 2 - ADSR Envelopes (IN PROGRESS)

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 2 of 8 (ADSR Envelopes) - IN PROGRESS
**Plan:** 1 of 2 complete
**Status:** In progress

**Progress:** [██████████░░░░░░░░░░] 50% (Phase 1 complete, Phase 2 Plan 1 complete)

**Phase Goal:** Oscillator has configurable ADSR envelope with smooth attack/decay/sustain/release.

**Next Action:** Execute Phase 2 Plan 2 (Oscillator Integration).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 2 (in progress)
- Completed phases: 1
- Overall completion: ~30% (Phase 1 + Phase 2 Plan 1)

**Current Phase:**
- Plans: 2 (01-Envelope Class, 02-Oscillator Integration)
- Completed: 1 plan (02-01)
- Remaining: 1 plan (02-02)

**Velocity:**
- Plan 02-01 completed in 6 minutes
- TDD approach: 3 commits (test, feat, refactor)

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

**Phase 1 Plan 04 Decisions:**
- resume() is explicit method (not just play() after pause) for semantic clarity and event emission
- seek event emits after position change for consistency
- Error messages include specific actionable guidance (URLs, states, formats)

**Phase 2 Plan 01 Decisions:**
- sustainLevel clamped to 0-1 range (no exception thrown, silently clamps)
- Object.freeze for runtime readonly property enforcement
- Time constant = releaseTime/5 for ~99% completion during release phase
- release() parameter named `startTime` to avoid confusion with `this.releaseTime`

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 2 Execution:**
- [x] Plan 01: Envelope Class (TDD implementation)
- [ ] Plan 02: Oscillator Integration

**Cross-Phase:**
- [x] Verify standardized-audio-context-mock supports event testing - VERIFIED (works)
- [ ] Research impulse response libraries for effects presets (Phase 5)
- [ ] Determine voice pooling strategy for LayeredSound (Phase 4)

### Known Blockers

**Resolved (Plan 02):**
- ~~Track.play() and Track.stop() return void but should return Promise<void>~~ - Fixed via _onPlaybackStarted() hook and async stop()

**Resolved (Plan 04):**
- ~~Unused imports in src/index.ts and synthesis/index.ts~~ - Fixed

### Research Findings

**From research/SUMMARY.md:**

**Critical Pitfalls to Prevent:**
1. ADSR envelope retriggering discontinuities (Phase 2) - pick up from current value, use setTargetAtTime
2. JavaScript timer / AudioContext clock desynchronization (Phase 1) - use audioContext.currentTime for scheduling
3. AudioParam event accumulation performance (Phase 2, 5) - swap nodes periodically, use cancelScheduledValues
4. AudioBufferSourceNode single-use violation (Phase 3, 4) - create new source per playback
5. Direct AudioParam assignment during automation (Phase 2, 5) - always use AudioParam methods

**Phase-Specific Research Flags:**
- Phase 1: Standard EventTarget pattern, well-documented (no deep research needed) - COMPLETE
- Phase 2: Fast retriggering edge cases, polyphonic note management - Plan 01 COMPLETE, Plan 02 pending
- Phase 3: Standard patterns (no deep research needed)
- Phase 4: Voice pooling strategies (needs research during planning)
- Phase 5: Impulse response sourcing, FFT optimization (needs research during planning)

**Dependency Chain:**
- Events foundational for all features - COMPLETE
- ADSR requires events for testing - Plan 01 COMPLETE
- LayeredSound depends on events + ADSR + effects being stable
- Testing can parallelize with documentation

### Files Modified This Session

**Plan 02-01:**
- Created: src/envelope.ts (Envelope class with ADSR logic)
- Created: src/envelope.test.ts (29 tests, 280 lines)

## Session Continuity

**Last session:** 2026-01-31T22:48:18Z
**Stopped at:** Completed 02-01-PLAN.md
**Resume file:** None

**Where we are:**
Phase 2 (ADSR Envelopes) Plan 1 complete. Envelope class with ADSR logic implemented and tested.

**What's next:**
Execute Phase 2 Plan 2 (Oscillator Integration) - integrate Envelope with OscillatorController.

**Context to preserve:**
- Envelope class: `new Envelope({ attackTime, decayTime, sustainLevel, releaseTime })`
- Apply envelope: `envelope.applyTo(gainNode.gain, startTime)`
- Release envelope: `envelope.release(gainNode.gain, stopTime)`
- Time constant for release: releaseTime/5 gives ~99% completion
- AudioParam scheduling: setValueAtTime, linearRampToValueAtTime, setTargetAtTime

---

*STATE.md updated: 2026-01-31*

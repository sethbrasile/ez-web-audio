# Project State: EZ Audio

**Last Updated:** 2026-01-31
**Current Focus:** Phase 2 - ADSR Envelopes (COMPLETE)

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 2 of 8 (ADSR Envelopes) - COMPLETE
**Plan:** 4 of 4 complete
**Status:** Phase complete

**Progress:** [████████████████████] 100% Phase 2 (Phase 1 complete, Phase 2 complete)

**Phase Goal:** Oscillator has configurable ADSR envelope with smooth attack/decay/sustain/release. ACHIEVED.

**Next Action:** Plan Phase 3 (Track Improvements) or Phase 4 (LayeredSound).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 2 (complete)
- Completed phases: 2
- Overall completion: ~40% (Phases 1-2 complete)

**Current Phase (Complete):**
- Plans: 4 (01-Envelope Class, 02-Oscillator Integration, 03-Retriggering, 04-Integration Tests & Exports)
- Completed: 4 plans (02-01, 02-02, 02-03, 02-04)
- Remaining: 0 plans

**Velocity:**
- Plan 02-01 completed in 6 minutes
- Plan 02-03 completed in 13 minutes
- Plan 02-04 completed in 6 minutes
- TDD approach: 2 commits (test, feat)

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

**Phase 2 Plan 03 Decisions:**
- Removed Object.freeze() to allow mutable state for retriggering (TypeScript readonly still enforces compile-time)
- Linear interpolation for estimateCurrentValue matches Web Audio linearRampToValueAtTime behavior
- cancelAndHoldAtTime used when available (Chrome/Edge), cancelScheduledValues fallback for others
- AudioParamWithCancelAndHold intersection type avoids interface extension conflicts

**Phase 2 Plan 04 Decisions:**
- Export both Envelope class (for advanced use) and EnvelopeOptions type (for TypeScript)
- Test coexistence of envelope with onPlaySet/onPlayRamp APIs

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 2 Execution (COMPLETE):**
- [x] Plan 01: Envelope Class (TDD implementation)
- [x] Plan 02: Oscillator Integration
- [x] Plan 03: Envelope Retriggering
- [x] Plan 04: Integration Tests & Public Exports

**Cross-Phase:**
- [x] Verify standardized-audio-context-mock supports event testing - VERIFIED (works)
- [x] ADSR envelope retriggering - IMPLEMENTED (Plan 03)
- [ ] Research impulse response libraries for effects presets (Phase 5)
- [ ] Determine voice pooling strategy for LayeredSound (Phase 4)

### Known Blockers

**Resolved (Plan 02):**
- ~~Track.play() and Track.stop() return void but should return Promise<void>~~ - Fixed via _onPlaybackStarted() hook and async stop()

**Resolved (Plan 04):**
- ~~Unused imports in src/index.ts and synthesis/index.ts~~ - Fixed

**Resolved (Plan 02-03):**
- ~~ADSR envelope retriggering discontinuities~~ - Fixed with cancelAndHoldAtTime + estimateCurrentValue fallback

### Research Findings

**From research/SUMMARY.md:**

**Critical Pitfalls to Prevent:**
1. ~~ADSR envelope retriggering discontinuities (Phase 2)~~ - SOLVED: pick up from current value, use cancelAndHoldAtTime
2. JavaScript timer / AudioContext clock desynchronization (Phase 1) - use audioContext.currentTime for scheduling
3. AudioParam event accumulation performance (Phase 2, 5) - swap nodes periodically, use cancelScheduledValues
4. AudioBufferSourceNode single-use violation (Phase 3, 4) - create new source per playback
5. Direct AudioParam assignment during automation (Phase 2, 5) - always use AudioParam methods

**Phase-Specific Research Flags:**
- Phase 1: Standard EventTarget pattern, well-documented (no deep research needed) - COMPLETE
- Phase 2: Fast retriggering edge cases - COMPLETE (Plan 03), polyphonic note management - future
- Phase 3: Standard patterns (no deep research needed)
- Phase 4: Voice pooling strategies (needs research during planning)
- Phase 5: Impulse response sourcing, FFT optimization (needs research during planning)

**Dependency Chain:**
- Events foundational for all features - COMPLETE
- ADSR requires events for testing - COMPLETE
- Retriggering support for clickless playback - COMPLETE
- LayeredSound depends on events + ADSR + effects being stable
- Testing can parallelize with documentation

### Files Modified This Session

**Plan 02-04:**
- Created: src/oscillator.test.ts (19 ADSR integration tests)
- Modified: src/index.ts (Added Envelope and EnvelopeOptions exports)

## Session Continuity

**Last session:** 2026-01-31T23:19:29Z
**Stopped at:** Completed 02-04-PLAN.md (Phase 2 complete)
**Resume file:** None

**Where we are:**
Phase 2 (ADSR Envelopes) complete. All 4 plans executed successfully.

**What's next:**
Plan and execute Phase 3 (Track Improvements) or Phase 4 (LayeredSound).

**Context to preserve:**
- Envelope class: `new Envelope({ attackTime, decayTime, sustainLevel, releaseTime })`
- Apply envelope: `envelope.applyTo(gainNode.gain, startTime)`
- Release envelope: `envelope.release(gainNode.gain, stopTime)`
- Retriggering: `isActive` property, `estimateCurrentValue(time)` for phase interpolation
- Feature detection: cancelAndHoldAtTime (Chrome/Edge) with cancelScheduledValues fallback
- Time constant for release: releaseTime/5 gives ~99% completion
- Public exports: Envelope class and EnvelopeOptions type from src/index.ts
- Integration tests: 19 tests in src/oscillator.test.ts

---

*STATE.md updated: 2026-01-31*

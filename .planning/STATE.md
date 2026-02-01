# Project State: EZ Audio

**Last Updated:** 2026-02-01
**Current Focus:** Phase 4 - Composition Features (In Progress)

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 4 of 8 (Composition Features)
**Plan:** 2 of 3 complete
**Status:** In progress

**Progress:** [██████████████████████░░] ~65% (Phase 4 Plan 2 complete)

**Phase Goal:** Create complex musical compositions with layered sounds, synchronized drum patterns, and smooth track transitions.

**Next Action:** Continue Phase 4 (Crossfade utilities - Plan 3).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 4 (in progress)
- Completed phases: 3
- Overall completion: ~60% (Phases 1-3 complete, Phase 4 Plan 1 complete)

**Current Phase:**
- Plans: 2 completed (04-01 LayeredSound, 04-02 BeatTrack timing)
- Remaining: 1 (Crossfade utilities)

**Velocity:**
- Plan 02-01 completed in 6 minutes
- Plan 02-03 completed in 13 minutes
- Plan 02-04 completed in 6 minutes
- Plan 03-01 completed in 4 minutes
- Plan 03-02 completed in 7 minutes
- Plan 03-03 completed in 5 minutes
- Plan 04-01 completed in 9 minutes
- Plan 04-02 completed in 11 minutes

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

**Phase 3 Plan 01 Decisions:**
- Promise.allSettled for best-effort batch operations - all items attempted even if some fail
- CollectionError aggregates failures with count and error array
- Type guard for pauseAll() - runtime check skips non-Track items

**Phase 3 Plan 02 Decisions:**
- Shared responseCache between preload.ts and index.ts - single source of truth
- Promise.allSettled for parallel fetching with partial success
- Aggregate error reporting - user sees all failures at once

**Phase 3 Plan 03 Decisions:**
- GainNode and StereoPannerNode always created for consistent routing
- Node cleanup via onended callback for memory management

**Phase 4 Plan 01 Decisions:**
- Exact sync via audioContext.currentTime capture FIRST, then pass to all playAt() calls
- Independent layer end tracking via Set, emit when last layer finishes
- Graceful degradation: filter null/undefined layers, emit warning event
- Soft limit at 8 layers (configurable warnLayerCount), console.warn but allow any count
- Fresh Set per play() call for reusability (supports multiple playbacks)

**Phase 4 Plan 02 Decisions:**
- Beat events emitted at schedule time (lookahead) not play time - gives UI ~100ms advance notice
- EventTarget composition pattern used (Sampler doesn't extend EventTarget)
- Tempo changes take effect on next beat (already-scheduled beats can't be canceled)
- Pause/resume use beatIndex instead of time position (consistent with BeatTrack abstraction)

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 3 Execution (Complete):**
- [x] Plan 01: Collection Utilities (stopAll, pauseAll, playAll)
- [x] Plan 02: Preload API (preload, isPreloaded, clearPreloadCache)
- [x] Plan 03: Audio Sprites (createSprite, AudioSprite)

**Phase 4 Execution (In Progress):**
- [x] Plan 01: LayeredSound (synchronized multi-voice playback)
- [x] Plan 02: BeatTrack timing improvements (stop/pause/tempo)
- [ ] Plan 03: Crossfade utilities (smooth track transitions)

**Cross-Phase:**
- [x] Verify standardized-audio-context-mock supports event testing - VERIFIED (works)
- [x] ADSR envelope retriggering - IMPLEMENTED (Plan 03)
- [x] Voice pooling strategy for LayeredSound - RESOLVED (no pooling, fresh Set per play)
- [ ] Research impulse response libraries for effects presets (Phase 5)

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
- Phase 3: Standard patterns (no deep research needed) - COMPLETE
- Phase 4: Voice pooling strategies (needs research during planning)
- Phase 5: Impulse response sourcing, FFT optimization (needs research during planning)

**Dependency Chain:**
- Events foundational for all features - COMPLETE
- ADSR requires events for testing - COMPLETE
- Retriggering support for clickless playback - COMPLETE
- LayeredSound depends on events + ADSR + effects being stable
- Testing can parallelize with documentation

### Files Modified This Session

**Plan 04-01:**
- Created: src/layered-sound.ts (LayeredSound class, 320 lines)
- Created: src/layered-sound.test.ts (20 tests, 353 lines)
- Modified: src/events/event-types.ts (Added LayeredSoundEventMap, WarningEventDetail)
- Modified: src/index.ts (Added createLayeredSound factory and exports)

**Plan 04-02:**
- Modified: src/beat-track.ts (Added lookahead scheduler, stop/pause/resume, tempo control)
- Modified: src/beat-track.test.ts (Added 10 tests for timing control)
- Modified: src/events/event-types.ts (Added BeatEventDetail, BeatTrackEventMap)

## Session Continuity

**Last session:** 2026-01-31T21:48:14Z
**Stopped at:** Completed 04-02-PLAN.md
**Resume file:** None

**Where we are:**
Phase 4 (Composition Features) in progress. Plans 1-2 complete (LayeredSound, BeatTrack timing).

**What's next:**
Continue Phase 4 with Plan 3 (Crossfade utilities).

**Context to preserve:**
- BeatTrack timing control: `stop()`, `pause()`, `resume()`, `setTempo(bpm)`
- Lookahead scheduler: 100ms ahead, 25ms interval for resilient timing
- Beat events: emitted at schedule time (gives UI ~100ms lookahead for animations)
- Event details: 'beat' has { time, beatIndex, active, source }
- Pause/resume: use beatIndex (not time position) consistent with BeatTrack abstraction
- EventTarget composition: private EventTarget instance when parent doesn't extend EventTarget
- LayeredSound: `createLayeredSound([sound1, sound2, osc])` for synchronized multi-voice playback
- Exact sync via `audioContext.currentTime` capture FIRST, same value to all layers
- Master controls: `setGain(value)`, `setPan(value)` affect all layers
- Individual layer access: `getLayer(index)` returns Sound|Oscillator|undefined
- Graceful degradation: null/undefined layers filtered, 'warning' event emitted
- Audio Sprites: `createSprite(url, manifest)` returns AudioSprite
- Preload API: `preload(urls)`, `isPreloaded(url)`, `clearPreloadCache(url?)`
- Collection utilities: `stopAll(sounds)`, `pauseAll(tracks)`, `playAll(sounds)`
- Envelope class: `new Envelope({ attackTime, decayTime, sustainLevel, releaseTime })`

---

*STATE.md updated: 2026-02-01*

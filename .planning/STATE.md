# Project State: EZ Audio

**Last Updated:** 2026-02-01T21:19:00Z
**Current Focus:** Phase 5 - Effects and Visualization (Complete)

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 5 of 8 (Effects and Visualization)
**Plan:** 4 of 4 complete (05-01, 05-02, 05-03, 05-04)
**Status:** Phase complete

**Progress:** [████████████████████] 100% (Phases 1-5 complete)

**Phase Goal:** Add professional audio effects (reverb, filters, compression) and visualization capabilities.

**Next Action:** Proceed to Phase 6 (Polyphony) or Phase 8 (Documentation).

## Performance Metrics

**Roadmap:**
- Total phases: 8
- Current phase: 5 (complete)
- Completed phases: 5
- Overall completion: 80%

**Current Phase:**
- Plans: 4 completed (05-01 Effect Foundation, 05-02 Effect Integration, 05-03 Analyzer, 05-04 Debug Mode)
- Remaining: 0

**Velocity:**
- Plan 02-01 completed in 6 minutes
- Plan 02-03 completed in 13 minutes
- Plan 02-04 completed in 6 minutes
- Plan 03-01 completed in 4 minutes
- Plan 03-02 completed in 7 minutes
- Plan 03-03 completed in 5 minutes
- Plan 04-01 completed in 9 minutes
- Plan 04-02 completed in 11 minutes
- Plan 04-03 completed in 14 minutes
- Plan 05-01 completed in 8 minutes
- Plan 05-02 completed in 6 minutes
- Plan 05-03 completed in 6 minutes
- Plan 05-04 completed in 7 minutes

## Accumulated Context

### Decisions Made

**Architectural:**
- BaseSound extends EventTarget pattern (Phase 1) - native browser API for events
- ADSR as separate Envelope class, integrated via controllers (Phase 2)
- LayeredSound uses composition over inheritance (Phase 4)
- Effects integrate with existing connections array (Phase 5)
- Effect interface: input, output, bypass, mix properties (Phase 5)
- Analyzer at end of chain shows processed signal (Phase 5)

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

**Phase 4 Plan 03 Decisions:**
- Made BaseSound.gainNode and audioContext public for crossfade access
- Equal-power curves exclusively (no linear option) per CONTEXT.md guidance
- Used native globalThis.setTimeout for test compatibility with vi.useFakeTimers
- Preserve current gain values (no hardcoded start points) for mid-playback crossfades

**Phase 5 Plan 01 Decisions:**
- Single-node effects (GainEffect) share input/output reference
- Multi-node effects use wet/dry parallel paths with equal-power crossfade
- Duck typing for AudioNode detection (check for connect+disconnect methods)
- ExternalEffect interface requires only connect() method for wrapping

**Phase 5 Plan 02 Decisions:**
- Persistent effect chain: wired once in constructor, only source reconnects on each play()
- effectChainInput GainNode serves as entry point for effect chain routing
- Legacy connections array preserved for backward compatibility
- rewireEffects() public method allows bypass toggle updates

**Phase 5 Plan 03 Decisions:**
- Analyzer inserted AFTER effects (shows processed signal)
- Pre-allocate typed arrays for zero-allocation polling
- FFT size validation (power of 2, 32-32768)
- Compute binCount ourselves (fftSize/2) for mock compatibility

**Phase 5 Plan 04 Decisions:**
- Debug module uses boolean short-circuit for zero overhead when disabled
- Per-sound debug override with explicit false to silence individual sounds
- Custom handler via setDebugHandler(fn) for flexibility (testing, external logging)
- Connection logging on addConnection/removeConnection (not wireConnections)

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Active TODOs

**Phase 3 Execution (Complete):**
- [x] Plan 01: Collection Utilities (stopAll, pauseAll, playAll)
- [x] Plan 02: Preload API (preload, isPreloaded, clearPreloadCache)
- [x] Plan 03: Audio Sprites (createSprite, AudioSprite)

**Phase 4 Execution (Complete):**
- [x] Plan 01: LayeredSound (synchronized multi-voice playback)
- [x] Plan 02: BeatTrack timing improvements (stop/pause/tempo)
- [x] Plan 03: Crossfade utilities (smooth track transitions)

**Phase 5 Execution (Complete):**
- [x] Plan 01: Effect Foundation (Effect interface, GainEffect, FilterEffect, EffectWrapper)
- [x] Plan 02: Effect Integration (addEffect, wireEffectChain, setDestination)
- [x] Plan 03: Analyzer (frequency/waveform visualization data)
- [x] Plan 04: Debug Mode (setDebugMode, setDebugHandler, per-sound override)

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
- Phase 5: Impulse response sourcing, FFT optimization (needs research during planning) - COMPLETE

**Dependency Chain:**
- Events foundational for all features - COMPLETE
- ADSR requires events for testing - COMPLETE
- Retriggering support for clickless playback - COMPLETE
- LayeredSound depends on events + ADSR + effects being stable
- Testing can parallelize with documentation

### Files Modified This Session

**Plan 05-01:**
- Created: src/effects/index.ts (Effect interface and exports)
- Created: src/effects/gain-effect.ts (GainEffect class)
- Created: src/effects/filter-effect.ts (FilterEffect with 8 filter types)
- Created: src/effects/effect-wrapper.ts (EffectWrapper for external effects)
- Created: src/effects/gain-effect.test.ts (24 tests)
- Created: src/effects/filter-effect.test.ts (38 tests)
- Created: src/effects/effect-wrapper.test.ts (24 tests)

**Plan 05-02:**
- Modified: src/base-sound.ts (Effect import, effects array, effectChainInput, wireEffectChain, addEffect, removeEffect, getEffects, setDestination, rewireEffects)
- Modified: src/sound.ts (wireConnections routes through effectChainInput)
- Modified: src/oscillator.ts (wireConnections routes through effectChainInput, setup calls rewireEffects)
- Modified: src/index.ts (export effect factories, classes, types)
- Modified: src/base-sound.test.ts (added 21 effect system integration tests)

**Plan 05-03:**
- Created: src/analyzer.ts (Analyzer class, AnalyzerOptions interface, createAnalyzer factory)
- Created: src/analyzer.test.ts (36 tests)
- Modified: src/base-sound.ts (added _analyzer, setAnalyzer, getAnalyzer, updated wireEffectChain)
- Modified: src/base-sound.test.ts (added 10 analyzer integration tests)
- Modified: src/index.ts (export Analyzer, createAnalyzer, AnalyzerOptions)

**Plan 05-04:**
- Created: src/debug/messages.ts (DebugMessage interface, formatDebugMessage)
- Created: src/debug/logger.ts (internal logger state and handler)
- Created: src/debug/index.ts (public API: setDebugMode, setDebugHandler)
- Created: src/debug/debug.test.ts (19 unit tests)
- Modified: src/base-sound.ts (added debug property, integrated debug logging)
- Modified: src/base-sound.test.ts (added 10 integration tests)
- Modified: src/index.ts (export setDebugMode, setDebugHandler, DebugMessage)

## Session Continuity

**Last session:** 2026-02-01T21:19:00Z
**Stopped at:** Completed 05-03-PLAN.md (Phase 5 complete)
**Resume file:** None

**Where we are:**
Phase 5 (Effects and Visualization) complete. All 4 plans executed successfully.

**What's next:**
Proceed to Phase 6 (Polyphony) or Phase 8 (Documentation).

**Context to preserve:**
- Analyzer: `createAnalyzer(ctx, opts)` returns Analyzer instance
- Attach to sound: `sound.setAnalyzer(analyzer)`, `sound.getAnalyzer()`
- Analyzer chain position: after effects, before destination (shows processed signal)
- Polling methods: `analyzer.getFrequencyData()` (Uint8Array), `analyzer.getTimeDomainData()` (Uint8Array), `analyzer.getFloatFrequencyData()` (Float32Array)
- FFT configuration: `{ fftSize, minDecibels, maxDecibels, smoothingTimeConstant }`
- Pre-allocated arrays: zero-allocation polling for requestAnimationFrame
- Effect integration: `sound.addEffect(effect)`, `sound.removeEffect(effect)`, `sound.getEffects()`
- Custom routing: `sound.setDestination(node)` for sub-mixes and analyzers
- Effect chain: source -> effectChainInput -> [effects] -> gain -> panner -> [analyzer] -> destination
- Persistent effects: chain wired once, only source reconnects on play()
- Bypass support: `effect.bypass = true` then `sound.rewireEffects()` to update chain
- Debug mode: `setDebugMode(true)` enables global logging
- Per-sound override: `sound.debug = false` silences, `sound.debug = true` enables
- Custom handler: `setDebugHandler(fn)` for testing/external logging
- Debug logs play/stop/end events with timestamps and details
- Debug logs connection changes on addConnection/removeConnection
- Debug warns about suspended AudioContext
- Zero overhead when disabled (boolean short-circuit first)
- Effect interface: { input: AudioNode, output: AudioNode, bypass: boolean, mix: number }
- GainEffect: thin wrapper around GainNode with bypass/mix support
- FilterEffect: 8 BiquadFilter types (lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass)
- EffectWrapper: wraps external effects with connect() method for bypass/mix control
- Equal-power crossfade: cos(angle) for dry, sin(angle) for wet
- Factory functions: createGainEffect(ctx, value?), createFilterEffect(ctx, type, opts?), wrapEffect(ctx, effect)
- Crossfade: `crossfade(fromTrack, toTrack, duration)` for smooth transitions
- Equal-power curves: cos(x) for fade-out, sin(x) for fade-in (maintains constant power)
- Fire-and-forget: auto-stops source track and resets gain to 1.0 after fade
- Preserves current gain values: uses gainNode.gain.value, not hardcoded 1.0
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

*STATE.md updated: 2026-02-01T21:19:00Z*

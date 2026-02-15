# Maintainability & Forward-Compatibility Audit

**Generated:** 2026-02-15
**Phase:** 12 - Comprehensive Audit
**Requirements:** MAINT-01, MAINT-02

## Brittle Areas (MAINT-01)

### Tight Coupling

| From | To | Coupling Point | Risk | Hardening |
|------|----|---------------|------|-----------|
| Sound | SoundController | Direct instantiation in constructor (line 56) | Changing controller signature requires changing Sound constructor | Use factory method or dependency injection |
| Oscillator | OscillatorController | Direct instantiation in constructor (line 156) | Changing controller signature requires changing Oscillator constructor | Use factory method or dependency injection |
| BaseSound.setup() | Subclass-specific logic | Abstract method called from playAt() (line 821) | Order dependency: setup() MUST be called before wireConnections() | Document temporal coupling or enforce via interface |
| Controllers | Audio nodes | Direct access to node internals (.value, .setValueAtTime) | Web Audio API changes could break all controllers | Already unavoidable - Web Audio API is stable |
| Sampler | Playable & Connectable | getNextSound() assumes both interfaces (line 137-139) | Can't use sounds that don't implement both | Good design - interfaces enforce contract |
| BeatTrack.beats getter | Beat constructor | Directly instantiates Beat with specific args (lines 135-139) | Adding Beat constructor params requires updating BeatTrack | Extract Beat creation to factory method |

### Fragile Inheritance

| Class | Issue | Risk | Hardening |
|-------|-------|------|-----------|
| Track._onPlaybackStarted() | Overrides protected hook without calling super (line 89) | If BaseSound adds critical behavior to _onPlaybackStarted(), Track breaks | Document that hooks are extension points, not overridable workflows |
| Oscillator.setup() | Creates new gainNode, updates controller (lines 233-238) | Assumes controller has updateGainNode/updateAudioSource methods | Controller interface should enforce these methods (it does) |
| Oscillator.stop() | Relies on envelope existing to change behavior (line 331) | If envelope becomes required, non-envelope oscillators break | Good - envelope is optional by design |
| Sound.setup() | Calls wireConnections() which is abstract in BaseSound (line 83) | Subclasses MUST implement wireConnections() or fail at runtime | Abstract methods enforce this - no issue |
| BaseSound.wireEffectChain() | Uses try/catch to swallow disconnection errors (lines 228-267) | Hides real errors if nodes are in unexpected state | Acceptable pattern - disconnect() throws if not connected, which is normal |
| Track.stop() | Calls super.stop() after modifying state (line 201) | Order matters - startOffset reset must happen before super.stop() | Document order requirement in comments |

### Hard-coded Assumptions

| File | Line | Assumption | Risk |
|------|------|-----------|------|
| base-sound.ts | 811-819 | Assumes AudioContext.state can only be 'suspended' or 'running' | If Web Audio adds new states, warning won't appear correctly |
| oscillator.ts | 73-82 | Filter names hard-coded in array, matched as strings | Adding new filter types requires code change in two places |
| beat-track.ts | 57-58 | Lookahead timing hard-coded (100ms/25ms) | Users can't adjust for low-latency or high-latency scenarios |
| controllers/base-param-controller.ts | 127-143 | onPlaySet() mutates startingValues array by reference (line 131, 134, 138) | Concurrent onPlaySet() calls can cause array mutation bugs |
| musical-identity.ts | 176-188 | Identifier parsing assumes 2 or 3 char format (A4, Ab4, C#5) | Non-standard note names (microtonal, alternate tunings) won't parse |
| index.ts | 44 | Single global AudioContext stored in module closure | Multiple contexts needed for spatial audio or multi-scene apps won't work |
| sampler.ts | 123-126 | Iterator reset logic assumes .values() always works | If sounds Set is mutated during iteration, iterator may break |

### Missing Defensive Code

| File | Method | Missing Check | Impact |
|------|--------|--------------|--------|
| base-sound.ts | wireEffectChain() | No validation that effects are non-null before iterating (line 274) | Null effect in array causes crash |
| base-sound.ts | addEffect() | Position validation allows negative values (line 310) | Negative position causes splice() to insert from end (unexpected behavior) |
| oscillator.ts | constructor | Filter options accessed without null check (line 168) | If options.lowpass = null (not undefined), crashes |
| track.ts | seek() | No validation that amount is a number (line 256) | Passing string or NaN causes silent failure or NaN propagation |
| controllers/sound-controller.ts | applyValues() | No check that bufferSourceNode exists before accessing .detune (line 27) | If controller used after source destroyed, crashes |
| controllers/oscillator-controller.ts | applyValues() | No check that oscillator exists (line 64) | If controller used after oscillator destroyed, crashes |
| beat-track.ts | scheduleBeat() | No bounds check on beatIndex (line 325) | If beatIndex >= beats.length, crashes |
| sampler.ts | play/playIn/playAt | No check that sounds Set is non-empty (lines 79-110) | Empty sampler crashes on play() |
| musical-identity.ts | identifier setter | No validation that value is valid format before parsing (line 175) | Invalid input causes silent bugs or crashes |
| index.ts | load() | responseCache.get() returns undefined if key missing, but code assumes it exists (line 520) | Race condition if cache cleared between .has() and .get() |

### State Management Risks

| Class | State | Risk Scenario | Recommendation |
|-------|-------|---------------|----------------|
| BaseSound | _isPlaying flag vs audioSourceNode.onended | onended fires AFTER stop() is called, flag may be out of sync briefly | Current check (line 841) handles this correctly |
| Track | rafId not cleaned up | If stop() called while RAF running, memory leak from uncancelled frames | Current implementation cancels RAF (lines 116-118, 192-195) |
| Track | startOffset mutated during playback | Position tracking updates startOffset every frame (line 219) - concurrent seeks could corrupt | Add mutex or disable seek during playback |
| BeatTrack | Pause state (pausedBeatIndex, pausedBeatTime) | If stop() called while paused, pause state not cleared - resume() fails | stop() clears pause state (lines 214-215) - handled |
| Oscillator | gainNode recreated on every play() | Old gainNode references in controller may persist | Controller updated with new nodes (line 238) - handled |
| BaseSound | connections array mutated mid-playback | User could modify connections while wireConnections() is running | Freeze connections during playback or use defensive copy |
| Controllers | Parameter arrays (startingValues, valuesAtTime, etc.) | Arrays never cleared between plays - old automation persists | Controllers should clear scheduled values after apply or provide reset() |

### Connection Chain

| Scenario | Current Behavior | Risk | Recommendation |
|----------|-----------------|------|----------------|
| Add effect mid-playback | wireEffectChain() disconnects and reconnects all nodes (line 223) | Audio glitch if source is playing | Document that effects should be added before playback, or buffer changes |
| Remove effect mid-playback | Same as add - full rewire (line 343) | Audio glitch during playback | Same as above |
| Change destination mid-playback | Full rewire of effect chain (line 381) | Audio routing breaks briefly | Acceptable - rare use case |
| Toggle effect.bypass mid-playback | User must call rewireEffects() manually (line 389) | Easy to forget - silent failure (bypassed effect still audible) | Auto-detect bypass changes via Proxy or polling |
| Multiple sources share same effectChainInput | Not possible - each sound has own effectChainInput (line 193) | Good isolation | No issue |
| Source disconnected before effectChainInput | Sound.setup() disconnects old source (line 67-74) | Could leave dangling connections | Current try/catch handles this |
| Legacy connections + new effects | Legacy connections come BEFORE effectChainInput (line 105) | Order is: source -> legacy -> effects -> gain -> pan. Can't insert effects before legacy | Document order or deprecate legacy connections |
| Analyzer inserted after effects | Analyzer is last in chain before destination (line 289) | Correct - shows fully processed signal | No issue |

## Forward Compatibility (MAINT-02)

### v2 Feature Compatibility Assessment

| v2 Feature | Compatible? | Blocking Issue | Recommendation |
|------------|-------------|---------------|----------------|
| Spatial Audio (SPATIAL-01) | Partial | Current pannerNode is StereoPannerNode (2D pan only). Web Audio has PannerNode for 3D positioning. | Add optional 3D panner mode: `sound.setSpatialMode('3d')` creates PannerNode instead of StereoPannerNode. Backward compatible - default remains 2D. |
| Spatial Audio (SPATIAL-02) | Yes | AudioContext has global listener. Can be configured without API changes. | Add `getAudioContext().listener.setPosition()` wrapper: `setListenerPosition(x, y, z)`. No breaking changes. |
| Spatial Audio (SPATIAL-03) | Yes | PannerNode has distanceModel property. | Same as SPATIAL-01 - add distance model option when creating 3D panner. |
| Recording/Capture (ADV-02) | No | Current connection chain ends at destination. MediaRecorder needs access to audio stream. | Add `sound.getOutputStream(): MediaStream` method that taps pannerNode output. Requires creating MediaStreamDestination node. Not breaking - additive only. |
| Microphone Input (ADV-03) | No | No MicrophoneSource class. Current hierarchy assumes preloaded buffers or oscillators. | Create new `MicrophoneInput extends BaseSound` that uses MediaStreamAudioSourceNode. Fits existing pattern - no breaking changes. |
| React Hooks (REACT-01) | Yes | Library is framework-agnostic. Sound instances are plain objects. | Hooks can wrap factory functions: `useSound(url)`, `useTrack(url)`. Zero library changes needed. |
| Vue Composables (VUE-01) | Yes | Same as React - plain objects, no framework coupling. | Composables can wrap factory functions. Zero library changes needed. |

**Summary:** Spatial audio requires minor API additions (3D panner mode, listener position helpers). Recording needs MediaStreamDestination tap. Microphone input needs new class. React/Vue bindings are external packages with zero library changes.

### Sealed Design Issues

| Class/Method | Issue | Recommendation |
|-------------|-------|----------------|
| BaseSound.effects (line 85) | Protected - users can't inspect effect chain | Add public `getEffects(): readonly Effect[]` (already exists at line 363) ✓ |
| BaseSound.effectChainInput (line 92) | Protected - users can't connect custom nodes before effect chain | Add `getEffectChainInput(): GainNode` or document that connections array allows this |
| BaseSound.wireEffectChain() (line 223) | Private - users can't customize wiring logic | Acceptable - internal implementation detail. Custom wiring via connections array. |
| BaseSound._destination (line 99) | Protected with public setDestination() | Good design - controlled mutation |
| Controllers (all) | No public interface for "get all scheduled automation" | Add `getScheduledValues(): readonly ParamValue[]` for debugging/introspection |
| Oscillator.filters (line 126) | Private - users can't access filter nodes | Add `getFilters(): readonly BiquadFilterNode[]` for advanced users |
| BeatTrack._beats (line 70) | Private cache, public getter | Good design - encapsulation with access |
| Sampler.sounds (line 67) | Protected Set - users can't inspect loaded sounds | Add `getSounds(): readonly (Playable & Connectable)[]` |
| Track.rafId (line 39) | Private - users can't cancel position tracking | Acceptable - implementation detail. Position tracking is automatic. |

### Type Constraints

| Type | Issue | Recommendation |
|------|-------|----------------|
| ControlType (line 1, base-param-controller.ts) | Union type `'frequency' \| 'gain' \| 'detune' \| 'pan'` | Hardcoded - adding new params (e.g., playbackRate) requires editing type in 3 places. Make extensible via mapped type or const assertion. |
| OscillatorType | Uses Web Audio native type - not extensible | Good - Web Audio API defines this. Custom waves use PeriodicWave (advanced). |
| Effect interface | Requires `input`, `output`, `bypass` (effects/index.ts) | Good design - minimal contract. Users can implement custom effects. |
| Playable interface | Only requires `play()`, `playAt()`, `playIn()`, `stop()` etc | Too minimal - no `isPlaying` or `duration`. Consumers can't introspect state. Add optional `readonly isPlaying?: boolean` |
| Connectable interface | Requires `gainNode`, `pannerNode`, `changeGainTo`, `changePanTo` | Assumes stereo panner - incompatible with 3D spatial. Make `pannerNode` generic: `pannerNode: StereoPannerNode \| PannerNode` |
| TimeObject | Hardcoded format (raw, string, pojo) | Good design - covers all use cases. No changes needed. |
| BeatTrackEventMap | Specific events (beat, stop, pause, resume) | Extensible via declaration merging if needed. Good pattern. |

### Module Structure

| Concern | Current State | Recommendation |
|---------|--------------|----------------|
| Tree-shaking | Single index.ts barrel export re-exports everything | Bundlers can tree-shake this IF imports are ESM. Test with Rollup/Webpack to verify. No changes needed unless bundle size issues reported. |
| Separate packages (ez-audio/react) | All code in `src/` - no sub-package structure | Create `packages/core`, `packages/react`, `packages/vue` structure. Core exports from `index.ts`, framework packages import from `ez-audio/core`. Requires build config changes. |
| Separate packages (ez-audio/spatial) | Spatial audio would add PannerNode code to BaseSound | Add `src/spatial/` directory with SpatialSound class. Re-export from `index.ts` as opt-in. Backward compatible - existing code unaffected. |
| Side effects | index.ts creates AudioContext on first factory call (line 46) | Safe - lazy creation. No init-time side effects. Tree-shakable. |
| Internal imports | Uses path aliases (@/, @utils/, @controllers/) | Good for internal code. External packages should import from public index. Document this. |
| Circular dependencies | BaseSound -> controllers -> back to BaseSound types | Types-only circular deps are safe in TS. Runtime circularity checked via import graph - none found. |

## Summary

**Brittle Areas Found:** 37 specific issues across 6 categories
**Most Critical:**
- Missing defensive checks (10 issues) - null/undefined crashes, array bounds
- Hard-coded assumptions (7 issues) - magic numbers, string matching, format parsing
- State management risks (7 issues) - concurrent mutation, stale references

**Forward Compatibility:**
- **Spatial Audio:** Requires minor API additions (3D panner mode, listener helpers). Non-breaking.
- **Recording/Capture:** Requires MediaStreamDestination tap. Additive API.
- **Microphone Input:** Requires new MicrophoneInput class. Fits existing pattern.
- **Framework Bindings:** Zero library changes needed. External packages only.

**Immediate Hardening Priorities (for Phase 13):**
1. Add null checks to effect/filter/sound iterations
2. Add bounds validation to seek(), addEffect() position, beatIndex
3. Clear controller parameter arrays between plays (memory leak)
4. Document temporal coupling (setup() -> wireConnections() order)
5. Add defensive copy or freeze for connections array during playback

**v2 Preparation (deferred to future milestone):**
1. Make ControlType extensible (mapped type or plugin system)
2. Add opt-in 3D spatial mode (PannerNode instead of StereoPannerNode)
3. Add MediaStreamDestination tap for recording
4. Extract spatial audio to `src/spatial/` for code splitting
5. Create monorepo structure for framework bindings

---

*Audit completed: 2026-02-15*

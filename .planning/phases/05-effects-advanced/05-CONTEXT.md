# Phase 5: Effects & Advanced Features - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add professional-quality audio effects and visualization capabilities that integrate with existing sounds without manual Web Audio node wiring. Includes debug mode for development. This phase does NOT add new sound types, playback modes, or change core architecture.

</domain>

<decisions>
## Implementation Decisions

### Effect Integration Strategy
- **Adapter pattern** - ez-audio does NOT bundle effect libraries. Users bring their own (Tuna, etc.)
- `addEffect()` accepts any object with `connect()` method - auto-wraps to provide bypass/mix if missing
- Effects are "always connected" - wiring persists across multiple `play()` calls (not rebuilt each time)
- Shared effects allowed - same effect instance can be added to multiple sounds

### Built-in Effects
- **GainEffect and FilterEffect only** - thin wrappers around native Web Audio nodes
- FilterEffect exposes ALL BiquadFilter types: lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
- Factory functions: `createGainEffect()`, `createFilterEffect()` - matches library pattern
- **Demo site shows custom distortion example** - demonstrates manual effect building, not built-in

### Effect Interface
- All effects expose: `input` (AudioNode), `output` (AudioNode), `bypass` (boolean), `mix` (0-1 wet/dry)
- Auto-wrapped effects get these properties added automatically
- `removeEffect()` + `effect.bypass = true` for disabling without removal

### Effect Chaining & Routing
- Multiple effects per sound - ordered chain: `source → effect1 → effect2 → gain → panner → destination`
- `addEffect(effect)` appends to chain (increments position)
- `addEffect(effect, position)` inserts at explicit index (int arg, not options object)
- Configurable destination: `sound.setDestination(node)` - allows routing to buses, analyzers, other sounds

### Visualization
- **Opt-in via factory**: `createAnalyzer()` then `sound.setAnalyzer(analyzer)`
- **Polling model**: `analyzer.getFrequencyData()`, `analyzer.getTimeDomainData()`, `analyzer.getFloatFrequencyData()`
- All three data types: frequency (Uint8Array), waveform (Uint8Array), decibels (Float32Array)
- Shareable analyzers - one analyzer can receive from multiple sounds

### Debug Mode
- Global + per-sound: `setDebugMode(true)` globally, `sound.debug = true/false` per-instance override
- Logs: events (play/stop/end/pause/resume/seek), connection chain changes, warnings (suspended context, missing buffer)
- Output: console by default, `setDebugHandler(fn)` for custom routing
- Zero overhead when disabled - checks short-circuit immediately

### Claude's Discretion
- Effect chain reordering method (moveEffect vs remove/add)
- Analyzer FFT size configuration
- Debug message formatting and grouping
- Internal wet/dry mixing implementation

</decisions>

<specifics>
## Specific Ideas

- "Look at Tuna (github.com/Theodeus/tuna) for plugin compatibility" - effects with `connect()` method should just work
- "Current connection system feels brittle" - the new 'always connected' approach replaces per-play rewiring
- "Demo site shows distortion example" - like ember-audio did, demonstrates building custom effects manually

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 05-effects-advanced*
*Context gathered: 2026-02-01*

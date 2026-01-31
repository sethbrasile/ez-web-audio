# Project Research Summary

**Project:** EZ Web Audio - Advanced Features
**Domain:** Web Audio API wrapper library
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

EZ Web Audio is positioned to add advanced synthesis and effects capabilities while maintaining its core value proposition: zero-dependency, TypeScript-first simplicity. Research shows that modern Web Audio libraries fall into three categories—full DAWs (Tone.js), playback-focused (Howler.js), and simplicity-focused (Pizzicato.js, EZ Audio). The recommended approach is to add power-user features (ADSR envelopes, audio sprites, effects chains) without sacrificing the existing fluent API and clean architecture.

The most critical finding: **all advanced features should use native Web Audio API capabilities** rather than third-party libraries. This maintains the zero-dependency promise and keeps bundle size minimal. The existing controller/BaseSound separation is actually strengthened by these patterns—events extend EventTarget, ADSR integrates with controllers, effects leverage the connections array, and LayeredSound uses composition over inheritance.

Key risks center on Web Audio's multi-threaded nature and real-time requirements. ADSR envelope retriggering can cause audible clicks, JavaScript timer/AudioContext clock desynchronization causes timing drift, and AudioParam event accumulation degrades performance over time. All these pitfalls have well-documented prevention strategies using native API patterns.

## Key Findings

### Recommended Stack

The research confirms that **zero additional dependencies** are needed for all proposed advanced features. Every capability can be implemented using native Web Audio API nodes and AudioParam scheduling.

**Core technologies (already in place):**
- TypeScript 5.6+ — type safety and DX already excellent
- Web Audio API 1.1 — sufficient for all advanced features
- Vitest + happy-dom — test infrastructure works for new features
- standardized-audio-context-mock — handles AudioParam automation testing

**Why no dependencies:**
- ADSR: Native AudioParam methods (setValueAtTime, linearRamp, exponentialRamp)
- Events: Native EventTarget with TypeScript generics
- Visualization: Native AnalyserNode + requestAnimationFrame
- Sprites: JSON map + AudioBuffer offset playback
- Effects: Native nodes (ConvolverNode, BiquadFilterNode, DelayNode, WaveShaperNode)

**Anti-patterns to avoid:**
- Third-party wrappers (Tone.js, Howler.js) — EZ Audio IS the wrapper
- ScriptProcessorNode (deprecated) — use AudioWorklet only if truly needed
- Manual parameter animation with setInterval — use AudioParam scheduling

### Expected Features

Research identified a clear hierarchy of features based on what users expect from modern Web Audio libraries.

**Must have (table stakes):**
- Event system — Howler.js, Pizzicato.js, Tone.js all have play/pause/stop/ended events
- Audio loading/playback — already covered
- Volume/pan control — already covered
- AudioContext management — already covered (initAudio)

**Should have (competitive differentiators):**
- ADSR envelopes — Tone.js signature feature, enables professional synthesis
- Audio sprites — Howler.js signature feature, critical for games
- Fluent parameter API — already has this (onPlaySet, onPlayRamp)
- Effects presets — Pizzicato.js has 13 effects, users expect reverb/delay/distortion
- Crossfading — common DJ/music app need, equal-power curve required
- LayeredSound — planned feature, enables realistic instruments

**Defer (v2+ or niche):**
- Transport system — DAW feature, complex, Tone.js owns this space
- 3D spatial audio — niche use case, can be plugin later
- Full 4-stage ADSR — simple attack/release covers 80% of use cases
- Audio visualization — nice-to-have, medium complexity

**Critical dependency:** Event system must come first. Nearly all advanced features depend on it (LayeredSound sync, ADSR phase events, visualization updates, crossfading timing).

### Architecture Approach

All new features integrate cleanly with the existing BaseSound/Controller architecture without breaking changes. The key insight is that EZ Audio's separation of concerns (audio nodes in BaseSound, parameter automation in Controllers, effects in connections array) naturally accommodates advanced patterns.

**Major architectural patterns:**

1. **LayeredSound: Composition over inheritance**
   - Composite pattern containing multiple Sound instances
   - Master gain/pan nodes for composite control
   - Each layer maintains individual controllers
   - Implements Playable & Connectable interfaces
   - No BaseSound inheritance needed (cleaner)

2. **ADSR Envelopes: Controller extension**
   - Separate Envelope classes (Envelope, AmplitudeEnvelope)
   - Integrate via BaseParamController.applyEnvelope()
   - Controllers remain single source of truth for parameter automation
   - Fluent API: `sound.controller.applyEnvelope('gain', adsr).at(time).releasing(releaseTime)`

3. **Event System: EventTarget inheritance**
   - BaseSound extends EventTarget (native browser API)
   - Typed event maps with CustomEvent<T>
   - on/once/off convenience methods
   - Events fire at lifecycle moments (play, stop, end, pause, resume)

4. **Effects Presets: Factory + Builder**
   - EffectPresets static class with pre-configured chains
   - EffectChainBuilder for custom fluent chains
   - Integrates with existing connections array
   - Each effect = Connection object { audioNode, name }

**Data flow:**
```
User API → BaseSound methods → Controllers (params + ADSR) → wireConnections (effects) → Web Audio nodes → Events fire → User callbacks
```

**Build order (based on dependencies):**
1. Event system (foundation for everything)
2. ADSR envelopes (extends controllers, needs events)
3. Effects presets (extends connections, needs events)
4. LayeredSound (uses all previous features)

### Critical Pitfalls

Research identified 13 domain pitfalls, with 5 being critical (cause audible artifacts or major performance issues).

1. **ADSR envelope retriggering discontinuities**
   - Fast note changes cause clicks/pops if new attack starts from wrong gain value
   - Prevention: Pick up from current value, use setTargetAtTime, never ramp to exactly zero
   - Affects: ADSR envelopes, LayeredSound

2. **JavaScript timer / AudioContext clock desynchronization**
   - setTimeout/setInterval causes timing drift and stuttering
   - Prevention: Use lookahead scheduling with audioContext.currentTime, never use Date.now() for audio events
   - Affects: Event system, BeatTrack, audio sprites timing

3. **AudioParam event accumulation performance degradation**
   - Thousands of automation events cause render deadline misses and dropouts
   - Prevention: Swap nodes periodically, use cancelScheduledValues aggressively, prefer setTargetAtTime over long ramp chains
   - Affects: ADSR envelopes, effects automation, crossfading

4. **AudioBufferSourceNode single-use violation**
   - Attempting to reuse source after start() causes silent failures
   - Prevention: Always create new source per playback, reuse buffer not source
   - Affects: Audio sprites, Sound/Track, LayeredSound

5. **Direct AudioParam value assignment during automation**
   - Setting .value directly while automation scheduled silently fails
   - Prevention: Always use setValueAtTime, never mix direct assignment with automation
   - Affects: ADSR envelopes, effects automation, existing controllers

**Secondary pitfalls** (moderate impact): AnalyserNode FFT performance, memory leaks from undisconnected nodes, effects chain connection order errors, crossfade volume curve errors, multiple AudioContext instances.

**Minor pitfalls** (easily fixed): iOS silent mode behavior (already handled), exponential ramp to zero error, preloading without user gesture.

## Implications for Roadmap

Based on combined research, the roadmap should follow a foundation-first approach where each phase builds on capabilities established in previous phases.

### Phase 1: Event System Foundation

**Rationale:** Events are a missing table-stakes feature and a dependency for all other advanced features. Low complexity, high value, no dependencies.

**Delivers:**
- BaseSound extends EventTarget with typed event maps
- on/once/off methods for play/stop/end/pause/resume events
- Internal emit() helper for lifecycle events
- Scheduled event emission using setTimeout

**Addresses features:**
- Playback events (table stakes from FEATURES.md)
- Foundation for LayeredSound sync
- Foundation for ADSR phase events
- Foundation for visualization updates

**Avoids pitfalls:**
- #2 Timer desynchronization (use audioContext.currentTime for scheduling)
- Proper event timing infrastructure from the start

**Research flags:** Standard EventTarget pattern, well-documented. Skip phase-specific research.

---

### Phase 2: ADSR Envelopes

**Rationale:** Extends existing controller pattern naturally. Enables professional synthesis capability (Tone.js signature feature). Depends on event system for envelope phase events.

**Delivers:**
- Envelope class with applyTo(param, startTime, releaseTime)
- AmplitudeEnvelope convenience wrapper
- BaseParamController.applyEnvelope() fluent method
- Support for attack/decay/sustain/release automation
- Linear and exponential curve options

**Addresses features:**
- ADSR envelopes (competitive differentiator from FEATURES.md)
- Professional synthesis capability
- Enhanced parameter control

**Uses stack:**
- Native AudioParam scheduling (setValueAtTime, linearRamp, exponentialRamp, setTargetAtTime)

**Implements architecture:**
- Controller extension pattern from ARCHITECTURE.md
- Envelope as separate class, integrated via controllers

**Avoids pitfalls:**
- #1 Retriggering discontinuities (pick up from current value, use setTargetAtTime)
- #3 Event accumulation (swap nodes periodically, use cancelScheduledValues)
- #5 Direct assignment (always use AudioParam methods)
- #12 Exponential zero (use 0.0001 minimum)

**Research flags:** Moderately complex timing math. Consider phase-specific research for edge cases (fast retriggering, polyphonic note management).

---

### Phase 3: Audio Sprites

**Rationale:** Independent of ADSR/effects, provides major value for games. Low complexity, high impact. Standard JSON format compatible with audiosprite npm package.

**Delivers:**
- AudioSprite interface { src, sprite: { name: [offset, duration] } }
- AudioSpriteLoader class with load() and playSprite()
- Integration with existing Sound class (offset/duration support)
- createSpriteSound() factory function

**Addresses features:**
- Audio sprites (Howler.js signature feature from FEATURES.md)
- Efficient asset loading for games

**Uses stack:**
- Native AudioBuffer + AudioBufferSourceNode.start(when, offset, duration)
- JSON sprite map (industry standard format)

**Implements architecture:**
- Extends existing Sound pattern
- Reuses audioBuffer, creates new source per sprite play

**Avoids pitfalls:**
- #4 Source reuse (create new source for each sprite play)
- #7 Memory leaks (disconnect source.onended)
- #13 Preload timing (wait for user gesture)

**Research flags:** Simple pattern, well-documented. Skip phase-specific research.

---

### Phase 4: Effects Presets

**Rationale:** Extends existing connections architecture. Provides professional sound quality without complex setup. Independent of LayeredSound, can test with existing Sound classes.

**Delivers:**
- EffectPreset interface and EffectPresets static class
- Built-in presets (Cathedral Reverb, Telephone Filter, Tape Saturation)
- EffectChainBuilder with fluent API
- BaseSound.applyPreset() and buildEffects() methods
- Impulse response loading utilities

**Addresses features:**
- Effects presets (competitive differentiator from FEATURES.md)
- Reverb, delay, distortion, filters

**Uses stack:**
- Native nodes (ConvolverNode, DelayNode, BiquadFilterNode, WaveShaperNode, DynamicsCompressorNode)
- Impulse response AudioBuffers

**Implements architecture:**
- Factory + Builder pattern from ARCHITECTURE.md
- Integrates with existing connections array

**Avoids pitfalls:**
- #5 Direct assignment (use AudioParam methods for effect parameters)
- #8 Connection order (validate same context, disconnect-before-reconnect)
- #7 Memory leaks (track node lifecycle)

**Research flags:** Impulse response sourcing needs validation. Consider phase-specific research for quality IR libraries and licensing.

---

### Phase 5: LayeredSound (Composite Instrument)

**Rationale:** Most complex feature, depends on events (sync), ADSR (per-layer envelopes), and effects (layer processing). Build last after foundations are stable.

**Delivers:**
- LayeredSound class implementing Playable & Connectable
- Composite pattern (contains multiple Sound instances)
- Master gain/pan nodes for composite control
- Per-layer parameter control
- createLayeredSound() factory function

**Addresses features:**
- LayeredSound (planned feature from FEATURES.md)
- Realistic instrument rendering (velocity layers, round-robin)

**Uses stack:**
- Composition of existing Sound classes
- Master controllers for composite parameters

**Implements architecture:**
- Composite pattern (composition over inheritance) from ARCHITECTURE.md
- Implements Playable & Connectable interfaces
- Leverages events for sync, ADSR for per-layer envelopes

**Avoids pitfalls:**
- #1 Retriggering (each layer can have independent ADSR)
- #4 Source reuse (each layer creates new source)
- #7 Memory leaks (disconnect all layers on stop)
- Voice pooling for performance

**Research flags:** Complex sync and lifecycle management. Consider phase-specific research for voice pooling strategies and polyphony management.

---

### Phase 6 (Optional): Audio Visualization

**Rationale:** Nice-to-have, not table stakes. Can be deferred to v2 if timeline is tight. Medium complexity with performance trade-offs.

**Delivers:**
- AudioVisualizer class with AnalyserNode integration
- Frequency and waveform data access
- requestAnimationFrame rendering loop
- Performance presets (performance/balanced/quality)

**Addresses features:**
- Visual waveforms (wavesurfer.js specialty from FEATURES.md)
- User engagement and debugging

**Uses stack:**
- Native AnalyserNode + requestAnimationFrame
- Uint8Array/Float32Array data

**Avoids pitfalls:**
- #6 FFT performance (use minimum FFT size, downsample data, throttle updates)
- #7 Memory leaks (reuse dataArray, stop animation loop on dispose)

**Research flags:** Performance tuning needed. Consider phase-specific research for optimal FFT sizes and rendering strategies.

---

### Phase Ordering Rationale

**Why this specific order:**

1. **Events first** — Foundation for all other features. No dependencies, enables everything else.
2. **ADSR second** — Natural controller extension, enables LayeredSound to have per-layer envelopes later.
3. **Audio sprites third** — Independent, high value for games, no dependencies on ADSR.
4. **Effects fourth** — Independent of LayeredSound, can test with existing Sound classes, LayeredSound can leverage later.
5. **LayeredSound last** — Most complex, benefits from stable Events/ADSR/Effects APIs.
6. **Visualization optional** — Can defer without blocking other features.

**Dependency graph:**
```
Phase 1: Events (foundation)
    ├─→ Phase 2: ADSR (depends on events)
    ├─→ Phase 3: Sprites (independent)
    ├─→ Phase 4: Effects (independent)
    └─→ Phase 5: LayeredSound (depends on all)

Phase 6: Visualization (depends only on events)
```

**How this avoids architecture conflicts:**
- Controller pattern established before ADSR extends it
- Event system in place before features need to emit events
- Connections array pattern validated with effects before LayeredSound uses it
- Simple features (sprites, effects) tested before complex composite (LayeredSound)

**Testing strategy:**
- Each phase can be tested independently with existing Sound/Oscillator classes
- Phase 5 integration tests validate all features working together
- Critical pitfalls are addressed in each phase's prevention strategies

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 2 (ADSR):** Fast retriggering edge cases, polyphonic note management strategies
- **Phase 4 (Effects):** Impulse response library sourcing, licensing, quality assessment
- **Phase 5 (LayeredSound):** Voice pooling strategies, polyphony management patterns
- **Phase 6 (Visualization):** FFT size optimization, rendering performance profiling

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Events):** EventTarget pattern is well-documented, no unknowns
- **Phase 3 (Sprites):** Standard JSON format, simple offset playback pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All features use native Web Audio API. Zero dependencies verified with MDN official docs. |
| Features | MEDIUM-HIGH | Feature expectations validated across multiple libraries (Tone.js, Howler.js, Pizzicato.js). Table stakes vs differentiators clear. |
| Architecture | HIGH | Patterns verified with Tone.js, audio-effects library, and Web Audio spec. Composition/extension patterns fit existing codebase. |
| Pitfalls | HIGH | Critical pitfalls verified with official MDN docs, Web Audio performance guide, and GitHub issue trackers. Prevention strategies documented. |

**Overall confidence:** HIGH

### Gaps to Address

**AudioParam event accumulation threshold:**
- Research identified the problem but optimal node swap threshold varies by platform
- Recommendation: Start with 1000 events, monitor in debug mode, adjust based on telemetry
- Address during Phase 2 implementation with performance profiling

**Impulse response quality and licensing:**
- Research found several IR libraries (OpenAIR, Reverb.js CDN, Valhalla) but quality/licensing needs verification
- Recommendation: Download and test sample IRs during Phase 4 planning
- Verify CC-BY/MIT licensing for redistribution

**LayeredSound voice pooling strategy:**
- Research shows Tone.js PolySynth uses voice pooling but implementation details not fully documented
- Recommendation: Prototype simple fixed-pool (8-16 voices) first, optimize based on real-world usage
- Address during Phase 5 with load testing

**Mobile performance boundaries:**
- FFT sizes, layer counts, and effect chain lengths have device-specific limits
- Recommendation: Test on representative devices (iPhone SE, mid-range Android) during each phase
- Document minimum supported devices in compatibility guide

**ADSR curve quality vs performance:**
- setTargetAtTime vs exponentialRampToValueAtTime trade-offs for decay/release
- Recommendation: Provide curve type options, document trade-offs, let users choose
- Address during Phase 2 with A/B audio quality testing

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- MDN Web Audio API — core API reference, best practices, performance guide
- MDN AudioParam — scheduling methods, automation timeline
- MDN AnalyserNode — visualization implementation
- MDN EventTarget — native event system patterns
- W3C Web Audio API 1.1 Specification — official spec verification

**Performance and Best Practices:**
- Web Audio Performance Notes (padenot.github.io) — event accumulation, memory management
- MDN Web Audio Best Practices — context management, mobile considerations

### Secondary (MEDIUM-HIGH confidence)

**Library Documentation:**
- Tone.js official docs — ADSR envelope patterns, PolySynth voice pooling
- Howler.js official docs — audio sprite format, event system
- Pizzicato.js official docs — effects-as-objects pattern
- Wavesurfer.js official docs — visualization patterns

**Architecture Patterns:**
- Tone.js GitHub repository — Envelope implementation, ToneAudioNode base class
- audio-effects GitHub (Sambego) — effect chaining patterns
- Reverb.js library — ConvolverNode usage patterns

**Domain Tutorials:**
- Building a Synthesizer with Web Audio API (dobrian.github.io) — ADSR envelope math
- Web Audio Timing Tutorial (catarak.github.io) — lookahead scheduling
- Understanding Web Audio Clock (sonoport.github.io) — timer desynchronization

### Tertiary (MEDIUM confidence)

**Community Resources:**
- Web Audio API GitHub Issues — ADSR retriggering issue #510, timing patterns
- fastidious-envelope-generator (rsimmons) — artifact-free envelope edge cases
- awesome-webaudio curated list — ecosystem overview
- TypeScript Deep Dive — typesafe event emitter patterns

**Performance Case Studies:**
- Phaser WebAudio memory leak issue #5224 — node disconnection patterns
- Chrome Audion extension — debugging strategies

**Implementation Examples:**
- web.dev audio effects patterns — effect routing examples
- Web Audio crossfade implementation (webaudioapi.com) — equal-power curves
- Digital Piano with Web Audio API (leafwindow.com) — ADSR implementation

---

**Research completed:** 2026-01-31
**Ready for roadmap:** Yes

**Bottom line recommendation:** Proceed with 5-phase roadmap (Events → ADSR → Sprites → Effects → LayeredSound). All features use native Web Audio API (zero dependencies). Defer visualization to v2 if timeline is tight. Critical pitfalls have well-documented prevention strategies. High confidence in technical feasibility and architectural fit.

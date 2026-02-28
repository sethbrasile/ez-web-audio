# Project Research Summary

**Project:** EZ Web Audio — Effects & Transport Milestone
**Domain:** Web Audio library — built-in effects, LFO, transport/clock, sequencer, PolySynth, GrainPlayer
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

This milestone closes the most significant feature gap between EZ Audio and Tone.js: the absence of built-in effects, a shared transport clock, polyphonic synthesis, and granular playback. Research confirms that every feature in scope can be built from native Web Audio API nodes and vanilla TypeScript scheduling loops — no new npm dependencies are required. The existing `Effect` interface, `BaseSound` connection chain, `BeatTrack` lookahead scheduler pattern (100ms lookahead / 25ms interval), and `Oscillator` class provide strong foundations that all new features extend or compose with rather than replace.

The recommended build order is: built-in effects first (high value, zero architectural risk, proven patterns), then LFO (unlocks modulation), then Transport (global clock coordination), then Sequencer (depends on Transport), then PolySynth (voice pool over existing Oscillator), then GrainPlayer (most complex, standalone). Effects and LFO can be developed in parallel. The Transport introduces the only architectural novelty: it must explicitly disable BeatTrack's internal scheduler when a BeatTrack locks to it — this is the single highest-risk integration point in the milestone.

The primary risks are all design-time decisions, not implementation unknowns. The LFO depth unit API must be settled before coding begins (post-hoc changes are breaking changes). The Sequencer must store events in beat units rather than absolute seconds or live BPM changes will be broken by design. The PolySynth must track release-end time per voice or voice stealing causes audible clicks. All three risks are fully preventable with explicit upfront design choices documented in the pitfalls research.

## Key Findings

### Recommended Stack

Every feature can be built from native Web Audio API nodes with no new npm dependencies. The existing build stack (TypeScript, Vite, Vitest, Playwright, VitePress) remains unchanged. Three new native browser capabilities are used: Web Worker created from a Blob URL for the Transport clock (prevents background tab throttling, same pattern Tone.js uses in production), native `OscillatorNode.connect(AudioParam)` for LFO modulation, and `AudioBufferSourceNode` lookahead scheduling for GrainPlayer grains.

**Core technologies:**
- Native Web Audio nodes (`DelayNode`, `ConvolverNode`, `WaveShaperNode`, `DynamicsCompressorNode`, `BiquadFilterNode`, `OscillatorNode`) — all effects and LFO; zero-dependency, built exactly for this purpose
- Web Worker (inline Blob URL) — Transport clock reliability; prevents 1Hz throttling in background tabs; same approach as Tone.js
- `AudioBufferSourceNode` scheduling — GrainPlayer grains; same lookahead pattern already proven in BeatTrack
- AudioWorklet — explicitly out of scope; `AudioBufferSourceNode` approach covers GrainPlayer's v1 use cases without HTTPS requirements or separate worker files

**What NOT to add:** Tone.js (200KB+, duplicates purpose), tuna.js (the existing `wrapEffect` already handles it), `ScriptProcessorNode` (deprecated), `requestAnimationFrame` for transport (throttled in background tabs).

### Expected Features

All features in this milestone are either table stakes (their absence makes the library feel incomplete) or strong differentiators (features no other simple Web Audio wrapper offers). Nothing in scope is speculative.

**Must have — P1 (table stakes):**
- Delay effect — most-requested single effect; every audio library has it; `DelayNode` + feedback `GainNode`
- Reverb effect — essential for music apps; accept IR URL; `ConvolverNode` with async factory
- Distortion effect — completes the classic "guitar pedal trio"; `WaveShaperNode` with computed curve
- Compressor + Limiter — thin wrappers over `DynamicsCompressorNode`; trivial to build, high value
- EQ (3-band) — essential for mixing; three chained `BiquadFilterNode`s (low-shelf, peaking, high-shelf)
- LFO — unlocks tremolo, vibrato, auto-filter, auto-pan; high leverage for a single class
- Transport / Clock — enables multi-BeatTrack sync; required before Sequencer
- PolySynth — playing chords without manual voice management; 8-voice pool, LRU steal

**Should have — P2 (differentiators, require P1 foundations):**
- Chorus effect — requires LFO; stereo delay modulated by LFO with 180-degree phase offset
- Sequencer / Pattern — requires Transport; generalizes BeatTrack to arbitrary event sequences
- Musical time notation (`"4n"`, `"1m"`, `"8t"`) — major DX win; requires Transport BPM reference
- GrainPlayer — independent pitch and position scrubbing; no other simple Web Audio wrapper has this

**Defer to v2+:**
- Swing / groove on Transport
- Phaser / Flanger (`wrapEffect` + Tuna.js covers this today)
- Per-effect modulation matrix
- AudioWorklet GrainPlayer (true independent time-stretch)

**Anti-features (do not build):**
- Bundled impulse responses — would multiply library bundle 3-10x; examples in docs only
- Signal-rate math nodes (`Add`, `Multiply`) — requires full API redesign; AudioParam scheduling covers 95% of use cases
- Full DAW transport / song arrangement — contradicts the library's "easy" core value

### Architecture Approach

All new components integrate with zero breaking changes to existing APIs. New effects implement the existing `Effect` interface (`input`, `output`, `bypass`, `mix`) and plug into `sound.addEffect()` unchanged. LFO is a standalone class that does not extend `BaseSound` — it connects to any `AudioParam` via native `connect()`. Transport and Sequencer are opt-in: BeatTrack gains a `syncTo(transport)` method that disables its internal scheduler, but `playActiveBeats(bpm, noteType)` continues to work unchanged. PolySynth wraps the existing `Oscillator` class with a shared output bus. GrainPlayer uses the same lookahead scheduler pattern as BeatTrack with increased lookahead (300ms) to accommodate grain scheduling jitter.

**Major components:**

1. `src/effects/` (7 new files) — `DelayEffect`, `ReverbEffect`, `DistortionEffect`, `ChorusEffect`, `CompressorEffect`, `LimiterEffect`, `EQEffect` — each implements `Effect` interface, follows wet/dry routing pattern from existing `FilterEffect`
2. `src/lfo.ts` — `LFO` class with `connect(AudioParam)`, `disconnect(AudioParam)`, `start()`, `stop()`, `dispose()`; standalone, not extending `BaseSound`
3. `src/transport.ts` — `Transport` singleton (via `getTransport()`) with Web Worker clock, BPM, time signature, `play/pause/stop`, subscriber registration; BeatTrack subscribes via `syncTo()`
4. `src/sequencer.ts` — `Sequencer` with `at(beat, callback)`, events stored in beat units (not absolute seconds), integrates with Transport
5. `src/poly-synth.ts` — `PolySynth` with fixed voice pool (default 8), LRU steal strategy, release-end tracking per voice, shared output bus `GainNode`
6. `src/grain-player.ts` — `GrainPlayer` with lookahead grain scheduling (300ms), shared output bus, position bounds, grain cleanup via `source.onended`

**Build order dependency graph:**
```
Level 1 (no new deps):     Effects, LFO           [can build in parallel]
Level 2 (needs LFO):       ChorusEffect
Level 3 (standalone):      Transport
Level 4 (needs Transport): Sequencer, BeatTrack.syncTo()
Level 5 (needs Oscillator): PolySynth
Level 6 (standalone):      GrainPlayer
```

**Modifications to existing files:** All additive.
- `src/beat-track.ts` — add `syncTo(transport)` method and `_transportLocked` flag
- `src/effects/index.ts` — add exports for new effect classes
- `src/index.ts` — add exports for all new factory functions

### Critical Pitfalls

1. **Transport fighting BeatTrack's internal scheduler** — When `syncTo(transport)` is called, the BeatTrack's own `setTimeout`-based scheduler must be stopped immediately via `clearTimeout(this.timerID)`. Without this, two schedulers compete and beats fire twice (audible as flamming / double-hit). Implement `lockToTransport()` that clears `timerID` and sets a `_transportLocked` flag; `playActiveBeats()` becomes a no-op when locked.

2. **LFO leak after Sound disposal** — An LFO connected to a Sound's gain/filter `AudioParam` keeps its `OscillatorNode` running indefinitely after the Sound is disposed. `BaseSound.dispose()` disconnects downstream nodes but does not disconnect things connected to its `AudioParam`s. Design LFO with a `dispose()` method and have `BaseSound` support `attachLFO(lfo)` so disposal is automatic.

3. **PolySynth voice stealing clicks** — Returning a voice to the pool when `isPlaying === false` is too early; the ADSR release tail is still rendering. Track `releaseEndTime` per voice and only steal voices where `audioContext.currentTime > releaseEndTime`. Hard-stop stolen voices with a 10ms fade to prevent click artifacts.

4. **Sequencer events parsed at wrong BPM** — If musical time strings are converted to absolute seconds at definition time, BPM changes during playback have no effect. Events must be stored in beat units and converted to seconds only at schedule time: `(beatOffset - now) * (60 / currentBpm)`.

5. **ConvolverNode IR buffer assignment causes audio thread dropout** — Setting `ConvolverNode.buffer` after the node is connected to the audio graph can trigger synchronous FFT re-partitioning on the audio thread. Always set the buffer before connecting to the graph. For runtime IR switching, crossfade between two `ConvolverNode`s over 50ms.

## Implications for Roadmap

Based on combined research, the dependency graph and pitfall mapping suggest six implementation phases.

### Phase 1: Built-in Effects

**Rationale:** Highest value-to-risk ratio in the milestone. All seven effects implement the existing `Effect` interface with zero changes to `BaseSound`. Chorus requires LFO and should either be deferred to after Phase 2 or implemented with an inline private oscillator. Reverb async loading is the only non-trivial concern in this phase.
**Delivers:** Complete built-in effects feature set; immediately usable with all existing sound types via `addEffect()`
**Addresses:** All P1 effect features (Delay, Reverb, Distortion, Compressor, Limiter, EQ)
**Avoids:** Effects breaking connection chain (Pitfall 5) — verify `input`/`output` nodes on each effect; Reverb IR dropout (Pitfall 6) — set buffer before connecting node to graph

### Phase 2: LFO

**Rationale:** Small (one file, ~60 lines), self-contained, zero dependencies on other new features. Must precede Chorus. LFO depth unit API design must be locked in this phase — it is a breaking-change risk if revisited later. Build LFO first, then Chorus can compose it cleanly.
**Delivers:** `LFO` class + `createLFO()` factory; tremolo, vibrato, auto-filter, auto-pan all become possible; Chorus can be completed
**Addresses:** LFO (P1) and enables Chorus (P2)
**Avoids:** LFO leak (Pitfall 3) — design `attachLFO()`/`dispose()` from the start; LFO depth ambiguity (Pitfall 9) — settle API surface (typed connect methods vs. raw units) before writing code

### Phase 3: Transport + BeatTrack Sync

**Rationale:** Architectural foundation for multi-track sync; required before Sequencer. The Web Worker Blob URL clock resolves background tab throttling. BeatTrack's `syncTo(transport)` integration is the highest-risk single change in the milestone — it modifies existing behavior while preserving backwards compatibility.
**Delivers:** Global BPM clock, `play/pause/stop`, bar:beat position tracking, multi-BeatTrack synchronization, background tab handling via visibility detection
**Addresses:** Transport (P1); enables Sequencer and musical time notation (P2)
**Avoids:** Dual scheduler conflict (Pitfall 1) — `lockToTransport()` disables BeatTrack internal scheduler; Resume catch-up burst (Pitfall 2) — reset `nextBeatTime` to `audioContext.currentTime` on resume; Tab backgrounding drift (Pitfall 10) — detect `visibilitychange`, re-sync on tab return

### Phase 4: Sequencer + Musical Time Notation

**Rationale:** Depends on Transport (Phase 3). Relatively small (~100 lines) but the design constraint — events in beat units, not absolute seconds — must be enforced upfront or live BPM changes will be fundamentally broken.
**Delivers:** `Sequencer` with arbitrary event callbacks at beat positions; musical time notation (`"4n"`, `"1m"`, `"8t"`) via a pure parser function
**Addresses:** Sequencer (P2), musical time notation (P2)
**Avoids:** Musical time BPM bug (Pitfall 7) — store beat offsets; convert to seconds only at schedule time inside the lookahead loop

### Phase 5: PolySynth

**Rationale:** Depends only on the existing `Oscillator` class (already shipped). Can be built in parallel with Transport/Sequencer phases but is placed here so Phase 1-2 learnings (effects integration, LFO connection lifecycle) can inform the PolySynth output bus design.
**Delivers:** `PolySynth` with LRU voice stealing, ADSR per voice, shared output bus for per-PolySynth effects
**Addresses:** PolySynth (P1 must-have)
**Avoids:** Voice leak / steal click (Pitfall 4) — track `releaseEndTime` per voice; apply 10ms hard-stop fade on steal

### Phase 6: GrainPlayer

**Rationale:** Most complex feature in the milestone; standalone with no dependencies on other new Phase 1-5 features. Placing it last prevents it from blocking the rest of the milestone. The lookahead scheduler pattern (refined in Transport and Sequencer phases) directly informs GrainPlayer's scheduler.
**Delivers:** `GrainPlayer` with configurable grain size, overlap, pitch, position, loop; documented grain density limits (< 20/sec mobile, < 50/sec desktop)
**Addresses:** GrainPlayer (P2)
**Avoids:** Main-thread overload (Pitfall 8) — limit grain density; use 300ms lookahead; grain cleanup via `source.onended` to prevent AudioNode accumulation

### Phase Ordering Rationale

- Effects come first because they deliver the most visible value at zero architectural risk — they extend an existing interface without touching any existing code
- LFO precedes Chorus because Chorus is LFO + delay internally; building LFO first avoids duplicating oscillator logic inside the chorus class
- Transport precedes Sequencer because a Sequencer without a shared clock is just another isolated timer — the same fragmentation problem that already exists across BeatTracks
- PolySynth is placed after effects and LFO so its output bus design benefits from observed patterns; it is technically independent and could be moved earlier
- GrainPlayer is last because it is the highest complexity, lowest dependency feature in the set — it can slip to a follow-up iteration without blocking anything else

### Research Flags

**Phases that can skip additional research (well-documented patterns):**
- **Phase 1 (Effects):** All Web Audio nodes are well-specified in MDN; effect patterns follow the existing `FilterEffect` directly; HIGH confidence across all seven effects
- **Phase 2 (LFO):** Native `OscillatorNode.connect(AudioParam)` is the canonical MDN pattern; no implementation ambiguity
- **Phase 5 (PolySynth):** Voice pool pattern is identical across Tone.js and p5.js; well-understood, HIGH confidence

**Phases that benefit from a short design spike or planning review before implementation:**
- **Phase 3 (Transport):** The `syncTo(transport)` BeatTrack integration should be prototyped before the full phase plan is written — the interaction between the existing scheduler and the new Transport lock is the highest-risk code change in the milestone
- **Phase 4 (Sequencer):** The exact API shape (`at(beat, callback)` vs. structured event objects `{ time, note, duration, velocity }`) requires a decision before implementation; this is an API surface that will be hard to change post-release
- **Phase 6 (GrainPlayer):** The pitch math (semitones to `playbackRate`), position bounds (loop / stop / wrap), and grain density limits need explicit test cases written before implementation begins; a pre-implementation design doc is worthwhile

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All features use stable, well-specified Web Audio API nodes; verified via MDN and Tone.js source analysis |
| Features | HIGH | P1/P2 split is clear; competitor analysis (Tone.js, Tuna.js, Pizzicato.js) confirms priorities; anti-features are well-reasoned |
| Architecture | HIGH | Integration points are explicit; no breaking changes to existing API; dependency graph is unambiguous |
| Pitfalls | HIGH | Pitfalls verified against MDN official docs, existing codebase source (`beat-track.ts`, `oscillator.ts`), and Tone.js issue tracker |

**Overall confidence:** HIGH

### Gaps to Address

- **GrainPlayer pitch/time decoupling accuracy:** The `AudioBufferSourceNode` approach gives pitch shift via `playbackRate` but cannot independently time-stretch (change speed without changing pitch). This limitation must be documented prominently. Decide in Phase 6 planning whether to frame the feature as "pitch shift + position scrubbing" rather than "time stretch" to set correct user expectations.
- **Reverb algorithmic vs. convolution default:** Research recommends convolution (IR file) as primary and algorithmic (synthesized decaying noise) as fallback. The factory API — `createReverb(url)` vs. `createReverb({ decay, preDelay })` — needs to be finalized before Phase 1 implementation begins. Validate that the synthesized IR quality is acceptable for documentation demos.
- **LFO depth normalization API:** This is a breaking-change risk. Before Phase 2 implementation, write the expected API and unit tests first (TDD). Options: raw units (depth in target param's native units, user sets appropriate scale) vs. typed connect methods (`createTremolo(sound, { depth })`, `createVibrato(sound, { depth })`). Either is valid; the choice must be locked before code is written.
- **CSP implications for Web Worker Blob URL:** The Transport clock uses `new Worker(URL.createObjectURL(blob))` which requires `worker-src 'self' blob:` in Content Security Policy. This is a known Tone.js limitation. Document it clearly in Phase 3 and provide a `setTimeout`-based fallback clock for CSP-restricted environments.

## Sources

### Primary (HIGH confidence)
- [MDN: DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) — compressor AudioParams and ranges
- [MDN: DelayNode](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode) — delay time param, feedback loop pattern
- [MDN: BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) — all filter types, EQ implementation
- [MDN: ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode) — IR reverb, buffer property
- [MDN: AudioNode.connect(AudioParam)](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect) — LFO modulation pattern
- [MDN: Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — pitfall prevention
- [web.dev: A Tale of Two Clocks](https://web.dev/articles/audio-scheduling) — lookahead scheduler pattern (Chris Wilson)
- Existing `src/beat-track.ts` — lookahead constants (scheduleAheadTime=0.1, interval=25ms), backgrounding comment
- Existing `src/effects/filter-effect.ts` — wet/dry routing pattern for all new effects to follow
- Existing `src/oscillator.ts` — single-use OscillatorNode pattern relevant to LFO design

### Secondary (MEDIUM-HIGH confidence)
- [Tone.js Ticker.ts source](https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/clock/Ticker.ts) — Web Worker Blob URL clock implementation
- [Tone.js Chorus docs](https://tonejs.github.io/docs/15.0.4/classes/Chorus.html) — stereo chorus pattern with LFO on delayTime
- [Tone.js PolySynth docs](https://tonejs.github.io/docs/15.1.22/classes/PolySynth.html) — voice allocation, LRU steal strategy
- [Tone.js Transport Wiki](https://github.com/Tonejs/Tone.js/wiki/Transport) — Transport design reference and known limitations
- [Tuna.js](https://github.com/Theodeus/tuna) — competitor effect implementations for comparison
- [Pizzicato.js](https://alemangui.github.io/pizzicato/) — competitor simplicity reference
- [Web Audio Performance Notes](https://padenot.github.io/web-audio-perf/) — performance constraints and limits

### Tertiary (MEDIUM confidence)
- [DEV: Granular Synthesis with Web Audio API](https://dev.to/hexshift/granular-synthesis-in-the-browser-using-web-audio-api-and-audiobuffer-slicing-2o9h) — `AudioBufferSourceNode` grain scheduling pattern
- [Building a Polyphonic Synth with Web Audio API](https://dev.to/hexshift/building-a-polyphonic-synth-with-web-audio-api-no-libraries-needed-4a07) — PolySynth pattern reference
- [Tone.js Sequence Re-schedule Bug #936](https://github.com/Tonejs/Tone.js/issues/936) — confirms sequencer event timing pitfall
- [Tone.js Transport: Multiple Timelines Issue #108](https://github.com/Tonejs/Tone.js/issues/108) — dual scheduler conflict confirmation

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*

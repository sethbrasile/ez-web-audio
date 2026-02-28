# Feature Research

**Domain:** Web Audio library — Effects & Transport milestone
**Researched:** 2026-02-28
**Confidence:** HIGH

## Context

This is a subsequent milestone for an existing library (EZ Audio). The question is not "what should this library do" but "how do these specific target features work, and which are table stakes vs differentiators vs anti-features for this scope?"

**Target features:** built-in effects (delay, reverb, distortion, chorus, compressor, limiter, EQ), LFO, transport/clock, sequencer/pattern, PolySynth, GrainPlayer.

**Existing foundation (already shipped):**
- `wrapEffect` / `createEffect` — wraps any native AudioNode into the Effect interface (bypass + mix)
- `createFilterEffect` — built-in BiquadFilter wrapper
- `createGainEffect` — built-in GainNode wrapper
- `Oscillator` with ADSR envelope (4 waveforms, filters, attack/decay/sustain/release)
- `BeatTrack` with per-track lookahead scheduler (100ms lookahead, 25ms interval)
- `Sampler` with round-robin playback
- `TypedEventEmitter` mixin on BaseSound
- `MusicallyAware` mixin (note name to frequency)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Delay effect** | Every audio library has it; most tutorials use it as a first example | LOW | `DelayNode` + `GainNode` for feedback. Key params: delayTime, feedback (0-1), wet/dry mix. |
| **Reverb effect** | Essential for any "music app" — first thing users try after loading a sound | MEDIUM | Two approaches: convolution (`ConvolverNode` + impulse response buffer) or algorithmic. Convolution is the standard and most expected. Must accept an IR URL asynchronously. |
| **Distortion effect** | Expected for guitar apps, synths, lo-fi aesthetics | LOW | `WaveShaperNode` with a computed curve. Key param: drive/amount. Different curve shapes produce soft/hard clip. |
| **Compressor** | Expected in anything mixing multiple sounds; standard mastering tool | LOW | Thin wrapper around native `DynamicsCompressorNode`. Params: threshold, knee, ratio, attack, release. |
| **Limiter** | Subset of compressor; expected as a separate preset | LOW | Compressor with `ratio: 20`, `attack: 0`, `release: 0.25` preset — user only adjusts threshold. |
| **EQ (3-band)** | Expected for tone shaping; bass/mid/treble covers 90% of use cases | LOW | Chain of `BiquadFilterNode`s: low-shelf + peaking + high-shelf. Params: low, mid, high in dB. |
| **LFO** | Standard modulation primitive — foundation for tremolo, vibrato, auto-filter, auto-pan | LOW-MEDIUM | OscillatorNode at 0.1-20 Hz, depth GainNode, `connect(param)` method. Critical: output must scale to target param range. |
| **PolySynth** | Playing chords without manually managing multiple oscillator instances | MEDIUM | Voice pool of N Oscillators. On noteOn, allocate LRU-free voice. On noteOff, trigger release. Needs max-voice limit. |
| **Transport / global clock** | Required for multi-track sync — once you have multiple BeatTracks, you need them on the same clock | MEDIUM | Shared BPM-synced central lookahead scheduler. BeatTracks register with it. Emits beat/tick events. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but meaningful.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Chorus effect** | Common in Tone.js/Tuna but requires LFO + delay internals — demonstrates full modulation coverage | MEDIUM | Stereo: two DelayNodes modulated by an LFO with 180-degree phase offset (L and R). Key params: rate, depth, delayTime, spread. Requires LFO internally. |
| **Musical time notation** | `"4n"`, `"8t"`, `"1m"` strings — drastically improves DX for rhythm programming | MEDIUM | Parser converting musical time strings to seconds given a BPM reference. Tone.js's most impactful DX feature. Transport and sequencer accept these natively. |
| **Sequencer / Pattern** | Generalization of BeatTrack into arbitrary event sequences — enables melody lines, chord progressions, arpeggiators | MEDIUM | Accepts an array of events: `{ time, note, duration, velocity }`. Plays back against the Transport clock. More flexible than BeatTrack's binary active/inactive model. |
| **GrainPlayer** | Independent pitch and time control — no other simple Web Audio wrapper has this at all | HIGH | AudioBuffer sliced into short overlapping segments (grains). Key params: grainSize, overlap, playbackRate (time stretch), detune (pitch shift independent of rate). Each grain = new AudioBufferSourceNode with envelope to prevent clicks. |
| **LFO connected to effect parameters** | LFO connectable to delay time, filter frequency, distortion amount — enables auto-wah, wobble bass, tremolo on any source | LOW (if LFO built correctly) | Works naturally if LFO wraps a native OscillatorNode and exposes `connect(audioParam)`. This is table stakes LFO behavior, but its application to effect parameters is what makes it a differentiator. |
| **Swing / groove on Transport** | Adds human feel to programmatic patterns — missing from most simple sequencers | MEDIUM | Even-numbered beats delayed by a swing factor (0 to 0.5 of a beat interval). Implemented at Transport scheduler level. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Phaser / Flanger effects** | Users coming from Tuna.js expect these | Phaser requires a chain of all-pass filters; flanger requires a very short LFO-modulated delay. Significant complexity for niche use. The `wrapEffect` escape hatch already handles Tuna.js effects. | Document `wrapEffect` + Tuna.js pattern explicitly in examples. |
| **Bundled impulse responses** | Reverb needs an IR; users want zero-setup reverb | Any IR file adds bundle size. A short IR is 50-200 KB. Library is 30 KB gzipped — bundling IRs would multiply size 3-10x. | `createReverb(url)` accepts an IR URL. Ship example IRs in docs only, not in the library bundle. |
| **Custom waveshape LFO beyond standard types** | "More expressive LFO shapes" | Users can call `oscillator.setPeriodicWave()` via `wrapEffect` for custom shapes. Adding this to LFO adds complexity for edge cases. | LFO supports the 4 standard OscillatorType waveforms (sine, square, triangle, sawtooth). Covers 99% of use cases. |
| **AudioWorklet for GrainPlayer** | "More accurate grain scheduling" | AudioWorklets require a separate worker file with a different module system. Breaks zero-dependency, single-file tree-shakeable build. Testing with Vitest + happy-dom is extremely complex. | Implement GrainPlayer in main thread using lookahead scheduling + AudioBufferSourceNodes. Grain sizes >= 50ms work fine without AudioWorklet. |
| **Full DAW transport with song arrangement** | "I want clip launching and pattern chains" | This is Tone.js territory. EZ Audio's value is "easy" — a full arrangement system contradicts core value. | Transport provides BPM, start/stop/pause, position. Pattern chaining is user responsibility. |
| **Signal-rate parameter math nodes** | Tone.js has `Add`, `Multiply`, `Scale` for modular synthesis | Tone.js's `Signal` architecture is pervasive — you cannot bolt it on. It requires redesigning every parameter type. | AudioParam scheduling (setValueAtTime, ramps) covers automation, LFO covers continuous modulation. This covers 95% of use cases. |
| **Recording / bounce to file** | "I want to record my creation" | Requires MediaRecorder API integration, orthogonal to playback. Already listed in PROJECT.md out-of-scope. | Document how to use MediaRecorder with the library's AudioContext for DIY recording. |

---

## Feature Dependencies

```
[Transport / Clock]
    ├──required by──> [Sequencer / Pattern]  (sequences schedule against a shared clock)
    ├──enables──> [multi-BeatTrack sync]      (BeatTrack.sync(transport) upgrade)
    └──enables──> [musical time notation]     (time strings need a BPM reference)

[LFO]
    ├──required by──> [Chorus effect]         (chorus IS delay + LFO internally)
    └──enables──> [auto-filter, tremolo, vibrato, auto-pan]  (LFO.connect(audioParam))

[Oscillator (existing ADSR)]
    ├──required by──> [PolySynth]             (PolySynth manages a pool of Oscillators)
    └──LFO internals also use OscillatorNode  (same native node, different application)

[wrapEffect / Effect interface (existing)]
    └──extended by──> [Delay, Reverb, Distortion, Chorus, Compressor, Limiter, EQ]
       (all new effects implement the same Effect interface: input, output, bypass, mix)

[Delay effect]
    └──informs──> [Chorus]  (Chorus uses DelayNode internally; build patterns are similar)

[GrainPlayer]
    ├──no hard deps  (self-contained; uses AudioBufferSourceNode scheduling)
    └──enhanced by──> [LFO]  (LFO can connect to GrainPlayer's detune or playbackRate)
```

### Dependency Notes

- **Transport required by Sequencer:** Without a Transport, each sequence needs its own clock — the same fragmentation problem BeatTrack has today (per-track timing, no global sync). Transport must exist before Sequencer.
- **LFO required by Chorus:** A chorus effect IS an LFO modulating a DelayNode. Implementing chorus before LFO would mean writing a private, non-reusable LFO inside the chorus class. Build LFO first; chorus composes it.
- **PolySynth requires existing Oscillator + ADSR:** PolySynth is purely a voice manager for Oscillator instances. The existing ADSR envelope on Oscillator is what gives polyphonic notes their shape. No new synthesis primitives needed.
- **Built-in effects extend existing Effect interface:** All new effects (`DelayEffect`, `ReverbEffect`, `DistortionEffect`, etc.) must implement the existing `Effect` interface (`input`, `output`, `bypass`, `mix`). This is zero-cost compatibility with `addEffect()` on all existing sound types.

---

## MVP Definition

### Launch With (this milestone — P1)

Minimum set to close the significant feature gap vs Tone.js and enable real music applications.

- [ ] **Delay effect** — Most-requested single effect; immediate "wow" factor in demos
- [ ] **Reverb effect** — Second-most-requested; essential for music apps; accept IR URL
- [ ] **Distortion effect** — Rounds out the classic "guitar pedal trio" (delay, reverb, distortion)
- [ ] **Compressor + Limiter** — Thin wrappers around `DynamicsCompressorNode`; trivial to build
- [ ] **EQ (3-band)** — Essential for mixing; low effort high value
- [ ] **LFO** — Unlocks tremolo, vibrato, auto-filter; high leverage for a single class
- [ ] **Transport / Clock** — Enables multi-BeatTrack sync; required for Sequencer
- [ ] **PolySynth** — Playing chords without manual voice management

### Add After Core (same milestone — P2)

Build after P1 foundations are stable.

- [ ] **Chorus effect** — Requires LFO (which is P1); satisfying demo potential
- [ ] **Sequencer / Pattern** — Requires Transport (which is P1); generalizes BeatTrack
- [ ] **Musical time notation** — Requires Transport BPM reference; major DX win
- [ ] **GrainPlayer** — Independent of other new features; high complexity, high payoff

### Future Consideration (v2+)

- [ ] **Swing / groove on Transport** — Transport enhancement; nice DX but not MVP for this milestone
- [ ] **Phaser / Flanger** — Low demand; `wrapEffect` + Tuna.js covers this today
- [ ] **Offline rendering / bounce** — Orthogonal concern; separate feature area
- [ ] **Per-effect modulation matrix** — Route any LFO to any parameter by name; elegant but complex

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Delay effect | HIGH | LOW | P1 |
| Reverb effect | HIGH | MEDIUM | P1 |
| Distortion effect | HIGH | LOW | P1 |
| Compressor | HIGH | LOW | P1 |
| Limiter | MEDIUM | LOW (shares compressor code) | P1 |
| EQ (3-band) | HIGH | LOW | P1 |
| LFO | HIGH | LOW-MEDIUM | P1 |
| Transport / Clock | HIGH | MEDIUM | P1 |
| PolySynth | HIGH | MEDIUM | P1 |
| Chorus effect | MEDIUM | MEDIUM (needs LFO first) | P2 |
| Sequencer / Pattern | MEDIUM | MEDIUM (needs Transport) | P2 |
| Musical time notation | HIGH | MEDIUM | P2 |
| GrainPlayer | MEDIUM | HIGH | P2 |
| Swing / groove | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have; build after P1 foundations are stable
- P3: Nice to have; future milestone

---

## How Each Feature Works (Implementation Reference)

### Delay Effect
Wraps `DelayNode` + a feedback `GainNode`. Signal path: input feeds both the output mix and the DelayNode; DelayNode output feeds back into itself via feedbackGain, and also feeds the output mix. Parameters: `delayTime` (0-2s), `feedback` (0-0.95), `wet/dry mix`. Critical pitfall: feedback at or above 1.0 causes exponential volume growth and a browser audio crash. Clamp feedback to 0.95 maximum.

### Reverb Effect
Two valid implementation strategies:

1. **Convolution reverb** (`ConvolverNode` + impulse response AudioBuffer) — realistic sounding, requires loading an IR file. Factory: `createReverb(irUrl)` fetches and decodes the IR asynchronously before returning. This is the standard expected by users.
2. **Algorithmic reverb** (Schroeder network of comb + all-pass filters) — no file needed, less realistic. Used by JCReverb, Pizzicato.js. Useful as a zero-config fallback.

Recommendation: Convolution reverb as primary (`createReverb(irUrl)`), algorithmic reverb as secondary (`createJCReverb()` or similar). Parameters: `wet/dry mix`, `preDelay` (ms).

Note: Tone.js Reverb uses convolution but requires calling `.generate()` asynchronously after construction. EZ Audio should absorb this into the factory function so the returned object is ready to use.

### Distortion Effect
Wraps `WaveShaperNode` with a computed curve. The curve maps input amplitude to output amplitude, creating harmonic saturation. Parameters: `amount` (0-1, maps to curve hardness), `oversample` ('none'|'2x'|'4x' to reduce aliasing). Standard soft-clip curve: `y = (3 + k) * x / (Math.PI + k * Math.abs(x))` where `k = amount * 400`.

### Compressor
Thin wrapper around native `DynamicsCompressorNode` with sensible defaults. Params: `threshold` (-100 to 0 dB, default -24), `knee` (0-40 dB, default 30), `ratio` (1-20, default 12), `attack` (0-1s, default 0.003), `release` (0-1s, default 0.25). The native node has reduction (readonly) for metering.

### Limiter
Compressor with a locked-down preset: `ratio: 20`, `attack: 0`, `knee: 0`. User only adjusts `threshold`. This is the standard limiter definition. Implement as a `createLimiter(threshold)` factory that returns a configured `DynamicsCompressorNode` wrapped in the Effect interface.

### EQ (3-band)
Three `BiquadFilterNode`s in series: low-shelf filter centered around 80 Hz, peaking filter centered around 1 kHz, high-shelf filter centered around 10 kHz. Parameters: `low`, `mid`, `high` (gain in dB, -12 to +12). All three nodes are wired in sequence; the chain's input and output become the Effect interface's `input` and `output` nodes. Straightforward implementation.

### LFO
An `OscillatorNode` running at 0.1-20 Hz + a `GainNode` for depth scaling. The OscillatorNode outputs -1 to +1; the depth GainNode scales this to the desired modulation range. `lfo.connect(audioParam)` connects the depth GainNode output to the target AudioParam. The LFO does not route to the audio output — it routes to parameter inputs only.

Key design: `depth` is specified in the target parameter's native unit. For frequency modulation, depth in Hz. For gain modulation, depth as a ratio multiplier. Users are responsible for setting an appropriate depth for each target param.

```typescript
// Expected API sketch
const lfo = createLFO({ rate: 5, depth: 50, type: 'sine' })
lfo.start()
lfo.connect(oscillator.frequency)  // vibrato: oscillator freq +/- 50 Hz at 5 Hz
lfo.connect(gainNode.gain)         // tremolo: gain +/- 0.5 at 5 Hz (set depth: 0.5)
lfo.disconnect()
lfo.stop()
```

### Chorus Effect
Stereo effect: two `DelayNode`s (one per channel, L and R) each modulated by an LFO with a 180-degree phase offset between channels. Key params: `rate` (LFO speed in Hz), `depth` (modulation depth in ms), `delayTime` (center delay, 5-30ms), `spread` (stereo phase offset in degrees). Requires LFO internally — implement after LFO is stable.

### Transport / Clock
A class (usable as singleton via `getTransport()` or as explicit instance via `createTransport()`) running a central lookahead scheduler. Maintains: `bpm` (beats per minute), `position` (bar:beat:tick as string), `state` ('started' | 'stopped' | 'paused'). Uses the same 100ms lookahead / 25ms interval pattern already proven in BeatTrack's internal scheduler, but at global scope. BeatTracks and Sequences register with the Transport by calling `beatTrack.sync(transport)` — non-breaking addition to existing BeatTrack API. Emits `'tick'`, `'beat'`, `'bar'` events using AudioContext-timed callbacks.

### Sequencer / Pattern
Generalizes BeatTrack's binary active/inactive model into arbitrary event sequences. Accepts an array of note events: `{ time: '0:0:0', note: 'C4', duration: '4n', velocity: 0.8 }`. Plays back against the Transport clock. Each event fires a user callback or plays a sound/oscillator automatically. Analogous to Tone.js `Part`. Enables melody lines, chord progressions, arpeggios, anything beyond the drum machine pattern.

### PolySynth
A voice pool manager wrapping N `Oscillator` instances (default 8 voices). Voice allocation strategy: LRU (least-recently-used) — when all voices are busy, steal the oldest-playing voice. Interface mirrors `Oscillator` for consistency: `noteOn(note, velocity)`, `noteOff(note)`, `noteOffAll()`. The shared oscillator options (waveform, envelope) are configured at construction and applied to all voices.

```typescript
// Expected API sketch
const poly = createPolySynth({
  voices: 8,
  type: 'sine',
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 }
})
poly.noteOn('C4', 0.8)
poly.noteOn('E4', 0.8)
poly.noteOn('G4', 0.8)   // C major chord — three voices active
poly.noteOff('C4')       // triggers release envelope on C4 voice
```

### GrainPlayer
Slices an `AudioBuffer` into short overlapping segments (grains) and plays them with configurable overlap crossfading. Each grain = new `AudioBufferSourceNode` with a short attack/release envelope to prevent clicks at grain boundaries. Parameters: `grainSize` (0.05-0.5s), `overlap` (0-0.5s crossfade between grains), `playbackRate` (time stretch: 1 = normal, 0.5 = half speed, 2 = double speed), `detune` (pitch shift in cents, independent of playbackRate), `loopStart`, `loopEnd`, `reverse`. The grain scheduling loop runs in a `setTimeout` lookahead — no AudioWorklet needed for grain sizes at or above 50ms. The key distinction vs plain AudioBufferSourceNode: pitch and playback speed are decoupled (change speed without changing pitch, or change pitch without changing speed).

---

## Competitor Feature Analysis

| Feature | Tone.js | Tuna.js | Pizzicato.js | EZ Audio approach |
|---------|---------|---------|--------------|-------------------|
| Delay | `FeedbackDelay` | `Delay` | `Delay` | `createDelay()` wrapping DelayNode + feedback GainNode |
| Reverb | `Reverb` (convolution, async generate) | `Convolver` | `Reverb` (convolution) | `createReverb(irUrl)` async factory; IR baked in at creation |
| Distortion | `Distortion` | `WaveShaper` | `Distortion` | `createDistortion()` with WaveShaperNode curve |
| Compressor | `Compressor`, `Limiter`, `Gate` | `Compressor` | `Compressor` | `createCompressor()`, `createLimiter()` |
| EQ | `EQ3` (3-band) | `Equalizer` | none | `createEQ()` 3-band with shelf + peaking filters |
| LFO | `LFO` class | Internal only | none | `createLFO()` with `connect(audioParam)` |
| Chorus | `Chorus` (stereo, LFO-based) | `Chorus` | `Stereochorusmflanger` | `createChorus()` built on top of LFO |
| Transport | `Transport` (singleton, BPM, time sigs, swing) | none | none | `createTransport()` or singleton `getTransport()` |
| Sequencer | `Sequence`, `Part`, `Pattern` | none | none | `createSequencer()` / `createPattern()` |
| PolySynth | `PolySynth` (voice allocation, LRU) | none | none | `createPolySynth()` — same LRU voice strategy |
| GrainPlayer | `GrainPlayer` (full-featured, wraps player) | none | none | `createGrainPlayer()` — pure Web Audio, no AudioWorklet |

**EZ Audio distinguishing approach vs Tone.js:**
- No `Signal` architecture (simpler implementation, less power for modular synthesis)
- BeatTrack active/inactive pattern (Tone.js has no direct equivalent)
- AudioSprite (Tone.js has no equivalent)
- `wrapEffect` for third-party effects (Tone.js requires its own Effect base class)
- Factory functions absorb async initialization (Tone.js Reverb requires separate `.generate()` call)
- Zero dependencies maintained (Tone.js pulls in several packages)

---

## Sources

- [Tone.js documentation — GrainPlayer](https://tonejs.github.io/docs/15.0.4/classes/GrainPlayer.html)
- [Tone.js documentation — Reverb](https://tonejs.github.io/docs/14.9.17/classes/Reverb.html)
- [Tone.js documentation — Chorus](https://tonejs.github.io/docs/15.0.4/classes/Chorus.html)
- [MDN — Advanced techniques: Creating and sequencing audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- [MDN — AudioNode.connect() to AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect)
- [Tuna.js — audio effects library for Web Audio API](https://github.com/Theodeus/tuna)
- [Sambego/audio-effects — effects library patterns](https://github.com/Sambego/audio-effects)
- [granular-js — granular synthesis using Web Audio API](https://github.com/philippfromme/granular-js)
- [Pizzicato.js — simplifies Web Audio effects](https://alemangui.github.io/pizzicato/)
- [mmckegg/lfo — LFO for automating Web Audio API AudioParams](https://github.com/mmckegg/lfo)
- [Chris Wilson — A Tale of Two Clocks (lookahead scheduling)](https://web.dev/articles/audio-scheduling)
- [Dobrian — LFOs in Web Audio](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/2.lfos.html)
- [Audio Developer Conference 2025 — Overview of Granular Synthesis](https://conference.audio.dev/session/2025/overview-of-granular-synthesis/)
- [Building a Polyphonic Synth with Web Audio API](https://dev.to/hexshift/building-a-polyphonic-synth-with-web-audio-api-no-libraries-needed-4a07)

---
*Feature research for: EZ Audio — Effects & Transport milestone*
*Researched: 2026-02-28*

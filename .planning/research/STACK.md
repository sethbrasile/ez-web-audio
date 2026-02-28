# Stack Research

**Domain:** Web Audio library — built-in effects, LFO, transport/clock, sequencer, polyphony, granular synthesis
**Researched:** 2026-02-28
**Confidence:** HIGH

## Context: What Is NOT Being Researched

The existing stack (TypeScript, Vite, Vitest, Playwright, VitePress, happy-dom, standardized-audio-context-mock) is proven and unchanged. This document covers only what is needed for the **Effects & Transport milestone**: what native Web Audio nodes handle each feature, what needs custom code, and what (if anything) to import.

---

## Recommended Stack

### Core Technologies (New Additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Web Audio API — native nodes | Current (W3C 1.1) | All effects, LFO, compressor, EQ | Zero-dependency; these nodes were built for exactly this purpose |
| Web Worker (inline Blob URL) | Native browser | Transport clock reliability | Prevents timer throttling in background tabs; same pattern Tone.js uses in production |
| AudioWorklet | Baseline (since April 2021) | GrainPlayer only | Only place where native nodes cannot express the logic; all other features avoid it |

### No New npm Dependencies

Every feature in this milestone can be built from:
1. Native Web Audio nodes (effects, LFO, compressor, limiter, EQ, chorus, delay, reverb, PolySynth)
2. Vanilla TypeScript scheduling loops (transport, sequencer, granular)
3. A single inline Web Worker created from a Blob URL (transport clock)

Do not add Tone.js, tuna.js, or any other audio library as a dependency. The effects adapter pattern (`wrapEffect`) already lets users bring those if they want them.

---

## Feature-by-Feature Implementation Stack

### 1. Built-in Effects

#### Delay — Native DelayNode + GainNode feedback loop

**Confidence:** HIGH — Verified via MDN

```
signal → DelayNode → GainNode(feedback) ↰
       ↓
     output
```

- `DelayNode.delayTime` — a-rate AudioParam, max value set at construction (pass `maxDelayTime` to `createDelay(maxSeconds)`)
- Feedback gain must stay < 1.0 or signal diverges
- For stereo ping-pong: two `DelayNode`s + `ChannelSplitterNode` + `ChannelMergerNode`
- Integration: implement as a class following the existing `Effect` interface (has `input`, `output`, `bypass`, `mix`)

**What it takes:** ~60 lines. No external code needed.

#### Reverb — ConvolverNode (convolution) with synthesized IR fallback

**Confidence:** HIGH for convolution approach; MEDIUM for algorithmic

Two approaches:

| Approach | Quality | File dependency | Realtime param control | Recommendation |
|----------|---------|-----------------|----------------------|----------------|
| `ConvolverNode` + IR file | Professional | Yes (WAV/MP3, 1–5 MB) | No (re-buffer to change) | Primary for quality reverb |
| Algorithmic (delay network) | Decent | None | Yes | Fallback / "instant" reverb |

For the IR approach: `ConvolverNode.buffer` is set to a decoded `AudioBuffer` from a WAV file. The library should ship a `createReverb(url)` factory that fetches and decodes the IR, and also a `createReverb({ decay, preDelay })` overload that synthesizes a simple IR programmatically (no file needed, lower quality).

Synthesizing a simple IR: fill an `AudioBuffer` with exponentially-decaying noise. This gives usable spring/room reverb without requiring a file.

```typescript
// Synthesize IR: exponentially-decaying white noise
function createSyntheticIR(ctx: AudioContext, decay = 2, preDelay = 0): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * decay
  const buf = ctx.createBuffer(2, length, sampleRate)
  const preDelaySamples = Math.floor(preDelay * sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = preDelaySamples; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - preDelaySamples) / length, decay)
    }
  }
  return buf
}
```

**What it takes:** ~80 lines. No external code needed.

#### Distortion — WaveShaperNode

**Confidence:** HIGH — Verified via MDN

`WaveShaperNode.curve` accepts a `Float32Array` waveshaping function. Standard distortion curve:

```typescript
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 256
  const curve = new Float32Array(samples)
  const k = amount
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
  }
  return curve
}
```

- `oversample` property: `'none'` | `'2x'` | `'4x'` — use `'4x'` to reduce aliasing at high drive
- Integration: wrap in `Effect` interface; expose `drive` param that regenerates the curve

**What it takes:** ~40 lines.

#### Compressor — DynamicsCompressorNode

**Confidence:** HIGH — Verified via MDN

Native node with five `AudioParam`s:

| Param | Default | Typical Range | Notes |
|-------|---------|---------------|-------|
| `threshold` | -24 dB | -60 to 0 | Level above which compression kicks in |
| `knee` | 30 dB | 0 to 40 | Soft knee width |
| `ratio` | 12 | 1 to 20 | Input:output ratio above threshold |
| `attack` | 0.003 s | 0 to 1 | How fast compressor engages |
| `release` | 0.25 s | 0 to 1 | How fast compressor releases |

Read-only `reduction` property shows current gain reduction in dB — useful for a gain-reduction meter in the UI.

**What it takes:** ~30 lines (thinnest wrapper in the milestone).

#### Limiter — DynamicsCompressorNode with extreme settings

**Confidence:** HIGH

A limiter is a compressor with ratio ≥ 20:1. Recommended preset:

```typescript
// Limiter = compressor with hard settings
compressor.threshold.value = -3   // dB
compressor.knee.value = 0         // Hard knee
compressor.ratio.value = 20       // 20:1 = effectively infinite
compressor.attack.value = 0.001   // Very fast
compressor.release.value = 0.1    // Fast
```

**What it takes:** A `createLimiter()` factory that calls `createCompressor()` with these defaults. Literally a preset, not a new node type.

#### Chorus — Two DelayNodes + LFO modulating delayTime

**Confidence:** HIGH — Verified via Tone.js source analysis and MDN

Pattern from Tone.js (production-proven): stereo chorus uses two `DelayNode`s (left and right channels), each with an `OscillatorNode` LFO modulating its `delayTime`. The delay times oscillate between 2–20ms at low frequency (0.5–4 Hz).

```
signal → ChannelSplitter → DelayL (delayTime ← LFO-L) → ChannelMerger → output
                        ↘ DelayR (delayTime ← LFO-R) ↗
```

Key parameter ranges (from Tone.js):
- `delayTime`: 2–20ms nominal; depth makes it modulate ±delayTime around nominal
- `frequency`: LFO rate in Hz (0.5–4 Hz typical)
- `feedback`: Routes output back to input for flanger effect

**What it takes:** ~80 lines. LFO can reuse the `LFO` class being built separately.

#### EQ (3-band) — Three chained BiquadFilterNodes

**Confidence:** HIGH — Verified via MDN

Three `BiquadFilterNode`s chained in series:

| Band | Filter Type | Default Frequency | Parameter |
|------|-------------|-------------------|-----------|
| Bass | `lowshelf` | 200 Hz | `gain` (±dB) |
| Mid | `peaking` | 1000 Hz | `gain` (±dB), `Q` |
| Treble | `highshelf` | 3000 Hz | `gain` (±dB) |

All parameters are `AudioParam`s (a-rate), so they can be automated or connected to an LFO. A parametric EQ simply exposes `frequency` and `Q` on the peaking band as well.

**What it takes:** ~50 lines.

---

### 2. LFO (Low-Frequency Oscillator)

**Confidence:** HIGH — Verified via MDN `AudioNode.connect(AudioParam)` documentation

Native `OscillatorNode` can connect directly to `AudioParam`. This is the canonical Web Audio pattern for modulation:

```typescript
const lfo = audioContext.createOscillator()
const lfoGain = audioContext.createGain()

lfo.frequency.value = 2        // 2 Hz rate
lfoGain.gain.value = 50        // ±50 Hz modulation depth
lfo.connect(lfoGain)
lfo.start()

// Connect to any AudioParam
lfoGain.connect(oscillator.frequency)   // vibrato
lfoGain.connect(gainNode.gain)          // tremolo
lfoGain.connect(filter.frequency)       // auto-filter
```

The `LFO` class needs to manage:
- `rate` — LFO frequency (Hz)
- `depth` — amplitude of LFO output (scales effect)
- `type` — waveform: `'sine'` | `'triangle'` | `'square'` | `'sawtooth'`
- `connect(param: AudioParam)` — hook to any param
- `disconnect()` — unhook
- `start()` / `stop()`

**Integration with existing architecture:** LFO output connects to `AudioParam` directly via native API. No existing code needs to change — LFO is a standalone utility.

**What it takes:** ~60 lines. The only design decision is the API for specifying target and depth.

---

### 3. Transport / Clock

**Confidence:** HIGH for the Web Worker clock approach — verified via Tone.js Ticker.ts source and Chris Wilson's "A Tale of Two Clocks" (web.dev)

#### Why Transport Needs a Web Worker Clock

`setTimeout`/`setInterval` on the main thread can be throttled to 1Hz in background tabs (Chrome/Safari). An audio transport running in a background tab will drift catastrophically. The solution (used by Tone.js in production) is to run the clock tick inside a Web Worker, which is not throttled.

#### Pattern: Blob-URL Web Worker + Lookahead Scheduler

```typescript
// Clock worker created as inline Blob (no separate file needed)
const workerCode = `
  let interval;
  self.onmessage = (e) => {
    if (e.data === 'start') {
      interval = setInterval(() => self.postMessage('tick'), ${UPDATE_INTERVAL_MS})
    } else if (e.data === 'stop') {
      clearInterval(interval)
    }
  }
`
const blob = new Blob([workerCode], { type: 'text/javascript' })
const worker = new Worker(URL.createObjectURL(blob))
```

The worker sends a `'tick'` message every `UPDATE_INTERVAL_MS` (e.g. 25ms). The main thread receives the tick and schedules any audio events in the next lookahead window (e.g. 100ms ahead) using `audioContext.currentTime`. This two-clock approach separates:

- **JavaScript timer** (imprecise, for scheduling checks)
- **Web Audio clock** (`audioContext.currentTime`, sample-accurate, for actual event timing)

#### CSP Consideration

Blob URLs require `worker-src 'self' blob:` in Content Security Policy. This is a known Tone.js limitation. Document it clearly; most users won't be affected. The fallback is a `setTimeout`-based clock for environments where Blob workers are blocked.

#### Transport State Machine

```
stopped → playing → paused → playing
       ↖_________|
```

The Transport manages:
- `bpm` — beats per minute (default 120)
- `timeSignature` — beats per bar (default 4)
- `currentBeat` — which beat within the bar
- `currentBar` — bar count
- `position` — readable position in `bar:beat:subdivision` notation

#### Musical Time to Seconds

```typescript
function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60
}

// Support Tone.js-style notation (optional convenience)
// "4n" = quarter note, "8n" = eighth, "1m" = 1 measure
function parseMusicalTime(notation: string, bpm: number, timeSignature = 4): number {
  // "4n" → 1 beat; "8n" → 0.5 beat; "1m" → timeSignature beats
}
```

Musical time notation (`"4n"`, `"8n"`, `"1m"`) is a nice-to-have convenience layer on top of the seconds-based scheduler. It requires a parser but no external library.

**What it takes:** ~200 lines (the largest single piece in this milestone). Splits into:
1. `Ticker` class (Web Worker clock + setTimeout fallback)
2. `Transport` class (BPM, position tracking, event scheduling)

---

### 4. Sequencer / Pattern

**Confidence:** HIGH — Conceptually straightforward extension of existing BeatTrack

The `Sequencer` generalizes `BeatTrack` from "array of on/off beats" to "array of arbitrary events with callbacks":

```typescript
interface SequencerEvent {
  time: number        // Position in beats
  callback: (time: number) => void  // Called with precise audio time
}

class Sequencer {
  events: SequencerEvent[]
  loop: boolean
  loopLength: number  // In beats
}
```

Key differences from `BeatTrack`:
- `BeatTrack` is tied to `Sound` playback; `Sequencer` takes arbitrary callbacks
- `Sequencer` integrates with `Transport` for shared BPM
- Events can be at any beat position (not just subdivisions)

**Integration:** `BeatTrack` can optionally lock to a `Transport` instance for BPM sync, keeping backwards compatibility for standalone use.

**What it takes:** ~100 lines.

---

### 5. PolySynth (Polyphonic Oscillator Wrapper)

**Confidence:** HIGH — Well-understood voice allocation problem

A `PolySynth` maintains a pool of `Oscillator` instances and allocates them for chord/polyphonic playback:

```typescript
class PolySynth {
  private voices: Oscillator[]    // Pool of oscillators
  private activeVoices: Map<string, Oscillator>  // note → voice

  playNote(note: string, velocity?: number): void
  stopNote(note: string): void
  stopAll(): void
}
```

Voice allocation strategies (in priority order):
1. **Steal oldest** — when all voices busy, retrigger the longest-running voice
2. **Steal quietest** — steal voice in release phase if available
3. **Expand** — create new voice if under `maxVoices` limit

The `Oscillator` class already handles ADSR and has `play()`/`stop()`. `PolySynth` just manages which voice gets which note.

**What it takes:** ~80 lines. Complexity is in the voice-stealing logic, not in the audio graph.

---

### 6. GrainPlayer (Granular Synthesis)

**Confidence:** MEDIUM-HIGH — AudioBufferSourceNode scheduling works; AudioWorklet adds pitch independence

#### Approach: AudioBufferSourceNode Scheduling (No AudioWorklet)

Granular synthesis without AudioWorklet is achievable and the pattern is proven. Each "grain" is a short `AudioBufferSourceNode` with:
- A start offset into the source buffer (position in source)
- A `playbackRate` for pitch control
- An envelope (ramp up/down to avoid clicks)

Grains are scheduled via `audioContext.currentTime` lookahead, same as the transport scheduler.

```typescript
function scheduleGrain(ctx: AudioContext, buffer: AudioBuffer, params: GrainParams): void {
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = params.pitch  // Pitch without affecting position
  source.start(params.when, params.offset, params.duration)

  // Envelope to avoid clicks
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, params.when)
  env.gain.linearRampToValueAtTime(1, params.when + params.attack)
  env.gain.setValueAtTime(1, params.when + params.duration - params.release)
  env.gain.linearRampToValueAtTime(0, params.when + params.duration)
}
```

**Key parameters:**

| Parameter | Description | Typical Range |
|-----------|-------------|---------------|
| `position` | Playhead in source buffer (0–1) | 0–1 |
| `pitch` | playbackRate multiplier | 0.25–4 |
| `grainSize` | Duration of each grain | 0.02–0.2s |
| `overlap` | Grain overlap (density) | 0–grainSize |
| `spread` | Random position scatter | 0–0.5s |
| `detune` | Random pitch scatter | 0–100 cents |

**Limitation of no-AudioWorklet approach:** When stretching time without changing pitch, `playbackRate` affects both simultaneously. True independent time-stretching requires AudioWorklet (or a WASM lib). For v1, the `position` + `pitch` approach gives pitch shifting and position scrubbing, which covers most use cases (Tone.js `GrainPlayer` uses this same approach).

#### When to Use AudioWorklet (Future v2)

AudioWorklet enables sample-accurate grain scheduling on the audio thread (zero jitter) and true time-stretching algorithms. Document this as a future upgrade path rather than blocking v1.

**What it takes:** ~150 lines (scheduler loop + grain factory + parameter management).

---

## Integration Points with Existing Codebase

### Effects integrate via the existing `Effect` interface

All new built-in effects (`DelayEffect`, `ReverbEffect`, `DistortionEffect`, `ChorusEffect`, `CompressorEffect`, `LimiterEffect`, `EQ3Effect`) must implement the existing `Effect` interface:

```typescript
interface Effect {
  input: AudioNode
  output: AudioNode
  bypass: boolean
  mix: number
}
```

This means they can be added via the existing `sound.addEffect(effect)` API with zero changes to `BaseSound`. Factory functions follow the context-free pattern already established:

```typescript
// Context-free (uses shared AudioContext)
const delay = createDelay({ time: 0.3, feedback: 0.4 })
sound.addEffect(delay)
```

### LFO integrates via AudioParam connection

No changes to existing classes. LFO connects directly to any `AudioParam` on any existing node. The user gets the `AudioParam` reference via existing controller accessors and passes it to `lfo.connect(param)`.

### Transport integrates via BeatTrack

`BeatTrack` gets an optional `transport?: Transport` constructor option. When set, the BeatTrack locks to the transport BPM/clock instead of its own internal timer. When not set, existing behavior is unchanged — full backwards compatibility.

### PolySynth wraps the existing Oscillator

`PolySynth` creates instances of the existing `Oscillator` class. No changes to `Oscillator` required.

---

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|--------------------|
| Tone.js as dependency | 200KB+, duplicates ez-audio's purpose | Build native; use as reference only |
| tuna.js as dependency | Adds dependency; `wrapEffect` already handles it | Keep `wrapEffect` as the integration point for tuna |
| ScriptProcessorNode | Deprecated in all browsers | Use AudioWorklet (GrainPlayer) or native nodes (everything else) |
| AudioWorklet for effects | Requires HTTPS, separate file, more complexity | Native nodes handle delay/reverb/distortion/compressor cleanly |
| `requestAnimationFrame` for transport | Throttled when tab is hidden | Use Web Worker clock |
| Infinite voice pools in PolySynth | Memory unbounded | Fixed pool with voice stealing |
| Full time-stretch GrainPlayer | Requires AudioWorklet, significant complexity | `playbackRate`-based pitch shift covers most v1 use cases |

---

## Alternatives Considered

| Feature | Recommended | Alternative | Why Not Alternative |
|---------|-------------|-------------|---------------------|
| Reverb | ConvolverNode + synthetic IR | Freeverb via AudioWorklet | AudioWorklet complexity for marginal quality gain |
| Transport clock | Web Worker (Blob URL) | `setInterval` on main thread | Throttled to 1Hz in background tabs |
| Transport clock | Web Worker (Blob URL) | `AudioWorkletProcessor` tick | Overkill; adds HTTPS requirement for simple tick |
| Chorus | DelayNode + LFO | ScriptProcessorNode | Deprecated; native approach is better |
| GrainPlayer | `AudioBufferSourceNode` scheduling | AudioWorklet grain engine | AudioWorklet = HTTPS required, separate file, much more complex |
| PolySynth voices | Reuse `Oscillator` class | New voice class | `Oscillator` already handles ADSR, gain, play/stop |
| EQ | 3× `BiquadFilterNode` | Single `BiquadFilterNode` | Single node = only 1 band; 3 separate nodes = bass/mid/treble independently |

---

## Version Compatibility

| Feature | Browser Support | Notes |
|---------|-----------------|-------|
| All native effect nodes | All modern browsers (Chrome 36+, Firefox 53+, Safari 14.1+, Edge 79+) | Web Audio API 1.1 — stable |
| AudioWorklet | Baseline since April 2021 | Chrome 66+, Firefox 76+, Safari 14.1+, Edge 79+; HTTPS required |
| Web Worker (Blob URL) | All modern browsers | CSP `worker-src blob:` may need explicit allowlist |
| `OscillatorNode.connect(AudioParam)` | All modern browsers | Core Web Audio feature |

---

## Installation

```bash
# No new dependencies needed.
# All features use native Web Audio API + TypeScript.
pnpm install   # existing dependencies only
```

---

## Sources

- [MDN: DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) — compressor AudioParams and ranges; HIGH confidence
- [MDN: DelayNode](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode) — delay time param, feedback loop pattern; HIGH confidence
- [MDN: BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) — all 8 filter types, EQ implementation; HIGH confidence
- [MDN: ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode) — IR reverb, buffer property; HIGH confidence
- [MDN: AudioNode.connect(AudioParam)](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect) — LFO modulation pattern; HIGH confidence
- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) — browser support, HTTPS requirement; HIGH confidence
- [web.dev: A Tale of Two Clocks](https://web.dev/articles/audio-scheduling) — lookahead scheduler pattern; HIGH confidence
- [Tone.js Ticker.ts source](https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/clock/Ticker.ts) — Web Worker Blob URL clock implementation; HIGH confidence
- [Tone.js Chorus docs](https://tonejs.github.io/docs/15.0.4/classes/Chorus.html) — stereo chorus pattern with LFO on delayTime; MEDIUM-HIGH confidence
- [DEV: Granular Synthesis with Web Audio API](https://dev.to/hexshift/granular-synthesis-in-the-browser-using-web-audio-api-and-audiobuffer-slicing-2o9h) — AudioBufferSourceNode grain scheduling pattern; MEDIUM confidence

---
*Stack research for: ez-audio Effects & Transport milestone*
*Researched: 2026-02-28*

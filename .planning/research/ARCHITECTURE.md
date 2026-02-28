# Architecture Patterns: Effects & Transport Milestone

**Project:** EZ Web Audio
**Researched:** 2026-02-28
**Confidence:** HIGH (Web Audio API is stable; patterns verified against MDN and existing codebase)

---

## Current Architecture Baseline

Before documenting new components, a precise picture of what exists is essential for identifying integration points.

### Class Hierarchy

```
BaseSound (abstract, extends TypedEventEmitter)
├── implements: Playable, Connectable
├── owns: GainNode, StereoPannerNode, effectChainInput (GainNode)
├── owns: Controller (abstract, set by subclass)
├── owns: Effect[] (persistent effect chain)
├── owns: Analyzer | null (visualization, inserted after pannerNode)
├── audio chain: audioSourceNode → [oscillator filters] → effectChainInput
│              → [effects] → gainNode → pannerNode → [analyzer] → destination
├── abstract: audioSourceNode, setup(), wireConnections(), duration, durationRaw
└── concrete: play/stop/pause variants, addEffect/removeEffect, onPlaySet/onPlayRamp, fadeIn/fadeOut

Sound extends BaseSound
Track extends Sound           (adds position tracking, pause/resume, seek)
Oscillator extends BaseSound  (adds OscillatorNode, ADSR envelope, BiquadFilter chain)
SampledNote extends MusicallyAware(Sound)

Sampler                       (round-robin Sound pool, NOT extending BaseSound)
BeatTrack extends Sampler     (adds Beat[], lookahead scheduler, tempo, events)
```

### Controller Architecture

```
BaseParamController
├── owns: AudioSource (OscillatorNode | AudioBufferSourceNode), GainNode, StereoPannerNode
├── queues: startingValues[], valuesAtTime[], exponentialValues[], linearValues[]
├── api: update(type).to(value).as(unit)
│        onPlaySet(type).to(value).at(time) or .endingAt(time, rampType)
│        onPlayRamp(type, rampType).from(start).to(end).in(duration)
└── clearScheduledValues() — called after each play()

SoundController extends BaseParamController   (gain, pan, detune)
OscillatorController extends BaseParamController  (gain, pan, detune, frequency)
    └── also owns: triggerRelease(time), setEnvelope(envelope)
```

### Effects System

```
Effect interface: { input: AudioNode, output: AudioNode, bypass: boolean, mix: number }

FilterEffect implements Effect    (BiquadFilterNode + wet/dry routing)
GainEffect implements Effect      (GainNode + wet/dry routing)
EffectWrapper implements Effect   (wraps external effects like Tuna.js)

Factory functions: createFilterEffect(type, opts), createGainEffect(gain), wrapEffect(effect)
```

### BeatTrack Scheduling

```
BeatTrack.playActiveBeats(bpm, noteType):
  - Sets up lookahead scheduler (scheduleAheadTime=100ms, interval=25ms)
  - Each tick: while (nextBeatTime < audioCtx.currentTime + 0.1) scheduleBeat(index, time)
  - Uses audioContextAwareTimeout for beat events
  - Per-track BPM: no global clock, each BeatTrack has its own tempo
```

### ControlTypeMap (Extensibility Hook)

```typescript
// Users can augment this for custom parameter types
interface ControlTypeMap {
  frequency: 'frequency'
  gain: 'gain'
  detune: 'detune'
  pan: 'pan'
}
```

---

## Feature Integration Analysis

### Feature 1: Built-in Effects (Delay, Reverb, Distortion, Chorus, Compressor, Limiter, EQ)

**Web Audio nodes available:**
- `DelayNode` — feedforward delay
- `ConvolverNode` — convolution reverb (requires impulse response buffer)
- `WaveShaperNode` — waveshaper distortion
- `DynamicsCompressorNode` — compressor and limiter (threshold controls limiter mode)
- `BiquadFilterNode` — EQ bands (already used in FilterEffect)

**Integration point:** The `Effect` interface already defines the contract. Built-in effects are new classes implementing it, identical in structure to `FilterEffect`.

**New components needed:**

```
src/effects/
├── delay-effect.ts       (DelayNode + GainNode feedback loop + wet/dry)
├── reverb-effect.ts      (ConvolverNode + IR buffer generation/loading + wet/dry)
├── distortion-effect.ts  (WaveShaperNode + curve generation + wet/dry)
├── chorus-effect.ts      (DelayNode + LFO modulation + wet/dry)
├── compressor-effect.ts  (DynamicsCompressorNode + wet/dry)
├── eq-effect.ts          (3-band or parametric BiquadFilterNode chain)
└── index.ts              (re-export all)
```

**Existing components modified:**
- `src/effects/index.ts` — add exports for new effect classes and factory functions
- `src/index.ts` — export new factory functions (`createDelayEffect`, `createReverbEffect`, etc.)

**Pattern to follow (from FilterEffect):**
```typescript
class DelayEffect implements Effect {
  private delayNode: DelayNode
  private feedbackNode: GainNode
  private inputNode: GainNode
  private outputNode: GainNode
  private dryGain: GainNode
  private wetGain: GainNode
  // Routing: input → delayNode → feedbackNode → delayNode (loop)
  //          input → dryGain → output
  //          delayNode → wetGain → output
}
```

**Reverb special case — two implementation approaches:**
1. Algorithmic (no external file): Compute impulse response buffer in code using white noise + exponential decay. Self-contained, no network request required.
2. ConvolverNode with IR file: Load an impulse response audio file. Better quality, requires async loading.
Recommendation: algorithmic for the built-in `ReverbEffect`, expose the `ConvolverNode` via `createEffect()` escape hatch for users who want real IRs.

**Chorus requires LFO:** This creates a build dependency. Chorus can either be implemented standalone (inline LFO oscillator, not the public LFO class) or after the LFO is built. Standalone is cleaner for this phase since chorus is a black box.

**Confidence:** HIGH — all required Web Audio nodes are well-specified and stable.

---

### Feature 2: LFO (Low-Frequency Oscillator)

**Web Audio pattern:** An `OscillatorNode` with low frequency (< 20Hz) connected directly to an `AudioParam` instead of to an audio output. The oscillator's output amplitude becomes a modulation signal. A `GainNode` scales the modulation depth.

```
OscillatorNode (LFO, e.g. 5Hz sine)
    ↓ connect(depthGain.gain)  ← NO, this is wrong
depthGain (GainNode, depth e.g. 0.3)
    ↓ connect(targetParam)     ← target AudioParam (e.g. filterNode.frequency)
```

Correct pattern:
```
OscillatorNode (LFO)
    ↓ connect(depthGain)
depthGain (GainNode, depth=0.3)
    ↓ connect(targetParam)   ← AudioParam.connect(), not AudioNode.connect()
```

**What the LFO class needs to do:**
- Own an `OscillatorNode` (the carrier) and a `GainNode` (depth scaler)
- Expose `connect(target: AudioParam)` to modulate any parameter
- Expose `disconnect(target: AudioParam)` to stop modulation
- Expose `rate` (frequency), `depth` (modulation amount), `type` (waveform)
- Allow connecting to multiple params simultaneously (fan-out)
- Start/stop the internal oscillator

**New components needed:**

```
src/lfo.ts          (LFO class + createLFO factory)
```

**LFO class design:**
```typescript
export class LFO {
  private oscNode: OscillatorNode
  private depthNode: GainNode
  private _running = false

  constructor(audioContext: AudioContext, options?: LFOOptions) { ... }

  get rate(): number          // Hz
  set rate(hz: number)
  get depth(): number         // modulation amount (0–1 typical)
  set depth(value: number)
  get type(): OscillatorType

  connect(target: AudioParam): this
  disconnect(target?: AudioParam): this
  start(): this
  stop(): this
  dispose(): void
}

export interface LFOOptions {
  rate?: number       // Hz, default 1
  depth?: number      // modulation depth, default 0.5
  type?: OscillatorType  // default 'sine'
}
```

**Integration with existing effects:** After LFO exists, chorus and auto-filter/vibrato/tremolo can be built by connecting the LFO to the relevant parameters. The `LFO` is a standalone utility — it does NOT extend `BaseSound` because it does not produce audible signal and has no gain/pan chain.

**Important constraint:** The LFO's `OscillatorNode` is single-use (Web Audio spec). Like `Oscillator.setup()`, the LFO must create a new `OscillatorNode` on each `start()` call.

**Existing components modified:**
- `src/index.ts` — export `LFO`, `createLFO`, `LFOOptions`

**Confidence:** HIGH — pattern is directly from Web Audio spec and MDN.

---

### Feature 3: Transport / Clock

**The problem:** Each `BeatTrack` has its own internal `currentTempo` and its own lookahead scheduler. Two `BeatTrack`s cannot stay perfectly synchronized over time because their schedulers fire independently via `window.setTimeout`, which has variable jitter. A shared clock fixes this.

**Architecture decision:** A global Transport singleton that multiple playable entities subscribe to. This is additive — existing `BeatTrack.playActiveBeats(bpm, noteType)` continues to work unchanged. The Transport is opt-in.

**What the Transport needs:**
- A single lookahead scheduler loop (shared `window.setTimeout`)
- A reference BPM and musical time position (bar, beat, tick)
- Subscriber registration: entities register callbacks that fire at musical time positions
- `play()`, `pause()`, `stop()`, `setBPM(bpm)`, `setTimeSignature(num, denom)` controls
- Emit `tick` events for UI synchronization (current beat position)

**Transport architecture:**

```
Transport (singleton, not a class instance you construct repeatedly)
├── owns: audioContext reference (from getOrCreateAudioContext())
├── owns: lookahead scheduler (same 100ms/25ms pattern as BeatTrack)
├── owns: Set<SubscribedCallback> (registered entities)
├── state: bpm, timeSignature, position (bar, beat, subdivision)
├── methods: play(), pause(), stop(), setBPM(n), setTimeSignature(n, d)
├── methods: subscribe(callback), unsubscribe(callback)
├── emits: 'tick' (beat position), 'start', 'stop', 'bpm-change'
└── resolution: 16th notes minimum (common for drum machines)
```

**BeatTrack modification for Transport support:** BeatTrack needs a `syncTo(transport: Transport)` method that:
1. Stops its own scheduler loop
2. Subscribes to Transport tick events
3. Uses the Transport's absolute time for each beat

This is additive — no breaking changes to existing `playActiveBeats()` API.

**Musical time notation (optional, can be Phase 2):** Parsing `"4n"` (quarter note), `"8t"` (triplet eighth), `"2m"` (2 measures) requires a time parser. Implementation: a pure function `parseMusicalTime(notation: string, bpm: number, timeSignature: [number, number]): number` returning seconds. This does NOT need to be in the first Transport phase.

**New components needed:**
```
src/transport.ts    (Transport class + getTransport() singleton accessor)
```

**Existing components modified:**
- `src/beat-track.ts` — add `syncTo(transport)` method
- `src/index.ts` — export `Transport`, `getTransport`

**Why singleton:** Having multiple transports defeats the purpose. The library already uses a singleton `AudioContext` pattern — Transport follows the same pattern (`getTransport()` returns the global instance, creates it if needed).

**Confidence:** HIGH — lookahead scheduler pattern is proven (already in BeatTrack). The new work is coordination, not new timing primitives.

---

### Feature 4: Sequencer / Pattern

**The problem:** `BeatTrack` handles rhythmic on/off patterns. A Sequencer generalizes this to arbitrary event callbacks at musical time positions — note sequences, parameter automation, trigger sequences.

**Architecture:** The Sequencer is a higher-level abstraction that uses the Transport clock. It's essentially a `Map<position, callback[]>` where positions are measured in beats or subdivisions.

**New components needed:**
```
src/sequencer.ts    (Sequencer class + createSequencer factory)
```

**Sequencer class design:**
```typescript
export class Sequencer {
  // Add an event at a musical position
  at(beat: number, callback: (time: number) => void): this
  // Remove event at a position
  remove(beat: number, callback?: (time: number) => void): this
  // Clear all events
  clear(): this
  // Loop length in beats
  length: number
  // Connect to transport
  syncTo(transport: Transport): this
}
```

**Relationship to BeatTrack:** BeatTrack remains the ergonomic drum machine API. Sequencer is the lower-level "arbitrary callbacks at beat positions" primitive. Advanced users build on Sequencer; most users use BeatTrack.

**Existing components modified:**
- `src/index.ts` — export `Sequencer`, `createSequencer`

**Confidence:** MEDIUM — architecture is clear, but the precise API surface needs iteration during implementation.

---

### Feature 5: PolySynth

**The problem:** Playing chords requires managing multiple `Oscillator` instances manually. Users must track which voices are active, handle note stealing when voices run out, and coordinate envelope timing.

**Architecture:** Voice pool pattern. `PolySynth` maintains a pool of `Oscillator` instances (voices). `noteOn(note, velocity)` allocates the next free voice. `noteOff(note)` finds the voice playing that note and triggers its release. Stolen voices (oldest playing voice) are reused when the pool is exhausted.

**Voice allocation strategy:** Least-recently-played (LRU) stealing. When all voices are active and a new noteOn arrives, steal the voice that has been playing longest. This matches hardware synthesizer behavior.

**New components needed:**
```
src/poly-synth.ts   (PolySynth class + createPolySynth factory)
```

**PolySynth class design:**
```typescript
export class PolySynth {
  private voices: Oscillator[]
  private activeVoices: Map<string, Oscillator>  // noteKey → Oscillator

  noteOn(note: string | number, velocity?: number): void
  noteOff(note: string | number): void
  releaseAll(): void

  // Pass-through effect chain on the poly output bus
  addEffect(effect: Effect): this
  removeEffect(effect: Effect): this
  changeGainTo(value: number): this

  dispose(): void
}

export interface PolySynthOptions {
  voices?: number          // default 8
  oscillator?: OscillatorOptions   // applied to each voice
}
```

**Output bus architecture:** All voices route into a shared `GainNode` (the output bus). The output bus connects to the effect chain and destination. This allows per-PolySynth effects without routing each voice independently.

```
Voice 1 (Oscillator) ──┐
Voice 2 (Oscillator) ──┤
Voice 3 (Oscillator) ──┼──→ outputBusGainNode → [effects] → pannerNode → destination
...                    │
Voice N (Oscillator) ──┘
```

**Existing components used:**
- `Oscillator` — each voice is a standard `Oscillator` instance
- `BaseParamController` pattern — PolySynth output bus can use a `SoundController`

**Existing components modified:**
- `src/index.ts` — export `PolySynth`, `createPolySynth`, `PolySynthOptions`

**Confidence:** HIGH — voice pool pattern is well-established (Tone.js PolySynth, p5.js PolySynth follow the same pattern).

---

### Feature 6: GrainPlayer

**The problem:** Granular synthesis decomposes audio into short grains (10–200ms), then plays them with independent control over pitch and time stretch. It enables timestretch without pitch change and pitch shift without timestretch.

**Two implementation approaches:**

**Approach A: AudioBufferSourceNode grains (no AudioWorklet)**
- Spawn many `AudioBufferSourceNode` instances at overlapping intervals
- Each grain: offset into source buffer, duration, playback rate (pitch control), gain envelope
- Grain scheduling: loop with lookahead, same pattern as BeatTrack scheduler
- Advantages: no AudioWorklet needed, simpler, works in all modern browsers
- Disadvantages: higher CPU for many concurrent grains, grain scheduling in JS thread

**Approach B: AudioWorklet-based**
- Custom AudioWorklet processor handles grain interpolation sample-accurately
- Advantages: better timing precision, fewer JS thread hits
- Disadvantages: requires bundling worklet code, more complex infrastructure, testing difficulty
- The project constraint "No AudioWorklets — too low-level for 'easy' API" applies here

**Recommendation:** Approach A. The project explicitly lists AudioWorklets as out of scope. `AudioBufferSourceNode` grain scheduling is proven (used by granular-js and similar libraries), and the lookahead scheduler pattern already exists in BeatTrack.

**New components needed:**
```
src/grain-player.ts   (GrainPlayer class + createGrainPlayer factory)
```

**GrainPlayer class design:**
```typescript
export class GrainPlayer {
  private buffer: AudioBuffer
  private scheduler: GrainScheduler  // internal lookahead scheduler

  // Playback controls
  play(): void
  stop(): void

  // Grain parameters
  grainSize: number        // grain duration in seconds (default 0.1)
  overlap: number          // fraction of grain that overlaps next (0–1, default 0.5)
  speed: number            // playback speed (1 = normal, 0.5 = half speed)
  pitch: number            // pitch in semitones (0 = no change)
  loopStart: number        // loop region start in seconds
  loopEnd: number          // loop region end in seconds
  loop: boolean

  // Output routing
  addEffect(effect: Effect): this
  changeGainTo(value: number): this
  setDestination(node: AudioNode): this
  dispose(): void
}
```

**Internal grain scheduling:**
```
Every ~25ms (lookahead):
  while (nextGrainTime < audioCtx.currentTime + lookaheadBuffer):
    create AudioBufferSourceNode
    set offset = playbackPosition + random scatter
    set playbackRate = speed * pitchRatio
    apply grain envelope (ramp up, sustain, ramp down)
    schedule .start(nextGrainTime, offset, grainSize)
    schedule .stop(nextGrainTime + grainSize + overlap)
    nextGrainTime += grainSize * (1 - overlap)
    playbackPosition += grainSize * speed
```

**Output bus:** Like PolySynth, all grains route to a shared `GainNode` output bus. Effects and destination are set on the GrainPlayer, not individual grains.

**Existing components modified:**
- `src/index.ts` — export `GrainPlayer`, `createGrainPlayer`, `GrainPlayerOptions`

**Confidence:** MEDIUM — approach is proven but pitch/time stretch accuracy requires tuning during implementation. The scheduling pattern is the same as BeatTrack (HIGH confidence), but grain envelope and pitch math need careful implementation.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `BaseSound` | Audio node lifecycle, effect chain, parameter control | `Controller`, `Effect[]`, `Analyzer`, `AudioContext` |
| `Controller` | Parameter automation scheduling | `AudioParam`, `GainNode`, `StereoPannerNode` |
| `Effect` interface | Wet/dry audio routing contract | `BaseSound` (via effectChainInput) |
| `FilterEffect`, `GainEffect` | Existing concrete effects | None (standalone) |
| `DelayEffect`, `ReverbEffect`, `DistortionEffect` | New concrete effects | None (standalone) |
| `CompressorEffect`, `EQEffect` | Dynamics/EQ | None (standalone) |
| `LFO` | AudioParam modulation signal | `AudioParam` targets on any node |
| `Transport` | Global BPM clock, subscriber coordination | `BeatTrack`, `Sequencer`, `AudioContext` |
| `BeatTrack` | Drum machine lane | `Transport` (optional, via syncTo), `Beat[]` |
| `Sequencer` | Arbitrary event scheduling at beat positions | `Transport` |
| `PolySynth` | Voice pool management | `Oscillator[]`, output `GainNode` |
| `GrainPlayer` | Granular audio playback | `AudioBuffer`, `AudioBufferSourceNode[]` (spawned), output `GainNode` |

---

## Data Flow

### LFO Modulation Flow

```
LFO.oscNode (OscillatorNode, e.g. 4Hz)
    │
    ▼
LFO.depthNode (GainNode, depth = 100)
    │
    ▼ connect(targetParam)
FilterEffect.filterNode.frequency (AudioParam)
    │ (frequency now oscillates between center±100 at 4Hz)
    ▼
Audio signal through filter
```

### Transport-Synchronized BeatTrack Flow

```
Transport.scheduler() ──tick──► BeatTrack.onTransportTick(beatIndex, absoluteTime)
                                     │
                                     ▼
                             beat.playInIfActive(offset)
                                     │
                                     ▼
                             Sound.playAt(absoluteTime)
```

### PolySynth Voice Allocation Flow

```
PolySynth.noteOn('A4')
    │
    ├──► Find free voice from pool
    │    (or steal oldest playing voice if pool exhausted)
    │
    ├──► voice.freq = frequencyMap['A4']
    ├──► voice.play()
    └──► activeVoices.set('A4', voice)

PolySynth.noteOff('A4')
    │
    ├──► voice = activeVoices.get('A4')
    ├──► voice.stop()   (triggers ADSR release if envelope set)
    └──► activeVoices.delete('A4')
```

---

## Patterns to Follow

### Pattern 1: Factory Function with Optional AudioContext

All new public-facing classes follow the existing context-free factory pattern.

```typescript
// User-facing (context-free, recommended)
const delay = createDelayEffect({ time: 0.5, feedback: 0.4 })
const lfo = createLFO({ rate: 5, depth: 0.3 })

// Implementation
export function createDelayEffect(options?: DelayEffectOptions): DelayEffect {
  return new DelayEffect(getOrCreateAudioContext(), options)
}
```

### Pattern 2: Effect Interface Compliance

Every new effect class must expose exactly `{ input, output, bypass, mix }`. Use the same wet/dry routing pattern as `FilterEffect` (dryGain + wetGain + `applyEqualPowerCrossfade()`).

```typescript
class DelayEffect implements Effect {
  get input(): AudioNode { return this.inputNode }
  get output(): AudioNode { return this.outputNode }
  get bypass(): boolean { return this._bypass }
  set bypass(v: boolean) { this._bypass = v; this.applyMix() }
  get mix(): number { return this._mix }
  set mix(v: number) { this._mix = Math.max(0, Math.min(1, v)); this.applyMix() }

  private applyMix(): void {
    applyEqualPowerCrossfade(this.dryGain, this.wetGain, this._mix, this._bypass)
  }
}
```

### Pattern 3: Dispose Pattern

All new stateful classes must implement `dispose()`:
- Stop any running scheduler/oscillator
- Disconnect all AudioNodes
- Clear any subscriptions (Transport, LFO targets)
- Set a `_disposed` flag to prevent post-dispose operations

### Pattern 4: Lookahead Scheduler

For Transport and GrainPlayer, replicate the BeatTrack scheduler pattern exactly:

```typescript
private scheduler(): void {
  const currentTime = this.audioContext.currentTime
  while (this.nextEventTime < currentTime + this.scheduleAheadTime) {
    this.scheduleNext(this.nextEventTime)
    this.advance()
  }
  this.timerID = window.setTimeout(() => this.scheduler(), this.schedulerInterval)
}
```

Constants: `scheduleAheadTime = 0.1` (100ms), `schedulerInterval = 25` (25ms). These are validated by existing BeatTrack production use.

### Pattern 5: TypedEventEmitter for New Classes

Classes that emit events should use `TypedEventEmitter` from `src/events/typed-event-emitter.ts` (the pattern BaseSound uses). For classes that can't extend it (like BeatTrack which extends Sampler), use a private `EventTarget` with the same `on/off/once` convenience API.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: AudioWorklet for GrainPlayer

**What:** Implementing GrainPlayer with AudioWorklet for sample-accurate grain scheduling.
**Why bad:** AudioWorklets require bundling worklet files separately, complicate the build, and are explicitly out of scope per project constraints. The `AudioBufferSourceNode` approach is sufficient for the target use case (DJ-style timestretching, ambient textures, sound design).
**Instead:** `AudioBufferSourceNode` grains with lookahead scheduling.

### Anti-Pattern 2: Mutable Transport as a Parameter

**What:** Passing `Transport` as a constructor argument everywhere or making `BeatTrack` require a `Transport`.
**Why bad:** Breaks existing `BeatTrack.playActiveBeats(bpm, noteType)` API. Creates a mandatory dependency that wasn't needed before.
**Instead:** Transport is opt-in via `beatTrack.syncTo(transport)`. All existing APIs remain unchanged.

### Anti-Pattern 3: LFO Extending BaseSound

**What:** Making `LFO` extend `BaseSound` to get gain/pan/effects infrastructure.
**Why bad:** LFO does not produce audible output. It modulates AudioParams. Inheriting the full `BaseSound` infrastructure adds 400 lines of irrelevant code and creates confusing `.play()` / `.stop()` semantics.
**Instead:** `LFO` is a standalone class with only `start()`, `stop()`, `connect(param)`, `disconnect(param)` methods.

### Anti-Pattern 4: Building Chorus Before LFO

**What:** Implementing ChorusEffect that internally instantiates its own LFO OscillatorNode before the public LFO class is built.
**Why bad:** Duplicates LFO logic across two files, then needs refactoring when LFO is added.
**Instead:** If Chorus is needed before LFO, implement it with an inline oscillator marked as `@internal`. Once LFO exists, factor it out if needed. Or simply build LFO first (it's a one-file component).

### Anti-Pattern 5: Infinite Voice Pool in PolySynth

**What:** Creating a new `Oscillator` on every `noteOn()` and letting the pool grow unbounded.
**Why bad:** Each `Oscillator` creates several AudioNodes. 100 rapid note-ons = hundreds of live AudioNodes consuming memory and CPU.
**Instead:** Fixed pool of voices (default 8, configurable). Steal oldest when pool exhausted.

---

## Scalability Considerations

| Concern | Notes |
|---------|-------|
| GrainPlayer grain count | At 0.1s grain, 50% overlap, 48kHz sample rate: ~20 concurrent `AudioBufferSourceNode` instances at any time. Well within browser limits. |
| PolySynth voice count | 8 voices default. Each voice is a persistent Oscillator with 3–5 AudioNodes. ~40 live nodes total. Negligible. |
| Transport subscribers | Transport supports many subscribers (BeatTrack instances, Sequencers). Each subscriber is just a function call per scheduler tick. Scales to hundreds. |
| LFO connection fan-out | One LFO can connect to multiple AudioParams. Web Audio allows multiple connections from one node. No library-side limit needed. |
| Effect chain depth | Each effect adds ~3–5 AudioNodes. 10 effects = ~50 nodes. Acceptable. Browser becomes noisy around 100+ active processing nodes. |
| Multiple BeatTracks synced to Transport | All BeatTracks share one scheduler loop (Transport). This is strictly better than each having its own `window.setTimeout`. |

---

## Build Order: Dependency Graph

```
Level 1 (no dependencies on new code):
  ├── Built-in Effects (DelayEffect, ReverbEffect, DistortionEffect,
  │     CompressorEffect, LimiterEffect, EQEffect)
  └── LFO

Level 2 (depends on LFO):
  └── ChorusEffect (uses LFO internally)

Level 3 (no new dependencies, but Transport is the foundation):
  └── Transport

Level 4 (depends on Transport):
  └── Sequencer

Level 4b (depends on Transport, modifies BeatTrack):
  └── BeatTrack.syncTo() integration

Level 5 (depends on Oscillator, no new dependencies):
  └── PolySynth

Level 6 (standalone, depends on AudioBuffer + lookahead pattern):
  └── GrainPlayer
```

**Suggested phase order:**
1. Built-in Effects (high value, zero architectural risk, follows existing patterns exactly)
2. LFO (small self-contained class, unlocks modulation use cases)
3. Transport + BeatTrack sync (architectural foundation for multi-track sync)
4. Sequencer (small, depends on Transport)
5. PolySynth (depends on Oscillator, well-understood pattern)
6. GrainPlayer (most complex, standalone, can be delivered independently)

Effects and LFO can be developed in parallel. Transport should precede Sequencer. PolySynth and GrainPlayer are independent of each other and of Transport.

---

## Modifications to Existing Files

| File | Modification | Scope |
|------|-------------|-------|
| `src/effects/index.ts` | Add exports for new effect classes | Additive |
| `src/index.ts` | Add exports for `LFO`, `Transport`, `Sequencer`, `PolySynth`, `GrainPlayer`, all new effects | Additive |
| `src/beat-track.ts` | Add `syncTo(transport: Transport): this` method | Additive |
| `src/controllers/base-param-controller.ts` | No changes needed | None |
| `src/oscillator.ts` | No changes needed | None |
| `src/base-sound.ts` | No changes needed | None |

No breaking changes are required for any existing public API.

---

## New Files Required

```
src/lfo.ts
src/transport.ts
src/sequencer.ts
src/poly-synth.ts
src/grain-player.ts
src/effects/delay-effect.ts
src/effects/reverb-effect.ts
src/effects/distortion-effect.ts
src/effects/chorus-effect.ts
src/effects/compressor-effect.ts
src/effects/eq-effect.ts
```

Plus test files for each (co-located, same directory).

---

## Sources

- [MDN: Web Audio API Advanced Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) — lookahead scheduler pattern, LFO implementation
- [MDN: AudioNode.connect()](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect) — connecting to AudioParam
- [Tone.js PolySynth docs](https://tonejs.github.io/docs/15.1.22/classes/PolySynth.html) — voice allocation pattern
- Existing `src/beat-track.ts` — lookahead scheduler constants (scheduleAheadTime=0.1, interval=25ms)
- Existing `src/effects/filter-effect.ts` — wet/dry routing pattern
- Existing `src/oscillator.ts` — single-use OscillatorNode pattern (relevant for LFO)
- `.planning/tone-gap-analysis.md` — feature prioritization rationale

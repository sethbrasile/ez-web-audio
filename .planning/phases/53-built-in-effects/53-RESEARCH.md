# Phase 53: Built-in Effects - Research

**Researched:** 2026-02-28
**Domain:** Web Audio API built-in effects (Delay, Reverb, Distortion, Compressor, EQ)
**Confidence:** HIGH

## Summary

All five effects can be implemented using native Web Audio API nodes with no third-party dependencies. The existing codebase has a well-established pattern in `FilterEffect` and `GainEffect` that new effects should follow: implement the `Effect` interface, use `applyEqualPowerCrossfade` for wet/dry mixing, provide getters/setters for parameters, and offer context-free factory functions with AudioContext overloads.

The main implementation challenge is the **BaseEffect refactor** — extracting the repeated wet/dry/bypass/routing boilerplate from FilterEffect into a shared base class, then having all effects (including the existing ones) extend it. This reduces ~40 lines of duplicated code per effect and provides a single place for the new `rampTo()` method.

**Primary recommendation:** Build BaseEffect first, refactor FilterEffect to use it (validates the design), then build all 5 new effects on top.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Support both convolution and algorithmic reverb via a single `createReverb()` factory
- Auto-detect mode: `createReverb('hall.wav')` -> convolution, `createReverb({ decay: 2 })` -> algorithmic
- No bundled impulse response files — user provides URL. Document where to find free IR files
- Algorithmic reverb parameters: `decay`, `preDelay`, `damping`, `mix` (all optional with good defaults)
- Selectable distortion curve types: `'soft'` (warm/tube), `'hard'` (aggressive), `'fuzz'` (heavy), `'overdrive'` (classic)
- Built-in tone control (`tone` param, 0-1, dark to bright) as post-distortion filter
- Default oversample: `'4x'`, configurable to `'none'` or `'2x'`
- Support custom curve via `{ type: 'custom', curve: Float32Array }`
- All 5 effects use options-object pattern: `createDelay({ time: 0.3, feedback: 0.5 })`
- All options are optional with good defaults — every effect works with zero config
- Specific factory functions only (no generic `createEffect('delay', ...)` dispatcher)
- Context-free pattern: AudioContext auto-resolved from shared library context, optional explicit override
- Real-time getters/setters on all effect parameters (matches FilterEffect pattern)
- Setter is instant (direct `.value` assignment)
- Add `rampTo()` method for smooth transitions (avoids clicks/pops)
- Shared BaseEffect base class with wet/dry mixing, bypass, and rampTo()
- Refactor existing FilterEffect and GainEffect to extend BaseEffect
- All 5 new effects extend BaseEffect for consistency

### Claude's Discretion
- Specific default values for each effect's parameters
- Algorithmic reverb implementation approach (Schroeder, Freeverb, etc.)
- Distortion curve generation algorithms for each type
- BaseEffect internal architecture details
- rampTo() time constant and smoothing approach

### Deferred Ideas (OUT OF SCOPE)
- WASM-based audio effects (ADV-01)
- VST-style plugin loading (ADV-02)
- Third-party effect library integration like tuna.js via wrapEffect (ADV-03)
- Chorus effect (FX-07)
- Limiter effect (FX-08)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FX-01 | Developer can create a delay effect with configurable time, feedback, and wet/dry mix | DelayNode + feedback loop pattern, BaseEffect wet/dry |
| FX-02 | Developer can create a reverb effect with configurable decay and wet/dry mix | ConvolverNode (convolution) + multi-comb/allpass network (algorithmic) |
| FX-03 | Developer can create a distortion effect with configurable amount and wet/dry mix | WaveShaperNode with curve generation algorithms |
| FX-04 | Developer can create a compressor effect with threshold, ratio, knee, attack, release | DynamicsCompressorNode (native, 1:1 parameter mapping) |
| FX-05 | Developer can create a 3-band EQ effect with configurable low/mid/high gain | Three BiquadFilterNodes (lowshelf + peaking + highshelf) |
| FX-06 | All built-in effects work with existing addEffect() on Sound, Oscillator, and LayeredSound | All implement Effect interface with input/output AudioNodes |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Baseline 2024 | All audio processing nodes | Native browser API, no dependencies |

### Native Nodes Used
| Node | Effect | Purpose |
|------|--------|---------|
| DelayNode | Delay | Configurable delay line (max 3s default, up to 180s) |
| GainNode | All | Wet/dry mixing, feedback loops, level control |
| BiquadFilterNode | EQ, Distortion | Frequency shaping (lowshelf/peaking/highshelf for EQ, tone control for distortion) |
| WaveShaperNode | Distortion | Non-linear waveshaping with configurable transfer curve |
| DynamicsCompressorNode | Compressor | Built-in dynamics processing with all standard params |
| ConvolverNode | Reverb (convolution) | Impulse response convolution |

### No Dependencies Needed
All effects use native Web Audio API nodes. No npm packages required.

## Architecture Patterns

### Recommended File Structure
```
src/effects/
├── index.ts              # Effect interface + re-exports (exists)
├── base-effect.ts        # NEW: BaseEffect abstract class
├── effect-wrapper.ts     # EffectWrapper for external effects (exists)
├── filter-effect.ts      # REFACTOR: extend BaseEffect (exists)
├── gain-effect.ts        # REFACTOR: extend BaseEffect (exists)
├── delay-effect.ts       # NEW
├── reverb-effect.ts      # NEW
├── distortion-effect.ts  # NEW
├── compressor-effect.ts  # NEW
├── eq-effect.ts          # NEW
└── *.test.ts             # Co-located test files
```

### Pattern 1: BaseEffect Abstract Class
**What:** Shared base for all multi-node effects that need wet/dry mixing
**When to use:** Any effect with separate input/output nodes and wet/dry mixing

```typescript
export abstract class BaseEffect implements Effect {
  protected readonly inputNode: GainNode
  protected readonly outputNode: GainNode
  protected readonly dryGain: GainNode
  protected readonly wetGain: GainNode
  protected readonly audioContext: AudioContext

  private _bypass = false
  private _mix = 1

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    this.dryGain = audioContext.createGain()
    this.wetGain = audioContext.createGain()

    // Dry path: input -> dryGain -> output
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet path connected by subclass via connectWetPath()
    this.wetGain.connect(this.outputNode)

    this.applyMix()
  }

  get input(): AudioNode { return this.inputNode }
  get output(): AudioNode { return this.outputNode }

  get bypass(): boolean { return this._bypass }
  set bypass(v: boolean) { this._bypass = v; this.applyMix() }

  get mix(): number { return this._mix }
  set mix(v: number) { this._mix = Math.max(0, Math.min(1, v)); this.applyMix() }

  rampTo(param: string, value: number, duration: number): void {
    const audioParam = this.getAudioParam(param)
    if (!audioParam) return
    audioParam.setTargetAtTime(value, this.audioContext.currentTime, duration / 3)
  }

  protected abstract getAudioParam(name: string): AudioParam | null

  private applyMix(): void {
    applyEqualPowerCrossfade(this.dryGain, this.wetGain, this._mix, this._bypass)
  }
}
```

**Key design choice:** Subclasses wire `inputNode -> [effect nodes] -> wetGain` in their constructor. BaseEffect handles everything else.

### Pattern 2: Delay Effect (Feedback Loop)
**What:** DelayNode with feedback loop for echo/delay effects
**Signal flow:** input -> delay -> feedbackGain -> delay (loop), input -> delay -> wetGain

```typescript
// Delay routing (feedback loop):
// input -> delayNode -> feedbackGain -> delayNode (loop)
//       -> delayNode -> wetGain -> output
this.inputNode.connect(this.delayNode)
this.delayNode.connect(this.feedbackGain)
this.feedbackGain.connect(this.delayNode) // feedback loop
this.delayNode.connect(this.wetGain)
```

**Default values:** time: 0.3s, feedback: 0.4, maxTime: 2.0s

### Pattern 3: Algorithmic Reverb (Comb + Allpass Network)
**What:** Schroeder-style reverb using parallel comb filters + series allpass filters
**Why Schroeder:** Simple, well-understood, sounds reasonable, pure Web Audio API nodes

```
Signal flow:
input -> [4 parallel comb filters] -> sum -> [2 series allpass] -> wetGain

Each comb filter = DelayNode + GainNode (feedback)
Each allpass = DelayNode + GainNode (feedback) + GainNode (feedforward)
```

**Comb filter delay times (Schroeder standard):** 0.0297, 0.0371, 0.0411, 0.0437 seconds (scaled by decay)
**Allpass delay times:** 0.005, 0.0017 seconds
**Pre-delay:** Additional DelayNode before the comb filters

### Pattern 4: Distortion Curves
**What:** WaveShaperNode transfer functions for different distortion characters

```typescript
function generateDistortionCurve(type: string, amount: number): Float32Array {
  const samples = 44100
  const curve = new Float32Array(samples)

  switch (type) {
    case 'soft': // Soft clipping (tanh)
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        curve[i] = Math.tanh(amount * x)
      }
      break
    case 'hard': // Hard clipping
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        curve[i] = Math.max(-1, Math.min(1, amount * x))
      }
      break
    case 'fuzz': // Aggressive sigmoid
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        const k = amount
        curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
      }
      break
    case 'overdrive': // Asymmetric soft clip
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        if (x < 0) curve[i] = -Math.tanh(-x * amount * 0.5)
        else curve[i] = Math.tanh(x * amount)
      }
      break
  }
  return curve
}
```

**Tone control:** Post-WaveShaper BiquadFilterNode (lowpass), `tone` 0-1 maps to frequency ~200Hz-8000Hz.

### Pattern 5: Compressor (1:1 Native Node)
**What:** DynamicsCompressorNode wraps directly — simplest effect

```typescript
// All params map 1:1 to DynamicsCompressorNode
this.compressorNode = audioContext.createDynamicsCompressor()
this.compressorNode.threshold.value = options.threshold ?? -24
this.compressorNode.ratio.value = options.ratio ?? 4
this.compressorNode.knee.value = options.knee ?? 30
this.compressorNode.attack.value = options.attack ?? 0.003
this.compressorNode.release.value = options.release ?? 0.25
```

**Bonus:** Expose `reduction` getter for metering (returns current gain reduction in dB).

### Pattern 6: Three-Band EQ
**What:** Three cascaded BiquadFilterNodes for low/mid/high frequency control

```typescript
// EQ chain: lowShelf (200Hz) -> peaking (1000Hz) -> highShelf (3000Hz)
this.lowFilter = audioContext.createBiquadFilter()
this.lowFilter.type = 'lowshelf'
this.lowFilter.frequency.value = 200

this.midFilter = audioContext.createBiquadFilter()
this.midFilter.type = 'peaking'
this.midFilter.frequency.value = 1000
this.midFilter.Q.value = 0.7  // Moderate bandwidth

this.highFilter = audioContext.createBiquadFilter()
this.highFilter.type = 'highshelf'
this.highFilter.frequency.value = 3000
```

**Gain values in dB:** `low: 0, mid: 0, high: 0` (flat by default). User passes dB values directly.

### Anti-Patterns to Avoid
- **Circular feedback without gain < 1:** Delay feedback gain must be clamped to < 1.0 to prevent infinite volume growth
- **Not disconnecting reverb nodes:** Algorithmic reverb creates many nodes — track them for potential future cleanup
- **Oversample on distortion defaults to 'none':** Should default to '4x' to prevent aliasing artifacts
- **Convolution reverb without normalization:** ConvolverNode.normalize should default to true

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wet/dry mixing | Per-effect crossfade logic | BaseEffect + applyEqualPowerCrossfade | Already proven in FilterEffect |
| Dynamics compression | Custom compressor | DynamicsCompressorNode | Native implementation, highly optimized |
| Convolution reverb | Custom convolution math | ConvolverNode | Browser-optimized FFT convolution |
| Audio parameter ramping | Manual setTimeout scheduling | AudioParam.setTargetAtTime | Sample-accurate, glitch-free |

## Common Pitfalls

### Pitfall 1: Feedback Loop Blowup
**What goes wrong:** Delay feedback gain >= 1.0 causes infinite volume growth, eventually clipping
**Why it happens:** No clamping on feedback parameter
**How to avoid:** Clamp feedback to [0, 0.99] in setter. Document that values near 1.0 create very long repeats.
**Warning signs:** Audio gets progressively louder with each echo repeat

### Pitfall 2: Convolution Reverb Async Loading
**What goes wrong:** User calls `createReverb('hall.wav')` expecting synchronous effect, but IR file must be fetched + decoded
**Why it happens:** ConvolverNode requires an AudioBuffer (decoded impulse response)
**How to avoid:** Make `createReverb()` return `Promise<ReverbEffect>` when given a URL string, and synchronous `ReverbEffect` when given algorithmic options
**Warning signs:** Effect has no audible change because IR hasn't loaded yet

### Pitfall 3: Distortion Amount Normalization
**What goes wrong:** Different curve types respond differently to the same `amount` value
**Why it happens:** tanh saturates differently than hard clip
**How to avoid:** Normalize `amount` (0-100) per curve type so similar values produce similar perceived distortion levels
**Warning signs:** `amount: 50` sounds completely different between soft and hard

### Pitfall 4: EQ Gain in Wrong Units
**What goes wrong:** User passes linear gain (0.5, 1.5) instead of dB (-6, +3)
**Why it happens:** BiquadFilterNode.gain is in dB for shelf/peaking filters
**How to avoid:** Document clearly that EQ gain is in dB. Name the parameter descriptively.
**Warning signs:** `low: 2` barely changes sound (because 2dB is subtle, user expected 2x)

### Pitfall 5: rampTo() During Bypass
**What goes wrong:** Ramping a parameter while bypass is true has no audible effect but changes internal state
**Why it happens:** Bypass routes signal around the effect
**How to avoid:** rampTo() should still work (change the parameter value) even during bypass — when bypass is turned off, the ramped value is applied
**Warning signs:** Unexpected parameter values after toggling bypass

## Code Examples

### Delay Effect Usage
```typescript
const delay = createDelay({ time: 0.3, feedback: 0.5, mix: 0.4 })
sound.addEffect(delay)
sound.play()

// Real-time control
delay.time = 0.5
delay.feedback = 0.7
delay.rampTo('time', 0.1, 2) // Ramp delay time to 0.1s over 2 seconds
```

### Reverb Effect Usage (Convolution)
```typescript
const reverb = await createReverb('impulse-responses/hall.wav')
sound.addEffect(reverb)

// Algorithmic
const algoReverb = createReverb({ decay: 2.5, preDelay: 0.02, damping: 0.5 })
sound.addEffect(algoReverb)
```

### Distortion Effect Usage
```typescript
const dist = createDistortion({ type: 'overdrive', amount: 50, tone: 0.6, mix: 0.7 })
sound.addEffect(dist)

// Custom curve
const custom = createDistortion({
  type: 'custom',
  curve: myFloat32Array,
  mix: 0.8
})
```

### Compressor Effect Usage
```typescript
const comp = createCompressor({
  threshold: -24,
  ratio: 4,
  knee: 30,
  attack: 0.003,
  release: 0.25
})
sound.addEffect(comp)

// Check gain reduction
console.log(comp.reduction) // -6.5 (dB)
```

### EQ Effect Usage
```typescript
const eq = createEQ({ low: 3, mid: -2, high: 4 })
sound.addEffect(eq)

// Adjust in real-time
eq.low = 6    // Boost bass
eq.mid = 0    // Flat mids
eq.high = -3  // Cut highs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for effects | AudioWorklet + native nodes | 2018 (Chrome 64+) | ScriptProcessorNode deprecated, but we use native nodes anyway |
| Manual convolution | ConvolverNode | Always available | Native is much faster (FFT-based) |
| No oversample on WaveShaper | oversample: '4x' available | Chrome 41+ | Eliminates aliasing in distortion |

## Open Questions

1. **Algorithmic reverb quality vs complexity tradeoff**
   - What we know: Schroeder (4 comb + 2 allpass) is simple and well-documented
   - What's unclear: Whether Freeverb (8 comb + 4 allpass + extra filtering) justifies the additional nodes
   - Recommendation: Start with Schroeder. It's well-understood and sufficient for an "EZ" library. Can upgrade later if quality complaints arise.

2. **GainEffect refactor to BaseEffect**
   - What we know: GainEffect is a single-node effect (input === output) which doesn't fit the multi-node BaseEffect pattern
   - What's unclear: Whether to force-fit it into BaseEffect or leave it as-is
   - Recommendation: Leave GainEffect as-is. It's a special case (single node, different mix semantics). Only refactor FilterEffect to use BaseEffect.

## Sources

### Primary (HIGH confidence)
- Web Audio API specification (W3C) — node types, parameter ranges, AudioParam scheduling
- Existing codebase: `src/effects/filter-effect.ts`, `src/effects/effect-wrapper.ts` — established patterns
- Existing codebase: `src/utils/equal-power-crossfade.ts` — shared wet/dry utility

### Secondary (MEDIUM confidence)
- Schroeder reverb algorithm — well-documented in DSP literature, standard delay times
- WaveShaper curve generation — standard transfer functions (tanh, hard clip, etc.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all native Web Audio API, no external deps
- Architecture: HIGH — clear patterns from existing FilterEffect/GainEffect
- Pitfalls: HIGH — well-known Web Audio gotchas (feedback loops, async loading, dB units)

**Research date:** 2026-02-28
**Valid until:** indefinite (Web Audio API is stable)

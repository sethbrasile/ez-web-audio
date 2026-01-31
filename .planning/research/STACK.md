# Technology Stack - Advanced Web Audio Features

**Project:** ez-audio
**Research Date:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

For the new advanced features (ADSR envelopes, event systems, audio visualization, audio sprites, effects chains), the recommended stack leverages native Web Audio API capabilities with TypeScript-first patterns. Key recommendation: **avoid third-party libraries** where native APIs are sufficient, maintain zero-dependency architecture, and extend the existing fluent controller pattern.

## Core Technology Stack

### Base Platform (Already Established)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| TypeScript | 5.6+ | Type safety, development experience | HIGH |
| Web Audio API | Current (W3C 1.1) | Audio processing foundation | HIGH |
| Vitest | 2.1+ | Testing with happy-dom | HIGH |
| standardized-audio-context-mock | 9.7+ | AudioContext mocking for tests | HIGH |

**Rationale:** These are already in place and working well. No changes needed to base stack.

---

## New Feature Technologies

### 1. ADSR Envelope Implementation

**Recommended Pattern:** Native AudioParam scheduling with fluent TypeScript API

#### Core Implementation

```typescript
// Extend existing controller pattern
interface ADSREnvelope {
  attack: number   // seconds
  decay: number    // seconds
  sustain: number  // ratio (0-1)
  release: number  // seconds
}

class ADSRController {
  applyEnvelope(param: AudioParam, envelope: ADSREnvelope, startTime: number, noteOffTime?: number): void {
    const { attack, decay, sustain, release } = envelope
    const now = startTime

    // Attack phase - linear ramp from 0 to 1
    param.setValueAtTime(0, now)
    param.linearRampToValueAtTime(1, now + attack)

    // Decay phase - exponential ramp to sustain level
    // Use exponentialRampToValueAtTime (avoid zero, min 0.0001)
    param.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), now + attack + decay)

    // Sustain phase - hold at sustain level until note off
    if (noteOffTime) {
      param.setValueAtTime(sustain, noteOffTime)
      // Release phase - ramp to zero
      param.exponentialRampToValueAtTime(0.0001, noteOffTime + release)
    }
  }
}
```

**Why Native AudioParam Methods:**
- **No clicks/pops**: Native ramping handles sample-accurate transitions
- **Hardware-accelerated**: Runs on audio thread, not main thread
- **Precise timing**: Uses AudioContext clock, not setTimeout
- **Zero dependencies**: Built into Web Audio API

**Anti-Pattern to Avoid:**
```typescript
// DON'T: Manual value updates in a loop
setInterval(() => {
  gainNode.gain.value += delta // Creates clicks, not sample-accurate
}, 10)
```

**Known Pitfall:** `exponentialRampToValueAtTime` cannot ramp to zero (Math domain error). Use `0.0001` as minimum value, then call `setValueAtTime(0, ...)` if true silence needed.

**Confidence:** HIGH (verified with [MDN Web Audio API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API))

**Sources:**
- [Building a Synthesizer with Web Audio API - Envelopes](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html)
- [fastidious-envelope-generator approach](https://github.com/rsimmons/fastidious-envelope-generator) (reference for artifact-free edge cases)

---

### 2. Event System

**Recommended Pattern:** TypeScript-native EventTarget with strict typing

#### Core Implementation

```typescript
// Type-safe event map
interface EZAudioEventMap {
  'play': { time: number, sound: string }
  'stop': { time: number, sound: string }
  'ended': { sound: string }
  'statechange': { state: AudioContextState }
  'beat': { beatIndex: number, track: string }
}

// Extend EventTarget with typed events
class TypedEventTarget<T extends Record<string, any>> extends EventTarget {
  on<K extends keyof T>(
    type: K,
    listener: (event: CustomEvent<T[K]>) => void,
    options?: AddEventListenerOptions
  ): void {
    this.addEventListener(type as string, listener as EventListener, options)
  }

  emit<K extends keyof T>(type: K, detail: T[K]): void {
    this.dispatchEvent(new CustomEvent(type as string, { detail }))
  }

  off<K extends keyof T>(
    type: K,
    listener: (event: CustomEvent<T[K]>) => void
  ): void {
    this.removeEventListener(type as string, listener as EventListener)
  }
}

// Usage
class EZAudioEvents extends TypedEventTarget<EZAudioEventMap> {}
const events = new EZAudioEvents()

// Type-safe listeners
events.on('play', (e) => {
  console.log(e.detail.sound, e.detail.time) // TypeScript knows the shape
})
```

**Why Native EventTarget:**
- **Zero dependencies**: Built into browsers since ~2021
- **Standard API**: Familiar addEventListener/removeEventListener
- **Memory safe**: Browser handles listener cleanup
- **TypeScript support**: Easily typed with generics

**Alternatives Considered:**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| EventEmitter3 | High performance | Adds dependency, Node.js-style API | Reject |
| strict-event-emitter-types | Type-only (0kb) | Still requires EventEmitter base | Consider if Node.js compat needed |
| mitt | Tiny (200b) | Another API to learn | Reject - EventTarget is standard |

**Anti-Pattern to Avoid:**
```typescript
// DON'T: Custom callback arrays
private listeners: Array<(data: any) => void> = []
// Lose memory management, standard APIs, type safety
```

**Integration with Web Audio API Native Events:**
```typescript
// Leverage AudioScheduledSourceNode 'ended' event
audioSourceNode.addEventListener('ended', () => {
  events.emit('ended', { sound: this.name })
})

// Leverage AudioContext 'statechange' event
audioContext.addEventListener('statechange', () => {
  events.emit('statechange', { state: audioContext.state })
})
```

**Confidence:** HIGH (native browser API, verified with [MDN EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget))

**Sources:**
- [TypeScript Deep Dive - Typesafe Event Emitter](https://basarat.gitbook.io/typescript/main-1/typed-event)
- [RJ Zaworski - Event Emitters in TypeScript](https://rjzaworski.com/2019/10/event-emitters-in-typescript)

---

### 3. Audio Visualization (AnalyserNode)

**Recommended Pattern:** AnalyserNode with requestAnimationFrame loop

#### Core Implementation

```typescript
interface VisualizationConfig {
  fftSize?: 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768
  smoothingTimeConstant?: number  // 0-1, default 0.8
  minDecibels?: number           // default -100
  maxDecibels?: number           // default -30
}

class AudioVisualizer {
  private analyser: AnalyserNode
  private dataArray: Uint8Array
  private animationId: number | null = null

  constructor(
    audioContext: AudioContext,
    config: VisualizationConfig = {}
  ) {
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = config.fftSize ?? 2048
    this.analyser.smoothingTimeConstant = config.smoothingTimeConstant ?? 0.8
    this.analyser.minDecibels = config.minDecibels ?? -100
    this.analyser.maxDecibels = config.maxDecibels ?? -30

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
  }

  connect(source: AudioNode): this {
    source.connect(this.analyser)
    return this
  }

  // Frequency domain data (0-255 values)
  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.dataArray)
    return this.dataArray
  }

  // Time domain data (oscilloscope)
  getWaveformData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.dataArray)
    return this.dataArray
  }

  // For high-precision analysis
  getFrequencyDataFloat(): Float32Array {
    const data = new Float32Array(this.analyser.frequencyBinCount)
    this.analyser.getFloatFrequencyData(data)
    return data
  }

  startVisualization(callback: (data: Uint8Array) => void, mode: 'frequency' | 'waveform' = 'frequency'): void {
    const draw = () => {
      this.animationId = requestAnimationFrame(draw)
      const data = mode === 'frequency' ? this.getFrequencyData() : this.getWaveformData()
      callback(data)
    }
    draw()
  }

  stopVisualization(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}
```

**FFT Size Selection Guide:**

| FFT Size | Frequency Bins | Use Case | CPU Impact |
|----------|----------------|----------|------------|
| 256 | 128 | Simple level meters, beat detection | Very Low |
| 512 | 256 | Basic spectrum analyzer | Low |
| 1024 | 512 | Standard visualization | Low-Medium |
| 2048 | 1024 | **Recommended default** - detailed spectrum | Medium |
| 4096 | 2048 | High-resolution frequency analysis | Medium-High |
| 8192+ | 4096+ | Scientific analysis, pitch detection | High |

**Performance Best Practices:**
1. **Use requestAnimationFrame**: Syncs with browser repaint (60fps max)
2. **Don't create new arrays**: Reuse `dataArray` for efficiency
3. **Pass-through connection**: AnalyserNode can be left unconnected on output without blocking audio
4. **Smoothing**: Use `smoothingTimeConstant` (0.8 default) for smoother transitions

**Integration with Existing Architecture:**
```typescript
// Add to BaseSound class
class BaseSound {
  public attachVisualizer(visualizer: AudioVisualizer): this {
    // Connect analyzer between source and gain
    this.audioSourceNode.connect(visualizer.analyser)
    visualizer.analyser.connect(this.gainNode)
    return this
  }
}
```

**Anti-Pattern to Avoid:**
```typescript
// DON'T: Create new arrays every frame
setInterval(() => {
  const data = new Uint8Array(analyser.frequencyBinCount) // Memory allocation every 16ms!
  analyser.getByteFrequencyData(data)
}, 16)
```

**Confidence:** HIGH (verified with [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode))

---

### 4. Audio Sprites

**Recommended Format:** JSON sprite map with standard schema

#### JSON Schema

```typescript
interface AudioSprite {
  src: string            // Path to audio file (mp3, wav, etc.)
  sprite: {
    [spriteName: string]: [
      number,            // Start offset in milliseconds
      number             // Duration in milliseconds
    ]
  }
}

// Example sprite definition
const drumSprites: AudioSprite = {
  src: '/sounds/drum-kit.wav',
  sprite: {
    kick: [0, 500],        // 0ms start, 500ms duration
    snare: [500, 400],     // 500ms start, 400ms duration
    hihat: [900, 200],     // 900ms start, 200ms duration
    crash: [1100, 1500]    // 1100ms start, 1500ms duration
  }
}
```

#### Implementation

```typescript
class AudioSpriteLoader {
  private audioBuffer?: AudioBuffer
  private spriteMap: Map<string, { start: number, duration: number }> = new Map()

  async load(audioContext: AudioContext, sprite: AudioSprite): Promise<void> {
    const response = await fetch(sprite.src)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Convert sprite definitions to internal map (ms -> seconds)
    for (const [name, [startMs, durationMs]] of Object.entries(sprite.sprite)) {
      this.spriteMap.set(name, {
        start: startMs / 1000,
        duration: durationMs / 1000
      })
    }
  }

  playSprite(audioContext: AudioContext, spriteName: string): AudioBufferSourceNode {
    if (!this.audioBuffer) throw new Error('Sprites not loaded')

    const sprite = this.spriteMap.get(spriteName)
    if (!sprite) throw new Error(`Sprite '${spriteName}' not found`)

    const source = audioContext.createBufferSource()
    source.buffer = this.audioBuffer

    // start(when, offset, duration)
    source.start(audioContext.currentTime, sprite.start, sprite.duration)

    return source
  }
}
```

**Why This Format:**
- **Industry standard**: Compatible with howler.js, audiosprite npm package
- **Simple schema**: Easy to generate, hand-edit, or produce from tools
- **Millisecond precision**: Matches audiosprite tool output
- **Type-safe**: Easy to model in TypeScript

**Sprite Generation Tools:**

| Tool | Format | Command | Notes |
|------|--------|---------|-------|
| audiosprite (npm) | JSON | `audiosprite --format howler2 *.wav` | Industry standard |
| ffmpeg | Manual | `ffmpeg -i input.wav -ss 0 -t 0.5 kick.wav` | For custom workflows |

**Integration with Existing Sound Class:**
```typescript
// Extend existing pattern
interface SpriteSound extends Sound {
  spriteName: string
}

function createSpriteSound(
  audioContext: AudioContext,
  spriteLoader: AudioSpriteLoader,
  spriteName: string
): SpriteSound {
  const sprite = spriteLoader.getSprite(spriteName)
  return createSound(audioContext, spriteLoader.audioBuffer!, {
    startOffset: sprite.start,
    duration: sprite.duration
  })
}
```

**Confidence:** MEDIUM-HIGH (standard format, verified with [audiosprite npm package](https://www.npmjs.com/package/audiosprite) and [howler.js documentation](https://howlerjs.com/))

**Sources:**
- [How to create AudioSprites with howler.js](https://medium.com/game-development-stuff/how-to-create-audiosprites-to-use-with-howler-js-beed5d006ac1)

---

### 5. Effects Chain Architecture

**Recommended Pattern:** Modular node graph with typed connections (already partially in place)

#### Effects Library Structure

```typescript
// Effect base interface
interface Effect {
  name: string
  audioNode: AudioNode
  wetDry?: WetDryControl
  destroy?: () => void
}

interface WetDryControl {
  wet: GainNode
  dry: GainNode
  setMix(ratio: number): void  // 0 = all dry, 1 = all wet
}

// Reverb Effect (ConvolverNode)
class ReverbEffect implements Effect {
  name = 'reverb'
  audioNode: ConvolverNode
  private wetDry: WetDryControl

  constructor(
    audioContext: AudioContext,
    impulseResponse: AudioBuffer,
    options: { mix?: number, normalize?: boolean } = {}
  ) {
    this.audioNode = audioContext.createConvolver()
    this.audioNode.buffer = impulseResponse
    this.audioNode.normalize = options.normalize ?? true

    // Wet/dry mixing
    const wet = audioContext.createGain()
    const dry = audioContext.createGain()
    const merger = audioContext.createGain()

    this.wetDry = { wet, dry, setMix: (ratio: number) => {
      wet.gain.value = ratio
      dry.gain.value = 1 - ratio
    }}

    this.wetDry.setMix(options.mix ?? 0.5)
  }

  static async loadImpulseResponse(
    audioContext: AudioContext,
    url: string
  ): Promise<AudioBuffer> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return audioContext.decodeAudioData(arrayBuffer)
  }
}

// Delay Effect (DelayNode + Feedback)
class DelayEffect implements Effect {
  name = 'delay'
  audioNode: DelayNode
  private feedback: GainNode
  private wetDry: WetDryControl

  constructor(
    audioContext: AudioContext,
    options: {
      delayTime?: number,      // seconds (max 5.0)
      feedback?: number,       // 0-1
      mix?: number            // 0-1
    } = {}
  ) {
    this.audioNode = audioContext.createDelay(5.0)
    this.audioNode.delayTime.value = options.delayTime ?? 0.5

    this.feedback = audioContext.createGain()
    this.feedback.gain.value = options.feedback ?? 0.4

    // Feedback loop: delay -> feedback -> delay
    this.audioNode.connect(this.feedback)
    this.feedback.connect(this.audioNode)

    // Wet/dry setup (similar to reverb)
    // ... (omitted for brevity)
  }
}

// Filter Effect (BiquadFilterNode)
class FilterEffect implements Effect {
  name = 'filter'
  audioNode: BiquadFilterNode

  constructor(
    audioContext: AudioContext,
    options: {
      type?: BiquadFilterType,
      frequency?: number,
      Q?: number,
      gain?: number
    } = {}
  ) {
    this.audioNode = audioContext.createBiquadFilter()
    this.audioNode.type = options.type ?? 'lowpass'
    this.audioNode.frequency.value = options.frequency ?? 1000
    this.audioNode.Q.value = options.Q ?? 1
    this.audioNode.gain.value = options.gain ?? 0
  }
}

// Compressor Effect (DynamicsCompressorNode)
class CompressorEffect implements Effect {
  name = 'compressor'
  audioNode: DynamicsCompressorNode

  constructor(
    audioContext: AudioContext,
    options: {
      threshold?: number,
      knee?: number,
      ratio?: number,
      attack?: number,
      release?: number
    } = {}
  ) {
    this.audioNode = audioContext.createDynamicsCompressor()
    this.audioNode.threshold.value = options.threshold ?? -24
    this.audioNode.knee.value = options.knee ?? 30
    this.audioNode.ratio.value = options.ratio ?? 12
    this.audioNode.attack.value = options.attack ?? 0.003
    this.audioNode.release.value = options.release ?? 0.25
  }
}
```

#### Effects Chain Manager

```typescript
// Extend existing BaseSound.connections architecture
class EffectsChain {
  private effects: Effect[] = []

  constructor(private audioContext: AudioContext) {}

  addEffect(effect: Effect, position?: number): this {
    if (position !== undefined) {
      this.effects.splice(position, 0, effect)
    } else {
      this.effects.push(effect)
    }
    return this
  }

  removeEffect(name: string): this {
    const index = this.effects.findIndex(e => e.name === name)
    if (index > -1) {
      const effect = this.effects[index]
      effect.destroy?.()
      this.effects.splice(index, 1)
    }
    return this
  }

  getEffect(name: string): Effect | undefined {
    return this.effects.find(e => e.name === name)
  }

  // Connect chain: input -> effects -> output
  connect(input: AudioNode, output: AudioNode): this {
    if (this.effects.length === 0) {
      input.connect(output)
      return this
    }

    // Disconnect all first
    input.disconnect()
    this.effects.forEach(e => e.audioNode.disconnect())

    // Reconnect in order
    input.connect(this.effects[0].audioNode)

    for (let i = 0; i < this.effects.length - 1; i++) {
      this.effects[i].audioNode.connect(this.effects[i + 1].audioNode)
    }

    this.effects[this.effects.length - 1].audioNode.connect(output)

    return this
  }
}
```

**Standard Effect Chain Order:**

```
Source → [Filter/EQ] → [Distortion] → [Modulation] → [Delay] → [Reverb] → [Compressor] → Output
```

**Why This Order:**
- **Filters first**: Shape tone before distortion (more natural)
- **Distortion before modulation**: Modulate the distorted signal
- **Delay before reverb**: Reverb should affect delayed signal
- **Compressor last**: Even out final output levels

**Impulse Response Library Recommendation:**

| Source | Format | Quality | License |
|--------|--------|---------|---------|
| [OpenAIR](https://www.openair.hosted.york.ac.uk/) | WAV | Professional | CC-BY |
| [Reverb.js CDN](http://reverbjs.org/) | WAV | Good | MIT-style |
| [Valhalla FreqEcho IRs](https://valhalladsp.com/demos-downloads/) | WAV | Excellent | Free for use |

**Recommended IR Format:**
- **32-bit float, stereo (2-channel), 44.1kHz WAV** for best compatibility
- Keep files under 5 seconds for performance
- Store in `/public/impulses/` for CDN delivery

**Anti-Pattern to Avoid:**
```typescript
// DON'T: Use deprecated ScriptProcessorNode
const processor = audioContext.createScriptProcessor(4096, 1, 1)
processor.onaudioprocess = (e) => { /* custom DSP */ }
// This is DEPRECATED and causes audio glitches
```

**Modern Replacement:** Use AudioWorklet for custom DSP (covered in next section)

**Confidence:** HIGH (verified with [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and [ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode))

**Sources:**
- [web.dev - Audio Effects Patterns](https://web.dev/patterns/media/audio-effects)
- [Reverb.js library](https://github.com/andibrae/Reverb.js)

---

### 6. Custom Audio Processing (AudioWorklet)

**Status:** MANDATORY for custom DSP, ScriptProcessorNode is DEPRECATED

#### When to Use AudioWorklet

Use AudioWorklet when you need:
- Custom signal processing (custom filters, effects)
- Real-time audio synthesis
- Sample-accurate control not available via standard nodes

**Don't use** for:
- Simple gain/pan/filter (use built-in nodes)
- ADSR envelopes (use AudioParam scheduling)
- Basic effects (use built-in nodes like BiquadFilter, Delay, Convolver)

#### Basic AudioWorklet Pattern

```typescript
// processor.js (runs in AudioWorkletGlobalScope)
class CustomProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]

    // Custom DSP here
    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel]
      const outputChannel = output[channel]

      for (let i = 0; i < outputChannel.length; i++) {
        outputChannel[i] = inputChannel[i] * 0.5 // Example: 50% volume
      }
    }

    return true // Keep processor alive
  }
}

registerProcessor('custom-processor', CustomProcessor)
```

```typescript
// main.ts (main thread)
await audioContext.audioWorklet.addModule('processor.js')
const workletNode = new AudioWorkletNode(audioContext, 'custom-processor')
source.connect(workletNode).connect(audioContext.destination)
```

**Why AudioWorklet:**
- **Runs on audio thread**: No main thread blocking, no jank
- **Sample-accurate**: Deterministic timing
- **Standard API**: Web Audio spec, future-proof
- **WASM support**: Can compile C++ DSP code to WASM

**vs. ScriptProcessorNode (DEPRECATED):**

| Feature | ScriptProcessorNode | AudioWorklet |
|---------|-------------------|--------------|
| Status | Deprecated, may stop working | Standard, recommended |
| Thread | Main thread (blocks UI) | Audio thread (isolated) |
| Timing | Asynchronous (glitches) | Deterministic (no glitches) |
| Performance | Poor under load | Excellent |

**Recommendation:** Only implement AudioWorklet if you have a specific custom DSP need. For ez-audio's current roadmap, native nodes should be sufficient.

**Confidence:** HIGH (verified with [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet) and [Chrome deprecation notice](https://developer.chrome.com/blog/audio-worklet))

---

## Development Dependencies

### Testing Stack

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| vitest | 2.1+ | Test runner | Already in use |
| happy-dom | 15.7+ | DOM environment | Already in use |
| standardized-audio-context-mock | 9.7+ | Mock AudioContext | Already in use |

**No changes needed** - existing test infrastructure works for new features.

### Mock Strategy for New Features

```typescript
// Example: Testing ADSR envelope
import { AudioContext } from 'standardized-audio-context-mock'

test('ADSR applies envelope correctly', () => {
  const audioContext = new AudioContext()
  const gainNode = audioContext.createGain()

  const envelope = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1.0 }
  applyADSR(gainNode.gain, envelope, 0)

  // Verify scheduled values
  // standardized-audio-context-mock tracks setValueAtTime calls
})
```

---

## Build & Distribution

### Current Stack (No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Bundler | Works well, keep as-is |
| TypeScript Compiler | Type checking | Already configured |
| vite-plugin-dts | .d.ts generation | Already in place |

### Bundle Size Considerations

All recommended patterns use **zero additional dependencies**:
- ADSR: Native AudioParam methods
- Events: Native EventTarget
- Visualization: Native AnalyserNode
- Sprites: Native AudioBuffer + fetch
- Effects: Native Web Audio nodes

**Current bundle:** ~0kb of dependencies (excluding TypeScript types)
**After new features:** Still ~0kb of dependencies

This maintains ez-audio's value proposition: **small, fast, zero-dependency wrapper**.

---

## Anti-Patterns to Avoid

### 1. Third-Party Wrapper Libraries

**Don't:**
```typescript
import Tone from 'tone'  // 200kb+ dependency
import Howler from 'howler'  // Another wrapper library
```

**Why:** ez-audio IS the wrapper library. Adding another wrapper defeats the purpose and adds bundle weight.

### 2. ScriptProcessorNode (Deprecated)

**Don't:**
```typescript
const processor = audioContext.createScriptProcessor(4096, 1, 1)
```

**Why:** Deprecated, causes audio glitches, will be removed from browsers.

**Use instead:** AudioWorklet (only if custom DSP truly needed)

### 3. Manual Parameter Animation

**Don't:**
```typescript
setInterval(() => {
  gainNode.gain.value += 0.01  // Not sample-accurate, creates clicks
}, 10)
```

**Use instead:** AudioParam scheduling methods (linearRampToValueAtTime, etc.)

### 4. New Arrays Every Frame

**Don't:**
```typescript
requestAnimationFrame(() => {
  const data = new Uint8Array(analyser.frequencyBinCount)  // Memory churn!
})
```

**Use instead:** Reuse pre-allocated arrays

### 5. Synchronous File Loading

**Don't:**
```typescript
const buffer = loadAudioFileSync(url)  // Blocks main thread
```

**Use instead:** async/await with fetch + decodeAudioData

---

## Installation Commands

```bash
# No new dependencies needed!
# All features use native Web Audio API

# Current dev dependencies already include everything needed:
pnpm install  # Existing dependencies only
```

---

## TypeScript Configuration

### Recommended tsconfig Updates

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],  // Already present
    "strict": true,                             // Already present
    "strictNullChecks": true,                   // Already present

    // Ensure Web Audio API types available
    "types": ["vite/client"],

    // Enable decorators if using class-based patterns
    "experimentalDecorators": false  // Not needed for recommended patterns
  }
}
```

**No changes needed** - current tsconfig.json already has correct settings.

---

## Summary: Technology Decisions

| Feature | Technology | Rationale | Confidence |
|---------|------------|-----------|------------|
| ADSR Envelopes | Native AudioParam scheduling | Sample-accurate, zero-dependency, hardware-accelerated | HIGH |
| Event System | Native EventTarget + TypeScript generics | Standard API, type-safe, zero-dependency | HIGH |
| Visualization | Native AnalyserNode + requestAnimationFrame | Performant, standard, zero-dependency | HIGH |
| Audio Sprites | JSON map + native AudioBuffer | Industry standard format, simple, type-safe | MEDIUM-HIGH |
| Effects (Reverb) | Native ConvolverNode + impulse responses | Professional quality, zero-dependency | HIGH |
| Effects (Delay) | Native DelayNode + GainNode feedback | Standard pattern, performant | HIGH |
| Effects (Filter) | Native BiquadFilterNode | Full filter suite built-in | HIGH |
| Custom DSP | AudioWorklet (only if needed) | Future-proof, performant, standard | HIGH |

**Core Philosophy:** Maximize use of native Web Audio API, minimize dependencies, maintain TypeScript-first development experience.

---

## Sources

### Official Documentation (HIGH confidence)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [MDN ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode)
- [MDN BaseAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext)
- [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet)
- [W3C Web Audio API 1.1 Specification](https://www.w3.org/TR/webaudio-1.1/)

### Community Best Practices (MEDIUM-HIGH confidence)
- [Building a Synthesizer in TypeScript - ITNEXT](https://itnext.io/building-a-synthesizer-in-typescript-5a85ea17e2f2)
- [Envelopes with Web Audio API](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html)
- [TypeScript Deep Dive - Typesafe Event Emitter](https://basarat.gitbook.io/typescript/main-1/typed-event)
- [web.dev - Audio Effects Patterns](https://web.dev/patterns/media/audio-effects)

### Library References (MEDIUM confidence)
- [Tone.js Architecture](https://tonejs.github.io/) - Reference for patterns, not for importing
- [howler.js](https://howlerjs.com/) - Audio sprite format reference
- [audiosprite npm](https://www.npmjs.com/package/audiosprite) - Sprite generation tool
- [Reverb.js](https://github.com/andibrae/Reverb.js) - Impulse response library reference
- [fastidious-envelope-generator](https://github.com/rsimmons/fastidious-envelope-generator) - Artifact-free envelope reference

### Deprecation Notices (HIGH confidence)
- [Chrome: ScriptProcessorNode Deprecation](https://developer.chrome.com/blog/audio-worklet)
- [MDN: ScriptProcessorNode](https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode) - Marked deprecated

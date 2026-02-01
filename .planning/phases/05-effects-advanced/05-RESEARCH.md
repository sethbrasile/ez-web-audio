# Phase 5: Effects & Advanced Features - Research

**Researched:** 2026-02-01
**Domain:** Web Audio API Effects, Visualization, Debug Infrastructure
**Confidence:** HIGH

## Summary

This phase adds professional-quality audio effects, frequency/waveform visualization, and debug mode to ez-audio. The architecture follows the user's decision to use an **adapter pattern** where ez-audio does NOT bundle effect libraries - users bring their own (Tuna.js, etc.) and `addEffect()` wraps any object with a `connect()` method.

The implementation centers on three subsystems: (1) an effect interface that auto-wraps external effects to provide bypass/mix controls, with two built-in effects (GainEffect, FilterEffect) as thin Web Audio wrappers; (2) an Analyzer class using Web Audio's AnalyserNode for frequency/waveform data polling; and (3) a tree-shakeable debug system with global + per-sound granularity.

The key architectural insight is **persistent effect chains** - effects remain wired across multiple `play()` calls, rather than rebuilding the audio graph each time. This mirrors how real effect pedals work and simplifies the mental model. The current `wireConnections()` method that rebuilds on each play must be refactored to separate initial wiring from source node reconnection.

**Primary recommendation:** Implement an `Effect` interface with `input`/`output` AudioNodes and `bypass`/`mix` properties. Create an `EffectWrapper` class that auto-adds these to external effects. The `addEffect()` method inserts effects into a persistent chain between source and gain nodes.

## Standard Stack

The established patterns for this domain:

### Core (Built into ez-audio)

| Component | Purpose | Why Standard |
|-----------|---------|--------------|
| `GainEffect` | Thin wrapper around GainNode | Simple volume control as an effect |
| `FilterEffect` | Thin wrapper around BiquadFilterNode | All 8 filter types with consistent interface |
| `Analyzer` | Wrapper around AnalyserNode | Frequency/waveform/decibel data access |
| `EffectWrapper` | Auto-wraps external effects | Adds bypass/mix to any `connect()` object |

### Compatible External Libraries (User-Provided)

| Library | Version | Purpose | Compatibility |
|---------|---------|---------|---------------|
| Tuna.js | 1.0.15 | 15+ audio effects | Has `connect()` method, works directly |
| Tone.js | 14.x | Full audio framework | Effects have `connect()`, works directly |
| Custom effects | - | User-built WaveShaperNode, etc. | Must have `connect()` method |

### Why No Bundled Complex Effects

The user explicitly decided: "ez-audio does NOT bundle effect libraries." Reasons:
1. Bundle size - reverb impulse responses alone can be megabytes
2. User choice - developers may already use Tuna, Tone.js, or custom solutions
3. Maintenance burden - audio DSP libraries require domain expertise
4. Flexibility - adapter pattern works with ANY Web Audio-compatible effect

**No installation required for built-in effects.** For external effects:
```bash
# Optional - user choice
npm install tunajs
# or
npm install tone
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── effects/
│   ├── index.ts           # Effect interface, EffectWrapper, factory functions
│   ├── gain-effect.ts     # GainEffect class
│   ├── filter-effect.ts   # FilterEffect class
│   └── effect-wrapper.ts  # Auto-wraps external effects
├── analyzer.ts            # Analyzer class for visualization
├── debug/
│   ├── index.ts           # Debug mode exports
│   ├── logger.ts          # DebugLogger class
│   └── messages.ts        # Message formatting utilities
```

### Pattern 1: Persistent Effect Chain

**What:** Effects remain wired across multiple `play()` calls. Only the source node is reconnected.

**When to use:** Always - this is the core architecture decision.

**Current Problem:**
```typescript
// Current: wireConnections() rebuilds entire graph on every play
protected wireConnections(): void {
  const nodes: AudioNode[] = [this.audioSourceNode]
  // ... rebuilds everything from scratch
}
```

**New Pattern:**
```typescript
// Source: Architectural decision from user discussion
protected effects: Effect[] = []

// Called once when effect is added/removed/reordered
private wireEffectChain(): void {
  // Disconnect existing chain
  this.effectChainInput?.disconnect()

  // Build new chain: effectChainInput → [effects] → gainNode → pannerNode → destination
  let currentNode: AudioNode = this.effectChainInput
  for (const effect of this.effects) {
    if (!effect.bypass) {
      currentNode.connect(effect.input)
      currentNode = effect.output
    }
  }
  currentNode.connect(this.gainNode)
  this.gainNode.connect(this.pannerNode)
  this.pannerNode.connect(this.destination)
}

// Called on each play() - only reconnects source
protected setup(): void {
  this.createNewSourceNode()
  this.audioSourceNode.connect(this.effectChainInput)
  // Effect chain already wired!
}
```

### Pattern 2: Effect Interface with Auto-Wrapping

**What:** Define a consistent interface that all effects must satisfy. Auto-wrap external effects that only have `connect()`.

**When to use:** For all effect integration.

**Example:**
```typescript
// Source: Decided interface from CONTEXT.md
export interface Effect {
  /** Input node for the effect (connects from previous in chain) */
  input: AudioNode
  /** Output node for the effect (connects to next in chain) */
  output: AudioNode
  /** When true, audio bypasses the effect processing */
  bypass: boolean
  /** Wet/dry mix: 0 = fully dry, 1 = fully wet */
  mix: number
}

// External effects only have connect()
interface ExternalEffect {
  connect(destination: AudioNode): void
}

// EffectWrapper adds missing properties
class EffectWrapper implements Effect {
  public input: GainNode
  public output: GainNode
  private wetGain: GainNode
  private dryGain: GainNode
  private _bypass = false
  private _mix = 1

  constructor(
    private audioContext: AudioContext,
    private externalEffect: ExternalEffect
  ) {
    // Create wet/dry mixing infrastructure
    this.input = audioContext.createGain()
    this.output = audioContext.createGain()
    this.wetGain = audioContext.createGain()
    this.dryGain = audioContext.createGain()

    // Dry path: input → dryGain → output
    this.input.connect(this.dryGain)
    this.dryGain.connect(this.output)

    // Wet path: input → effect → wetGain → output
    this.input.connect(this.externalEffect as unknown as AudioNode)
    // External effect connects to wetGain in its connect() call
    this.externalEffect.connect(this.wetGain)
    this.wetGain.connect(this.output)

    this.updateMix()
  }

  get bypass(): boolean { return this._bypass }
  set bypass(value: boolean) {
    this._bypass = value
    this.wetGain.gain.value = value ? 0 : this._mix
    this.dryGain.gain.value = value ? 1 : 1 - this._mix
  }

  get mix(): number { return this._mix }
  set mix(value: number) {
    this._mix = Math.max(0, Math.min(1, value))
    if (!this._bypass) this.updateMix()
  }

  private updateMix(): void {
    // Equal-power crossfade for natural mixing
    this.wetGain.gain.value = Math.cos((1 - this._mix) * Math.PI / 2)
    this.dryGain.gain.value = Math.cos(this._mix * Math.PI / 2)
  }
}
```

### Pattern 3: Analyzer with Polling Model

**What:** Create an Analyzer class wrapping AnalyserNode with convenient data access methods.

**When to use:** For frequency/waveform visualization.

**Example:**
```typescript
// Source: MDN AnalyserNode documentation
export interface AnalyzerOptions {
  fftSize?: number  // Default 2048, valid: 32-32768 (power of 2)
  minDecibels?: number  // Default -100
  maxDecibels?: number  // Default -30
  smoothingTimeConstant?: number  // Default 0.8 (0-1)
}

export class Analyzer {
  private analyserNode: AnalyserNode
  private frequencyData: Uint8Array
  private timeDomainData: Uint8Array
  private floatFrequencyData: Float32Array

  constructor(
    private audioContext: AudioContext,
    options: AnalyzerOptions = {}
  ) {
    this.analyserNode = audioContext.createAnalyser()
    this.analyserNode.fftSize = options.fftSize ?? 2048
    this.analyserNode.minDecibels = options.minDecibels ?? -100
    this.analyserNode.maxDecibels = options.maxDecibels ?? -30
    this.analyserNode.smoothingTimeConstant = options.smoothingTimeConstant ?? 0.8

    const binCount = this.analyserNode.frequencyBinCount
    this.frequencyData = new Uint8Array(binCount)
    this.timeDomainData = new Uint8Array(binCount)
    this.floatFrequencyData = new Float32Array(binCount)
  }

  get input(): AnalyserNode { return this.analyserNode }
  get frequencyBinCount(): number { return this.analyserNode.frequencyBinCount }

  // Polling methods - call in requestAnimationFrame
  getFrequencyData(): Uint8Array {
    this.analyserNode.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }

  getTimeDomainData(): Uint8Array {
    this.analyserNode.getByteTimeDomainData(this.timeDomainData)
    return this.timeDomainData
  }

  getFloatFrequencyData(): Float32Array {
    this.analyserNode.getFloatFrequencyData(this.floatFrequencyData)
    return this.floatFrequencyData
  }
}
```

### Pattern 4: Tree-Shakeable Debug Mode

**What:** Debug logging that has zero runtime cost when disabled, and can be eliminated in production builds.

**When to use:** All sound lifecycle events, connection changes, warnings.

**Example:**
```typescript
// Source: Tree-shaking best practices research
// debug/index.ts - All debug code isolated here

let globalDebugEnabled = false
let debugHandler: (msg: DebugMessage) => void = defaultHandler

export function setDebugMode(enabled: boolean): void {
  globalDebugEnabled = enabled
}

export function setDebugHandler(handler: (msg: DebugMessage) => void): void {
  debugHandler = handler
}

export interface DebugMessage {
  type: 'event' | 'connection' | 'warning'
  source: string
  message: string
  timestamp: number
  details?: Record<string, unknown>
}

function defaultHandler(msg: DebugMessage): void {
  const prefix = `[ez-audio:${msg.type}]`
  console.log(`${prefix} ${msg.source}: ${msg.message}`, msg.details ?? '')
}

// Short-circuit check at the start - zero overhead when disabled
export function debugLog(
  source: { name?: string; debug?: boolean },
  message: DebugMessage
): void {
  // Fast path: if neither global nor per-sound debug, return immediately
  if (!globalDebugEnabled && !source.debug) return

  // Per-sound override: explicitly false disables even when global is on
  if (source.debug === false) return

  debugHandler(message)
}
```

### Anti-Patterns to Avoid

- **Rebuilding audio graph on every play():** Wasteful and causes audible glitches. Use persistent effect chains.
- **Bundling effect libraries:** Bloats bundle, limits user choice. Use adapter pattern.
- **Synchronous data fetching for visualization:** Blocks UI. Use polling model with requestAnimationFrame.
- **Debug logging without short-circuit:** Adds overhead even when disabled. Check flags first.
- **Linear wet/dry mixing:** Causes perceived volume dip at 50%. Use equal-power crossfade.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reverb/Delay/Distortion effects | Custom DSP implementations | Tuna.js or Tone.js | Complex algorithms, requires DSP expertise |
| FFT analysis | Custom FFT implementation | AnalyserNode | Browser-optimized, hardware-accelerated |
| Equal-power crossfade | Linear gain mixing | `Math.cos()` crossfade | Linear mixing has 3dB dip at center |
| Filter curves | Manual coefficient calculation | BiquadFilterNode | All 8 types built-in, AudioParam automation |

**Key insight:** Web Audio API provides optimized native nodes for common operations. Wrap them, don't replace them.

## Common Pitfalls

### Pitfall 1: AudioBufferSourceNode Single-Use Limitation

**What goes wrong:** Attempting to reuse a source node for multiple plays fails silently or throws.

**Why it happens:** AudioBufferSourceNode can only be started once by design (Web Audio spec).

**How to avoid:** Create new source nodes on each play, but keep effect chain persistent.

**Warning signs:** Sound plays once then stops working; no error in console.

### Pitfall 2: Disconnection Order Matters

**What goes wrong:** Calling `disconnect()` on a node disconnects ALL its outputs, breaking unrelated chains.

**Why it happens:** Web Audio `disconnect()` without arguments is destructive.

**How to avoid:** Always use `disconnect(destination)` to disconnect specific connections.

**Warning signs:** Other sounds stop working after removing an effect.

### Pitfall 3: Exponential Ramp to Zero

**What goes wrong:** `exponentialRampToValueAtTime(0, time)` throws or produces NaN.

**Why it happens:** Exponential functions can't reach zero (asymptotic).

**How to avoid:** Use a very small value (0.0001) or switch to `linearRampToValueAtTime` near zero.

**Warning signs:** Console error about invalid value for exponential ramp.

### Pitfall 4: AnalyserNode Data Buffer Reuse

**What goes wrong:** Typed array data changes unexpectedly between frames.

**Why it happens:** If you store the buffer reference, the AnalyserNode writes to the same memory.

**How to avoid:** Either copy the data (`new Uint8Array(buffer)`) or use it immediately.

**Warning signs:** Visualization shows stale or corrupted data.

### Pitfall 5: Shared Effect State Confusion

**What goes wrong:** Changing an effect on one sound affects another sound using the same effect.

**Why it happens:** Effect instances are shared by reference (as designed).

**How to avoid:** Document clearly that shared effects share state. Create separate instances if independent control is needed.

**Warning signs:** User complains about "linking" between sounds.

## Code Examples

Verified patterns from official sources and research:

### Creating and Using Built-in Effects

```typescript
// Source: CONTEXT.md decisions

// GainEffect - simple volume as effect
const boost = createGainEffect()
boost.value = 1.5  // +50% volume
sound.addEffect(boost)

// FilterEffect - all BiquadFilter types
const lowpass = createFilterEffect('lowpass', {
  frequency: 800,
  q: 5
})
sound.addEffect(lowpass)

// Remove effect
sound.removeEffect(lowpass)

// Bypass without removing
lowpass.bypass = true

// Wet/dry mix
lowpass.mix = 0.5  // 50% filtered, 50% dry
```

### Using External Effects (Tuna.js)

```typescript
// Source: Tuna.js GitHub documentation
import Tuna from 'tunajs'

const audioContext = await getAudioContext()
const tuna = new Tuna(audioContext)

// Create Tuna effect - has connect() method
const chorus = new tuna.Chorus({
  rate: 1.5,
  feedback: 0.2,
  delay: 0.0045,
  bypass: false
})

const sound = await createSound('guitar.mp3')

// addEffect auto-wraps to provide bypass/mix
sound.addEffect(chorus)

// Now has standard interface
chorus.bypass = true
chorus.mix = 0.7
```

### Visualization with Analyzer

```typescript
// Source: MDN AnalyserNode documentation
const analyzer = createAnalyzer({ fftSize: 256 })
sound.setAnalyzer(analyzer)

// In animation loop
function draw() {
  requestAnimationFrame(draw)

  // Get frequency data (bar chart visualization)
  const frequencyData = analyzer.getFrequencyData()
  // frequencyData is Uint8Array, values 0-255

  // Get waveform data (oscilloscope visualization)
  const waveformData = analyzer.getTimeDomainData()
  // waveformData is Uint8Array, 128 = zero crossing

  // Get precise frequency data in dB
  const decibelData = analyzer.getFloatFrequencyData()
  // Float32Array, values in dB (negative numbers)

  // Draw to canvas...
}

draw()
```

### Effect Chain Ordering

```typescript
// Source: CONTEXT.md decisions
const compressor = createCompressorEffect()  // External or built-in
const eq = createFilterEffect('peaking', { frequency: 1000, gain: 6 })
const reverb = new tuna.Convolver({ impulse: 'hall.wav' })

// Order matters: signal flows left to right
sound.addEffect(compressor)  // Position 0
sound.addEffect(eq)          // Position 1
sound.addEffect(reverb)      // Position 2

// Insert at specific position
const boost = createGainEffect()
sound.addEffect(boost, 0)  // Now first in chain

// Chain: source → boost → compressor → eq → reverb → gain → panner → destination
```

### Configurable Destination

```typescript
// Source: CONTEXT.md decisions
const analyzer = createAnalyzer()
const masterBus = audioContext.createGain()

// Route sound to analyzer instead of speakers
sound.setDestination(analyzer.input)

// Route to a bus for group control
sound.setDestination(masterBus)
masterBus.connect(audioContext.destination)

// Route one sound into another's input (sidechain-style)
// Note: Advanced use case
```

### Debug Mode Usage

```typescript
// Source: CONTEXT.md decisions

// Global debug mode
setDebugMode(true)

// Logs: [ez-audio:event] Piano: play { time: 123.456, ... }
sound.play()

// Per-sound override
sound.debug = false  // Silences this sound even with global debug on

// Another sound
otherSound.debug = true  // This one still logs

// Custom handler for production logging
setDebugHandler((msg) => {
  if (msg.type === 'warning') {
    analytics.track('audio_warning', msg)
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rebuild audio graph per play | Persistent effect chains | 2020+ best practice | Better performance, no glitches |
| Linear wet/dry mix | Equal-power crossfade | Always preferred | Natural-sounding mix |
| ScriptProcessorNode | AudioWorklet | Deprecated 2018 | Better performance (not used here) |
| Synchronous FFT | AnalyserNode polling | Native API | Hardware acceleration |

**Deprecated/outdated:**
- `ScriptProcessorNode`: Deprecated, use AudioWorklet for custom DSP (not needed for this phase)
- `webkitAudioContext`: Unprefixed AudioContext supported everywhere now
- `createJavaScriptNode`: Ancient API, never use

## Open Questions

Things that couldn't be fully resolved:

1. **Effect chain reordering API**
   - What we know: User decided chain reordering should be possible
   - What's unclear: Whether `moveEffect(effect, newPosition)` is better than `removeEffect` + `addEffect`
   - Recommendation: Implement `moveEffect(effect, newPosition)` as cleaner API; internally can use remove/add

2. **Analyzer attachment point**
   - What we know: `sound.setAnalyzer(analyzer)` attaches to a sound
   - What's unclear: Should analyzer attach before or after effects?
   - Recommendation: Attach at the end of chain (after effects, before destination) - shows processed signal

3. **Shared analyzer multiple sounds**
   - What we know: Shareable analyzers are allowed per CONTEXT.md
   - What's unclear: How to route multiple sounds into one analyzer
   - Recommendation: Use a mixer bus pattern - sounds route to bus, bus routes to analyzer

## Sources

### Primary (HIGH confidence)
- [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - Complete API reference
- [MDN BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) - All filter types and properties
- [MDN Web Audio Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) - Pattern for frequency/waveform visualization
- [Tuna.js GitHub](https://github.com/Theodeus/tuna) - Effect library compatibility

### Secondary (MEDIUM confidence)
- [Tone.js Effects Wiki](https://github.com/tonejs/tone.js/wiki/Effects) - Wet/dry implementation reference
- [Web Audio API Book Ch.6](https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch06.html) - Effect architecture patterns
- [Pedalboard Blog Post](https://www.trysmudford.com/blog/pedalboard/) - Bypass and wet/dry implementation

### Tertiary (LOW confidence)
- Tree-shaking research - General JavaScript patterns, not Web Audio specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on official Web Audio API documentation and user decisions
- Architecture: HIGH - Patterns verified against MDN and established libraries
- Pitfalls: HIGH - Well-documented Web Audio API limitations
- Debug implementation: MEDIUM - General JS patterns, not audio-specific

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - Web Audio API is stable)

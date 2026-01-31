# Architecture Patterns for New Features

**Project:** EZ Web Audio
**Research Date:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

Based on analysis of Tone.js, Howler.js, and Web Audio API patterns, the following architecture integrations are recommended:

1. **LayeredSound**: Composite pattern with voice pooling (similar to Tone.js PolySynth)
2. **ADSR Envelopes**: Separate envelope classes that connect to controllers (Tone.js pattern)
3. **Event System**: Custom EventTarget implementation with typed events (Howler.js pattern)
4. **Effects Presets**: Factory pattern with builder API for fluent configuration

All patterns integrate cleanly with existing BaseSound/Controller architecture without breaking changes.

---

## Current Architecture Analysis

### Existing Structure

```
BaseSound (abstract)
├── implements: Playable, Connectable
├── owns: GainNode, StereoPannerNode
├── owns: Controller (SoundController or OscillatorController)
├── defines: connections[] for effect chain
└── abstract: audioSourceNode, setup(), wireConnections()

Controller Pattern
├── BaseParamController (base class)
├── SoundController (for AudioBufferSourceNode)
└── OscillatorController (for OscillatorNode)

Controllers manage:
- Immediate updates (update().to().from())
- Scheduled values (onPlaySet().to().at())
- Ramps (onPlayRamp().from().to().in())
```

### Key Strengths

1. **Clean separation**: Audio nodes (BaseSound) vs parameter automation (Controllers)
2. **Flexible routing**: `connections[]` array allows arbitrary effect insertion
3. **Fluent API**: Chainable methods for parameter control
4. **Single responsibility**: Each class has focused purpose

### Integration Points

For new features to integrate properly, they must respect:

1. **The controller owns all parameter scheduling** - don't bypass controllers
2. **wireConnections() establishes the signal flow** - effects must wire through this
3. **setup() is called on every play** - state must be reestablished each time
4. **AudioBufferSourceNode is disposable** - new node created per play

---

## Pattern 1: LayeredSound (Composite Pattern)

### Overview

LayeredSound allows multiple sounds to play simultaneously as a single logical unit. Think: piano sample with 3 velocity layers, or drum kit with multiple mic positions.

### Architecture from Other Libraries

**Tone.js PolySynth**: "Manages voices of one of the other types of synths, allowing any of the monophonic synthesizers to be polyphonic." ([Tone.js PolySynth](https://tonejs.github.io/docs/15.1.22/classes/PolySynth.html))

Key insights:
- PolySynth is NOT a synthesizer itself, it's a voice manager
- Accepts any monophonic synth as a parameter
- Handles voice allocation and note tracking
- Has `maxPolyphony` limit and `activeVoices` counter

**Web Audio API Pattern**: "AudioBuffers can be reused across plays, making it efficient to create multiple source nodes." ([AudioBufferSourceNode - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode))

Key insight: Create multiple AudioBufferSourceNodes from same buffer, connect all to same destination - Web Audio API naturally mixes them.

### Recommended Implementation

**Option A: Composition Over Inheritance (RECOMMENDED)**

```typescript
class LayeredSound implements Playable, Connectable {
  private layers: Sound[] // or (Playable & Connectable)[]
  private masterGainNode: GainNode
  private masterPannerNode: StereoPannerNode
  private controller: SoundController // manages master gain/pan

  // Delegate Playable methods to all layers
  async play(): Promise<void> {
    await Promise.all(this.layers.map(layer => layer.play()))
  }

  // Implement Connectable by routing through master nodes
  public connections: Connection[] = []

  // Wire layers → masterGain → masterPanner → connections → destination
  private wireConnections(): void {
    this.layers.forEach(layer => {
      layer.connect(this.masterGainNode)
    })
    // Then wire master nodes through connections array
  }
}
```

**Why this works:**
- Reuses existing Sound/Oscillator/SampledNote classes
- Layers maintain individual controllers (per-layer gain/pan/detune)
- Master controller manages composite gain/pan
- Each layer can have different start offsets, loop points, etc.
- No BaseSound inheritance needed (composition is cleaner here)

**Option B: Extend BaseSound**

```typescript
class LayeredSound extends BaseSound {
  private layers: AudioBuffer[]
  private layerNodes: AudioBufferSourceNode[] = []

  protected setup(): void {
    // Create multiple AudioBufferSourceNodes
    this.layerNodes = this.layers.map(buffer => {
      const node = this.audioContext.createBufferSource()
      node.buffer = buffer
      return node
    })
    this.wireConnections()
  }

  protected wireConnections(): void {
    // Connect all layer nodes to same gain node
    this.layerNodes.forEach(node => {
      node.connect(this.gainNode)
    })
    // Then continue normal connection chain
  }

  // audioSourceNode returns a "dummy" or merged node
  public get audioSourceNode(): AudioBufferSourceNode {
    return this.layerNodes[0] // primary layer for API compatibility
  }
}
```

**Why this could work:**
- Fits existing BaseSound pattern
- Inherits all Playable/Connectable methods
- Controller works normally (operates on gainNode)

**Why this is problematic:**
- Multiple audioSourceNodes breaks BaseSound assumptions
- Controller expects single source node
- Harder to apply per-layer processing

**RECOMMENDATION: Use Option A (Composition)**

Composition provides:
- Clearer separation of concerns
- Easier to add layer-specific features later
- Avoids breaking BaseSound abstractions
- More flexible for future enhancements (layer muting, soloing, etc.)

### Data Flow

```
Layer 1 (Sound) → gainNode[1] → pannerNode[1] ─┐
Layer 2 (Sound) → gainNode[2] → pannerNode[2] ─┼→ masterGainNode → masterPannerNode → [connections] → destination
Layer 3 (Sound) → gainNode[3] → pannerNode[3] ─┘
```

### Integration Checklist

- [ ] LayeredSound implements Playable & Connectable
- [ ] Master controller manages composite parameters
- [ ] Individual layers maintain their own controllers
- [ ] Supports all play methods (play, playAt, playIn, stop, etc.)
- [ ] Duration returns longest layer's duration
- [ ] isPlaying is true if ANY layer is playing

---

## Pattern 2: ADSR Envelope

### Overview

ADSR envelopes automate parameter changes over time (attack, decay, sustain, release). Commonly used for gain (amplitude envelope) but can apply to any parameter (filter frequency, detune, etc.).

### Architecture from Other Libraries

**Tone.js Envelope**: "The basic envelope type just outputs a signal in the range of 0-1. This node has only an output and no input." ([Tone.js Envelope Wiki](https://github.com/Tonejs/Tone.js/wiki/Envelope))

Three types:
1. **Tone.Envelope** - outputs 0-1 signal
2. **Tone.AmplitudeEnvelope** - combines Envelope with GainNode to scale audio
3. **Tone.ScaledEnvelope** - configurable min/max range

**Web Audio API Pattern**: "setTargetAtTime() method schedules gradual changes to AudioParam values and is useful for decay or release portions of ADSR envelopes." ([AudioParam.setTargetAtTime - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime))

Key methods for envelope automation:
- `setValueAtTime()` - instant change
- `linearRampToValueAtTime()` - linear slope
- `exponentialRampToValueAtTime()` - exponential curve
- `setTargetAtTime()` - asymptotic approach (decay/release)
- `setValueCurveAtTime()` - custom curves

**Common Implementation Pattern**:

```javascript
// Attack
gainNode.gain.setValueAtTime(0, t_pressed)
gainNode.gain.linearRampToValueAtTime(volume, t_pressed + attackDuration)

// Decay to sustain
gainNode.gain.setTargetAtTime(sustainLevel * volume, t_pressed + attackDuration, decayDuration)

// Release
gainNode.gain.cancelScheduledValues(t_released)
gainNode.gain.setValueAtTime(gainNode.gain.value, t_released)
gainNode.gain.linearRampToValueAtTime(0, t_released + releaseDuration)
```

([Digital Piano with Web Audio API - ADSR](https://www.leafwindow.com/en/digital-piano-with-web-audio-api-5-en/))

### Recommended Implementation

**Separate Envelope Classes (Tone.js pattern)**

```typescript
interface EnvelopeConfig {
  attack: number   // seconds
  decay: number    // seconds
  sustain: number  // 0-1 ratio
  release: number  // seconds
  attackCurve?: 'linear' | 'exponential'
  releaseCurve?: 'linear' | 'exponential'
}

class Envelope {
  constructor(private config: EnvelopeConfig) {}

  // Apply envelope to an AudioParam
  applyTo(param: AudioParam, startTime: number, releaseTime?: number): void {
    const { attack, decay, sustain, release } = this.config

    // Attack
    param.setValueAtTime(0, startTime)
    if (this.config.attackCurve === 'exponential') {
      param.exponentialRampToValueAtTime(1, startTime + attack)
    } else {
      param.linearRampToValueAtTime(1, startTime + attack)
    }

    // Decay to sustain
    const decayStart = startTime + attack
    param.setTargetAtTime(sustain, decayStart, decay / 5) // tau = decay/5 for ~99% completion

    // Release (if time provided)
    if (releaseTime !== undefined) {
      param.cancelScheduledValues(releaseTime)
      param.setValueAtTime(param.value, releaseTime)
      if (this.config.releaseCurve === 'exponential') {
        param.exponentialRampToValueAtTime(0.001, releaseTime + release) // 0.001 instead of 0 for exp
      } else {
        param.linearRampToValueAtTime(0, releaseTime + release)
      }
    }
  }
}

class AmplitudeEnvelope extends Envelope {
  // Convenience wrapper for gain automation
  applyToGainNode(gainNode: GainNode, startTime: number, releaseTime?: number): void {
    this.applyTo(gainNode.gain, startTime, releaseTime)
  }
}
```

### Integration with Controllers

**Option 1: Envelope as Controller Extension (RECOMMENDED)**

Add envelope methods to BaseParamController:

```typescript
interface EnvelopeConfig { /* as above */ }

class BaseParamController {
  // Existing methods...

  public applyEnvelope(type: ControlType, envelope: EnvelopeConfig): {
    at: (startTime: number) => {
      releasing: (releaseTime: number) => void
    }
  } {
    return {
      at: (startTime: number) => {
        return {
          releasing: (releaseTime: number) => {
            const param = this.getAudioParam(type) // gain, detune, etc.
            const env = new Envelope(envelope)
            env.applyTo(param, startTime, releaseTime)
          }
        }
      }
    }
  }
}
```

Usage:
```typescript
const adsr = { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 }
sound.controller.applyEnvelope('gain', adsr)
  .at(audioContext.currentTime)
  .releasing(audioContext.currentTime + 1.0)
```

**Option 2: Standalone Envelope Classes**

Keep envelopes separate, apply them manually:

```typescript
const env = new AmplitudeEnvelope({ attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 })
env.applyToGainNode(sound.gainNode, audioContext.currentTime, releaseTime)
```

**RECOMMENDATION: Option 1 (Controller Extension)**

Reasons:
- Maintains fluent API consistency
- Controller remains single source of truth for parameter automation
- Easier to integrate with onPlaySet/onPlayRamp patterns
- Envelopes become first-class citizens in the API

### Where in Controller Hierarchy?

Add to **BaseParamController** because:
- All controllers share gain/pan parameters (common ADSR targets)
- Keeps envelope logic DRY across SoundController and OscillatorController
- Frequency/detune envelopes can be added to specific controllers as needed

### Data Flow

```
User calls: sound.controller.applyEnvelope('gain', adsr)
            ↓
Controller stores envelope config in new array: this.envelopes[]
            ↓
On playAt(): controller.setValuesAtTimes() applies all envelopes
            ↓
Envelope.applyTo() calls AudioParam methods (setValueAtTime, linearRamp, etc.)
            ↓
GainNode.gain.value changes over time automatically
            ↓
Audio amplitude follows ADSR curve
```

### Integration Checklist

- [ ] Envelope class with applyTo(param, startTime, releaseTime)
- [ ] AmplitudeEnvelope convenience wrapper
- [ ] BaseParamController.applyEnvelope() method
- [ ] Controller tracks envelopes and applies on playAt()
- [ ] Support for attack/release curves (linear, exponential)
- [ ] Proper tau calculation for setTargetAtTime()

---

## Pattern 3: Event System

### Overview

Event system allows users to react to audio lifecycle changes (load, play, stop, end, error) and custom events.

### Architecture from Other Libraries

**Howler.js Event System**: Implements observer pattern through `on()` and `once()` methods. ([Howler.js GitHub](https://github.com/goldfire/howler.js))

Available events:
- Load: "load", "loaderror"
- Playback: "play", "playerror", "end"
- State: "pause", "stop", "resume"

Key characteristics:
- Instance-level events (per Howl object)
- Sound ID-level tracking (multiple plays of same sound)
- Callbacks receive contextual info (sound ID, error codes)

**Web Audio API EventTarget**: "AudioNodes are EventTargets as described in DOM... an AudioContext can be a target of events, therefore it implements the EventTarget interface." ([Web Audio API Spec](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html))

Built-in events:
- `ended` event on AudioScheduledSourceNode
- `statechange` event on AudioContext

Note: "The Web Audio API doesn't support any sort of time-based event dispatch in the main thread for some AudioContext time in the future." ([WebAudio/web-audio-api Issue #473](https://github.com/WebAudio/web-audio-api/issues/473))

**EventTarget Pattern**: JavaScript native pattern using `addEventListener`, `removeEventListener`, `dispatchEvent`.

### Recommended Implementation

**Option 1: Extend EventTarget (RECOMMENDED)**

```typescript
// Define typed events
interface BaseSoundEventMap {
  'play': CustomEvent<{ time: number }>
  'stop': CustomEvent<{ time: number }>
  'end': CustomEvent<{ duration: number }>
  'pause': CustomEvent<{ position: number }>
  'resume': CustomEvent<{ position: number }>
  'load': CustomEvent<{ buffer: AudioBuffer }>
  'error': CustomEvent<{ error: Error, type: 'load' | 'play' }>
}

// Extend BaseSound to inherit from EventTarget
export abstract class BaseSound extends EventTarget implements Connectable, Playable {
  // Existing properties...

  // Typed event methods
  public on<K extends keyof BaseSoundEventMap>(
    type: K,
    listener: (event: BaseSoundEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): this {
    this.addEventListener(type, listener as EventListener, options)
    return this
  }

  public once<K extends keyof BaseSoundEventMap>(
    type: K,
    listener: (event: BaseSoundEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener as EventListener, { once: true })
    return this
  }

  public off<K extends keyof BaseSoundEventMap>(
    type: K,
    listener: (event: BaseSoundEventMap[K]) => void
  ): this {
    this.removeEventListener(type, listener as EventListener)
    return this
  }

  // Emit helper (internal use)
  protected emit<K extends keyof BaseSoundEventMap>(
    type: K,
    detail: BaseSoundEventMap[K]['detail']
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }))
  }

  // Update existing methods to emit events
  public async playAt(time: number): Promise<void> {
    // ... existing logic ...
    this.emit('play', { time })
  }

  public async stopAt(time: number): Promise<void> {
    // ... existing logic ...
    this.emit('stop', { time })
  }
}
```

Usage:
```typescript
const sound = createSound(ctx, buffer)

sound.on('play', (e) => {
  console.log('Started at', e.detail.time)
})

sound.once('end', (e) => {
  console.log('Finished after', e.detail.duration, 'seconds')
})

sound.play()
```

**Option 2: Custom Event Emitter**

Create separate EventEmitter class and compose it into BaseSound.

**Why Option 1 is better:**
- Uses native EventTarget (no dependencies, well-tested)
- Familiar API for web developers
- TypeScript typing with event maps
- Browser-native event propagation
- Smaller bundle size

### Integration Points

Events should fire at these lifecycle moments:

1. **Construction/Loading**
   - `load` - when AudioBuffer is assigned (Sound, Track)
   - `error` - if loading fails

2. **Playback**
   - `play` - in playAt() after audioSourceNode.start()
   - `stop` - in stopAt() after audioSourceNode.stop()
   - `end` - when duration completes (use setTimeout in playAt)

3. **Track-specific** (if extending to Track class)
   - `pause` - when track pauses
   - `resume` - when track resumes
   - `seek` - when position changes

### Handling Scheduled Events

For scheduled playback (playAt in future), events should fire at scheduled time:

```typescript
public async playAt(time: number): Promise<void> {
  const { audioContext } = this
  const { currentTime } = audioContext
  const delay = time - currentTime

  if (delay <= 0) {
    // Play immediately
    this.emit('play', { time })
  } else {
    // Schedule event emission
    this.setTimeout(() => {
      this.emit('play', { time })
    }, delay * 1000)
  }

  // ... rest of playAt logic ...

  // Schedule 'end' event
  if (this.duration.raw) {
    this.setTimeout(() => {
      this.emit('end', { duration: this.duration.raw })
    }, (delay + this.duration.raw) * 1000)
  }
}
```

### Data Flow

```
User action (sound.play())
        ↓
BaseSound.playAt() executes
        ↓
emit('play', { time }) dispatches CustomEvent
        ↓
EventTarget propagates event to listeners
        ↓
User callbacks execute with event data
```

### Integration Checklist

- [ ] BaseSound extends EventTarget
- [ ] Typed event map interface defined
- [ ] on(), once(), off() convenience methods
- [ ] emit() helper for internal use
- [ ] Events fire at correct lifecycle moments
- [ ] Scheduled events use setTimeout for future emission
- [ ] Track-specific events (pause, resume, seek)

---

## Pattern 4: Effects Presets (Factory + Builder Pattern)

### Overview

Effects presets provide pre-configured effect chains (e.g., "Cathedral Reverb", "Telephone Filter", "Tape Saturation") that users can apply to sounds with one method call.

### Architecture from Other Libraries

**audio-effects Library Pattern**: Uses base class with internal node management. ([audio-effects GitHub](https://github.com/Sambego/audio-effects))

Structure:
- `SingleAudioNode` base class
- Each effect extends base class
- Internal `nodes` object contains all Web Audio nodes
- `_node` property = entry point
- `_outputNode` property = exit point
- Supports method chaining: `input.connect(volume).connect(distortion).connect(output)`

**Tone.js Effects**: Uses ToneAudioNode base class with `input` and `output` properties for routing. ([ToneAudioNode docs](https://tonejs.github.io/docs/15.0.4/classes/ToneAudioNode.html))

Methods:
- `connect()` - connect to next node
- `chain()` - connect to multiple nodes in series
- `fan()` - connect to multiple nodes in parallel

**Web Audio API Pattern**: "A simple workflow involves connecting sources to effects, and the effects to the destination." ([web.dev audio effects](https://web.dev/patterns/media/audio-effects))

Standard nodes for effects:
- `createBiquadFilter()` - filters
- `createWaveShaper()` - distortion
- `createConvolver()` - reverb
- `createDelay()` - delay
- `createDynamicsCompressor()` - compression
- `createGain()` - volume

### Recommended Implementation

**Factory Pattern for Presets**

```typescript
// Effect preset interface
interface EffectPreset {
  name: string
  create: (audioContext: AudioContext) => Connection
}

// Factory for built-in presets
class EffectPresets {
  static CathedralReverb: EffectPreset = {
    name: 'Cathedral Reverb',
    create: (ctx: AudioContext) => {
      const convolver = ctx.createConvolver()
      const gain = ctx.createGain()

      // Load impulse response (would be async in real implementation)
      // convolver.buffer = await loadImpulseResponse('cathedral.wav')

      gain.gain.value = 0.5 // wet/dry mix
      convolver.connect(gain)

      return { audioNode: convolver, name: 'Cathedral Reverb' }
    }
  }

  static TelephoneFilter: EffectPreset = {
    name: 'Telephone Filter',
    create: (ctx: AudioContext) => {
      const lowpass = ctx.createBiquadFilter()
      const highpass = ctx.createBiquadFilter()

      highpass.type = 'highpass'
      highpass.frequency.value = 300
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 3000

      highpass.connect(lowpass)

      return { audioNode: highpass, name: 'Telephone Filter' }
    }
  }

  static TapeSaturation: EffectPreset = {
    name: 'Tape Saturation',
    create: (ctx: AudioContext) => {
      const waveshaper = ctx.createWaveShaper()
      const gain = ctx.createGain()

      // Create saturation curve
      const curve = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1
        curve[i] = Math.tanh(x * 2) // soft clipping
      }
      waveshaper.curve = curve

      gain.gain.value = 0.8 // reduce output level
      waveshaper.connect(gain)

      return { audioNode: waveshaper, name: 'Tape Saturation' }
    }
  }
}
```

**Builder Pattern for Custom Effects**

```typescript
class EffectChainBuilder {
  private effects: Connection[] = []

  constructor(private audioContext: AudioContext) {}

  // Add individual effects
  reverb(impulseResponse?: AudioBuffer): this {
    const convolver = this.audioContext.createConvolver()
    if (impulseResponse) convolver.buffer = impulseResponse
    this.effects.push({ audioNode: convolver, name: 'Reverb' })
    return this
  }

  delay(delayTime: number = 0.5, feedback: number = 0.3): this {
    const delay = this.audioContext.createDelay()
    const feedbackGain = this.audioContext.createGain()

    delay.delayTime.value = delayTime
    feedbackGain.gain.value = feedback

    // Create feedback loop
    delay.connect(feedbackGain)
    feedbackGain.connect(delay)

    this.effects.push({ audioNode: delay, name: 'Delay' })
    return this
  }

  lowpass(frequency: number = 1000, q: number = 1): this {
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    this.effects.push({ audioNode: filter, name: 'Lowpass' })
    return this
  }

  highpass(frequency: number = 100, q: number = 1): this {
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    this.effects.push({ audioNode: filter, name: 'Highpass' })
    return this
  }

  distortion(amount: number = 50): this {
    const waveshaper = this.audioContext.createWaveShaper()
    const curve = this.makeDistortionCurve(amount)
    waveshaper.curve = curve
    this.effects.push({ audioNode: waveshaper, name: 'Distortion' })
    return this
  }

  gain(value: number = 1): this {
    const gain = this.audioContext.createGain()
    gain.gain.value = value
    this.effects.push({ audioNode: gain, name: 'Gain' })
    return this
  }

  // Build and return effect chain
  build(): Connection[] {
    return this.effects
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 256
    const curve = new Float32Array(samples)
    const deg = Math.PI / 180
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }
}
```

**Integration with BaseSound**

```typescript
// Add to BaseSound or as utility functions
class BaseSound {
  // Existing code...

  // Apply preset
  applyPreset(preset: EffectPreset): this {
    const connection = preset.create(this.audioContext)
    this.addConnection(connection)
    return this
  }

  // Build custom chain
  buildEffects(): EffectChainBuilder {
    return new EffectChainBuilder(this.audioContext)
  }
}
```

Usage:

```typescript
// Use preset
sound.applyPreset(EffectPresets.CathedralReverb)

// Build custom chain
const effects = sound.buildEffects()
  .highpass(200)
  .distortion(30)
  .delay(0.5, 0.4)
  .reverb()
  .gain(0.7)
  .build()

effects.forEach(effect => sound.addConnection(effect))

// Or fluent version:
sound
  .applyPreset(EffectPresets.TelephoneFilter)
  .changeGainTo(0.8)
  .play()
```

### Where to Store Presets

**Option 1: Static class (shown above)**
- Simple, discoverable
- Easy to tree-shake unused presets
- Can be extended by users

**Option 2: Separate module**
```typescript
// src/effects/presets/index.ts
export { CathedralReverb } from './cathedral-reverb'
export { TelephoneFilter } from './telephone-filter'
// ...
```

**RECOMMENDATION: Option 1 (Static Class)**
- Easier to document
- Single import for all presets
- Namespace prevents naming collisions

### Data Flow

```
User calls: sound.applyPreset(EffectPresets.CathedralReverb)
            ↓
Preset.create() instantiates Web Audio nodes
            ↓
Returns Connection object { audioNode, name }
            ↓
sound.addConnection() adds to connections array
            ↓
wireConnections() rebuilds signal chain
            ↓
source → [effects] → gain → pan → destination
```

### Integration Checklist

- [ ] EffectPreset interface defined
- [ ] EffectPresets static class with common presets
- [ ] EffectChainBuilder with fluent API
- [ ] BaseSound.applyPreset() method
- [ ] BaseSound.buildEffects() method
- [ ] Presets handle wet/dry mix appropriately
- [ ] Effects maintain proper gain staging

---

## Build Order Recommendations

Based on dependency analysis, recommended build order:

### Phase 1: Foundation (Events)
**Build Event System First**
- No dependencies on other new features
- Provides infrastructure for other features to emit events
- Simple, well-understood pattern
- Can be tested independently

**Deliverables:**
- BaseSound extends EventTarget
- Typed event map
- on/once/off methods
- Events fire from play/stop methods

**Why first:** All other features will want to emit events (LayeredSound fires when all layers end, ADSR fires on envelope phase changes, Effects fire on parameter changes).

---

### Phase 2: ADSR Envelopes
**Build ADSR Second**
- Depends on: Event system (for envelope phase events)
- Independent of LayeredSound and Effects
- Integrates cleanly with existing controller pattern

**Deliverables:**
- Envelope class with applyTo()
- AmplitudeEnvelope wrapper
- BaseParamController.applyEnvelope()
- Attack/decay/sustain/release automation

**Why second:**
- Natural extension of existing controller pattern
- LayeredSound will want to use envelopes (per-layer ADSR)
- Effects presets might want envelope-controlled parameters
- Can be tested with existing Sound/Oscillator classes

---

### Phase 3: Effects Presets
**Build Effects Third**
- Depends on: Event system (for effect parameter change events)
- Independent of LayeredSound and ADSR
- Works with existing connections[] pattern

**Deliverables:**
- EffectPreset interface
- EffectPresets static class
- EffectChainBuilder
- BaseSound.applyPreset() and buildEffects()

**Why third:**
- Extends existing connections architecture
- LayeredSound will want effects (applied to composite or individual layers)
- Can test with existing Sound classes
- More complex than ADSR, simpler than LayeredSound

---

### Phase 4: LayeredSound
**Build LayeredSound Last**
- Depends on: Event system, ADSR (for layer envelopes), Effects (for layer processing)
- Most complex feature
- Integrates all previous patterns

**Deliverables:**
- LayeredSound class (composite pattern)
- Master gain/pan controller
- Per-layer parameter control
- Layer muting/soloing (optional)

**Why last:**
- Can leverage all previously built features
- Most complex integration point
- Benefits from having stable Event/ADSR/Effects APIs
- Easiest to test when other features are solid

---

## Cross-Feature Integration Examples

### Example 1: LayeredSound with Per-Layer ADSR

```typescript
const layer1 = createSound(ctx, pianoSoft)
const layer2 = createSound(ctx, pianoMedium)
const layer3 = createSound(ctx, pianoLoud)

// Apply different ADSR to each layer
layer1.controller.applyEnvelope('gain', { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.8 })
layer2.controller.applyEnvelope('gain', { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.6 })
layer3.controller.applyEnvelope('gain', { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 })

const layered = new LayeredSound(ctx, [layer1, layer2, layer3])

// Master envelope affects composite
layered.controller.applyEnvelope('gain', { attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 })
```

### Example 2: Effects with ADSR-Controlled Parameters

```typescript
const sound = createSound(ctx, buffer)

// Add filter effect
const filterEffect = sound.buildEffects().lowpass(5000).build()[0]
sound.addConnection(filterEffect)

// Animate filter frequency with envelope
const filterNode = sound.getNodeFrom<BiquadFilterNode>('Lowpass')
const filterEnvelope = new Envelope({ attack: 0.5, decay: 1, sustain: 0.3, release: 0.8 })
filterEnvelope.applyTo(filterNode.frequency, ctx.currentTime)
```

### Example 3: LayeredSound with Master Effects and Events

```typescript
const layered = new LayeredSound(ctx, [sound1, sound2, sound3])

// Apply reverb to composite
layered.applyPreset(EffectPresets.CathedralReverb)

// Listen for events
layered.on('play', (e) => console.log('All layers started'))
layered.on('end', (e) => console.log('All layers finished'))

layered.play()
```

---

## Anti-Patterns to Avoid

### 1. Bypassing Controllers
**DON'T:**
```typescript
sound.gainNode.gain.value = 0.5 // Bypasses controller
```

**DO:**
```typescript
sound.changeGainTo(0.5) // Uses controller
```

**Why:** Controllers maintain state and handle scheduled values. Direct manipulation breaks this.

### 2. Storing AudioSourceNode References
**DON'T:**
```typescript
const source = sound.audioSourceNode
// Later...
source.start() // Source may have been replaced in setup()
```

**DO:**
```typescript
sound.play() // Always use playback methods
```

**Why:** setup() creates new AudioBufferSourceNode on each play. Stored references become stale.

### 3. Manual Connection Wiring
**DON'T:**
```typescript
sound.audioSourceNode.connect(customNode)
customNode.connect(sound.gainNode)
```

**DO:**
```typescript
sound.addConnection({ audioNode: customNode, name: 'CustomEffect' })
```

**Why:** wireConnections() manages the full chain. Manual wiring breaks on next play.

### 4. Forgetting Envelope Release
**DON'T:**
```typescript
envelope.applyTo(gainNode.gain, startTime) // No release time
// Sustain goes on forever
```

**DO:**
```typescript
envelope.applyTo(gainNode.gain, startTime, releaseTime)
// Or handle release separately based on user input
```

**Why:** ADSR without release doesn't make musical sense. Sounds never fully decay.

### 5. Shared Effect Instances
**DON'T:**
```typescript
const reverb = ctx.createConvolver()
sound1.addConnection({ audioNode: reverb, name: 'Reverb' })
sound2.addConnection({ audioNode: reverb, name: 'Reverb' }) // Same instance!
```

**DO:**
```typescript
sound1.applyPreset(EffectPresets.Reverb) // Creates new instance
sound2.applyPreset(EffectPresets.Reverb) // Creates new instance
```

**Why:** Web Audio nodes can only have one input. Shared instances create routing conflicts.

---

## Testing Strategies

### Unit Testing

**Events:**
```typescript
test('play event fires with correct time', async () => {
  const listener = vi.fn()
  sound.on('play', listener)
  await sound.play()
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({
    detail: { time: expect.any(Number) }
  }))
})
```

**ADSR:**
```typescript
test('envelope applies attack ramp', () => {
  const envelope = new Envelope({ attack: 0.5, decay: 0.2, sustain: 0.7, release: 0.3 })
  const param = mockAudioParam()
  envelope.applyTo(param, 0)

  expect(param.setValueAtTime).toHaveBeenCalledWith(0, 0)
  expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.5)
})
```

**Effects:**
```typescript
test('preset creates correct nodes', () => {
  const connection = EffectPresets.TelephoneFilter.create(ctx)
  expect(connection.audioNode).toBeInstanceOf(BiquadFilterNode)
  expect(connection.name).toBe('Telephone Filter')
})
```

**LayeredSound:**
```typescript
test('layers all play simultaneously', async () => {
  const layer1 = createSound(ctx, buffer1)
  const layer2 = createSound(ctx, buffer2)
  const layered = new LayeredSound(ctx, [layer1, layer2])

  await layered.play()

  expect(layer1.isPlaying).toBe(true)
  expect(layer2.isPlaying).toBe(true)
})
```

### Integration Testing

Test cross-feature scenarios:
- LayeredSound with effects on individual layers
- ADSR envelopes controlling effect parameters
- Events firing from layered sounds
- Complex chains: LayeredSound → ADSR → Effects → Events

---

## Performance Considerations

### LayeredSound
- **Voice pooling:** Reuse Sound instances instead of creating new ones per play
- **Lazy layer loading:** Load layers on-demand for large sample libraries
- **Layer limits:** Cap maximum layers (8-16) to prevent context overload

### ADSR
- **AudioParam automation is efficient:** Web Audio API handles scheduling natively
- **Avoid frequent envelope changes:** Set envelope once, reuse for multiple plays
- **Use exponential ramps carefully:** exponentialRampToValueAtTime can't reach 0 (use 0.001)

### Effects
- **Limit effect instances:** Each effect = multiple AudioNodes (memory cost)
- **Share impulse responses:** ConvolverNode buffers can be shared across instances
- **Disable unused effects:** Disconnect instead of setting wet/dry to 0

### Events
- **EventTarget is fast:** Native implementation, minimal overhead
- **Remove listeners:** Use off() or { once: true } to prevent memory leaks
- **Batch event emissions:** Don't emit on every sample (use setTimeout for scheduling)

---

## API Consistency Guidelines

To maintain consistency with existing ez-audio API:

### 1. Fluent Chaining
All mutating methods return `this`:
```typescript
sound
  .applyPreset(EffectPresets.Reverb)
  .changeGainTo(0.8)
  .on('end', handleEnd)
  .play()
```

### 2. Time-Based Methods Follow Pattern
- Immediate: `method()` (e.g., `play()`)
- Delayed: `methodIn(seconds)` (e.g., `playIn(2)`)
- Scheduled: `methodAt(time)` (e.g., `playAt(ctx.currentTime + 2)`)

Apply to new features:
```typescript
envelope.triggerAttack() // immediate
envelope.triggerAttackIn(1) // delayed
envelope.triggerAttackAt(ctx.currentTime + 1) // scheduled
```

### 3. Factory Functions Over Constructors
Existing pattern:
```typescript
createSound(ctx, buffer)
createOscillator(ctx, options)
```

New pattern:
```typescript
createLayeredSound(ctx, sounds)
createEnvelope(config)
```

### 4. Options Objects for Complex Config
```typescript
createLayeredSound(ctx, sounds, {
  name: 'Piano Layers',
  masterGain: 0.8,
  masterPan: 0.2
})
```

### 5. Typed Parameters
Use string unions, not magic strings:
```typescript
type ControlType = 'frequency' | 'gain' | 'detune' | 'pan'
type EventType = 'play' | 'stop' | 'end' | 'error'
```

---

## Migration Path (Backward Compatibility)

All new features can be added without breaking existing API:

### Events
```typescript
// Before (no events)
sound.play()

// After (events optional)
sound.on('play', handlePlay) // opt-in
sound.play()
```

**No breaking changes:** EventTarget is transparent if not used.

### ADSR
```typescript
// Before (manual parameter scheduling)
sound.onPlayRamp('gain').from(0).to(1).in(0.5)

// After (ADSR available)
sound.controller.applyEnvelope('gain', adsrConfig) // new option
```

**No breaking changes:** Existing parameter methods still work.

### Effects
```typescript
// Before (manual connection)
const reverb = ctx.createConvolver()
sound.addConnection({ audioNode: reverb, name: 'Reverb' })

// After (presets available)
sound.applyPreset(EffectPresets.Reverb) // convenience method
```

**No breaking changes:** Existing addConnection still works.

### LayeredSound
```typescript
// Before (manual management)
const s1 = createSound(ctx, buf1)
const s2 = createSound(ctx, buf2)
s1.play()
s2.play()

// After (composite available)
const layered = createLayeredSound(ctx, [s1, s2]) // new class
layered.play()
```

**No breaking changes:** Original Sound class unchanged.

---

## Documentation Requirements

For each new feature, provide:

1. **Concept Guide** - "What is X and when to use it"
2. **API Reference** - TypeScript signatures and parameter descriptions
3. **Examples** - Common use cases with code samples
4. **Integration Guide** - How X works with Y
5. **Migration Guide** - Upgrading from manual approach

Example structure:
```
docs/
├── guide/
│   ├── events.md
│   ├── envelopes.md
│   ├── effects.md
│   └── layered-sounds.md
├── api/
│   ├── LayeredSound.md
│   ├── Envelope.md
│   ├── EffectPresets.md
│   └── Events.md
└── examples/
    ├── piano-with-adsr.md
    ├── effect-chains.md
    └── complex-instruments.md
```

---

## Summary: Integration Recommendations

| Feature | Pattern | Integration Point | Build Order |
|---------|---------|-------------------|-------------|
| **LayeredSound** | Composite (composition over inheritance) | New class implementing Playable & Connectable | Phase 4 (last) |
| **ADSR Envelopes** | Separate class + controller extension | Add to BaseParamController | Phase 2 |
| **Event System** | EventTarget inheritance | BaseSound extends EventTarget | Phase 1 (first) |
| **Effects Presets** | Factory + Builder | Static class + builder instance | Phase 3 |

### Key Architectural Decisions

1. **LayeredSound uses composition, not inheritance** - Cleaner separation, more flexible
2. **ADSR lives in controllers** - Maintains single source of truth for parameter automation
3. **Events use native EventTarget** - No dependencies, familiar API, TypeScript-friendly
4. **Effects use factory + builder** - Discoverable presets, fluent custom chains

### Data Flow Overview

```
User API Call
    ↓
BaseSound/LayeredSound methods
    ↓
Controllers handle parameter automation (including ADSR)
    ↓
wireConnections() establishes signal chain (including effects)
    ↓
Web Audio API nodes process audio
    ↓
Events fire at lifecycle moments
    ↓
User callbacks respond
```

### No Breaking Changes Required

All features integrate with existing architecture through:
- Extension (EventTarget inheritance)
- Composition (LayeredSound contains Sounds)
- Addition (new methods on existing classes)
- Encapsulation (controllers manage new envelope logic)

The existing BaseSound/Controller separation remains intact and is actually strengthened by these patterns.

---

## Sources

**Architecture Patterns:**
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio API Basic Concepts - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API)
- [Web Audio FAQ - Chrome Developers](https://developer.chrome.com/blog/web-audio-faq)

**LayeredSound / Composite Pattern:**
- [AudioBufferSourceNode - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
- [Tone.js PolySynth Documentation](https://tonejs.github.io/docs/15.1.22/classes/PolySynth.html)

**ADSR Envelopes:**
- [Tone.js Envelope Wiki](https://github.com/Tonejs/Tone.js/wiki/Envelope)
- [AudioParam.setTargetAtTime - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)
- [Digital Piano with Web Audio API - ADSR](https://www.leafwindow.com/en/digital-piano-with-web-audio-api-5-en/)
- [envelope-generator GitHub](https://github.com/itsjoesullivan/envelope-generator)

**Event System:**
- [Howler.js GitHub](https://github.com/goldfire/howler.js)
- [Web Audio API Specification](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html)
- [AudioScheduledSourceNode.ended Event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event)

**Effects Presets:**
- [audio-effects GitHub](https://github.com/Sambego/audio-effects)
- [ToneAudioNode Documentation](https://tonejs.github.io/docs/15.0.4/classes/ToneAudioNode.html)
- [How to add effects to audio - web.dev](https://web.dev/patterns/media/audio-effects)

**Additional Resources:**
- [Building a Synthesizer in TypeScript - ITNEXT](https://itnext.io/building-a-synthesizer-in-typescript-5a85ea17e2f2)
- [Tone.js GitHub Repository](https://github.com/Tonejs/Tone.js)

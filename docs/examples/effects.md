---
title: Effects
---

# Effects

Shape your audio with filters, gain effects, and custom audio processing. This page covers the built-in effects, effect chains, and integrating external effect libraries.

::: warning Browser Requirement
Interactive demos require a modern browser with Web Audio API support. Click the Play button to activate audio.
:::

## Try It: Real-Time Filter Control

Experiment with different filter types and parameters. Try switching between the oscillator and white noise sources to hear how filters affect different signals.

<script setup>
import FilterDemo from '../.vitepress/theme/components/FilterDemo.vue'
</script>

<FilterDemo />

## Effect Types

EZ Web Audio provides two built-in effect types and a wrapper for external effects:

| Effect | Purpose | Use Cases |
|--------|---------|-----------|
| `FilterEffect` | Frequency-based tone shaping | EQ, bass boost, removing harshness |
| `GainEffect` | Volume control in effect chain | Ducking, sidechain, level matching |
| `EffectWrapper` | Wrap external effects | Tuna.js, custom AudioNodes |

## FilterEffect

Filters modify the frequency content of audio. The FilterEffect wraps the Web Audio BiquadFilterNode with wet/dry mixing and bypass controls.

### Filter Types

| Type | Description | Key Parameters |
|------|-------------|----------------|
| `lowpass` | Passes frequencies below cutoff | frequency, q |
| `highpass` | Passes frequencies above cutoff | frequency, q |
| `bandpass` | Passes frequencies around center | frequency, q |
| `lowshelf` | Boosts/cuts below frequency | frequency, gain |
| `highshelf` | Boosts/cuts above frequency | frequency, gain |
| `peaking` | Boosts/cuts around frequency | frequency, q, gain |
| `notch` | Removes specific frequency | frequency, q |
| `allpass` | Phase shift at frequency | frequency, q |

### Creating Filters

```typescript
import { createSound, createFilterEffect, getAudioContext } from 'ez-web-audio'

const sound = await createSound('/audio/music.mp3')
const ctx = await getAudioContext()

// Lowpass filter - remove high frequencies
const lowpass = createFilterEffect(ctx, 'lowpass', {
  frequency: 1000,  // Cutoff frequency in Hz
  q: 1              // Resonance (default: 1)
})

sound.addEffect(lowpass)
sound.play()
```

### Adjusting Filter Parameters

```typescript
const filter = createFilterEffect(ctx, 'lowpass', { frequency: 800 })

// Adjust parameters in real-time
filter.frequency = 1200  // Move cutoff higher
filter.q = 4             // Increase resonance

// For shelf and peaking filters
const shelf = createFilterEffect(ctx, 'highshelf', {
  frequency: 3000,
  gain: 6  // Boost by 6dB
})
```

### Common Filter Recipes

#### Bass Boost
```typescript
const bassBoost = createFilterEffect(ctx, 'lowshelf', {
  frequency: 200,
  gain: 8  // +8dB boost below 200Hz
})
```

#### Remove Harsh Frequencies
```typescript
const deHarsh = createFilterEffect(ctx, 'lowpass', {
  frequency: 8000,
  q: 0.7  // Gentle rolloff
})
```

#### Telephone/Radio Effect
```typescript
// Remove lows
const highpass = createFilterEffect(ctx, 'highpass', {
  frequency: 300
})
// Remove highs
const lowpass = createFilterEffect(ctx, 'lowpass', {
  frequency: 3400
})

sound.addEffect(highpass)
sound.addEffect(lowpass)
```

#### Notch Filter (Remove Hum)
```typescript
const removeHum = createFilterEffect(ctx, 'notch', {
  frequency: 60,   // 60Hz power line hum
  q: 30            // Narrow notch
})
```

## GainEffect

GainEffect provides volume control within the effect chain. Unlike the sound's built-in gain, this can be positioned anywhere in the effect chain.

```typescript
import { createGainEffect, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const gainEffect = createGainEffect(ctx, 0.5)  // 50% volume

// Adjust volume
gainEffect.value = 0.8  // 80% volume
gainEffect.value = 1.5  // 150% (boost)
```

### Gain Before vs After Filter

```typescript
// Gain BEFORE filter: affects what goes into the filter
const preGain = createGainEffect(ctx, 2.0)
const filter = createFilterEffect(ctx, 'lowpass', { frequency: 1000 })

sound.addEffect(preGain)   // First: boost signal
sound.addEffect(filter)     // Second: filter boosted signal

// Gain AFTER filter: affects final output
const postGain = createGainEffect(ctx, 0.5)
sound.addEffect(filter)
sound.addEffect(postGain)
```

## Effect Chains

Effects are processed in order. The audio signal flows through each effect sequentially.

```
Audio Source -> Effect 1 -> Effect 2 -> Effect 3 -> Gain -> Pan -> Destination
```

### Building an Effect Chain

```typescript
const sound = await createSound('/audio/sample.mp3')
const ctx = await getAudioContext()

// Create effects
const highpass = createFilterEffect(ctx, 'highpass', { frequency: 80 })
const lowpass = createFilterEffect(ctx, 'lowpass', { frequency: 8000 })
const boost = createGainEffect(ctx, 1.2)

// Add in order (highpass first, then lowpass, then boost)
sound.addEffect(highpass)
sound.addEffect(lowpass)
sound.addEffect(boost)

sound.play()
```

### Managing Effects

```typescript
// Get current effects
const effects = sound.getEffects()
console.log(`${effects.length} effects in chain`)

// Remove a specific effect
sound.removeEffect(lowpass)

// Insert effect at specific position
const newEffect = createFilterEffect(ctx, 'peaking', { frequency: 1000 })
sound.addEffect(newEffect, 0)  // Insert at beginning
```

## Bypass and Mix Controls

Every effect supports bypass (on/off) and mix (wet/dry blend):

```typescript
const filter = createFilterEffect(ctx, 'lowpass', { frequency: 800 })

// Bypass: temporarily disable the effect
filter.bypass = true   // Effect is bypassed (100% dry signal)
filter.bypass = false  // Effect is active

// Mix: blend between dry (original) and wet (processed) signal
filter.mix = 0    // 0% wet = original signal only
filter.mix = 0.5  // 50% wet = equal blend
filter.mix = 1    // 100% wet = fully processed (default)
```

::: tip Wet/Dry Mixing
The mix control uses equal-power crossfade for natural-sounding blending. This prevents volume dips when mixing between dry and wet signals.
:::

### Toggling Effects On/Off

```typescript
const filter = createFilterEffect(ctx, 'lowpass', { frequency: 800 })
sound.addEffect(filter)

// Toggle effect bypass
function toggleFilter() {
  filter.bypass = !filter.bypass
  // When bypass changes, call rewireEffects if needed
  sound.rewireEffects()
}
```

## External Effects with wrapEffect

Use `wrapEffect` to integrate effects from external libraries (like Tuna.js) or custom AudioNodes.

### Wrapping a WaveShaper (Distortion)

```typescript
import { wrapEffect, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()

// Create a WaveShaperNode for distortion
const distortion = ctx.createWaveShaper()
distortion.curve = makeDistortionCurve(400)
distortion.oversample = '4x'

// Wrap it to get bypass/mix controls
const wrapped = wrapEffect(ctx, distortion)
wrapped.mix = 0.7  // 70% distortion

sound.addEffect(wrapped)
```

### Wrapping Tuna.js Effects

[Tuna.js](https://github.com/Theodeus/tuna) provides additional effects like chorus, phaser, and tremolo.

```typescript
import Tuna from 'tunajs'
import { wrapEffect, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const tuna = new Tuna(ctx)

// Create a chorus effect
const chorus = new tuna.Chorus({
  rate: 1.5,
  feedback: 0.2,
  delay: 0.0045,
  bypass: false
})

// Wrap it for standard Effect interface
const wrapped = wrapEffect(ctx, chorus)
wrapped.mix = 0.5  // 50% chorus blend

sound.addEffect(wrapped)

// Access original effect parameters
wrapped.effect.rate = 2.0  // Adjust Tuna's parameters
```

### The ExternalEffect Interface

Any object with a `connect()` method can be wrapped:

```typescript
interface ExternalEffect {
  connect(destination: AudioNode): void
}
```

This includes:
- Native AudioNodes (WaveShaperNode, ConvolverNode, DelayNode)
- Tuna.js effects
- Custom effect chains
- Third-party Web Audio libraries

## Using an Analyzer for Visualization

Attach an Analyzer to visualize the processed audio signal:

```typescript
import { createSound, createFilterEffect, createAnalyzer, getAudioContext } from 'ez-web-audio'

const sound = await createSound('/audio/music.mp3')
const ctx = await getAudioContext()

// Add effects
const filter = createFilterEffect(ctx, 'lowpass', { frequency: 2000 })
sound.addEffect(filter)

// Create and attach analyzer
const analyzer = createAnalyzer(ctx, {
  fftSize: 2048,
  smoothingTimeConstant: 0.8
})
sound.attachAnalyzer(analyzer)

// Get frequency data for visualization
const dataArray = new Uint8Array(analyzer.frequencyBinCount)

function draw() {
  requestAnimationFrame(draw)
  analyzer.getByteFrequencyData(dataArray)
  // Use dataArray to draw visualization
}

sound.play()
draw()
```

::: info Analyzer Position
The analyzer is always at the end of the signal chain (after all effects, gain, and pan). This means it visualizes the fully processed audio that you hear.
:::

## Complete Example: DJ-Style EQ

```typescript
import { createTrack, createFilterEffect, getAudioContext } from 'ez-web-audio'

const track = await createTrack('/audio/song.mp3')
const ctx = await getAudioContext()

// Three-band EQ
const lowEQ = createFilterEffect(ctx, 'lowshelf', {
  frequency: 320,
  gain: 0  // Will be adjusted by user
})

const midEQ = createFilterEffect(ctx, 'peaking', {
  frequency: 1000,
  q: 0.5,
  gain: 0
})

const highEQ = createFilterEffect(ctx, 'highshelf', {
  frequency: 3200,
  gain: 0
})

track.addEffect(lowEQ)
track.addEffect(midEQ)
track.addEffect(highEQ)

// Adjust EQ from UI sliders
function updateEQ(band: 'low' | 'mid' | 'high', dB: number) {
  switch (band) {
    case 'low': lowEQ.gain = dB; break
    case 'mid': midEQ.gain = dB; break
    case 'high': highEQ.gain = dB; break
  }
}

track.play()
```

## Next Steps

- [Basic Playback](/examples/basic-playback) - Load and play audio files
- [Synthesis](/examples/synthesis) - Generate sounds with oscillators
- [Audio Routing](/examples/audio-routing) - Connect sounds to custom effects
- [Synth Drum Kit](/examples/synth-drum-kit) - Build synthesized percussion
- [Core Concepts](/guide/concepts) - Understand the audio system architecture

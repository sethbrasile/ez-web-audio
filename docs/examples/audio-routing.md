---
title: Audio Routing and Effects Chain - Custom Signal Processing
description: Route audio through custom effect chains with gain, filters, and distortion. Visualize the signal path from source through effects to output.
---

# Audio Routing & Custom Effects

Learn how to integrate custom Web Audio effects into your signal chain using the adapter pattern.

<llm-exclude>
<DistortionDemo />
</llm-exclude>

<llm-only>

Audio routing demo with distortion effect: toggle distortion on/off, adjust distortion amount, and hear the effect on a loaded audio sample.

</llm-only>

### Replicating This Demo

The demo above creates an oscillator, wraps a WaveShaper as an effect, and wires sliders to update parameters in real-time:

```typescript
import { createOscillator, getAudioContext, wrapEffect } from 'ez-web-audio'

const osc = await createOscillator({ frequency: 200, type: 'sine' })
osc.changeGainTo(0.3)
osc.play()

// Create and wrap a WaveShaper distortion effect
const ctx = await getAudioContext()
const distNode = ctx.createWaveShaper()
distNode.curve = makeDistortionCurve(400)
distNode.oversample = '4x'

const effect = wrapEffect(distNode)
effect.mix = 0.7
osc.addEffect(effect)

// Wire sliders to effect parameters
amountSlider.addEventListener('input', (e) => {
  // Update the underlying WaveShaper curve
  distNode.curve = makeDistortionCurve(Number(e.target.value))
})

mixSlider.addEventListener('input', (e) => {
  effect.mix = Number(e.target.value) // 0 = dry, 1 = wet
})

bypassCheckbox.addEventListener('change', (e) => {
  effect.bypass = e.target.checked // Routes audio around the effect
})

// Dynamically remove the effect
osc.removeEffect(effect) // Signal chain reconnects automatically
```

The key pattern: `wrapEffect()` gives any AudioNode a consistent interface with `mix` and `bypass` properties. Update `mix` and `bypass` directly — changes apply immediately. For the underlying node's own parameters (like WaveShaper's `curve`), access it via `effect.effect`.

## How Effects Work

Every sound in ez-web-audio has a signal chain:

```
Source → [Effects] → Gain → Pan → Destination
```

The **`wrapEffect()`** function is an adapter that makes any Web Audio `AudioNode` work with ez-web-audio's effect system. It handles routing, gain mixing, and bypass switching automatically.

### The Adapter Pattern

Web Audio nodes have `input` and `output` points. The `wrapEffect()` function wraps any node with a consistent interface:

```typescript
interface Effect {
  input: AudioNode // Connect audio to this
  output: AudioNode // Connect this to next node
  bypass: boolean // true = route around effect
  mix: number // 0-1, wet/dry balance
}
```

This means you can use **any** Web Audio effect — built-in or from a library — with the same API.

## Basic Effect Integration

Here's how to add a WaveShaper distortion effect:

```typescript
import { createOscillator, getAudioContext, wrapEffect } from 'ez-web-audio'

// Create audio source
const oscillator = await createOscillator({ frequency: 200, type: 'sawtooth' })

// Get the AudioContext
const ctx = await getAudioContext()

// Create a WaveShaper node for distortion
const distortionNode = ctx.createWaveShaper()
distortionNode.curve = makeDistortionCurve(400)
distortionNode.oversample = '4x'

// Wrap it with ez-web-audio's effect interface
const effect = wrapEffect(distortionNode)
effect.mix = 0.7 // 70% wet, 30% dry

// Add to the signal chain
oscillator.addEffect(effect)

// Start playback
oscillator.play()
```

### Creating a Distortion Curve

The WaveShaper distortion curve is a mathematical function that shapes the waveform:

```typescript
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }

  return curve
}
```

Higher `amount` values create more aggressive distortion by applying a steeper transfer function.

## Mix and Bypass Controls

Every wrapped effect has built-in wet/dry mixing and bypass:

```typescript
// Adjust wet/dry balance (0 = dry only, 1 = wet only)
effect.mix = 0.5 // 50/50 blend

// Bypass the effect entirely (routes audio around it)
effect.bypass = true

// Re-enable
effect.bypass = false
```

This makes it easy to implement A/B comparison and effect intensity controls.

## Removing Effects

Effects can be dynamically added and removed:

```typescript
// Add effect
oscillator.addEffect(effect)

// Remove effect
oscillator.removeEffect(effect)
```

The signal chain automatically reconnects when effects are removed.

## Beyond Distortion

The adapter pattern works with **any** Web Audio node:

### Reverb (ConvolverNode)

```typescript
const convolver = ctx.createConvolver()
convolver.buffer = await loadImpulseResponse('/audio/hall-reverb.wav')
const reverb = wrapEffect(convolver)
reverb.mix = 0.3
sound.addEffect(reverb)
```

### Delay (DelayNode + Feedback)

```typescript
const delay = ctx.createDelay()
delay.delayTime.value = 0.5

const feedback = ctx.createGain()
feedback.gain.value = 0.4

// Connect delay output to feedback, feedback to delay input
delay.connect(feedback)
feedback.connect(delay)

const delayEffect = wrapEffect(delay)
sound.addEffect(delayEffect)
```

### Third-Party Effect Libraries

You can also integrate external effect libraries like [Tuna.js](https://github.com/Theodeus/tuna):

```typescript
import Tuna from 'tunajs'

const tuna = new Tuna(ctx)
const chorus = new tuna.Chorus({
  rate: 1.5,
  feedback: 0.2,
  delay: 0.0045
})

const chorusEffect = wrapEffect(chorus)
sound.addEffect(chorusEffect)
```

## API Used

- **`wrapEffect(node)`** — Wrap any AudioNode with ez-web-audio's effect interface
- **`sound.addEffect(effect)`** — Add effect to signal chain
- **`sound.removeEffect(effect)`** — Remove effect from signal chain
- **`effect.bypass`** — Boolean to bypass effect
- **`effect.mix`** — Number (0-1) for wet/dry balance
- **`getAudioContext()`** — Get the global AudioContext

## Next Steps

- [Sampled Drum Kit](/examples/sampled-drum-kit) — Multi-zone velocity-sensitive pads
- [Synth Keyboard](/examples/synth-keyboard) — Oscillator playground with filter controls
- [Timing Basics](/examples/timing) — Master Web Audio's scheduling system

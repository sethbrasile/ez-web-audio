---
title: Ambient Sound Generator - Generative Audio in JavaScript
description: Create ambient soundscapes with layered oscillators and randomized parameters. Demonstrates generative audio techniques with the Web Audio API.
---

# Ambient Sound Generator

Create layered ambient soundscapes by combining oscillators and filtered white noise. This demo shows how to build complex, evolving textures from simple synthesis building blocks.

<script setup>
import AmbientGenerator from '../.vitepress/theme/components/AmbientGenerator.vue'
</script>

<AmbientGenerator />

## How It Works

This ambient generator combines three distinct layers to create a rich, evolving soundscape:

### 1. Drone Layer

A low-frequency sine wave (60-120 Hz) provides the foundation. The drone uses a slow ADSR envelope with:
- **Long attack (1s)**: Fades in gently
- **High sustain (0.8)**: Maintains presence
- **Long release (2s)**: Fades out smoothly

This creates a pad-like quality that feels organic rather than mechanical.

### 2. Texture Layer

White noise filtered through a lowpass filter creates atmospheric texture. By adjusting the filter cutoff frequency (200-4000 Hz), you can transform the sound from:
- **Low frequencies (200-600 Hz)**: Deep rumble, like distant thunder
- **Mid frequencies (600-1500 Hz)**: Wind or ocean waves
- **High frequencies (1500-4000 Hz)**: Airy hiss or rain

### 3. Shimmer Layer

A high-frequency triangle wave (400-800 Hz) adds ethereal overtones. Set to very low gain (0.08), it creates subtle brightness without dominating the mix. The long envelope (attack: 1.5s, release: 2.5s) ensures smooth transitions.

## Code Example

Here's how to build an ambient generator from scratch:

```typescript
import {
  createFilterEffect,
  createOscillator,
  createWhiteNoise,
  getAudioContext
} from 'ez-web-audio'

// Get the audio context
const audioContext = await getAudioContext()

// Create drone layer - low sine wave
const drone = await createOscillator({
  frequency: 80,
  type: 'sine',
  envelope: {
    attack: 1.0,
    decay: 0.5,
    sustain: 0.8,
    release: 2.0
  }
})
drone.changeGainTo(0.4) // Set mix level

// Create texture layer - filtered white noise
const texture = await createWhiteNoise()
const lowpass = createFilterEffect(audioContext, 'lowpass', {
  frequency: 800,
  Q: 1.0
})
texture.addEffect(lowpass)
texture.changeGainTo(0.15)

// Create shimmer layer - high triangle wave
const shimmer = await createOscillator({
  frequency: 600,
  type: 'triangle',
  envelope: {
    attack: 1.5,
    decay: 0.3,
    sustain: 0.9,
    release: 2.5
  }
})
shimmer.changeGainTo(0.08)

// Start all layers
drone.play()
texture.play()
shimmer.play()

// Update parameters in real-time
drone.update('frequency').to(100).as('ratio')
lowpass.frequency.value = 1200
shimmer.update('frequency').to(700).as('ratio')

// Stop all layers
drone.stop()
texture.stop()
shimmer.stop()
```

## API Used

This example demonstrates:

- `createOscillator()` - Create synthesized tones with configurable waveforms and envelopes
- `createWhiteNoise()` - Generate white noise for texture and atmosphere
- `createFilterEffect()` - Create filters for tone shaping
- `changeGainTo()` - Control volume levels for mixing
- `update().to().as()` - Real-time parameter changes
- `addEffect()` - Route audio through effects

## Next Steps

- **[Effects](/examples/effects)** - Learn more about filter types and parameters
- **[Synth Keyboard](/examples/synth-keyboard)** - Explore ADSR envelopes in musical context
- **[Audio Routing](/examples/audio-routing)** - Advanced effect routing techniques

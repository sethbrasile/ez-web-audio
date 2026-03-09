---
title: LFO Modulation
description: Interactive demo of LFO tremolo, vibrato, and filter sweep effects
---

# LFO Modulation

Explore Low Frequency Oscillator (LFO) modulation effects. An LFO generates a slow waveform that modulates an audio parameter -- creating effects like tremolo (volume wobble), vibrato (pitch wobble), and filter sweeps (tone color changes).

Try the presets to hear each effect, then adjust the rate, depth, and waveform shape to explore how LFO parameters affect the sound.

<script setup>
import LFODemo from '../.vitepress/theme/components/LFODemo.vue'
</script>

<LFODemo />

## How It Works

- **Tremolo** modulates the oscillator's gain (volume), creating a pulsing effect
- **Vibrato** modulates the oscillator's frequency (pitch), creating a wobbling effect
- **Filter Sweep** modulates a lowpass filter's cutoff frequency, creating a wah-like tone sweep

### Code Example

```typescript
import { createLFO, createOscillator } from 'ez-web-audio'

const oscillator = await createOscillator({ frequency: 330, type: 'sawtooth' })

// Create an LFO at 5 Hz with sine wave
const lfo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })

// Connect to gain for tremolo effect
lfo.connect(oscillator, 'gain')

lfo.start()
oscillator.play()
```

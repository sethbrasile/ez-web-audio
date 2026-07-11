---
title: LFO Modulation - Web Audio Tremolo, Vibrato, and Filter Sweep
description: Interactive demo of LFO tremolo, vibrato, and filter sweep effects
---

# LFO — One Knob, Three Effects

Explore Low Frequency Oscillator (LFO) modulation effects. An LFO generates a slow waveform that modulates an audio parameter -- creating effects like tremolo (volume wobble), vibrato (pitch wobble), and filter sweeps (tone color changes).

Try the presets to hear each effect, then adjust the rate, depth, and waveform shape to explore how LFO parameters affect the sound.

<script setup>
import LFODemo from '../.vitepress/theme/components/LFODemo.vue'
</script>

<llm-exclude>
<LFODemo />
</llm-exclude>

<llm-only>

Interactive LFO modulation demo with three tabs: Tremolo (gain modulation), Vibrato (pitch modulation), and Filter Sweep (cutoff frequency modulation). Controls include rate slider (Hz), depth slider, waveform selector (sine/triangle/square/sawtooth/sample-and-hold), and preset buttons. A canvas displays the current LFO waveform in real time.

</llm-only>

## How It Works

- **Tremolo** modulates the oscillator's gain (volume), creating a pulsing effect
- **Vibrato** modulates the oscillator's frequency (pitch), creating a wobbling effect
- **Filter Sweep** modulates a lowpass filter's cutoff frequency, creating a wah-like tone sweep

### Code Example

```typescript
import { createLFO, createOscillator } from 'ez-web-audio'

const oscillator = await createOscillator({ frequency: 440, type: 'sawtooth' })

// Create an LFO at 5 Hz with sine wave
const lfo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })

// Connect to gain for tremolo effect
lfo.connect(oscillator, 'gain')

lfo.start()
oscillator.play()

// When done, stop in reverse order — LFO first, then source
lfo.stop()
lfo.disconnect()
oscillator.stop()
```

### Cleanup

Always stop the LFO before stopping the audio source to avoid a brief gain pop:

```typescript
lfo.stop()
lfo.disconnect() // Remove from all modulation targets
oscillator.stop()
```

For automatic cleanup tied to the sound's lifecycle, use `syncLifecycle`:

```typescript
lfo.connect(oscillator, 'gain', { syncLifecycle: true })
// LFO stops and disconnects automatically when oscillator.stop() is called
oscillator.stop()
```

## Further Reading

- [LFO Guide](/guide/lfo) -- full API reference, waveform types, depth units, and lifecycle options
- [Effects Chain](/examples/effects-chain) -- combine LFO modulation with delay, reverb, and EQ
- [PolySynth](/examples/polysynth) -- apply tremolo or vibrato to polyphonic voices

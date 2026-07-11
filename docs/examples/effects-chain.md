---
title: Effects Chain - Web Audio Signal Processing Pipeline
description: Build and tweak an audio effects chain with delay, reverb, compressor, and EQ. Toggle effects on/off, adjust parameters, and reorder effects in the signal path.
---

# Effects Chain

Chain delay, reverb, compressor, and EQ effects. Toggle each on/off, adjust parameters in real time, reorder them to hear the sonic difference, and switch between an oscillator and an audio file source.

<script setup>
import EffectsChainDemo from '../.vitepress/theme/components/EffectsChainDemo.vue'
</script>

<llm-exclude>
<EffectsChainDemo />
</llm-exclude>

<llm-only>

Interactive effects chain demo with four effects: Delay (time, feedback, mix), Reverb (decay, wet), Compressor (threshold, ratio), and EQ (low/mid/high gain). Each effect has bypass and reorder controls. A signal flow diagram shows the current chain order. Supports switching between an oscillator source and a loaded audio file.

</llm-only>

## How It Works

Audio flows through the effects in a fixed signal path:

```
Source → Effect 1 → Effect 2 → Effect 3 → Effect 4 → Output
```

Each effect is inserted using `addEffects()`, which wires the effects into the audio graph in order. Reordering the effects changes the signal path -- putting compression before reverb sounds different from reverb before compression.

### Building a Chain

```typescript
import {
  createCompressor,
  createDelay,
  createEQ,
  createOscillator,
  createReverb,
} from 'ez-web-audio'

const source = await createOscillator({ frequency: 440, type: 'sawtooth' })

const delay = createDelay({ time: 0.3, feedback: 0.4, mix: 0.3 })
const reverb = createReverb({ decay: 2.5, wet: 0.35 })
const compressor = createCompressor({ threshold: -24, ratio: 4 })
const eq = createEQ({ low: 0, mid: 0, high: 2 })

// Effects are connected in array order
source.addEffects([delay, reverb, compressor, eq])
source.play()
```

### Bypassing an Effect

```typescript
delay.bypass = true // Dry signal passes through unaffected
delay.bypass = false // Effect re-enters the signal chain
```

### Reordering Effects

Reorder by removing and re-adding effects in the new order:

```typescript
// Move compressor before reverb
source.removeEffect(reverb)
source.removeEffect(compressor)
source.addEffects([compressor, reverb])
```

### Cleanup

```typescript
source.stop()
source.dispose() // Disconnects all effects and releases audio nodes
```

## Effect Parameters

| Effect | Key Parameters | Notes |
|--------|---------------|-------|
| **Delay** | `time` (0-1s), `feedback` (0-1), `mix` (0-1) | Higher feedback = longer echo tail |
| **Reverb** | `decay` (seconds), `wet` (0-1) | Simulates room reflections |
| **Compressor** | `threshold` (dBFS), `ratio` (N:1) | Reduces dynamic range |
| **EQ** | `low`, `mid`, `high` (dB gain) | Three-band shelving/peak EQ |

## Further Reading

- [LFO — One Knob, Three Effects](/examples/lfo-modulation) -- add tremolo or filter sweep to a signal in the chain
- [Audio Routing](/examples/audio-routing) -- custom routing beyond the linear chain
- [Effects](/examples/effects) -- individual effect deep-dives

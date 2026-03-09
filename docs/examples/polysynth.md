---
title: Polyphonic Synth
description: Interactive demo of polyphonic voice allocation with steal strategies and ADSR envelopes
---

# Polyphonic Synth

Play chords on the piano keyboard and explore how voice allocation works. Adjust the maximum number of voices, try different steal strategies, and shape the sound with ADSR envelope presets.

<script setup>
import PolySynthDemo from '../.vitepress/theme/components/PolySynthDemo.vue'
</script>

<PolySynthDemo />

## How It Works

The [`PolySynth`](/guide/poly-synth) manages a pool of oscillator voices. When you play more notes than the maximum voice count, it uses the selected **steal strategy** to decide which voice to replace:

- **Oldest (LRU)** -- replaces the least recently used voice
- **Oldest Active** -- replaces the voice that has been playing the longest
- **Quietest** -- replaces the voice with the lowest current gain

Try setting max voices to 1 for monophonic mode -- every new note steals the previous one, making the concept immediately obvious.

### Code Example

```typescript
import { createPolySynth, frequencyMap } from 'ez-web-audio'

// Create a 4-voice polyphonic synth
const synth = await createPolySynth({
  maxVoices: 4,
  stealStrategy: 'lru',
  type: 'triangle',
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 },
})

// Play a chord
const c4 = synth.play({ frequency: frequencyMap['C4'] })
const e4 = synth.play({ frequency: frequencyMap['E4'] })
const g4 = synth.play({ frequency: frequencyMap['G4'] })

// Listen for voice stealing
synth.on('voicestolen', (event) => {
  console.log('Voice stolen!', event.detail)
})

// Stop individual notes
await c4.stop()
await e4.stop()
await g4.stop()
```

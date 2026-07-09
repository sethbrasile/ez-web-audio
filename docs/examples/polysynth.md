---
title: Polyphonic Synth - Web Audio Voice Allocation Demo
description: Interactive demo of polyphonic voice allocation with steal strategies and ADSR envelopes
---

# Polyphonic Synth

Polyphonic synthesis means multiple notes can play simultaneously, each on its own independent voice. When you press more keys than the configured voice limit, the synth must decide which existing voice to silence and reuse -- this is called **voice stealing**.

Play chords on the piano keyboard and explore how voice allocation works. Adjust the maximum number of voices, try different steal strategies, and shape the sound with ADSR envelope presets.

<script setup>
import PolySynthDemo from '../.vitepress/theme/components/PolySynthDemo.vue'
</script>

<llm-exclude>
<PolySynthDemo />
</llm-exclude>

<llm-only>

Interactive polyphonic synthesizer demo with a one-octave piano keyboard playable by mouse, touch, or computer keyboard (A-J keys). Controls include max voices (1-8), steal strategy selector (LRU / Oldest Active / Quietest), ADSR envelope sliders, and preset buttons (Piano, Pad, Pluck, Lead). A voice count indicator shows how many voices are active in real time.

</llm-only>

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

// Play a chord — each call returns a VoiceHandle
const c4 = synth.play({ frequency: frequencyMap.C4 })
const e4 = synth.play({ frequency: frequencyMap.E4 })
const g4 = synth.play({ frequency: frequencyMap.G4 })

// Listen for voice stealing
synth.on('voicestolen', (event) => {
  const { stolenFrequency, newFrequency, time } = event.detail
  console.log(`Voice at ${stolenFrequency} Hz stolen by ${newFrequency} Hz at t=${time}`)
})

// Stop individual notes
c4.stop()
e4.stop()
g4.stop()
```

### `voicestolen` Event Payload

| Property | Type | Description |
|----------|------|-------------|
| `stolenFrequency` | `number` | Frequency (Hz) of the voice that was stolen |
| `newFrequency` | `number` | Frequency (Hz) of the incoming note that triggered the steal |
| `time` | `number` | AudioContext time when the steal occurred |
| `source` | `PolySynth` | The PolySynth instance that emitted the event |

### Cleanup

```typescript
synth.stopAll() // Immediately stop all active voices
synth.dispose() // Full cleanup -- releases all voices and disconnects effects
```

## Further Reading

- [PolySynth Guide](/guide/poly-synth) -- full API reference, voice handles, filters, and effects
- [Synth Keyboard](/examples/synth-keyboard) -- manual polyphony with individual oscillators
- [LFO Modulation](/examples/lfo-modulation) -- add tremolo or vibrato to synth voices

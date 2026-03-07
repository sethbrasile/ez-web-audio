---
title: JavaScript Synth Keyboard - Polyphonic Web Audio Synthesizer
description: Play a polyphonic synthesizer keyboard in the browser. Choose waveforms, adjust ADSR envelopes, and play chords with mouse or keyboard input.
---

<script setup>
import SynthKeyboard from '../.vitepress/theme/components/SynthKeyboard.vue'
</script>

# Synth Keyboard

An interactive polyphonic synthesizer with ADSR envelope control. Play multiple notes simultaneously using your mouse, touch, or computer keyboard.

<llm-exclude>
<SynthKeyboard />
</llm-exclude>

<llm-only>

Playable polyphonic synthesizer keyboard with waveform selection, ADSR envelope controls, and mouse/keyboard input. Supports chords.

</llm-only>

## How It Works

The synth keyboard creates a separate oscillator for each note you play, enabling polyphonic playback. Each oscillator uses the selected waveform type and ADSR envelope settings.

When you press a key:
1. A new oscillator is created with the note's frequency
2. The ADSR envelope shapes the sound over time
3. The oscillator plays until you release the key
4. On release, the envelope's release phase fades out the sound

## ADSR Envelope

The envelope controls how a sound evolves over time with four parameters:

- **Attack**: Time to reach full volume after note starts (0-2 seconds)
- **Decay**: Time to fall from peak to sustain level (0-2 seconds)
- **Sustain**: Volume level while holding the key (0-1, where 1 is full volume)
- **Release**: Time to fade to silence after releasing the key (0-3 seconds)

Try the preset buttons to hear different envelope shapes:

- **Piano**: Quick attack, medium decay, low sustain - mimics acoustic piano
- **Pad**: Slow attack, high sustain - smooth, ambient sound
- **Pluck**: Instant attack, no sustain - percussive, plucked sound
- **Lead**: Quick attack, high sustain - typical synthesizer lead

## Code Example

```typescript
import { createOscillator, frequencyMap } from 'ez-web-audio'

// Create oscillator with ADSR envelope
const synth = await createOscillator({
  frequency: frequencyMap.A4, // 440 Hz
  type: 'triangle',
  envelope: {
    attack: 0.01, // 10ms to full volume
    decay: 0.3, // 300ms decay to sustain
    sustain: 0.4, // Hold at 40% volume
    release: 0.5 // 500ms fade out
  }
})

synth.changeGainTo(0.3)
synth.play()

// Stop when user releases key
// The release envelope automatically fades out
synth.stop()
```

## Polyphonic Playback

Multiple oscillators can play simultaneously. Track them in a Map to manage individual notes:

```typescript
const oscillators = new Map()

async function playNote(note: string) {
  const frequency = frequencyMap[note]
  const osc = await createOscillator({ frequency, envelope })
  osc.play()
  oscillators.set(note, osc)
}

function stopNote(note: string) {
  const osc = oscillators.get(note)
  if (osc) {
    osc.stop()
    oscillators.delete(note)
  }
}
```

## API Used

- **`createOscillator(options)`** - Creates a synthesizer oscillator
- **`frequencyMap`** - Note name to frequency lookup (e.g., `frequencyMap['A4']` = 440)
- **`envelope`** - ADSR envelope configuration for sound shaping
- **Oscillator types**: `sine`, `square`, `sawtooth`, `triangle`

## Next Steps

- Explore the [Oscillator API](/api/classes/Oscillator) for more synthesis options
- Try other [interactive examples](/examples/)
- Learn about [core concepts](/guide/concepts) in the guide

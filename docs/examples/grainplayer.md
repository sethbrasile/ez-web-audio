---
title: GrainPlayer - Web Audio Granular Synthesis Demo
description: Interactive granular synthesis demo — independently control pitch and playback speed, adjust grain parameters, and scrub the waveform canvas to explore granular textures.
---

# GrainPlayer

Granular synthesis lets you independently control **pitch** and **playback speed** -- something impossible with traditional audio playback. Drag the waveform to set the read position, adjust grain size for texture variation, and add jitter for organic randomness.

<script setup>
import GrainPlayerDemo from '../.vitepress/theme/components/GrainPlayerDemo.vue'
</script>

<llm-exclude>
<GrainPlayerDemo />
</llm-exclude>

<llm-only>

Interactive granular synthesis demo with a waveform canvas showing the audio buffer. Click or drag to set the grain read position. Controls include pitch (semitones, independent of speed), playback speed (independent of pitch), grain size, overlap, and jitter. Preset buttons provide ready-made textures: Normal, Freeze, Slow Motion, Choppy, and Pitched. Play/Stop button triggers continuous granular playback.

</llm-only>

## How It Works

The `createGrainPlayer()` function reads tiny overlapping slices of audio (called **grains**) and plays them back continuously. Because each grain is independently pitch-shifted, the overall pitch can change without affecting how fast the buffer is being read -- and vice versa.

### Key API

```typescript
import { createSound, createGrainPlayer } from 'ez-web-audio'

const sound = await createSound('/audio/sample.mp3')
const grain = await createGrainPlayer(sound.audioBuffer, {
  grainSize: 0.1,  // seconds per grain
  overlap: 0.05,   // grain crossfade overlap in seconds
  jitter: 0,       // position randomization (0-1)
  loop: true,
})

grain.play()
grain.pitch = 7       // up a perfect fifth (semitones) -- speed unchanged
grain.position = 0.5  // jump to middle of buffer
grain.grainSize = 0.2 // larger grains = smoother texture
```

`pitch` is measured in **semitones**: 12 = one octave up, -12 = one octave down, 7 = a perfect fifth.

### Interactive Controls

| Control | What It Does |
|---------|-------------|
| **Waveform canvas** | Click or drag to set the grain read position |
| **Pitch** | Shifts pitch in semitones without changing speed |
| **Speed** | Advances the read position faster or slower without changing pitch |
| **Grain Size** | Larger = smoother; smaller = more granular artifacts |
| **Overlap** | Crossfade between grains for smoother texture |
| **Jitter** | Randomizes grain start position -- adds organic movement |

### Cleanup

```typescript
grain.stop()
grain.dispose() // Stops all scheduled grains and releases the buffer reference
```

## Further Reading

- [GrainPlayer Guide](/guide/grain-player) -- full API reference, effects, and parameter details
- [LFO Modulation](/examples/lfo-modulation) -- modulate grain position or pitch with an LFO
- [Effects Chain](/examples/effects-chain) -- add reverb, delay, or compression to grain output

---
title: GrainPlayer - Granular Synthesis
description: Interactive granular synthesis demo — independently control pitch and playback speed, adjust grain parameters, and scrub the waveform canvas to explore granular textures.
---

# GrainPlayer

Granular synthesis lets you independently control **pitch** and **playback speed** — something impossible with traditional audio playback. Drag the waveform to set the read position, adjust grain size for texture variation, and add jitter for organic randomness.

<script setup>
import GrainPlayerDemo from '../.vitepress/theme/components/GrainPlayerDemo.vue'
</script>

<GrainPlayerDemo />

## How It Works

The `createGrainPlayer()` function reads tiny overlapping slices of audio (called **grains**) and plays them back continuously. Because each grain is independently pitch-shifted, the overall pitch can change without affecting how fast the buffer is being read — and vice versa.

### Key API

```typescript
import { createSound, createGrainPlayer } from 'ez-web-audio'

const sound = await createSound('/audio/sample.mp3')
const grain = await createGrainPlayer(sound.audioBuffer, {
  grainSize: 0.1,  // seconds per grain
  overlap: 0.05,   // grain crossfade overlap
  jitter: 0,       // position randomization (0–1)
  loop: true,
})

grain.play()
grain.pitch = 7       // up a fifth — speed unchanged
grain.position = 0.5  // jump to middle of buffer
grain.grainSize = 0.2 // larger grains = smoother texture
```

### Interactive Controls

| Control | What It Does |
|---------|-------------|
| **Waveform canvas** | Click or drag to set the grain read position |
| **Pitch** | Shifts pitch in semitones without changing speed |
| **Speed** | Advances the read position faster or slower without changing pitch |
| **Grain Size** | Larger = smoother; smaller = more granular artifacts |
| **Overlap** | Crossfade between grains for smoother texture |
| **Jitter** | Randomizes grain start position — adds organic movement |

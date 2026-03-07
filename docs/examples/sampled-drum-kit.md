---
title: Sampled Drum Kit - Play Real Drum Samples in JavaScript
description: Trigger realistic drum sounds from audio samples with round-robin variation. Interactive pads for kick, snare, hi-hat, and more.
---

# Sampled Drum Kit

Play realistic drum sounds with round-robin sample variations for more natural playback.

<script setup>
import SampledDrumKit from '../.vitepress/theme/components/SampledDrumKit.vue'
</script>

<llm-exclude>
<SampledDrumKit />
</llm-exclude>

<llm-only>
Clickable drum pad interface triggering sampled kick, snare, hi-hat, and percussion sounds with round-robin sample variation.
</llm-only>

## What is Round-Robin?

Round-robin is a technique where multiple recordings of the same instrument are cycled through during playback. This creates a more natural, realistic sound compared to playing the same sample repeatedly.

**Why it matters:**
- **Prevents the "machine gun" effect** — repeatedly playing one sample sounds artificial and robotic
- **Adds variation** — each sample has slight differences in tone, attack, and decay
- **Sounds more human** — mimics how real drummers never hit a drum exactly the same way twice

In this demo, each drum pad cycles through 3 different recordings. Watch the sample counter to see which variation is playing.

## How It Works

The `createSampler()` function loads multiple audio files and automatically rotates through them on each `play()` call:

```typescript
import { createSampler } from 'ez-web-audio'

const kick = await createSampler([
  '/audio/kick1.wav',
  '/audio/kick2.wav',
  '/audio/kick3.wav'
])

kick.play() // Plays kick1
kick.play() // Plays kick2
kick.play() // Plays kick3
kick.play() // Plays kick1 (wraps around)
```

Each call to `play()` automatically advances to the next sample in the array, creating natural variation without any manual tracking.

## Comparison with Synthesis

Compare this sampled drum kit with the [Synth Drum Kit](/examples/synth-drum-kit) which creates all sounds from synthesis. Sampled drums sound more realistic but require larger audio files, while synthesized drums are more flexible and use zero bandwidth.

**Sampled drums:**
- ✅ Realistic, authentic instrument sound
- ✅ Natural acoustic characteristics
- ❌ Larger file sizes (3 samples × 3 drums = ~2.8MB)
- ❌ Fixed timbre (can't change the sound much)

**Synthesized drums:**
- ✅ Tiny file size (code only)
- ✅ Fully customizable (frequency, waveform, filter, envelope)
- ❌ Harder to make sound realistic
- ❌ Requires synthesis knowledge

## API Used

This example demonstrates:

- **`createSampler(urls)`** — Create a round-robin sampler from audio file URLs
- **`sampler.play()`** — Play the next sample in rotation
- **Loading multiple files** — Each sampler loads 3 WAV files (~300-500KB each)

## Next Steps

- Explore [Drum Machine](/examples/drum-machine) to sequence these samples into rhythmic patterns
- Try [Soundfont Piano](/examples/soundfont-piano) for another sampling-based instrument
- Learn about [synthesis](/examples/synth-drum-kit) as an alternative to samples

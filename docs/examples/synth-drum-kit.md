---
title: Synthesized Drum Kit - Create Drum Sounds with Oscillators
description: Generate drum sounds purely from synthesis — kick drums from sine waves, snares from noise, hi-hats from square waves. No audio files needed.
---

# Synth Drum Kit

Create realistic drum sounds entirely from synthesis — no audio files needed. This example demonstrates advanced synthesis techniques using oscillators, white noise, and filters to build kick, snare, and hi-hat sounds from scratch.

## Try It: Synthesized Drums

Tap the pads to hear drum sounds created entirely from synthesis. Each sound is generated in real-time using oscillators and filters.

<SynthDrumKit />

## How Each Sound Works

### Kick Drum

The kick drum uses a **frequency sweep** technique. A triangle oscillator starts at 150 Hz and quickly drops to near 0 Hz, creating that characteristic "punch" sound.

```typescript
import { createOscillator } from 'ez-web-audio'

const kick = await createOscillator({
  frequency: 150,
  type: 'triangle'
})

// Frequency sweep: 150Hz → 0.01Hz in 100ms
kick.onPlayRamp('frequency').from(150).to(0.01).in(0.1)

// Gain envelope: full volume → silence in 100ms
kick.onPlayRamp('gain').from(1).to(0).in(0.1)

kick.changeGainTo(0.8)
kick.play()

setTimeout(() => kick.stop(), 200)
```

**Why triangle wave?** Triangle waves have fewer harmonics than square or sawtooth, giving the kick a cleaner, more focused low-end punch.

**Why the frequency sweep?** Real kick drums have a pitch that drops as the drumhead settles. This sweep mimics that natural behavior.

### Snare Drum

The snare is **two layers** playing simultaneously:

1. **Tonal body** ("meat") - Sine oscillator with frequency sweep (100 → 60 Hz)
2. **Snare crack** - White noise with highpass filter (1000 Hz cutoff)

Both layers are combined with `createLayeredSound()` to ensure they start at exactly the same AudioContext timestamp.

```typescript
import { createFilterEffect, createLayeredSound, createOscillator, createWhiteNoise } from 'ez-web-audio'

// Layer 1: Tonal body
const body = await createOscillator({
  frequency: 100,
  type: 'sine'
})
body.onPlayRamp('frequency').from(100).to(60).in(0.1)
body.onPlayRamp('gain').from(1).to(0.01).in(0.1)

// Layer 2: Snare crack
const noise = await createWhiteNoise()

const highpass = createFilterEffect('highpass', {
  frequency: 1000,
  q: 1
})

noise.addEffect(highpass)
noise.onPlayRamp('gain').from(1).to(0.001).in(0.1)

// Combine layers for synchronized playback
const snare = await createLayeredSound([body, noise])
snare.playFor(0.1)
```

**Why layer?** Real snare drums have both a tonal component (the drum shell) and a bright, crackling component (the snare wires). `createLayeredSound()` synchronizes them to the same start time for a tight, cohesive sound.

**Try the breakdown buttons** above to hear each layer separately and understand how they combine.

### Hi-Hat

The hi-hat uses **multiple square oscillators** at harmonic ratios with highpass and bandpass filters. These create that characteristic metallic, shimmering sound.

```typescript
import { createFilterEffect, createLayeredSound, createOscillator } from 'ez-web-audio'

const fundamentalFreq = 40

// Metallic ratios: 2, 3, 4.16, 5.43, 6.79, 8.21
const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]

const oscillators = await Promise.all(
  ratios.map(async (ratio) => {
    const osc = await createOscillator({
      frequency: fundamentalFreq * ratio,
      type: 'square'
    })

    // Highpass filter removes bass frequencies
    const highpass = createFilterEffect('highpass', {
      frequency: 7000,
      q: 1
    })

    // Bandpass filter isolates the metallic shimmer around 10kHz
    const bandpass = createFilterEffect('bandpass', {
      frequency: 10000,
      q: 1
    })

    osc.addEffect(highpass)
    osc.addEffect(bandpass)

    // ADSR-style envelope: quick attack, sustain, then decay
    osc.onPlayRamp('gain').from(0.00001).to(1).in(0.02)
    osc.onPlaySet('gain').to(0.3).endingAt(0.03)
    osc.onPlaySet('gain').to(0.00001).endingAt(0.3)
    return osc
  })
)

// Use LayeredSound for synchronized playback
const hihat = await createLayeredSound(oscillators)
hihat.playFor(0.1)
```

**Why multiple oscillators?** Real cymbals vibrate at many inharmonic frequencies simultaneously. Using multiple oscillators at slightly dissonant ratios creates that complex metallic timbre.

**Why highpass + bandpass filters?** Cymbals have very little low-frequency content. The highpass filter (7000 Hz) removes bass frequencies, while the bandpass filter (10000 Hz) isolates the bright, metallic shimmer that makes a hi-hat sound like a hi-hat.

### Bass Drop

A long, dramatic frequency sweep often used in electronic music:

```typescript
const bassDrop = await createOscillator({
  frequency: 100,
  type: 'sine'
})

// Linear frequency sweep (steady pitch drop) and exponential gain decay
bassDrop.onPlayRamp('frequency', 'linear').from(100).to(0.01).in(10)
bassDrop.onPlayRamp('gain').from(1).to(0.01).in(10)
bassDrop.playFor(10)
```

## Try the Snare Breakdown

Use the breakdown buttons above to hear the snare components separately:

- **Meat Only** - Just the sine oscillator (tonal body)
- **Crack Only** - Just the filtered white noise (snare wires)
- **Full Snare** - Both layers together

This demonstrates how layering different synthesis techniques creates realistic, complex sounds.

## Synthesis vs. Samples

**Advantages of synthesis:**
- **Zero file size** - No audio files to download
- **Infinite variation** - Change pitch, length, timbre in real-time
- **Perfectly loopable** - No clicks or pops
- **Educational** - Understand how sounds are made

**When to use samples instead:**
- **Realistic acoustic instruments** - Hard to synthesize convincingly
- **Complex textures** - Easier to record than build
- **Quick iteration** - Faster to find the right sample than tune synthesis

For electronic music and retro games, synthesis is often the better choice. For orchestral or realistic sounds, samples work better.

## API Used

- `createOscillator()` - Creates synthesizers with different waveforms
- `createWhiteNoise()` - Generates white noise for percussion "crack"
- `createFilterEffect()` - Shapes frequency content (highpass, bandpass, etc.)
- `createLayeredSound()` - Synchronizes multiple sounds to the same start time
- `onPlayRamp()` - Schedules smooth parameter transitions during playback
- `onPlaySet()` - Schedules instant parameter changes at specific times
- `playFor()` - Plays a sound for a specific duration then stops
- `addEffect()` - Routes audio through effects

## Next Steps

- [XY Pad](/examples/xy-pad) - Real-time parameter control with visual feedback
- [Effects](/examples/effects) - Explore different filter types and parameters
- [Synthesis](/examples/synthesis) - Learn about ADSR envelopes and waveforms

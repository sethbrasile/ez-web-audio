---
title: Synth Drum Kit
---

# Synth Drum Kit

Create realistic drum sounds entirely from synthesis — no audio files needed. This example demonstrates advanced synthesis techniques using oscillators, white noise, and filters to build kick, snare, and hi-hat sounds from scratch.

::: warning Browser Requirement
Audio playback requires user interaction (click/tap) to start. This is a browser security requirement that cannot be bypassed.
:::

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

1. **Tonal body** ("meat") - Triangle oscillator with frequency sweep (100 → 60 Hz)
2. **Snare crack** - White noise with highpass filter (1000 Hz cutoff)

```typescript
import { createOscillator, createWhiteNoise, createFilterEffect, getAudioContext } from 'ez-web-audio'

// Layer 1: Tonal body
const body = await createOscillator({
  frequency: 100,
  type: 'triangle'
})
body.onPlayRamp('frequency').from(100).to(60).in(0.15)
body.onPlayRamp('gain').from(1).to(0).in(0.15)
body.changeGainTo(0.6)
body.play()

// Layer 2: Snare crack
const ctx = await getAudioContext()
const noise = await createWhiteNoise()

const highpass = createFilterEffect(ctx, 'highpass', {
  frequency: 1000,
  q: 1
})

noise.addEffect(highpass)
noise.onPlayRamp('gain').from(1).to(0).in(0.15)
noise.changeGainTo(0.4)
noise.play()
```

**Why layer?** Real snare drums have both a tonal component (the drum shell) and a bright, crackling component (the snare wires). Layering synthesis mimics this natural sound.

**Try the breakdown buttons** above to hear each layer separately and understand how they combine.

### Hi-Hat

The hi-hat uses **multiple square oscillators** at harmonic ratios with a highpass filter. These create that characteristic metallic, shimmering sound.

```typescript
import { createOscillator, createFilterEffect, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const fundamentalFreq = 40

// Metallic ratios: 2, 3, 4.16, 5.43, 6.79, 8.21
const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]

const oscillators = await Promise.all(
  ratios.map(async ratio => {
    const osc = await createOscillator({
      frequency: fundamentalFreq * ratio,
      type: 'square'
    })

    // Highpass filter for metallic character
    const highpass = createFilterEffect(ctx, 'highpass', {
      frequency: 7000,
      q: 1
    })

    osc.addEffect(highpass)
    osc.onPlayRamp('gain').from(0.3).to(0).in(0.08)
    osc.changeGainTo(0.15) // Quiet - multiple oscillators add up
    return osc
  })
)

// Play all simultaneously
oscillators.forEach(osc => osc.play())
```

**Why multiple oscillators?** Real cymbals vibrate at many inharmonic frequencies simultaneously. Using multiple oscillators at slightly dissonant ratios creates that complex metallic timbre.

**Why highpass filter?** Cymbals have very little low-frequency content. The highpass filter (7000 Hz) removes bass frequencies, leaving only the bright, shimmery highs.

### Bass Drop

A long, dramatic frequency sweep often used in electronic music:

```typescript
const bassDrop = await createOscillator({
  frequency: 100,
  type: 'triangle'
})

// 10-second sweep: 100Hz → 0.01Hz
bassDrop.onPlayRamp('frequency').from(100).to(0.01).in(10)
bassDrop.onPlayRamp('gain').from(0.6).to(0).in(10)
bassDrop.play()
```

## Try the Snare Breakdown

Use the breakdown buttons above to hear the snare components separately:

- **Meat Only** - Just the triangle oscillator (tonal body)
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
- `createFilterEffect()` - Shapes frequency content (highpass, lowpass, etc.)
- `onPlayRamp()` - Schedules parameter changes during playback
- `addEffect()` - Routes audio through effects

## Next Steps

- [XY Pad](/examples/xy-pad) - Real-time parameter control with visual feedback
- [Effects](/examples/effects) - Explore different filter types and parameters
- [Synthesis](/examples/synthesis) - Learn about ADSR envelopes and waveforms

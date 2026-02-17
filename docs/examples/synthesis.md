---
title: Web Audio Synthesis - Oscillators and Filters in JavaScript
description: Create synthesized sounds using oscillators with waveform types, frequency control, and audio filters. Interactive demo with lowpass, highpass, and bandpass filters.
---

# Synthesis

Generate sounds programmatically with oscillators. This page covers waveform types, ADSR envelopes for shaping tone, and musical note generation.

## Try It: Oscillator Demo

Experiment with different waveforms and frequencies. The note name updates in real-time as you change the frequency.

<OscillatorDemo />

### Code

```typescript
import { createOscillator } from 'ez-web-audio'

async function playSynth() {
  const synth = await createOscillator({
    frequency: 440, // A4 note
    type: 'sine' // Waveform type
  })

  synth.play()

  // Stop after 1 second
  setTimeout(() => synth.stop(), 1000)
}
```

## Waveform Types

Each waveform has a distinct character:

| Type | Sound | Use Cases |
|------|-------|-----------|
| `sine` | Pure, smooth tone | Sub-bass, test tones, mellow pads |
| `square` | Hollow, buzzy | Chiptune, bass, leads |
| `sawtooth` | Bright, rich harmonics | Leads, brass, strings |
| `triangle` | Soft, flute-like | Soft leads, bass, woodwinds |

```typescript
// Try different waveforms
const sine = await createOscillator({ type: 'sine', frequency: 440 })
const square = await createOscillator({ type: 'square', frequency: 440 })
const sawtooth = await createOscillator({ type: 'sawtooth', frequency: 440 })
const triangle = await createOscillator({ type: 'triangle', frequency: 440 })
```

## ADSR Envelopes

ADSR (Attack, Decay, Sustain, Release) envelopes shape how a sound evolves over time. Without an envelope, oscillators produce a constant tone that starts and stops abruptly.

### Envelope Stages

```
      Decay
       /\
      /  \      Sustain
     /    \________________
    /                      \
   /                        \ Release
  / Attack                   \
 /                            \
|_____________________________|___
^        ^                ^      ^
Note On  Peak              Note Off  End
```

| Stage | Description | Typical Range |
|-------|-------------|---------------|
| **Attack** | Time from silence to peak volume | 0.001s - 2s |
| **Decay** | Time from peak to sustain level | 0.05s - 1s |
| **Sustain** | Volume level while note is held | 0 - 1 |
| **Release** | Time from note-off to silence | 0.1s - 3s |

### Using Envelopes

```typescript
import { createOscillator } from 'ez-web-audio'

// Piano-like envelope: fast attack, gradual decay
const piano = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: {
    attack: 0.01, // 10ms - almost instant
    decay: 0.3, // 300ms decay
    sustain: 0.4, // 40% sustain level
    release: 0.5 // 500ms release
  }
})

piano.play()
// Envelope automatically shapes the sound
```

### Envelope Presets

Here are some common envelope settings for different instrument types:

#### Piano / Plucked Strings
```typescript
const piano = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: {
    attack: 0.005, // Near-instant attack
    decay: 0.4, // Medium decay
    sustain: 0.2, // Low sustain (sound fades)
    release: 0.8 // Long release for resonance
  }
})
```

#### Strings / Pad
```typescript
const strings = await createOscillator({
  frequency: 440,
  type: 'sawtooth',
  envelope: {
    attack: 0.5, // Slow swell
    decay: 0.3, // Gentle decay
    sustain: 0.8, // High sustain
    release: 1.0 // Long, smooth release
  }
})
```

#### Synth Lead
```typescript
const lead = await createOscillator({
  frequency: 440,
  type: 'square',
  envelope: {
    attack: 0.05, // Quick but not instant
    decay: 0.1, // Short decay
    sustain: 0.7, // Strong sustain
    release: 0.2 // Quick release
  }
})
```

#### Pluck / Pizzicato
```typescript
const pluck = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: {
    attack: 0.001, // Instant attack
    decay: 0.2, // Quick decay
    sustain: 0.0, // No sustain
    release: 0.1 // Short release
  }
})
```

## Frequency and Notes

Oscillator frequency is specified in Hertz (Hz). Here are common musical frequencies:

| Note | Frequency (Hz) |
|------|----------------|
| C3 | 130.81 |
| C4 (Middle C) | 261.63 |
| A4 (Concert pitch) | 440.00 |
| C5 | 523.25 |
| C6 | 1046.50 |

### Using the Frequency Map

EZ Web Audio includes a complete frequency map for all standard notes:

```typescript
import { frequencyMap } from 'ez-web-audio'

// Access frequencies by note name
console.log(frequencyMap.A4) // 440
console.log(frequencyMap.C4) // 261.63
console.log(frequencyMap['C#4']) // 277.18

// Play a C major chord
const c4 = await createOscillator({ frequency: frequencyMap.C4 })
const e4 = await createOscillator({ frequency: frequencyMap.E4 })
const g4 = await createOscillator({ frequency: frequencyMap.G4 })

c4.play()
e4.play()
g4.play()
```

### Creating Notes

For more complex music, use the Note class:

```typescript
import { createNotes } from 'ez-web-audio'

const notes = createNotes()

// Find a specific note
const a4 = notes.find(n => n.frequency === 440)
console.log(a4.letter) // 'A'
console.log(a4.octave) // 4
console.log(a4.accidental) // ''

// Find C#4
const cSharp4 = notes.find(n => n.letter === 'C' && n.accidental === '#' && n.octave === 4)
```

## Adding Filters

Shape the oscillator tone with filters:

```typescript
import { createFilterEffect, createOscillator, getAudioContext } from 'ez-web-audio'

const synth = await createOscillator({
  frequency: 200,
  type: 'sawtooth'
})

// Add a lowpass filter to remove harsh high frequencies
const ctx = await getAudioContext()
const lowpass = createFilterEffect(ctx, 'lowpass', {
  frequency: 800, // Cutoff frequency
  q: 2 // Resonance
})

synth.addEffect(lowpass)
synth.play()
```

### Changing Frequency During Playback

```typescript
const synth = await createOscillator({ frequency: 440 })
synth.play()

// Change frequency smoothly
synth.update('frequency').to(880).from('value')

// Or use the controller directly
synth.changeFrequencyTo(523.25) // C5
```

## Volume Control

Control oscillator volume just like Sound:

```typescript
const synth = await createOscillator({ frequency: 440 })

// Set volume before playing
synth.changeGainTo(0.3) // 30% volume (recommended for oscillators)
synth.play()

// Fade out
synth.onPlayRamp('gain').from(0.3).to(0).in(1)
```

::: tip Volume Recommendation
Oscillators can be quite loud. Start with a gain of 0.3-0.5 to protect your ears and speakers.
:::

## Building a Simple Keyboard

```typescript
import { createOscillator, frequencyMap } from 'ez-web-audio'

const keys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
const oscillators = new Map()

// Create an oscillator for each key
async function setup() {
  for (const note of keys) {
    const osc = await createOscillator({
      frequency: frequencyMap[note],
      type: 'triangle',
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
      }
    })
    osc.changeGainTo(0.3)
    oscillators.set(note, osc)
  }
}

// Play a note
function playNote(note: string) {
  const osc = oscillators.get(note)
  if (osc) {
    osc.play()
  }
}

// Stop a note
function stopNote(note: string) {
  const osc = oscillators.get(note)
  if (osc) {
    osc.stop()
  }
}
```

## Oscillator Events

Listen for oscillator lifecycle events:

```typescript
const synth = await createOscillator({ frequency: 440 })

synth.on('play', () => {
  console.log('Oscillator started')
})

synth.on('stop', () => {
  console.log('Oscillator stopped')
})

synth.play()
setTimeout(() => synth.stop(), 1000)
```

## Next Steps

- [Effects](/examples/effects) - Add filters and effects to shape your sound
- [Basic Playback](/examples/basic-playback) - Load and play audio files
- [Core Concepts](/guide/concepts) - Understand the audio system architecture

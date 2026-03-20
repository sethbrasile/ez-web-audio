---
title: PolySynth - Polyphonic Synthesizer
description: Play multiple notes simultaneously with voice management, voice stealing, and per-voice control using PolySynth.
---

# PolySynth

PolySynth manages a pool of oscillator voices, letting you play multiple notes simultaneously -- chords, arpeggios, or any polyphonic pattern.

## Basic Usage

```typescript
import { createPolySynth } from 'ez-web-audio'

const synth = await createPolySynth({
  type: 'sawtooth',
  maxVoices: 8,
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 }
})

// Play a C major chord
const c4 = synth.play({ frequency: 261.6 })
const e4 = synth.play({ frequency: 329.6 })
const g4 = synth.play({ frequency: 392.0 })

// Stop individual notes
c4.stop()
e4.stop()
g4.stop()

// Or stop all at once
synth.stopAll()
```

## Voice Handles

`play()` returns a `VoiceHandle` for per-voice control:

```typescript
const handle = synth.play({ frequency: 440, gain: 0.8 })

// Adjust parameters on this voice
handle.update('gain').to(0.5).as('ratio')
handle.update('frequency').to(450).as('ratio') // Pitch bend

// Check if voice is still active
console.log(handle.active) // true until stopped or stolen
```

When a voice is stolen, the handle becomes stale and all methods silently no-op.

## Voice Stealing

When all voices are in use, a new `play()` steals a voice based on the strategy:

```typescript
const synth = await createPolySynth({
  maxVoices: 4,
  stealStrategy: 'lru' // default
})
```

| Strategy | Behavior |
|----------|----------|
| `'lru'` | Steal oldest-released voice first, then oldest-active (default) |
| `'oldest-active'` | Always steal the voice that started playing earliest |
| `'quietest'` | Steal the voice with the lowest current gain |

## Filters and Effects

Configure filters at creation time, add effects after:

```typescript
import { createPolySynth, createReverb } from 'ez-web-audio'

const synth = await createPolySynth({
  type: 'sawtooth',
  lowpass: { frequency: 2000 },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
})

const reverb = createReverb({ decay: 2.0, wet: 0.3 })
synth.addEffect(reverb)
```

## Same-Frequency Retrigger

Playing the same frequency twice reuses the existing voice instead of allocating a new one:

```typescript
synth.play({ frequency: 440 }) // Allocates voice
synth.play({ frequency: 440 }) // Retriggers same voice
```

## Cleanup

```typescript
synth.dispose() // Releases all voices, disconnects effects
```

## Next Steps

- [Synth Keyboard Example](/examples/synth-keyboard) -- Interactive polyphonic keyboard
- [LFO](/guide/lfo) -- Add vibrato or tremolo to your synth
- [API Reference](/api/) -- Full PolySynth API docs

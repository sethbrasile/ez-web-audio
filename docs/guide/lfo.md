---
title: LFO - Low Frequency Oscillator
description: Modulate audio parameters like gain, frequency, and filter cutoff using a Low Frequency Oscillator (LFO) for effects like tremolo, vibrato, and auto-pan.
---

# LFO

A Low Frequency Oscillator (LFO) produces a slow oscillation that modulates audio parameters over time. Connect an LFO to gain for tremolo, frequency for vibrato, pan for auto-pan, or filter cutoff for auto-wah.

## Basic Usage

```typescript
import { createLFO, createOscillator } from 'ez-web-audio'

const synth = await createOscillator({ frequency: 440 })

// Tremolo — modulate gain at 5Hz
const tremolo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })
tremolo.connect(synth, 'gain')
tremolo.start()

synth.play()
```

## Connecting to Parameters

An LFO can modulate any audio parameter on sounds, oscillators, effects, PolySynth, and GrainPlayer:

```typescript
// Vibrato — modulate frequency
const vibrato = createLFO({ frequency: 6, depth: 50 })
vibrato.connect(synth, 'frequency')

// Auto-pan
const autoPan = createLFO({ frequency: 0.5, depth: 0.8, type: 'triangle' })
autoPan.connect(synth, 'pan')

// Filter sweep on an effect
import { createFilterEffect } from 'ez-web-audio'
const filter = createFilterEffect('lowpass', { frequency: 1000 })
const sweep = createLFO({ frequency: 0.2, depth: 0.6, type: 'sine' })
sweep.connect(filter, 'frequency')
```

## Waveforms

| Type | Shape | Best for |
|------|-------|----------|
| `'sine'` | Smooth wave | Tremolo, vibrato |
| `'triangle'` | Linear ramp | Auto-pan, smooth sweeps |
| `'square'` | On/off toggle | Gating, rhythmic effects |
| `'sawtooth'` | Rising ramp | Rising sweeps |
| `'sample-and-hold'` | Stepped random | Glitchy, robotic effects |

```typescript
const lfo = createLFO({ frequency: 2, depth: 0.5, type: 'square' })
```

## Lifecycle Options

Control how the LFO interacts with sound playback:

```typescript
// Sync LFO to sound lifecycle — starts/stops with the sound
lfo.connect(synth, 'gain', { syncLifecycle: true })

// Retrigger — reset LFO phase each time the sound plays
lfo.connect(synth, 'gain', { retrigger: true })
```

Note: `syncLifecycle` and `retrigger` are mutually exclusive.

## Depth Units

Control how the depth value is interpreted:

```typescript
// Ratio (default) — depth as fraction of parameter value
lfo.connect(synth, 'gain', { depthUnit: 'ratio', depth: 0.3 })

// Cents — useful for frequency modulation
lfo.connect(synth, 'frequency', { depthUnit: 'cents', depth: 100 })

// Absolute — fixed depth in parameter units
lfo.connect(synth, 'gain', { depthUnit: 'absolute', depth: 0.2 })
```

## Cleanup

```typescript
lfo.stop()
lfo.disconnect() // Disconnect from all targets
lfo.dispose()    // Full cleanup
```

LFOs connected with `syncLifecycle` are automatically cleaned up when the target sound is disposed.

## Next Steps

- [PolySynth](/guide/poly-synth) -- Add vibrato to a polyphonic synthesizer
- [GrainPlayer](/guide/grain-player) -- Modulate grain position with an LFO
- [API Reference](/api/) -- Full LFO API docs

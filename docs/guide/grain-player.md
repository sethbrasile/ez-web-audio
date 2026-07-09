---
title: GrainPlayer - Granular Synthesis
description: Create evolving textures and pad sounds from audio buffers using granular synthesis with independent pitch, position, and grain parameter control.
---

# GrainPlayer

GrainPlayer creates continuous textures and pad sounds from an audio buffer using granular synthesis. It works by scheduling many overlapping short "grains" of audio, each with a smooth Hann window envelope to prevent clicks.

## Basic Usage

```typescript
import { createGrainPlayer, createSound } from 'ez-web-audio'

// Load an audio buffer
const sound = await createSound('/sounds/pad.mp3')
const grains = await createGrainPlayer(sound.audioBuffer, {
  grainSize: 0.1, // 100ms grains
  overlap: 0.05, // 50ms overlap
  jitter: 0.1 // Random scatter for organic texture
})

grains.play()
```

## Key Parameters

All parameters can be changed in real-time during playback:

```typescript
grains.position = 0.5 // Scrub to middle of buffer (0-1)
grains.pitch = 7 // Pitch up a perfect fifth (semitones)
grains.grainSize = 0.2 // Larger grains = smoother, more recognizable
grains.overlap = 0.1 // More overlap = denser texture
grains.jitter = 0.3 // More scatter = less repetitive
```

| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `position` | 0-1 | 0 | Where in the buffer to sample grains |
| `pitch` | semitones | 0 | Pitch shift (via playbackRate) |
| `grainSize` | seconds (min 0.01) | 0.1 | Duration of each grain |
| `overlap` | seconds | 0.05 | Time between grain starts |
| `jitter` | 0-1 | 0 | Random position scatter |
| `loop` | boolean | true | Loop when reaching buffer end |

## Playback Control

```typescript
grains.play()
grains.pause() // Freeze grain scheduling
grains.play() // Resume from where you paused
grains.stop() // Stop and reset
```

## Effects and Volume

```typescript
import { createGrainPlayer, createReverb } from 'ez-web-audio'

const grains = await createGrainPlayer(buffer, { gain: 0.8 })

const reverb = createReverb({ decay: 3.0, wet: 0.4 })
grains.addEffect(reverb)
grains.changeGainTo(0.5)
grains.changePanTo(-0.3)
```

## Limitations

Pitch shifting is implemented via `playbackRate`, which changes both pitch and speed of each grain. The overlap system compensates for changed grain duration, but extreme values (beyond +/-24 semitones) may affect texture quality.

## Cleanup

```typescript
grains.dispose() // Stops all grains, releases buffer reference
```

## Next Steps

- [LFO](/guide/lfo) -- Modulate grain position or pitch with an LFO
- [API Reference](/api/) -- Full GrainPlayer API docs

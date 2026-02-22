---
title: Core Concepts - Sound Types, AudioContext, Audio Routing, and Events
description: Understand the core building blocks of EZ Web Audio — Sound for one-shot playback, Track for music with seeking, Oscillator for synthesis, effects chains, and event handling.
---

# Core Concepts

Understanding when to use each class and how they work together.

## The Class Hierarchy

```
BaseSound (abstract)
├── Sound        - One-shot audio playback from file
│   └── Track    - Music with position tracking
├── Oscillator   - Synthesized sound generation
└── SampledNote  - Musical notes with pitch identity
```

All sound classes share common functionality from `BaseSound`: volume control (gain), stereo positioning (pan), event emission (play, stop, end), and effect chain support.

## Sound: One-Shot Playback

**Use Sound for:** Short audio files that may play multiple times simultaneously.

```typescript
const click = await createSound('/sounds/click.mp3')

// Each play() creates a new AudioBufferSourceNode — overlaps freely
click.play()
click.play()
click.play()
```

Each `play()` creates a new `AudioBufferSourceNode` and cleans it up when finished. Perfect for UI feedback, game SFX, and drum samples.

## Track: Music Playback

**Use Track for:** Longer audio files where you need playback control.

```typescript
const song = await createTrack('/music/background.mp3')

song.play()
console.log(song.position.string) // "1:23"
console.log(song.percentPlayed) // 35 (35% complete)

song.pause()
song.resume()
song.seek(60).as('seconds') // Jump to 1 minute
```

Position is returned as a `TimeObject`:

```typescript
const pos = track.position
console.log(pos.raw) // 83.5 (seconds)
console.log(pos.string) // "1:23"
console.log(pos.pojo) // { minutes: 1, seconds: 23 }
console.log(track.percentPlayed) // 31 (31%)
```

Track limitation: only one playback at a time — calling `play()` while playing restarts.

## Oscillator: Sound Synthesis

**Use Oscillator for:** Generating sounds from scratch without audio files.

```typescript
const synth = await createOscillator({
  frequency: 440, // Hz (A4 note)
  type: 'sine', // sine, square, sawtooth, triangle
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }
})

synth.play()
synth.stop() // Triggers ADSR release phase
```

### Waveform Types

| Type | Sound Character | Use Case |
|------|-----------------|----------|
| `sine` | Pure, smooth | Flutes, whistles, sub bass |
| `square` | Hollow, buzzy | Chiptune, clarinets |
| `sawtooth` | Bright, aggressive | Synth leads, brass |
| `triangle` | Soft, muted | Soft synths, bells |

### ADSR Envelope

The envelope shapes how volume changes over time (Attack / Decay / Sustain / Release):

```ts
const piano = { attack: 0.01, decay: 0.5, sustain: 0, release: 0.3 }
const pad = { attack: 0.5, decay: 0.2, sustain: 0.8, release: 1.0 }
const pluck = { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.1 }
```

The `Envelope` class is also exported for direct use when you need to drive automation manually — see [Synthesis](/examples/synthesis) for details.

## AudioContext Lifecycle

### Lazy Initialization

EZ Web Audio creates the AudioContext automatically when you first use a factory function. Ensure your first audio call is inside a user interaction handler:

```typescript
button.onclick = async () => {
  const sound = await createSound('/audio/click.mp3')
  sound.play()
}
```

::: tip Explicit initialization
Call `initAudio()` for iOS mute workaround or pre-warming: `await initAudio()` inside the user interaction handler before creating sounds.
:::

### Single Context and States

EZ Web Audio uses one shared AudioContext for all sounds. Context states:

| State | Meaning |
|-------|---------|
| `running` | Normal operation |
| `suspended` | Waiting for interaction — handled automatically via `play()` |
| `interrupted` | iOS backgrounded — wait for foreground |
| `closed` | Context destroyed — cannot recover |

## Audio Routing

Each sound follows this signal path:

```
Source → [Effects] → Gain → Panner → Destination
```

```typescript
const sound = await createSound('/audio/guitar.mp3')

const filter = createFilterEffect('lowpass', { frequency: 2000 })
sound.addEffect(filter)
sound.changeGainTo(0.8)
sound.changePanTo(-0.5)
sound.play()
```

### Effect Chain, Bypass, and Custom Effects

Effects are processed in insertion order. Add multiple at once with `addEffects()`. Toggle bypass without removing — the chain rewires automatically:

```typescript
sound.addEffect(compressor)
sound.addEffects([eq, limiter])

filter.bypass = true // Signal skips this effect
filter.bypass = false // Signal flows through again
```

Wrap any Web Audio API node with `wrapEffect()`:

```typescript
import { wrapEffect } from 'ez-web-audio'

const distortion = audioContext.createWaveShaper()
const effect = wrapEffect(distortion)
sound.addEffect(effect)
```

## Events

All playable sounds emit events via `on(event, handler)`:

| Event | Trigger | Available on |
|-------|---------|--------------|
| `play` | `play()` called | All |
| `stop` | `stop()` called | All |
| `end` | Audio finished naturally | All |
| `pause` | `pause()` called | Track only |
| `resume` | `resume()` called | Track only |
| `seek` | `seek()` called | Track only |

```typescript
sound.on('play', e => console.log('Started at', e.detail.time))
sound.on('end', () => console.log('Finished naturally'))
track.on('seek', e => console.log('Seeked to', e.detail.position))
```

## Other Sound Types

### Sampler

Round-robin playback cycles through multiple sounds on each `play()` call:

```typescript
const gunshot = await createSampler(['shot1.mp3', 'shot2.mp3', 'shot3.mp3'])
gunshot.play() // shot1 → shot2 → shot3 → shot1...
```

### BeatTrack

Drum machine patterns with per-beat active/inactive state:

```typescript
const kick = await createBeatTrack(['kick.mp3'])
kick.beats[0].active = true
kick.beats[4].active = true
```

### LayeredSound

Multiple sounds synchronized to start at the exact same AudioContext time:

```typescript
const layer = await createLayeredSound([bass, melody, synth])
layer.play()
```

### AudioSprite

Pack multiple sounds into one audio file for fewer HTTP requests:

```typescript
const sprite = await createSprite('/audio/ui-sounds.mp3', {
  spritemap: { click: { start: 0, end: 0.1 }, success: { start: 1.0, end: 1.8 } }
})
sprite.play('click')
sprite.play('success', { gain: 0.8 })
```

### White Noise

Generate white noise procedurally (useful for wind, rain, texture):

```typescript
const noise = await createWhiteNoise()
noise.addEffect(createFilterEffect('lowpass', { frequency: 400 }))
noise.play()
```

## Next Steps

- [Parameter Control](/guide/parameter-control) - Automate gain, frequency, and pan over time
- [Utilities](/guide/utilities) - Batch loading, crossfade, debug mode, and interaction helpers
- [Interactive Examples](/examples/) - See concepts in action
- [API Reference](/api/) - Detailed method documentation

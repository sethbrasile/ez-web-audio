---
title: Core Concepts - Sound, Track, Oscillator, Effects, and More
description: Understand the core building blocks of EZ Web Audio — Sound for one-shot playback, Track for music with seeking, Oscillator for synthesis, effects chains, and beat sequencing.
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

All sound classes share common functionality from `BaseSound`:
- Volume control via gain
- Stereo positioning via pan
- Event emission (play, stop, end)
- Effect chain support

## Sound: One-Shot Playback

**Use Sound for:** Short audio files that may play multiple times simultaneously.

```typescript
const click = await createSound('/sounds/click.mp3')

// Each play() creates a new AudioBufferSourceNode
click.play() // First instance plays
click.play() // Second instance overlaps
click.play() // Third instance overlaps
```

Sounds are perfect for:
- UI feedback (clicks, hovers)
- Game sound effects
- Drum samples
- Any audio under ~10 seconds

### How Sound Works

When you call `play()` on a Sound:

1. A new `AudioBufferSourceNode` is created
2. It's connected through the effect chain to gain and pan nodes
3. The source starts playing immediately
4. When finished, the source node is automatically cleaned up

This architecture means sounds are lightweight and can overlap freely.

## Track: Music Playback

**Use Track for:** Longer audio files where you need playback control.

```typescript
const song = await createTrack('/music/background.mp3')

song.play()

// Track knows its position
console.log(song.position.string) // "1:23"
console.log(song.percentPlayed)   // 0.35 (35% complete)

// Control playback
song.pause()
song.resume()
song.seek(60).from('seconds') // Jump to 1 minute
```

Track limitations:
- Only one playback at a time (calling `play()` while playing restarts)
- Slightly more memory overhead than Sound

### Track Position Tracking

Track provides rich position information:

```typescript
const track = await createTrack('/music/song.mp3')
track.play()

// Position as TimeObject
const pos = track.position
console.log(pos.raw)    // 83.5 (seconds)
console.log(pos.string) // "1:23"
console.log(pos.pojo)   // { minutes: 1, seconds: 23 }

// Duration information
console.log(track.duration.string)  // "4:30"
console.log(track.percentPlayed)    // 0.31 (31%)
```

## Oscillator: Sound Synthesis

**Use Oscillator for:** Generating sounds from scratch without audio files.

```typescript
const synth = await createOscillator({
  frequency: 440,     // Hz (A4 note)
  type: 'sine',       // sine, square, sawtooth, triangle
  envelope: {         // ADSR envelope (optional)
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3
  }
})

synth.play()
// ... later
synth.stop() // Triggers release phase
```

Oscillators are perfect for:
- Musical instruments
- Sound design
- Procedural audio
- Anything without pre-recorded files

### Waveform Types

| Type | Sound Character | Use Case |
|------|-----------------|----------|
| `sine` | Pure, smooth | Flutes, whistles, sub bass |
| `square` | Hollow, buzzy | Chiptune, clarinets |
| `sawtooth` | Bright, aggressive | Synth leads, brass |
| `triangle` | Soft, muted | Soft synths, bells |

### ADSR Envelope

The envelope shapes how volume changes over time:

```
      /\
     /  \____
    /        \
   /          \
  A   D   S   R

A = Attack: Time to reach full volume
D = Decay: Time to fall to sustain level
S = Sustain: Volume level while key held
R = Release: Time to fade after key released
```

```typescript
// Piano-like: fast attack, quick decay, no sustain
{ attack: 0.01, decay: 0.5, sustain: 0, release: 0.3 }

// Pad-like: slow attack, long sustain
{ attack: 0.5, decay: 0.2, sustain: 0.8, release: 1.0 }

// Pluck-like: instant attack, medium decay
{ attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.1 }
```

## AudioContext Lifecycle

### Lazy Initialization

EZ Web Audio creates the AudioContext automatically when you first use a factory
function like `createSound()` or `createOscillator()`. You don't need to call
`initAudio()` explicitly — just make sure your first audio call happens inside
a user interaction handler (click, tap, keypress).

```typescript
// This works — AudioContext created automatically
button.onclick = async () => {
  const sound = await createSound('/audio/click.mp3')
  sound.play()
}

// This also works
button.onclick = async () => {
  const osc = await createOscillator({ frequency: 440 })
  osc.play()
}
```

::: tip Advanced: Explicit initialization
If you need explicit control (iOS mute workaround, pre-warming), you can call
`initAudio()`:

```typescript
import { initAudio, createSound } from 'ez-web-audio'

button.onclick = async () => {
  await initAudio() // Optional — for explicit control
  const sound = await createSound('/audio/click.mp3')
  sound.play()
}
```
:::

### Single Context

EZ Web Audio uses a single shared AudioContext. All sounds route through it:

```typescript
const sound1 = await createSound('/a.mp3')
const sound2 = await createSound('/b.mp3')
const osc = await createOscillator({ frequency: 440 })

// All three use the same AudioContext (created lazily on first call)
// This is efficient and prevents resource exhaustion
```

### Context States

The AudioContext can be in different states:

| State | Meaning | Action |
|-------|---------|--------|
| `running` | Normal operation | None needed |
| `suspended` | Waiting for interaction | Handled automatically — `play()` calls resume(). If still suspended, a console warning appears. |
| `interrupted` | iOS backgrounded | Wait for foreground |
| `closed` | Context destroyed | Cannot recover |

## Audio Routing

Each sound follows this signal path:

```
Source → [Effects] → Gain → Panner → Destination
```

```typescript
const sound = await createSound('/audio/guitar.mp3')

// Add effects
const reverb = createFilterEffect(ctx, 'lowpass', { frequency: 2000 })
sound.addEffect(reverb)

// Control gain and pan
sound.changeGainTo(0.8)
sound.changePanTo(-0.5)

sound.play()
// Audio flows: source → filter → gain (0.8) → pan (left) → speakers
```

### Effect Chain

Effects are processed in order:

```typescript
sound.addEffect(compressor)  // First in chain
sound.addEffect(reverb)      // Second in chain
sound.addEffect(eq)          // Third in chain

// Signal: source → compressor → reverb → eq → gain → pan → out
```

## Parameter Control

### Immediate Updates

Change parameters right now:

```typescript
sound.update('gain').to(0.5).from('ratio')
sound.update('pan').to(-1)
```

The `from()` method specifies the unit:
- `'ratio'` - 0 to 1 for gain
- `'dB'` - decibels for gain
- Default assumes appropriate unit

### Scheduled Updates

Schedule parameter changes relative to play time:

```typescript
// Fade in over 1 second
sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')

// Ramp frequency from 200 to 800 over 0.5 seconds
oscillator.onPlayRamp('frequency').from(200).to(800).in(0.5)
```

### Common Patterns

```typescript
// Fade in
sound.onPlaySet('gain').to(0).endingAt(0.5, 'linear')

// Fade out (before sound ends)
sound.onPlaySet('gain').to(1).endingAt(sound.duration.raw - 0.5, 'linear')
sound.onPlaySet('gain').to(0).endingAt(sound.duration.raw, 'linear')

// Pitch bend
osc.onPlayRamp('frequency').from(440).to(880).in(1)
```

## Events

All playable sounds emit events:

```typescript
const sound = await createSound('/audio/effect.mp3')

sound.on('play', (e) => console.log('Started at', e.detail.time))
sound.on('stop', () => console.log('Stopped'))
sound.on('end', () => console.log('Finished naturally'))

sound.play()
```

Track has additional events:

```typescript
track.on('pause', (e) => console.log('Paused at', e.detail.position))
track.on('resume', (e) => console.log('Resumed from', e.detail.position))
track.on('seek', (e) => console.log('Seeked to', e.detail.position))
```

### Event vs Method

| Event | Trigger |
|-------|---------|
| `play` | `play()` called |
| `stop` | `stop()` called |
| `end` | Audio finished naturally |
| `pause` | `pause()` called (Track only) |
| `resume` | `resume()` called (Track only) |
| `seek` | `seek()` called (Track only) |

## Other Sound Types

### Sampler

Round-robin playback of multiple sounds:

```typescript
const gunshot = await createSampler(['shot1.mp3', 'shot2.mp3', 'shot3.mp3'])

gunshot.play() // shot1
gunshot.play() // shot2
gunshot.play() // shot3
gunshot.play() // shot1 (cycles)
```

### BeatTrack

Drum machine patterns:

```typescript
const kick = await createBeatTrack(['kick.mp3'])
kick.beats[0].active = true  // Beat 1
kick.beats[4].active = true  // Beat 5
```

### LayeredSound

Multiple sounds synchronized:

```typescript
const layer = await createLayeredSound([bass, melody, synth])
layer.play() // All start at exact same time
layer.setGain(0.5) // Affects all layers
```

### AudioSprite

Multiple sounds from one file:

```typescript
const sprite = await createSprite('sounds.mp3', {
  spritemap: {
    laser: { start: 0, end: 0.3 },
    explosion: { start: 1.0, end: 2.5 }
  }
})
sprite.play('laser')
```

### White Noise

Generate white noise procedurally:

```typescript
const noise = await createWhiteNoise()
noise.play()

// Combine with filters for sound design
const wind = await createWhiteNoise()
const lowpass = createFilterEffect(await getAudioContext(), 'lowpass', {
  frequency: 400
})
wind.addEffect(lowpass)
wind.play()
```

## Utility Functions

### Collection Control

Control multiple sounds at once:

```typescript
import { stopAll, pauseAll, playAll } from 'ez-web-audio'

const sounds = [sound1, sound2, sound3]

playAll(sounds)  // Play all sounds
pauseAll(sounds) // Pause all tracks (no effect on non-track sounds)
stopAll(sounds)  // Stop all sounds
```

### Crossfade

Smoothly transition between two tracks:

```typescript
import { crossfade } from 'ez-web-audio'

const trackA = await createTrack('/music/intro.mp3')
const trackB = await createTrack('/music/main.mp3')

trackA.play()

// Crossfade from A to B over 2 seconds
crossfade(trackA, trackB, 2)
// trackA fades out while trackB fades in, using equal-power curve
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
import { setDebugMode, setDebugHandler } from 'ez-web-audio'

// Enable debug mode with default console logging
setDebugMode(true)

// Or provide a custom handler
setDebugHandler((message) => {
  console.log(`[Audio Debug] ${message.type}: ${message.message}`)
})
```

## Next Steps

- [Interactive Examples](/examples/) - See concepts in action
- [API Reference](/api/) - Detailed method documentation

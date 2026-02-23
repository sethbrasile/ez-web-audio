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

### Looping

Set `loop = true` for seamless looping — no gap between repeats. Looped sounds must be stopped manually:

```typescript
click.loop = true
click.play()
click.stop() // Looped sounds don't end on their own
```

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

Position is returned as a `TimeObject` with `raw` (seconds), `string` ("1:23"), and `pojo` (`{ minutes, seconds }`) fields. Track limitation: only one playback at a time — calling `play()` while playing restarts.

## Oscillator: Sound Synthesis

**Use Oscillator for:** Generating sounds from scratch without audio files.

```typescript
const synth = await createOscillator({
  note: 'A4', // or use frequency: 440
  type: 'sine', // sine, square, sawtooth, triangle
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }
})

synth.play()
synth.stop() // Triggers ADSR release phase
```

The `note` option looks up frequency from the built-in frequency map. When both `note` and `frequency` are provided, `note` takes precedence.

### Waveform Types

| Type | Sound Character | Use Case |
|------|-----------------|----------|
| `sine` | Pure, smooth | Flutes, whistles, sub bass |
| `square` | Hollow, buzzy | Chiptune, clarinets |
| `sawtooth` | Bright, aggressive | Synth leads, brass |
| `triangle` | Soft, muted | Soft synths, bells |

### ADSR Envelope

The envelope shapes volume over time (Attack / Decay / Sustain / Release). The `Envelope` class is also exported for direct use — see [Synthesis](/examples/synthesis) for details.

## AudioContext Lifecycle

### Lazy Initialization

EZ Web Audio creates the AudioContext automatically when you first call a factory function inside a user interaction handler. For iOS mute workaround or pre-warming, call `await initAudio()` first.

### Single Context and States

EZ Web Audio uses one shared AudioContext for all sounds. Context states:

| State | Meaning |
|-------|---------|
| `running` | Normal operation |
| `suspended` | Waiting for interaction — handled automatically via `play()` |
| `interrupted` | iOS backgrounded — wait for foreground |
| `closed` | Context destroyed — cannot recover |

## Volume Control

All sounds have a `volume` getter/setter as a convenient alias for gain control:

```typescript
sound.volume = 0.5 // Same as sound.changeGainTo(0.5)
console.log(sound.volume) // 0.5
```

`volume` delegates to `changeGainTo()` — the same validation applies (negative values throw, values above 1 log a warning).

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

### Effect Chain and Bypass

Effects are processed in insertion order. Add multiple with `addEffects([a, b, c])`. Toggle `filter.bypass = true` to skip an effect — the chain rewires automatically. Wrap any raw Web Audio node with `wrapEffect(node)`.

## Events

All playable sounds emit typed events via `on(event, handler)`:

| Event | Trigger | Available on |
|-------|---------|--------------|
| `play` | `play()` called | All |
| `stop` | `stop()` called | All |
| `end` | Audio finished naturally | All |
| `pause` | `pause()` called | Track, BeatTrack |
| `resume` | `resume()` called | Track, BeatTrack |
| `seek` | `seek()` called | Track only |
| `beat` | Beat scheduled | BeatTrack only |
| `warning` | Issue encountered | LayeredSound only |

```typescript
sound.on('play', (e) => {
  console.log(e.detail.time) // audioContext.currentTime
  console.log(e.detail.source) // typed as AudioEventSource
})
track.on('seek', e => console.log('Seeked to', e.detail.position))
```

### Event Types

Event detail `source` fields are typed as `AudioEventSource` (a union of `BaseSound | BeatTrack | LayeredSound`). The library exports event map and detail types for type-safe handling:

```typescript
import type {
  AudioEventSource,
  EventDetailFor,
  SoundEventMap,
  SoundEventType,
} from 'ez-web-audio'
import { TypedEventEmitter } from 'ez-web-audio'

// Extract detail type from event name
type PlayDetail = EventDetailFor<'play'> // PlayEventDetail
```

Also exported: `BeatTrackEventMap`, `LayeredSoundEventMap`, and all detail types (`PlayEventDetail`, `StopEventDetail`, etc.). `TypedEventEmitter<TMap>` is available for building custom event-driven audio classes.

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

Use `setPattern()` to set all beats at once from an array (shorter arrays default remaining beats to inactive):

```typescript
kick.setPattern([1, 0, 1, 0, 1, 0, 1, 0]) // Set all beats at once
```

### LayeredSound

Multiple sounds synchronized to start at the exact same AudioContext time:

```typescript
const layer = await createLayeredSound([bass, melody, synth])
layer.play()
```

### AudioSprite

Pack multiple sounds into one audio file — play segments by name with `createSprite()`:

```typescript
const sprite = await createSprite('/audio/ui-sounds.mp3', {
  spritemap: { click: { start: 0, end: 0.1 }, success: { start: 1.0, end: 1.8 } }
})
sprite.play('click')
```

### Noise Generation

Generate noise procedurally with `createNoise()` — useful for ambience, sleep sounds, and synthesis building blocks:

```typescript
const white = await createNoise('white') // Flat spectrum (hiss)
const pink = await createNoise('pink') // 1/f — natural, balanced
const brown = await createNoise('brown') // Deep rumble

pink.loop = true
pink.play()
```

All noise types return a 1-second `Sound` instance. Set `.loop = true` for continuous playback. You can also use `createWhiteNoise()` for the single-type shorthand.

## Error Classes

The library exports typed error classes: `AudioError` (base), `AudioLoadError` (load/decode failure), `AudioContextError` (context issues), and `InvalidNoteError` (invalid note name). All extend `AudioError` for catch-all handling.

## Advanced Exports

The library also exports: `MusicallyAware` (musical identity mixin), `createEffect` (low-level effect wrapper), `Connectable`/`Playable` (interfaces), options types (`AnalyzerOptions`, `BeatTrackOptions`, `EnvelopeOptions`, `FilterEffectOptions`, `OscillatorOptions`, `OscillatorFilterOptions`, `SamplerOptions`, `LayeredSoundOptions`), sprite types (`SpriteDefinition`, `SpriteManifest`, `SpritePlayOptions`), and unit types (`RatioType`, `SeekType`, `FilterType`). See the [API Reference](/api/) for details.

## Next Steps

- [Parameter Control](/guide/parameter-control) - Automate gain, frequency, and pan over time
- [Utilities](/guide/utilities) - Batch loading, crossfade, debug mode, and interaction helpers
- [Interactive Examples](/examples/) - See concepts in action
- [API Reference](/api/) - Detailed method documentation

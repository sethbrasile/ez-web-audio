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
console.log(song.percentPlayed) // 35 (35% complete)

// Control playback
song.pause()
song.resume()
song.seek(60).as('seconds') // Jump to 1 minute
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
console.log(pos.raw) // 83.5 (seconds)
console.log(pos.string) // "1:23"
console.log(pos.pojo) // { minutes: 1, seconds: 23 }

// Duration information
console.log(track.duration.string) // "4:30"
console.log(track.percentPlayed) // 31 (31%)
```

## Oscillator: Sound Synthesis

**Use Oscillator for:** Generating sounds from scratch without audio files.

```typescript
const synth = await createOscillator({
  frequency: 440, // Hz (A4 note)
  type: 'sine', // sine, square, sawtooth, triangle
  envelope: { // ADSR envelope (optional)
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

```ts
// Piano-like: fast attack, quick decay, no sustain
const piano = { attack: 0.01, decay: 0.5, sustain: 0, release: 0.3 }

// Pad-like: slow attack, long sustain
const pad = { attack: 0.5, decay: 0.2, sustain: 0.8, release: 1.0 }

// Pluck-like: instant attack, medium decay
const pluck = { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.1 }
```

### Envelope Class

The `Envelope` class is also exported for advanced use cases. Normally you configure it via `createOscillator({ envelope: { ... } })`, but you can instantiate it directly when you need to drive automation from your own code.

```typescript
import { Envelope } from 'ez-web-audio'

const env = new Envelope({
  attackTime: 0.05,
  decayTime: 0.1,
  sustainLevel: 0.7,
  releaseTime: 0.3
})

// Apply to any AudioParam (typically a GainNode)
env.applyTo(gainNode.gain, audioContext.currentTime)

// Release on note end
env.release(gainNode.gain, audioContext.currentTime)
```

`EnvelopeOptions` fields (all optional, with defaults):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `attackTime` | number (s) | 0.01 | Time to ramp from 0 to peak |
| `decayTime` | number (s) | 0.1 | Time to fall to sustain level |
| `sustainLevel` | number (0–1) | 0.7 | Volume held during sustain |
| `releaseTime` | number (s) | 0.3 | Time to fade after release |

The Envelope supports click-free retriggering — if you call `applyTo` while the envelope is still active, it picks up from the current value instead of jumping to zero.

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
import { createSound, initAudio } from 'ez-web-audio'

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

// Add effects (no AudioContext needed)
const filter = createFilterEffect('lowpass', { frequency: 2000 })
sound.addEffect(filter)

// Control gain and pan
sound.changeGainTo(0.8)
sound.changePanTo(-0.5)

sound.play()
// Audio flows: source → filter → gain (0.8) → pan (left) → speakers
```

### Effect Chain

Effects are processed in order:

```typescript
sound.addEffect(compressor) // First in chain
sound.addEffect(reverb) // Second in chain
sound.addEffect(eq) // Third in chain

// Signal: source → compressor → reverb → eq → gain → pan → out
```

### Batch Effect Addition

Add multiple effects in a single call:

```typescript
const filter = createFilterEffect('lowpass', { frequency: 800 })
const boost = createGainEffect(1.5)
sound.addEffects([filter, boost])
```

### Effect Bypass

Toggle effects without removing them from the chain:

```typescript
const filter = createFilterEffect('lowpass', { frequency: 800 })
sound.addEffect(filter)

// Toggle bypass — chain rewires automatically
filter.bypass = true // Signal skips this effect
filter.bypass = false // Signal flows through effect again
```

### Generic Effect Wrapping

Wrap any Web Audio API node as an effect:

```typescript
import { createEffect } from 'ez-web-audio'

const distortion = audioContext.createWaveShaper()
distortion.curve = makeDistortionCurve(400)
const effect = createEffect(distortion)
sound.addEffect(effect)
```

## Parameter Control

### Immediate Updates

Change parameters right now:

```typescript
sound.update('gain').to(0.5).as('ratio')
sound.update('pan').to(-1).as('ratio')
```

The `as()` method specifies the unit:
- `'ratio'` - Direct value (0 to 1 for gain, -1 to 1 for pan)
- `'percent'` - Percentage (0 to 100)
- `'inverseRatio'` - Inverse (1 - value)

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

### Extending ControlType

The parameter system can be extended for custom control types via module augmentation:

```typescript
// In your project's type declarations (e.g., global.d.ts)
declare module 'ez-web-audio' {
  interface ControlTypeMap {
    playbackRate: 'playbackRate'
  }
}

// Now 'playbackRate' is accepted by update(), onPlaySet(), etc.
// Note: You must provide custom controller logic to handle the new type.
```

## Events

All playable sounds emit events:

```typescript
const sound = await createSound('/audio/effect.mp3')

sound.on('play', e => console.log('Started at', e.detail.time))
sound.on('stop', () => console.log('Stopped'))
sound.on('end', () => console.log('Finished naturally'))

sound.play()
```

Track has additional events:

```typescript
track.on('pause', e => console.log('Paused at', e.detail.position))
track.on('resume', e => console.log('Resumed from', e.detail.position))
track.on('seek', e => console.log('Seeked to', e.detail.position))
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
kick.beats[0].active = true // Beat 1
kick.beats[4].active = true // Beat 5
```

### LayeredSound

Multiple sounds synchronized:

```typescript
const layer = await createLayeredSound([bass, melody, synth])
layer.play() // All start at exact same time
layer.setGain(0.5) // Affects all layers
```

### AudioSprite

Pack multiple sounds into a single audio file and play them by name. AudioSprite reduces HTTP requests — ideal for games or apps with many short sound effects.

```typescript
import { createSprite } from 'ez-web-audio'

const sprite = await createSprite('/audio/ui-sounds.mp3', {
  spritemap: {
    click: { start: 0, end: 0.1 },
    hover: { start: 0.5, end: 0.65 },
    success: { start: 1.0, end: 1.8 },
    error: { start: 2.0, end: 2.5 }
  }
})

// Play a named sprite
sprite.play('click')

// Play with options
sprite.play('success', { gain: 0.8 })

// Loop a sprite (e.g. engine hum) and stop it later
sprite.play('hover', { loop: true })
sprite.stop('hover')
```

Sprite boundaries are defined in seconds. All sprites share the same `AudioBuffer` — only the playback region differs. A single fetch loads everything.

AudioSprite is also exported as a class for advanced use cases (e.g., managing sprites in a collection).

### White Noise

Generate white noise procedurally:

```typescript
const noise = await createWhiteNoise()
noise.play()

// Combine with filters for sound design
const wind = await createWhiteNoise()
const lowpass = createFilterEffect('lowpass', { frequency: 400 })
wind.addEffect(lowpass)
wind.play()
```

## Utility Functions

### Collection Control

Control multiple sounds at once:

```typescript
import { pauseAll, playAll, stopAll } from 'ez-web-audio'

const sounds = [sound1, sound2, sound3]

playAll(sounds) // Play all sounds
pauseAll(sounds) // Pause all tracks (no effect on non-track sounds)
stopAll(sounds) // Stop all sounds
```

### Synchronized Playback

Play multiple sounds at the exact same AudioContext timestamp. Unlike calling `play()` on each sound sequentially (which introduces tiny timing gaps), `playTogether` schedules all sources to a shared start time slightly in the future:

```typescript
import { createSound, createOscillator, playTogether } from 'ez-web-audio'

const bass = await createSound('/audio/bass.mp3')
const melody = await createSound('/audio/melody.mp3')
const chord = await createOscillator({ frequency: 440, type: 'triangle' })

// All three start at precisely the same AudioContext time
await playTogether([bass, melody, chord])
```

Use cases: building chords from oscillators, layering SFX components, and synchronizing stems in a multi-track arrangement.

Works with any mix of `Sound`, `Track`, and `Oscillator` instances.

### Batch Loading

Load multiple sounds at once with progress tracking:

```typescript
import { createSounds } from 'ez-web-audio'

const sounds = await createSounds(
  ['click.mp3', 'whoosh.mp3', 'ding.mp3'],
  (loaded, total) => console.log(`${loaded}/${total}`)
)
```

### Crossfade

Smoothly transition between two tracks using an equal-power curve. Equal-power crossfading keeps the total perceived loudness constant throughout the transition — there is no volume dip at the midpoint that a simple linear cross-fade would produce.

```typescript
import { createTrack, crossfade } from 'ez-web-audio'

const intro = await createTrack('/music/intro.mp3')
const main = await createTrack('/music/main.mp3')

intro.play()

// Crossfade from intro to main over 3 seconds
// intro fades out; main fades in — overlap uses equal-power curve
await crossfade(intro, main, 3)
// intro is now stopped, main is playing at full volume
```

`crossfade` returns a `Promise` that resolves when the transition is complete and the source track has been stopped. If the destination track is already playing, the fade starts from its current position; otherwise it starts playing at gain 0 and fades in.

Typical use cases: DJ transitions, ambient scene changes, and background music swaps.

### Preloading Audio

Cache audio files before they are needed so playback starts instantly:

```typescript
import { preload, createSound, isPreloaded } from 'ez-web-audio'

// Preload during a loading screen
await preload(['/audio/level1.mp3', '/audio/level2.mp3', '/audio/boss.mp3'])

// Subsequent createSound/createTrack calls hit the cache — no additional fetch
const level1 = await createSound('/audio/level1.mp3')

// Check if a URL is already cached
console.log(isPreloaded('/audio/level1.mp3')) // true
```

### Cache Management

Clear the internal preload cache when you no longer need cached audio — useful in long-running apps after level transitions:

```typescript
import { clearPreloadCache, preload } from 'ez-web-audio'

await preload(['/audio/level1.mp3', '/audio/level2.mp3'])

// Level transition: free memory from level 1 assets
clearPreloadCache('/audio/level1.mp3') // Clear a single URL

// Or clear everything at once
clearPreloadCache()
```

`clearPreloadCache()` without arguments clears the entire cache. With a URL argument, it removes only that entry. After clearing, the next `createSound()` or `preload()` call for that URL fetches it fresh.

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
import { setDebugHandler, setDebugMode } from 'ez-web-audio'

// Enable debug mode — logs all events to the console
setDebugMode(true)
// Example console output:
//   [ez-audio:event] [0.000] kick: play
//   [ez-audio:connection] [0.021] kick: Effect added at position 0
//   [ez-audio:warning] [1.420] bgMusic: AudioContext suspended
```

Each message is a `DebugMessage` object with:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'event' \| 'connection' \| 'warning'` | Category of message |
| `source` | string | Sound name or identifier |
| `message` | string | Human-readable description |
| `timestamp` | number | `audioContext.currentTime` |

Use `setDebugHandler` to capture messages in your own logging system:

```typescript
import { setDebugHandler, setDebugMode } from 'ez-web-audio'

// Capture all debug messages (works even when setDebugMode is false)
setDebugHandler((msg) => {
  if (msg.type === 'warning') {
    myLogger.warn(`[${msg.source}] ${msg.message}`)
  }
})

// Filter to connection events only
setDebugHandler((msg) => {
  if (msg.type === 'connection') {
    console.log(`[${msg.type}] ${msg.message}`)
    // Example output: [connection] Effect added at position 0
  }
})

// Restore default console.log handler
setDebugHandler(null)
```

### Interaction Helpers

Bind touch and mouse events to a sound for piano-style interactive controls.

`useInteractionMethods(element, player)` attaches `touchstart`/`mousedown` → `play()` and `touchend`/`mouseup`/`mouseleave` → `stop()`. It returns a cleanup function to remove all listeners:

```typescript
import { useInteractionMethods, createOscillator } from 'ez-web-audio'

const synth = await createOscillator({ frequency: 440 })
const key = document.getElementById('piano-key')!

const cleanup = await useInteractionMethods(key, synth)
// Touching or clicking the element now plays/stops the synth

// Later — clean up on component unmount
cleanup()
```

`preventEventDefaults(element)` prevents text selection, context menus, and drag-and-drop on interactive audio elements. It also returns a cleanup function:

```typescript
import { preventEventDefaults, useInteractionMethods, createOscillator } from 'ez-web-audio'

const synth = await createOscillator({ frequency: 261.63 }) // C4
const key = document.getElementById('key-c4')!

// Prevent browser defaults (selection, context menu, drag) before binding audio
const removePrevention = preventEventDefaults(key)
const cleanup = await useInteractionMethods(key, synth)

// Clean up both when done
removePrevention()
cleanup()
```

Both helpers work with any object that has `play()` and `stop()` methods — not just oscillators.

## Next Steps

- [Interactive Examples](/examples/) - See concepts in action
- [API Reference](/api/) - Detailed method documentation

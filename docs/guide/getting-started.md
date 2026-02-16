---
title: Getting Started with EZ Web Audio - JavaScript Audio Library
description: Learn how to install and use EZ Web Audio to play sounds, create synthesizers, and build audio applications in JavaScript and TypeScript. Quick setup guide with code examples.
---

# Getting Started

Get up and running with EZ Web Audio in under 5 minutes.

## Installation

::: code-group
```bash [pnpm]
pnpm add ez-web-audio
```

```bash [npm]
npm install ez-web-audio
```

```bash [yarn]
yarn add ez-web-audio
```
:::

## Your First Sound

Play a sound file with just a few lines of code:

```typescript
import { createSound } from 'ez-web-audio'

document.querySelector('button')?.addEventListener('click', async () => {
  const sound = await createSound('/sounds/click.mp3')
  sound.play()
})
```

### AudioContext & User Interaction

Browsers require a user interaction (click, tap, keypress) before playing audio.
This is a security feature to prevent auto-playing sounds. EZ Web Audio handles
this automatically — the AudioContext is created lazily when you first call a
factory function like `createSound()` or `createOscillator()`.

::: tip
You don't need to call `initAudio()`. The library creates and manages the
AudioContext automatically. Just make sure your first audio call happens inside
a user interaction handler (click, tap, keypress).
:::

::: details Advanced: Explicit initialization
If you need explicit control over initialization timing (e.g., iOS mute switch
workaround, pre-warming the context), you can still call `initAudio()`:

```typescript
import { initAudio, createSound } from 'ez-web-audio'

button.addEventListener('click', async () => {
  await initAudio() // Optional — for explicit control
  const sound = await createSound('/sounds/click.mp3')
  sound.play()
})
```
:::

## Playing Music Tracks

For longer audio files with pause/resume:

```typescript
import { createTrack } from 'ez-web-audio'

button.addEventListener('click', async () => {
  const track = await createTrack('/music/song.mp3')
  track.play()

  // Control playback
  pauseBtn.onclick = () => track.pause()
  resumeBtn.onclick = () => track.resume()
  seekBtn.onclick = () => track.seek(30).from('seconds') // Jump to 30 seconds
})
```

### Sound vs Track

| Feature | Sound | Track |
|---------|-------|-------|
| Use case | Short sounds (clicks, effects) | Music, long audio |
| Overlap | Multiple plays overlap | One play at a time |
| Pause/Resume | No | Yes |
| Seek | No | Yes |
| Position tracking | No | Yes |

## Generating Sounds

Create sounds from scratch with oscillators:

```typescript
import { createOscillator } from 'ez-web-audio'

button.addEventListener('click', async () => {
  const synth = await createOscillator({
    frequency: 440, // A4 note
    type: 'sine'    // sine, square, sawtooth, or triangle
  })

  synth.play()

  // Stop after 1 second
  setTimeout(() => synth.stop(), 1000)
})
```

### With ADSR Envelope

For more natural-sounding synthesis, add an envelope:

```typescript
const piano = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: {
    attack: 0.01,   // Quick attack
    decay: 0.3,     // Decay over 0.3 seconds
    sustain: 0.4,   // Sustain at 40% volume
    release: 0.5    // Fade out over 0.5 seconds
  }
})

piano.play()
// Call stop() to trigger the release phase
piano.stop()
```

## Controlling Volume and Pan

All sounds support gain (volume) and pan (stereo position):

```typescript
const sound = await createSound('/sounds/effect.mp3')

// Set volume to 50%
sound.changeGainTo(0.5)

// Pan to the left
sound.changePanTo(-1) // -1 = left, 0 = center, 1 = right

sound.play()
```

### Scheduled Parameter Changes

You can also schedule parameter changes relative to play time:

```typescript
const sound = await createSound('/sounds/whoosh.mp3')

// Fade in over 1 second
sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')

sound.play() // Starts silent, fades in
```

## Adding Effects

Apply effects like filters to shape your sound:

```typescript
import { createSound, createFilterEffect, getAudioContext } from 'ez-web-audio'

const sound = await createSound('/sounds/vocal.mp3')
const ctx = await getAudioContext()

// Create a lowpass filter
const filter = createFilterEffect(ctx, 'lowpass', {
  frequency: 800,  // Cut frequencies above 800Hz
  Q: 1.0           // Resonance
})

sound.addEffect(filter)
sound.play() // Sound plays through the filter
```

## Preloading Audio

For responsive applications, preload audio files before they're needed:

```typescript
import { preload, isPreloaded, createSound } from 'ez-web-audio'

// Preload during app initialization
await preload(['/sounds/click.mp3', '/sounds/whoosh.mp3'])

// Later, sounds load instantly from cache
if (isPreloaded('/sounds/click.mp3')) {
  const sound = await createSound('/sounds/click.mp3') // Uses cached data
  sound.play()
}
```

## Complete Example

Here's a complete example combining multiple features:

```typescript
import { createSound, createTrack, createOscillator } from 'ez-web-audio'

// Wait for user interaction
document.getElementById('start')?.addEventListener('click', async () => {
  // Sound effect for UI feedback
  const click = await createSound('/sounds/click.mp3')
  click.changeGainTo(0.5)

  // Background music
  const music = await createTrack('/music/background.mp3')
  music.changeGainTo(0.3)
  music.play()

  // Synthesized notification sound
  const notification = await createOscillator({
    frequency: 880,
    type: 'sine',
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
  })

  // Wire up UI
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => click.play())
  })

  document.getElementById('notify')?.addEventListener('click', () => {
    notification.play()
    notification.stop()
  })

  document.getElementById('pause')?.addEventListener('click', () => music.pause())
  document.getElementById('resume')?.addEventListener('click', () => music.resume())
})
```

## Next Steps

- [Core Concepts](/guide/concepts) - Understand the library architecture
- [Interactive Examples](/examples/) - Try features in your browser
- [API Reference](/api/) - Complete documentation

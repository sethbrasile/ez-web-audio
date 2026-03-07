---
title: Basic Audio Playback - Play Sounds in JavaScript
description: Learn how to load and play audio files in the browser using JavaScript. Simple one-shot playback, music tracks with pause/resume/seek, and oscillator synthesis.
---

# Basic Playback

Learn how to load and play audio files with EZ Web Audio. This page covers the two main ways to play audio: **Sound** for one-shot effects and **Track** for music with playback control.

## Try It: Sound Demo

Click the button to play a sound effect. Adjust volume and pan before or after playing.

<llm-exclude>
<AudioDemo />
</llm-exclude>

<llm-only>
Basic audio playback demo: click to load and play a sound effect with volume and pan controls.
</llm-only>

### Code

```typescript
import { createSound } from 'ez-web-audio'

// Load and play a sound on user interaction
button.addEventListener('click', async () => {
  const click = await createSound('/audio/click.mp3')
  click.play()
})
```

## Try It: Track Demo

Tracks provide full playback control for music: play, pause, resume, seek, and position tracking. The demo above is built with the code below.

<llm-exclude>
<TrackDemo />
</llm-exclude>

<llm-only>
Music track demo with play/pause/stop controls, seek slider, and real-time position display showing current time and progress percentage.
</llm-only>

### Code

```typescript
import { createTrack } from 'ez-web-audio'

const track = await createTrack('/audio/music.mp3')

// Play / pause toggle
function playPause() {
  if (track.isPlaying) {
    track.pause()
  }
  else {
    track.play()
  }
}

// Stop resets to the beginning
function stop() {
  track.stop()
}

// Seek to a specific time (e.g. from a slider's value)
function onSeek(seconds: number) {
  track.seek(seconds).as('seconds')
}

// Live position tracking with requestAnimationFrame
function updateDisplay() {
  if (track.isPlaying) {
    console.log(track.position.string) // '0:45'
    console.log(track.percentPlayed) // 25
    requestAnimationFrame(updateDisplay)
  }
}

// Start the display loop whenever playback begins or resumes
track.on('play', updateDisplay)
track.on('resume', updateDisplay)
```

## Sound vs Track

Choose the right class for your use case:

| Feature | Sound | Track |
|---------|-------|-------|
| **Use case** | Sound effects, UI sounds | Music, podcasts, long audio |
| **Overlapping plays** | Yes - each `play()` creates new source | No - one playback at a time |
| **Pause/Resume** | No | Yes |
| **Seek** | No | Yes |
| **Position tracking** | No | Yes (position, percentPlayed) |
| **Duration** | Available | Available |
| **Events** | play, stop, end | play, stop, end, pause, resume |

### When to Use Sound

```typescript
// Sound effects that may overlap
const laser = await createSound('laser.mp3')

// Rapid fire - each call creates a new playback
laser.play()
laser.play() // Overlaps with previous
laser.play() // All three play simultaneously
```

### When to Use Track

```typescript
// Music with playback control
const song = await createTrack('song.mp3')

song.play()
// User clicks pause button
song.pause()
// User clicks play button
song.resume() // Continues from where it paused
```

## Volume and Pan Control

Both Sound and Track support volume (gain) and stereo position (pan):

```typescript
const sound = await createSound('click.mp3')

// Volume: 0 (silent) to 1 (full volume), can exceed 1 for boost
sound.changeGainTo(0.5) // 50% volume

// Pan: -1 (left) to 1 (right), 0 is center
sound.changePanTo(-1) // Full left
sound.changePanTo(0) // Center
sound.changePanTo(1) // Full right

sound.play()
```

## Track Position and Duration

Track provides timing info in multiple formats:

```typescript
const track = await createTrack('song.mp3')

// Duration
track.duration.raw // 180.5 (seconds)
track.duration.string // '3:00'
track.duration.pojo // { minutes: 3, seconds: 0 }

// Current position (updates during playback)
track.position.raw // 45.2 (seconds)
track.position.string // '0:45'

// Progress as percentage (0–100)
track.percentPlayed // 25
```

## Track Events

```typescript
track.on('play', () => { /* playback started */ })
track.on('pause', () => { /* paused */ })
track.on('resume', () => { /* resumed after pause */ })
track.on('stop', () => { /* stopped programmatically */ })
track.on('end', () => { /* reached the end naturally */ })
```

## Preloading Audio

For better user experience, preload audio before it's needed:

```typescript
import { createSound, isPreloaded, preload } from 'ez-web-audio'

// Preload during app initialization
await preload([
  '/audio/click.mp3',
  '/audio/success.mp3',
  '/audio/error.mp3'
])

// Later, createSound uses cached data
const click = await createSound('/audio/click.mp3') // Fast!

// Check if a file is preloaded
if (isPreloaded('/audio/music.mp3')) {
  console.log('Ready to play immediately')
}
```

## Error Handling

Handle loading and playback errors gracefully:

```typescript
import { AudioContextError, AudioLoadError, createSound } from 'ez-web-audio'

try {
  const sound = await createSound('/audio/missing.mp3')
  sound.play()
}
catch (error) {
  if (error instanceof AudioLoadError) {
    console.error('Failed to load audio:', error.url)
  }
  else if (error instanceof AudioContextError) {
    console.error('Audio system error:', error.message)
  }
}
```

## Next Steps

- [Synthesis](/examples/synthesis) - Generate sounds with oscillators
- [Effects](/examples/effects) - Add filters and effects to your audio
- [Core Concepts](/guide/concepts) - Understand the audio system architecture

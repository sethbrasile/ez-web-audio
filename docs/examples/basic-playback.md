---
title: Basic Playback
---

# Basic Playback

Learn how to load and play audio files with EZ Web Audio. This page covers the two main ways to play audio: **Sound** for one-shot effects and **Track** for music with playback control.

## Try It: Sound Demo

Click the button to play a sound effect. Adjust volume and pan before or after playing.

<AudioDemo />

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

Tracks provide full playback control for music: play, pause, resume, seek, and position tracking.

<TrackDemo />

### Code

```typescript
import { createTrack } from 'ez-web-audio'

async function playMusic() {
  const song = await createTrack('/audio/music.mp3')

  // Play the track
  song.play()

  // Pause and resume
  song.pause()
  song.resume()

  // Seek to 30 seconds
  song.seek(30).from('seconds')

  // Get current position
  console.log(song.position.string) // '0:30'
  console.log(song.percentPlayed)   // 0.25 (25%)
}
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
sound.changeGainTo(0.5)  // 50% volume

// Pan: -1 (left) to 1 (right), 0 is center
sound.changePanTo(-1)    // Full left
sound.changePanTo(0)     // Center
sound.changePanTo(1)     // Full right

sound.play()
```

## Track Position and Duration

Track provides detailed timing information:

```typescript
const track = await createTrack('song.mp3')

// Duration (read-only)
console.log(track.duration.raw)    // 180.5 (seconds)
console.log(track.duration.string) // '3:00'
console.log(track.duration.pojo)   // { minutes: 3, seconds: 0 }

// Current position (updates during playback)
console.log(track.position.raw)    // 45.2 (seconds)
console.log(track.position.string) // '0:45'

// Progress percentage (0 to 1)
console.log(track.percentPlayed)   // 0.25
```

## Track Events

Track emits events for playback state changes:

```typescript
const track = await createTrack('song.mp3')

// When playback starts
track.on('play', () => {
  console.log('Started playing')
})

// When playback ends naturally
track.on('end', () => {
  console.log('Finished playing')
})

// When stopped programmatically
track.on('stop', () => {
  console.log('Stopped by user')
})

// When paused
track.on('pause', () => {
  console.log('Paused')
})

// When resumed after pause
track.on('resume', () => {
  console.log('Resumed')
})

track.play()
```

### Building a Progress Bar

```typescript
const track = await createTrack('song.mp3')
const progressBar = document.getElementById('progress')

// Update progress during playback
function updateProgress() {
  if (track.isPlaying) {
    progressBar.style.width = `${track.percentPlayed * 100}%`
    requestAnimationFrame(updateProgress)
  }
}

track.on('play', updateProgress)
track.on('resume', updateProgress)

// Click to seek
progressBar.parentElement.addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  track.seek(percent).from('ratio')
})
```

## Preloading Audio

For better user experience, preload audio before it's needed:

```typescript
import { preload, createSound, isPreloaded } from 'ez-web-audio'

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
import { createSound, AudioLoadError, AudioContextError } from 'ez-web-audio'

try {
  const sound = await createSound('/audio/missing.mp3')
  sound.play()
} catch (error) {
  if (error instanceof AudioLoadError) {
    console.error('Failed to load audio:', error.url)
  } else if (error instanceof AudioContextError) {
    console.error('Audio system error:', error.message)
  }
}
```

## Next Steps

- [Synthesis](/examples/synthesis) - Generate sounds with oscillators
- [Effects](/examples/effects) - Add filters and effects to your audio
- [Core Concepts](/guide/concepts) - Understand the audio system architecture

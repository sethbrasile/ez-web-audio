---
title: Utilities - Batch Loading, Crossfade, Debug, Preloading
description: Use EZ Web Audio utility functions for batch sound loading, synchronized playback, equal-power crossfade, preloading, cache management, debug logging, and interaction helpers.
---

# Utility Functions

EZ Web Audio ships with a set of utility functions for common audio programming tasks — loading multiple sounds, synchronized playback, crossfading, preloading, debug logging, and binding UI interactions.

## Collection Control

Control multiple sounds at once with a single call:

```typescript
import { pauseAll, playAll, stopAll } from 'ez-web-audio'

const sounds = [sound1, sound2, sound3]

playAll(sounds) // Play all sounds
pauseAll(sounds) // Pause all tracks (no effect on non-track sounds)
stopAll(sounds) // Stop all sounds
```

## Synchronized Playback

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

## Batch Loading

Load multiple sounds at once with optional progress tracking:

```typescript
import { createSounds } from 'ez-web-audio'

const sounds = await createSounds(
  ['click.mp3', 'whoosh.mp3', 'ding.mp3'],
  (loaded, total) => console.log(`${loaded}/${total}`)
)
```

For tracks (music with pause/resume/seek), use `createTracks()`:

```typescript
import { createTracks } from 'ez-web-audio'

const tracks = await createTracks(
  ['intro.mp3', 'verse.mp3', 'chorus.mp3'],
  (loaded, total, url) => console.log(`${loaded}/${total}: ${url}`)
)
```

Both callbacks fire after each item finishes loading, making it easy to drive a loading progress bar.

## Crossfade

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

## Preloading Audio

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

## Cache Management

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

## Noise Generation

Generate procedural noise for ambience, testing, or synthesis:

```typescript
import { createNoise } from 'ez-web-audio'

const white = await createNoise('white') // Equal energy — hiss/static
const pink = await createNoise('pink') // 1/f spectrum — natural ambience
const brown = await createNoise('brown') // Random walk — deep rumble
```

White noise has a flat spectrum (equal energy at all frequencies). Pink noise rolls off 3 dB/octave, sounding more balanced to human ears. Brown noise rolls off 6 dB/octave for a deep, rumbling character. All return a looped `Sound` instance — add effects and control gain like any other sound.

## Debug Mode

Enable debug logging to trace audio events and connections during development:

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

// Capture warning messages only
setDebugHandler((msg) => {
  if (msg.type === 'warning') {
    myLogger.warn(`[${msg.source}] ${msg.message}`)
  }
})

// Restore default console.log handler
setDebugHandler(null)
```

## Interaction Helpers

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

## Resource Cleanup

When you're done with a sound, call `dispose()` to disconnect all audio nodes and free resources:

```typescript
sound.dispose()
// sound.play() will now throw — the instance is no longer usable
```

`dispose()` is idempotent — calling it multiple times has no additional effect. This is especially important in single-page applications where audio instances are created and destroyed as users navigate between views.

### Context-Free Analyzer

`createAnalyzer()` works without passing an AudioContext — it resolves the shared context automatically:

```typescript
const analyzer = createAnalyzer({ fftSize: 2048 })
```

This matches the pattern used by `createFilterEffect()` and `createGainEffect()`, keeping your code consistent without needing to manage context references directly.

## Next Steps

- [Core Concepts](/guide/concepts) - Sound types, AudioContext lifecycle, audio routing
- [Parameter Control](/guide/parameter-control) - Automate gain, frequency, and pan over time
- [Interactive Examples](/examples/) - See utilities in action
- [API Reference](/api/) - Full method documentation

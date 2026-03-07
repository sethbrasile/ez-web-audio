---
title: Crossfade - Smooth Transitions Between Tracks
description: "Learn how to crossfade smoothly between two audio tracks using equal-power curves. Create DJ-style transitions without volume dips using EZ Web Audio's crossfade function."
---

<script setup>
import CrossfadeDemo from '../.vitepress/theme/components/CrossfadeDemo.vue'
</script>

# Crossfade — Smooth Transitions Between Tracks

The `crossfade()` function creates a smooth, DJ-style transition between two Tracks using equal-power curves. The fading track fades out while the incoming track fades in, maintaining constant perceived loudness throughout the transition.

**You'll learn:**
- Using `crossfade(fromTrack, toTrack, duration)` for smooth transitions
- How equal-power curves work and why they sound better than linear fades
- Awaiting crossfade completion for sequenced transitions
- Managing track state before and after crossfades

## Interactive Demo

<llm-exclude>
<CrossfadeDemo />
</llm-exclude>

<llm-only>
Crossfade between two audio tracks using equal-power curves. Adjustable crossfade duration with play controls for both tracks.
</llm-only>

## Basic Usage

Load two tracks and call `crossfade()` to transition between them:

```typescript
import { createTrack, crossfade } from 'ez-web-audio'

const trackA = await createTrack('song-a.mp3')
const trackB = await createTrack('song-b.mp3')

// Start Track A
await trackA.play()

// Later: crossfade from A to B over 2 seconds
await crossfade(trackA, trackB, 2)
// Track A is paused, Track B is playing at full gain
```

## Outgoing Track Behavior

By default, the outgoing track is **paused** after the fade, preserving its position. You can control this with the `afterFade` option:

```typescript
// Default: pause the outgoing track (preserves position, frees resources)
await crossfade(trackA, trackB, 2)
await crossfade(trackA, trackB, 2, { afterFade: 'pause' }) // same as above

// DJ-style: outgoing track keeps playing silently at gain 0
await crossfade(trackA, trackB, 2, { afterFade: 'continue' })
// When you crossfade back, trackA is right where it would naturally be

// Full stop: reset outgoing track to the beginning
await crossfade(trackA, trackB, 2, { afterFade: 'stop' })
```

::: tip When to use `'continue'`
Use `afterFade: 'continue'` when crossfading back and forth between tracks (like a DJ mixer). The outgoing track keeps playing silently, so when you crossfade back to it, there's no jump in playback position. Keep in mind that the silent track still uses audio resources — if you're done with a track, `'pause'` or `'stop'` is more efficient.
:::

## Crossfade Behavior

- **Source track** (first argument): fades out from current gain to 0 using equal-power curves
- **Destination track** (second argument): fades in from 0 to full gain (or from current gain if already playing)
- If the destination was previously paused (e.g., from an earlier crossfade), it resumes from its paused position
- The `await` resolves when the fade duration completes

```typescript
// Crossfade over different durations
await crossfade(trackA, trackB, 0.5) // Fast 0.5-second crossfade
await crossfade(trackA, trackB, 4) // Slow 4-second crossfade

// Crossfade to a track that's already playing at a specific position
await trackB.play()
// Both tracks play during the crossfade
await crossfade(trackA, trackB, 2)
```

## Equal-Power Curves

A naive linear crossfade creates a volume dip at the midpoint — when both tracks are at 50%, the total power drops. Equal-power crossfading uses trigonometric curves to maintain constant power:

- **Fade out**: `cos(t × π/2)` — starts at full volume, drops slowly at first, then rapidly
- **Fade in**: `sin(t × π/2)` — starts silent, rises rapidly at first, then levels off
- The identity `cos²(x) + sin²(x) = 1` guarantees constant total power throughout

```
Linear crossfade:        Equal-power crossfade:
A: 1.0 → 0.5 → 0.0     A: 1.0 → 0.71 → 0.0
B: 0.0 → 0.5 → 1.0     B: 0.0 → 0.71 → 1.0
Total: 1.0 → 0.5 → 1.0 Total: 1.0 → 1.0 → 1.0
         ↑ DIP                     ↑ NO DIP
```

## Sequenced Transitions

Chain crossfades by awaiting each one:

```typescript
await trackA.play()

// Crossfade A → B over 2 seconds
await crossfade(trackA, trackB, 2)

// Crossfade B → C over 3 seconds
await crossfade(trackB, trackC, 3)

// Now only trackC is playing
```

## Managing Gain Before Crossfade

If you've changed a track's gain, `crossfade()` fades from the current gain value:

```typescript
// Track A is playing quietly
trackA.changeGainTo(0.5)

// Crossfade will fade A from 0.5 (not 1.0) to 0
await crossfade(trackA, trackB, 2)
```

::: tip Looping Tracks
For background music, set a track to loop before crossfading to it:

```typescript
const bgMusicA = await createTrack('ambient-a.mp3')
const bgMusicB = await createTrack('ambient-b.mp3')

bgMusicA.loop = true
bgMusicB.loop = true

await bgMusicA.play()

// Smooth transition to the next track
await crossfade(bgMusicA, bgMusicB, 3)
```
:::

## Next Steps

- [Basic Playback](/examples/basic-playback) — Working with tracks (pause, resume, seek)
- [LayeredSound](/examples/layered-sound) — Synchronized multi-layer playback
- [Effects](/examples/effects) — Apply real-time audio effects

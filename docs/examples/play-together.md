---
title: playTogether - Synchronized Sound Triggering
description: "Play multiple sounds at exactly the same moment using playTogether() for sample-accurate synchronization."
---

<script setup>
import PlayTogetherDemo from '../.vitepress/theme/components/PlayTogetherDemo.vue'
</script>

# playTogether — Synchronized Sound Triggering

`playTogether()` plays multiple sounds at the exact same `AudioContext` timestamp, ensuring sample-accurate synchronization. This is more precise than calling `play()` on each sound sequentially, which introduces tiny timing gaps.

**You'll learn:**
- Using `playTogether()` for synchronized multi-sound playback
- The difference between synchronized and sequential triggering
- When to use `playTogether()` vs `LayeredSound`

## Interactive Demo

<PlayTogetherDemo />

## Basic Usage

```typescript
import { createSound, playTogether } from 'ez-web-audio'

const kick = await createSound('kick.mp3')
const snare = await createSound('snare.mp3')
const hihat = await createSound('hihat.mp3')

// All three start at the exact same AudioContext time
await playTogether([kick, snare, hihat])
```

## How It Works

`playTogether()` uses the Web Audio API's precise scheduling:

1. Gets the current `audioContext.currentTime`
2. Adds a tiny offset (0.01 seconds) to ensure the browser has time to schedule
3. Calls `playAt(startTime)` on every sound with the **same** timestamp
4. All sounds begin at that exact moment — no drift, no gaps

```typescript
// Under the hood (simplified):
const startTime = audioContext.currentTime + 0.01
await Promise.all(sounds.map(s => s.playAt(startTime)))
```

## playTogether vs LayeredSound

| Feature | `playTogether()` | `LayeredSound` |
|---------|------------------|----------------|
| Synchronized start | Yes | Yes |
| Master gain/pan | No | Yes |
| Per-layer control | Manual | Built-in |
| One-shot use | Ideal | Works |
| Continuous mixing | Use manually | Ideal |

Use `playTogether()` for one-shot synchronized triggers (e.g., playing a chord, triggering multiple percussion hits). Use `LayeredSound` when you need ongoing master control over a group of sounds.

## Works With Any Playable

`playTogether()` accepts any array of `Playable` instances — Sounds, Tracks, Oscillators, or any mix:

```typescript
import { createSound, createOscillator, playTogether } from 'ez-web-audio'

const drum = await createSound('kick.mp3')
const bass = createOscillator({ frequency: 55, type: 'sawtooth' })

await playTogether([drum, bass])
```

## Next Steps

- [LayeredSound](/examples/layered-sound) — Synchronized playback with master controls
- [Basic Playback](/examples/basic-playback) — Playing individual sounds
- [Synthesis](/examples/synthesis) — Creating sounds with oscillators

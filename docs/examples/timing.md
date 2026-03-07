---
title: Audio Timing - Schedule Sounds with Web Audio API
description: Learn precise audio scheduling with play(), playIn(), and playAt() methods. Interactive demo showing immediate, delayed, and scheduled sound playback.
---

# Timing Basics

Master Web Audio's scheduling system for precise, synchronized playback.

## Quick Reference

The interactive demo below shows four timing methods:

```typescript
// 1. Immediate playback
sound.play()

// 2. Delayed playback (relative)
sound.playIn(1) // plays in 1 second

// 3. Precise scheduling (absolute)
const ctx = await getAudioContext()
sound.playAt(ctx.currentTime + 0.5) // plays at exact time

// 4. Perfect sync - multiple sounds at same time
const now = ctx.currentTime
osc1.playAt(now)
osc2.playAt(now)
osc3.playAt(now)
```

<llm-exclude>
<TimingDemo />
</llm-exclude>

<llm-only>

Timing and scheduling demo: immediate playback with play(), delayed playback with playIn(), and precise scheduled playback with playAt().

</llm-only>

## Why Timing Matters

JavaScript's `setTimeout` and `setInterval` are unreliable for audio timing. They can drift by hundreds of milliseconds due to browser throttling, event loop congestion, and background tab deprioritization.

Web Audio's timing system runs on a separate, high-priority thread with **sample-accurate precision**. The `AudioContext.currentTime` clock is independent of the JavaScript main thread and always advances at exactly the audio sample rate.

This means:
- No drift or jitter
- Perfect synchronization across multiple sounds
- Accurate scheduling even in background tabs
- Reliable timing for musical applications

## Timing Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `play()` | Immediate playback | `sound.play()` |
| `playIn(seconds)` | Delayed playback (relative) | `sound.playIn(1)` plays in 1 second |
| `playAt(time)` | Scheduled playback (absolute) | `sound.playAt(ctx.currentTime + 0.5)` |

## Perfect Synchronization

When you need multiple sounds to start at exactly the same moment, use `playAt()` with `audioContext.currentTime`:

```typescript
import { createOscillator, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const now = ctx.currentTime

// All three oscillators start at EXACTLY the same sample
const c = await createOscillator({ frequency: 261.63 })
const e = await createOscillator({ frequency: 329.63 })
const g = await createOscillator({ frequency: 392.00 })

c.playAt(now)
e.playAt(now)
g.playAt(now)
```

This achieves **sample-perfect synchronization** — the kind of precision impossible with JavaScript timers.

## Immediate Playback

For simple cases where you just want to play a sound right now:

```typescript
import { createSound } from 'ez-web-audio'

// Must be called in response to user interaction (e.g., button click)
const sound = await createSound('/audio/click.mp3')
sound.play()
```

## Delayed Playback

Schedule a sound to play after a delay using `playIn()`:

```typescript
const sound = await createSound('/audio/kick.mp3')

// Play in 1 second
sound.playIn(1)

// Play in 500ms
sound.playIn(0.5)
```

Behind the scenes, `playIn()` converts the relative delay to an absolute time using `audioContext.currentTime + seconds`.

## Scheduled Playback

For precise control, use `playAt()` with absolute times from the audio clock:

```typescript
import { createSound, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const now = ctx.currentTime

const kick = await createSound('/audio/kick.mp3')
const snare = await createSound('/audio/snare.mp3')
const hihat = await createSound('/audio/hihat.mp3')

// Schedule a drum pattern
kick.playAt(now + 0.0) // Beat 1
hihat.playAt(now + 0.25) // 16th note later
snare.playAt(now + 0.5) // Beat 2
hihat.playAt(now + 0.75) // Another 16th
kick.playAt(now + 1.0) // Beat 3
```

All scheduling happens instantly in JavaScript. The sounds will play at their scheduled times with sample-accurate precision, even if your JavaScript code blocks or the tab loses focus.

## API Used

- **`play()`** — Play sound immediately
- **`playIn(seconds)`** — Play sound after a delay
- **`playAt(time)`** — Play sound at specific audio clock time
- **`getAudioContext()`** — Get the global AudioContext
- **`audioContext.currentTime`** — Current time on the audio clock (in seconds)

## Next Steps

- [Drum Machine](/examples/drum-machine) — Build rhythmic patterns with `BeatTrack`
- [Sampled Drum Kit](/examples/sampled-drum-kit) — Multi-zone drum pad with velocity layers
- [Audio Routing](/examples/audio-routing) — Add custom effects to the signal chain

---
title: LayeredSound - Synchronized Multi-Layer Playback
description: "Learn how to play multiple audio layers in perfect synchronization using LayeredSound. Control all layers together as a group or adjust each layer individually."
---

<script setup>
import LayeredSoundDemo from '../.vitepress/theme/components/LayeredSoundDemo.vue'
</script>

# LayeredSound — Synchronized Multi-Layer Playback

LayeredSound plays multiple Sound or Oscillator instances at exactly the same moment using the Web Audio API's precise timing. All layers start at the same `audioContext.currentTime` value for sample-accurate synchronization.

**You'll learn:**
- Creating a LayeredSound with `createLayeredSound()`
- Synchronized multi-layer playback
- Master gain/pan control affecting all layers
- Per-layer gain control for mixing
- Responding to `play`, `stop`, and `end` events

## Interactive Demo

<LayeredSoundDemo />

## Basic Usage

Load your sounds first, then combine them into a LayeredSound:

```typescript
import { createLayeredSound, createSound } from 'ez-web-audio'

const bass = await createSound('bass.mp3')
const melody = await createSound('melody.mp3')
const synth = await createSound('synth.mp3')

const layered = await createLayeredSound([bass, melody, synth])

// All three sounds start at exactly the same time
await layered.play()
```

## Master Controls

Control all layers together using master gain and pan:

```typescript
// Set master volume for all layers (0–1 range)
layered.setGain(0.75)

// Set stereo panning for all layers (-1 left, 0 center, 1 right)
layered.setPan(-0.2)

await layered.play()
```

## Individual Layer Access

Get a specific layer by index for individual control:

```typescript
const layered = await createLayeredSound([bass, melody, synth])

// Access individual layers (0-based index)
const bassLayer = layered.getLayer(0)
const melodyLayer = layered.getLayer(1)

// Set individual layer gain
bassLayer?.changeGainTo(0.9)
melodyLayer?.changeGainTo(0.6)

// Count active layers
console.log(layered.layerCount) // 3
```

## Timed Playback

Play all layers for a fixed duration, then auto-stop:

```typescript
// Play all layers for 2 seconds, then stop automatically
await layered.playFor(2)
```

## Event Handling

Listen for playback lifecycle events:

```typescript
layered.on('play', (event) => {
  console.log(`Started at audioContext time: ${event.detail.time}`)
})

layered.on('stop', () => {
  console.log('All layers stopped')
})

layered.on('end', () => {
  // Fires when the last layer finishes (layers may end at different times)
  console.log('All layers finished naturally')
})

layered.on('warning', (event) => {
  console.warn(`LayeredSound warning: ${event.detail.message}`)
})
```

## Stopping All Layers

Stop all layers at once:

```typescript
await layered.stop()
```

::: tip Layer Count Warning
LayeredSound will log a console warning if you create an instance with 8 or more layers. This is configurable via `warnLayerCount` option. High layer counts may impact performance on some devices.
:::

```typescript
// Customize the warning threshold
const layered = await createLayeredSound(sounds, { warnLayerCount: 16 })
```

## Next Steps

- [Basic Playback](/examples/basic-playback) — Playing individual sounds
- [AudioSprite](/examples/audio-sprite) — Pack multiple sounds into one file
- [Crossfade](/examples/crossfade) — Smooth transitions between tracks

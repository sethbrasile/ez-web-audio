---
title: Synchronized Multi-Sound Playback
description: "Play multiple sounds at exactly the same moment using playTogether() for one-shot triggers, or LayeredSound for ongoing control with master gain and pan."
---

<script setup>
import PlayTogetherDemo from '../.vitepress/theme/components/PlayTogetherDemo.vue'
import LayeredSoundDemo from '../.vitepress/theme/components/LayeredSoundDemo.vue'
</script>

# Synchronized Multi-Sound Playback

EZ Web Audio provides two ways to play multiple sounds at exactly the same moment using the Web Audio API's precise timing:

- **`playTogether()`** — A one-liner for fire-and-forget synchronized playback
- **`LayeredSound`** — A class with master gain/pan and per-layer control

## playTogether()

The simplest way to play multiple sounds at the same time:

```typescript
import { createSound, playTogether } from 'ez-web-audio'

const kick = await createSound('kick.mp3')
const snare = await createSound('snare.mp3')
const hihat = await createSound('hihat.mp3')

// All three start at the exact same AudioContext time
await playTogether([kick, snare, hihat])
```

`playTogether()` gets the current `audioContext.currentTime`, adds a tiny scheduling offset, and calls `playAt()` on every sound with the same timestamp. Works with any mix of Sounds, Tracks, and Oscillators.

### Interactive Demo

<llm-exclude>
<PlayTogetherDemo />
</llm-exclude>

<llm-only>

Play multiple sounds simultaneously using playTogether() for perfectly synchronized one-shot triggering.

</llm-only>

## LayeredSound

When you need ongoing control over a group of synchronized sounds — master volume, panning, per-layer mixing — use `LayeredSound`:

```typescript
import { createLayeredSound, createSound } from 'ez-web-audio'

const bass = await createSound('bass.mp3')
const melody = await createSound('melody.mp3')
const synth = await createSound('synth.mp3')

const layered = await createLayeredSound([bass, melody, synth])

// All three sounds start at exactly the same time
await layered.play()
```

### Interactive Demo

<llm-exclude>
<LayeredSoundDemo />
</llm-exclude>

<llm-only>

LayeredSound demo with individual volume sliders for each layer and a master gain control for the combined output.

</llm-only>

### Master Controls

Control all layers together using master gain and pan:

```typescript
// Set master volume for all layers (0–1 range)
layered.setGain(0.75)

// Set stereo panning for all layers (-1 left, 0 center, 1 right)
layered.setPan(-0.2)

await layered.play()
```

### Individual Layer Access

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

### Timed Playback

Play all layers for a fixed duration, then auto-stop:

```typescript
// Play all layers for 2 seconds, then stop automatically
await layered.playFor(2)
```

### Event Handling

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

### Stopping All Layers

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

## Which Should I Use?

`playTogether()` is a single function call — no class, no instance, no cleanup. It fires the sounds and you're done:

```typescript
// That's it. One line.
await playTogether([kick, snare, hihat])
```

`LayeredSound` is a persistent object that holds references to your sounds and gives you ongoing control — master volume, panning, per-layer mixing, events. It's more powerful but more to manage:

```typescript
const layered = await createLayeredSound([bass, melody, synth])
layered.setGain(0.75)
layered.setPan(-0.2)
await layered.play()
// ... later
await layered.stop()
```

| | `playTogether()` | `LayeredSound` |
|--|------------------|----------------|
| **Complexity** | One function call | Class instance with lifecycle |
| **Synchronized start** | Yes | Yes |
| **Master gain/pan** | No | Yes |
| **Per-layer control** | Manual | Built-in |
| **Best for** | One-shot triggers (chords, percussion hits) | Ongoing mixing and control |

## Next Steps

- [Basic Playback](/examples/basic-playback) — Playing individual sounds
- [AudioSprite](/examples/audio-sprite) — Pack multiple sounds into one file
- [Crossfade](/examples/crossfade) — Smooth transitions between tracks

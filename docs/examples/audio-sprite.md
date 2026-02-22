---
title: AudioSprite - Named Sound Regions from a Single File
description: "Learn how to pack multiple sounds into one audio file using AudioSprite. Reduce HTTP requests by loading a sprite file once and playing named segments on demand."
---

<script setup>
import AudioSpriteDemo from '../.vitepress/theme/components/AudioSpriteDemo.vue'
</script>

# AudioSprite — Named Sound Regions from a Single File

AudioSprite lets you pack multiple short sounds into a single audio file and play each by name. This technique reduces HTTP requests — instead of loading 10 separate sound effects, you load one file and define regions within it.

**You'll learn:**
- Loading an audio sprite with `createSprite()`
- Defining a spritemap with named time regions
- Playing named segments with `sprite.play('name')`
- Looping a sprite segment and stopping it
- Reducing HTTP requests in audio-heavy apps

## Interactive Demo

<AudioSpriteDemo />

## Basic Usage

Create a sprite by providing a URL to your audio file and a spritemap that defines each named region:

```typescript
import { createSprite } from 'ez-web-audio'

const sprite = await createSprite('sounds.mp3', {
  spritemap: {
    laser: { start: 0.0, end: 0.3 },
    explosion: { start: 1.0, end: 2.5 },
    powerup: { start: 3.0, end: 3.5 },
    coin: { start: 4.0, end: 4.2 },
  },
})
```

## Playing Segments

Call `sprite.play('name')` with the sprite name to play that region. Multiple calls can overlap — each call creates an independent audio source:

```typescript
// Play a one-shot sound effect
sprite.play('laser')

// Adjust gain and stereo pan per play
sprite.play('explosion', { gain: 0.7, pan: -0.5 })

// Play the same sprite multiple times (concurrent)
sprite.play('coin')
sprite.play('coin')
sprite.play('coin')
```

## Looping Sprites

Set `loop: true` in the sprite definition to enable seamless looping:

```typescript
const sprite = await createSprite('sounds.mp3', {
  spritemap: {
    engine: { start: 0.0, end: 2.0, loop: true },
    hit: { start: 2.5, end: 2.8 },
  },
})

// Start looping engine sound
sprite.play('engine')

// Stop the loop when done
sprite.stop('engine')
```

## Stopping Playback

Stop a specific sprite (useful for looping) or all active sprites at once:

```typescript
// Stop all active playback of a named sprite
sprite.stop('engine')

// Stop all currently playing sprites
sprite.stopAll()
```

## Checking Available Sprites

List all sprite names defined in the manifest:

```typescript
console.log(sprite.names) // ['laser', 'explosion', 'powerup', 'coin']
```

## Spritemap Format

The spritemap definition is compatible with the [audiosprite](https://github.com/tonistiigi/audiosprite) tool format:

```json
{
  "spritemap": {
    "click": { "start": 0.0, "end": 0.1 },
    "hover": { "start": 0.2, "end": 0.35 },
    "success": { "start": 0.5, "end": 1.2 },
    "ambient": { "start": 2.0, "end": 6.0, "loop": true }
  }
}
```

::: tip Sprite Generation
Use a tool like [audiosprite](https://github.com/tonistiigi/audiosprite) or [Howler's sprite tool](https://github.com/goldfire/howler.js) to concatenate your audio files and generate sprite manifests automatically.
:::

## Next Steps

- [Basic Playback](/examples/basic-playback) — Playing individual sounds
- [Sampled Drum Kit](/examples/sampled-drum-kit) — Using `createSampler()` for round-robin playback
- [LayeredSound](/examples/layered-sound) — Play multiple sounds in perfect sync

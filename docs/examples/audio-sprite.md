---
title: Audio Sprites - Multiple Sounds from One File
description: "Pack multiple sounds into a single audio file and play each by name. Supports both Howler.js and audiosprite manifest formats."
---

<script setup>
import AudioSpriteDemo from '../.vitepress/theme/components/AudioSpriteDemo.vue'
</script>

# Audio Sprites — Multiple Sounds from One File

Audio sprites bundle multiple short sounds into one file, reducing HTTP requests. Click below to hear how it works.

<AudioSpriteDemo />

## What Just Happened?

All 6 sounds you heard — beep, cannon, whoosh, bling, punch, fanfare — are packed into **a single MP3 file**. Instead of 6 HTTP requests, the browser loads one file and plays named segments within it.

A **manifest** maps each name to a time region:

```
┌──────┬────────┬───────┬──────┬───────┬─────────┐
│ beep │ cannon │ whoosh│ bling│ punch │ fanfare │
│ 0.0s │ 0.67s  │ 2.9s  │ 4.2s │ 6.7s  │ 7.7s    │
└──────┴────────┴───────┴──────┴───────┴─────────┘
```

`createSprite()` loads the file once, then plays segments by name. This technique is especially useful for games and interactive apps with many short sound effects — fewer requests means faster loading.

## Sprite Formats

EZ Web Audio accepts two popular manifest formats. Format detection is automatic based on the top-level key.

### audiosprite format

Uses `spritemap` with second-based `{start, end}` objects:

```json
{
  "spritemap": {
    "laser": { "start": 0, "end": 0.3 },
    "explosion": { "start": 1.0, "end": 2.5, "loop": false }
  }
}
```

### Howler.js format

Uses `sprite` with millisecond-based tuples `[offset_ms, duration_ms]`:

```json
{
  "sprite": {
    "laser": [0, 300],
    "explosion": [1000, 2500],
    "powerup": [4000, 500, true]
  }
}
```

Howler tuples are `[offset_ms, duration_ms]` with an optional third boolean for looping. EZ Web Audio detects which format you're using and normalizes internally — you don't need to convert anything.

## Basic Usage

```typescript
import { createSprite } from 'ez-web-audio'

// audiosprite format
const sprite = await createSprite('sounds.mp3', {
  spritemap: {
    laser: { start: 0, end: 0.3 },
    explosion: { start: 1.0, end: 2.5 },
  },
})

// Or Howler format — works the same way
const sprite2 = await createSprite('sounds.mp3', {
  sprite: {
    laser: [0, 300],
    explosion: [1000, 2500],
  },
})

sprite.play('laser')
sprite.play('explosion', { gain: 0.7 })
```

## Looping and Stopping

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

// Stop all active playback
sprite.stopAll()
```

## Creating Sprites

You can create sprite files manually or use tools:

- **[audiosprite CLI](https://github.com/tonistiigi/audiosprite)** — Concatenates audio files and generates manifest JSON automatically. Install with `npm install -g audiosprite`, then run `audiosprite -o output -e mp3 sound1.mp3 sound2.mp3`.

- **[soundfx](https://github.com/rse/soundfx)** — A ready-made collection of CC-licensed sound effects, perfect for prototyping and demos.

::: tip Silence Gaps
When creating sprites manually, add ~200ms of silence between sounds to prevent bleed from MP3 encoding artifacts.
:::

## Attribution

> Sound effects in the demo from the [soundfx](https://github.com/rse/soundfx) collection. Individual sounds by JustinBW, dersuperanton, and _MC5_ via [FreeSound](https://freesound.org) (CC-BY-3.0), and nps.gov and Vladimir via [SoundBible](https://soundbible.com) (CC-0).

## Next Steps

- [Basic Playback](/examples/basic-playback) — Playing individual sounds
- [Sampled Drum Kit](/examples/synth-drum-kit) — Using `createSampler()` for round-robin playback
- [LayeredSound](/examples/layered-sound) — Play multiple sounds in perfect sync

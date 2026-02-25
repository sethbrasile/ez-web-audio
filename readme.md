[![npm version](https://img.shields.io/npm/v/ez-web-audio.svg)](https://www.npmjs.com/package/ez-web-audio)
[![CI](https://img.shields.io/github/actions/workflow/status/sethbrasile/ez-web-audio/publish.yml?label=CI)](https://github.com/sethbrasile/ez-web-audio/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

# EZ Web Audio

A TypeScript library that makes the Web Audio API easy to use. No dependencies.

EZ Web Audio wraps the Web Audio API with a simpler, more intuitive interface. It covers sound playback, music tracks with pause/seek/position tracking, synthesizers with filters and ADSR envelopes, drum machines, samplers, audio sprites, effects chains, and soundfont support. Originally [Ember Audio](https://sethbrasile.github.io/ember-audio), it has been rewritten as a framework-agnostic TypeScript library that works with any frontend stack.

## Installation

```bash
npm install ez-web-audio
```

## Quick Start

### Play a Sound

```typescript
import { createSound } from 'ez-web-audio'

const click = await createSound('click.mp3')
click.play()

// Sounds can overlap — each play creates a new source
click.play()
click.play()
```

### Music Track with Controls

```typescript
import { createTrack } from 'ez-web-audio'

const song = await createTrack('song.mp3')
song.play()

// Pause and resume
song.pause()
song.resume()

// Seek to 30 seconds
await song.seek(30).as('seconds')

// Read current position
console.log(song.position.string) // '0:30'
```

### Synthesizer

```typescript
import { createOscillator } from 'ez-web-audio'

const synth = await createOscillator({
  frequency: 440,
  type: 'sine',
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 },
})

synth.play()
setTimeout(() => synth.stop(), 1000)
```

## Features

- Sound playback (one-shot sounds with overlap support)
- Music tracks (pause, resume, seek, position tracking)
- Synthesizer (oscillators with sine/square/sawtooth/triangle waves)
- ADSR envelopes (attack, decay, sustain, release)
- Effects chain (filters, gain effects, custom effects with bypass)
- Drum machine (BeatTrack with rhythmic patterns)
- Sampler (round-robin playback for natural variation)
- Audio sprites (named segments from a single audio file)
- Soundfont support (load and play instrument samples)
- Batch loading with progress tracking
- Synchronized playback (playTogether)
- Crossfade utility
- Zero dependencies
- Full TypeScript support with detailed type exports

## ESM Only

This package is ESM-only. It requires Node.js 18+ or a modern bundler (Vite, Webpack 5+, Rollup, esbuild). If using TypeScript, set `"moduleResolution": "bundler"` or `"node16"` in your `tsconfig.json`.

## Documentation

Full documentation is available at **https://sethbrasile.github.io/ez-web-audio**

The docs site includes:
- Getting started guide
- Core concepts and architecture overview
- Full API reference with type signatures
- Interactive examples and demos

## License

[MIT](LICENSE)

---
layout: home

hero:
  name: EZ Web Audio
  text: The Simple Web Audio API for JavaScript & TypeScript
  tagline: Play sounds, create synthesizers, build drum machines, and visualize audio — all with zero dependencies and full TypeScript support.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Try the Demos
      link: /examples/drum-machine
    - theme: alt
      text: API Reference
      link: /api/

features:
  - title: Play Sounds in 3 Lines
    details: Load and play audio files, create synthesizers, or build drum machines. No Web Audio boilerplate needed.
  - title: TypeScript-First
    details: Complete type safety with IntelliSense support. Every class, method, and option is fully typed — no @types packages needed.
  - title: Zero Dependencies
    details: Pure Web Audio API wrapper with nothing extra. Tree-shakeable ESM build keeps your bundle small.
  - title: Rich Feature Set
    details: ADSR envelopes, effects chain, audio sprites, beat sequencer, crossfade, visualization, and more — everything you need for browser audio.
---

## What is EZ Web Audio?

EZ Web Audio is a TypeScript library that wraps the Web Audio API with a simpler interface. Instead of dealing with AudioContext, AudioBufferSourceNode, and GainNode directly, you write clean, readable code:

### Play a Sound

```typescript
import { createSound } from 'ez-web-audio'

const sound = await createSound('/audio/click.mp3')
sound.play()
```

### Create a Synthesizer

```typescript
import { createOscillator } from 'ez-web-audio'

const synth = await createOscillator({
  type: 'sawtooth',
  note: 'A4',
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
})
synth.play()
```

### Build a Drum Machine

```typescript
import { createBeatTrack, createSound } from 'ez-web-audio'

const kick = await createSound('/audio/kick.wav')
const track = createBeatTrack(kick, 8) // 8-step pattern
track.setPattern([1, 0, 0, 1, 0, 0, 1, 0])
track.playLoop(120) // 120 BPM
```

### Apply Effects

```typescript
import { createFilterEffect, createSound } from 'ez-web-audio'

const sound = await createSound('/audio/guitar.mp3')
const lowpass = createFilterEffect({ type: 'lowpass', frequency: 800 })
sound.addEffect(lowpass)
sound.play()
```

From simple sound effects to full synthesizers with ADSR envelopes, EZ Web Audio handles the complexity so you can focus on creating.

## Why EZ Web Audio?

The raw Web Audio API is powerful but verbose. Creating a simple sound with volume control requires understanding AudioContext, AudioBufferSourceNode, GainNode, and their connection model. EZ Web Audio eliminates that boilerplate while keeping you close to the metal.

**What you get:**

- **Immediate productivity** -- play a sound in 3 lines, not 30. No need to manually create and connect AudioNodes.
- **Full TypeScript support** -- every parameter, option, and return type is documented and typed. Your editor tells you exactly what is available.
- **Framework agnostic** -- works with React, Vue, Svelte, or vanilla JS. Reactive wrappers (like Vue `reactive()`) are supported natively via `wrapWith`.
- **Production ready** -- input validation, descriptive error messages, event system, debug mode, and `dispose()` for cleanup.
- **No lock-in** -- access underlying AudioNodes when you need them. EZ Web Audio wraps the Web Audio API; it does not replace it.

### Best Demos to Try

- [Drum Machine](/examples/drum-machine) -- build and play rhythmic patterns with a step sequencer
- [Synth Keyboard](/examples/synth-keyboard) -- play a polyphonic synthesizer with ADSR envelopes
- [Effects](/examples/effects) -- apply filters and hear the difference in real time
- [Visualization](/examples/visualization) -- see frequency spectrum and waveform data rendered live

## How Does It Compare?

There are several good audio libraries for the web. Here is how EZ Web Audio fits in:

| | **EZ Web Audio** | **Tone.js** | **Howler.js** |
|---|---|---|---|
| **Focus** | Simple API for sounds, synthesis, sequencing, and effects | Full music production framework (DAW in browser) | Sound playback and management |
| **Size** | ~37 KB gzipped (zero deps, tree-shakeable) | ~150 KB+ | ~10 KB |
| **TypeScript** | Written in TypeScript, first-class types | Built-in (TypeScript source) | Community @types |
| **Synthesis** | Oscillators with ADSR envelopes and filters | Full synth engine, transport, instruments | No synthesis |
| **Sequencing** | BeatTrack / Beat pattern system | Transport, loops, sequences, parts | No sequencing |
| **Effects** | Filter, gain, custom effect wrappers | Comprehensive effect library | No effects |
| **Learning curve** | Minimal -- matches mental model of "play a sound" | Steeper -- music production concepts | Minimal |
| **Best for** | Apps that need sounds + synthesis + sequencing without a framework-sized dependency | Serious music applications, DAWs, generative music | Simple sound playback (games, UI) |

**Choose EZ Web Audio when** you need more than just playback (synthesis, drum machines, effects, visualization) but do not want the complexity and bundle size of a full music production framework.

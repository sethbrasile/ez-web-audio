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
      text: Try the Examples
      link: /examples/
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

```typescript
import { createSound } from 'ez-web-audio'

const sound = await createSound('/audio/click.mp3')
sound.play()
```

From simple sound effects to full synthesizers with ADSR envelopes, EZ Web Audio handles the complexity so you can focus on creating.

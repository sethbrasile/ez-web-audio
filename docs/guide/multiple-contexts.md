---
title: Multiple AudioContexts - Advanced Usage Guide
description: Learn when and how to use multiple AudioContexts with EZ Web Audio for separate output devices, context isolation, and independent audio widgets.
---

# Multiple AudioContexts

By default, EZ Web Audio uses a single shared AudioContext -- this is the right choice
for most applications. But advanced use cases sometimes need multiple contexts.

## When to Use Multiple Contexts

- **Separate output devices** -- Route monitoring to headphones while main mix goes to speakers via `sinkId`
- **Context isolation** -- Close one context without orphaning sounds in another (e.g., independent widgets)
- **Multiple widgets on one page** -- Each widget manages its own audio lifecycle
- **Different sample rates** -- 44.1kHz for playback, 48kHz for processing

## Usage

Every factory function accepts an optional `AudioContext` as its first parameter:

```typescript
import { createSound, createOscillator, createDelay } from 'ez-web-audio'

// Default — uses the shared singleton (recommended for most apps)
const sound = await createSound('click.mp3')
const synth = await createOscillator({ frequency: 440 })

// Explicit — uses your own AudioContext
const ctx = new AudioContext({ sampleRate: 48000 })
const sound2 = await createSound(ctx, 'click.mp3')
const synth2 = await createOscillator(ctx, { frequency: 440 })
const delay = createDelay(ctx, { time: 0.3, feedback: 0.4 })
```

When you pass an explicit context, the library skips its internal `initAudio()` call
entirely and uses your context directly. This means your context does not need to be
created inside a user-interaction handler -- but browser autoplay policies still apply,
so you may need to call `ctx.resume()` yourself after a user gesture.

## Important Constraints

### Sounds and effects must share a context

All audio nodes in a connected graph must belong to the same `AudioContext`.
A sound created with context A cannot use an effect created with context B:

```typescript
const ctxA = new AudioContext()
const ctxB = new AudioContext()

const sound = await createSound(ctxA, 'click.mp3')
const delay = createDelay(ctxB, { time: 0.3 })

// This will throw — nodes from different contexts can't connect
sound.addEffect(delay) // Error!
```

Always create sounds and their effects with the same context:

```typescript
const ctx = new AudioContext()
const sound = await createSound(ctx, 'click.mp3')
const delay = createDelay(ctx, { time: 0.3 })
sound.addEffect(delay) // Works
```

### Browser limits

Chrome limits active `AudioContext` instances to approximately 6. Exceeding this may cause
context creation to silently fail or existing contexts to be suspended. Keep context
count low and close contexts you no longer need:

```typescript
// When done with a context
ctx.close()
```

### When NOT to use multiple contexts

Most applications should use the default singleton. Multiple contexts add complexity
and consume browser resources. Use them only when you have a specific need listed above.

Signs you do **not** need multiple contexts:

- All sounds go to the same output device
- You want shared effects (reverb bus, compressor on master)
- You are building a single-purpose audio app

## Full Example: Monitoring Output

```typescript
import { createSound, createTrack, createDelay } from 'ez-web-audio'

// Main mix — default speakers
const mainCtx = new AudioContext()
const music = await createTrack(mainCtx, 'song.mp3')
const delay = createDelay(mainCtx, { time: 0.3, wet: 0.3 })
music.addEffect(delay)

// Monitor — headphones (if available)
const monitorCtx = new AudioContext()
await monitorCtx.setSinkId('headphone-device-id')
const click = await createSound(monitorCtx, 'metronome.mp3')

// Each context is independent
music.play()     // Goes to speakers
click.play()     // Goes to headphones

// Clean up one without affecting the other
monitorCtx.close()  // click stops, music continues
```

## Supported Factory Functions

All factory functions support the explicit context overload:

| Function | Signature |
|----------|-----------|
| `createSound` | `createSound(ctx, input)` |
| `createTrack` | `createTrack(ctx, input)` |
| `createSounds` | `createSounds(ctx, urls, onProgress?)` |
| `createTracks` | `createTracks(ctx, urls, onProgress?)` |
| `createBeatTrack` | `createBeatTrack(ctx, inputs, opts?)` |
| `createSampler` | `createSampler(ctx, inputs, opts?)` |
| `createOscillator` | `createOscillator(ctx, opts?)` |
| `createPolySynth` | `createPolySynth(ctx, opts?)` |
| `createGrainPlayer` | `createGrainPlayer(ctx, buffer, opts?)` |
| `createAnalyzer` | `createAnalyzer(ctx, opts?)` |
| `createTransport` | `createTransport(ctx, opts)` |
| `createSequence` | `createSequence(transport, opts)` (uses Transport's context) |
| `createLFO` | `createLFO(opts)` (connects to target's context) |
| `createLayeredSound` | `createLayeredSound(ctx, layers, opts?)` |
| `createFont` | `createFont(ctx, url)` |
| `createSprite` | `createSprite(ctx, url, manifest)` |
| `createWhiteNoise` | `createWhiteNoise(ctx)` |
| `createNoise` | `createNoise(ctx, type)` |
| `playTogether` | `playTogether(ctx, playables)` |
| Effect factories | `createDelay(ctx, opts)`, `createReverb(ctx, opts)`, etc. |

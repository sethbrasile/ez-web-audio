---
title: Parameter Control - Gain, Pan, Frequency Automation
description: Automate audio parameters with immediate updates, scheduled ramps, and envelope scheduling. Control gain, pan, frequency, and detune using the fluent update() API.
---

# Parameter Control

EZ Web Audio provides a fluent API for controlling and automating audio parameters — gain, pan, frequency, detune — either immediately or scheduled relative to playback start.

## Immediate Updates

Change a parameter right now using `update().to().as()`:

```typescript
// Set gain to 50%
sound.update('gain').to(0.5).as('ratio')

// Pan fully left
sound.update('pan').to(-1).as('ratio')

// Change oscillator frequency
oscillator.update('frequency').to(880).as('ratio')
```

The `as()` method specifies the unit type:

| Unit | Range | Description |
|------|-------|-------------|
| `'ratio'` | 0–1 (gain), -1–1 (pan) | Direct value |
| `'percent'` | 0–100 | Percentage of full range |
| `'inverseRatio'` | 0–1 | Inverted (1 - value) |

## Scheduled Updates

Schedule parameter changes that apply automatically on the next `play()` call.

### `onPlaySet()` — Envelope-Style Automation

Set a value and ramp it over time:

```typescript
// Fade in: start at 0, ramp to full volume over 1 second
sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')

// The parameter starts at 0 when play() is called,
// then ramps exponentially to its previous value by t=1s
```

### `onPlayRamp()` — Linear Ramps

Ramp smoothly between two values:

```typescript
// Ramp frequency from 200 to 800 over 0.5 seconds
oscillator.onPlayRamp('frequency').from(200).to(800).in(0.5)

// Ramp gain from 0 to 1 over 2 seconds
sound.onPlayRamp('gain').from(0).to(1).in(2)
```

::: tip Consume-Once Semantics
Scheduled values (`onPlaySet`/`onPlayRamp`) are cleared after each `play()` call. To repeat the automation on every play, re-schedule before each `play()`:

```typescript
function playWithFadeIn() {
  sound.onPlaySet('gain').to(0).endingAt(0.5, 'linear')
  sound.play()
}
```
:::

## Common Patterns

### Fade In

```typescript
// Exponential fade in over 0.5 seconds (sounds natural)
sound.onPlaySet('gain').to(0).endingAt(0.5, 'exponential')
sound.play()
```

### Fade Out

Schedule a fade that ends at the sound's natural end:

```typescript
const duration = sound.duration.raw

// Start fade at 80% through, reach silence at end
sound.onPlaySet('gain').to(1).endingAt(duration * 0.8, 'linear')
sound.onPlaySet('gain').to(0).endingAt(duration, 'linear')
sound.play()
```

### Pitch Bend

```typescript
// Bend up one octave over 1 second
osc.onPlayRamp('frequency').from(440).to(880).in(1)
osc.play()
```

### Vibrato (manual LFO)

```typescript
// Small periodic frequency variation using scheduled ramps
function addVibrato(oscillator: Oscillator, rate = 5, depth = 10) {
  const period = 1 / rate
  let t = 0
  while (t < 4) { // 4 seconds of vibrato
    oscillator.onPlayRamp('frequency').from(440 - depth).to(440 + depth).in(period / 2)
    t += period
  }
}
```

## Convenience Methods

For common fade operations, use the built-in convenience methods instead of manual scheduling:

### Fade In

```typescript
sound.fadeIn(0.5) // Play with gain ramping from 0 to current gain over 0.5s
```

### Fade Out

```typescript
await sound.fadeOut(1.0) // Ramp gain to 0 over 1s, then stop. Returns a Promise.
```

These methods handle the scheduling internally — no need to call `onPlaySet()` or manage timeouts yourself.

## Narrowed Control Types

`Sound.update()`, `Sound.onPlaySet()`, and `Sound.onPlayRamp()` accept `SoundControlType` — only `'gain' | 'pan' | 'detune'`. `Oscillator` overrides these methods to accept the full `ControlType` (which also includes `'frequency'`). TypeScript catches mistakes at compile time:

```typescript
import type { ControlType, SoundControlType } from 'ez-web-audio'

sound.update('gain').to(0.5).as('ratio') // OK
sound.update('frequency').to(440).as('ratio') // TypeScript error!

osc.update('frequency').to(880).as('ratio') // OK — Oscillator accepts all
```

### Controllers

The underlying `SoundController` and `OscillatorController` classes are exported for advanced consumers who need direct access to parameter scheduling logic. Most users will never need these — the fluent `update()`/`onPlaySet()`/`onPlayRamp()` API handles everything.

## Extending ControlType

The parameter system can be extended for custom control types via TypeScript module augmentation:

```typescript
// In your project's type declarations (e.g., global.d.ts)
declare module 'ez-web-audio' {
  interface ControlTypeMap {
    playbackRate: 'playbackRate'
  }
}

// Now 'playbackRate' is accepted by update(), onPlaySet(), etc.
// Note: You must provide custom controller logic to handle the new type.
```

This is useful when wrapping custom AudioNodes that expose non-standard parameters.

## API Quick Reference

| Method | Description |
|--------|-------------|
| `sound.update('gain').to(v).as('ratio')` | Immediate parameter update |
| `sound.onPlaySet('gain').to(v).endingAt(t, curve)` | Schedule envelope-style ramp |
| `sound.onPlayRamp('gain').from(a).to(b).in(t)` | Schedule linear ramp between values |
| `sound.changeGainTo(v)` | Shorthand for gain update |
| `sound.changePanTo(v)` | Shorthand for pan update |
| `oscillator.update('frequency').to(v).as('ratio')` | Update oscillator frequency |

## Next Steps

- [Core Concepts](/guide/concepts) - Sound types, AudioContext lifecycle, audio routing
- [Utilities](/guide/utilities) - Batch loading, crossfade, debug mode, and interaction helpers
- [Synthesis Example](/examples/synthesis) - Frequency and envelope in action
- [API Reference](/api/) - Full method documentation

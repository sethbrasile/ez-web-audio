---
title: XY Pad
---

# XY Pad

Control frequency and gain in real-time with a visual XY pad. This demonstrates smooth parameter modulation without audible clicks — a key feature for expressive musical interfaces.

## Try It: XY Pad

Click or drag on the pad to play. The X-axis controls frequency (100-2000 Hz, logarithmic scale), and the Y-axis controls gain (0-100%).

<XYPad />

## How to Use

1. **Click and hold** anywhere on the pad to start the oscillator
2. **Drag** to change frequency (horizontal) and gain (vertical)
3. **Release** to stop the sound

The frequency scale is logarithmic, meaning equal horizontal distances represent equal musical intervals. This makes the pad feel "musical" — sliding left-to-right sounds like moving up the musical scale.

## How It Works

The XY pad uses the `update()` API to change oscillator parameters smoothly while playing. This is crucial for click-free parameter modulation.

### Real-Time Parameter Updates

```typescript
import { createOscillator } from 'ez-web-audio'

// Create oscillator
const synth = await createOscillator({
  frequency: 440,
  type: 'sine'
})
synth.play()

// Update parameters while playing (no clicks!)
synth.update('frequency').to(880).from('value')  // Change to 880 Hz
synth.update('gain').to(0.5).from('ratio')       // Change to 50% volume
```

### Why update() Instead of Recreating?

You might be tempted to stop and recreate the oscillator when parameters change:

```typescript
// BAD: Creates audible clicks
function changeFrequency(newFreq: number) {
  oscillator.stop()
  oscillator = await createOscillator({ frequency: newFreq })
  oscillator.play()
}
```

This creates an audible click every time you change the frequency. The `update()` method changes parameters smoothly using Web Audio's built-in scheduling:

```typescript
// GOOD: Smooth parameter changes
function changeFrequency(newFreq: number) {
  oscillator.update('frequency').to(newFreq).from('value')
}
```

### Logarithmic Frequency Mapping

The XY pad uses logarithmic frequency scaling so equal horizontal distances sound like equal pitch intervals:

```typescript
// Linear scaling (sounds wrong - lower frequencies cramped on left)
const linearFreq = minFreq + (maxFreq - minFreq) * ratio

// Logarithmic scaling (sounds musical - equal steps = equal intervals)
const logFreq = minFreq * Math.pow(maxFreq / minFreq, ratio)

// For 100-2000 Hz range:
const frequency = 100 * Math.pow(20, ratio)  // where ratio is 0-1
```

This is why piano keys are evenly spaced even though the frequencies double each octave (100 Hz → 200 Hz → 400 Hz → 800 Hz).

## Building Your Own XY Controller

Here's a simplified version of the XY pad logic:

```typescript
import { createOscillator } from 'ez-web-audio'

let oscillator: any = null
let isPlaying = false

async function handleMouseDown(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Calculate frequency (logarithmic)
  const xRatio = x / canvas.width
  const frequency = 100 * Math.pow(20, xRatio)  // 100-2000 Hz

  // Calculate gain (inverted - top is high, bottom is low)
  const gain = 1 - (y / canvas.height)

  // Create and play oscillator
  oscillator = await createOscillator({
    frequency,
    type: 'sine'
  })
  oscillator.changeGainTo(gain)
  oscillator.play()
  isPlaying = true
}

function handleMouseMove(e: MouseEvent) {
  if (!isPlaying) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Update parameters in real-time
  const frequency = 100 * Math.pow(20, x / canvas.width)
  const gain = 1 - (y / canvas.height)

  oscillator.update('frequency').to(frequency).from('value')
  oscillator.update('gain').to(gain).from('ratio')
}

function handleMouseUp() {
  if (oscillator) {
    oscillator.stop()
    oscillator = null
  }
  isPlaying = false
}
```

## API Used

- `createOscillator()` - Creates a synthesizer
- `update()` - Real-time parameter modulation
- `changeGainTo()` - Set volume

## Next Steps

- [Synthesis](/examples/synthesis) - Learn about waveforms and ADSR envelopes
- [Effects](/examples/effects) - Add filters to shape your sound

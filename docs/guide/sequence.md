---
title: Sequence - Musical Time Event Scheduling
description: Schedule arbitrary callbacks at musical time positions using the Sequence class tied to a Transport clock.
---

# Sequence

Sequence schedules callbacks at musical time positions tied to a Transport. Events are stored as beat positions, so live BPM changes automatically affect timing without re-scheduling.

## Basic Usage

```typescript
import { createSequence, createSound, createTransport } from 'ez-web-audio'

const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })
const bell = await createSound('/sounds/bell.mp3')

const seq = createSequence(transport, {
  length: '2m', // 2 measures long
  loop: true // Repeat
})

// Schedule events at musical positions
seq.at('1:1:0', () => bell.play()) // Bar 1, Beat 1
seq.at('1:3:0', () => bell.play()) // Bar 1, Beat 3
seq.at('2:1:0', () => bell.play()) // Bar 2, Beat 1

transport.start() // Events fire at correct musical positions
```

## Musical Time Notation

Sequence supports musical time notation for the `length` option:

| Notation | Meaning |
|----------|---------|
| `'4n'` | Quarter note (1 beat) |
| `'8n'` | Eighth note (0.5 beats) |
| `'16n'` | Sixteenth note (0.25 beats) |
| `'2n'` | Half note (2 beats) |
| `'1m'` | One measure |
| `'4m'` | Four measures |
| `'8t'` | Eighth note triplet |

## Event Scheduling

Events are scheduled using `bar:beat:tick` position strings:

```typescript
seq.at('1:1:0', (time, position) => {
  console.log(`Firing at bar ${position.bar}, beat ${position.beat}`)
  bell.play()
})
```

The callback receives:
- `time` -- Precise AudioContext time for scheduling audio operations
- `position` -- Transport position at the moment the event fires

## Live BPM Changes

Events respond to BPM changes automatically:

```typescript
transport.bpm = 140 // All sequence events adjust timing
```

## Cleanup

```typescript
seq.dispose() // Removes all events, detaches from Transport
```

## Next Steps

- [Transport](/guide/transport) -- Global clock for multi-track sync
- [API Reference](/api/) -- Full Sequence API docs

---
title: Transport & Sequencing - Sync Multiple Tracks
description: Use the Transport clock to synchronize multiple BeatTracks and schedule events at musical time positions with Sequence.
---

# Transport & Sequencing

The Transport provides a global clock that multiple BeatTracks can lock to, enabling perfect multi-track synchronization. Combined with Sequence, you can schedule arbitrary callbacks at musical time positions.

## Creating a Transport

```typescript
import { createTransport } from 'ez-web-audio'

const transport = await createTransport({
  bpm: 120,
  timeSignature: [4, 4]
})

transport.start()
transport.pause()
transport.stop()
```

## Syncing BeatTracks

Instead of each BeatTrack running its own timer, sync them to a shared Transport:

```typescript
import { createBeatTrack, createTransport } from 'ez-web-audio'

const transport = await createTransport({ bpm: 120 })

const kick = await createBeatTrack(['/sounds/kick.wav'], { numBeats: 4 })
const hihat = await createBeatTrack(['/sounds/hihat.wav'], { numBeats: 8 })

kick.setPattern([1, 0, 1, 0])
hihat.setPattern([1, 1, 1, 1, 1, 1, 1, 1])

// Sync — kick plays quarter notes, hihat plays eighth notes
kick.syncTo(transport, { noteType: 1 / 4 })
hihat.syncTo(transport, { noteType: 1 / 8 })

transport.start() // Both tracks play in perfect sync
```

Synced tracks cannot be started/stopped individually -- they follow the Transport. Use `track.unsync()` to detach.

## Position Tracking

Transport reports position as bar:beat:tick:

```typescript
import { formatPosition } from 'ez-web-audio'

transport.on('tick', (e) => {
  const pos = e.detail
  console.log(formatPosition(pos)) // "1:3:2"
  console.log(pos.seconds)         // elapsed time
})
```

## Changing BPM

BPM can be changed at any time -- all synced tracks and sequences adjust automatically:

```typescript
transport.bpm = 140 // Immediate tempo change
```

## Mute & Solo

Control which synced tracks are audible:

```typescript
kick.muted = true     // Silence kick (beats still fire for UI)
hihat.soloed = true   // Only hihat is audible
```

## Cleanup

```typescript
transport.dispose() // Stops clock, unsyncs all tracks
```

## Next Steps

- [Sequence](/guide/sequence) -- Schedule callbacks at musical time positions
- [Drum Machine Example](/examples/drum-machine) -- See Transport in action
- [API Reference](/api/) -- Full Transport API docs

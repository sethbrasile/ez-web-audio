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
  console.log(pos.seconds) // elapsed time
})
```

## Changing BPM

BPM can be changed at any time -- all synced tracks and sequences adjust automatically:

```typescript
transport.bpm = 140 // Immediate tempo change
```

## Swing

Add a shuffle feel without hand-placing offbeat notes. `swing` (0–1, default `0`) delays every other subdivision toward the triplet position; `swingSubdivision` picks whether that grid is eighth or sixteenth notes:

```typescript
transport.swing = 0.55 // 0 = straight, 1 = full triplet shuffle
transport.swingSubdivision = 1 / 8 // or 1/16 (default)
```

Swing only touches synced-track beats and Sequence events that land exactly on an odd subdivision — the playhead (`tick` events) always stays on-grid, and events that don't land on the subdivision (fills, syncopated hits) are never swung. Both properties throw if set outside their valid range, and both are live-changeable, including mid-playback: writing a pattern in straight 8ths and dialing `swing` from `0.55` down to `0` flattens it back to a straight feel, because the shuffle lives in the swing amount, not in the pattern data.

## Loop Region

Loop a section of the timeline in place, without calling `stop()`/`start()`:

```typescript
transport.loopStart = '1m' // musical notation ('1m', '2:1:0') or a numeric beat count
transport.loopEnd = '2m'
transport.loop = true // default: false

transport.on('loop', (e) => {
  console.log(`loop ${e.detail.iteration} at ${e.detail.time}`)
})
```

`loopStart`/`loopEnd` accept musical notation or a raw beat count when set, and always read back as beats. Synced BeatTracks wrap their pattern index at `loopEnd` automatically. Sequences are **not** remapped into the loop region — a `Sequence` loops at its own `length`, so give it the same length as the loop region (e.g. `loopEnd - loopStart`) to keep it in lockstep with the transport's loop.

An invalid region (`loopEnd <= loopStart`) throws when `loop` is enabled and the transport starts or resumes; toggling `loop` on live with an already-invalid region is silently ignored instead of throwing.

## Velocity

`BeatTrack.setPattern()` accepts numbers instead of booleans — any value `> 0` both activates the beat and sets its `velocity` (a 0–1 gain multiplier applied on play), so ghost notes and accents live in the pattern data itself:

```typescript
kick.setPattern([1, 0, 0.6, 0]) // 1 = full hit, 0.6 = ghost note, 0 = rest
```

`0`/`false` still means rest and `1`/`true` still means a full-velocity hit, so existing boolean patterns keep working unchanged. `Beat.velocity` can also be set directly (`kick.beats[2].velocity = 0.6`), and `Sampler.play()`/`playIn()`/`playAt()` all take an optional `velocity` argument for the same effect outside of BeatTrack patterns.

## Mute & Solo

Control which synced tracks are audible:

```typescript
kick.muted = true // Silence kick (beats still fire for UI)
hihat.soloed = true // Only hihat is audible
```

## Cleanup

```typescript
transport.dispose() // Stops clock, unsyncs all tracks
```

## Next Steps

- [Sequence](/guide/sequence) -- Schedule callbacks at musical time positions
- [Drum Machine Example](/examples/drum-machine) -- See Transport in action
- [API Reference](/api/) -- Full Transport API docs

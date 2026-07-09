# Phase 56: Sequencer + Musical Time - Research

**Researched:** 2026-02-28
**Status:** Complete

## 1. Transport Scheduler Integration

### How Transport.schedulerTick() Works
- WorkerTimer fires at ~20ms intervals, calling `schedulerTick()`
- schedulerTick() uses a 100ms lookahead window (`scheduleAheadTime = 0.1`)
- Two scheduling loops run in each tick:
  1. **Transport ticks** — advance position (bar/beat/tick), emit 'tick' events
  2. **Track beats** — for each synced BeatTrack, schedule beats within the lookahead window

### How BeatTrack Integrates
- `BeatTrack.syncTo(transport)` calls `transport._addTrack(track)`
- Transport stores tracks in `_syncedTracks: Set<BeatTrack>` and `trackStates: Map<BeatTrack, SyncedTrackState>`
- Each SyncedTrackState tracks: `nextBeatTime`, `currentBeatIndex`
- Transport calls `track._scheduleBeatFromTransport(beatIndex, time)` for each beat in the lookahead window
- Beat duration recalculated each iteration from current `this._bpm` — live BPM changes are automatic

### Integration Pattern for Sequence
Sequence should follow the same pattern as BeatTrack:
- Register with Transport via `_addTrack()`-like mechanism (or a separate `_addSequence()` method)
- Transport calls a scheduling method on each scheduler tick within the lookahead window
- Sequence calculates which events fall within the lookahead window and fires callbacks

**Key Design Decision:** Should Transport know about Sequence (add `_addSequence`/`_removeSequence`) or should Sequence subscribe to Transport's tick events?

**Recommendation:** Add `_addSequence`/`_removeSequence` to Transport (parallel to `_addTrack`/`_removeTrack`). This keeps the scheduling in Transport's tight loop rather than going through the event system, which adds latency and overhead. The tick event is for external consumers (UI updates); scheduling needs the raw lookahead loop.

## 2. Musical Time Notation Parsing

### Required Notations
From CONTEXT.md:
- Note values: `1n` (whole), `2n` (half), `4n` (quarter), `8n` (eighth), `16n` (sixteenth)
- Triplets: `4t`, `8t`, `16t`
- Dotted: `4n.` (1.5x base duration)
- Measures: `1m`, `2m`, `4m`
- Bar:beat:tick: `"2:1:0"` (bar 2, beat 1, tick 0)

### Conversion Formula

**Note values to beats:**
- `1n` = 4 beats (whole note in 4/4)
- `2n` = 2 beats
- `4n` = 1 beat
- `8n` = 0.5 beats
- `16n` = 0.25 beats

General formula: `beats = 4 / noteValue` (where noteValue is the numeric prefix)

**Triplets:** `4t` = `4n * 2/3` = 2/3 beat
General: `beats = (4 / noteValue) * (2/3)`

**Dotted:** `4n.` = `4n * 1.5` = 1.5 beats
General: `beats = (4 / noteValue) * 1.5`

**Measures:** `1m` = beatsPerBar beats, `2m` = 2 * beatsPerBar
General: `beats = measureCount * beatsPerBar`

**Bar:beat:tick to beats:**
`totalBeats = (bar - 1) * beatsPerBar + (beat - 1) + tick / ticksPerBeat`

**Beats to seconds:** `seconds = beats * (60 / bpm)`

### Parser Design
```typescript
interface MusicalTimeContext {
  bpm: number
  timeSignature: [number, number]  // [beatsPerBar, beatUnit]
  ticksPerBeat: number
}

// Parse notation to beats (BPM-independent)
function parseMusicalTime(notation: string, ctx: MusicalTimeContext): number // returns seconds

// Or split into two steps:
function musicalTimeToBeats(notation: string, beatsPerBar: number): number
function beatsToSeconds(beats: number, bpm: number): number
```

**Recommendation:** Export `parseMusicalTime(notation, bpm, timeSignature?)` that returns seconds. Keep it as a standalone utility in `src/utils/musical-time.ts`. Internally, first convert to beats then to seconds. This allows live BPM changes: the Sequence doesn't store pre-computed seconds, it stores the beat position and converts to seconds at scheduling time using the current BPM.

## 3. Sequence Event Scheduling Architecture

### How Events Should Be Scheduled
Each event in a Sequence has:
- A musical time position (stored as beats from sequence start)
- A callback function

When Transport's scheduler tick runs:
1. Sequence knows its current position in beats (derived from Transport position and sequence start time)
2. Calculate which events fall in the lookahead window [now, now + 0.1s]
3. For each matching event, call `callback(audioContextTime, transportPosition)`

### Live BPM Handling
Critical insight from CONTEXT.md: "Changing transport.bpm during playback causes subsequent beat scheduling to use the new BPM without needing to call sequence.reschedule()"

This is automatic if events are stored as beat positions (not seconds):
- Event at `4n` = beat 1.0
- At 120 BPM: fires at 0.5s
- At 60 BPM: fires at 1.0s
- The Sequence calculates time from beat position using current BPM at each scheduler tick

### Looping
- Sequence has a length in beats (e.g., `'4m'` = 16 beats in 4/4)
- When sequence position >= length, wrap around to 0
- Track absolute position for correct AudioContext scheduling

## 4. API Shape Analysis

### Constructor / Factory
```typescript
interface SequenceOptions {
  length: string | number  // Musical time notation or beats
  loop?: boolean           // Default: true
  events?: SequenceEvent[] // Initial events
}

interface SequenceEvent {
  time: string | number    // Musical time notation or beats
  callback: (time: number, position: TransportPosition) => void
}

function createSequence(transport: Transport, options: SequenceOptions): Sequence
```

### .at() Method
```typescript
// Returns event ID for removal
sequence.at('4n', (time, position) => { ... })  // returns string ID
sequence.at('2:1:0', (time, position) => { ... })
```

### Event Removal
From CONTEXT.md: "Claude's discretion" on removal mechanism.
**Recommendation:** Return unique IDs from `.at()`, support `.remove(id)` and `.clear()`. This is the most flexible approach and matches common event system patterns.

## 5. File Structure Plan

### New Files
- `src/sequence.ts` — Sequence class
- `src/sequence.test.ts` — Tests
- `src/utils/musical-time.ts` — Musical time parser
- `src/utils/musical-time.test.ts` — Parser tests

### Modified Files
- `src/transport.ts` — Add `_addSequence()` / `_removeSequence()`, scheduling loop for sequences
- `src/events/event-types.ts` — Add SequenceEventMap, SequenceEventDetail types
- `src/index.ts` — Add `createSequence()` factory, exports

## 6. Existing Patterns to Follow

- **EventTarget + CustomEvent pattern** — same as Transport and BeatTrack
- **Factory function** — `createSequence()` in index.ts (sync, not async — no audio loading needed)
- **on()/off()/once() chaining** — same as Transport and BeatTrack
- **dispose() cleanup** — unregister from Transport, clear events, reset EventTarget
- **Type exports** — interfaces and types exported from index.ts

## 7. Testing Strategy

- Musical time parser: pure function, exhaustive unit tests for all notation types
- Sequence: mock Transport (or use real Transport with mock AudioContext), verify callbacks fire at correct positions
- Live BPM changes: verify events reschedule correctly
- Loop behavior: verify position wraps and events re-fire
- Edge cases: empty sequence, events beyond loop length, dispose during playback

---

*Phase: 56-sequencer-musical-time*
*Research completed: 2026-02-28*

# Phase 56: Sequencer + Musical Time - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Arbitrary event sequencing with musical time notation (4n, 1m, 8t) tied to Transport. Developers can schedule callbacks at musical time positions and live BPM changes take effect immediately without re-scheduling.

</domain>

<decisions>
## Implementation Decisions

### Sequence API Shape
- Support both `.at()` chaining AND initial events array in constructor: `createSequence(transport, { length: '4m', events: [...] })` plus `seq.at('4n', callback)`
- Sequence tied to a specific Transport at creation — no standalone/re-attach pattern
- Sequence follows Transport lifecycle — plays when Transport plays, stops when Transport stops. No independent start/stop
- Event removal: Claude's discretion (choose between returning IDs from `.at()` with `.remove(id)`, or `.clear()` only)

### Scheduled Event Types
- Callbacks only — `sequence.at('4n', (time, position) => { ... })`
- Callback receives precise AudioContext time AND TransportPosition (bar:beat:tick) for maximum scheduling flexibility
- No built-in sound/note/parameter helpers — users write actions in callbacks

### Musical Time Notation
- Full notation support: `4n` (quarter), `8n` (eighth), `16n` (sixteenth), `1n` (whole)
- Triplets: `4t`, `8t`, `16t`
- Dotted notes: `4n.` (dotted quarter = 1.5x quarter)
- Measures: `1m`, `2m`, `4m`
- Bar:beat:tick positioning: `"2:1:0"` (bar 2, beat 1, tick 0)
- Time parser is a standalone exported utility — reusable across Sequence, Transport, and user code

### Looping & Lifecycle
- Sequences loop by default — `loop: false` to disable for one-shot
- Loop length is explicitly required: `createSequence(transport, { length: '4m' })`
- Transport.stop() resets sequence position to beginning (matches Transport's own reset behavior)
- Transport.pause() preserves sequence position
- Sequence events on loop/event firing: Claude's discretion

### Claude's Discretion
- Event removal mechanism (ID-based `.remove()` vs `.clear()` only)
- Whether to emit events for loop completion and/or individual event firing
- Internal scheduling implementation (how Sequence hooks into Transport's scheduler tick)
- Whether Sequence registers with Transport similarly to BeatTrack or uses Transport events

</decisions>

<specifics>
## Specific Ideas

- Musical time parser should be a standalone utility exported from the library — `parseMusicalTime('4n', bpm, timeSignature)` → seconds
- API mirrors existing patterns: tied-at-creation like BeatTrack.syncTo(transport), follows Transport lifecycle like synced BeatTracks

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Transport` class (`src/transport.ts`): Has scheduler tick loop, position tracking, BPM, time signature, Worker-backed clock
- `WorkerTimer` (`src/utils/worker-timer.ts`): Throttle-resistant timing for background tabs
- `TransportPosition` interface: bar/beat/tick/seconds already defined
- `Transport.on()/off()/once()`: EventTarget-based event system for lifecycle hooks

### Established Patterns
- Lookahead scheduling: Transport uses 100ms lookahead window in `schedulerTick()` to schedule ahead of audio time
- Track management: Transport has `_addTrack()/_removeTrack()` for BeatTrack registration — Sequence could follow similar pattern
- BPM is a live setter on Transport — changing `transport.bpm` immediately affects next scheduling tick (no re-schedule needed)
- Factory functions: `createTransport()` async factory in `src/index.ts`

### Integration Points
- `Transport.schedulerTick()` — Sequence scheduling would hook into this same lookahead loop
- `src/index.ts` — needs `createSequence()` factory function and exports
- `src/events/event-types.ts` — may need Sequence-related event types

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 56-sequencer-musical-time*
*Context gathered: 2026-02-28*

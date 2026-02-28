---
phase: 55-transport-beattrack-sync
plan: 02
status: complete
---

## What was done

Created the Transport class — a global clock with Worker-backed scheduling, lifecycle management, position tracking, and typed events.

### Files created/modified
- `src/transport.ts` — Transport class with start/stop/pause/resume lifecycle, WorkerTimer-driven lookahead scheduler, bar:beat:tick position tracking, EventTarget + CustomEvent event model, _addTrack/_removeTrack for Plan 04 integration
- `src/transport.test.ts` — 41 tests covering constructor, initial state, bpm setter, lifecycle, tick events, position tracking, dispose, event API (on/off/once), track management, formatPosition
- `src/events/event-types.ts` — Added TransportTickDetail, TransportLifecycleDetail, TransportEventMap; extended AudioEventSource union to include Transport
- `src/index.ts` — Added createTransport factory, Transport class export, all Transport types to value and type exports

### Key decisions
- Transport follows BeatTrack's existing EventTarget + CustomEvent pattern for events
- start() after pause() emits 'resume' (not 'start') to differentiate fresh start from resume
- Position uses 1-indexed bar/beat, 0-indexed tick (matches musical convention)
- formatPosition() helper exported as standalone utility function
- tracks getter returns Object.freeze([...]) for read-only access

### Test results
- 41 tests passing
- pnpm typecheck passes

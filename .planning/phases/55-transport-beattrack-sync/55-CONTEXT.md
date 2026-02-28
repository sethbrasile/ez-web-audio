# Phase 55: Transport + BeatTrack Sync - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a global Transport clock that multiple BeatTracks can lock to, enabling perfect multi-track synchronization. The Transport uses a Web Worker-backed clock that is not throttled when the tab is hidden. BeatTracks can sync to the Transport or run standalone — both use the same Worker-based timer infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Transport API surface
- Single global singleton — one Transport per app, created via `createTransport({ bpm, timeSignature })`
- Position reported as beats + bars (`{ bar, beat, tick }` plus raw seconds) — adapt TimeObject or create a variant if needed
- BPM is mutable during playback — `transport.bpm = 140` takes effect on the next tick (no ramp API needed for now — consistent with BeatTrack's existing `setTempo()`)
- Events: lifecycle (`start`, `stop`, `pause`, `resume`) plus `tick` on every beat subdivision
- Event model must stay compatible with reactive framework proxies (Vue `reactive()`, etc.) — follow BeatTrack's existing EventTarget + CustomEvent pattern

### Worker clock strategy
- Inline blob Worker (string → `new Worker(URL.createObjectURL(new Blob(...)))`) — zero extra files, single importable module
- **Shared Worker timer utility** — not Transport-specific. Both Transport and standalone BeatTrack use the same Worker-based scheduler loop, replacing `setTimeout` everywhere
- BeatTrack's current `window.setTimeout` scheduler loop gets upgraded to use the shared Worker timer
- Worker tick interval fixed at ~10-25ms (internal detail, not configurable)
- Graceful fallback when Workers unavailable (SSR, happy-dom tests) — Claude's discretion on approach, consistent with `audioContextAwareTimeout`'s existing graceful-degradation pattern
- Worker handles scheduling clock only; `audioContextAwareTimeout` (RAF-based) continues to handle per-beat visual timing (isPlaying flags, UI events) — clean separation of concerns
- Background tab UI limitation accepted as browser constraint: audio plays perfectly, scheduling stays on time, but visual indicators may lag until tab is refocused

### Sync contract
- `beatTrack.syncTo(transport, { noteType: 1/16 })` — explicit noteType per track (kick on 1/4, hihat on 1/16)
- BeatTrack's own `playBeats()`/`playActiveBeats()`/`stop()`/`pause()`/`resume()` are disabled while synced (throw or warn)
- `beatTrack.unsync()` detaches from Transport, re-enables standalone methods, stops the track
- Synced tracks respect `beat.active` states — Transport controls WHEN, pattern controls WHAT
- Transport owns lifecycle; individual tracks are passive followers

### Multi-track coordination
- `transport.start()` auto-starts all synced BeatTracks simultaneously
- Per-track `muted` property — `beatTrack.muted = true` silences without stopping
- Stackable solo — `beatTrack.solo = true` solos that track; multiple tracks can be soloed simultaneously
- Bulk operations: simple to mute all and selectively unmute, or solo individual tracks
- `transport.tracks` returns a read-only array of synced BeatTracks (for UI rendering, bulk ops, debugging)
- Hot add/remove: `beatTrack.syncTo(transport)` while playing joins on next beat boundary; `beatTrack.unsync()` while playing removes cleanly

### Claude's Discretion
- Worker fallback strategy (what to use when Workers unavailable)
- Worker tick interval exact value within 10-25ms range
- How `transport.tracks` read-only list is implemented (getter, frozen array, etc.)
- Position format details (tick resolution, string formatting)
- How mute-all / solo interactions resolve (standard DAW mute/solo logic)

</decisions>

<specifics>
## Specific Ideas

- User wants the shared Worker timer to be a reusable utility — not Transport-specific. BeatTrack's standalone mode should benefit from the same background-tab resilience
- User specifically asked for stackable solo (multiple tracks can be soloed at once) and easy mute-all + selective unmute
- User values consistency: "If it's the right call for Transport, it's the right call for BeatTrack" — same pattern for same problem
- Reactive proxy compatibility is important — events and state mutations must work through framework wrappers (Vue reactive(), etc.)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BeatTrack` (src/beat-track.ts): Has complete lookahead scheduler, pause/resume, setTempo(), event system — the scheduler loop is the part being replaced
- `audioContextAwareTimeout` (src/utils/timeout.ts): RAF-based timer utility for per-beat visual timing — stays as-is, Worker complements it
- `Beat` (src/beat.ts): Has `playIn()`, `playInIfActive()`, `active`, `isPlaying`, `currentTimeIsPlaying` — unchanged by this phase
- BeatTrack EventTarget pattern: private EventTarget + CustomEvent + typed event maps — model for Transport's event system

### Established Patterns
- BeatTrack's lookahead scheduler (25ms check, 100ms ahead) — Worker replaces the `setTimeout` loop but keeps the same lookahead algorithm
- Graceful degradation: `audioContextAwareTimeout` falls back to native `setTimeout` with console.warn when AudioContext unavailable — pattern for Worker fallback
- `wrapWith` option on BeatTrack for reactive proxy wrapping — Transport should be similarly proxy-friendly
- Fluent API pattern: `.on('event', handler)` returns `this` for chaining — use for Transport too

### Integration Points
- `BeatTrack.scheduler()` (private) — this is the method that currently uses `setTimeout` and will be refactored to use the Worker timer
- `BeatTrack.scheduleBeat()` (private) — beat scheduling logic stays the same, just called by Worker-driven scheduler instead
- `src/index.ts` — needs `createTransport` factory function export
- `src/events/event-types.ts` — needs Transport event type definitions

</code_context>

<deferred>
## Deferred Ideas

- BPM ramp (gradual tempo change over time) — could be added later if needed
- Multiple Transport instances — explicitly decided against for now (single global)
- Worker replacing RAF for visual timing — decided to keep separation of concerns

</deferred>

---

*Phase: 55-transport-beattrack-sync*
*Context gathered: 2026-02-28*

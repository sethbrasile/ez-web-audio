# Phase 55: Transport + BeatTrack Sync - Research

**Researched:** 2026-02-28
**Domain:** Web Audio scheduling, Web Workers, transport clock synchronization
**Confidence:** HIGH

## Summary

Phase 55 introduces a global Transport clock backed by a Web Worker for background-tab-resilient timing, and a sync mechanism for BeatTracks to lock to that Transport. The core challenge is replacing `window.setTimeout` in BeatTrack's scheduler loop with a Worker-based timer that is not throttled when the browser tab is hidden, while preserving the existing lookahead scheduling algorithm and `audioContextAwareTimeout` visual timing.

The Web Worker approach for audio scheduling is a well-established pattern (Chris Wilson's "A Tale of Two Clocks" from 2013, used by Tone.js and virtually every serious Web Audio sequencer). The inline Blob Worker approach avoids external files and is fully supported in all modern browsers. The key architectural decision is making the Worker timer a shared utility (not Transport-specific) so standalone BeatTrack also benefits from background-tab resilience.

**Primary recommendation:** Create a shared `WorkerTimer` utility in `src/utils/worker-timer.ts` that provides `setInterval`/`clearInterval` backed by an inline Blob Worker, with graceful fallback to `window.setTimeout` when Workers are unavailable. Transport and BeatTrack both use this utility. Transport is a new class in `src/transport.ts` that owns tempo, time signature, position, and lifecycle. BeatTracks attach via `syncTo(transport)` which disables their internal scheduler and registers them as passive followers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single global singleton Transport per app, created via `createTransport({ bpm, timeSignature })`
- Position reported as beats + bars (`{ bar, beat, tick }` plus raw seconds)
- BPM mutable during playback — takes effect on next tick (no ramp API)
- Events: lifecycle (`start`, `stop`, `pause`, `resume`) plus `tick` on every beat subdivision
- Event model compatible with reactive framework proxies (Vue `reactive()`, etc.) — follow BeatTrack's EventTarget + CustomEvent pattern
- Inline blob Worker (string -> `new Worker(URL.createObjectURL(new Blob(...)))`) — zero extra files
- **Shared Worker timer utility** — not Transport-specific. Both Transport and standalone BeatTrack use the same Worker-based scheduler
- BeatTrack's `window.setTimeout` scheduler loop gets upgraded to Worker timer
- Worker tick interval fixed at ~10-25ms (internal detail, not configurable)
- Graceful fallback when Workers unavailable (SSR, happy-dom tests)
- Worker handles scheduling clock only; `audioContextAwareTimeout` (RAF-based) continues for per-beat visual timing
- Background tab UI limitation accepted: audio perfect, scheduling on time, visual indicators may lag
- `beatTrack.syncTo(transport, { noteType: 1/16 })` — explicit noteType per track
- BeatTrack's own play/stop/pause/resume disabled while synced (throw or warn)
- `beatTrack.unsync()` detaches from Transport, re-enables standalone, stops track
- Transport owns lifecycle; tracks are passive followers
- `transport.start()` auto-starts all synced BeatTracks
- Per-track `muted` property — silences without stopping
- Stackable solo — multiple tracks can be soloed simultaneously
- `transport.tracks` returns read-only array of synced BeatTracks
- Hot add/remove: `syncTo()` while playing joins on next beat boundary; `unsync()` while playing removes cleanly

### Claude's Discretion
- Worker fallback strategy (what to use when Workers unavailable)
- Worker tick interval exact value within 10-25ms range
- How `transport.tracks` read-only list is implemented (getter, frozen array, etc.)
- Position format details (tick resolution, string formatting)
- How mute-all / solo interactions resolve (standard DAW mute/solo logic)

### Deferred Ideas (OUT OF SCOPE)
- BPM ramp (gradual tempo change over time)
- Multiple Transport instances
- Worker replacing RAF for visual timing
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRANS-01 | Developer can create a global Transport with configurable BPM and time signature | Transport class with `createTransport()` factory, BPM/time-sig config, Worker-backed clock |
| TRANS-02 | Transport provides start/stop/pause controls and current position | `start()/stop()/pause()` lifecycle, position tracking as `{ bar, beat, tick, seconds }` |
| TRANS-03 | BeatTrack can sync to a Transport instead of using its own internal clock | `syncTo(transport)` disables internal scheduler, Transport drives beat scheduling |
| TRANS-04 | Multiple BeatTracks synced to one Transport play in perfect sync | Single Worker clock + single lookahead scheduler in Transport guarantees lockstep |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Workers API | Browser native | Background-tab-resilient timer | Only way to avoid setTimeout throttling in background tabs |
| Web Audio API `currentTime` | Browser native | Authoritative audio clock | Hardware-driven, never drifts, immune to JS main-thread jitter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Blob` + `URL.createObjectURL` | Browser native | Inline Worker creation | Avoids external Worker files, single-module import |
| `audioContextAwareTimeout` (existing) | Internal | Per-beat visual timing via RAF | Already in codebase, stays for UI sync |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline Blob Worker | Separate `.js` Worker file | Simpler code but requires bundler config for Worker files |
| Web Worker | SharedWorker | SharedWorker shares across tabs — overkill, less browser support |
| setInterval in Worker | postMessage-driven loop | setInterval is simpler and sufficient for fixed-rate clock |

## Architecture Patterns

### Recommended File Structure
```
src/
├── utils/
│   └── worker-timer.ts    # Shared Worker-backed timer utility (NEW)
├── transport.ts           # Transport class (NEW)
├── beat-track.ts          # Modified: use WorkerTimer, add syncTo/unsync
├── events/
│   └── event-types.ts     # Modified: add TransportEventMap
└── index.ts               # Modified: export createTransport, Transport types
```

### Pattern 1: Inline Blob Worker for Scheduling Clock
**What:** Create a Worker from a string template using `new Blob()` + `URL.createObjectURL()`
**When to use:** When you need a Web Worker without external files
**Example:**
```typescript
const workerCode = `
  let interval = null;
  self.onmessage = (e) => {
    if (e.data.type === 'start') {
      interval = setInterval(() => self.postMessage({ type: 'tick' }), e.data.interval);
    } else if (e.data.type === 'stop') {
      clearInterval(interval);
      interval = null;
    } else if (e.data.type === 'setInterval') {
      if (interval) { clearInterval(interval); }
      interval = setInterval(() => self.postMessage({ type: 'tick' }), e.data.interval);
    }
  };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
```

### Pattern 2: Lookahead Scheduler with Worker Clock
**What:** Worker ticks at ~20ms. Each tick, main thread checks `audioContext.currentTime` and schedules beats within a lookahead window using Web Audio API's precise timing.
**When to use:** All audio scheduling in the library
**Key insight:** Worker is the *metronome* (fires regularly), Web Audio API is the *clock* (provides precise time). The Worker prevents setTimeout throttling; audioContext.currentTime prevents drift.

```typescript
// On each Worker tick:
const currentTime = audioContext.currentTime;
while (nextBeatTime < currentTime + scheduleAheadTime) {
  scheduleBeat(currentBeatIndex, nextBeatTime);
  advanceToNextBeat();
}
```

This is exactly BeatTrack's current `scheduler()` method — the only change is the Worker drives it instead of `window.setTimeout`.

### Pattern 3: Transport Singleton
**What:** Single Transport instance manages global tempo, position, and synced tracks
**When to use:** Multi-track synchronization
**Implementation:**
```typescript
const transport = createTransport({ bpm: 120, timeSignature: [4, 4] });
// transport is the single scheduler — its Worker tick drives all synced tracks
beatTrack1.syncTo(transport, { noteType: 1/4 });
beatTrack2.syncTo(transport, { noteType: 1/16 });
transport.start(); // Both tracks start in lockstep
```

### Pattern 4: Mute/Solo DAW Logic
**What:** Standard mute/solo interaction from DAWs
**Implementation:**
- `muted`: Track is silenced but stays synced (position advances, events fire, no audio)
- `solo`: When ANY track is soloed, only soloed tracks produce audio. Multiple tracks can be soloed.
- Resolution: `shouldPlay = !muted && (noTracksSoloed || this.solo)`
- Mute/solo are independent per-track properties — no global mute array needed

### Anti-Patterns to Avoid
- **Running multiple Worker timers:** One shared Worker for all scheduling. Multiple Workers waste resources and can drift relative to each other.
- **Using Worker for audio timing directly:** Worker's `setInterval` is approximate (~1ms jitter). Always use `audioContext.currentTime` for actual scheduling. Worker is just the "wake up" signal.
- **Tight coupling Transport ↔ BeatTrack:** Transport should not import BeatTrack. Use an interface (`SyncableTrack`) so Transport accepts anything with the right methods.
- **Replacing audioContextAwareTimeout with Worker:** The Worker is for the scheduling loop (every ~20ms). audioContextAwareTimeout is for one-shot visual timing (beat flash). Different concerns, keep both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background-tab timer | Custom RAF hacks or AudioBuffer-based timers | Web Worker setInterval | Workers are explicitly exempt from background tab throttling |
| Audio-precise scheduling | Direct setTimeout-to-AudioParam | Lookahead scheduler (already exists) | The existing pattern in BeatTrack is correct and battle-tested |
| Position tracking | Manual accumulation with Date.now() | audioContext.currentTime + beat counting | audioContext.currentTime is hardware-driven, never drifts |

## Common Pitfalls

### Pitfall 1: Worker Creation in SSR/Test Environments
**What goes wrong:** `new Worker()` and `URL.createObjectURL()` throw in Node.js, SSR, and happy-dom
**Why it happens:** Web Workers are browser-only APIs
**How to avoid:** Feature-detect Worker support: `typeof Worker !== 'undefined'`. Fall back to `window.setTimeout` (or `globalThis.setTimeout` for Node) with a console.warn. Match `audioContextAwareTimeout`'s existing graceful-degradation pattern.
**Warning signs:** Tests fail with "Worker is not defined" or "URL.createObjectURL is not a function"

### Pitfall 2: Worker Memory Leak
**What goes wrong:** Worker stays alive after Transport is disposed
**Why it happens:** Worker runs in a separate thread, not garbage collected with Transport
**How to avoid:** `transport.dispose()` must call `worker.terminate()` and `URL.revokeObjectURL(blobUrl)`. WorkerTimer utility needs a `dispose()` method.
**Warning signs:** Multiple Workers accumulating in DevTools

### Pitfall 3: Beat Boundary Alignment for Hot-Join
**What goes wrong:** Track synced mid-playback plays its first beat at an arbitrary point in the measure
**Why it happens:** Transport's current position doesn't align with the new track's beat 0
**How to avoid:** When `syncTo()` is called during playback, calculate the next beat boundary from Transport's position and start the track there. The track waits for the next beat slot before producing audio.
**Warning signs:** Newly-joined tracks sound offset from existing tracks

### Pitfall 4: Synced Track Calling Own Play Methods
**What goes wrong:** User calls `beatTrack.playBeats()` while synced to Transport — creates a second scheduler
**Why it happens:** Synced tracks should be passive; their own play methods are redundant
**How to avoid:** Guard `playBeats()`, `playActiveBeats()`, `stop()`, `pause()`, `resume()` with a `_syncedTo` check. Throw an error with a helpful message: "This track is synced to a Transport. Use transport.start()/stop() instead."
**Warning signs:** Double beats, timing chaos

### Pitfall 5: Reactive Proxy Compatibility
**What goes wrong:** Vue `reactive()` or similar proxies break when Transport mutates internal state
**Why it happens:** Reactive proxies trap property access — some patterns (private fields, WeakMap lookups) don't work through proxies
**How to avoid:** Use public properties for observable state (bpm, position, playing). Follow BeatTrack's existing pattern — it already works with `reactive()`. Avoid `#private` fields if the object might be wrapped.
**Warning signs:** Vue/React UI doesn't update when Transport state changes

## Code Examples

### WorkerTimer Utility
```typescript
// src/utils/worker-timer.ts
const WORKER_CODE = `
  let timerId = null;
  self.onmessage = (e) => {
    if (e.data === 'start') {
      timerId = setInterval(() => self.postMessage('tick'), ${TICK_INTERVAL});
    } else if (e.data === 'stop') {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }
  };
`;

export class WorkerTimer {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private fallbackId: number | null = null;
  private callback: (() => void) | null = null;

  start(callback: () => void): void { /* ... */ }
  stop(): void { /* ... */ }
  dispose(): void { /* worker.terminate() + URL.revokeObjectURL() */ }
}
```

### Transport Skeleton
```typescript
// src/transport.ts
export class Transport {
  private workerTimer: WorkerTimer;
  private syncedTracks: Set<BeatTrack> = new Set();

  bpm: number;
  timeSignature: [number, number];
  position: TransportPosition;
  playing: boolean;

  start(): void { /* start worker, begin scheduling all synced tracks */ }
  stop(): void { /* stop worker, reset position, stop all synced tracks */ }
  pause(): void { /* stop worker, freeze position */ }

  get tracks(): readonly BeatTrack[] { return [...this.syncedTracks]; }

  // Called by beatTrack.syncTo() — not public API
  _addTrack(track: BeatTrack): void { /* ... */ }
  _removeTrack(track: BeatTrack): void { /* ... */ }
}
```

### BeatTrack Sync Integration
```typescript
// In BeatTrack — new methods
syncTo(transport: Transport, opts: { noteType: number }): void {
  if (this._syncedTo) this.unsync();
  this._syncedTo = transport;
  this._syncNoteType = opts.noteType;
  transport._addTrack(this);
  // Disable standalone scheduler
}

unsync(): void {
  if (!this._syncedTo) return;
  this._syncedTo._removeTrack(this);
  this._syncedTo = null;
  this.stop(); // Reset track state
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setTimeout` for audio scheduling | Web Worker + lookahead scheduler | ~2013 (Chris Wilson's article) | Background tabs no longer break audio timing |
| One timer per track | Shared Worker timer utility | Current best practice | Single timer, no drift between tracks |
| External Worker files | Inline Blob Worker | ~2015+ (broad Blob support) | No bundler config needed, single-file distribution |

## Open Questions

1. **Tick resolution for position reporting**
   - What we know: Position needs bar/beat/tick format. Tick is a subdivision within a beat.
   - What's unclear: How many ticks per beat? MIDI standard uses 480 PPQ (pulses per quarter note) but that's overkill for a visual display.
   - Recommendation: Use a simple subdivision count (e.g., 4 ticks per beat = 16th note resolution) rather than MIDI-level PPQ. Users see bar:beat:tick like "1:3:2". Keep it simple — this is "EZ" audio.

2. **Transport position string format**
   - What we know: Need both `{ bar, beat, tick }` POJO and a string representation
   - What's unclear: Should string be "1:3:2" (bar:beat:tick) or "1.3.2" or something else?
   - Recommendation: Use "bar:beat:tick" format (e.g., "1:3:2") — standard in DAWs. Also provide raw seconds for flexibility.

3. **SyncableTrack interface breadth**
   - What we know: Only BeatTrack syncs for now
   - What's unclear: Should we design the interface broad enough for future Sequencer (Phase 56)?
   - Recommendation: Yes — define a minimal `SyncableTrack` interface that both BeatTrack and future Sequencer can implement. This is forward-looking but costs nothing extra.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/beat-track.ts`, `src/beat.ts`, `src/utils/timeout.ts` — lookahead scheduler pattern, event system, audioContextAwareTimeout
- Web Audio API specification — `audioContext.currentTime` as authoritative clock
- Chris Wilson's "A Tale of Two Clocks" (widely referenced Web Audio scheduling guide)

### Secondary (MEDIUM confidence)
- Tone.js Transport implementation — uses similar Worker + lookahead pattern (verified via training data + consistent with all Web Audio sequencer implementations)
- MDN Web Workers documentation — inline Worker creation via Blob + createObjectURL

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Workers for audio scheduling is the de facto standard, no alternatives needed
- Architecture: HIGH — BeatTrack's existing lookahead scheduler is the correct pattern; Worker just replaces the setTimeout driver
- Pitfalls: HIGH — Well-known issues (Worker cleanup, SSR fallback, background tab behavior) with established solutions

**Research date:** 2026-02-28
**Valid until:** 2027-02-28 (stable Web APIs, no breaking changes expected)

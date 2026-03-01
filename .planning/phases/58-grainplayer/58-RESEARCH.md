# Phase 58: GrainPlayer - Research

**Researched:** 2026-02-28
**Domain:** Granular synthesis with Web Audio API
**Confidence:** HIGH

## Summary

Granular synthesis decomposes an audio buffer into many small overlapping "grains" (typically 10-100ms) and replays them with independent control over pitch (via `playbackRate` on each grain's `BufferSourceNode`) and position (which region of the buffer to sample from). The Web Audio API provides everything needed natively — `AudioBufferSourceNode` with `start(when, offset, duration)` for grain extraction and `playbackRate` for per-grain pitch control.

The GrainPlayer follows the PolySynth architectural pattern: a standalone class extending `TypedEventEmitter` (not `BaseSound`) with its own shared output bus (masterGain -> masterPan -> destination) and effects chain. Each grain is a transient `BufferSourceNode` -> per-grain `GainNode` (for windowing envelope) -> shared bus input. Grains are scheduled in a `setTimeout` loop with lookahead buffering, similar to how `Transport` and `BeatTrack` schedule audio.

**Primary recommendation:** Implement GrainPlayer as a standalone class with a `setTimeout`-based scheduling loop that pre-schedules grains ~50ms ahead. Use Hann window gain envelopes via `linearRampToValueAtTime` on per-grain GainNodes. Follow PolySynth's shared bus pattern for output routing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None explicitly locked — all areas are Claude's discretion.

### Claude's Discretion
User has no prior experience with granular synthesis and trusts Claude to design the full API based on:
1. Granular synthesis fundamentals and best practices
2. The project's existing patterns (BaseSound, factory functions, controller pattern)
3. Web Audio API capabilities for grain-level scheduling

All design areas are Claude's discretion:
- Grain parameters (grainSize, overlap, windowShape, jitter)
- Position scrubbing (0-1 normalized, loop behavior)
- Pitch shifting (semitones via playbackRate)
- Playback lifecycle (play/stop/pause/resume)
- Audio routing per grain
- Does NOT extend BaseSound
- Factory function: createGrainPlayer(buffer, options?)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNTH-03 | Developer can create a GrainPlayer from an audio buffer with configurable grain size and overlap | Grain scheduling loop pattern, Hann window envelope, BufferSourceNode.start(when, offset, duration) |
| SYNTH-04 | GrainPlayer supports independent pitch shifting and playback rate control | playbackRate on per-grain BufferSourceNode, semitone-to-ratio conversion (2^(semitones/12)) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API (native) | N/A | BufferSourceNode, GainNode, StereoPannerNode | No external deps — all grain scheduling done with native nodes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypedEventEmitter (internal) | N/A | Event system for play/stop/pause lifecycle | Already in project — PolySynth uses same pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setTimeout scheduling | AudioWorklet grain scheduler | AudioWorklet provides sample-accurate scheduling but massively increases complexity; setTimeout with lookahead is sufficient for granular textures |
| Per-grain GainNode envelope | AudioBufferSourceNode with pre-windowed buffer | Pre-windowing avoids per-grain GainNode overhead but loses flexibility for dynamic window shapes |

## Architecture Patterns

### Recommended File Structure
```
src/
├── grain-player.ts          # GrainPlayer class + GrainPlayerOptions interface
├── grain-player.test.ts     # Unit tests
└── index.ts                 # Export createGrainPlayer factory + types
```

### Pattern 1: Grain Scheduling Loop (setTimeout + Lookahead)
**What:** A `setTimeout` loop that runs at ~25ms intervals, scheduling grains up to ~50ms ahead of `audioContext.currentTime`. This provides sub-frame timing accuracy while being resilient to JavaScript timer jitter.
**When to use:** Always — this is the core playback engine.
**Example:**
```typescript
// Scheduling loop pattern (simplified)
private scheduleLoop(): void {
  const now = this.audioContext.currentTime

  // Schedule grains until we've filled the lookahead window
  while (this.nextGrainTime < now + this.LOOKAHEAD) {
    this.scheduleGrain(this.nextGrainTime)
    this.nextGrainTime += this.grainSize - this.overlap
  }

  // Re-run in ~25ms
  this.timerId = window.setTimeout(() => this.scheduleLoop(), this.SCHEDULE_INTERVAL)
}
```

### Pattern 2: Hann Window Grain Envelope
**What:** Each grain gets a gain envelope that ramps up from 0, holds, then ramps back to 0. The Hann window (`0.5 * (1 - cos(2*pi*t/N))`) prevents clicks at grain boundaries and creates smooth crossfades between overlapping grains.
**When to use:** Every grain — the window envelope is non-optional for click-free granular synthesis.
**Example:**
```typescript
private scheduleGrain(startTime: number): void {
  const source = this.audioContext.createBufferSource()
  source.buffer = this.buffer
  source.playbackRate.value = this.playbackRateValue

  const grainGain = this.audioContext.createGain()
  grainGain.gain.setValueAtTime(0, startTime)

  // Hann window: ramp up over first half, ramp down over second half
  const halfGrain = this.grainSize / 2
  grainGain.gain.linearRampToValueAtTime(1, startTime + halfGrain)
  grainGain.gain.linearRampToValueAtTime(0, startTime + this.grainSize)

  source.connect(grainGain)
  grainGain.connect(this.sharedBusInput)

  // Play grain from current position in buffer
  const offset = this.currentPosition * this.buffer.duration
  source.start(startTime, offset, this.grainSize)
}
```

### Pattern 3: Shared Output Bus (from PolySynth)
**What:** All grains route to a shared `GainNode` → `StereoPannerNode` → effects chain → destination. Master gain and pan controls affect all grains uniformly.
**When to use:** Always — this is the output architecture.
**Example:**
```typescript
// Same wiring pattern as PolySynth:
// sharedBusInput → [effects] → masterGain → masterPan → [analyzer] → destination
```

### Anti-Patterns to Avoid
- **Creating AudioContext per grain:** Always reuse the shared AudioContext. BufferSourceNodes are lightweight and designed to be created/destroyed per grain.
- **Using setInterval instead of setTimeout:** setInterval can drift and accumulate timing errors. setTimeout with self-rescheduling gives better control.
- **Scheduling too far ahead:** Large lookahead windows delay parameter changes. Keep lookahead to ~50ms for responsive real-time control.
- **Not disconnecting expired grains:** BufferSourceNodes that finish playing should be disconnected to allow garbage collection. Use the `ended` event.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event system | Custom pub/sub | TypedEventEmitter (internal) | Already battle-tested in project, typed, EventTarget-based |
| Output bus wiring | Inline connect/disconnect | PolySynth's wireSharedBus pattern | Handles effects chain rewiring, analyzer attachment, safe disconnect |
| Semitone conversion | Ad-hoc math | `Math.pow(2, semitones / 12)` | Standard formula, one-liner |

## Common Pitfalls

### Pitfall 1: Click Artifacts at Grain Boundaries
**What goes wrong:** Audible clicks when grains start/stop abruptly.
**Why it happens:** Discontinuities in the audio waveform when grains don't start/end at zero amplitude.
**How to avoid:** Always apply a window envelope (Hann) via gain ramps. Ensure overlap is sufficient (at least 25% of grain size).
**Warning signs:** Clicking sounds especially noticeable with pure tones or long grain sizes.

### Pitfall 2: Grain Pile-up at Extreme Parameters
**What goes wrong:** CPU spikes and audio glitches when grain density gets too high.
**Why it happens:** Very small grainSize with high overlap creates an exponentially increasing number of concurrent grains.
**How to avoid:** Clamp minimum grain size (e.g., 0.01s) and cap maximum concurrent grains. The hop size (grainSize - overlap) must be positive.
**Warning signs:** Audio crackling, dropped frames, high CPU usage.

### Pitfall 3: Pitch Shift Affecting Grain Duration
**What goes wrong:** When playbackRate is changed, the effective grain duration changes proportionally (higher pitch = shorter grain).
**Why it happens:** `BufferSourceNode.playbackRate` affects both pitch AND speed. A grain at 2x playbackRate plays in half the time.
**How to avoid:** Adjust the `duration` parameter passed to `source.start()` to compensate: `effectiveDuration = grainSize / playbackRate`. The gain envelope timing should use the original `grainSize` for consistent windowing, while the source's `start()` duration uses the compensated value.
**Warning signs:** Texture thins out at high pitches, gets muddy at low pitches.

### Pitfall 4: Buffer Boundary Wrapping
**What goes wrong:** Grains that start near the end of the buffer try to read past the buffer length.
**Why it happens:** `source.start(when, offset, duration)` will silently clip if offset + duration exceeds buffer duration.
**How to avoid:** When `loop` is true, handle wrapping by clamping the offset to buffer bounds. When `loop` is false, stop scheduling when position reaches the end.
**Warning signs:** Silence or shorter-than-expected grains near buffer end.

### Pitfall 5: Memory Leak from Unreleased Grain Nodes
**What goes wrong:** GainNode and BufferSourceNode objects accumulate, causing memory growth.
**Why it happens:** Grain nodes are not disconnected after playback completes.
**How to avoid:** Listen for the `ended` event on each BufferSourceNode and disconnect both the source and its gain node. Keep a count of active grains for debugging.
**Warning signs:** Growing memory usage during long playback sessions.

## Code Examples

### Grain Node Lifecycle (Complete)
```typescript
private scheduleGrain(when: number): void {
  const source = this.audioContext.createBufferSource()
  source.buffer = this.buffer
  source.playbackRate.value = this.playbackRateValue

  const grainGain = this.audioContext.createGain()

  // Hann window envelope
  const halfGrain = this.grainSize / 2
  grainGain.gain.setValueAtTime(0.0001, when) // near-zero, not zero (for log ramp compat)
  grainGain.gain.linearRampToValueAtTime(1, when + halfGrain)
  grainGain.gain.linearRampToValueAtTime(0.0001, when + this.grainSize)

  source.connect(grainGain)
  grainGain.connect(this.sharedBusInput)

  // Calculate buffer offset with optional jitter
  let offset = this._position * this.buffer.duration
  if (this._jitter > 0) {
    offset += (Math.random() * 2 - 1) * this._jitter * this.buffer.duration
  }
  // Clamp to buffer bounds
  offset = Math.max(0, Math.min(offset, this.buffer.duration - this.grainSize))

  // Compensate duration for playback rate
  const compensatedDuration = this.grainSize / this.playbackRateValue
  source.start(when, offset, compensatedDuration)

  this.activeGrainCount++

  // Cleanup on grain completion
  source.addEventListener('ended', () => {
    try { source.disconnect() } catch {}
    try { grainGain.disconnect() } catch {}
    this.activeGrainCount--
  }, { once: true })
}
```

### Semitone to PlaybackRate Conversion
```typescript
private semitonesToRate(semitones: number): number {
  return Math.pow(2, semitones / 12)
}

// Usage:
set pitch(semitones: number) {
  this._pitch = semitones
  this.playbackRateValue = this.semitonesToRate(semitones)
}
```

### Factory Function Pattern
```typescript
export async function createGrainPlayer(
  buffer: AudioBuffer,
  options?: GrainPlayerOptions,
): Promise<GrainPlayer> {
  await initAudio()
  return new GrainPlayer(getOrCreateAudioContext(), buffer, options)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for grain gen | AudioBufferSourceNode per grain | ScriptProcessorNode deprecated | BufferSourceNode approach is standard, performant, future-proof |
| requestAnimationFrame scheduling | setTimeout with AudioContext.currentTime lookahead | Best practice established ~2016 | More consistent scheduling, doesn't pause in background tabs (important: grains should stop in background, not glitch) |

## Open Questions

1. **Maximum concurrent grain count**
   - What we know: Each grain creates 2 nodes (BufferSourceNode + GainNode). Modern browsers handle hundreds of concurrent nodes.
   - What's unclear: Exact performance ceiling varies by device. Mobile may be lower.
   - Recommendation: Default cap at 100 concurrent grains, configurable. Log warning at 80% capacity.

2. **Pause/resume behavior for grain scheduling**
   - What we know: Pausing should stop scheduling new grains. Existing grains will finish naturally (very short).
   - What's unclear: Whether to fade out active grains on pause or let them decay naturally.
   - Recommendation: Let active grains decay naturally (they're short). Resume from same position.

## Sources

### Primary (HIGH confidence)
- Web Audio API specification (W3C) — AudioBufferSourceNode, start(when, offset, duration), playbackRate
- Project codebase — PolySynth pattern, TypedEventEmitter, shared bus wiring, effect chain
- Project codebase — Transport/BeatTrack scheduling loop pattern

### Secondary (MEDIUM confidence)
- Granular synthesis theory (Roads, Microsound 2001) — standard grain windowing, overlap ratios
- Tone.js GrainPlayer source — API surface reference (not code reuse)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native Web Audio API, no external deps
- Architecture: HIGH - Closely follows established PolySynth and Transport patterns in codebase
- Pitfalls: HIGH - Well-documented in audio programming literature and verified against project patterns

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (Web Audio API is stable, unlikely to change)

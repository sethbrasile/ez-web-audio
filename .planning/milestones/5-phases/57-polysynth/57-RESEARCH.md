# Phase 57: PolySynth - Research

**Researched:** 2026-02-28
**Domain:** Polyphonic synthesis voice management
**Confidence:** HIGH

## Summary

PolySynth is a voice pool manager that wraps multiple Oscillator instances behind a unified API. The core challenge is voice lifecycle management: allocating voices on `play()`, tracking their state, implementing voice stealing when the pool is full, and routing all voices through a shared output bus with effects support.

The existing codebase provides almost everything needed. Each voice IS an Oscillator (with full envelope, filter, and fluent API support). The shared output bus follows the exact same pattern as BaseSound's effect chain (effectChainInput -> effects -> gain -> panner -> destination). The TypedEventEmitter pattern handles the `voicestolen` event. The `createVoice` factory pattern enables pluggable oscillator types including MusicallyAware oscillators.

**Primary recommendation:** Build PolySynth as a TypedEventEmitter subclass (not BaseSound) that manages a pool of Oscillator instances, each with `setDestination()` pointed at the shared bus. Voice handles are lightweight class instances wrapping an Oscillator reference with staleness tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Default max voices: 8 (configurable at construction via `maxVoices` option)
- On-demand allocation: voices created when needed, recycled when stopped (not pre-allocated)
- `maxVoices` is set once at construction, immutable after creation
- No global voice limit across PolySynth instances — each manages its own pool independently
- Configurable steal strategy from day one: `stealStrategy: 'lru' | 'oldest-active' | 'quietest'`
- LRU (default): steal oldest-released voice first, then oldest-active if no released voices
- oldest-active: always steal the voice that started playing earliest
- quietest: steal the voice with the lowest current gain
- If all voices are active (none released), steal oldest active — new note always wins
- Same-frequency retrigger: reuses the same voice, restarts envelope from current gain (clickless)
- Emit `'voicestolen'` event with details: which voice was stolen, which replaced it
- Stolen voice fade-out handled by existing Oscillator.stopAt() 10ms anti-click (no extra work needed)
- `play()` returns a voice handle — the handle IS the voice identity
- Frequency is a mutable parameter on the handle, NOT the identity key
- Voice handle is a thin proxy exposing the full Oscillator fluent API: `update()`, `onPlaySet()`, `onPlayRamp()`, `stop()`
- Stale handles (voice was stolen) silently no-op on all method calls; handle has an `active` property
- `play()` accepts `{ frequency: number, gain?: number }` — gain enables velocity sensitivity
- `stopAll()` on PolySynth for panic/reset scenarios
- `activeVoices` / `availableVoices` getters for UI meters and polyphony load decisions
- PolySynth accepts a `createVoice` factory function: `(ctx: AudioContext) => Oscillator`
- Default factory: creates plain Oscillator with shared config (type, envelope, filters set at PolySynth creation)
- All voices route through a shared output bus (GainNode -> PannerNode -> destination)
- `polySynth.addEffect(delay)` applies to all voices through the shared bus
- No per-voice effects — only shared bus effects
- Master gain and pan controls on the shared bus using fluent API pattern
- Per-voice gain available via play options and handle.update('gain') for velocity/expression
- Analyzer support: `polySynth.setAnalyzer(analyzer)` taps the shared bus output

### Claude's Discretion
- Internal data structures for voice pool tracking (array, map, linked list — whatever performs best)
- Exact handle proxy implementation (class, Proxy object, or interface delegation)
- Whether `createVoice` factory is called eagerly (pre-warm pool) or lazily (first play)
- Audio graph wiring details (how voices connect to the shared bus)
- Event detail shape for 'voicestolen' event

### Deferred Ideas (OUT OF SCOPE)
- Browser MIDI / USB input: Web MIDI API integration — could be its own phase
- MusicallyAwareOscillator as a first-class export: Consider pre-mixed class convenience export separately
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNTH-01 | Developer can create a PolySynth that plays multiple notes simultaneously | Voice pool with on-demand Oscillator allocation; shared output bus; `play({ frequency })` returns handle |
| SYNTH-02 | PolySynth manages voice allocation with configurable max voices and voice stealing | Three steal strategies (lru/oldest-active/quietest); immutable maxVoices; same-frequency retrigger reuses voice |
</phase_requirements>

## Architecture Patterns

### Pattern 1: Voice Pool with Shared Output Bus

PolySynth does NOT extend BaseSound. It extends TypedEventEmitter and manages its own output bus. Each voice Oscillator uses `setDestination(sharedBusInput)` to route through the shared bus.

```
Voice 1 (Oscillator) ──┐
Voice 2 (Oscillator) ──┤──> sharedBusInput (GainNode) ──> effects ──> masterGain ──> masterPan ──> [analyzer] ──> destination
Voice 3 (Oscillator) ──┘
```

**Why not extend BaseSound:** BaseSound assumes a single audioSourceNode. PolySynth has N source nodes (one per voice). The shared bus is simpler to wire as a standalone gain->panner->destination chain.

**Implementation:** PolySynth creates its own GainNode (sharedBusInput), masterGain (GainNode), masterPan (StereoPannerNode). Effect chain management mirrors BaseSound's approach but is self-contained.

### Pattern 2: Voice Handle as Lightweight Class

```typescript
class VoiceHandle {
  private _active = true
  private oscillator: Oscillator

  get active(): boolean { return this._active }

  update(type: ControlType) {
    if (!this._active) return NO_OP_BUILDER
    return this.oscillator.update(type)
  }

  async stop(): Promise<void> {
    if (!this._active) return
    // ... release voice back to pool
  }

  // Internal: called when voice is stolen
  _invalidate(): void { this._active = false }
}
```

**Why class over Proxy:** A class is simpler, type-safe, and has zero runtime overhead. Proxy would add complexity and is harder to type correctly. The handle only needs to forward a handful of methods.

### Pattern 3: Voice State Tracking

Each voice in the pool has a state:

```typescript
interface VoiceEntry {
  oscillator: Oscillator
  handle: VoiceHandle | null  // null when released/available
  state: 'active' | 'released' | 'available'
  startedAt: number           // audioContext.currentTime when play() was called
  releasedAt: number          // audioContext.currentTime when stop() was called
  frequency: number           // current frequency (for same-frequency retrigger)
}
```

**Data structure:** Simple array. With maxVoices capped at ~32 (practical limit), linear scanning is trivially fast. No need for linked list or Map complexity.

### Pattern 4: Steal Strategy Implementation

```typescript
function findVoiceToSteal(voices: VoiceEntry[], strategy: StealStrategy): VoiceEntry | null {
  // All strategies follow same fallback: released first, then active
  const released = voices.filter(v => v.state === 'released')

  if (released.length > 0) {
    // For LRU: oldest releasedAt
    // For oldest-active: oldest releasedAt (same behavior for released voices)
    // For quietest: lowest gain among released
    return pickByStrategy(released, strategy)
  }

  // No released voices — steal from active
  const active = voices.filter(v => v.state === 'active')
  // LRU/oldest-active: oldest startedAt
  // quietest: lowest current gain
  return pickByStrategy(active, strategy)
}
```

### Anti-Patterns to Avoid
- **Creating Oscillator at construction time:** OscillatorNode is single-use in Web Audio. Each voice Oscillator creates a new OscillatorNode on every play() via setup(). The pool stores Oscillator instances that handle their own node lifecycle.
- **Using Proxy for voice handles:** Adds unnecessary complexity, poor TypeScript experience, runtime overhead.
- **Pre-allocating voice pool:** Wastes resources if fewer voices are used. On-demand with recycling is the locked decision.
- **Making PolySynth extend BaseSound:** BaseSound assumes single audioSourceNode. PolySynth manages N voices.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ADSR envelope | Custom gain scheduling | Existing `Envelope` class | Already handles retriggering, release, cross-browser compat |
| Anti-click stop | Custom gain fadeout | Existing `Oscillator.stopAt()` with 10ms fade | Already handles the 10ms anti-click ramp |
| Effect chain | Custom node wiring | Follow BaseSound's effect chain pattern | Proven pattern with bypass, add/remove, analyzer support |
| Event system | Custom event handling | `TypedEventEmitter` | Type-safe events, on/off/once, consistent with library |
| Frequency mapping | Note-to-Hz conversion | `frequencyMap` utility | Already exists, used at app layer not in PolySynth |

## Common Pitfalls

### Pitfall 1: OscillatorNode Single-Use Lifecycle
**What goes wrong:** Trying to call start() on an already-used OscillatorNode throws.
**Why it happens:** Web Audio spec: OscillatorNode can only be started once.
**How to avoid:** Each voice's Oscillator.play() calls setup() which creates a fresh OscillatorNode. When recycling a voice, stop the old one and call play() again — setup() handles the rest.
**Warning signs:** `InvalidStateError: Cannot call start more than once`.

### Pitfall 2: Voice Stealing During Envelope Release
**What goes wrong:** Stealing a voice that's in its envelope release phase creates a click.
**Why it happens:** The release is a gain ramp that gets cancelled abruptly.
**How to avoid:** Oscillator.stopAt() already applies a 10ms anti-click fade. When stealing, call stopAt(now) on the old voice, then reuse the Oscillator instance for the new note by calling play() (which calls setup() and creates a fresh OscillatorNode).
**Warning signs:** Audible clicks when playing rapidly at max polyphony.

### Pitfall 3: Stale Handle Reference to Recycled Voice
**What goes wrong:** User holds a VoiceHandle, voice gets stolen, user calls handle.update() and accidentally modifies the new note.
**How to avoid:** VoiceHandle stores a reference to the VoiceEntry. When the voice is stolen, the handle's `_active` flag is set to false. All methods check this flag and no-op if stale.
**Warning signs:** Parameters changing on wrong notes during rapid playing.

### Pitfall 4: Shared Bus Disconnection on Dispose
**What goes wrong:** Disposing PolySynth without stopping all voices leaves dangling audio graph connections.
**How to avoid:** dispose() must: 1) stopAll(), 2) disconnect all voice oscillators, 3) disconnect shared bus nodes, 4) invalidate all outstanding handles.
**Warning signs:** Audio continuing after dispose, memory leaks.

### Pitfall 5: Same-Frequency Retrigger vs New Voice
**What goes wrong:** Playing the same frequency allocates a new voice instead of retriggering.
**How to avoid:** Before allocating, scan active voices for matching frequency. If found and state is 'active', retrigger the existing voice's envelope (Envelope.applyTo already handles retriggering clicklessly).
**Warning signs:** Running out of voices when rapidly repeating the same note.

## Code Examples

### PolySynth Construction
```typescript
const synth = await createPolySynth({
  maxVoices: 8,
  type: 'sawtooth',
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
  lowpass: { frequency: 2000, q: 1 },
  stealStrategy: 'lru',
})
```

### Playing Notes
```typescript
const handle1 = synth.play({ frequency: 261.63 }) // C4
const handle2 = synth.play({ frequency: 329.63 }) // E4
const handle3 = synth.play({ frequency: 392.00, gain: 0.7 }) // G4 at 70% velocity

// Stop individual note
await handle1.stop()

// Panic: stop all
synth.stopAll()
```

### Voice Handle API
```typescript
const handle = synth.play({ frequency: 440 })
handle.active          // true
handle.update('gain').to(0.5).as('ratio')  // per-voice gain
handle.update('frequency').to(450).as('ratio')  // pitch bend

// After voice is stolen:
handle.active          // false
handle.update('gain')  // no-op, returns safely
```

### Shared Bus Effects
```typescript
const delay = createDelay({ time: 0.3, feedback: 0.4, wet: 0.3 })
synth.addEffect(delay)
synth.update('gain').to(0.5).as('ratio')  // master gain
synth.setAnalyzer(analyzer)  // visualization
```

### Voice Factory for Custom Oscillators
```typescript
const synth = await createPolySynth({
  maxVoices: 4,
  createVoice: (ctx) => new Oscillator(ctx, {
    type: 'square',
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.1 },
    lowpass: { frequency: 1000, q: 2 },
  }),
})
```

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/oscillator.ts` — voice implementation, setup() lifecycle, stopAt() anti-click
- Codebase analysis: `src/base-sound.ts` — effect chain pattern, wireEffectChain(), addEffect(), setAnalyzer()
- Codebase analysis: `src/envelope.ts` — ADSR with retrigger support via estimateCurrentValue()
- Codebase analysis: `src/layered-sound.ts` — multi-instance management, event handling, dispose pattern
- Codebase analysis: `src/events/event-types.ts` — TypedEventEmitter pattern, event map structure
- Codebase analysis: `src/index.ts` — factory function patterns, export conventions

### Secondary (MEDIUM confidence)
- Web Audio API spec: OscillatorNode single-use constraint (well-documented behavior)
- Voice stealing algorithms: LRU/oldest-active/quietest are standard patterns in polyphonic synthesizers

## Metadata

**Confidence breakdown:**
- Architecture: HIGH - All patterns exist in codebase, PolySynth composes them
- Voice lifecycle: HIGH - Oscillator.setup() handles OscillatorNode recycling
- Steal strategies: HIGH - Simple array operations, well-defined algorithms
- Effect routing: HIGH - BaseSound.setDestination() + wireEffectChain() pattern proven

**Research date:** 2026-02-28
**Valid until:** 2026-03-28

# Phase 59: LayeredSound Effects + LFO-Effect Dispose - Research

**Researched:** 2026-02-28
**Domain:** Web Audio API node routing, event-driven lifecycle management, TypeScript class extension
**Confidence:** HIGH

## Summary

This phase has two complementary goals. First, `LayeredSound` needs `addEffect()` / `removeEffect()` so a single effect (e.g. reverb) can be applied to all layers at once through a shared output bus. Second, the `LFO` needs to auto-disconnect when a `BaseEffect` it is connected to is disposed — right now it only auto-cleans up `BaseSound` targets, and the inline comment in `_listenForDispose()` explicitly marks this gap as "TODO until BaseEffect adds dispose()".

Both goals are well-defined by existing code in the repository. The patterns are already proven — `GrainPlayer` and `PolySynth` use the shared-bus approach, `BaseSound.dispose()` emits a `'dispose'` CustomEvent and the LFO already wires up to it for BaseSound targets. This phase extends both patterns to cover the remaining gaps.

**Primary recommendation:** Implement a shared output bus on `LayeredSound` using the same `wireSharedBus()` pattern as `GrainPlayer`, and add a `'dispose'` CustomEvent to `BaseEffect.dispose()` so LFO can wire up its existing `_listenForDispose()` / `_cleanupTarget()` logic for effect targets.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FX-06 | All built-in effects work with existing `addEffect()` on Sound, Oscillator, and LayeredSound | LayeredSound currently has no addEffect() — needs shared output bus; all built-in effects implement the `Effect` interface which BaseSound's addEffect() already accepts |
| MOD-03 | LFO is properly disposed when the target sound is disposed (no memory leaks) | LFO._listenForDispose() already handles BaseSound; gap is BaseEffect targets — fixed by adding 'dispose' event to BaseEffect and connecting LFO's existing cleanup logic |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API (native) | Browser built-in | Audio node routing, GainNode as shared bus | All existing code uses native Web Audio nodes directly |
| TypedEventEmitter (project) | Internal | Type-safe CustomEvent dispatch | BaseSound, GrainPlayer, PolySynth, Transport, Sequence all extend this |
| EventTarget (native) | Browser built-in | dispose event subscription on BaseEffect | BaseEffect extends nothing currently — needs EventTarget or composition |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| standardized-audio-context-mock | Existing in devDeps | AudioContext mock for Vitest tests | All unit tests already use this |
| Vitest | Existing | Test runner | All tests use Vitest with happy-dom |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending EventTarget for BaseEffect | Custom EventEmitter or callback-based dispose | Native EventTarget matches the pattern BaseSound already uses; stays consistent |
| Adding dispose to BaseEffect | Monkey-patching in LFO (existing hack-around) | Event-based is the established pattern per Phase 54 decisions; monkey-patching was explicitly rejected |

**Installation:** No new dependencies required.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are localized to:

```
src/
├── layered-sound.ts         # Add shared output bus + addEffect/removeEffect/getEffects
├── effects/base-effect.ts   # Add 'dispose' event emission + extend EventTarget
├── lfo.ts                   # Update _listenForDispose() to handle BaseEffect targets
├── events/event-types.ts    # Possibly add LayeredSoundEventMap 'dispose' event (if needed)
└── layered-sound.test.ts    # New test coverage for addEffect/removeEffect
```

### Pattern 1: Shared Output Bus (GrainPlayer model)

**What:** A single GainNode (`sharedBusInput`) that all layers route through. Effects are chained on this bus. The bus wires: `sharedBusInput -> [effects] -> masterGain/masterPan -> destination`.

**When to use:** When multiple audio sources (layers) need a unified effect chain.

**LayeredSound currently:** Each layer routes to its own `gainNode -> pannerNode -> destination`. There is no shared bus, so there is no place to attach effects that apply to all layers.

**How to implement:**
1. Add `private outputBus: GainNode` to `LayeredSound` — created in constructor from `audioContext.createGain()`
2. Add `private effects: Effect[] = []` array
3. Add `private wireOutputBus(): void` — same pattern as `GrainPlayer.wireSharedBus()`
4. Override each layer's destination to route to `outputBus.input` instead of `audioContext.destination`
5. `addEffect(effect, position?)` — push to effects, call wireOutputBus(), return this
6. `removeEffect(effect)` — splice from effects, call wireOutputBus(), return this
7. `getEffects()` — returns readonly copy

**Exact GrainPlayer pattern to replicate:**
```typescript
// Source: src/grain-player.ts lines 129-162
private wireSharedBus(): void {
  this.safeDisconnect(this.sharedBusInput)
  this.safeDisconnect(this.masterGain)
  this.safeDisconnect(this.masterPan)

  for (const effect of this.effects) {
    this.safeDisconnect(effect.output)
  }

  let currentNode: AudioNode = this.sharedBusInput
  for (const effect of this.effects) {
    if (!effect.bypass) {
      currentNode.connect(effect.input)
      currentNode = effect.output
    }
  }

  currentNode.connect(this.masterGain)
  this.masterGain.connect(this.masterPan)
  this.masterPan.connect(this._destination)
}
```

**Key difference for LayeredSound:** LayeredSound has no `masterGain`/`masterPan` of its own — each layer owns its own gain/pan. The shared bus only needs to be: `outputBus -> [effects] -> audioContext.destination`. The layers are rerouted to connect to `outputBus.input` rather than directly to destination.

**Layer routing challenge:** Layers are `Sound | Oscillator` instances that extend `BaseSound`. BaseSound's internal routing ends at `pannerNode -> destination`. To route through a shared bus, the layer's destination must be redirected. BaseSound already has `setDestination(node)` which does exactly this. So the constructor loop should call `layer.setDestination(this.outputBus)` for each valid layer.

**Dispose integration:** In `LayeredSound.dispose()`, disconnect `outputBus` and emit a `'dispose'` event before silencing, matching BaseSound's pattern.

### Pattern 2: BaseEffect Dispose Event (BaseSound model)

**What:** `BaseEffect.dispose()` emits a `'dispose'` CustomEvent before silencing, so external subscribers (LFO) can clean up stale AudioParam references.

**BaseSound's implementation (the model to follow):**
```typescript
// Source: src/base-sound.ts lines 1292-1298
// Emit 'dispose' event BEFORE silencing dispatchEvent so listeners can react.
this.dispatchEvent(new CustomEvent('dispose', { detail: { source: this } }))
// Silence future event dispatch
this.dispatchEvent = () => false
```

**Current BaseEffect.dispose():**
```typescript
// Source: src/effects/base-effect.ts lines 180-185
public dispose(): void {
  try { this.inputNode.disconnect() } catch { /* already disconnected */ }
  try { this.outputNode.disconnect() } catch { /* already disconnected */ }
  try { this.dryGain.disconnect() } catch { /* already disconnected */ }
  try { this.wetGain.disconnect() } catch { /* already disconnected */ }
}
```

**Gap:** BaseEffect currently extends nothing (just implements `Effect` interface implicitly through method presence). To dispatch a CustomEvent it must either extend `EventTarget` or use `new EventTarget()` internally.

**Solution: Extend EventTarget in BaseEffect.** BaseEffect has no superclass currently — making it extend `EventTarget` enables `dispatchEvent(new CustomEvent('dispose', ...))` and `addEventListener('dispose', handler)`. This is the cleanest approach matching BaseSound's own implementation.

**TypeScript typing:** Either add a typed event map to BaseEffect (extending TypedEventEmitter) or keep it minimal — just EventTarget with raw CustomEvent dispatch. The LFO only needs to call `target.addEventListener('dispose', handler)` on BaseEffect targets.

**Recommended approach:** Make `BaseEffect` extend `TypedEventEmitter` with a minimal event map containing just `'dispose'`. This gives type-safe event registration and matches the project's convention for classes that emit events.

```typescript
// BaseEffect event map (new)
interface BaseEffectEventMap {
  dispose: CustomEvent<{ source: BaseEffect }>
}

// BaseEffect becomes:
export abstract class BaseEffect extends TypedEventEmitter<BaseEffectEventMap> implements Effect {
  // ...existing code...

  public dispose(): void {
    // ...existing disconnects...

    // Emit dispose event BEFORE silencing (matches BaseSound pattern)
    this.dispatchEvent(new CustomEvent('dispose', { detail: { source: this } }))

    // Silence future events
    this.dispatchEvent = () => false
  }
}
```

### Pattern 3: LFO Cleanup for BaseEffect Targets

**What:** Update `LFO._listenForDispose()` to register a dispose listener on BaseEffect targets, using the same `_cleanupTarget()` logic already working for BaseSound.

**Current code (the gap, src/lfo.ts lines 638-652):**
```typescript
private _listenForDispose(target: LFOTarget): void {
  if (this._disposeListeners.has(target)) {
    return
  }

  // Only BaseSound emits 'dispose' events; BaseEffect targets skip until they add dispose()
  if (!this._isBaseSound(target)) {
    return  // <-- THIS IS THE GAP
  }

  const handler = (() => this._cleanupTarget(target)) as EventListener
  target.addEventListener('dispose', handler)
  this._disposeListeners.set(target, handler)
}
```

**Fix:** Once BaseEffect extends TypedEventEmitter (or EventTarget) and emits 'dispose', remove the early-return guard for non-BaseSound targets. The `_cleanupTarget()` method already works correctly for any `LFOTarget`, so the only change is removing/updating the guard condition:

```typescript
private _listenForDispose(target: LFOTarget): void {
  if (this._disposeListeners.has(target)) {
    return
  }

  // Register dispose listener for both BaseSound and BaseEffect targets
  const handler = (() => this._cleanupTarget(target)) as EventListener
  target.addEventListener('dispose', handler)
  this._disposeListeners.set(target, handler)
}
```

**Also update LFO.dispose():** The existing LFO dispose method only calls `removeEventListener` on BaseSound targets:
```typescript
// Current: src/lfo.ts lines 376-381
for (const [target, handler] of this._disposeListeners) {
  if (this._isBaseSound(target)) {  // <-- needs to also handle BaseEffect
    target.removeEventListener('dispose', handler)
  }
}
```
Fix: Remove the `_isBaseSound()` guard so all target types are cleaned up.

### Anti-Patterns to Avoid

- **Don't route effects through individual layers:** Each layer already has its own gain/pan/effects chain. Adding effects per-layer would apply the effect N times (once per layer). The shared bus approach applies the effect once to the mixed output.
- **Don't monkey-patch layer destinations after construction:** LayeredSound should set layer destinations during construction (or immediately when addEffect first creates the bus). Deferred destination setting risks audio escaping to the main destination before the bus is wired.
- **Don't duplicate wireEffectChain logic from BaseSound:** BaseSound.wireEffectChain() intercepts bypass setter — this is complex and not needed for LayeredSound. Use GrainPlayer's simpler approach (no bypass interception, just rewire on bypass change is not needed unless we want the same feature).
- **Don't skip idempotency in dispose:** Both LayeredSound.dispose() and BaseEffect.dispose() must be safe to call multiple times.
- **Don't forget to clean up the shared bus in LayeredSound.dispose():** If layers are disposed individually, their connection to the outputBus vanishes. The outputBus itself must also be disconnected in LayeredSound.dispose().

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared bus routing | Custom mixer class | GainNode as bus (existing pattern) | GainNode IS the bus — all layers connect to it and it feeds the effect chain |
| Event dispatch on BaseEffect | Custom callback/WeakRef system | Native CustomEvent + EventTarget | Matches existing BaseSound pattern exactly, browser-native |
| LFO cleanup logic | New cleanup mechanism | Existing _cleanupTarget() method | Already correct — only the guard needs removing |

**Key insight:** This phase is primarily about connecting existing patterns to new targets, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Output Bus Destination Override Timing
**What goes wrong:** Layers added during construction are set via `setDestination(outputBus)`, but `outputBus` must be wired through effects to the real destination first. If `wireOutputBus()` is not called before layers try to play, audio routing is incomplete.
**Why it happens:** Construction order — layers may be set up before the bus chain is wired.
**How to avoid:** Call `wireOutputBus()` in the constructor after creating the bus and before (or after) setting layer destinations. Since layers only connect at `play()` time (they reconnect their source node each play), the chain just needs to be correct before the first `play()`.
**Warning signs:** Silent audio despite no errors.

### Pitfall 2: Layer Destinations Not Restored on LayeredSound Dispose
**What goes wrong:** When `LayeredSound.dispose()` calls `layer.dispose()`, the layer's destination is already redirected to the shared bus. The layer's own dispose disconnects its nodes but the shared bus reference may still exist.
**Why it happens:** Dispose ordering — if the shared bus is disconnected after layers are disposed, no problem. If layers are not disposed and the shared bus vanishes, layer audio goes nowhere.
**How to avoid:** Disconnect the shared bus in `LayeredSound.dispose()` AFTER stopping/disposing layers. Since layers are fully disposed (unusable after), their destination doesn't matter.

### Pitfall 3: BaseEffect EventTarget Inheritance Conflicts
**What goes wrong:** BaseEffect currently has no superclass. Adding `extends TypedEventEmitter<BaseEffectEventMap>` may conflict if any subclass (DelayEffect, ReverbEffect, etc.) overrides `dispose()` without calling `super.dispose()`.
**Why it happens:** Subclasses currently override `dispose()` to disconnect feedback loops but may not call `super.dispose()`.
**How to avoid:** Audit all BaseEffect subclasses that override `dispose()` to ensure they call `super.dispose()`. The 'dispose' event must be emitted from the base class, not each subclass.

### Pitfall 4: LFO Double-Cleanup on BaseEffect
**What goes wrong:** If LFO.disconnect() is called manually before the BaseEffect is disposed, and then the BaseEffect fires 'dispose', the handler tries to clean up already-removed connections.
**Why it happens:** `_cleanupTarget()` is called twice — once manually, once via dispose event.
**How to avoid:** `_cleanupTarget()` already removes the dispose listener from `_disposeListeners` as the last step, so the handler won't fire again. The connection cleanup inside `_removeConnection()` uses try/catch for already-disconnected nodes. This is already safe.

### Pitfall 5: LayeredSound addEffect Not Chainable
**What goes wrong:** `addEffect()` returns `void` instead of `this`, breaking fluent chaining.
**How to avoid:** Always return `this` from `addEffect()` and `removeEffect()` — match the GrainPlayer pattern.

### Pitfall 6: Bypass Interception Scope
**What goes wrong:** BaseSound.addEffect() intercepts the bypass setter via `interceptBypass()` using WeakMap + Object.defineProperty. LayeredSound does not have this mechanism. Toggling `effect.bypass` on an effect added to LayeredSound won't auto-rewire the bus.
**Why it happens:** GrainPlayer also doesn't have bypass interception — this is a known simplification.
**How to avoid:** For Phase 59, match GrainPlayer's approach (no bypass interception). Users call `layeredSound.rewireEffects()` or the bus rewires naturally on next `addEffect()`/`removeEffect()`. This is acceptable scope — bypass auto-rewire for LayeredSound is not in the success criteria.

---

## Code Examples

### LayeredSound Constructor with Output Bus

```typescript
// Pattern: route all layers through shared outputBus
constructor(
  private audioContext: AudioContext,
  layers: (Sound | Oscillator | null | undefined)[],
  opts?: LayeredSoundOptions,
) {
  super()
  // ...existing layer filtering...

  // Create shared output bus
  this.outputBus = audioContext.createGain()
  this._destination = audioContext.destination
  this.effects = []
  this.wireOutputBus()

  // Route each layer through the shared bus
  this.layers.forEach(layer => layer.setDestination(this.outputBus))
}
```

### LayeredSound wireOutputBus

```typescript
private wireOutputBus(): void {
  this.safeDisconnect(this.outputBus)
  for (const effect of this.effects) {
    this.safeDisconnect(effect.output)
  }

  let currentNode: AudioNode = this.outputBus
  for (const effect of this.effects) {
    if (!effect.bypass) {
      currentNode.connect(effect.input)
      currentNode = effect.output
    }
  }
  currentNode.connect(this._destination)
}
```

### BaseEffect dispose event emission

```typescript
// Source: matching BaseSound pattern (src/base-sound.ts line 1294)
public dispose(): void {
  try { this.inputNode.disconnect() } catch { /* already disconnected */ }
  try { this.outputNode.disconnect() } catch { /* already disconnected */ }
  try { this.dryGain.disconnect() } catch { /* already disconnected */ }
  try { this.wetGain.disconnect() } catch { /* already disconnected */ }

  // Emit dispose BEFORE silencing (LFO and others listen for this)
  this.dispatchEvent(new CustomEvent('dispose', { detail: { source: this } }))
  this.dispatchEvent = () => false
}
```

### LFO _listenForDispose after fix

```typescript
private _listenForDispose(target: LFOTarget): void {
  if (this._disposeListeners.has(target)) {
    return
  }
  // Both BaseSound and BaseEffect now emit 'dispose' events
  const handler = (() => this._cleanupTarget(target)) as EventListener
  target.addEventListener('dispose', handler)
  this._disposeListeners.set(target, handler)
}
```

### LFO.dispose() after fix

```typescript
dispose(): void {
  if (this._disposed) return
  if (this._isRunning) this.stop()
  this.disconnect()

  // Remove dispose listeners from ALL target types (BaseSound + BaseEffect)
  for (const [target, handler] of this._disposeListeners) {
    target.removeEventListener('dispose', handler)
  }
  this._disposeListeners.clear()
  this._disposed = true
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| LFO skips BaseEffect dispose | LFO registers dispose listener on BaseEffect (after this phase) | Closes MOD-03 memory leak |
| LayeredSound has no effect support | LayeredSound has shared output bus with addEffect() | Closes FX-06 gap |
| BaseEffect has no EventTarget | BaseEffect extends TypedEventEmitter | Enables event-based cleanup patterns |

**Current gap in lfo.ts (inline comment at line 644):**
```
// Only BaseSound emits 'dispose' events; BaseEffect targets skip until they add dispose()
```
This comment is a self-referential TODO that this phase resolves.

---

## Key Implementation Decisions to Make

1. **Should `LayeredSound` extend `TypedEventEmitter` with a `'dispose'` event in its event map?**
   - Current `LayeredSoundEventMap` has: `play`, `stop`, `end`, `warning` — no `dispose`
   - LayeredSound's dispose silences events via `this.dispatchEvent = () => false` (same as BaseSound)
   - Decision: Add `dispose` to `LayeredSoundEventMap` so LFO could also watch for LayeredSound disposal (consistent pattern). Not strictly required for FX-06/MOD-03 but adds completeness.

2. **Should `BaseEffect` extend `TypedEventEmitter` or plain `EventTarget`?**
   - `TypedEventEmitter<BaseEffectEventMap>` gives type-safe `addEventListener('dispose', handler)` and the `emit()` helper
   - Plain `EventTarget` is lighter but loses typed event registration
   - Decision: `TypedEventEmitter` — matches every other event-emitting class in the project

3. **Does the LFO need to handle `LayeredSound` as an LFO target?**
   - Currently `LFOTarget = BaseSound | BaseEffect` — LayeredSound is neither
   - LFO modulates AudioParams (gain, pan, frequency) — LayeredSound doesn't directly expose AudioParams in the LFO's supported params list
   - Decision: Out of scope for Phase 59. LayeredSound effects (not the LayeredSound itself) can be LFO targets.

4. **What happens to layer destinations when `LayeredSound` is disposed?**
   - Layers are disposed individually (they call their own dispose which disconnects their internal nodes)
   - The shared bus just gets disconnected in LayeredSound.dispose()
   - Decision: Disconnect outputBus, emit dispose event, clear effects array — same as GrainPlayer

---

## Open Questions

1. **BaseEffect subclasses that override dispose() — do they call super.dispose()?**
   - What we know: DelayEffect, ReverbEffect, DistortionEffect, CompressorEffect, EQEffect, FilterEffect may override dispose()
   - What's unclear: Whether any subclass calls super.dispose() or fully replaces it
   - Recommendation: Audit all overrides in Wave 0; if they don't call super, either: (a) move the dispose event emission to a private method called separately, or (b) add super.dispose() calls in each override. Option (b) is cleaner.

2. **Should LayeredSound.addEffect() require the outputBus to be set up before any layer calls setDestination()?**
   - What we know: BaseSound.setDestination() rewires the effect chain immediately
   - What's unclear: Thread-safety timing between construction and first play()
   - Recommendation: Wire outputBus in constructor before iterating layers; this is safe because layer play() is always async/user-driven, never synchronous at construction time.

3. **GrainPlayer.addEffect() does not intercept bypass — should LayeredSound match this simplification or match BaseSound's full bypass interception?**
   - What we know: BaseSound intercepts bypass setter to auto-rewire; GrainPlayer does not
   - What's unclear: Whether users will expect `effect.bypass = true` to auto-rewire on LayeredSound
   - Recommendation: Match GrainPlayer (no bypass interception) for simplicity. Phase 59 success criteria doesn't mention bypass support. Can be added later if needed.

---

## Validation Architecture

The config does not include `workflow.nyquist_validation`, so this section is skipped per protocol.

Test coverage needed (using existing Vitest + standardized-audio-context-mock infrastructure):

**FX-06 tests (layered-sound.test.ts):**
- `addEffect()` adds effect to internal array
- `addEffect()` rewires bus (effect.input is connected)
- `removeEffect()` removes effect and rewires
- `getEffects()` returns readonly copy
- Effect applies to all layers (signal flows through shared bus)
- `addEffect()` is chainable (returns this)
- Disposed LayeredSound throws on addEffect()

**MOD-03 tests (lfo.test.ts):**
- LFO connected to BaseEffect auto-disconnects when effect.dispose() is called
- No stale AudioParam references after effect disposal
- LFO.dispose() removes addEventListener from BaseEffect targets

**BaseEffect tests (base-effect.test.ts):**
- dispose() emits 'dispose' event
- Listeners registered before dispose() are called
- No events fire after dispose() (dispatchEvent silenced)
- All subclass dispose() calls properly emit the event (via super.dispose())

---

## Sources

### Primary (HIGH confidence)
- `src/grain-player.ts` — Shared output bus pattern with addEffect/removeEffect (lines 83-162, 499-523)
- `src/base-sound.ts` — dispose event emission pattern (lines 1292-1298), setDestination() API (lines 526-530)
- `src/lfo.ts` — _listenForDispose gap (line 644 comment), _cleanupTarget(), LFO dispose
- `src/effects/base-effect.ts` — Current dispose() without event (lines 180-185)
- `src/events/typed-event-emitter.ts` — TypedEventEmitter base class used by all event-emitting classes
- `.planning/STATE.md` — "Event-based LFO dispose cleanup: addEventListener('dispose') instead of monkey-patching" (Phase 54 decisions)

### Secondary (MEDIUM confidence)
- `src/layered-sound.ts` — Current implementation confirming no addEffect/outputBus exists
- `src/events/event-types.ts` — LayeredSoundEventMap (no dispose currently)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses only existing project patterns and browser-native APIs
- Architecture: HIGH — both patterns (shared bus, dispose event) are proven in the codebase; this phase extends them
- Pitfalls: HIGH — identified from direct code inspection of existing implementations

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable domain, no external dependencies)

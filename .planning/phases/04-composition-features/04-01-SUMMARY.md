---
phase: 04-composition-features
plan: "01"
subsystem: composition
tags:
  - layered-sound
  - synchronized-playback
  - multi-voice
  - composition
  - web-audio-api
requires:
  - 01-01-PLAN.md # Events system for layer end tracking
  - 01-02-PLAN.md # Sound and Oscillator as playable layers
provides:
  - LayeredSound class for synchronized multi-voice playback
  - Master gain/pan control affecting all layers
  - Individual layer access for runtime mixing
  - Graceful degradation for failed layers
  - Event system (play, stop, end, warning)
affects:
  - future: 04-02-PLAN.md (BeatTrack may use similar synchronization patterns)
  - future: 04-03-PLAN.md (Crossfade will need LayeredSound instances)
tech-stack:
  added:
    - None (native Web Audio API)
  patterns:
    - Exact sync via audioContext.currentTime (Pattern 1 from research)
    - Independent layer end tracking (Pattern 2 from research)
    - Graceful degradation (Pattern 6 from research)
    - EventTarget extension with typed events
    - Playable interface implementation
decisions:
  - sync-mechanism: "Capture audioContext.currentTime FIRST, then pass same value to all playAt() calls"
  - end-tracking: "Use Set to track ended layers, emit when last finishes"
  - graceful-degradation: "Filter null/undefined layers, emit warning event"
  - layer-limit: "Soft limit at 8 layers (configurable), console.warn but allow any count"
  - reusability: "Fresh Set per play() call, supports multiple playbacks like Sound"
key-files:
  created:
    - src/layered-sound.ts
    - src/layered-sound.test.ts
  modified:
    - src/events/event-types.ts
    - src/index.ts
metrics:
  duration: "9 minutes"
  completed: "2026-02-01"
---

# Phase 04 Plan 01: LayeredSound Summary

**One-liner:** Synchronized multi-voice playback with exact timing via audioContext.currentTime and independent layer end tracking.

## What Was Built

Implemented LayeredSound class that synchronizes multiple Sound/Oscillator instances for simultaneous playback. All layers start at exactly the same audioContext.currentTime (microsecond-precision sync). Layers end independently, with LayeredSound emitting 'end' when the last layer finishes.

**Key features:**
- Exact synchronization: Capture `audioContext.currentTime` once, pass to all `playAt()` calls
- Master controls: `setGain(value)` and `setPan(value)` affect all layers simultaneously
- Individual layer access: `getLayer(index)` returns layer for runtime mixing adjustments
- Graceful degradation: Filters null/undefined layers, emits warning event with failed layer details
- Soft limit: Warns at 8+ layers (configurable) but allows any count
- Reusable: Fresh end tracking per `play()` call, supports multiple playbacks
- Type-safe events: play, stop, end, warning with full TypeScript support

## Architecture Decisions

### Synchronization Strategy (CRITICAL)
**Decision:** Capture `audioContext.currentTime` FIRST, then pass same value to all layers.

**Why:** This is the exact sync pattern from RESEARCH.md Pattern 1. Calling `currentTime` separately per layer would introduce microsecond-level drift. Web Audio API's hardware-based clock provides sub-sample accuracy when used this way.

**Code:**
```typescript
async play(): Promise<void> {
  const startTime = this.audioContext.currentTime // Capture ONCE
  await Promise.all(
    this.layers.map(layer => layer.playAt(startTime)) // Same value for all
  )
  this.emit('play', { time: startTime, source: this })
  this.setupLayerEndTracking()
}
```

**Impact:** All layers start sample-aligned. Critical for musical applications where even tiny timing differences are audible.

### Independent Layer End Tracking
**Decision:** Use Set to track ended layers, emit LayeredSound 'end' when all complete.

**Why:** Layers have different durations (e.g., bass line vs short melody). Each layer's `onended` fires independently. Set prevents duplicate handling, fresh Set per play() supports reusability.

**Code:**
```typescript
private setupLayerEndTracking(): void {
  const endedLayers = new Set<Sound | Oscillator>()

  const handleEnd = (layer: Sound | Oscillator) => {
    endedLayers.add(layer)
    if (endedLayers.size === this.layers.length) {
      this.emit('end', {
        time: this.audioContext.currentTime,
        source: this,
        duration: Math.max(...this.layers.map(l => l.duration.raw))
      })
    }
  }

  this.layers.forEach(layer => {
    layer.once('end', () => handleEnd(layer))
  })
}
```

**Impact:** LayeredSound correctly reports completion even when layers end at different times. Users can chain playbacks or cleanup resources.

### Graceful Degradation
**Decision:** Filter null/undefined layers at construction, emit warning event, continue with valid layers.

**Why:** Per CONTEXT.md: "If a layer fails to load, play available layers anyway and emit warning event." Better UX than hard failure - partial audio is better than silence.

**Code:**
```typescript
this.layers = layers.filter((layer, index) => {
  if (!layer) {
    this.failedLayers.push({
      index,
      error: new Error(`Layer ${index} is null/undefined`)
    })
    return false
  }
  return true
}) as (Sound | Oscillator)[]

if (this.failedLayers.length > 0) {
  this.emit('warning', {
    message: `${this.failedLayers.length} layer(s) failed to load`,
    failedLayers: this.failedLayers,
    source: this
  })
}
```

**Impact:** Resilient to loading failures. Users can listen to 'warning' event and decide whether to retry, use fallbacks, or proceed with partial layers.

### Soft Layer Limit
**Decision:** Warn at 8+ layers (configurable via `warnLayerCount`), but allow any count.

**Why:** Per CONTEXT.md: "Soft limit on layers (warn at 8+) but allow any count — helps catch mistakes." 8 is conservative mobile target, desktop can handle 100+. Warning helps developers catch accidental layer duplication bugs.

**Code:**
```typescript
const warnThreshold = opts?.warnLayerCount ?? 8
if (this.layers.length >= warnThreshold) {
  console.warn(
    `LayeredSound "${this.name}" has ${this.layers.length} layers. ` +
    `High layer counts may impact performance on some devices.`
  )
}
```

**Impact:** Developer-friendly warning without blocking advanced use cases. Production orchestral libraries might use 20+ layers intentionally.

## Implementation Notes

### TDD Approach
Followed RED-GREEN-REFACTOR cycle:
1. **RED:** Wrote 20 comprehensive tests covering construction, playback, controls, events, edge cases
2. **GREEN:** Implemented LayeredSound with minimal code to pass all tests
3. **REFACTOR:** Not needed - implementation was clean from the start

Tests verify:
- Construction with mixed Sound/Oscillator layers
- Null/undefined layer filtering and warning emission
- Soft limit warning at threshold
- Synchronized `playAt()` calls with same time value
- `stop()` stops all layers
- Master gain/pan controls
- Individual layer access via `getLayer()`
- Event emission (play, stop, end, warning)
- Fresh end tracking per play() call (reusability)
- Type-safe event methods (.on/.once/.off)

### Event System
Follows established BaseSound pattern:
- Extends EventTarget for native browser compatibility
- Typed overloads for addEventListener/removeEventListener
- Convenience methods (.on/.once/.off) for chaining
- CustomEvent with typed detail objects

Added LayeredSoundEventMap and WarningEventDetail types to `src/events/event-types.ts`.

### Factory Function
Created `createLayeredSound()` in `src/index.ts`:
- Async to ensure audioContext initialized
- Dynamic import of LayeredSound to support tree-shaking
- Type-safe parameters and return value
- Matches pattern of other factory functions (createSound, createOscillator)

## Test Coverage

20 tests, 100% pass rate:

**Construction (6 tests):**
- Creates with Sound and Oscillator layers
- Filters null/undefined gracefully
- Emits warning for failed layers
- Warns at layer count threshold
- Does not warn below threshold

**Playback Synchronization (3 tests):**
- Calls playAt on all layers with same time
- Stops all layers
- Supports multiple play() calls (reusable)

**Master Controls (2 tests):**
- setGain affects all layers
- setPan affects all layers

**Layer Access (3 tests):**
- getLayer returns correct layer by index
- getLayer returns undefined for out-of-bounds
- layerCount returns correct count

**Events (5 tests):**
- Emits play event when play() called
- Emits stop event when stop() called
- Emits end event when last layer finishes
- Emits fresh end event per play() call
- Supports .on/.once/.off methods

## Deviations from Plan

None - plan executed exactly as written.

No bugs found. No missing critical functionality. No architectural changes needed.

## Next Phase Readiness

**Phase 4 Plan 2 (BeatTrack timing improvements):**
- Can reference LayeredSound's exact sync pattern (audioContext.currentTime capture)
- Similar event tracking strategy (beat events during lookahead)

**Phase 4 Plan 3 (Crossfade utilities):**
- LayeredSound instances can be crossfaded like regular Tracks
- Master gain control enables smooth fade-in/fade-out

**Phase 5 (Effects):**
- LayeredSound can have effects added to individual layers OR to the master (future enhancement)
- Current architecture supports both approaches

## Performance Notes

**Memory:** Each layer maintains its own audio graph. 8 layers = 8 × (source + gain + pan + connections). Conservative limit based on mobile device constraints.

**CPU:** Synchronization overhead is negligible (single currentTime read, Promise.all for parallel layer.playAt()). Actual CPU usage depends on layer content (decompression, effects, etc.).

**Testing:** Verified on standardized-audio-context-mock. Real-world performance testing recommended for production use cases with high layer counts.

## Related Documentation

**Research:**
- `.planning/phases/04-composition-features/04-RESEARCH.md` - Pattern 1 (exact sync), Pattern 2 (independent end events), Pattern 6 (graceful degradation)

**Context:**
- `.planning/phases/04-composition-features/04-CONTEXT.md` - User decisions on layer behavior, timing, degradation strategy

**Codebase Patterns:**
- `src/base-sound.ts` - EventTarget extension pattern, .on/.once/.off methods
- `src/sound.ts` - Setup/cleanup, fresh source per play (reusability model)

---

**Status:** ✅ Complete
**Duration:** 9 minutes
**Commits:** e9c632a (test), 4086622 (implementation)
**Test Coverage:** 20/20 passed
**TypeScript:** ✅ No LayeredSound-specific errors (other module errors pre-existing)

# Phase 26: Source Code Fixes - Research

**Researched:** 2026-02-21
**Domain:** TypeScript/Web Audio API — bug fixes, race conditions, memory leaks, API contract violations
**Confidence:** HIGH — all findings based on direct source inspection, no ambiguous external dependencies

---

## Summary

Phase 26 closes 18 specific review findings (C-3, C-4, C-5, H-1–H-6, M-1–M-13, L-1–L-9) by fixing
bugs and inconsistencies in the library's source code. The issues fall into five buckets:

1. **Missing exports** (C-3): Five types used throughout the API are not exported from `src/index.ts`.
2. **Async correctness** (C-4, H-4, H-6): `Track.seek()` doesn't await `stop()`, `Track.resume()`
   has a broken guard, and `BeatTrack.resume()` uses stale timing.
3. **API contract violations** (C-5, H-1, H-2, H-5): `Connectable` interface has a wrong signature,
   `Sound.setup()` onended cleanup is overwritten by `playAt()`, `Track` never emits 'end', and
   `playBeats`/`playActiveBeats` are identical.
4. **Memory leaks and node lifecycle** (H-3, M-4, M-9): `Oscillator.setup()` leaks the old GainNode,
   `AudioSprite` has no `stop()` for looping sprites, and `LayeredSound` accumulates listeners.
5. **Controller/scheduling issues** (M-1, M-5, M-6, M-7, M-11, M-13): exponential ramp to 0,
   onPlaySet accumulation, missing detune/pan in controller scheduled values, `_isPlaying` set after
   'play' event, fragile response cache clone pattern.
6. **Input validation** (M-8): `mungeSoundFont` fails silently on malformed input.
7. **Low-priority polish** (L-1–L-9): listener cleanup, Playable void return, seek emit guard,
   beat flag reset, duck-typing, linear vs equal-power mix, O(n) search, sprite boundary validation,
   commented-out dead code.

**Primary recommendation:** Work issue-by-issue in severity order (C → H → M → L), keeping each fix
targeted and test-verifiable. Most fixes are small and isolated; the trickiest are the async sequencing
in `Track.seek()` and the `playBeats`/`playActiveBeats` behavioral split.

---

## Current State of Each File to Fix

### `src/index.ts` — Missing type exports

The exports block at line 714–734 exports many types but omits five that are used as public API:

- `BeatTrackOptions` — imported from `./beat-track`, not re-exported
- `SamplerOptions` — imported from `@/sampler`, not re-exported
- `TimeObject` — imported from `@utils/create-time-object`, not in export block
- `RatioType` — defined in `@controllers/base-param-controller`, not in export block
- `SeekType` — defined in `@controllers/base-param-controller`, not in export block

**Fix:** Add all five to the `export type { ... }` block at the bottom of `src/index.ts`.

### `src/track.ts` — Race condition in seek(), broken resume()

**C-4 Race condition in `seek()`** (lines 260–280):
```typescript
// CURRENT — bug: stop() is async but not awaited
if (_isPlaying) {
  this.stop()               // ← not awaited; stop() resets startOffset=0
  this.startOffset = adjustedOffset  // ← may execute BEFORE stop() finishes
  this.later(() => this.play())
}
```
`stop()` is defined as `async stop(): Promise<void>` and resets `startOffset = 0` at line 197 BEFORE
calling `super.stop()`. If `stop()` resolves after the new offset is set, it overwrites it.

**Fix:** Make `moveToOffset` async and `await this.stop()`:
```typescript
const moveToOffset = async (offset: number): Promise<void> => {
  const _isPlaying = this._isPlaying
  const adjustedOffset = withinRange(offset, 0, duration)
  if (_isPlaying) {
    await this.stop()         // await ensures startOffset=0 completes first
    this.startOffset = adjustedOffset
    this.later(() => this.play())
  } else {
    this.startOffset = adjustedOffset
  }
  // emit seek...
}
```
The return type of `seek()` should also be updated so `.as(type)` returns `Promise<void>`.

**H-4 `resume()` no-op at position 0** (line 161):
```typescript
// CURRENT — broken guard
if (!this._isPlaying && this.startOffset > 0) {
```
When a track is paused before any `requestAnimationFrame` tick updates `startOffset`, the offset is
still 0. The guard `this.startOffset > 0` prevents resume from working.

**Fix:** Track the paused state explicitly with a boolean flag:
```typescript
private _isPaused = false

public pause(): void {
  // ...existing...
  this._isPaused = true
}

public resume(): void {
  if (!this._isPlaying && this._isPaused) {
    this._isPaused = false
    // ...existing resume logic...
    this.play()
  }
}

// Reset _isPaused in stop() as well
public override async stop(): Promise<void> {
  this._isPaused = false
  // ...existing...
}
```

**H-2 Track never emits 'end' event** (line 89–92):
```typescript
// CURRENT — breaks 'end' event emission from BaseSound
protected override _onPlaybackStarted(): void {
  this.audioSourceNode.onended = () => this.stop()  // ← overwrites BaseSound's 'end' handler
  this.later(this.trackPlayPosition.bind(this))
}
```
`playAt()` in `BaseSound` sets `audioSourceNode.onended` to emit 'end' after `_onPlaybackStarted()`
is called (line 946). But `Track._onPlaybackStarted()` overwrites `onended` with a handler that calls
`stop()` (emitting 'stop', not 'end').

**Fix:** Instead of replacing `onended`, detect natural completion by differentiating it from user-
initiated stop. The cleanest approach: set a flag before calling `stop()` in the `onended` handler,
so the stop knows it's a natural end:
```typescript
private _endingNaturally = false

protected override _onPlaybackStarted(): void {
  this.audioSourceNode.onended = () => {
    if (this._isPlaying) {
      // Natural completion — emit 'end' then stop (without re-emitting 'stop')
      this._endingNaturally = true
      this.stop().then(() => {
        this._endingNaturally = false
      })
    }
  }
  this.later(this.trackPlayPosition.bind(this))
}
```
Alternatively, emit 'end' directly in the handler and then call `stop()` with a guard to avoid double
emission. The simplest approach that matches BaseSound semantics:

```typescript
protected override _onPlaybackStarted(): void {
  this.audioSourceNode.onended = () => {
    // Only handle natural completion; stop() sets _isPlaying=false before onended fires
    if (this._isPlaying) {
      this._isPlaying = false
      this.emit('end', {
        time: this.audioContext.currentTime,
        source: this,
        duration: this.duration.raw,
      })
      // Also do track cleanup (reset position)
      void this.stop()
    }
  }
  this.later(this.trackPlayPosition.bind(this))
}
```

### `src/interfaces/connectable.ts` — Wrong `update()` signature (C-5)

```typescript
// CURRENT — wrong: extra 'value: number' parameter
update: (type: ControlType, value: number) => {
  to: (value: number) => {
    as: (method: RatioType) => void
  }
}
```

`BaseSound.update()` signature (line 707) takes only `type: ControlType`:
```typescript
public update(type: ControlType): {
  to: (value: number) => { as: (method: RatioType) => void }
}
```

**Fix:** Remove the extra `value: number` parameter from the interface:
```typescript
update: (type: ControlType) => {
  to: (value: number) => {
    as: (method: RatioType) => void
  }
}
```

### `src/sound.ts` — onended overwritten by playAt() (H-1)

`Sound.setup()` sets `audioSourceNode.onended` at line 87–95 (cleanup handler). Then `playAt()` in
`BaseSound` sets `audioSourceNode.onended` again at line 946 (end-event handler). The second
assignment overwrites the first, losing the disconnect cleanup.

**Fix:** Merge both responsibilities into the `playAt()` handler in `BaseSound`. The `setup()` cleanup
in `Sound` should be removed; the `playAt()` handler should include the disconnect:

```typescript
// In BaseSound.playAt(), update the onended handler to also disconnect:
this.audioSourceNode.onended = () => {
  // Cleanup: disconnect nodes to free memory
  try {
    this.audioSourceNode.disconnect()
    this.audioSourceNode.onended = null
  } catch { /* Already disconnected */ }

  if (this._isPlaying) {
    this._isPlaying = false
    this.emit('end', { ... })
  }
}
```

Then remove the `onended` assignment from `Sound.setup()`.

### `src/oscillator.ts` — Leaks old GainNode (H-3)

```typescript
// CURRENT — old gainNode never disconnected
protected setup(): void {
  const oscillator = this.audioContext.createOscillator()
  // ...
  const gainNode = this.audioContext.createGain()
  this.gainNode = gainNode  // ← old gainNode still connected, never disconnected
  // ...
}
```

**Fix:** Disconnect the old GainNode before replacing:
```typescript
protected setup(): void {
  const oscillator = this.audioContext.createOscillator()
  // ...

  // Disconnect old gain node before replacing
  if (this.gainNode) {
    try {
      this.gainNode.disconnect()
    } catch { /* Already disconnected */ }
  }

  const gainNode = this.audioContext.createGain()
  this.gainNode = gainNode
  // ...
}
```

### `src/beat-track.ts` — playBeats/playActiveBeats identical (H-5)

Both methods (lines 165 and 196) set the same state (`currentTempo`, `noteType`, `nextBeatTime`,
`currentBeatIndex`) and call `this.scheduler()`. The scheduler always calls `beat.playInIfActive()`,
so both methods produce identical behavior.

**Fix:** The behavioral difference must be implemented at the scheduler level. Add a field to track
which mode is active:

```typescript
private _playAllBeats = false

public playBeats(bpm: number, noteType: number): void {
  // ...validation...
  this._playAllBeats = true   // ← plays ALL beats unconditionally
  this.currentTempo = bpm
  this.noteType = noteType
  this.nextBeatTime = this.audioContext.currentTime
  this.currentBeatIndex = 0
  this.scheduler()
}

public playActiveBeats(bpm: number, noteType: number): void {
  // ...validation...
  this._playAllBeats = false  // ← plays only active beats
  this.currentTempo = bpm
  this.noteType = noteType
  this.nextBeatTime = this.audioContext.currentTime
  this.currentBeatIndex = 0
  this.scheduler()
}
```

In `scheduleBeat()`, use the flag:
```typescript
private scheduleBeat(beatIndex: number, time: number): void {
  const beat = this.beats[beatIndex]
  const offset = time - this.audioContext.currentTime

  if (this._playAllBeats) {
    beat.playIn(offset)      // plays unconditionally
  } else {
    beat.playInIfActive(offset)  // respects beat.active flag
  }
  // ...emit beat event...
}
```

### `src/beat-track.ts` — resume() uses stale nextBeatTime (H-6)

```typescript
// CURRENT — restores stale pausedBeatTime from when pause() was called
public resume(): void {
  if (this.pausedBeatIndex !== null) {
    this.currentBeatIndex = this.pausedBeatIndex
    this.nextBeatTime = this.pausedBeatTime ?? this.audioContext.currentTime
    // ...
  }
}
```

`pausedBeatTime` was set at the time of `pause()`. If the user pauses for 30 seconds, `nextBeatTime`
is 30 seconds in the past. When `scheduler()` runs, `currentTime > nextBeatTime + scheduleAheadTime`
is massively true, causing hundreds of beats to fire immediately.

**Fix:** Recalculate `nextBeatTime` relative to current `audioContext.currentTime` on resume:
```typescript
public resume(): void {
  if (this.pausedBeatIndex !== null) {
    this.currentBeatIndex = this.pausedBeatIndex
    // Reset nextBeatTime to now so scheduler doesn't catch up
    this.nextBeatTime = this.audioContext.currentTime
    // ...emit resume...
    this.scheduler()
    this.pausedBeatIndex = null
    this.pausedBeatTime = null
  }
}
```

### `src/controllers/base-param-controller.ts` — Exponential ramp to 0 throws (M-1)

`exponentialRampToValueAtTime(0, time)` throws `RangeError` in the Web Audio API because
exponential ramps must approach a non-zero value (zero would require infinite time).

The common pattern `onPlaySet('gain').to(0).endingAt(2)` uses the default ramp type `'exponential'`
(see line 226) — this will throw at play time.

**Fix:** In `applyRampToParam()` and anywhere `exponentialRampToValueAtTime` is called, substitute
a safe near-zero value when the target is 0:

```typescript
protected applyRampToParam(
  param: AudioParam,
  value: number,
  time: number,
  rampType: 'exponential' | 'linear',
): void {
  if (rampType === 'exponential') {
    const safeValue = value === 0 ? 0.00001 : value  // near-zero, not zero
    param.exponentialRampToValueAtTime(safeValue, time)
  } else {
    param.linearRampToValueAtTime(value, time)
  }
}
```

The constant `0.00001` (1e-5) is inaudible and prevents RangeError. This is the standard Web Audio
API workaround documented in MDN.

### `src/sprite.ts` — No stop() for looping sprites (M-4)

```typescript
// CURRENT — source.loop = sprite.loop ?? false
// Looping sprites create a source that never ends, but there's no way to stop it
source.start(this.audioContext.currentTime, offset, duration)
```

The `AudioSprite` class has no `stop()` method. When a sprite is defined with `loop: true`, the
`AudioBufferSourceNode` loops indefinitely. The `source` node is created locally inside `play()` and
not stored anywhere, so there's no reference to call `source.stop()`.

**Fix:** Track active looping sources with a Map, and add a `stop(name)` method:
```typescript
private activeSources = new Map<string, AudioBufferSourceNode[]>()

play(name: string, options: SpritePlayOptions = {}): void {
  // ...existing setup...
  if (sprite.loop) {
    if (!this.activeSources.has(name)) {
      this.activeSources.set(name, [])
    }
    this.activeSources.get(name)!.push(source)
  }
  // ...existing start...
  source.onended = () => {
    // Remove from active sources when it ends
    const sources = this.activeSources.get(name)
    if (sources) {
      const idx = sources.indexOf(source)
      if (idx !== -1) sources.splice(idx, 1)
    }
    // ...existing cleanup...
  }
}

stop(name: string): void {
  const sources = this.activeSources.get(name) ?? []
  sources.forEach((source) => {
    try { source.stop() } catch { /* already stopped */ }
  })
  this.activeSources.delete(name)
}
```

### `src/controllers/base-param-controller.ts` — onPlaySet accumulates same-param schedules (M-5)

```typescript
// CURRENT — every call pushes to arrays, never replacing
public onPlaySet(type: ControlType): { to: ... } {
  return {
    to: (value: number) => {
      const paramValue: ParamValue = { type, value }
      this.startingValues.push(paramValue)  // ← accumulates
      // ...
    }
  }
}
```

If a user calls `sound.onPlaySet('gain').to(0)` twice before play, both are applied, creating
conflicting schedules. The expected behavior is that the last call for a given parameter replaces
earlier ones.

**Fix:** Before pushing, remove any existing entry for the same `type` from all scheduling arrays:
```typescript
public onPlaySet(type: ControlType): { to: ... } {
  return {
    to: (value: number) => {
      // Remove existing schedules for this parameter type
      this.startingValues = this.startingValues.filter(v => v.type !== type)
      this.valuesAtTime = this.valuesAtTime.filter(v => v.type !== type)
      this.exponentialValues = this.exponentialValues.filter(v => v.type !== type)
      this.linearValues = this.linearValues.filter(v => v.type !== type)

      const paramValue: ParamValue = { type, value }
      this.startingValues.push(paramValue)
      return {
        at: (time: number) => {
          this.removeStartingValue(paramValue)
          this.valuesAtTime.push({ ...paramValue, time })
        },
        endingAt: (time: number, rampType: RampType = 'exponential') => {
          this.removeStartingValue(paramValue)
          this.addRampValue({ ...paramValue, time }, rampType)
        },
      }
    },
  }
}
```

**Note:** `onPlayRamp` internally calls `onPlaySet` twice (start + end values), so the dedup
must allow the ramp pair to coexist. The dedup at the start of `to()` should filter before
pushing the new value, which means the ramp pair that calls `onPlaySet` twice will naturally
replace any earlier single `onPlaySet` call for that type, and the second `onPlaySet` in the
ramp pair will replace the first. This means `onPlayRamp` is effectively "last ramp wins."
That is correct behavior.

### `src/controllers/oscillator-controller.ts` and `src/controllers/sound-controller.ts` — Missing detune/pan in scheduled values (M-6, M-7)

**OscillatorController** (M-6): `applyValues` and `applyRampValues` switch only on `'frequency'` and
`'gain'`, throwing for `'detune'` and `'pan'`. But `update()` in `BaseParamController` supports all
four types via the gain/panner nodes. `onPlaySet('detune')` and `onPlaySet('pan')` should work.

**Fix for OscillatorController:**
```typescript
private applyValues(values: ParamValue[], currentTime: number): void {
  const { oscillator, gainNode, pannerNode } = this
  values.forEach((item) => {
    switch (item.type) {
      case 'frequency':
        oscillator.frequency.setValueAtTime(item.value, currentTime)
        break
      case 'gain':
        gainNode.gain.setValueAtTime(item.value, currentTime)
        break
      case 'detune':
        oscillator.detune.setValueAtTime(item.value, currentTime)
        break
      case 'pan':
        pannerNode.pan.setValueAtTime(item.value, currentTime)
        break
      default:
        throw new Error(`Unsupported control type: '${item.type}'.`)
    }
  })
}
// Same additions needed in applyRampValues
```

**SoundController** (M-7): `applyValues` and `applyRampValues` switch only on `'detune'` and
`'gain'`, throwing for `'pan'`. Add `'pan'` case using `pannerNode.pan`.

### `src/utils/decode-base64.ts` — mungeSoundFont fails silently (M-8)

```typescript
// CURRENT — if soundfont is not in expected format, indexOf returns -1,
// begin/end calculations produce garbage, JSON.parse throws SyntaxError with no context
export function mungeSoundFont(soundfont: string): string[] {
  const begin = soundfont.indexOf('=', soundfont.indexOf('MIDI.Soundfont.')) + 2
  const end = soundfont.lastIndexOf('"') + 1
  const string = `${soundfont.slice(begin, end)}}`
    // ...
  return JSON.parse(string)
}
```

**Fix:** Validate that the expected markers are present before slicing:
```typescript
export function mungeSoundFont(soundfont: string): string[] {
  if (typeof soundfont !== 'string' || soundfont.length === 0) {
    throw new Error('mungeSoundFont: input must be a non-empty string')
  }

  const markerIndex = soundfont.indexOf('MIDI.Soundfont.')
  if (markerIndex === -1) {
    throw new Error(
      'mungeSoundFont: input does not appear to be a valid MIDI.js soundfont. '
      + 'Expected to find "MIDI.Soundfont." in the string.'
    )
  }

  const equalIndex = soundfont.indexOf('=', markerIndex)
  if (equalIndex === -1) {
    throw new Error('mungeSoundFont: malformed soundfont — missing "=" assignment after MIDI.Soundfont.')
  }

  const begin = equalIndex + 2
  const end = soundfont.lastIndexOf('"') + 1

  if (end <= begin) {
    throw new Error('mungeSoundFont: malformed soundfont — could not locate note data boundaries')
  }

  const string = `${soundfont.slice(begin, end)}}`
    .replace(/data:audio\/mp3;base64,/g, '')
    .replace(/data:audio\/mpeg;base64,/g, '')
    .replace(/data:audio\/ogg;base64,/g, '')

  try {
    return JSON.parse(string)
  } catch {
    throw new Error(
      'mungeSoundFont: failed to parse soundfont JSON. The soundfont may be corrupted or in an unsupported format.'
    )
  }
}
```

### `src/layered-sound.ts` — setupLayerEndTracking leaks listeners (M-9)

```typescript
// CURRENT — each play() call adds new 'end' listeners to each layer
// Old listeners from previous plays are still attached and fire spurious 'end' events
private setupLayerEndTracking(): void {
  const endedLayers = new Set<Sound | Oscillator>()
  this.layers.forEach((layer) => {
    layer.once('end', () => handleEnd(layer))  // 'once' only removes itself on first fire
    // But if play() is called again before old play ends, multiple listeners exist
  })
}
```

**Fix:** Remove all previous 'end' listeners before adding new ones. Keep references to the handlers:

```typescript
private layerEndHandlers: Map<Sound | Oscillator, () => void> = new Map()

private setupLayerEndTracking(): void {
  const endedLayers = new Set<Sound | Oscillator>()

  // Remove old listeners first
  this.layerEndHandlers.forEach((handler, layer) => {
    layer.off('end', handler)
  })
  this.layerEndHandlers.clear()

  const handleEnd = (layer: Sound | Oscillator): void => {
    endedLayers.add(layer)
    this.layerEndHandlers.delete(layer)
    if (endedLayers.size === this.layers.length) {
      // ...emit 'end'...
    }
  }

  this.layers.forEach((layer) => {
    const handler = (): void => handleEnd(layer)
    this.layerEndHandlers.set(layer, handler)
    layer.once('end', handler)
  })
}
```

### `src/base-sound.ts` — `_isPlaying` set after 'play' event (M-11)

```typescript
// CURRENT in playAt() (lines 931-978)
this.emit('play', { ... })     // ← emitted when _isPlaying is still false
// ...
this.audioSourceNode.start(...)
// ...
if (time <= currentTime) {
  this._isPlaying = true        // ← set AFTER emit
}
```

**Fix:** Set `_isPlaying = true` before emitting 'play'. For the scheduled-future case
(`time > currentTime`), the existing setTimeout approach is correct since it starts false
and becomes true when playback actually begins. For the immediate case, set it before emit:

```typescript
// Set _isPlaying before emitting 'play' so listeners see correct state
if (time <= currentTime) {
  this._isPlaying = true
}
// else: setTimeout already schedules the true transition

this.emit('play', { time: currentTime, source: this })
```

### `src/preload.ts` / `src/index.ts` — Response cache clone pattern (M-13)

The current cache stores the raw `Response` object. A `Response` body can only be consumed once.
The code correctly clones on read (`responseCache.get(url)!.clone()`), but `preload.ts` stores the
original unconsumed response:

```typescript
// preload.ts line 41
responseCache.set(result.value.url, result.value.response)
// ← stores unread response; fine, but fragile if someone calls .arrayBuffer() on it directly
```

In `index.ts` load function (line 554), the pattern is:
```typescript
responseCache.set(src, response)           // store original (not yet consumed)
buffer = await audioContext.decodeAudioData(await response.clone().arrayBuffer())  // consume clone
```

This is actually safe — storing the original unconsumed response and always cloning on read.

**Fix:** Add a safety comment and optionally store a clone explicitly to make the pattern
self-documenting and guard against any future code that might consume the stored response:

```typescript
// Store a clone so the cached response can be consumed multiple times
// Response.body can only be read once; always store fresh/unconsumed
responseCache.set(src, response.clone())
// Use the original for the immediate decode
buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
```

Apply this pattern consistently in both `preload.ts` and `index.ts`.

### Low-Priority Issues (L-1 through L-9)

**L-1: preventEventDefaults/useInteractionMethods leak listeners**
Currently returns `void`. Return a cleanup function that removes the added listeners.

**L-2: Playable interface methods return void instead of Promise<void>**
`play()` and `stop()` on `BaseSound` return `Promise<void>`. The `Playable` interface should match.

**L-3: Track.seek() emits 'seek' event even when position unchanged**
Add a guard: only emit if `adjustedOffset !== previousPosition`.

**L-4: Beat.playIn() doesn't schedule reset of isPlaying/currentTimeIsPlaying**
Flags are set in `playIn()` but reset scheduling may be missing. Verify and add timeout-based reset
if needed (matching the `duration` property on Beat).

**L-5: playTogether uses `(p as any).audioContext` duck-typing**
Add an interface or type guard instead of `as any`.

**L-6: GainEffect uses linear interpolation vs equal-power for mix**
Low-risk audio quality issue. Use equal-power crossfade formula for wet/dry mix if changing.

**L-7: Font.getNote is O(n) linear search**
Replace array find with Map lookup for O(1).

**L-8: AudioSprite doesn't validate sprite boundaries**
In `play()`, validate that `sprite.start >= 0` and `sprite.end <= buffer.duration`.

**L-9: prop-access.ts has 80 lines of commented-out code**
Delete the commented-out code.

---

## Architecture Patterns

### Pattern 1: Async Correctness for Sequential Audio Operations

When operations must be ordered (stop then seek), use `await`:
```typescript
// WRONG — race condition
this.stop()
this.startOffset = newOffset

// CORRECT
await this.stop()
this.startOffset = newOffset
```

### Pattern 2: Web Audio API Exponential Ramp Constraint

`exponentialRampToValueAtTime` requires value > 0 (strictly). The standard workaround:
```typescript
const NEAR_ZERO = 0.00001  // 1e-5, inaudible
const safeValue = value === 0 ? NEAR_ZERO : value
param.exponentialRampToValueAtTime(safeValue, time)
```

### Pattern 3: AudioNode Lifecycle — Disconnect Before Replace

Any time a node is replaced, disconnect the old one first:
```typescript
// Pattern for node replacement
if (this.gainNode) {
  try { this.gainNode.disconnect() } catch { /* Already disconnected */ }
}
this.gainNode = this.audioContext.createGain()
```

### Pattern 4: Response Clone Pattern for Cacheable Fetch

Store a clone so the cached response is always unconsumed:
```typescript
responseCache.set(url, response.clone())  // store fresh clone
const buffer = await ctx.decodeAudioData(await response.arrayBuffer())  // consume original
```
On cache read, always clone again:
```typescript
const res = responseCache.get(url)!.clone()
const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
```

### Pattern 5: BeatTrack Resume — Reset nextBeatTime to Now

After a pause of unknown duration, never restore the old scheduled time. Reset to `currentTime`:
```typescript
this.nextBeatTime = this.audioContext.currentTime  // not the stale pausedBeatTime
```

### Anti-Patterns to Avoid

- **Setting `_isPlaying` after emitting 'play':** Listeners see `isPlaying === false` during their handler. Set before emitting.
- **Accumulating onPlaySet schedules without deduplication:** Leads to conflicting AudioParam automation curves.
- **Overwriting `onended` in a subclass hook:** Destroys the parent class's 'end' event emission.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential ramp to zero | Custom ramp calculation | Near-zero constant (1e-5) | Web Audio API constraint; 1e-5 is standard workaround |
| Beat scheduler catch-up | Complex beat accounting | Reset nextBeatTime to currentTime | Scheduler is lookahead-based; resetting is all that's needed |
| Listener deduplication | Custom event emitter | Remove-before-add pattern | EventTarget `once()` handles removal, but only on first fire |

---

## Common Pitfalls

### Pitfall 1: Track.stop() Resets startOffset Before Async Resolves

**What goes wrong:** `stop()` has `this.startOffset = 0` on line 197, BEFORE the async portion.
This means even if you try to capture `startOffset` before calling `stop()`, the async resolution
sequence can still overwrite any offset you set afterward unless you `await stop()` first.

**How to avoid:** Always `await this.stop()` before setting `startOffset`.

### Pitfall 2: onended Handler Assigned Multiple Times

**What goes wrong:** `Sound.setup()` sets `onended` for cleanup. `BaseSound.playAt()` then sets
`onended` again for the 'end' event. The last assignment wins, destroying the earlier one.
This means cleanup from `setup()` is silently lost.

**How to avoid:** Only one place should own `onended`. Consolidate in `playAt()`.

### Pitfall 3: Track._onPlaybackStarted Overwrites playAt's onended

`playAt()` sets `audioSourceNode.onended` (line 946), then calls `_onPlaybackStarted()` (line 978).
Track's `_onPlaybackStarted()` re-assigns `onended` (line 90), winning the race. Any fix to H-1 in
`playAt()` must account for Track overwriting it again unless Track's override is also fixed.

**The ordering in playAt():**
1. `this.setup()` — Sound.setup() sets onended (cleanup)
2. `this.audioSourceNode.onended = ...` — BaseSound sets onended (end event + cleanup merged)
3. `this._onPlaybackStarted()` — Track OVERWRITES onended again (calls stop(), no end event)

**Solution:** Both H-1 and H-2 must be fixed together. Merge cleanup into BaseSound's `playAt()`
onended handler, and fix Track's `_onPlaybackStarted()` to not overwrite it.

### Pitfall 4: BeatTrack pausedBeatTime Is Wall-Clock Stale

`pausedBeatTime` stores `this.nextBeatTime` at pause-time. `nextBeatTime` is an AudioContext time
value (typically seconds since AudioContext creation, 0-based). After resuming, if `nextBeatTime`
is in the past, the `while (nextBeatTime < currentTime + scheduleAheadTime)` loop fires many times.

---

## Code Examples

### Verified: exponentialRampToValueAtTime Constraint (MDN)

```typescript
// Safe near-zero substitution — standard Web Audio workaround
// MDN: "The parameter value cannot change sign during an exponential ramp"
// And: exponentialRampToValueAtTime(0) throws RangeError
const SAFE_NEAR_ZERO = 0.00001
param.exponentialRampToValueAtTime(value === 0 ? SAFE_NEAR_ZERO : value, time)
```
Source: Direct code inspection + Web Audio API spec (exponential ramps are undefined at 0).

### Verified: AudioBufferSourceNode Single-Use Pattern

```typescript
// AudioBufferSourceNode is single-use — must create new one for each play()
// This is the established pattern in Sound.setup()
const newSource = this.audioContext.createBufferSource()
newSource.buffer = this.audioBuffer
// OLD: this.audioSourceNode.disconnect() — cleanup old
// NEW: connect new
this.audioSourceNode = newSource
```

### Verified: Connectable Interface — Correct Signature

```typescript
// WRONG (current)
update: (type: ControlType, value: number) => { ... }

// CORRECT — matches BaseSound.update() implementation
update: (type: ControlType) => {
  to: (value: number) => {
    as: (method: RatioType) => void
  }
}
```

---

## Open Questions

1. **Track 'end' event — should stop() still fire after natural completion?**
   - What we know: Currently only 'stop' fires. Users likely expect 'end' for natural completion.
   - What's unclear: When natural end triggers stop(), should both 'end' AND 'stop' fire, or only 'end'?
   - Recommendation: Emit 'end' only (not 'stop') for natural completion, matching Sound behavior.
     The 'stop' event should only fire when explicitly stopped by the user.

2. **onPlaySet deduplication scope: per type or per type+time?**
   - What we know: The issue says "same parameter" — a second `.onPlaySet('gain').to(X)` replaces the first.
   - What's unclear: If a user sets `.onPlaySet('gain').to(0).at(0)` AND `.onPlaySet('gain').to(1).endingAt(1)`,
     should the dedup remove the first? These are two different time points for the same parameter,
     forming an intentional ramp pair.
   - Recommendation: Deduplicate only if `type` AND `time` match — not just `type`. This preserves
     multi-point automation while preventing true duplicates. However, `onPlayRamp` already uses
     `onPlaySet` twice internally — so dedup-by-type would break ramp pairs.
   - **Better approach:** Track a "ramp pair" flag to distinguish user-intent from ramp internals.
     Simplest: dedup only `startingValues` (the initial set), not `valuesAtTime`/ramp arrays.

3. **Response cache: store clone or original?**
   - Current code stores original and clones on read — this is safe but subtle.
   - Storing a clone and consuming the original on first use is slightly clearer.
   - Either approach works; just needs to be consistent across `preload.ts` and `index.ts`.

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `src/track.ts`, `src/sound.ts`, `src/oscillator.ts`, `src/beat-track.ts`
- Direct source inspection: `src/base-sound.ts`, `src/interfaces/connectable.ts`, `src/preload.ts`
- Direct source inspection: `src/controllers/base-param-controller.ts`, `src/controllers/oscillator-controller.ts`, `src/controllers/sound-controller.ts`
- Direct source inspection: `src/sprite.ts`, `src/layered-sound.ts`, `src/utils/decode-base64.ts`
- Direct source inspection: `src/index.ts` (export block, load function, response cache usage)
- `.planning/REVIEW-FINDINGS.md` — code review findings (C-3, C-4, C-5, H-1–H-6, M-1–M-13, L-1–L-9)

### Secondary (MEDIUM confidence)
- Web Audio API specification: `exponentialRampToValueAtTime` requires non-zero value — confirmed by MDN and standard practice
- Pattern of `AudioBufferSourceNode` single-use lifecycle — confirmed by existing code comments in codebase

---

## Metadata

**Confidence breakdown:**
- Missing exports (C-3): HIGH — trivially verified by inspecting export block
- Race condition (C-4): HIGH — async flow traced through track.ts:260-280 and stop():197
- Interface mismatch (C-5): HIGH — signatures directly compared
- onended overwrite (H-1, H-2): HIGH — execution order traced through playAt() + _onPlaybackStarted()
- GainNode leak (H-3): HIGH — setup() inspected, old gainNode disconnect absent
- resume() guard (H-4): HIGH — condition `startOffset > 0` verified as too restrictive
- playBeats/playActiveBeats (H-5): HIGH — both methods are literally identical
- BeatTrack resume timing (H-6): HIGH — stale nextBeatTime confirmed
- Exponential ramp to 0 (M-1): HIGH — Web Audio API constraint, confirmed by spec
- AudioSprite stop() (M-4): HIGH — no stop() method exists, looping sprites have no stop path
- onPlaySet accumulation (M-5): HIGH — push without dedup confirmed in base-param-controller.ts:220
- Controller missing params (M-6, M-7): HIGH — switch statements inspected, missing cases confirmed
- mungeSoundFont validation (M-8): HIGH — no input validation exists, indexOf(-1)+2=1 on failure
- LayeredSound listener leak (M-9): HIGH — setupLayerEndTracking adds listeners every play() call
- _isPlaying ordering (M-11): HIGH — emit at line 932, _isPlaying=true at line 969
- Response cache (M-13): MEDIUM — current pattern is safe but subtly depends on not consuming stored response
- L-1 through L-9: MEDIUM — identified from review; most are straightforward

**Research date:** 2026-02-21
**Valid until:** Stable — fixes are against internal implementation, not external dependencies

# Core Sound System Review

**Reviewer:** Code Review Agent (Claude Opus 4.6)
**Date:** 2026-02-20
**Scope:** Core sound classes, AudioContext lifecycle, memory management, edge cases
**Files reviewed:** 13 source files (index.ts, audio-context.ts, base-sound.ts, sound.ts, track.ts, oscillator.ts, sampler.ts, sampled-note.ts, musical-identity.ts, note.ts, envelope.ts, connectable.ts, playable.ts) plus 4 supporting files (controllers, preload, utils)

---

## Summary

Overall code quality is strong. The architecture is clean, the fluent API is well-designed, and the class hierarchy is logical. Documentation is thorough. I found 2 critical issues, 5 high-severity issues, 8 medium-severity issues, and 5 low-severity issues.

---

## [CRITICAL] Track.seek() race condition with async stop/play cycle

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/track.ts:260-280`
**Category:** Race Condition

**Description:** When seeking while playing, `moveToOffset` calls `this.stop()` (which is async and returns a Promise) but does not await it. It then immediately sets `startOffset` and calls `this.later(() => this.play())`. Since `stop()` is async (calls `audioContext.resume()` internally via `stopAt`), the `play()` call may race with the still-in-progress `stop()`. The `stop()` override on Track also resets `startOffset = 0` at line 197, which could overwrite the seek offset if the async stop resolves after `startOffset` is set to the new value.

```typescript
// Current code (simplified):
if (_isPlaying) {
  this.stop()              // async, not awaited, resets startOffset=0
  this.startOffset = adjustedOffset  // may be overwritten by stop()
  this.later(() => this.play())
}
```

**Suggestion:** Either (a) await `stop()` before setting the new offset (requires making the callback async), or (b) bypass the Track-level `stop()` and directly stop the source node without resetting `startOffset`, similar to what `pause()` does:

```typescript
if (_isPlaying) {
  // Stop without resetting offset (like pause does)
  if (this.rafId !== null) {
    cancelAnimationFrame(this.rafId)
    this.rafId = null
  }
  const node = this.audioSourceNode
  node.onended = function () {}
  node.stop()
  this._isPlaying = false
  this.startOffset = adjustedOffset
  this.later(() => this.play())
}
```

---

## [CRITICAL] Connectable interface signature mismatch with BaseSound

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/interfaces/connectable.ts:13`
**Category:** Bug / API Design

**Description:** The `Connectable` interface declares `update` with an extra `value` parameter that does not match the actual `BaseSound.update()` signature:

```typescript
// connectable.ts
update: (type: ControlType, value: number) => { to: ... }

// base-sound.ts (actual implementation)
public update(type: ControlType): { to: ... }
```

The interface has an extra `value: number` parameter. This means `BaseSound` does not actually satisfy the `Connectable` interface contract, even though it declares `implements Connectable`. TypeScript may not catch this if the class satisfies the interface structurally via other means, but any code using the `Connectable` type to call `update(type, value)` would get unexpected behavior.

**Suggestion:** Fix the `Connectable` interface to match the actual implementation:

```typescript
update: (type: ControlType) => {
  to: (value: number) => {
    as: (method: RatioType) => void
  }
}
```

---

## [HIGH] Sound.setup() onended handler overwritten by BaseSound.playAt()

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/sound.ts:87-95` and `/Users/seth/Documents/GitHub/ez-audio/src/base-sound.ts:946-959`
**Category:** Bug

**Description:** In `Sound.setup()` (line 87), an `onended` cleanup handler is attached to the new `audioSourceNode` to disconnect it after playback. However, `setup()` is called from within `playAt()` at line 929, and then `playAt()` immediately overwrites `onended` at line 946 with its own handler that emits the 'end' event. The cleanup handler from `setup()` is never executed, so the old AudioBufferSourceNode may not get properly disconnected after natural playback completion.

The `onended` set in `playAt` does set `_isPlaying = false` and emits 'end', but it never disconnects the source node.

**Suggestion:** Merge the cleanup logic into the `playAt()` onended handler, or have the `playAt()` handler call disconnect after emitting the event:

```typescript
this.audioSourceNode.onended = () => {
  if (this._isPlaying) {
    this._isPlaying = false
    this.emit('end', { ... })
  }
  // Cleanup: disconnect source node to free memory
  try {
    this.audioSourceNode.disconnect()
    this.audioSourceNode.onended = null
  } catch { /* already disconnected */ }
}
```

---

## [HIGH] Track._onPlaybackStarted() overrides BaseSound onended, breaking 'end' event

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/track.ts:89-92`
**Category:** Bug

**Description:** `Track._onPlaybackStarted()` sets `this.audioSourceNode.onended = () => this.stop()`. This completely replaces the `onended` handler that `BaseSound.playAt()` just set at line 946, which is responsible for emitting the 'end' event. As a result, Track never emits an 'end' event on natural playback completion -- it only emits 'stop' (because `stop()` emits 'stop').

Additionally, `_onPlaybackStarted()` is called at line 978 of `playAt()`, which is *after* the `onended` handler is set at line 946. So the Track override always wins.

For Track specifically, calling `stop()` when playback naturally ends may be the intended behavior (since `stop()` resets position), but consumers listening for the 'end' event to distinguish natural completion from manual stop will never receive it.

**Suggestion:** Either (a) have Track's onended emit 'end' before calling stop, or (b) document clearly that Track only emits 'stop' on natural completion, or (c) add a flag in `stop()` to distinguish natural vs manual stops and emit the appropriate event.

---

## [HIGH] Response cache stores consumed Response bodies

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/index.ts:530-534` and `/Users/seth/Documents/GitHub/ez-audio/src/preload.ts:7`
**Category:** Bug / Edge Case

**Description:** The `load()` function in `index.ts` caches a `Response` object in `responseCache` at line 554, then clones it at line 560 to decode. When a subsequent call hits the cache at line 531, it clones the cached response. However, the original `Response` body is consumed by `response.clone().arrayBuffer()` at line 560 -- the *original* response's body stream is now used. On the *next* cache hit, `responseCache.get(src)!.clone()` will attempt to clone a Response whose body has already been read, which throws a `TypeError: body used already` in some browsers.

Looking more carefully: `response.clone()` creates a copy, and `arrayBuffer()` is called on the clone. The original `response` in the cache should remain unconsumed. However, calling `.clone()` on a Response requires the body to not be "disturbed" -- and the original Response body *is* consumed when `clone()` is called and the original read starts. Actually, `.clone()` is called first, creating two independent streams, so the original should remain readable. This is browser-specific behavior that may vary. The `preload.ts` approach (storing the response before consuming) is consistent.

On second analysis, the pattern `response.clone().arrayBuffer()` reads from the clone, not the original. But `response` is stored in cache *before* the clone happens. The `clone()` method should work as long as the response body hasn't been consumed yet, and since `clone()` is called before any read, this should be safe. **However**, if `response.clone()` is called and then the clone is read, some browsers may mark the original as "disturbed" (body stream locked). A safer pattern would be to always clone before reading and store the clone.

**Revised assessment:** The pattern works in practice in modern browsers, but the `createSprite` function at line 452 uses a different pattern (`response.clone().arrayBuffer()`) while the first fetch path at line 442 uses `res.clone()` from cache -- these are inconsistent and the cache-hit path at 441-442 clones the cached response, which after the first `response.clone()` on the initial store, may have issues.

**Suggestion:** Standardize caching by always storing a cloned response and reading from another clone:

```typescript
const response = await fetch(src)
responseCache.set(src, response.clone())
buffer = await response.arrayBuffer()
```

This ensures the cached Response is never consumed.

---

## [HIGH] Oscillator creates new GainNode on each play() but BaseSound still references the old one

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/oscillator.ts:238-239`
**Category:** Bug

**Description:** In `Oscillator.setup()`, a new `GainNode` is created and assigned to `this.gainNode` (line 239). However, `BaseSound` uses `this.gainNode` in `wireEffectChain()` and also exposes it via `getGainNode()`. The `rewireEffects()` call at line 253 correctly uses the new gainNode since it references `this.gainNode`. But any external code that previously called `getGainNode()` and cached the reference now holds a stale, disconnected GainNode.

More importantly, `changeGainTo()` and `update('gain')` methods on BaseSound use the controller, which does get the updated gainNode. But the `stopAt()` anti-click fade-out at line 368 directly accesses `this.gainNode.gain`, which is the *new* node -- this is correct.

The issue is that the old GainNode is never explicitly disconnected. When `setup()` is called, `wireEffectChain()` calls `safeDisconnect(gainNode)` on the *old* gainNode (before it's replaced). Actually, looking at the order: `this.gainNode = gainNode` happens at line 239, then `wireConnections()` at line 251, then `rewireEffects()` at line 253. The `wireEffectChain()` inside `rewireEffects()` disconnects `this.gainNode` -- which is already the *new* one. The old GainNode is never disconnected.

**Suggestion:** Disconnect the old GainNode before replacing it:

```typescript
protected setup(): void {
  const oscillator = this.audioContext.createOscillator()
  // ...

  // Disconnect old gain node before creating new one
  try { this.gainNode.disconnect() } catch { /* ignore */ }

  const gainNode = this.audioContext.createGain()
  this.gainNode = gainNode
  // ...
}
```

---

## [HIGH] Track.resume() does nothing if paused at position 0

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/track.ts:161`
**Category:** Edge Case

**Description:** The `resume()` method has the guard `!this._isPlaying && this.startOffset > 0`. If a user calls `play()`, then immediately calls `pause()` before `startOffset` has been updated by `trackPlayPosition` (which runs on the next animation frame), `startOffset` will still be 0. Calling `resume()` after this will be a no-op because `startOffset > 0` is false.

This is a real scenario: `play()` -> `pause()` (within the same frame) -> `resume()` does nothing.

**Suggestion:** Change the guard condition to track a "was paused" state rather than relying on `startOffset > 0`:

```typescript
private _isPaused = false

public pause(): void {
  // ... existing logic ...
  this._isPaused = true
}

public resume(): void {
  if (!this._isPlaying && this._isPaused) {
    this._isPaused = false
    // ... existing logic ...
  }
}
```

---

## [MEDIUM] createNotes() does not parse note identifiers from frequency map keys

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/index.ts:140-153`
**Category:** Bug

**Description:** `createNotes()` creates `Note` objects and sets `frequency` on each, but the `Note` constructor at `/Users/seth/Documents/GitHub/ez-audio/src/note.ts:31-43` initializes defaults (letter='A', accidental='', octave='0') *before* the frequency setter runs. The frequency setter in `MusicallyAware` at line 134-141 iterates the frequency map and calls `this.identifier = key` when it finds a match, which correctly parses letter/accidental/octave. So this actually works -- but it iterates the entire frequency map for every note. For 88+ piano keys, that is O(n^2) total work.

More importantly, if a custom frequency map has a frequency that does not exist in the *default* `frequencyMap`, the frequency setter will silently fail to set the identifier, leaving the Note with letter='A', octave='0', and a frequency getter that returns the frequency of 'A0' (not the custom frequency). The setter sets `this.identifier` which sets letter/accidental/octave, but the getter returns `frequencyMap[identifier]`, not a stored value. So custom frequencies are quietly lost.

**Suggestion:** The `createNotes()` function should set the identifier (key) instead of frequency, since the keys are what contain the musical identity:

```typescript
for (const key in json) {
  const noteObject = new Note()
  noteObject.identifier = key as AcceptableNote
  notes.push(noteObject)
}
```

---

## [MEDIUM] playAt() sets _isPlaying = true after emitting 'play' event

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/base-sound.ts:932-969`
**Category:** Edge Case

**Description:** The 'play' event is emitted at line 932, but `_isPlaying` is only set to `true` at line 969 (when `time <= currentTime`). If an event listener checks `sound.isPlaying` in their 'play' handler, it will be `false`:

```typescript
sound.on('play', () => {
  console.log(sound.isPlaying) // false! play event fired but isPlaying is false
})
```

**Suggestion:** Set `_isPlaying = true` before emitting the 'play' event when playing immediately:

```typescript
if (time <= currentTime) {
  this._isPlaying = true
}

this.emit('play', { time: currentTime, source: this })
```

---

## [MEDIUM] playFor() does not account for startOffset

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/base-sound.ts:867-870`
**Category:** Edge Case

**Description:** `playFor(duration)` calls `playAt(currentTime)` then schedules `stop()` after `duration * 1000` ms. But `playAt` starts playback from `this.startOffset`. If `startOffset` is nonzero (e.g., after a Track seek), the actual playback duration from the source's perspective would be shorter than `duration` if it hits the end of the buffer. This is more of a design consideration than a bug, but it means `playFor(5)` on a Track seeked to 2 seconds before the end will schedule a stop 5 seconds later, long after playback has naturally ended.

**Suggestion:** Document this behavior or clamp the stop timeout to the remaining duration.

---

## [MEDIUM] exponentialRampToValueAtTime with value of 0 throws

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/controllers/base-param-controller.ts:315`
**Category:** Edge Case / Error Handling

**Description:** The Web Audio API's `exponentialRampToValueAtTime()` throws a `RangeError` if the target value is 0 (or negative), because exponential ramps cannot reach zero. If a user calls `sound.onPlayRamp('gain', 'exponential').from(1).to(0).in(2)`, the ramp will fail at runtime.

The default ramp type for `onPlaySet().to().endingAt()` is 'exponential' (line 226 of base-param-controller.ts), which means a common pattern like `sound.onPlaySet('gain').to(0).endingAt(2)` will fail.

**Suggestion:** Either (a) substitute a very small value (e.g., 0.0001) when the target is 0 and ramp type is exponential, or (b) automatically switch to linear ramp when target is 0, or (c) document this limitation and validate the input:

```typescript
protected applyRampToParam(param, value, time, rampType) {
  if (rampType === 'exponential' && value <= 0) {
    // Exponential ramps cannot reach 0; use a near-zero value
    value = 0.0001
  }
  // ... existing logic
}
```

---

## [MEDIUM] Oscillator pan not preserved across play() calls

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/oscillator.ts:230-255`
**Category:** Bug

**Description:** `Oscillator.setup()` creates a new GainNode (line 238) and calls `controller.updateGainNode()` which preserves the gain value. However, it does *not* create a new `StereoPannerNode` or call `controller.updatePannerNode()`. The panner node is preserved across plays, which is correct. But the new GainNode needs to connect to the existing pannerNode, which happens via `rewireEffects()`.

Actually, the issue is subtler: the effect chain connects `effectChainInput -> [effects] -> gainNode -> pannerNode -> destination`. Since `gainNode` is replaced but `pannerNode` is not, and `wireEffectChain()` reconnects everything using the current `this.gainNode` and `this.pannerNode`, this should work correctly.

On further review, this is actually fine. Removing this finding.

---

## [MEDIUM] No validation on Oscillator filter frequency or Q values

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/oscillator.ts:171-180`
**Category:** Error Handling

**Description:** Filter options accept any number for `frequency` and `q`, with no validation. Negative frequencies, NaN, or Infinity would be silently passed to `setValueAtTime()`. While the Web Audio API may clamp or throw, the error messages would be opaque browser errors rather than helpful library errors.

**Suggestion:** Add validation for filter options:

```typescript
if (vals.frequency !== undefined && (vals.frequency < 0 || !Number.isFinite(vals.frequency))) {
  throw new Error(`Filter frequency must be a finite positive number. Received: ${vals.frequency}`)
}
if (vals.q !== undefined && !Number.isFinite(vals.q)) {
  throw new Error(`Filter Q must be a finite number. Received: ${vals.q}`)
}
```

---

## [MEDIUM] createSounds() progress counter is not ordered

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/index.ts:241-256`
**Category:** Edge Case

**Description:** `createSounds()` fires all fetch requests in parallel via `Promise.all`. The `loaded` counter is incremented as each resolves, but the order of resolution is nondeterministic. The `onProgress` callback may report `loaded=2` for 'click.mp3' before `loaded=1` for 'whoosh.mp3' depending on network timing. The progress counter itself is correct (incremented atomically in single-threaded JS), but the URL reported with each count may not match the sequential expectation.

**Suggestion:** This is acceptable behavior for parallel loading, but the JSDoc should note that progress callbacks fire in completion order, not URL order.

---

## [MEDIUM] unlockAudioContext registers event listeners that may never be cleaned up

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/audio-context.ts:51-69`
**Category:** Memory Leak

**Description:** `unlockAudioContext()` registers event listeners on `document.body` for touch/mouse/keyboard events. These listeners call `audioContext.resume()` and then `clean()` to remove themselves. However, if `audioContext.resume()` at line 68 succeeds (context goes to 'running'), the event listeners are still registered because `clean()` is only called inside the `unlock` function when a user gesture triggers it. The initial `await audioContext.resume()` at line 68 resolves but never calls `clean()`.

So if the context is suspended, the function: (1) registers event listeners, (2) calls `resume()` directly. If `resume()` succeeds without a gesture (e.g., Chrome desktop), the listeners remain on `document.body` forever. They are lightweight (just calling resume on an already-running context), but it is a minor leak.

**Suggestion:** Check the state after the initial `resume()` and clean up if it succeeded:

```typescript
await audioContext.resume()
if (audioContext.state === 'running') {
  clean()
}
```

---

## [MEDIUM] Sampler gain/pan properties are not applied via controller

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/sampler.ts:49-55`
**Category:** API Design

**Description:** `Sampler` has public `gain` and `pan` properties (simple numbers), but these are applied to the underlying Sound via `changeGainTo()`/`changePanTo()` only at play time in `setGainAndPan()`. If a consumer changes `sampler.gain = 0.5` between plays, it works. But `sampler.gain` returns the raw property value, not the actual gain of the last-played sound. There is also no event or validation -- setting `sampler.gain = -1` would silently propagate and throw from `changeGainTo()` only at play time.

**Suggestion:** Add a setter with validation, or validate in `setGainAndPan()`:

```typescript
private _gain = 1
get gain(): number { return this._gain }
set gain(value: number) {
  if (value < 0) throw new Error(`Sampler gain must be >= 0. Received: ${value}`)
  this._gain = value
}
```

---

## [LOW] Note constructor overrides MusicallyAware constructor logic

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/note.ts:31-43`
**Category:** API Design

**Description:** `Note` extends `MusicallyAware(class {})` and passes `super()` with no arguments. It then manually handles `opts.letter`, `opts.frequency`, `opts.identifier` in its own constructor. The `MusicallyAware` mixin also handles these in its constructor (looking at the last argument). Since `super()` is called with no args, the mixin constructor gets `opts = undefined` and does nothing, so Note's constructor is the sole handler. This works but means Note does not benefit from the mixin's duplicate-identifier warning logic.

**Suggestion:** Pass opts through to super: `super(opts)` so both the mixin warning and Note-specific defaults apply.

---

## [LOW] Track.stop() does not await super.stop() in all paths

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/track.ts:190-203`
**Category:** Edge Case

**Description:** `Track.stop()` sets `startOffset = 0` before checking `_isPlaying`. If `_isPlaying` is false, the method returns without calling `super.stop()` or emitting any event, which is correct (nothing to stop). However, it silently resets `startOffset` even when not playing. This means calling `stop()` on a paused track resets its position, which may or may not be intended -- the doc says "Unlike pause(), stop() resets the playback position to 0" which implies this is intentional.

This is fine as documented. No change needed.

---

## [LOW] preventEventDefaults() leaks event listeners

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/index.ts:593-617`
**Category:** Memory Leak

**Description:** `preventEventDefaults()` adds 13 event listeners to the element but provides no way to remove them. If the element is removed from the DOM without removing listeners, they may persist if other references to the element exist. Modern browsers handle this via garbage collection when the element is dereferenced, but a cleanup function would be good practice.

**Suggestion:** Return a cleanup function:

```typescript
export function preventEventDefaults(key: HTMLElement): () => void {
  // ... add listeners ...
  return () => events.forEach(event => key.removeEventListener(event, prevent))
}
```

This is a breaking change to the return type, so alternatively add a separate `removeEventDefaults()` or document the limitation.

---

## [LOW] useInteractionMethods() leaks event listeners

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/index.ts:639-656`
**Category:** Memory Leak

**Description:** Same issue as `preventEventDefaults()` -- adds event listeners with no cleanup mechanism. Additionally, the `play` and `stop` async functions are created per call and cannot be removed by the consumer since they have no reference to the inner functions.

**Suggestion:** Return a cleanup function or accept an AbortSignal.

---

## [LOW] Playable interface methods lack Promise return types

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/interfaces/playable.ts:5-11`
**Category:** API Design

**Description:** The `Playable` interface declares `play`, `stop`, `stopIn`, `stopAt` as returning `void`, but `BaseSound` implements them as returning `Promise<void>`. This means code using the `Playable` type cannot await these methods without a type assertion. The `Sampler` class uses `Playable` for its sounds and calls `play()` without await, which works but loses the promise.

**Suggestion:** Update the `Playable` interface to return `void | Promise<void>` or `Promise<void>` for the async methods.

---

## [LOW] Track.seek() emits 'seek' event even when position doesn't change

**File:** `/Users/seth/Documents/GitHub/ez-audio/src/track.ts:274-279`
**Category:** Edge Case

**Description:** If you call `track.seek(currentPosition).as('seconds')`, it emits a 'seek' event even though the position has not changed. This could cause unnecessary re-renders in UI frameworks.

**Suggestion:** Guard the emit: `if (adjustedOffset !== previousPosition) { this.emit('seek', ...) }`

---

## Positive Observations

1. **Effect chain architecture** is well-designed -- the persistent effect chain with bypass interception is elegant and avoids re-creating effects on each play.

2. **Envelope implementation** is solid, with proper retrigger handling and cancelAndHoldAtTime fallback for cross-browser support.

3. **Error messages** are consistently helpful with context (URLs, parameter names, received values).

4. **AudioBufferSourceNode lifecycle** is correctly handled -- new nodes created per play, old ones disconnected.

5. **withinRange clamping** in Track.seek() prevents out-of-bounds seeking.

6. **Debug system** with per-instance override is a nice touch for production debugging.

7. **iOS workaround** is properly gated to run only once.

8. **Fluent API** is intuitive and well-typed.

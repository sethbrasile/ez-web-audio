# Deep Review — EZ Web Audio
## 2026-02-26 | Mode: Pre-delivery | Scope: Full codebase

### Meta
- Lenses activated: Architecture & API Design, Code Correctness & Safety, Performance, Testing & Quality, Documentation & DX, Build & Packaging
- Skills referenced: code-review, code-documentation, webapp-testing
- Files examined: ~47 library source files, 46 test files, 3 E2E files, docs site, CI/CD configs
- Previous reviews: 2026-02-23 (v1, v2), 2026-02-25 (health check — all 7 findings fixed in Phase 46)

---

### Critical Findings

#### C1: `dist/index.d.ts` imports `standardized-audio-context-mock` (test-only devDependency)

**Evidence:** `dist/index.d.ts:1` contains:
```typescript
import { AudioContext as AudioContext_2 } from 'standardized-audio-context-mock';
```

**Root cause:** `src/utils/timeout.ts:1` does `import type { AudioContext as AudioContextMock } from 'standardized-audio-context-mock'` and uses it in the `ContextLike` type (`AudioContext | BaseAudioContext | AudioContextMock`). Since `timeout.ts` flows through `base-sound.ts` into the public API, `rollupTypes` bundles the mock type into the published declarations.

**Impact:** Every consumer with `skipLibCheck: false` (the default) gets a compile error because `standardized-audio-context-mock` is not in their `node_modules`. This is a **ship-blocking** bug that breaks all TypeScript consumers on install.

**Recommendation:** Remove the mock type from `ContextLike` in `timeout.ts`. Use `AudioContext | BaseAudioContext` only — the mock is structurally compatible at runtime and the `import type` is unnecessary. The mock-accepting capability should be confined to test files excluded from the declaration build.

**Files:** `src/utils/timeout.ts:1,17`

---

### High Findings

#### H1: Preload cache re-decodes audio on every cache hit

**Evidence:** `src/index.ts:783-786`:
```typescript
if (hasInCache(src)) {
  const res = await getFromCache(src)!.clone()
  const buffer = await audioContext.decodeAudioData(await res.arrayBuffer())
  return createSoundFor(type, buffer)
}
```

**Impact:** `decodeAudioData()` is CPU-intensive (especially for MP3/OGG). The cache only avoids the network fetch, not the expensive decode. A drum machine creating multiple BeatTracks from the same samples decodes each file repeatedly. Same pattern in `createSprite()` at line 631-632.

**Recommendation:** Cache `AudioBuffer` objects instead of (or alongside) `Response` objects. `AudioBufferSourceNode.buffer` can safely reference a shared `AudioBuffer` — multiple Sound instances can share the same decoded buffer.

**Files:** `src/index.ts:783-786`, `src/index.ts:631-632`, `src/preload.ts`

#### H2: `stopAt()` calls `node.stop(time)` without checking `_isPlaying`

**Evidence:** `src/base-sound.ts:1028-1030`:
```typescript
else {
  // Schedule precise audio stop via Web Audio API (sample-accurate)
  node.stop(time)  // throws InvalidStateError if node hasn't been start()-ed
```

The immediate stop path (line 1018) correctly guards with `if (this._isPlaying)`, but the scheduled (future) stop path does not.

**Impact:** Calling `stopAt()` with a future time on a sound that isn't playing throws `InvalidStateError` from the Web Audio API.

**Recommendation:** Guard `node.stop(time)` with `if (this._isPlaying)` or wrap in try/catch.

**Files:** `src/base-sound.ts:1028-1030`

#### H3: Fire-and-forget play methods discard promises (unhandled rejections)

**Evidence:** `src/base-sound.ts:833-836`:
```typescript
public playFor(duration: number): void {
  this.playAt(this.audioContext.currentTime)  // returns Promise<void>, not awaited
  this._trackedTimeout(() => this.stop(), duration * 1000)
}
```

Same pattern in:
- `playIn()` — `src/base-sound.ts:818-819`
- `playInAndStopAfter()` — `src/base-sound.ts:852-855`
- `Sampler.play()` — `src/sampler.ts:83` (discards child sound's `play()` promise)
- `Track.resume()` — `src/track.ts:209-224`

**Impact:** If `playAt()` rejects (disposed sound, closed context), the rejection becomes an unhandled promise rejection — a runtime crash in strict environments.

**Recommendation:** Either make these methods async and await, or add `.catch()` handlers that emit a warning event.

**Files:** `src/base-sound.ts:818,833,852`, `src/sampler.ts:83`, `src/track.ts:209`

---

### Medium Findings

#### M1: `dispose()` doesn't disconnect `audioSourceNode`

`src/base-sound.ts:1218-1251` — `dispose()` disconnects `effectChainInput`, `gainNode`, and `pannerNode`, but never disconnects the current `audioSourceNode` or nullifies its `onended` handler. If the sound was not playing, the source node remains connected.

**Recommendation:** Add `this.safeDisconnect(this.audioSourceNode)` and `this.audioSourceNode.onended = null` in `dispose()`.

#### M2: `BeatTrack` has no `dispose()` method

`src/beat-track.ts` — Holds references to AudioContext, multiple Sound instances, Beat instances, and a recurring `window.setTimeout` scheduler. No way to release resources.

**Recommendation:** Add `dispose()` that calls `stop()`, disposes each sound, clears beats, and nullifies the eventTarget.

#### M3: `Track.percentPlayed` divides by zero

`src/track.ts:88-91`:
```typescript
public get percentPlayed(): number {
  const ratio = this.startOffset / this.duration.raw  // duration.raw can be 0
  return ratio * 100
}
```

**Recommendation:** Guard: `if (duration === 0) return 0`.

#### M4: `Track.seek()` race condition

`src/track.ts:321-324` — When seeking while playing, `seek()` awaits `stop()`, sets `startOffset`, then defers `play()` via `this.later()` (1ms timeout). Between `stop()` completing and the deferred `play()` executing, another concurrent `seek()` can overwrite `startOffset`.

**Recommendation:** Use a guard flag (`_seeking`) or call `play()` directly instead of via `later()`.

#### M5: AudioContext replacement silently orphans existing sounds

`src/audio-context.ts:24-29` — If the browser closes the AudioContext (resource pressure), `getOrCreateAudioContext()` silently creates a new one. All existing Sound/Track/Oscillator instances still reference the old, closed context. Any attempt to play them fails.

**Recommendation:** At minimum, log a warning when creating a replacement context. Consider adding a `contextchanged` event.

#### M6: `LayeredSound.play()` uses `Promise.all` — one layer failure aborts all

`src/layered-sound.ts:104-118` — If one layer fails, `Promise.all` rejects immediately. Remaining layers may be partially started with no cleanup.

**Recommendation:** Use `Promise.allSettled()`, continue with succeeded layers, report failures via warning event.

#### M7: Deprecated `Player` type still exported

`src/index.ts:831-832` — v1.0 has no backward compatibility obligation. Shipping a deprecated-on-arrival type is confusing.

**Recommendation:** Remove the `Player` type alias before v1.0.

#### M8: `_disposeUnmute` internal function publicly exported

`src/index.ts:63-66` — Marked `@internal` with underscore prefix, but still a named public export visible in autocomplete and bundled declarations.

**Recommendation:** Remove the `export` keyword, or move to a separate `testing` entry point.

#### M9: Deprecated `SoundEventMap` type still exported

`src/events/event-types.ts:138-139` — Same issue as M7. `SoundEventType` and `EventDetailFor` both reference it, creating a dependency chain on a deprecated type.

**Recommendation:** Remove `SoundEventMap`, update dependents to reference `TrackEventMap` directly.

#### M10: Duplicate gain-interception logic

`src/base-sound.ts:609-638` and `src/oscillator.ts:224-252` contain identical `_targetGain` syncing logic. If gain-interception needs to change, it must be updated in two places.

**Recommendation:** Extract into a protected helper on BaseSound (e.g., `_updateWithGainTracking()`).

#### M11: Plain `Error` thrown where domain error classes exist

- `src/index.ts:604` — `createFont` failure throws `Error` instead of `AudioLoadError`
- `src/oscillator.ts:170` — Unknown note throws `Error` instead of `InvalidNoteError`

**Recommendation:** Use the matching domain error classes.

#### M12: `TimeObject` allocated on every `duration` getter access

`src/sound.ts:161-169` — Creates a new object with string formatting on every call. Called in hot paths: `playAt()`, `percentPlayed` (polled at 60fps via RAF).

**Recommendation:** Add a lightweight `durationRaw` getter returning just the number, or cache the TimeObject and invalidate when buffer changes.

#### M13: Scheduler `tick()` iterates tasks twice per frame

`src/utils/timeout.ts:34-44` — Pass 1 executes due tasks, pass 2 `filter()`s them out (allocating a new array). Runs at 60fps.

**Recommendation:** Combine into a single pass that collects remaining tasks.

#### M14: Soundfont parsing is synchronous on main thread

`src/index.ts:586-606` — Soundfont JS files can be 5-20MB. `response.text()` + `mungeSoundFont()` runs synchronously, potentially freezing UI for 100-500ms on mobile.

**Recommendation:** Document the potential freeze. Consider Web Worker offloading in a future version.

#### M15: Vibrato example in docs won't produce vibrato

`docs/guide/parameter-control.md:106-114` — Stacks `onPlayRamp` calls in a loop, but consume-once semantics means they're all cleared after first `play()`. The example is misleading.

**Recommendation:** Replace with a working example or add a caveat.

#### M16: `await` on `seek().as()` in README returns void

`readme.md:45` — `await song.seek(30).as('seconds')` — `seek().as()` returns `void`, not a Promise. The `await` is misleading.

**Recommendation:** Remove the `await`.

---

### Low Findings

#### L1: `dispose()` doesn't clear event listeners

`src/base-sound.ts` — `EventTarget` has no `removeAllListeners()`. Consumers must manually call `off()` before `dispose()`.

**Recommendation:** Document this, or add a `removeAllListeners()` to `TypedEventEmitter` that tracks registered handlers.

#### L2: `LayeredSound` has no `dispose()` method

`src/layered-sound.ts` — Similar to M2.

**Recommendation:** Add `dispose()` that stops and disposes all layers.

#### L3: Pan value not validated

`src/base-sound.ts:655-658` — `changePanTo()` accepts any number; `StereoPannerNode.pan` silently clamps to [-1, 1]. Unlike gain, no validation or warning.

**Recommendation:** Add range warning for values outside [-1, 1].

#### L4: `createBeatTrack`/`createSampler` only accept `string[]`

`src/index.ts:418` — Unlike `createSound`/`createTrack` which accept `AudioInput` (URL/ArrayBuffer/Blob/File), these only take URLs.

**Recommendation:** Document the limitation. Consider extending to `AudioInput[]` in v1.1.

#### L5: `SoundController`/`OscillatorController` exported unnecessarily

`src/index.ts` — Internal implementation details; users interact via fluent API.

**Recommendation:** Consider removing from public exports.

#### L6: Controller `applyValues`/`applyRampValues` duplication

`src/controllers/sound-controller.ts` and `oscillator-controller.ts` — Nearly identical methods with the only difference being `frequency` handling.

**Recommendation:** Extract shared logic into `BaseParamController`.

#### L7: AudioSprite creates gain+panner nodes on every `play()`

`src/sprite.ts:177-198` — Even when gain=1 and pan=0 (defaults), unnecessary nodes are created.

**Recommendation:** Skip node creation when at default values.

#### L8: Crossfade curves regenerated on every call

`src/utils/crossfade.ts:67-69` — Two `Float32Array(256)` + 512 trig ops per crossfade. Mathematically constant.

**Recommendation:** Cache at module level.

#### L9: `audioContext.resume()` called on every `play()`

`src/base-sound.ts:891` — After first user interaction, context is running. The `resume()` call creates an unnecessary microtask on every play.

**Recommendation:** Guard with `if (audioContext.state === 'suspended')`.

#### L10: `onPlaySet`/`onPlayRamp` tests only verify no-throw

`src/sound.test.ts:512-548` — Tests use `expect(() => ...).not.toThrow()` without verifying scheduled values are applied during playback.

**Recommendation:** Add assertions that verify AudioParam values after play.

#### L11: `end` event untested for `Sound` class

`src/sound.test.ts` — The natural playback completion event has no dedicated test on the primary `Sound` class.

**Recommendation:** Add `end` event tests.

#### L12: No event listener cleanup tests for `dispose()`

No test verifies listeners stop firing after `dispose()`.

**Recommendation:** Add tests.

#### L13: Publish workflow doesn't verify tag matches `package.json` version

`.github/workflows/publish.yml` — Tag `v2.0.0` with `package.json` at `1.0.0` would silently publish wrong version.

**Recommendation:** Add tag-version verification step.

---

### Proposed Action Plan

#### Group 1: Ship-blocker fix
- **Goal:** Make the library installable for TypeScript consumers
- **Findings addressed:** C1
- **Scope:** `src/utils/timeout.ts`, rebuild + verify `dist/index.d.ts`
- **Effort:** Small
- **Dependencies:** None — do this first

#### Group 2: Safety & correctness fixes
- **Goal:** Eliminate runtime crashes and unhandled rejections
- **Findings addressed:** H2, H3, M1, M2, M3, M6
- **Scope:** `src/base-sound.ts`, `src/beat-track.ts`, `src/track.ts`, `src/layered-sound.ts`, `src/sampler.ts`
- **Effort:** Medium
- **Dependencies:** After Group 1

#### Group 3: Export cleanup for v1.0
- **Goal:** Clean public API surface — no deprecated-on-arrival types, no internal leaks
- **Findings addressed:** M7, M8, M9, M11
- **Scope:** `src/index.ts`, `src/events/event-types.ts`, `src/oscillator.ts`
- **Effort:** Small
- **Dependencies:** None

#### Group 4: Performance quick wins
- **Goal:** Eliminate redundant CPU work in hot paths
- **Findings addressed:** H1, M12, M13, L9
- **Scope:** `src/index.ts`, `src/preload.ts`, `src/sound.ts`, `src/utils/timeout.ts`, `src/base-sound.ts`
- **Effort:** Medium
- **Dependencies:** After Group 1 (timeout.ts overlap)

#### Group 5: Docs fixes
- **Goal:** Accurate documentation for v1.0 launch
- **Findings addressed:** M15, M16
- **Scope:** `docs/guide/parameter-control.md`, `readme.md`
- **Effort:** Small
- **Dependencies:** None

#### Group 6: Test strengthening (can be v1.1)
- **Goal:** Close coverage gaps and strengthen assertions
- **Findings addressed:** L10, L11, L12
- **Scope:** `src/sound.test.ts`, `src/base-sound-events.test.ts`
- **Effort:** Medium
- **Dependencies:** After Group 2 (dispose changes)

#### Group 7: Build & refactoring improvements (can be v1.1)
- **Goal:** CI safety + code dedup
- **Findings addressed:** L13, M10, L6, M5, M14, L1-L8
- **Scope:** `.github/workflows/publish.yml`, `src/controllers/`, `src/audio-context.ts`, various
- **Effort:** Medium-Large
- **Dependencies:** None

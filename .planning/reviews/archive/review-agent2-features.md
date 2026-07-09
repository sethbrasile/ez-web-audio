# Code Review: Feature Modules, Effects, Controllers, and Utilities

**Reviewer:** Code Review Agent (Opus 4.6)
**Date:** 2026-02-20
**Scope:** Feature modules, effects system, controllers, utilities, errors, events, debug

---

## [HIGH] BeatTrack `playBeats` and `playActiveBeats` are functionally identical
**File:** /Users/seth/Documents/GitHub/ez-audio/src/beat-track.ts:165,196
**Category:** Bug

**Description:** `playBeats()` and `playActiveBeats()` have identical implementations. Both set the same state and call `this.scheduler()`. The `scheduler()` method always calls `scheduleBeat()`, which always calls `beat.playInIfActive()` -- meaning beats only play if active regardless of which method was called. There is no code path where `playBeats()` forces all beats to play unconditionally (using `beat.playIn()` instead of `beat.playInIfActive()`).

This means `playBeats()` does NOT play all beats -- it only plays active beats, which contradicts its name and JSDoc. The `callPlayMethodOnBeats` method (line 388) accepts a method parameter of `'playInIfActive' | 'playIn'` suggesting there was intent to differentiate, but the lookahead scheduler does not use this method.

**Suggestion:** Either:
1. Remove `playActiveBeats()` and document that `playBeats()` only plays active beats (since that is the standard drum machine pattern), or
2. Add a private field (e.g., `private playOnlyActive = true`) toggled by each method, and have `scheduleBeat()` conditionally call `beat.playIn()` vs `beat.playInIfActive()`.

---

## [HIGH] BeatTrack `resume()` uses stale `nextBeatTime` causing timing burst
**File:** /Users/seth/Documents/GitHub/ez-audio/src/beat-track.ts:280-296
**Category:** Timing

**Description:** When resuming after a pause, `nextBeatTime` is restored from the paused value (line 283). If significant wall-clock time has passed since pausing, `audioContext.currentTime` will have advanced far beyond `nextBeatTime`. The `scheduler()` while-loop (line 332) will then fire repeatedly to "catch up," scheduling all missed beats in a rapid burst within the 100ms lookahead window.

For example: pause at beat 2 when `audioContext.currentTime = 5.0` and `nextBeatTime = 5.5`. Resume 30 seconds later when `currentTime = 35.0`. The scheduler will loop through potentially hundreds of beats in a single frame trying to advance `nextBeatTime` past 35.0.

**Suggestion:** In `resume()`, recalculate `nextBeatTime` relative to `audioContext.currentTime` rather than restoring the stale value:
```typescript
this.currentBeatIndex = this.pausedBeatIndex
this.nextBeatTime = this.audioContext.currentTime  // Start from NOW
```

---

## [MEDIUM] Preload cache stores consumed Response objects
**File:** /Users/seth/Documents/GitHub/ez-audio/src/preload.ts:41
**Category:** Bug

**Description:** The `responseCache` stores `Response` objects, but `Response.body` is a `ReadableStream` that can only be consumed once. In `preload()`, the response is stored directly without cloning (line 41). When `load()` in `src/index.ts` later retrieves it and calls `.clone()` (line 531), this works for the first retrieval. However, if the preloaded response's body was never consumed by `preload()` itself, the first `.clone()` works fine.

The actual issue is in `src/index.ts` line 554: `responseCache.set(src, response)` stores the response, then line 560 calls `response.clone().arrayBuffer()`. If `createSound()` is called again for the same URL, line 531 does `responseCache.get(src)!.clone()` on the original (unconsumed) response -- this should work. But there is an edge case: if the original response body was already consumed (which happens if `.arrayBuffer()` was called on it instead of on a clone), subsequent `.clone()` calls will fail.

Looking more carefully at line 560: `response.clone().arrayBuffer()` -- this clones first, so the original should remain unconsumed. This is actually correct. However, in `createSprite()` (line 452-453), the pattern is: `responseCache.set(audioUrl, response)` then `response.clone().arrayBuffer()` -- also correct.

This is actually safe as implemented, but the pattern is fragile. Any future modification that accidentally calls `.arrayBuffer()` on the original response (instead of a clone) would silently break caching.

**Suggestion:** Store `ArrayBuffer` in the cache instead of `Response` objects, or store a cloned response. This would make the cache more robust and avoid the fragile clone-before-consume pattern:
```typescript
// In preload:
const arrayBuffer = await response.arrayBuffer()
bufferCache.set(url, arrayBuffer)
```

---

## [MEDIUM] AudioSprite has no `stop()` method for looping sprites
**File:** /Users/seth/Documents/GitHub/ez-audio/src/sprite.ts:141-191
**Category:** Missing Feature

**Description:** The `SpriteDefinition` interface supports `loop: boolean` (line 10), and `play()` sets `source.loop = sprite.loop ?? false` (line 152). However, `play()` returns `void` and there is no way to stop a looping sprite once started. The `source.onended` cleanup (line 180) will never fire for looping sources since they never end naturally.

This means:
1. Looping sprites cannot be stopped
2. Looping sprites leak AudioNodes (source, gainNode, pannerNode are never disconnected)

**Suggestion:** Either:
1. Return a handle object from `play()` with a `stop()` method: `play(name): { stop: () => void }`
2. Track active sources and add a `stop(name?)` method to `AudioSprite`
3. Remove the `loop` option if looping is not a supported use case

---

## [MEDIUM] `onPlaySet` accumulates rather than replacing same-parameter schedules
**File:** /Users/seth/Documents/GitHub/ez-audio/src/controllers/base-param-controller.ts:216-233
**Category:** API Design

**Description:** Calling `onPlaySet('gain')` multiple times pushes to `startingValues` each time (line 220). When `setValuesAtTimes()` runs, all accumulated values are applied in order via `setValueAtTime()`. For `startingValues` (instant values), only the last one wins since they all apply at `currentTime`. However, for ramp values, multiple conflicting ramps on the same parameter will produce undefined behavior in the Web Audio API (overlapping automation events).

Example of confusing behavior:
```typescript
sound.onPlaySet('gain').to(0).endingAt(1, 'linear')
sound.onPlaySet('gain').to(0.5).endingAt(2, 'linear')  // Does NOT replace the first
sound.play() // Both ramps are applied -- the second overrides the first mid-ramp
```

**Suggestion:** Add a deduplication step in `onPlaySet()` that removes prior entries for the same `type` from `startingValues`, or document that the last call wins and earlier calls for the same parameter are also applied (which may cause unexpected automation artifacts).

---

## [MEDIUM] OscillatorController does not support `detune` or `pan` in `applyValues`
**File:** /Users/seth/Documents/GitHub/ez-audio/src/controllers/oscillator-controller.ts:75-89
**Category:** Bug

**Description:** The `OscillatorController.applyValues()` switch-case only handles `'frequency'` and `'gain'` (lines 78-86). If a user calls `oscillator.onPlaySet('detune').to(100)` or `oscillator.onPlaySet('pan').to(-0.5)`, the switch hits the default case and throws an error saying "Supported types for OscillatorController: 'gain', 'frequency'."

However, `_update()` (line 45-53) for immediate updates does support `'detune'` and `'pan'` via the `super._update()` call. This creates an inconsistency: immediate updates support all four parameters, but scheduled updates (`onPlaySet`/`onPlayRamp`) only support two.

The same issue exists in `applyRampValues()` (lines 91-106).

**Suggestion:** Add `'detune'` and `'pan'` cases to both `applyValues()` and `applyRampValues()` in `OscillatorController`:
```typescript
case 'detune':
  oscillator.detune.setValueAtTime(item.value, currentTime)
  break
case 'pan':
  this.pannerNode.pan.setValueAtTime(item.value, currentTime)
  break
```

---

## [MEDIUM] SoundController does not support `pan` in scheduled values
**File:** /Users/seth/Documents/GitHub/ez-audio/src/controllers/sound-controller.ts:38-67
**Category:** Bug

**Description:** Similar to OscillatorController, `SoundController.applyValues()` only handles `'detune'` and `'gain'`. The `'pan'` control type is not handled, so `sound.onPlaySet('pan').to(-0.5)` will throw at playback time. Immediate updates via `update('pan')` work fine through the base class.

**Suggestion:** Add `'pan'` case to both `applyValues()` and `applyRampValues()`:
```typescript
case 'pan':
  this.pannerNode.pan.setValueAtTime(item.value, currentTime)
  break
```

---

## [MEDIUM] `mungeSoundFont` fails silently on malformed input
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/decode-base64.ts:31-41
**Category:** Error Handling

**Description:** `mungeSoundFont()` uses string slicing based on `indexOf('MIDI.Soundfont.')` and `lastIndexOf('"')`. If the input string does not contain `'MIDI.Soundfont.'`, `indexOf` returns -1, `indexOf('=', -1)` returns the first `=` in the string, and the subsequent `slice` + `JSON.parse` will produce garbage or throw an unhelpful `SyntaxError` with no context about what went wrong.

Additionally, `base64ToUint8()` uses `atob()` which throws `DOMException` on invalid base64 with no wrapping.

**Suggestion:** Add validation at the entry point:
```typescript
export function mungeSoundFont(soundfont: string): string[] {
  const marker = soundfont.indexOf('MIDI.Soundfont.')
  if (marker === -1) {
    throw new AudioLoadError(
      'Invalid soundfont format: missing MIDI.Soundfont header. Ensure the file is a valid MIDI.js soundfont.',
      'soundfont'
    )
  }
  // ... rest of parsing
}
```

---

## [MEDIUM] `audioContextAwareTimeout` task ID can overflow
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/timeout.ts:65-66
**Category:** Bug

**Description:** `nextTaskId` starts at 1 and increments without bound. In a long-running application with frequent beat scheduling (e.g., 120 BPM at 1/16 notes = 8 tasks/second), `nextTaskId` will eventually exceed `Number.MAX_SAFE_INTEGER` (after ~35.7 million years at that rate, so this is effectively a theoretical concern). More practically, the `tasks` array is filtered on every scheduler call but completed tasks whose callbacks have run remain in the array until the next scheduler cycle, which could accumulate during rapid scheduling.

**Suggestion:** This is a theoretical issue and low priority. The current implementation is fine for practical use.

---

## [MEDIUM] LayeredSound `setupLayerEndTracking` listener leak on repeated `play()` calls
**File:** /Users/seth/Documents/GitHub/ez-audio/src/layered-sound.ts:168-191
**Category:** Memory

**Description:** Each call to `play()` calls `setupLayerEndTracking()` which adds a `once('end', ...)` listener to every layer. If `play()` is called rapidly without waiting for all layers to end, the listeners from the previous `play()` call are never removed (they are `once` but they reference the old `endedLayers` Set). When layers do fire their `end` events, the old listeners will still execute, potentially emitting spurious `'end'` events from the LayeredSound.

Consider: `play()` -> layers start -> `play()` again before layers end -> now each layer has 2 `once('end')` listeners. When the first batch of layers end, the old listeners fire and may incorrectly emit an `'end'` event.

**Suggestion:** Track and remove previous listeners before adding new ones, or use a generation counter that old listeners check before emitting:
```typescript
private playGeneration = 0

private setupLayerEndTracking(): void {
  const generation = ++this.playGeneration
  const endedLayers = new Set<Sound | Oscillator>()

  const handleEnd = (layer: Sound | Oscillator): void => {
    if (generation !== this.playGeneration) return  // Stale listener
    endedLayers.add(layer)
    if (endedLayers.size === this.layers.length) {
      this.emit('end', { ... })
    }
  }
  // ...
}
```

---

## [MEDIUM] `crossfade` uses native `setTimeout` for completion, causing drift
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/crossfade.ts:91-98
**Category:** Timing

**Description:** The crossfade function uses `globalThis.setTimeout` (line 93) for the completion callback (stopping the source track and resolving the promise). The comment says "Use native setTimeout for testability with vi.useFakeTimers," which is a valid testing concern. However, in production, if the browser tab is backgrounded, `setTimeout` may be throttled to 1-second resolution, causing the fromTrack to continue playing longer than the fade duration.

The audio fade itself (via `setValueCurveAtTime`) will still complete on time since it is scheduled on the audio thread, but the `stop()` call and promise resolution will be delayed.

**Suggestion:** Consider using `audioContextAwareTimeout` as the primary timer and providing a test-mode option, or accepting the small drift for stop/resolve timing since the actual audio fade is precise.

---

## [LOW] `Beat.playIn` does not schedule the reset of `isPlaying`/`currentTimeIsPlaying`
**File:** /Users/seth/Documents/GitHub/ez-audio/src/beat.ts:94-103
**Category:** Bug

**Description:** `playIn()` sets both `isPlaying` and `currentTimeIsPlaying` to `true` after the offset, but unlike `markPlaying()` and `markCurrentTimePlaying()`, it does not schedule them to reset to `false` after `this.duration` milliseconds. This means once `playIn()` is called, those flags stay `true` forever.

Compare with `playIfActive()` (line 147) which calls `markPlaying()` and `markCurrentTimePlaying()` -- these properly schedule resets.

The `playIn()` method is currently only reachable via `Beat.playIn()` directly and via `Sampler.playIn()` through the `parentPlayIn` callback, but the Beat's own `playIn` is the one with the issue.

**Suggestion:** Use the same pattern as the other methods:
```typescript
public playIn(offset = 0): void {
  const msOffset = offset * 1000
  this.parentPlayIn(offset)
  this.setTimeout(() => {
    this.markPlaying()
    this.markCurrentTimePlaying()
  }, msOffset)
}
```

---

## [LOW] `playTogether` uses `(p as any).audioContext` duck-typing
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/play-together.ts:32-35
**Category:** API Design

**Description:** `playTogether()` uses `as any` to access `audioContext` from the first playable. This is fragile -- if the `Playable` interface were extended to include `audioContext`, this cast would be unnecessary.

**Suggestion:** Either add `audioContext` to the `Playable` interface, accept an explicit `AudioContext` parameter, or always use `getOrCreateAudioContext()` (since it is the same shared context anyway).

---

## [LOW] `GainEffect` uses linear interpolation for `mix` instead of equal-power
**File:** /Users/seth/Documents/GitHub/ez-audio/src/effects/gain-effect.ts:96-98
**Category:** API Design

**Description:** `GainEffect.applyEffectiveGain()` uses `1 + (value - 1) * mix` which is linear interpolation. This is actually correct for a single-node gain effect (there is no wet/dry split). However, it is a different mixing curve than `FilterEffect` and `EffectWrapper`, which use equal-power crossfade. The `mix` property semantics differ across effect types, which could confuse users.

**Suggestion:** Document this difference in the `mix` property JSDoc, or accept it as intentional since gain is a fundamentally different kind of effect (scaling vs. signal processing).

---

## [LOW] `Font.getNote` uses linear search
**File:** /Users/seth/Documents/GitHub/ez-audio/src/font.ts:48-50
**Category:** Performance

**Description:** `getNote()` uses `Array.find()` which is O(n). For large soundfonts with 88+ notes, this is called on every `play()`. While n=88 is small enough that this is unlikely to be a bottleneck, a `Map<string, SampledNote>` would provide O(1) lookup.

**Suggestion:** Consider building a `Map<string, SampledNote>` in the constructor for O(1) lookups while keeping the `notes` array for ordered iteration. Low priority since n is small.

---

## [LOW] `AudioSprite` does not validate sprite boundaries against buffer duration
**File:** /Users/seth/Documents/GitHub/ez-audio/src/sprite.ts:141-177
**Category:** Error Handling

**Description:** The `play()` method does not validate that `sprite.start` and `sprite.end` fall within the `audioBuffer.duration`. If a manifest defines `{ start: 10, end: 15 }` but the audio file is only 8 seconds long, `source.start()` will silently play nothing or produce unexpected behavior.

Similarly, `getDuration()` does not validate that `end > start`. A sprite with `{ start: 5, end: 3 }` would return a negative duration.

**Suggestion:** Add validation in the constructor or in `play()`:
```typescript
if (sprite.start < 0 || sprite.end < sprite.start) {
  throw new Error(`Invalid sprite "${name}": start=${sprite.start}, end=${sprite.end}`)
}
if (sprite.end > this.audioBuffer.duration) {
  throw new Error(`Sprite "${name}" end (${sprite.end}s) exceeds buffer duration (${this.audioBuffer.duration}s)`)
}
```

---

## [LOW] `prop-access.ts` is entirely commented-out typed version, active version uses `any`
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/prop-access.ts:82-101
**Category:** API Design

**Description:** The file contains 80 lines of commented-out type-safe `get`/`set` implementations, followed by 20 lines of `any`-typed versions that are actually exported. The commented-out version provides full type-safe deep property access. If the type-safe version was abandoned due to TypeScript limitations, the commented code should be removed. If it is aspirational, it should be noted.

**Suggestion:** Either remove the commented-out code (it is preserved in git history) or add a brief comment explaining why it was deferred. The current `any`-typed version works but loses all type safety.

---

## [LOW] `createNotes` does not parse note identity from frequency map keys
**File:** /Users/seth/Documents/GitHub/ez-audio/src/index.ts:140-153
**Category:** Bug

**Description:** `createNotes()` creates `Note` objects and sets `note.frequency = note` (the frequency value), but does not set `letter`, `accidental`, or `octave`. The `Note` class presumably inherits from `MusicallyAware` which derives these from an `identifier`. Without setting the identifier, the Note objects will have incomplete musical identity.

Looking at the frequency map keys (e.g., `"A4"`, `"Bb3"`), these should be parsed into identifiers. But the code only sets `frequency`, not `identifier`.

**Suggestion:** Set the identifier from the key:
```typescript
for (const key in json) {
  const noteObject = new Note()
  noteObject.identifier = key  // Parse letter/accidental/octave from key
  noteObject.frequency = json[key]
  notes.push(noteObject)
}
```

---

## [LOW] `exponentialRatio` has no JSDoc
**File:** /Users/seth/Documents/GitHub/ez-audio/src/utils/exponential-ratio.ts:3-6
**Category:** API Design

**Description:** This utility function lacks documentation explaining its purpose, input range, or output range. It converts a linear 0-1 value to an exponential curve clamped to 0-1. Without documentation, its intended use case (likely for audio fader curves where human perception is logarithmic) is unclear.

**Suggestion:** Add JSDoc:
```typescript
/**
 * Convert a linear ratio (0-1) to an exponential curve for perceptually
 * uniform audio parameter control (e.g., volume faders).
 * Input 0 -> output 0, input 1 -> output 1, with exponential curve between.
 */
```

---

## [LOW] Error hierarchy is clean but `AudioContextError.state` type does not include `'interrupted'`
**File:** /Users/seth/Documents/GitHub/ez-audio/src/errors/context-error.ts:29
**Category:** API Design

**Description:** `AudioContextError` declares `state: AudioContextState`, but `src/index.ts:83` casts `'interrupted'` as `AudioContextState` because `'interrupted'` is not part of the standard `AudioContextState` type (it is iOS-specific). The error class properly stores whatever state it receives, but TypeScript users inspecting the `state` property would not see `'interrupted'` as a possible value.

**Suggestion:** Either extend the type in the error class or add a comment explaining the iOS-specific state:
```typescript
public readonly state: AudioContextState | 'interrupted'
```

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 0 | - |
| HIGH | 2 | Bug, Timing |
| MEDIUM | 7 | Bug, Memory, Error Handling, API Design, Timing |
| LOW | 7 | Bug, API Design, Performance, Error Handling |

**Overall Assessment:** The codebase demonstrates strong engineering practices with well-documented APIs, proper error hierarchies, and thoughtful abstractions. The effects system's equal-power crossfade implementation is mathematically correct. The BeatTrack lookahead scheduler follows established best practices for Web Audio timing. The main concerns are: (1) `playBeats`/`playActiveBeats` behavioral duplication, (2) resume timing burst after long pauses, and (3) incomplete scheduled parameter support in controllers. The error system is well-structured with proper inheritance and contextual information. The debug system has zero-cost short-circuiting when disabled, which is excellent.

# Developer Experience Audit

**Date:** 2026-02-15
**Scope:** All public APIs, naming conventions, abstractions, error handling, and beginner approachability

---

## API Naming Consistency (DX-01)

### Factory Functions

| Function | Pattern | Consistent? | Recommendation |
|----------|---------|-------------|----------------|
| `createSound()` | `create*` | ✅ | None - perfect consistency |
| `createTrack()` | `create*` | ✅ | None |
| `createBeatTrack()` | `create*` | ✅ | None |
| `createSampler()` | `create*` | ✅ | None |
| `createOscillator()` | `create*` | ✅ | None |
| `createLayeredSound()` | `create*` | ✅ | None |
| `createFont()` | `create*` | ✅ | None |
| `createSprite()` | `create*` | ✅ | None |
| `createWhiteNoise()` | `create*` | ✅ | None |
| `createNotes()` | `create*` | ✅ | None |
| `createGainEffect()` | `create*` | ✅ | None |
| `createFilterEffect()` | `create*` | ✅ | None |
| `createAnalyzer()` | `create*` | ✅ | None |
| `initAudio()` | `init*` | ⚠️ | Consider `createAudioContext()` for consistency, but `initAudio()` may be clearer |
| `getAudioContext()` | `get*` | ⚠️ | Breaks pattern - consider `getOrCreateAudioContext()` or keep as-is for brevity |

**Overall Assessment:** Factory function naming is exemplary. All creation functions use `create*` prefix consistently.

**Minor Inconsistency:** `initAudio()` and `getAudioContext()` use different verbs, but this is arguably intentional and semantically correct. No action needed.

---

### Method Naming

| Class | Method | Inconsistency | Recommendation |
|-------|--------|---------------|----------------|
| **Playback Control** | | | |
| All playable classes | `play()` | ✅ | None |
| All playable classes | `stop()` | ✅ | None |
| Track, BeatTrack | `pause()` | ✅ | None |
| Track, BeatTrack | `resume()` | ✅ | None |
| **Timing Methods** | | | |
| All playable classes | `playIn()` | ✅ | None |
| All playable classes | `playAt()` | ✅ | None |
| All playable classes | `stopIn()` | ✅ | None |
| All playable classes | `stopAt()` | ✅ | None |
| All playable classes | `playInAndStopAfter()` | ✅ | None |
| **Parameter Control** | | | |
| All sounds | `update()` | ✅ | None |
| All sounds | `changeGainTo()` | ✅ | None |
| All sounds | `changePanTo()` | ✅ | None |
| All sounds | `onPlaySet()` | ✅ | None |
| All sounds | `onPlayRamp()` | ✅ | None |
| **Effect Chain** | | | |
| BaseSound | `addEffect()` | ✅ | None |
| BaseSound | `removeEffect()` | ✅ | None |
| BaseSound | `getEffects()` | ✅ | None |
| BaseSound | `rewireEffects()` | ✅ | None |
| BaseSound | `addConnection()` | ⚠️ | DEPRECATED - coexists with `addEffect()`, consider hiding from public API |
| BaseSound | `removeConnection()` | ⚠️ | DEPRECATED - coexists with `removeEffect()`, consider hiding from public API |
| **Analyzer** | | | |
| BaseSound | `setAnalyzer()` | ✅ | None |
| BaseSound | `getAnalyzer()` | ✅ | None |
| BaseSound | `setDestination()` | ✅ | None |
| **Event Subscription** | | | |
| BaseSound, BeatTrack | `on()` | ✅ | None |
| BaseSound, BeatTrack | `off()` | ✅ | None |
| BaseSound, BeatTrack | `once()` | ✅ | None |
| BaseSound, BeatTrack | `addEventListener()` | ✅ | None (standard EventTarget) |
| BaseSound, BeatTrack | `removeEventListener()` | ✅ | None (standard EventTarget) |
| **Track-Specific** | | | |
| Track | `seek()` | ✅ | None |
| **BeatTrack-Specific** | | | |
| BeatTrack | `playBeats()` | ✅ | None |
| BeatTrack | `playActiveBeats()` | ✅ | None |
| BeatTrack | `setTempo()` | ✅ | None |
| **Beat-Specific** | | | |
| Beat | `playIfActive()` | ✅ | None |
| Beat | `ifActivePlayIn()` | ⚠️ | Awkward ordering - consider `playInIfActive()` to match `playIfActive()` |

**Overall Assessment:** Method naming is highly consistent. Verbs are uniform across classes.

**Minor Issues:**
1. `ifActivePlayIn()` has awkward word order compared to `playIfActive()` - consider renaming for readability
2. `addConnection()`/`removeConnection()` are deprecated but still public - consider `@deprecated` JSDoc tags

---

### Type/Interface Naming

| Type/Interface | Pattern | Consistent? | Recommendation |
|----------------|---------|-------------|----------------|
| `OscillatorOpts` | `*Opts` | ⚠️ | Most others use `*Options` - rename to `OscillatorOptions` |
| `BaseSoundOptions` | `*Options` | ✅ | None |
| `BeatTrackOptions` | `*Options` | ✅ | None |
| `SamplerOptions` | `*Options` | ✅ | None |
| `EnvelopeOptions` | `*Options` | ✅ | None |
| `FilterEffectOptions` | `*Options` | ✅ | None |
| `AnalyzerOptions` | `*Options` | ✅ | None |
| `LayeredSoundOptions` | `*Options` | ✅ | None |
| `SpritePlayOptions` | `*Options` | ✅ | None |
| `BeatOptions` | `*Options` | ✅ | None |
| `OscillatorOptsFilterValues` | Mixed | ❌ | Uses `Opts` + `Values` suffix - rename to `OscillatorFilterOptions` |
| `ControlType` | `*Type` | ✅ | None |
| `RatioType` | `*Type` | ✅ | None |
| `RampType` | `*Type` | ✅ | None |
| `SeekType` | `*Type` | ✅ | None |
| `FilterType` | `*Type` | ✅ | None |
| `Playable` | Adjective | ✅ | None |
| `Connectable` | Adjective | ✅ | None |
| `TimeObject` | `*Object` | ✅ | None |
| `DebugMessage` | `*Message` | ✅ | None |

**Overall Assessment:** Type naming mostly consistent with `*Options` for config objects and `*Type` for union types.

**Issues:**
1. `OscillatorOpts` breaks the `*Options` pattern (11 others use `Options`, only this uses `Opts`)
2. `OscillatorOptsFilterValues` is doubly inconsistent - uses `Opts` and `Values` suffix

**Recommended Renames:**
- `OscillatorOpts` → `OscillatorOptions`
- `OscillatorOptsFilterValues` → `OscillatorFilterOptions` or `FilterOptions`

---

### Event Names

| Class | Event | Consistent? | Recommendation |
|-------|-------|-------------|----------------|
| BaseSound | `'play'` | ✅ | None |
| BaseSound | `'stop'` | ✅ | None |
| BaseSound | `'end'` | ✅ | None |
| Track | `'pause'` | ✅ | None |
| Track | `'resume'` | ✅ | None |
| Track | `'seek'` | ✅ | None |
| BeatTrack | `'beat'` | ✅ | None |
| BeatTrack | `'pause'` | ✅ | None |
| BeatTrack | `'resume'` | ✅ | None |
| BeatTrack | `'stop'` | ✅ | None |
| LayeredSound | `'warning'` | ✅ | None |

**Overall Assessment:** Event names are simple, descriptive verbs or nouns. Perfect consistency.

---

## API Approachability (DX-03)

### Web Audio Leaks

**Definition:** APIs that expose Web Audio internals unnecessarily, requiring users to understand AudioContext, AudioNode, AudioParam, etc.

| API | Exposed Internal | Simpler Alternative |
|-----|-----------------|---------------------|
| `getAudioContext()` | Returns raw `AudioContext` | Keep as-is - advanced use case, properly documented |
| `BaseSound.gainNode` | Public `GainNode` property | ❌ LEAK - Should be private. Users have `changeGainTo()`, `update('gain')` |
| `BaseSound.pannerNode` | Public `StereoPannerNode` property | ❌ LEAK - Should be protected/private |
| `BaseSound.audioSourceNode` | Public `AudioBufferSourceNode\|OscillatorNode` | ⚠️ LEAK - Needed for advanced users, but exposes internals |
| `BaseSound.effectChainInput` | Public `GainNode` property | ❌ LEAK - Should be private, no user-facing use case |
| `BaseSound.connections` | Public `Connection[]` array | ⚠️ LEAK - Deprecated API, keep for backwards compat but hide with `@deprecated` |
| `BaseSound.startOffset` | Public `number` property | ⚠️ LEAK - Manipulated by Track internally, no clear user use case |
| `Connectable.getNodeFrom()` | Returns raw `AudioNode` | ⚠️ LEAK - Part of deprecated connections API |
| `setDestination(node: AudioNode)` | Accepts raw `AudioNode` | Keep as-is - advanced routing use case |
| `Effect.input/output` | Raw `AudioNode` properties | Keep as-is - necessary for custom effects |
| `preventEventDefaults(key: HTMLElement)` | Utility function | ✅ Good abstraction - hides complexity |
| `useInteractionMethods(key, player)` | Utility function | ✅ Good abstraction - hides auto-init complexity |

**Major Leaks:**
1. **`gainNode` and `pannerNode` should be protected** - users have high-level APIs (`changeGainTo()`, `changePanTo()`, `update()`)
2. **`effectChainInput` should be private** - pure implementation detail
3. **`startOffset` being public is confusing** - it's mutated internally by Track, not meant for user manipulation
4. **`connections` array** - deprecated, should be hidden

**Recommended Actions:**
- Make `gainNode`, `pannerNode`, `effectChainInput` protected
- Make `startOffset` protected in BaseSound, public only in Track with clear docs
- Add `@deprecated` tags to `connections`, `addConnection()`, `removeConnection()`, `getConnection()`, `getNodeFrom()`

---

### Happy Path Analysis

**Evaluation:** How many steps does it take to accomplish common tasks?

| Task | Current Steps | Ideal Steps | Gap | Assessment |
|------|--------------|-------------|-----|-----------|
| **Play a sound effect** | 1. `const s = await createSound(url)`<br>2. `s.play()` | 2 | 0 | ✅ Perfect |
| **Play music with pause** | 1. `const t = await createTrack(url)`<br>2. `t.play()`<br>3. `t.pause()`<br>4. `t.resume()` | 4 | 0 | ✅ Perfect |
| **Change volume** | 1. `sound.changeGainTo(0.5)` | 1 | 0 | ✅ Perfect |
| **Fade in on play** | 1. `sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')`<br>2. `sound.play()` | 2 | 0 | ✅ Concise fluent API |
| **Create drum pattern** | 1. `const kick = await createBeatTrack(['kick.mp3'], {numBeats: 8})`<br>2. `kick.beats[0].active = true`<br>3. `kick.beats[4].active = true`<br>4. `kick.playActiveBeats(120, 1/4)` | 4 | 0 | ✅ Intuitive beat toggling |
| **Add effect** | 1. `const filter = createFilterEffect(ctx, 'lowpass', {frequency: 800})`<br>2. `sound.addEffect(filter)` | 2 | +1 | ⚠️ Requires `ctx` - consider factory without ctx |
| **Create synth** | 1. `const synth = await createOscillator({frequency: 440})`<br>2. `synth.play()` | 2 | 0 | ✅ Perfect |
| **Seek in track** | 1. `track.seek(30).from('seconds')` | 1 | 0 | ✅ Perfect fluent API |
| **Listen for events** | 1. `sound.on('play', handler)` | 1 | 0 | ✅ Perfect |
| **Round-robin samples** | 1. `const gun = await createSampler(['shot1.mp3', 'shot2.mp3'])`<br>2. `gun.play()` | 2 | 0 | ✅ Perfect |

**Overall Assessment:** Happy paths are excellent. Most tasks are 1-2 steps. No unnecessary complexity.

**Minor Issue:** Creating effects requires passing `AudioContext`. Consider:
```typescript
// Current (requires context)
const filter = createFilterEffect(await getAudioContext(), 'lowpass', { frequency: 800 })

// Better? (context managed internally)
const filter = await createFilterEffect('lowpass', { frequency: 800 })
```

---

### Confusing Signatures

**Definition:** Methods with too many parameters, unclear parameter names, or unintuitive argument ordering.

| API | Issue | Example | Recommendation |
|-----|-------|---------|----------------|
| `update('gain').to(0.5).from('ratio')` | "from" is unclear - from what? | `sound.update('gain').to(0.5).from('ratio')` | Consider `.using('ratio')` or `.as('ratio')` (already noted in code TODO) |
| `onPlaySet('gain').to(0).endingAt(1, 'exponential')` | "endingAt" suggests time, but rampType is optional second param | `sound.onPlaySet('gain').to(1).endingAt(2, 'linear')` | Consider `.endingAt(2).using('linear')` or split into two methods |
| `playInAndStopAfter(playIn, stopAfter)` | Long method name, unclear if times are additive | `sound.playInAndStopAfter(1, 3)` | Keep - rare use case, name is descriptive |
| `seek(amount).from(type)` | Same "from" confusion as `update()` | `track.seek(30).from('seconds')` | Consider `.in('seconds')` or `.as('seconds')` |
| `ifActivePlayIn(offset)` | Awkward word order | `beat.ifActivePlayIn(0.5)` | Rename to `playInIfActive(offset)` for consistency |
| `createBeatTrack(urls, opts)` | `urls` is required but `opts` contains critical config like `numBeats` | `createBeatTrack(['kick.mp3'], {numBeats: 8})` | Consider making first param `opts` with `urls` inside, or rename to `sounds` |
| `playBeats(bpm, noteType)` | `noteType` as fraction (1/4, 1/8) is musically correct but may confuse non-musicians | `track.playBeats(120, 1/4)` | Keep - add better docs with common values (quarter=1/4, eighth=1/8, etc) |

**Major Issues:**
1. **`.from()` method name is confusing** - "from ratio" doesn't clarify what ratio means. Consider `.using()` or `.as()`
2. **`ifActivePlayIn()` word order** - breaks consistency with `playIfActive()`

**Recommended Actions:**
- Rename `.from()` to `.using()` or `.as()` across all fluent APIs
- Rename `ifActivePlayIn()` to `playInIfActive()`
- Improve JSDoc for `noteType` parameter with examples

---

### Ordering Dependencies

**Definition:** APIs where users must call methods in a specific order or risk errors.

| Dependency | Risk | Current Handling | Recommendation |
|------------|------|-----------------|----------------|
| Must call `initAudio()` before first play | Medium | Handled automatically - `initAudio()` called internally, but docs say "must be called in user gesture" | ✅ Good - library handles it, but docs could be clearer |
| Must create AudioContext before effects | Medium | Effects require `AudioContext` parameter | ⚠️ Make effects auto-create context or accept optional ctx |
| Must call `update().to().from()` in order | Low | TypeScript enforces via fluent API return types | ✅ Perfect - compile-time enforcement |
| Must set beat `active` before `playActiveBeats()` | Low | Works fine if called in any order, beats default to `active = false` | ✅ Perfect - no ordering required |
| Must not call `play()` twice on Track | Low | No error, but second play stops first | ⚠️ Consider warning or silently ignoring second play |

**Overall Assessment:** Very few ordering dependencies. Most are enforced by TypeScript or handled automatically.

**Recommendation:**
- Clarify docs: `initAudio()` is optional (called automatically), but if called explicitly must be in user gesture
- Consider auto-creating AudioContext in effect factories

---

### Fluent API Clarity

**Question:** Does `update().to().from()` make sense to someone who hasn't read the docs?

**Analysis:**

```typescript
// Current API
sound.update('gain').to(0.5).from('ratio')
```

**User Mental Model Test:**
- `update('gain')` ✅ Clear - updating gain parameter
- `.to(0.5)` ✅ Clear - setting it to 0.5
- `.from('ratio')` ❌ Confusing - "from ratio" implies a source, not a unit

**Alternative Phrasings:**
```typescript
sound.update('gain').to(0.5).as('ratio') // clearer - "interpret 0.5 AS a ratio"
sound.update('gain').to(0.5).using('ratio') // clearer - "interpret USING ratio scale"
sound.update('gain').to(0.5).in('ratio') // clearer - "0.5 IN ratio units"
```

**Recommendation:** Rename `.from()` to `.as()` or `.using()` for clarity. This affects:
- `update().to().from()`
- `seek().from()`

---

## Abstraction Quality (DX-02)

### Inheritance Hierarchy

| Relationship | Justified? | Issue | Recommendation |
|-------------|------------|-------|----------------|
| `Sound extends BaseSound` | ✅ Yes | None | Keep - BaseSound provides reusable infrastructure |
| `Track extends Sound` | ✅ Yes | None | Keep - Track IS-A Sound with position tracking |
| `Oscillator extends BaseSound` | ✅ Yes | None | Keep - shares param control, event system, effect chain |
| `Sampler extends nothing` | ✅ Yes | Sampler is compositional, not playable itself | Keep - delegates to contained Sounds |
| `BeatTrack extends Sampler` | ✅ Yes | BeatTrack IS-A Sampler with beat pattern logic | Keep - inheritance is appropriate |
| `SampledNote extends MusicallyAware(Sound)` | ✅ Yes | Mixin pattern adds musical identity | Keep - elegant solution for note identity |

**Overall Assessment:** Inheritance hierarchy is well-designed. Each extends relationship passes the IS-A test.

**No issues found.**

---

### Controller Pattern

**Question:** Do SoundController, OscillatorController add value or just indirection?

**Analysis:**

**Value Added:**
1. ✅ Separates parameter management from playback logic
2. ✅ Handles scheduled value changes (setValueAtTime, ramps)
3. ✅ Encapsulates fluent API builders
4. ✅ Enables envelope handling (OscillatorController)

**Complexity Added:**
1. ⚠️ Extra layer of indirection for simple gain/pan changes
2. ⚠️ Controllers have mutating state (`valuesAtTime`, `startingValues`, etc)

**Verdict:** ✅ Controllers add value. The scheduled parameter changes are complex enough to warrant separation.

**Recommendation:** Keep controller pattern. It's justified complexity.

---

### Interface Design

**Question:** Are `Playable` and `Connectable` the right abstractions?

**Analysis:**

**Playable Interface:**
```typescript
interface Playable {
  play: () => any
  playAt: () => any
  playIn: () => any
  playFor: () => any
  playInAndStopAfter: () => any
  stop: () => any
  stopIn: () => any
  stopAt: () => any
  isPlaying
  duration
  onPlaySet: () => any
  onPlayRamp: () => any
}
```

✅ Good abstraction - unifies all playable entities (Sound, Oscillator, Track)
✅ Enables polymorphic playback (e.g., `playAll([sound1, sound2, osc])`)

**Connectable Interface:**
```typescript
interface Connectable {
  connections
  audioSourceNode
  percentGain
  addConnection: () => any
  removeConnection: () => any
  getConnection: () => any
  getNodeFrom: () => any
  changePanTo: () => any
  changeGainTo: () => any
  update: () => any
}
```

⚠️ Mixed abstraction:
- `connections`, `addConnection()`, etc are deprecated legacy API
- `changeGainTo()`, `changePanTo()` are still active
- `audioSourceNode` exposes internals

**Recommendation:**
- ✅ Keep `Playable` - solid abstraction
- ⚠️ Refactor `Connectable` - remove deprecated connection methods, rename to `Adjustable` or `Controllable`

---

### Unnecessary Complexity

| Area | Complexity | Simpler Alternative |
|------|-----------|---------------------|
| **Effect Chain vs Connections** | Two ways to add effects: `addEffect()` (new) and `connections` array (old) | Remove `connections` in v2, mark deprecated now |
| **Event System** | Three ways to subscribe: `.on()`, `.once()`, `.addEventListener()` | Keep all three - `.on()` is convenience, `addEventListener()` is standard |
| **TimeObject** | Returns `{raw, string, pojo}` for all time values | ✅ Good - multiple formats avoid repeated conversions |
| **Fluent APIs** | Multi-step builders: `update().to().from()`, `seek().from()` | ✅ Good - enables type safety and discoverability |
| **Beat flags** | `active`, `isPlaying`, `currentTimeIsPlaying` - three boolean flags | ⚠️ Consider renaming for clarity: `enabled`, `playing`, `highlighted` |
| **BeatTrack pause state** | Stores `pausedBeatIndex` AND `pausedBeatTime` | ✅ Necessary - need both for accurate resume |
| **BaseSound internals** | `effectChainInput`, `_destination`, `_analyzer`, effect chain wiring | ✅ Necessary - managing audio graph is inherently complex |

**Findings:**
1. **Effect chain complexity is justified** - audio routing requires careful node management
2. **Deprecated connections API adds clutter** - mark for removal
3. **Beat flags could be clearer** - naming is functional but not intuitive

**Recommendations:**
1. Add `@deprecated` to `connections`, `addConnection()`, `removeConnection()`
2. Consider renaming Beat flags in v2 for clarity
3. Keep other complexity - it's essential

---

### Missing Abstractions

| Use Case | Current Approach | Recommended Abstraction |
|----------|-----------------|------------------------|
| **Chaining effects** | Manual: create each effect, call `addEffect()` repeatedly | ✅ Consider `sound.addEffects([filter, reverb, delay])` array method |
| **Volume presets** | Manual: `sound.changeGainTo(0.8)` | ⚠️ Consider named presets: `sound.setVolume('quiet')` or enum |
| **Common effect combos** | Manual: create lowpass + highpass for bandpass | ⚠️ Consider preset factories: `createBandpassEffect()` |
| **Frequency helpers** | Must know Hz values (440, 880, etc) | ✅ Good - `frequencyMap` provides note→Hz, no abstraction needed |
| **BPM/duration conversion** | Hidden in BeatTrack internals | ✅ Good - formula is simple, no abstraction needed |
| **Loading multiple files** | `Promise.all(urls.map(createSound))` | ⚠️ Consider `createSounds(urls)` batch loader with progress |
| **Syncing playback** | Manual: `const time = ctx.currentTime; s1.playAt(time); s2.playAt(time)` | ⚠️ Consider `playTogether([s1, s2, s3])` helper |

**Recommended Additions:**
1. **`addEffects(effects[])`** - convenience for adding multiple effects
2. **`createSounds(urls[])`** - batch loader with progress events
3. **`playTogether(playables[])`** - sync multiple sounds to same start time
4. **Preset effect factories** - `createReverbEffect()`, `createEchoEffect()`, etc

---

### Mixin Pattern Evaluation

**Question:** Is `MusicallyAware` adding complexity without value?

**Usage:**
```typescript
class SampledNote extends MusicallyAware(Sound) {
  // Adds: letter, accidental, octave, frequency, identifier
}
```

**Value Added:**
✅ Adds musical identity to sounds (note name, frequency)
✅ Enables Font class to map note identifiers to sounds
✅ Reusable - could be applied to Oscillator if needed

**Complexity Added:**
⚠️ Mixin pattern is less familiar than inheritance
⚠️ Adds 5 properties to every SampledNote

**Verdict:** ✅ Keep mixin - it's an elegant solution for optional musical identity.

**Recommendation:** No changes needed. Mixin is appropriate here.

---

## Error Messages & Edge Cases (DX-04)

### Error Message Quality

| File | Line | Current Message | Issue | Recommended Message |
|------|------|----------------|-------|---------------------|
| `index.ts` | 530 | `Network error loading audio. Check URL and connection. URL: ${src}` | ✅ Good | No change - tells what happened and how to fix |
| `index.ts` | 537 | `HTTP ${response.status} loading audio. Check URL and CORS headers. URL: ${src}` | ✅ Good | No change - actionable troubleshooting |
| `index.ts` | 552 | `Failed to decode audio. File may be corrupted or unsupported format. URL: ${src}` | ✅ Good | No change - clear cause and URL |
| `index.ts` | 111 | `AudioContext interrupted (iOS backgrounded). Resume playback after returning to foreground.` | ✅ Good | No change - specific iOS issue, clear fix |
| `font.ts` | 69 | `EZ Web Audio: No note with identifier ${identifier} found.` | ⚠️ No suggestions | Add: `Available notes: ${this.notes.map(n => n.identifier).join(', ')}` |
| `sprite.ts` | 112 | `Sprite "${name}" not found. Available: ${this.names.join(', ')}` | ✅ Excellent | No change - lists available options |
| `base-sound.ts` | 814 | `ez-web-audio: AudioContext is suspended. Audio will not play until a user interaction (click, tap, keypress) occurs. Call initAudio() from a user gesture handler...` | ✅ Excellent | No change - explains problem and multiple solutions |
| `analyzer.ts` | 77 | `fftSize must be a power of 2 between 32 and 32768. Got: ${fftSize}` | ✅ Good | No change - clear constraint and invalid value |
| `controllers/*` | Various | `Unsupported control type: ${item.type}` | ⚠️ No suggestions | Add: `Supported types: gain, pan, frequency, detune` |
| `controllers/*` | Various | `Unsupported ramp type: ${rampType}` | ⚠️ No suggestions | Add: `Supported types: linear, exponential` |
| `controllers/base-param-controller.ts` | 94 | `Audio source does not support detune` | ⚠️ Vague | Change to: `This audio source does not support detune. Only Oscillator supports detune parameter.` |
| `controllers/base-param-controller.ts` | 119 | `Control method '${method}' not supported` | ⚠️ No suggestions | Add: `Supported methods: ratio, inverseRatio, percent` |
| `preload.ts` | 28 | `HTTP ${response.status} loading ${url}` | ⚠️ Missing context | Add: `Failed to preload audio. HTTP ${response.status} loading ${url}` |
| `preload.ts` | 48 | Error message not shown | ⚠️ No error message | Generic Error - should be AudioLoadError with clear message |
| `utils/timeout.ts` | 15 | `ez-web-audio: AudioContext was not available when an entity was created and timing tasks will therefore use javascript native setTimeout...` | ✅ Good warning | No change - explains fallback behavior |
| `layered-sound.ts` | 62 | Warning about many layers | ✅ Good | No change - performance warning |

**Overall Assessment:** Error messages are generally excellent. Most tell WHAT went wrong AND HOW to fix it.

**Issues Found:**
1. Some errors don't suggest valid alternatives (control types, ramp types)
2. Font error doesn't show available notes
3. Detune error doesn't explain which classes support it
4. Preload error lacks context

---

### Silent Failures

| File | Line | Scenario | Should Do |
|------|------|----------|-----------|
| `track.ts` | 114 | Calling `pause()` when not playing | Silently ignores | ✅ OK - defensive programming |
| `track.ts` | 160 | Calling `resume()` when not paused | Silently ignores | ✅ OK - defensive programming |
| `beat-track.ts` | 265 | Calling `resume()` when not paused | Silently ignores | ✅ OK - defensive programming |
| `base-sound.ts` | 922 | Calling `stop()` when not playing | Silently ignores | ✅ OK - idempotent stop is safe |
| `sampler.ts` | 117 | Iterator reaches end | Silently restarts | ✅ OK - round-robin behavior is expected |
| Effect `bypass` toggle | N/A | Toggling bypass doesn't auto-rewire | Chain not updated until `rewireEffects()` called | ❌ BAD - should auto-rewire or document clearly |
| `playAt(pastTime)` | N/A | Playing at time in the past | Plays immediately? | ⚠️ UNCLEAR - should validate or document behavior |

**Issues Found:**
1. **Effect bypass doesn't auto-rewire** - users must call `rewireEffects()` manually after toggling `effect.bypass`. This is a footgun.
2. **Playing at past time behavior is undocumented** - what happens if `playAt(audioContext.currentTime - 10)`?

**Recommendations:**
1. Make effect bypass auto-rewire (requires property setter)
2. Validate `playAt(time)` to ensure `time >= audioContext.currentTime` or document behavior
3. Add warning when scheduling in the past

---

### Missing Validations

| API | Edge Case | Risk |
|-----|-----------|------|
| `changeGainTo(value)` | Negative gain | Medium - could cause unexpected volume boost |
| `changePanTo(value)` | Pan outside -1 to 1 | Low - clamped by Web Audio API |
| `seek(amount).from('seconds')` | Seek beyond duration | Low - handled by `withinRange()` ✅ |
| `seek(amount).from('percent')` | Percent > 100 or < 0 | Low - clamped by calculation |
| `playBeats(bpm, noteType)` | BPM <= 0 or NaN | High - breaks playback, causes infinite loop |
| `playBeats(bpm, noteType)` | noteType = 0 or negative | High - breaks duration calculation |
| `createOscillator({frequency})` | Frequency <= 0 or NaN | Medium - creates inaudible oscillator |
| `createFilterEffect(ctx, type, {frequency})` | Frequency out of audible range | Low - technically valid but likely mistake |
| `BeatTrack` constructor | `numBeats` = 0 or negative | High - creates empty/broken track |
| `Beat` constructor | `duration` = 0 or negative | Medium - flags never reset |
| `onPlaySet().to().endingAt(time)` | time < 0 | Medium - unclear behavior |
| `Analyzer.setFFTSize()` | Not power of 2 | High - throws error ✅ |
| File loading | Empty URL string | Medium - network error is cryptic |
| File loading | URL with no extension | Low - works if server headers correct |

**Critical Missing Validations:**
1. **BPM validation** - `playBeats(0, 1/4)` or `playBeats(-120, 1/4)` will break
2. **noteType validation** - `playBeats(120, 0)` will cause division by zero
3. **numBeats validation** - `createBeatTrack(['kick.mp3'], {numBeats: -5})` creates broken track
4. **Gain validation** - `changeGainTo(-5)` could cause clipping/distortion

**Recommendations:**
1. Validate BPM > 0 in `playBeats()` and `setTempo()`
2. Validate noteType > 0 in `playBeats()`
3. Validate numBeats > 0 in BeatTrack constructor
4. Validate gain >= 0 in `changeGainTo()` (warn if > 1?)
5. Validate frequency > 0 in Oscillator constructor

---

## Summary of Findings

### Critical Issues (Must Fix)

1. **Missing validations for BPM, noteType, numBeats** - can cause crashes/infinite loops
2. **Effect bypass doesn't auto-rewire** - footgun for users
3. **Type naming inconsistency:** `OscillatorOpts` vs all others using `*Options`
4. **Web Audio leaks:** `gainNode`, `pannerNode`, `effectChainInput` should be protected

### High Priority (Should Fix)

1. **`.from()` method name is confusing** - rename to `.as()` or `.using()`
2. **`ifActivePlayIn()` awkward naming** - rename to `playInIfActive()`
3. **Missing error suggestions** - add supported values to "Unsupported X" errors
4. **Gain validation** - prevent negative values
5. **Deprecated API cleanup** - add `@deprecated` tags to `connections` API

### Medium Priority (Nice to Have)

1. **Missing abstractions:** `addEffects()`, `createSounds()`, `playTogether()`
2. **Preset effect factories** - common effects like reverb, echo
3. **Batch loading with progress**
4. **Better Beat flag names** - `active`, `isPlaying`, `currentTimeIsPlaying` could be clearer

### Low Priority (Polish)

1. **`startOffset` being public** - confusing for users, only used internally by Track
2. **Effect factory requires context** - consider auto-creating context
3. **Documentation improvements** - clarify `initAudio()` is optional

---

## Metrics

- **Total public APIs reviewed:** 45+ methods across 15 classes
- **Factory functions:** 13 (all use `create*` pattern ✅)
- **Naming inconsistencies found:** 3 (OscillatorOpts, OscillatorOptsFilterValues, ifActivePlayIn)
- **Web Audio leaks found:** 5 (gainNode, pannerNode, effectChainInput, connections, startOffset)
- **Missing validations:** 5 critical (BPM, noteType, numBeats, gain, frequency)
- **Silent failures:** 2 (effect bypass, playAt past time)
- **Confusing method names:** 2 (.from(), ifActivePlayIn())
- **Missing abstractions suggested:** 4 (batch operations, effect presets)

---

**Next Steps:** Phase 13 (Code Quality) will implement fixes for critical and high-priority issues.

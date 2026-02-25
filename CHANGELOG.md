# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-23

### Breaking Changes

- **`EnvelopeOptions` property names shortened** — `attackTime` renamed to `attack`, `decayTime` to `decay`, `sustainLevel` to `sustain`, `releaseTime` to `release`. The `Envelope.release()` method renamed to `Envelope.triggerRelease()` to avoid collision with the new `release` property.

#### Method Renames

- **`.from()` renamed to `.as()` on `update().to()` chains**
  ```typescript
  // Before
  sound.update('gain').to(0.5).from('ratio')
  // After
  sound.update('gain').to(0.5).as('ratio')
  ```

- **`.from()` renamed to `.as()` on `seek()` chains**
  ```typescript
  // Before
  track.seek(30).from('seconds')
  // After
  track.seek(30).as('seconds')
  ```

- **`ifActivePlayIn()` renamed to `playInIfActive()`**
  ```typescript
  // Before
  beat.ifActivePlayIn(offset)
  // After
  beat.playInIfActive(offset)
  ```

> **Note:** `onPlayRamp().from()` is unchanged -- it means "from value X" (e.g., `.from(440).to(880).in(1)`), not "interpret value as type X". Only the type-disambiguation `.from()` calls were renamed.

#### Visibility Changes

- `BaseSound.gainNode` is now `protected` -- use `getGainNode()` for advanced access (e.g., scheduling gain ramps directly)
- `BaseSound.pannerNode` is now `protected`
- `BaseSound.effectChainInput` is now `protected`
- `BaseSound.startOffset` is now `protected` -- use Track's `position` and `seek()` APIs instead

#### Removed APIs

- **Connections API removed** -- `addConnection()`, `removeConnection()`, `getConnection()`, `getNodeFrom()`, and the `connections` array have been removed. Use `addEffect()` / `removeEffect()` / `wrapEffect()` instead.
  ```typescript
  // Before (connections API)
  const gain = audioContext.createGain()
  sound.addConnection({ name: 'myGain', audioNode: gain })
  const node = sound.getNodeFrom<GainNode>('myGain')

  // After (effect API)
  const gain = createGainEffect(0.5)
  sound.addEffect(gain)
  ```

- **`OscillatorOpts` type alias removed** -- use `OscillatorOptions`
- **`OscillatorOptsFilterValues` type alias removed** -- use `OscillatorFilterOptions`
- **`Connectable` interface cleaned** -- deprecated members (`connections`, `addConnection`, `removeConnection`, `getConnection`, `getNodeFrom`) removed

### Migration Guide

1. **Find and replace** `.from('ratio')` with `.as('ratio')`, `.from('percent')` with `.as('percent')`, `.from('seconds')` with `.as('seconds')`, `.from('inverseRatio')` with `.as('inverseRatio')`.
2. **Find and replace** `ifActivePlayIn` with `playInIfActive`.
3. **Replace** direct `.gainNode` access with `.getGainNode()`.
4. **Replace** `addConnection`/`getNodeFrom` patterns with `addEffect`/`wrapEffect`.
5. **Replace** `OscillatorOpts` with `OscillatorOptions` and `OscillatorOptsFilterValues` with `OscillatorFilterOptions`.

### Added

- **`fadeIn(duration)`** — Play with gain ramping from 0 to current gain over specified duration
- **`fadeOut(duration)`** — Ramp gain to 0 and stop; returns a Promise that resolves when complete
- **`loop` property** on Sound and Track — enables native `AudioBufferSourceNode.loop` without timing gaps
- **`dispose()`** on BaseSound — disconnects all audio nodes, removes event listeners, marks instance as disposed (idempotent)
- **`createOscillator({ note: 'A4' })`** — accepts note name from built-in frequency map
- **`createAnalyzer()` overload** — works without AudioContext parameter (resolves shared context internally)
- **`BeatTrack.setPattern([1,0,1,0])`** — set beat active states from a numeric/boolean array
- **`createSound()` / `createTrack()` accept `ArrayBuffer`, `Blob`, or `File`** — not just URL strings; use the `AudioInput` type
- **`createNoise('white' | 'pink' | 'brown')`** — unified noise generation factory (pink uses Voss-McCartney algorithm, brown uses random walk)
- **`volume` getter/setter** on BaseSound — alias for `changeGainTo()` with same validation
- **`createTracks(urls[], onProgress?)`** — batch Track loader matching `createSounds()` pattern
- **Typed event sources** — event detail `source` field typed as `AudioEventSource` (was `unknown`)
- **Narrowed `ControlType` per class** — `Sound.update()` accepts `SoundControlType` (`'gain' | 'pan' | 'detune'`); `Oscillator.update()` accepts full `ControlType` (including `'frequency'`)
- **Event map types exported** — `SoundEventMap`, `BeatTrackEventMap`, `LayeredSoundEventMap`, `AudioEventSource`, `SoundEventType`, and all detail types
- **`TypedEventEmitter<TMap>`** — shared base class for typed event systems, exported for advanced consumers
- **`onPlaySet()` / `onPlayRamp()` consume-once behavior** prominently documented in JSDoc
- AudioSprite interactive example page
- LayeredSound interactive example page
- Crossfade interactive example page
- React integration example with hooks patterns
- `docs/guide/parameter-control.md` and `docs/guide/utilities.md` split from oversized `concepts.md`
- `getGainNode()` public accessor on BaseSound for controlled access to the GainNode
- Comprehensive JSDoc on all public methods with `@param`, `@returns`, `@throws`, and `@example` tags
- **Effect bypass auto-rewire** -- toggling `effect.bypass` automatically rewires the audio chain, removing the effect from the signal path without removing it from the effect list
- **Context-free effect factories** -- `createFilterEffect()` and `createGainEffect()` now work without an explicit `AudioContext` argument (context resolved lazily from the registered AudioContext)
- **`addEffects()` batch method** on all sounds -- add multiple effects in a single call
- **`playTogether()` utility** -- play multiple sounds simultaneously with synchronized start offset
- **`createSounds()` batch loader** -- load multiple sounds with progress events for UI feedback
- **`getFilters()` on Oscillator** -- readonly accessor returning the current filter effects array
- **`getSounds()` on Sampler** -- readonly accessor returning the current sounds array
- **`audioContextAwareTimeout` utility** -- schedules callbacks synchronized to AudioContext time, enabling audio-accurate UI timers (e.g., beat-synchronized visual updates in drum machine UIs)
- **Extensible `ControlType` via `ControlTypeMap` interface** -- add custom parameter types via TypeScript module augmentation without modifying the library
- **`createEffect()` generic factory** -- create custom effect wrappers with a consistent API
- Null guards and input validation throughout all public methods
- Descriptive errors for invalid operations (negative effect position, playing from empty sampler, etc.)
- **`clearScheduledValues` consume-once semantics** -- `onPlaySet()` and `onPlayRamp()` schedules are cleared after each `play()` call; re-schedule before each play for repeated automation
- Integration tests covering full effect chains and soundfont workflows
- Concurrent operation tests (play-while-playing, rapid seek, double-stop scenarios)
- 1038+ unit tests + 20 E2E tests

### Fixed

- **AudioSprite `loop: true`** now actually loops — duration arg no longer passed to `source.start()` when looping
- **Stale setTimeout** can no longer corrupt `_isPlaying` across rapid play/stop cycles — timeout IDs tracked and cancelled
- **`Playable` interface** return types match async implementations (`Promise<void>`)
- **`Sound` constructor** `opts` parameter typed as `BaseSoundOptions` (was `any`)
- **`createFont()`** validates `response.ok` and wraps fetch in try/catch with descriptive errors
- **`CLAUDE.md`** uses `.as('ratio')` (was `.from('ratio')`)
- **Oscillator `setup()`** documents GainNode replacement risk in JSDoc
- `synthesis.md` uses `update('frequency')` instead of removed `changeFrequencyTo()`
- `audio-routing.md` uses 1-arg `wrapEffect(node)` instead of 2-arg form

### Changed

- `BaseSound` and `LayeredSound` now extend `TypedEventEmitter` (DRY refactor, ~120 lines removed)
- Dependencies upgraded: Vite 7, Vitest 4, TypeScript 5.9, ESLint 10
- Test files split by concern for maintainability (e.g., `base-sound.test.ts` split into events, effects, debug, and analyzer focused files)
- Controller parameter arrays cleared between plays (memory optimization -- prevents unbounded growth with repeated plays)

### Initial Features (from 0.1.0 MVP)

These features shipped in the initial release and remain in 1.0.0:

- **Sound, Track, Oscillator, SampledNote** class hierarchy built on abstract `BaseSound`
- **ADSR Envelopes** with attack, decay, sustain, release parameters and visual preview support
- **Effects system** -- `FilterEffect`, `GainEffect`, `EffectWrapper` for inserting Web Audio nodes into the signal chain
- **Sampler** with round-robin playback across multiple `Sound` instances
- **BeatTrack / Beat** drum machine pattern system with `wrapWith` option for framework reactive wrappers (e.g., Vue `reactive()`)
- **Audio sprites** with named regions for slice-and-play from a single audio file
- **Soundfont loading and playback** via base64-encoded audio data
- **Musical note system** -- `MusicallyAware` mixin, frequency mapping, `SampledNote` with note identity
- **Lazy AudioContext initialization** with iOS audio workaround (must call `initAudio()` in response to user gesture)
- **Fluent parameter control API** -- `update()`, `onPlaySet()`, `onPlayRamp()` for immediate and scheduled parameter changes
- **`crossfade()`, `playAll()`, `pauseAll()`, `stopAll()`** composition utilities
- **Preload with caching** -- load audio buffers ahead of time with cache hit detection
- **Debug mode** with custom handler support for logging audio graph activity
- **Analyzer** for real-time frequency and waveform data visualization
- **VitePress documentation site** with interactive examples and API reference

## [0.1.0] - Initial MVP

Initial release. See Added section above for the feature set shipped at 0.1.0.

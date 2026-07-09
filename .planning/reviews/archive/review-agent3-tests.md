# Test Coverage Audit - ez-web-audio

**Agent:** code-reviewer (Agent 3 - Test Coverage)
**Date:** 2026-02-20
**Scope:** All source modules in `src/` (excluding `src/app/`)

---

## Summary

| Category | Modules | Good | Partial | Weak | None |
|----------|---------|------|---------|------|------|
| Core Classes | 6 | 3 | 2 | 1 | 0 |
| Feature Modules | 8 | 5 | 2 | 1 | 0 |
| Effects | 3 | 3 | 0 | 0 | 0 |
| Controllers | 3 | 2 | 1 | 0 | 0 |
| Utilities | 13 | 9 | 1 | 0 | 3 |
| Other Modules | 6 | 5 | 1 | 0 | 0 |
| Cross-Cutting | 3 | 3 | 0 | 0 | 0 |
| **Total** | **42** | **30** | **7** | **2** | **3** |

**Overall Assessment:** Coverage is strong across the codebase. The primary gaps are three utility modules with zero test coverage (`timeout.ts`, `equal-power-crossfade.ts`, `play-together.ts`) and weak coverage on `Beat` and `Oscillator Controller`. Several modules have partial coverage where edge cases or specific code paths are missing.

---

## Core Classes

### BaseSound (`src/base-sound.ts`)
**Test Files:** `base-sound-effects.test.ts`, `base-sound-analyzer.test.ts`, `base-sound-events.test.ts`, `base-sound-debug.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Effect chain: addEffect, removeEffect, getEffects, effect persistence across play/stop, bypass auto-rewire, addEffects batch, defensive guards (negative position)
- Analyzer: setAnalyzer, getAnalyzer, playback with analyzer, null detach
- Events: on() single/multiple, once(), off(), event payloads (play/stop with time and source), chaining
- Debug: global debug mode, per-sound override, custom handler, DebugMessage structure, event logging with details
- Playback: play, stop, isPlaying, play events, stop events

**Missing Scenarios:**
- `playIn()`, `playFor()`, `playInAndStopAfter()` timing methods not tested at BaseSound level (partially covered via Sound tests)
- `playAt()` with future time (delayed start) and `_isPlaying` timer path
- `stopIn()`, `stopAt()` with future time
- `percentGain` getter
- `changeGainTo()` validation (negative value error, >1 warning)
- `changePanTo()` convenience method
- `setDestination()` with custom node (tested structurally in effects test but not verified acoustically)
- `rewireEffects()` public method
- `getGainNode()` accessor
- `addEffect()` with explicit position parameter
- `addEffects()` with position parameter
- Effect bypass interception/restore lifecycle (interceptBypass/restoreBypass private methods)
- `wireEffectChain()` with analyzer AND effects simultaneously
- AudioContext suspended warning (static `_hasWarnedAboutSuspended`)
- `onended` handler for natural completion ('end' event)
- `later()` protected method
- `BaseSoundOptions.setTimeout` custom injection

**Priority:** MEDIUM - Core timing methods and parameter validation paths are untested.

---

### Sound (`src/sound.ts`)
**Test Files:** `sound.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Creation from AudioBuffer, play, stop, isPlaying state, duration
- Parameter control: update gain/pan, onPlaySet, onPlayRamp with different ramp types
- Events: play/stop events, event payloads
- Play methods: play(), playIn(), playFor(), playInAndStopAfter()
- Stop methods: stop(), stopIn()
- Fluent API chaining
- Edge cases: stop when not playing

**Missing Scenarios:**
- `playAt()` with specific future timestamp
- `setup()` internal wiring verification
- `wireConnections()` audio graph verification
- Sound overlapping (partially in concurrent.test.ts)

**Priority:** LOW - Well covered.

---

### Track (`src/track.ts`)
**Test Files:** `track.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Position tracking (position getter)
- Pause/resume with correct offset restoration
- Stop resets position to 0
- Seek: ratio, percent, seconds, inverseRatio, time object
- Seek clamping (out of bounds values)
- Events: play, stop, pause, resume, seek with correct payloads
- isPaused state
- Edge cases: pause when not playing, resume when not paused

**Missing Scenarios:**
- Position updates during playback (RAF-based `_updatePosition` loop)
- `_onPlaybackStarted()` hook integration
- `_cancelPositionTracking()` cleanup
- Seek while playing (live seek with stop/restart)

**Priority:** LOW - Well covered.

---

### Oscillator (`src/oscillator.ts`)
**Test Files:** `oscillator.test.ts`
**Coverage:** Partial

**Tested Behaviors:**
- ADSR envelope creation and application
- Play/stop with envelope
- Retriggering (stop + play rapidly)
- onPlaySet and onPlayRamp coexistence
- getFilters accessor
- Frequency/type/detune properties
- Edge cases: stop when not playing, rapid retrigger

**Missing Scenarios:**
- `addFilter()` with FilterOptions (creating BiquadFilterNode)
- Filter chain wiring verification (source -> filters -> effectChainInput)
- Anti-click fade-out on stop (`ANTI_CLICK_FADE_DURATION`)
- `setup()` with existing filters (re-wiring on each play)
- `cancelAndHoldAtTime` detection and fallback
- `wireConnections()` with multiple filters
- Oscillator `duration` (always returns Infinity TimeObject)
- Default waveform type ('sine')
- OscillatorOptions: all filter types, custom setTimeout

**Priority:** MEDIUM - Filter chain mechanics and anti-click behavior are untested.

---

### Sampler (`src/sampler.ts`)
**Test Files:** `sampler.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Round-robin playback cycling through sounds
- play(), playIn(), playAt() methods
- Gain and pan application to individual sounds
- Empty sounds array error
- getSounds accessor
- Constructor with SamplerOptions

**Missing Scenarios:**
- `stop()` method (stopping all sounds)
- Round-robin wrapping with Set iterator cycling
- Multiple rapid plays verifying different sounds used

**Priority:** LOW

---

### SampledNote (`src/sampled-note.ts`)
**Test Files:** `sampled-note.test.ts`
**Coverage:** Partial

**Tested Behaviors:**
- Mixin composition (MusicallyAware + Sound)
- Sound capabilities inherited
- Musical identity (letter, accidental, octave, frequency)
- Name property shadowing between Sound.name and musical name

**Missing Scenarios:**
- `play()` with musical context (frequency applied to playback)
- Integration with Font (getNote/play flow tested in integration.test.ts but not SampledNote directly)

**Priority:** LOW - Class body is empty, behavior inherited.

---

## Feature Modules

### Beat (`src/beat.ts`)
**Test Files:** `beat.test.ts`
**Coverage:** Weak

**Tested Behaviors:**
- Existence and creation
- play() calls parent play
- playIn() calls parent playIn with time value
- isPlaying flag toggles with timer

**Missing Scenarios:**
- `playIfActive()` method (active=true and active=false paths)
- `playInIfActive()` method (active=true and active=false paths)
- `currentTimeIsPlaying` flag behavior
- `active` property toggling
- `duration` property effect on timer length
- Multiple beats played in sequence
- markPlaying/markCurrentTimePlaying private timer logic
- Beat with custom setTimeout injection

**Priority:** HIGH - Only 4 tests for a class with 6 public methods and 3 state flags. `playIfActive` and `playInIfActive` are the primary methods used by BeatTrack's scheduler and are completely untested at the unit level.

---

### BeatTrack (`src/beat-track.ts`)
**Test Files:** `beat-track.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Beat state persistence (active flags survive play/stop)
- playBeats and playActiveBeats
- Stop, pause, resume
- setTempo
- Beat events (beatPlayed, measureComplete)
- numBeats configuration
- wrapWith option
- Edge cases: empty BeatTrack

**Missing Scenarios:**
- Lookahead scheduler timing accuracy
- `_scheduleAhead()` internal scheduling loop
- `_scheduleBeat()` beat-level scheduling
- Multiple measures cycling
- Concurrent play prevention (play while already playing)

**Priority:** LOW - Well covered at integration level.

---

### AudioSprite (`src/sprite.ts`)
**Test Files:** `sprite.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- names getter
- has() method
- getDuration() for specific sprites
- play() creates source node with correct timing
- Node wiring (source -> gain -> panner -> destination)
- Cleanup on ended (onended handler)
- Edge cases: missing sprite name, invalid manifest

**Missing Scenarios:**
- `play()` with SpritePlayOptions (gain, pan, loop)
- Loop behavior (source.loop = true, loopStart, loopEnd)
- Multiple overlapping sprite plays
- Gain/pan application during sprite play

**Priority:** LOW

---

### Font (`src/font.ts`)
**Test Files:** `font.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- getNote() returns correct SampledNote
- play() dispatches to correct note
- Error messages for missing notes
- notes property accessor

**Missing Scenarios:**
- getNote() with accidentals (Ab4, Bb3, etc.)
- play() with non-standard identifiers

**Priority:** LOW

---

### LayeredSound (`src/layered-sound.ts`)
**Test Files:** `layered-sound.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Construction with Sound/Oscillator layers
- Synchronized playback (all layers start at same time)
- Master gain/pan controls
- Layer access (getLayer, getLayers)
- Events: play, stop, end, warning
- Type safety for layer types
- Null layer filtering

**Missing Scenarios:**
- `warnLayerCount` threshold warning
- `_trackLayerEnd()` with multiple layers ending at different times
- Layer count 0 (empty layers array)
- stop() cleaning up all layer timers

**Priority:** LOW

---

### Analyzer (`src/analyzer.ts`)
**Test Files:** `analyzer.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Construction with AnalyzerOptions
- fftSize validation (power of 2, range 32-32768)
- Getters/setters for fftSize, smoothingTimeConstant, minDecibels, maxDecibels
- getFrequencyData(), getTimeDomainData()
- input getter
- createAnalyzer factory function

**Missing Scenarios:**
- Pre-allocated array reuse verification (performance optimization)
- getByteFrequencyData(), getByteTimeDomainData()

**Priority:** LOW

---

### Envelope (`src/envelope.ts`)
**Test Files:** `envelope.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Default values (ADSR)
- Custom values with clamping (non-negative enforcement)
- applyTo() scheduling AudioParam automation
- release() scheduling gain ramp down
- Retriggering with estimateCurrentValue
- cancelAndHoldAtTime detection and fallback
- Edge cases: zero attack, zero release, very long values

**Missing Scenarios:**
- applyTo with non-zero startOffset
- estimateCurrentValue during different ADSR phases (attack vs decay vs sustain)
- Envelope with extremely small attack/decay values

**Priority:** LOW

---

### Preload (`src/preload.ts`)
**Test Files:** `preload.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- preload() caches responses
- isPreloaded() checks cache
- clearPreloadCache() clears all or specific URLs
- Cache skip on duplicate preload
- Error handling for failed fetches

**Missing Scenarios:**
- preload() with array of URLs
- Cache interaction with createSound/createTrack (integration)

**Priority:** LOW

---

## Effects

### GainEffect (`src/effects/gain-effect.ts`)
**Test Files:** `gain-effect.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Value getter/setter
- Bypass store/restore behavior
- Mix interpolation formula (effectiveGain = 1 + (value - 1) * mix)
- Mix clamping to 0-1
- input/output getters (same GainNode)
- createGainEffect factory (with and without AudioContext)

**Missing Scenarios:**
- Value set while bypassed (should not apply until un-bypassed)
- Extreme values (very large gain, zero gain)

**Priority:** LOW

---

### FilterEffect (`src/effects/filter-effect.ts`)
**Test Files:** `filter-effect.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- All 8 filter types
- Parameter getters/setters (frequency, q, gain, detune, type)
- Bypass behavior
- Mix with equal-power crossfade
- Mix clamping
- createFilterEffect factory (with and without AudioContext)

**Missing Scenarios:**
- Audio routing verification (dry/wet paths)
- Parameter changes while bypassed

**Priority:** LOW

---

### EffectWrapper (`src/effects/effect-wrapper.ts`)
**Test Files:** `effect-wrapper.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Creation with external effect
- Effect interface compliance (input, output, bypass, mix)
- Bypass toggle
- Mix control
- Wrapping AudioNode-like objects
- Wrapping effects with `input` property (Tuna.js style)
- wrapEffect and createEffect factories

**Missing Scenarios:**
- Wrapping effect without `input` or `disconnect` (minimal connect-only interface)
- `.effect` accessor returns original external effect

**Priority:** LOW

---

## Controllers

### BaseParamController (`src/controllers/base-param-controller.ts`)
**Test Files:** `base-param-controller.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Fluent API: update().to().as()
- onPlaySet().to().at() and .endingAt()
- onPlayRamp().from().to().in()
- Scheduling arrays (consume-once semantics)
- updateGainNode and updatePannerNode
- RampType: linear and exponential
- Edge cases: invalid control types

**Missing Scenarios:**
- clearScheduledValues()
- Multiple scheduled values for same parameter
- Interaction between onPlaySet and onPlayRamp on same parameter

**Priority:** LOW

---

### SoundController (`src/controllers/sound-controller.ts`)
**Test Files:** `sound-controller.test.ts`
**Coverage:** Partial

**Tested Behaviors:**
- setValuesAtTimes with AudioParam scheduling
- Consume-once semantics (values cleared after apply)
- AudioParam.setValueAtTime, linearRampToValueAtTime, exponentialRampToValueAtTime

**Missing Scenarios:**
- `applyScheduledValues()` with both gain and pan values simultaneously
- Detune parameter scheduling
- Error handling for invalid ramp types

**Priority:** LOW

---

### OscillatorController (`src/controllers/oscillator-controller.ts`)
**Test Files:** `oscillator-controller.test.ts`
**Coverage:** Partial

**Tested Behaviors:**
- Frequency control via update().to().as()
- Envelope integration (applyScheduledValues with envelope)
- Scheduled value application

**Missing Scenarios:**
- `applyScheduledValues()` with frequency + envelope + gain all simultaneously
- Frequency ramp scheduling (onPlayRamp for frequency)
- Detune control

**Priority:** MEDIUM - Frequency ramping is a common synthesis use case that is not covered.

---

## Utilities

### Collections (`src/utils/collections.ts`)
**Test Files:** `collections.test.ts`
**Coverage:** Good

### Array Methods (`src/utils/array-methods.ts`)
**Test Files:** `array-methods.test.ts`
**Coverage:** Good

### Crossfade (`src/utils/crossfade.ts`)
**Test Files:** `crossfade.test.ts`
**Coverage:** Good

### Decode Base64 (`src/utils/decode-base64.ts`)
**Test Files:** `decode-base64.test.ts`
**Coverage:** Good

### Exponential Ratio (`src/utils/exponential-ratio.ts`)
**Test Files:** `exponential-ratio.test.ts`
**Coverage:** Good

### Frequency Map (`src/utils/frequency-map.ts`)
**Test Files:** `frequency-map.test.ts`
**Coverage:** Good

### Note Methods (`src/utils/note-methods.ts`)
**Test Files:** `note-methods.test.ts`
**Coverage:** Good

### Prop Access (`src/utils/prop-access.ts`)
**Test Files:** `prop-access.test.ts`
**Coverage:** Good

### Within Range (`src/utils/within-range.ts`)
**Test Files:** `within-range.test.ts`
**Coverage:** Good

### Zeroify (`src/utils/zeroify.ts`)
**Test Files:** `zeroify.test.ts`
**Coverage:** Partial

**Missing Scenarios:** Need to verify edge cases (negative numbers, large numbers, decimal values).

**Priority:** LOW

### Create Time Object (`src/utils/create-time-object.ts`)
**Test Files:** `create-time-object.test.ts`
**Coverage:** Good

---

### Equal Power Crossfade (`src/utils/equal-power-crossfade.ts`)
**Test Files:** NONE
**Coverage:** None

**Source Analysis:**
- `applyEqualPowerCrossfade(dryGain, wetGain, mix, bypass)` - 42 lines
- Used by FilterEffect and EffectWrapper for wet/dry mixing
- Pure function with clear math (cos/sin equal-power curves)

**Missing Scenarios:**
- bypass=true sets dry=1, wet=0
- bypass=false applies equal-power crossfade
- mix=0: dry=1, wet=0
- mix=0.5: dry~0.707, wet~0.707
- mix=1: dry=0, wet=1
- Intermediate mix values verify cos/sin formula

**Priority:** HIGH - Shared utility used by multiple effect classes. Math correctness should be verified independently.

---

### AudioContext-Aware Timeout (`src/utils/timeout.ts`)
**Test Files:** NONE
**Coverage:** None

**Source Analysis:**
- `audioContextAwareTimeout(audioContext)` - 107 lines
- Returns `{ setTimeout, clearTimeout }` functions
- Uses RAF + audioContext.currentTime for drift-resistant timing
- Fallback to native setTimeout when no audioContext
- Used by Beat, BeatTrack, and BaseSound for timing

**Missing Scenarios:**
- setTimeout schedules and fires callback after delay
- clearTimeout cancels a scheduled task
- Multiple concurrent tasks
- Task cleanup after firing
- RAF scheduling loop (starts on first task, stops when empty)
- Fallback behavior when audioContext is null/undefined
- Warning message on fallback
- `now()` conversion (currentTime * 1000)

**Priority:** HIGH - Critical timing infrastructure used by all playback and beat scheduling. Zero test coverage for a module that implements custom timer management with RAF.

---

### Play Together (`src/utils/play-together.ts`)
**Test Files:** NONE
**Coverage:** None

**Source Analysis:**
- `playTogether(playables)` - 41 lines
- Schedules all playables at same audioContext timestamp
- Empty array early return
- Finds audioContext from first playable or uses shared context

**Missing Scenarios:**
- Empty array returns immediately
- Multiple playables all receive same startTime via playAt()
- AudioContext discovery from playable
- Fallback to shared AudioContext
- Promise.all resolution

**Priority:** MEDIUM - Public API function with zero coverage. Relatively simple but synchronization correctness matters.

---

## Other Modules

### Musical Identity (`src/musical-identity.ts`)
**Test Files:** `musical-identity.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Mixin creation and composition
- Identifier formatting (with/without accidental)
- Frequency-to-identity calculation
- Identifier-to-frequency calculation
- Manual letter/accidental/octave setting

**Missing Scenarios:**
- Invalid frequency lookup (frequency not in map)
- Edge octaves (0 and 8)
- All accidentals (b only tested, not # if supported)

**Priority:** LOW

---

### Note (`src/note.ts`)
**Test Files:** `note.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- Construction with letter/octave, identifier, frequency
- Default values
- Accidentals (flats)
- Range of octaves (0-8)
- Middle C, A440 reference

**Priority:** LOW

---

### Error Classes (`src/errors/`)
**Test Files:** `errors/error-classes.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- AudioError: instanceof Error, name, message, code, stack
- AudioContextError: instanceof AudioError, state property, CONTEXT_ERROR code
- AudioLoadError: instanceof AudioError, url property, LOAD_ERROR code
- InvalidNoteError: instanceof AudioError, identifier property, INVALID_NOTE code
- Full instanceof chain verification

**Priority:** LOW

---

### Debug (`src/debug/`)
**Test Files:** `debug/debug.test.ts`
**Coverage:** Good

**Tested Behaviors:**
- setDebugMode enable/disable
- debugLog with global on/off, per-sound override
- setDebugHandler custom routing, null restore
- Convenience helpers: debugEvent, debugConnection, debugWarning
- formatDebugMessage formatting
- Source name resolution ("unknown" fallback, message.source override)

**Priority:** LOW

---

### Event Types (`src/events/event-types.ts`)
**Test Files:** N/A (pure type definitions)
**Coverage:** N/A

This file contains only TypeScript type definitions (SoundEventMap, BeatTrackEventMap, LayeredSoundEventMap). Types are verified implicitly through all event-related tests across the codebase.

**Priority:** N/A

---

### Audio Context (`src/audio-context.ts`)
**Test Files:** Tested via `index.test.ts`
**Coverage:** Good

**Tested Behaviors (via index.test.ts):**
- Singleton creation (getOrCreateAudioContext)
- unlockAudioContext event listener setup
- resume() called during unlock
- iOS workaround flag management
- AudioContext state handling (running, suspended, closed, interrupted)
- Lazy initialization via factory functions

**Missing Scenarios:**
- `_resetAudioContext()` (test utility, low priority)
- `markIosWorkaroundPerformed()` in isolation

**Priority:** LOW

---

## Cross-Cutting Tests

### Integration (`src/integration.test.ts`)
**Coverage:** Good
- Sound -> Effect -> Analyzer chain
- Effect/analyzer persistence through play/stop
- Multiple effects in chain order
- Soundfont workflow (Font -> getNote -> play)

### Concurrent (`src/concurrent.test.ts`)
**Coverage:** Good
- Overlapping plays (Sound and Track)
- Rapid seek coalescing
- Double stop no-op behavior
- Event firing for concurrent operations
- Play-after-stop recovery

### Index / Public API (`src/index.test.ts`)
**Coverage:** Good
- initAudio() singleton behavior
- getAudioContext() wrapper
- iOS workaround flag management
- Error handling (interrupted state)
- Lazy AudioContext initialization via factories
- unlockAudioContext event listeners

---

## High-Priority Gap Summary

| # | Gap | Priority | Rationale |
|---|-----|----------|-----------|
| 1 | `timeout.ts` - zero test coverage | HIGH | Critical timing infrastructure for Beat, BeatTrack, BaseSound. Custom RAF-based timer management with task scheduling. |
| 2 | `equal-power-crossfade.ts` - zero test coverage | HIGH | Shared math utility for all effect wet/dry mixing. Simple but correctness-critical. |
| 3 | `beat.ts` - weak coverage (4 tests / 6 methods) | HIGH | `playIfActive()` and `playInIfActive()` are the primary methods used by BeatTrack scheduler. `currentTimeIsPlaying` flag is untested. |
| 4 | `play-together.ts` - zero test coverage | MEDIUM | Public API for synchronized playback. Simple function but no verification of timing correctness. |
| 5 | `base-sound.ts` - timing methods untested | MEDIUM | `playFor()`, `playInAndStopAfter()`, `stopIn()`, `stopAt()` with future timestamps. `changeGainTo()` validation. `percentGain` getter. |
| 6 | `oscillator.ts` - filter chain untested | MEDIUM | `addFilter()`, filter wiring, anti-click fade-out behavior. |
| 7 | `oscillator-controller.ts` - frequency ramp untested | MEDIUM | `onPlayRamp` for frequency parameter is a common synthesis pattern. |
| 8 | `sound-controller.ts` - simultaneous param scheduling | LOW | Multiple parameter types scheduled simultaneously. |

---

## Recommendations

1. **Immediate:** Write unit tests for `timeout.ts` (setTimeout, clearTimeout, concurrent tasks, fallback, RAF lifecycle) and `equal-power-crossfade.ts` (bypass, mix values 0/0.5/1, formula verification).

2. **Short-term:** Expand `beat.test.ts` to cover `playIfActive()`, `playInIfActive()`, `currentTimeIsPlaying`, and `active` property interactions. These are the most-used methods in production (via BeatTrack scheduler).

3. **Short-term:** Add `play-together.test.ts` covering empty array, multiple playables, and audioContext discovery.

4. **Medium-term:** Add targeted tests for BaseSound timing methods (`playFor`, `playInAndStopAfter`, `stopIn` with delays) and parameter validation (`changeGainTo` negative error, >1 warning).

5. **Medium-term:** Test Oscillator `addFilter()` and filter chain wiring to verify audio graph construction.

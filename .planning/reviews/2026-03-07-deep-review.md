# Deep Review -- EZ Web Audio
## 2026-03-07 | Mode: Mid-build | Scope: Delta since 2026-02-28 (M5 Effects & Transport, M6 DX & Discoverability)

---
status: final
user_decision: act on all findings
---

> **How to use this report:** Start with the Proposed Action Plan -- each grouping is self-contained. Read Critical/High Findings for evidence and context. Structural Patterns identify root causes spanning multiple findings.

### Meta
- Lenses activated: Architecture, Performance, Testing, Product/DX, Documentation
- Skills referenced: None project-level
- Files examined: ~72 files across 5 domain reviewers
- Review duration: ~2 minutes (parallel dispatch)
- Spot-checked: 7 critical/high findings verified, 1 false positive removed

---

## Critical Findings

None.

---

## High Findings

### H1: PolySynth `released` state is unreachable -- voice stealing code is dead

- **severity**: high
- **file**: src/poly-synth.ts:453-455
- **lens**: Architecture / Bug-in-working-code
- **what**: `onVoiceStopped` sets `entry.state = 'released'` then immediately sets `entry.state = 'available'` on the next line, making the `'released'` state unreachable.
- **why**: `stealLRU()` at line 530-537 filters for `state === 'released'` to prefer stealing releasing voices over active ones. Since no voice ever reaches `'released'`, this code path is dead and the three-state model is effectively two-state.
- **fix**: Schedule the `'available'` transition after envelope release duration (e.g., `setTimeout(() => entry.state = 'available', releaseDurationMs)`), or use the oscillator's `end` event for that transition.

### H2: Transport uses `(track as any)` to access BeatTrack internals

- **severity**: high
- **file**: src/transport.ts:333, 402, 405-406
- **lens**: Architecture
- **what**: Transport casts to `any` to access `_syncNoteType` and `_scheduleBeatFromTransport` on BeatTrack, bypassing TypeScript's type system.
- **why**: No compile-time protection if these private members are renamed or removed. This is a fragile implicit contract between two core classes.
- **fix**: Define a `SyncableBeatTrack` interface with these methods and use it in `SyncedTrackState` instead of `any`.

### H3: GrainPlayer overlap has no upper bound -- can cause 1000+ grains/sec

- **severity**: high
- **file**: src/grain-player.ts:422-424
- **lens**: Performance
- **what**: The `overlap` setter has no validation. Setting `overlap >= grainSize` causes `getHopSize()` to return the floor of 0.001s, scheduling ~1000 grains per second.
- **why**: At 0.001s hop with 0.05s lookahead, the while loop creates ~50 BufferSourceNode + GainNode pairs per tick, potentially freezing the audio thread and exhausting memory.
- **fix**: Clamp overlap in the setter to `Math.min(value, this._grainSize - 0.001)` or throw. Also add a `MAX_GRAINS_PER_TICK` cap in the scheduling loop.

### H4: LFO `syncLifecycle` stops ALL connections when one target stops

- **severity**: high
- **file**: src/lfo.ts:227-230
- **lens**: Architecture / Bug-in-working-code
- **what**: When `syncLifecycle: true`, the `stop` listener calls `this.stop()`, which stops the entire LFO oscillator -- not just the connection to that specific target.
- **why**: Users connecting one LFO to multiple sounds with `syncLifecycle` will experience unexpected global stops. Multi-connection LFO use is explicitly supported (tests confirm it).
- **fix**: Either (a) document that `syncLifecycle` should only be used with single-target LFOs, or (b) disconnect/reconnect the depthGain per-connection rather than globally stopping the oscillator.

### H5: `crossfade()` afterFade 'continue' and 'stop' options are untested

- **severity**: high
- **file**: src/utils/crossfade.test.ts (missing tests)
- **lens**: Testing
- **what**: Only default `afterFade: 'pause'` is tested. The `'continue'` and `'stop'` code paths (crossfade.ts:127-133) have zero coverage.
- **why**: These are distinct code paths. The `'stop'` path also uses `await` inside a `setTimeout` callback -- a tricky pattern that deserves verification.
- **fix**: Add tests for each `afterFade` option verifying the correct behavior (continue: gain=0 but playing, stop: stopped and gain reset, pause: paused and gain reset).

### H6: BeatTrack.setPattern() has zero test coverage

- **severity**: high
- **file**: src/beat-track.test.ts (missing tests)
- **lens**: Testing
- **what**: `setPattern()` (beat-track.ts:211-217) is a primary DX feature with no tests at all.
- **why**: Edge cases (shorter array, longer array, boolean values, chaining) are unverified. This API is documented and exported.
- **fix**: Add tests for: basic pattern setting, short/long arrays, boolean values, chaining with playActiveBeats.

### H7: GrainPlayer and PolySynth `update().as()` ignores RatioType

- **severity**: high
- **file**: src/grain-player.ts:470, src/poly-synth.ts:612-621
- **lens**: Architecture / Bug-in-working-code
- **what**: Both `update()` implementations accept a `RatioType` parameter in `.as(method)` but ignore it entirely, always using `setValueAtTime(value, ...)` with the raw value.
- **why**: Users calling `.update('gain').to(-6).as('decibels')` will get -6 set as a raw gain value instead of being converted. This is a silent correctness bug inconsistent with how `update` works on BaseSound via the controller pattern.
- **fix**: Implement the same ratio/inverseRatio/percent/decibels conversion from `BaseParamController`, or extract conversion logic into a shared utility.

---

## Tension Resolutions

### T1: GrainPlayer not extending BaseSound

**Tension**: Architecture wants GrainPlayer to follow the class hierarchy (extend BaseSound). Performance/reality notes that granular synthesis has N simultaneous sources, making the single-source BaseSound model inappropriate.

**Resolution**: Acceptable as-is. GrainPlayer's multi-source topology genuinely doesn't fit BaseSound. However, the `update().as()` bug (H7) is a direct consequence of reimplementing the fluent API without the conversion logic. The fix is to share the conversion utility, not to force inheritance. Document the architectural decision in the class JSDoc.

---

## Structural Patterns

### Pattern: Inconsistent event system implementations

- **Symptoms**: Transport and Sequence implement their own `EventTarget`-based event systems manually, while PolySynth/BaseSound/LFO use `TypedEventEmitter`. Three different event patterns across M5 classes.
- **Root cause**: Transport and Sequence were built before the project standardized on TypedEventEmitter, or they were written by different sessions without cross-referencing.
- **Instance-level fix**: Refactor Transport and Sequence to extend TypedEventEmitter.
- **Structural fix**: Same -- migrate to TypedEventEmitter. Add a lint rule or convention check.
- **Recommendation**: USE THE STRUCTURAL FIX. The manual EventTarget implementations duplicate ~50 lines of boilerplate each and lose type safety. TypedEventEmitter already exists and is well-tested.

### Pattern: Missing dispose() overrides in effects

- **Symptoms**: CompressorEffect, DistortionEffect, EQEffect, FilterEffect do not override `dispose()` to disconnect their internal audio nodes. Only DelayEffect and ReverbEffect have proper dispose.
- **Root cause**: BaseEffect.dispose() only cleans up the shared routing nodes (input, output, dryGain, wetGain). Each subclass must also disconnect its own effect-specific nodes, but this contract is implicit -- there's no abstract method or documentation enforcing it.
- **Instance-level fix**: Add dispose() overrides to each missing effect.
- **Structural fix**: Add a comment or abstract method to BaseEffect making the subclass disposal contract explicit. Consider a `protected abstract getEffectNodes(): AudioNode[]` that BaseEffect.dispose() can iterate.
- **Recommendation**: Instance fixes are sufficient because the effect hierarchy is small and stable. Add a comment to BaseEffect documenting the requirement.

### Pattern: Fluent API reimplementation without conversion logic

- **Symptoms**: GrainPlayer.update() and PolySynth.update() both reimplement the `.to().as()` fluent pattern but skip the RatioType conversion. The bug is identical in both files.
- **Root cause**: These classes don't use BaseParamController, so they hand-rolled the fluent API without the conversion switch statement. No shared utility exists for the conversion.
- **Instance-level fix**: Copy the conversion logic into both classes.
- **Structural fix**: Extract a `convertValue(value, method: RatioType): number` utility function and use it in BaseParamController, GrainPlayer, and PolySynth.
- **Recommendation**: USE THE STRUCTURAL FIX. A 10-line utility prevents this bug from recurring in future classes that implement update().

---

## Medium Findings

### M1: Sequence same-beat scheduling drops events

- **severity**: medium
- **file**: src/sequence.ts:248
- **lens**: Performance / Bug-in-working-code
- **what**: The condition `eventBeat > this.lastScheduledBeat` means two events at the same beat fire only the first one, since `lastScheduledBeat` is set to `eventBeat` after scheduling.
- **fix**: Track scheduled events per pass with a Set, or use `>=` with dedup logic.

### M2: PolySynth orphaned event listeners on rapid reactivation

- **severity**: medium
- **file**: src/poly-synth.ts:458-459
- **lens**: Performance / Memory
- **what**: Each `activateVoice` registers new `once('stop')` and `once('end')` listeners without cleaning up listeners from previous activations if the voice was stolen mid-play.
- **fix**: Remove pending listeners before registering new ones, or use a generation counter for stale listener detection.

### M3: Sequence position reporting off by one loop iteration

- **severity**: medium
- **file**: src/sequence.ts:255
- **lens**: Bug-in-working-code
- **what**: `totalBeats` uses `loopIteration - 1` offset, making position one full loop behind in iterations 1+.
- **fix**: Use `this.loopIteration * this.lengthInBeats + eventBeat` or document positions as loop-relative.

### M4: GrainPlayer uses setTimeout instead of WorkerTimer

- **severity**: medium
- **file**: src/grain-player.ts:194
- **lens**: Architecture / Performance
- **what**: GrainPlayer uses `setTimeout` for scheduling while BeatTrack and Transport use `WorkerTimer` for background-tab resilience.
- **why**: Browsers throttle `setTimeout` to 1000ms in background tabs, causing gaps in grain playback.
- **fix**: Replace with WorkerTimer, consistent with BeatTrack and Transport.

### M5: MusicalTime ignores beatUnit from time signature

- **severity**: medium
- **file**: src/utils/musical-time.ts:127,134
- **lens**: Architecture / DX
- **what**: `parseMusicalTime` accepts `[beatsPerBar, beatUnit]` but only uses beatsPerBar. In 6/8 time, quarter note calculations are wrong.
- **fix**: Scale by `4 / beatUnit` or document that the function assumes quarter-note beats.

### M6: Effects missing dispose() for Compressor/Distortion/EQ/Filter

- **severity**: medium
- **file**: src/effects/compressor-effect.ts, distortion-effect.ts, eq-effect.ts, filter-effect.ts
- **lens**: Performance / Memory
- **what**: Four effect subclasses don't override dispose() to disconnect their internal audio nodes.
- **fix**: Add dispose() overrides matching the pattern in DelayEffect/ReverbEffect.

### M7: LFO depth baked at connection time

- **severity**: medium
- **file**: src/lfo.ts:503-526
- **lens**: DX
- **what**: `_calculateDepth` reads `audioParam.value` at connection time. If the user changes the target parameter later, modulation depth is stale.
- **fix**: Document this clearly in JSDoc. Consider recalculating depth on parameter changes as a future enhancement.

### M8: LFO tests don't verify actual depth values

- **severity**: medium
- **file**: src/lfo.test.ts
- **lens**: Testing
- **what**: Tests verify connections "don't throw" and `isRunning` is correct, but never assert the numeric depth calculation for ratio/cents/absolute modes.
- **fix**: Add tests that verify depthGain.gain.value for each depth mode.

### M9: AudioSprite end < start not validated

- **severity**: medium
- **file**: src/sprite.ts:262-269
- **lens**: DX
- **what**: Negative start is validated but `end < start` is not, allowing nonsensical sprite definitions.
- **fix**: Add validation for `end < start` with descriptive error message.

### M10: createFont(ctx) overload untested

- **severity**: medium
- **file**: src/index.test.ts (missing)
- **lens**: Testing
- **what**: Every other audio-loading factory has an explicit-context test, but createFont is missing.
- **fix**: Add test verifying createFont(ctx, url) uses provided context.

### M11: LayeredSound setGain/setPan bypasses output bus

- **severity**: medium
- **file**: src/layered-sound.ts:209-226
- **lens**: Architecture
- **what**: `setGain()` modifies each layer's individual gain rather than the shared `outputBus.gain`, overwriting per-layer gain settings.
- **fix**: Modify `outputBus.gain.value` for master control, preserving individual layer gains.

### M12: crossfade afterFade:stop uses async in setTimeout

- **severity**: medium
- **file**: src/utils/crossfade.ts:124
- **lens**: Architecture
- **what**: The `setTimeout` callback is async but setTimeout doesn't await it. Errors from `fromTrack.stop()` produce unhandled rejections.
- **fix**: Wrap the await in try-catch or restructure promise chaining.

### M13: crossfade doesn't restore _targetGain

- **severity**: medium
- **file**: src/utils/crossfade.ts:133-138
- **lens**: Bug-in-working-code
- **what**: After afterFade 'pause'/'stop', the raw AudioParam is reset to 1.0 but `_targetGain` (BaseSound's internal bookkeeping) stays stale.
- **fix**: Call `fromTrack.changeGainTo(1.0)` instead of directly manipulating the AudioParam.

### M14: PolySynth activeVoices getter scans array every access

- **severity**: medium
- **file**: src/poly-synth.ts:319-321
- **lens**: Performance
- **what**: `this.voices.filter(v => v.state === 'active').length` allocates a new array on every access.
- **fix**: Track as an incrementally maintained counter.

### M15: Transport tracks getter allocates + freezes on every access

- **severity**: medium
- **file**: src/transport.ts:170-172
- **lens**: Performance
- **what**: `Object.freeze([...this._syncedTracks])` on every getter call.
- **fix**: Cache the frozen array, invalidate on add/remove.

### M16: Docs -- M5 features missing from homepage and getting-started

- **severity**: medium
- **file**: docs/index.md, docs/guide/getting-started.md
- **lens**: Documentation / Completeness
- **what**: Homepage features list and comparison table don't mention Transport, PolySynth, GrainPlayer, LFO, or built-in effects. Getting-started has no mention of M5 factories.
- **fix**: Update homepage features, comparison table, and add M5 feature summary to getting-started.

### M17: Docs -- multiple-contexts guide has inaccuracies

- **severity**: medium
- **file**: docs/guide/multiple-contexts.md:102, 135-136
- **lens**: Documentation accuracy
- **what**: (a) `sinkId` in AudioContext constructor is wrong -- must use `ctx.setSinkId()`. (b) Table missing createLFO/createSequence exceptions and wrapEffect/createFilterEffect.
- **fix**: Fix sinkId example; add missing entries and exceptions to the reference table.

### M18: GrainPlayer dead code in loop offset handling

- **severity**: medium
- **file**: src/grain-player.ts:220-225
- **lens**: Architecture
- **what**: Offset is clamped before the loop check, making the `if (this._loop && offset > maxOffset)` branch unreachable.
- **fix**: Check loop before clamping, or remove dead branch.

---

## Low Findings

### L1: Transport scheduleAheadTime hardcoded (src/transport.ts:99)
### L2: PolySynth voice stealing glitch -- no gain ramp on stolen voice (src/poly-synth.ts:388)
### L3: Transport dispose doesn't prevent post-dispose on() calls (src/transport.ts:316)
### L4: No test for rapid interleaved play/stop in PolySynth (src/poly-synth.test.ts)
### L5: No test for live BPM change during Transport playback (src/transport.test.ts)
### L6: No test for Sequence.at() after dispose (src/sequence.test.ts)
### L7: WorkerTimer fallback warns on every start() (src/utils/worker-timer.ts:83)
### L8: MusicalTime 0m silently returns 0 (src/utils/musical-time.ts:86)
### L9: isMusicalTimeNotation accepts 0m (src/utils/musical-time.ts:174)
### L10: No test for 0t triplet (src/utils/musical-time.test.ts)
### L11: No GrainPlayer edge case tests -- overlap >= grainSize, boundary jitter (src/grain-player.test.ts)
### L12: GainEffect/EffectWrapper don't extend BaseEffect -- no dispose() (src/effects/gain-effect.ts, effect-wrapper.ts)
### L13: LFO S&H buffer allocated at full sample rate on every frequency change (src/lfo.ts:616)
### L14: ReverbEffect createReverb factory has 6 overloads with duck-typing (src/effects/reverb-effect.ts:349)
### L15: BaseEffect rampTo('mix') duplicates crossfade formula (src/effects/base-effect.ts:168)
### L16: BeatTrack.dispose() uses (sound as any).dispose() (src/beat-track.ts:692)
### L17: LayeredSound.dispose() uses raw CustomEvent instead of typed emit (src/layered-sound.ts:326)
### L18: CrossfadeOptions exported as value not type (src/index.ts:1383)
### L19: AudioSprite validates at play-time not creation-time (src/sprite.ts:262)
### L20: Howler manifest example misaligned with audiosprite example (docs/examples/audio-sprite.md:67)
### L21: No createSprite factory test with Howler manifest format (src/index.test.ts)
### L22: Docs -- no guide pages for Transport/Sequence/PolySynth/GrainPlayer/LFO (docs/.vitepress/config.mts)

---

## Proposed Action Plan

#### Grouping 1: Transport, Sequence & PolySynth Core Fixes
- **Goal**: Fix architectural bugs and type safety issues in the three new M5 orchestration classes
- **Findings addressed**:
  - H1: PolySynth released state unreachable (high)
  - H2: Transport `(as any)` casts to BeatTrack internals (high)
  - M1: Sequence same-beat scheduling drops events (medium)
  - M2: PolySynth orphaned listeners on rapid reactivation (medium)
  - M3: Sequence position off by one loop (medium)
  - M14: PolySynth activeVoices getter scans array (medium)
  - M15: Transport tracks getter allocates on every access (medium)
  - Structural pattern: Migrate Transport + Sequence to TypedEventEmitter
- **Fix approach**: Structural -- migrate to TypedEventEmitter, define SyncableBeatTrack interface, fix voice state machine.
- **Scope**: src/transport.ts, src/sequence.ts, src/poly-synth.ts, src/beat-track.ts (interface addition)
- **Effort**: medium
- **Dependencies**: None

#### Grouping 2: GrainPlayer Hardening
- **Goal**: Fix performance cliffs and architectural gaps in GrainPlayer
- **Findings addressed**:
  - H3: Overlap validation missing (high)
  - M4: setTimeout instead of WorkerTimer (medium)
  - M18: Dead code in loop offset (medium)
  - L2/L11: No grain cap, no edge case tests (low)
- **Fix approach**: Instance fixes -- add validation, cap, swap timer, remove dead code.
- **Scope**: src/grain-player.ts, src/grain-player.test.ts
- **Effort**: small
- **Dependencies**: None

#### Grouping 3: Effects & LFO Fixes
- **Goal**: Fix memory leaks, lifecycle bugs, and missing cleanup in effects system
- **Findings addressed**:
  - H4: LFO syncLifecycle stops all connections (high)
  - M6: Effects missing dispose() for 4 subclasses (medium)
  - M7: LFO depth baked at connection time (medium, docs-only fix)
  - L12: GainEffect/EffectWrapper no dispose (low)
  - L13: LFO S&H buffer allocation (low)
  - Structural pattern: Add disposal contract documentation to BaseEffect
- **Fix approach**: Instance fixes. Add dispose() overrides, fix LFO lifecycle, document depth behavior.
- **Scope**: src/effects/*.ts, src/lfo.ts
- **Effort**: small
- **Dependencies**: None

#### Grouping 4: Shared API Utilities & Crossfade
- **Goal**: Fix the fluent API conversion bug and crossfade state sync issues
- **Findings addressed**:
  - H7: update().as() ignores RatioType in GrainPlayer and PolySynth (high)
  - M11: LayeredSound setGain bypasses output bus (medium)
  - M12: crossfade async in setTimeout (medium)
  - M13: crossfade _targetGain desync (medium)
  - L18: CrossfadeOptions export type (low)
  - Structural pattern: Extract convertValue utility from BaseParamController
- **Fix approach**: Structural -- extract conversion utility. Instance fixes for crossfade and LayeredSound.
- **Scope**: src/utils/ (new), src/grain-player.ts, src/poly-synth.ts, src/layered-sound.ts, src/utils/crossfade.ts
- **Effort**: medium
- **Dependencies**: None

#### Grouping 5: Test Coverage Gaps
- **Goal**: Close testing gaps for new features and options
- **Findings addressed**:
  - H5: crossfade afterFade options untested (high)
  - H6: BeatTrack.setPattern() untested (high)
  - M8: LFO depth values not tested (medium)
  - M10: createFont(ctx) overload untested (medium)
  - L4-L6: Missing PolySynth/Transport/Sequence edge case tests (low)
  - L10-L11: Missing MusicalTime/GrainPlayer edge case tests (low)
  - L21: createSprite Howler format factory test (low)
- **Fix approach**: Instance fixes -- write the tests.
- **Scope**: test files only
- **Effort**: medium
- **Dependencies**: Groupings 1-4 should be done first (some tests verify fixed behavior)

#### Grouping 6: Documentation Sync
- **Goal**: Update docs to reflect M5 capabilities
- **Findings addressed**:
  - M16: Homepage and getting-started missing M5 features (medium)
  - M17: Multiple-contexts guide inaccuracies (medium)
  - M5: MusicalTime beatUnit docs (medium, partial)
  - L20: Howler example misaligned (low)
  - L22: No guide pages for M5 features (low)
- **Fix approach**: Instance fixes -- update existing docs pages.
- **Scope**: docs/ only
- **Effort**: medium
- **Dependencies**: None (can run parallel with code fixes)

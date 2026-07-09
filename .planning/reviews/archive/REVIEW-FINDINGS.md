# Code Review Findings — Pre-1.0.0 Final Check

**Date:** 2026-02-20
**Reviewers:** 7 parallel code-reviewer agents (Claude Opus 4.6)
**Scope:** Full project — library source, tests, docs, demos, package quality

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 9 |
| HIGH | 17 |
| MEDIUM | 27 |
| LOW | 18 |
| **Total** | **71** |

**Cross-agent duplicates (highest-confidence issues):**
- Response cache fragility (Agent 1 + Agent 2)
- DrumMachineVue BPM setTimeout hack (Agent 4 + Agent 5)
- Missing AudioSprite/crossfade/playTogether examples (Agent 4 + Agent 5)
- rewireEffects() confusion (Agent 4 + Agent 5)
- Missing type exports (Agent 6, confirmed by Agent 4 docs gaps)
- timeout.ts zero test coverage (Agent 3, corroborated by Agent 2 timing concerns)

---

## Critical Issues

### C-1. README Says "WORK IN PROGRESS"
**Source:** Agent 6 | **File:** README.md:3
**Category:** Package / Release Blocker
Line 3: `_Note: THIS IS A WORK IN PROGRESS! Not ready for use!!_`. This is the npm landing page.

### C-2. README Is a 31-Line Placeholder
**Source:** Agent 6 | **File:** README.md
**Category:** Package / Release Blocker
No installation instructions, no code examples, no feature list, no docs links, no badges. The only content is a "Release Process" section for maintainers.

### C-3. Five Public Types Not Exported
**Source:** Agent 6 | **File:** src/index.ts:714-734
**Category:** TypeScript DX / Release Blocker
Missing from exports: `BeatTrackOptions`, `SamplerOptions`, `TimeObject`, `RatioType`, `SeekType`. Users cannot type variables for return values or parameters.

### C-4. Track.seek() Race Condition
**Source:** Agent 1 | **File:** src/track.ts:260-280
**Category:** Bug / Race Condition
`stop()` is async but not awaited during seek. Track's `stop()` resets `startOffset = 0`, which can overwrite the seek target if the async stop resolves after the new offset is set.

### C-5. Connectable Interface Signature Mismatch
**Source:** Agent 1 | **File:** src/interfaces/connectable.ts:13
**Category:** Bug / API Design
`update` has an extra `value: number` parameter that doesn't match `BaseSound.update(type)`. Interface contract is violated.

### C-6. Docs: percentPlayed Shows 0-1 but Returns 0-100
**Source:** Agent 4 | **Files:** docs/guide/concepts.md:67,95 | docs/examples/basic-playback.md:54,132,179
**Category:** Incorrect Documentation
Multiple docs show `percentPlayed // 0.25 (25%)` but actual return is `25`. Progress bar example does `percentPlayed * 100` producing 2500.

### C-7. Docs: createAnalyzer() Missing Required AudioContext Parameter
**Source:** Agent 4 | **File:** docs/examples/visualization.md:57,147
**Category:** Incorrect Documentation
Calls `createAnalyzer({ fftSize: 1024 })` but signature requires AudioContext as first param.

### C-8. Docs: Wrong FilterEffect Property Access Pattern
**Source:** Agent 4 | **File:** docs/examples/ambient-generator.md:69,93
**Category:** Incorrect Documentation
Uses `lowpass.frequency.value = 1200` (wrong) instead of `lowpass.frequency = 1200` (setter). Also uses uppercase `Q` instead of lowercase `q`.

### C-9. Docs: API Reference JSDoc Uses Old Signature with AudioContext
**Source:** Agent 4 | **Files:** docs/api/classes/Sound.md:451 | docs/api/classes/Track.md:510
**Category:** Incorrect Documentation (originates in src/base-sound.ts JSDoc)
`addEffect()` example shows `createFilterEffect(audioContext, 'lowpass', ...)` — the old overload.

---

## High Priority

### H-1. Sound.setup() onended Overwritten by playAt()
**Source:** Agent 1 | **File:** src/sound.ts:87-95, src/base-sound.ts:946-959
**Category:** Bug
Cleanup handler in `setup()` that disconnects AudioBufferSourceNode is replaced by `playAt()`'s handler. Nodes may not disconnect after natural completion.

### H-2. Track._onPlaybackStarted() Breaks 'end' Event
**Source:** Agent 1 | **File:** src/track.ts:89-92
**Category:** Bug
Track replaces BaseSound's onended handler with one that calls `stop()`. Track never emits 'end' events — only 'stop'.

### H-3. Oscillator Leaks Old GainNode on Each play()
**Source:** Agent 1 | **File:** src/oscillator.ts:238-239
**Category:** Memory Leak
`setup()` replaces `this.gainNode` before the old one is disconnected.

### H-4. Track.resume() No-Op if Paused at Position 0
**Source:** Agent 1 | **File:** src/track.ts:161
**Category:** Edge Case
Guard `!this._isPlaying && this.startOffset > 0` fails if pause happens before first RAF updates offset.

### H-5. playBeats() and playActiveBeats() Are Identical
**Source:** Agent 2 | **File:** src/beat-track.ts:165,196
**Category:** Bug
Both methods set the same state and call `scheduler()` which always uses `beat.playInIfActive()`. No code path plays all beats unconditionally.

### H-6. BeatTrack resume() Uses Stale nextBeatTime
**Source:** Agent 2 | **File:** src/beat-track.ts:280-296
**Category:** Timing Bug
After long pause, scheduler catches up by firing hundreds of beats in one frame.

### H-7. SampledDrumKit.vue Cleanup Is a No-Op
**Source:** Agent 5 | **File:** docs/.vitepress/theme/components/SampledDrumKit.vue:100-113
**Category:** Bug / Cleanup
Calls `sampler.stop()` but Sampler has no `stop()` method. Silently fails in try/catch.

### H-8. DrumMachineVue.vue BPM Watcher Uses setTimeout Instead of setTempo
**Source:** Agent 5 + Agent 4 | **File:** docs/.vitepress/theme/components/DrumMachineVue.vue:166-174
**Category:** Bug
Creates audible gap. BeatTrack has `setTempo(bpm)` for live tempo changes.

### H-9. Effects Page Contradicts Concepts Page on rewireEffects()
**Source:** Agent 4 | **Files:** docs/examples/effects.md:224 vs docs/guide/concepts.md:278
**Category:** Incorrect Documentation
Effects page shows manual `rewireEffects()` after bypass. Concepts page implies automatic.

### H-10. E2E Tests Have Zero Interaction Testing
**Source:** Agent 7 | **File:** e2e/demos.spec.ts
**Category:** E2E Gap
All 15 tests: navigate, wait 3s, check for JS errors. No button clicks, beat toggles, or DOM verification.

### H-11. Integration Tests Cover Only 2 of ~10 Module Combinations
**Source:** Agent 7 | **File:** src/integration.test.ts
**Category:** Integration Gap
Only Sound+Effect/Analyzer and Font workflows tested. Missing: Track+effects, Oscillator+filters, BeatTrack+effects, Sampler, crossfade, LayeredSound, AudioSprite, preload cache.

### H-12. package.json Missing homepage and bugs Fields
**Source:** Agent 6 | **File:** package.json
**Category:** Package Config
No "Homepage" or "Issues" links on npm page.

### H-13. Keywords Missing Major Features
**Source:** Agent 6 | **File:** package.json:17-27
**Category:** Package Config
Missing: drum-machine, synthesizer, soundfont, audio-sprite, beat, rhythm, filter, sampler, envelope, effects, typescript.

### H-14. Publish CI Does Not Run Lint
**Source:** Agent 6 | **File:** .github/workflows/publish.yml
**Category:** CI

### H-15. Docs Deploy CI Runs Zero Quality Checks
**Source:** Agent 6 | **File:** .github/workflows/deploy-docs-site.yml
**Category:** CI

### H-16. No main Field in package.json
**Source:** Agent 6 | **File:** package.json
**Category:** Package Config
Older tools fall back to `main` when `exports` isn't supported.

### H-17. Missing async Keyword in Synth Keyboard Doc Example
**Source:** Agent 4 | **File:** docs/examples/synth-keyboard.md:74
**Category:** Incorrect Documentation
`function playNote()` uses `await` but isn't declared `async`.

---

## Medium Priority

### Source Code Issues

**M-1.** exponentialRampToValueAtTime with value 0 throws RangeError (Agent 1, src/controllers/base-param-controller.ts:315) — Common pattern `onPlaySet('gain').to(0).endingAt(2)` will fail since default ramp is exponential.

**M-2.** Oscillator filter options not validated (Agent 1, src/oscillator.ts:171-180) — Negative frequencies, NaN, Infinity silently passed through.

**M-3.** unlockAudioContext listeners never cleaned up on desktop (Agent 1, src/audio-context.ts:51-69) — If `resume()` succeeds without gesture, listeners stay on `document.body`.

**M-4.** AudioSprite has no stop() for looping sprites (Agent 2, src/sprite.ts:141-191) — Looping sprites leak AudioNodes.

**M-5.** onPlaySet accumulates rather than replaces same-parameter schedules (Agent 2, src/controllers/base-param-controller.ts:216-233) — Multiple conflicting ramps on same parameter.

**M-6.** OscillatorController doesn't support detune/pan in scheduled values (Agent 2, src/controllers/oscillator-controller.ts:75-89) — Immediate `update()` supports them but `onPlaySet`/`onPlayRamp` don't.

**M-7.** SoundController doesn't support pan in scheduled values (Agent 2, src/controllers/sound-controller.ts:38-67) — Same inconsistency.

**M-8.** mungeSoundFont fails silently on malformed input (Agent 2, src/utils/decode-base64.ts:31-41) — Produces garbage or unhelpful SyntaxError.

**M-9.** LayeredSound setupLayerEndTracking leaks listeners on repeated play() (Agent 2, src/layered-sound.ts:168-191) — Old listeners fire spurious 'end' events.

**M-10.** crossfade uses native setTimeout for completion (Agent 2, src/utils/crossfade.ts:91-98) — Throttled in backgrounded tabs.

**M-11.** playAt() sets _isPlaying after emitting 'play' event (Agent 1, src/base-sound.ts:932-969) — Event listeners see `isPlaying = false` in play handler.

**M-12.** Sampler gain/pan not validated (Agent 1, src/sampler.ts:49-55) — `sampler.gain = -1` silently propagates, throws at play time.

**M-13.** Response cache pattern is fragile (Agent 1 + Agent 2, src/preload.ts + src/index.ts) — Storing Response before clone; future changes could break caching.

### Demo Issues

**M-14.** PianoKeyboard touchmove doesn't handle sliding between keys (Agent 5, PianoKeyboard.vue:103-109) — Stuck notes on mobile.

**M-15.** AmbientGenerator filter frequency assignment needs verification (Agent 5, AmbientGenerator.vue:168-173) — May not proxy correctly.

**M-16.** FilterDemo calls rewireEffects() manually — confusing for users (Agent 5, FilterDemo.vue:114).

**M-17.** Multiple demos lack aria-labels on sliders (Agent 5 — AmbientGenerator, VisualizationDemo, DrumMachine play button).

**M-18.** SynthKeyboard/XYPad volume warnings use emoji announced inconsistently by screen readers (Agent 5).

### Documentation Issues

**M-19.** Missing docs: AudioSprite/createSprite (Agent 4) — Zero narrative docs or examples.

**M-20.** Missing docs: crossfade utility (Agent 4) — No interactive example.

**M-21.** Missing docs: playTogether utility (Agent 4) — No interactive example.

**M-22.** Missing docs: useInteractionMethods/preventEventDefaults (Agent 4) — Not mentioned in any guide.

**M-23.** Missing docs: clearPreloadCache (Agent 4) — Never shown in examples.

**M-24.** Missing docs: Debug utilities expanded (Agent 4) — No sample output shown.

**M-25.** Missing docs: Envelope class standalone (Agent 4).

### Test/E2E Issues

**M-26.** E2E uses hardcoded waitForTimeout(3000) (Agent 7) — Fragile on CI.

**M-27.** No cleanup/dispose pattern tested (Agent 7) — No tested way to release resources.

---

## Low Priority / Polish

**L-1.** preventEventDefaults/useInteractionMethods leak listeners (Agent 1, src/index.ts) — No cleanup function returned.

**L-2.** Playable interface methods return void instead of Promise<void> (Agent 1, src/interfaces/playable.ts).

**L-3.** Track.seek() emits event even when position unchanged (Agent 1, src/track.ts:274).

**L-4.** Beat.playIn() doesn't schedule reset of isPlaying/currentTimeIsPlaying flags (Agent 2, src/beat.ts:94-103).

**L-5.** playTogether uses `(p as any).audioContext` duck-typing (Agent 2, src/utils/play-together.ts:32-35).

**L-6.** GainEffect uses linear interpolation vs equal-power for mix (Agent 2, src/effects/gain-effect.ts:96-98).

**L-7.** Font.getNote is O(n) linear search (Agent 2, src/font.ts:48-50).

**L-8.** AudioSprite doesn't validate sprite boundaries (Agent 2, src/sprite.ts).

**L-9.** prop-access.ts has 80 lines of commented-out code (Agent 2, src/utils/prop-access.ts).

**L-10.** XYPad height fallback uses clientWidth (Agent 5, XYPad.vue:46).

**L-11.** Multiple demos use `any` types for library instances (Agent 5 — all components).

**L-12.** SoundfontPiano cleanup doesn't stop playing notes (Agent 5, SoundfontPiano.vue:64-75).

**L-13.** SoundController/OscillatorController not exported (Agent 6, src/index.ts).

**L-14.** Player interface not exported (Agent 6, src/index.ts:572-575).

**L-15.** ESM-only not documented for consumers (Agent 6).

**L-16.** createSprite/createLayeredSound JSDoc missing TypeScript fences (Agent 6, src/index.ts).

**L-17.** No mobile viewport testing in Playwright (Agent 7).

**L-18.** Homepage code snippet could show more depth (Agent 4, docs/index.md).

---

## Test Coverage Gaps (Prioritized)

| # | Module | Coverage | Priority | Rationale |
|---|--------|----------|----------|-----------|
| T-1 | `src/utils/timeout.ts` | None | HIGH | Critical timing infrastructure for Beat, BeatTrack, BaseSound. Custom RAF+audioContext timer. |
| T-2 | `src/utils/equal-power-crossfade.ts` | None | HIGH | Shared math for all effect wet/dry mixing. |
| T-3 | `src/beat.ts` | Weak (4/6 methods) | HIGH | `playIfActive()`/`playInIfActive()` untested — primary BeatTrack scheduler methods. |
| T-4 | `src/utils/play-together.ts` | None | MEDIUM | Public API for synchronized playback. |
| T-5 | `src/base-sound.ts` timing methods | Partial | MEDIUM | `playFor()`, `playInAndStopAfter()`, `stopIn()`, `stopAt()` untested. |
| T-6 | `src/oscillator.ts` filter chain | Partial | MEDIUM | `addFilter()`, filter wiring, anti-click fade-out. |
| T-7 | `src/controllers/oscillator-controller.ts` | Partial | MEDIUM | Frequency ramp scheduling untested. |
| T-8 | Integration: Track+effects | None | MEDIUM | Most common real-world pattern. |
| T-9 | Integration: error propagation | None | MEDIUM | Factory function error paths untested. |
| T-10 | E2E: interaction smoke tests | None | HIGH | Zero UI interaction testing across all demos. |

---

## Missing Documentation

| Feature | Current State | Priority |
|---------|--------------|----------|
| AudioSprite / createSprite | Zero narrative docs, no example | HIGH |
| crossfade utility | Brief mention in concepts | HIGH |
| playTogether utility | Brief mention in concepts | HIGH |
| useInteractionMethods / preventEventDefaults | Not mentioned anywhere | MEDIUM |
| clearPreloadCache | Never shown in examples | MEDIUM |
| Debug utilities (expanded) | 12 lines in concepts, no sample output | LOW |
| Envelope class standalone | Only implicit via createOscillator | LOW |
| iOS & Mobile Audio guide | No dedicated guide | LOW |
| Framework Integration (React/Svelte) | Only Vue examples exist | LOW |

---

## Proposed Fix Phases

### Phase A: Source Code Fixes (Bugs, API Issues, Missing Exports)
- C-3: Export missing types (BeatTrackOptions, SamplerOptions, TimeObject, RatioType, SeekType)
- C-4: Fix Track.seek() race condition
- C-5: Fix Connectable interface signature
- H-1: Merge onended cleanup into playAt() handler
- H-2: Fix Track 'end' event emission
- H-3: Disconnect old GainNode in Oscillator.setup()
- H-4: Fix Track.resume() at position 0
- H-5: Fix playBeats/playActiveBeats duplication
- H-6: Fix BeatTrack resume() stale nextBeatTime
- M-1: Handle exponential ramp to zero
- M-4: Add stop() for looping AudioSprite
- M-5: Deduplicate onPlaySet same-parameter schedules
- M-6, M-7: Add detune/pan support to controller scheduled values
- M-8: Validate soundfont input
- M-9: Fix LayeredSound listener leak
- M-11: Set _isPlaying before emitting 'play'
- M-13: Harden response cache pattern

### Phase B: Test Coverage Gaps
- T-1: timeout.ts tests
- T-2: equal-power-crossfade.ts tests
- T-3: beat.ts expanded tests
- T-4: play-together.ts tests
- T-5: BaseSound timing method tests
- T-6: Oscillator filter chain tests
- T-7: OscillatorController frequency ramp tests
- T-8: Integration tests for Track+effects, BeatTrack+effects
- T-9: Factory function error propagation tests

### Phase C: Documentation & Guide Fixes
- C-6: Fix percentPlayed values throughout docs
- C-7: Fix createAnalyzer() calls in visualization.md
- C-8: Fix FilterEffect property access in ambient-generator.md
- C-9: Fix addEffect() JSDoc in base-sound.ts (regenerate API docs)
- H-9: Resolve rewireEffects() contradiction
- H-17: Fix missing async in synth-keyboard.md
- M-19-M-25: Add missing documentation coverage

### Phase D: Demo Component Fixes + New Example Pages
- H-7: Fix SampledDrumKit cleanup
- H-8: Fix DrumMachineVue BPM watcher
- M-14: Fix PianoKeyboard touch sliding
- M-15: Verify AmbientGenerator filter assignment
- M-16: Clarify FilterDemo rewireEffects usage
- M-17, M-18: Add aria-labels, fix emoji accessibility
- New examples: AudioSprite, Crossfade, playTogether

### Phase E: Package Quality & Release Readiness
- C-1, C-2: Write proper README
- H-12: Add homepage/bugs to package.json
- H-13: Expand keywords
- H-14: Add lint to publish CI
- H-15: Add quality checks to docs deploy CI
- H-16: Add main field to package.json
- L-13, L-14: Export SoundController, OscillatorController, Player
- L-15: Document ESM-only

### Phase F: E2E & Integration Test Expansion
- H-10: Add interaction E2E smoke tests
- H-11: Add multi-module integration tests
- T-10: E2E interaction coverage
- M-26: Replace hardcoded waits with condition-based
- L-17: Add mobile viewport to Playwright

---

## Deduplication Notes

Issues flagged by multiple agents (highest confidence):

1. **Response cache fragility** — Agent 1 (core) + Agent 2 (features) both flagged the clone-before-consume pattern
2. **DrumMachineVue BPM setTimeout** — Agent 4 (docs) + Agent 5 (demos) both identified
3. **Missing AudioSprite/crossfade/playTogether examples** — Agent 4 (docs completeness) + Agent 5 (missing demos)
4. **rewireEffects() confusion** — Agent 4 (docs contradiction) + Agent 5 (FilterDemo calling it manually)
5. **Missing type exports** — Agent 6 (TypeScript audit) confirmed by Agent 4 (docs can't reference these types)
6. **timeout.ts zero coverage** — Agent 3 (test audit) corroborated by Agent 2 (timing concerns in BeatTrack)
7. **Beat.playIn() flag reset** — Agent 2 (feature review) + Agent 3 (test gap)

# Requirements: EZ Audio — Deep Review Hardening

**Defined:** 2026-02-26
**Core Value:** Make the Web Audio API easy to use
**Source:** `.planning/reviews/2026-02-26-deep-review.md`

## Requirements

28 findings from the 2026-02-26 deep review, filtered to exclude 4 already-fixed/intentionally-kept items (H2, M7, M9, L5).

### Ship-Blocker

- [ ] **SHIP-01**: Published type declarations do not import test-only dependencies (`standardized-audio-context-mock` removed from `ContextLike` in `timeout.ts`)

### Safety & Correctness

- [ ] **SAFE-01**: Fire-and-forget play methods (`playFor`, `playIn`, `playInAndStopAfter`, `Sampler.play`, `Track.resume`) handle rejected promises instead of discarding them
- [ ] **SAFE-02**: `dispose()` disconnects `audioSourceNode` and nullifies its `onended` handler
- [ ] **SAFE-03**: `BeatTrack` has a `dispose()` method that stops playback, disposes sounds, clears beats, and releases resources
- [ ] **SAFE-04**: `Track.percentPlayed` returns 0 when duration is 0 (no divide-by-zero)
- [ ] **SAFE-05**: `Track.seek()` guards against concurrent seeks overwriting `startOffset` (race condition fix)
- [ ] **SAFE-06**: `LayeredSound.play()` uses `Promise.allSettled()` so one layer failure doesn't abort all layers

### Export Cleanup

- [ ] **EXPORT-01**: `_disposeUnmute` is not a public export (removed from `export` or moved to testing entry point)
- [ ] **EXPORT-02**: `createFont` failure throws `AudioLoadError` (not plain `Error`); unknown oscillator note throws `InvalidNoteError`

### Performance

- [ ] **PERF-01**: Preload cache stores decoded `AudioBuffer` objects, avoiding redundant `decodeAudioData()` calls on cache hits
- [ ] **PERF-02**: `duration` getter has a lightweight numeric path (`durationRaw` or cached `TimeObject`) to avoid allocation in hot paths
- [ ] **PERF-03**: Scheduler `tick()` combines execute and filter into a single pass (no double iteration per frame)
- [ ] **PERF-04**: `audioContext.resume()` only called when `audioContext.state === 'suspended'` (not on every play)

### Documentation Fixes

- [ ] **DOCS-01**: Vibrato example in `docs/guide/parameter-control.md` either works correctly or has a caveat about consume-once semantics
- [ ] **DOCS-02**: README `await song.seek(30).as('seconds')` corrected — `seek().as()` returns void, not a Promise

### Test Strengthening

- [ ] **TEST-01**: `onPlaySet`/`onPlayRamp` tests verify scheduled values are applied during playback (not just no-throw)
- [ ] **TEST-02**: `Sound` class has dedicated `end` event test for natural playback completion
- [ ] **TEST-03**: Event listeners stop firing after `dispose()` is called (cleanup verification test)

### Build & Refactoring

- [ ] **BUILD-01**: Publish workflow verifies git tag matches `package.json` version before publishing
- [ ] **REFAC-01**: Gain-interception logic (`_targetGain` syncing) extracted into shared helper on BaseSound — not duplicated between `base-sound.ts` and `oscillator.ts`
- [ ] **REFAC-02**: Controller `applyValues`/`applyRampValues` shared logic extracted into `BaseParamController`
- [ ] **SAFE-07**: AudioContext replacement logs a warning when creating a new context after the previous one closed (orphaned sounds awareness)
- [ ] **DOCS-03**: Soundfont parsing documented as synchronous with potential UI freeze on mobile for large files (5-20MB)
- [ ] **SAFE-08**: `dispose()` clears event listeners (or documents that consumers must call `off()` before `dispose()`)
- [ ] **SAFE-09**: `LayeredSound` has a `dispose()` method that stops and disposes all layers
- [ ] **SAFE-10**: `changePanTo()` warns when value is outside [-1, 1] range
- [ ] **DX-01**: `createBeatTrack`/`createSampler` accept `AudioInput[]` (not just `string[]`) or document the limitation
- [ ] **PERF-05**: AudioSprite skips gain/panner node creation when at default values (gain=1, pan=0)
- [ ] **PERF-06**: Crossfade curve arrays cached at module level (mathematically constant, no regeneration per call)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New audio capabilities | This milestone is fixes and hardening only |
| Web Worker offloading for soundfont parsing | M14 recommends documenting the limitation for now |
| `contextchanged` event system | M5 only requires a console warning, not a full event system |
| `removeAllListeners()` on TypedEventEmitter | L1 can be addressed with documentation or basic cleanup in dispose |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHIP-01 | Phase 47 | Pending |
| SAFE-01 | Phase 48 | Pending |
| SAFE-02 | Phase 48 | Pending |
| SAFE-03 | Phase 48 | Pending |
| SAFE-04 | Phase 48 | Pending |
| SAFE-05 | Phase 48 | Pending |
| SAFE-06 | Phase 48 | Pending |
| EXPORT-01 | Phase 49 | Pending |
| EXPORT-02 | Phase 49 | Pending |
| PERF-01 | Phase 50 | Pending |
| PERF-02 | Phase 50 | Pending |
| PERF-03 | Phase 50 | Pending |
| PERF-04 | Phase 50 | Pending |
| DOCS-01 | Phase 51 | Pending |
| DOCS-02 | Phase 51 | Pending |
| TEST-01 | Phase 52 | Pending |
| TEST-02 | Phase 52 | Pending |
| TEST-03 | Phase 52 | Pending |
| BUILD-01 | Phase 53 | Pending |
| REFAC-01 | Phase 53 | Pending |
| REFAC-02 | Phase 53 | Pending |
| SAFE-07 | Phase 54 | Pending |
| SAFE-08 | Phase 54 | Pending |
| SAFE-09 | Phase 54 | Pending |
| SAFE-10 | Phase 54 | Pending |
| DOCS-03 | Phase 54 | Pending |
| DX-01 | Phase 54 | Pending |
| PERF-05 | Phase 54 | Pending |
| PERF-06 | Phase 54 | Pending |

**Coverage:**
- Requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation — all requirements mapped*

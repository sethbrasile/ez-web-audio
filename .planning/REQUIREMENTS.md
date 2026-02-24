# Requirements: EZ Audio

**Defined:** 2026-02-16
**Core Value:** Make the Web Audio API easy to use

## v1.0 Requirements — First Stable Release

**Defined:** 2026-02-16

Implement all deferred audit improvements, breaking API cleanup (free pre-1.0), dependency security upgrades, convenience APIs, defensive hardening, test expansion, and documentation updates. Ship as npm 1.0.0.

### Breaking API Changes

- [x] **API-01**: Fluent API `.from()` method renamed to `.as()` on `update().to()` and `seek()` chains
- [x] **API-02**: `ifActivePlayIn()` renamed to `playInIfActive()` for naming consistency with `playIfActive()`
- [x] **API-03**: `gainNode`, `pannerNode`, `effectChainInput` changed from public to protected on BaseSound
- [x] **API-04**: `startOffset` changed from public to protected on BaseSound (remains accessible on Track)
- [x] **API-05**: Deprecated `connections` API removed entirely (`addConnection`, `removeConnection`, `getConnection`, `getNodeFrom`, `connections` array)
- [x] **API-06**: Deprecated type aliases removed (`OscillatorOpts`, `OscillatorOptsFilterValues`) — only `OscillatorOptions` and `OscillatorFilterOptions` remain
- [x] **API-07**: Commented-out `stopAfter` removed from Playable interface

### DX Improvements

- [x] **DX-01**: Effect chain auto-rewires when `effect.bypass` is toggled (no manual `rewireEffects()` call needed)
- [x] **DX-02**: Effect factory functions (`createFilterEffect`, `createGainEffect`) work without requiring AudioContext argument (auto-create internally)
- [x] **DX-03**: `addEffects(effects[])` convenience method on BaseSound for batch effect addition
- [x] **DX-04**: `playTogether(playables[])` utility function syncs multiple sounds to same AudioContext start time
- [x] **DX-05**: `createSounds(urls[])` batch loader with progress events
- [x] **DX-06**: `getFilters()` accessor on Oscillator returns readonly filter nodes for advanced users
- [x] **DX-07**: `getSounds()` accessor on Sampler returns readonly sound list for inspection
- [x] **DX-08**: `ControlType` made extensible via mapped type for future parameter additions

### Defensive Code

- [x] **DEF-01**: Null checks added to effect/filter/sound iterations to prevent crashes from null entries
- [x] **DEF-02**: `addEffect()` position parameter validated (no negative values)
- [x] **DEF-03**: Sampler `play()` guards against empty sounds set with clear error
- [x] **DEF-04**: Controller parameter arrays cleared between plays to prevent memory leak
- [x] **DEF-05**: `unlockAudioContext` necessity documented with explanatory comment (resolves TODO)

### Dependency Security

- [x] **SEC-01**: happy-dom upgraded from 15.x to 20.6.1 (Phase 17-01)
- [x] **SEC-02**: vitest upgraded from 2.x to 4.0.18 (Phase 17-01)
- [x] **SEC-03**: vite upgraded from 5.x to 7.3.1 (Phase 17-01)
- [x] **SEC-04**: eslint upgraded from 9.x to 10.0.0 and @antfu/eslint-config from 2.x to 7.4.3 (Phase 17-02)
- [x] **SEC-05**: TypeScript upgraded from 5.6 to 5.9.3 (Phase 17-03)
- [x] **SEC-06**: Unused dependencies removed (@dotenvx/dotenvx, concurrently) (Phase 17-01)

### Test Coverage

- [x] **TEST-01**: Integration tests added for Sound→Effect→Analyzer chain and full soundfont workflow
- [x] **TEST-02**: `base-sound.test.ts` split by concern (events, effects, debug, analyzer)
- [x] **TEST-03**: Concurrent operation tests added (play while playing, rapid seek, double stop)

### Documentation

- [x] **DOC-01**: All JSDoc updated for renamed methods (`.from()` → `.as()`, `ifActivePlayIn` → `playInIfActive`)
- [x] **DOC-02**: Demo app Vue components updated for all API changes (protected properties, removed deprecated APIs, new convenience methods)
- [x] **DOC-03**: Guide pages (Getting Started, Core Concepts) updated with new convenience APIs and renamed methods
- [x] **DOC-04**: TypeDoc/API reference reflects new protected visibility and removed deprecated exports

## v1.0 Gap Closure Requirements — Code Review (2026-02-22)

Comprehensive 5-agent code review identified bugs, DX gaps, test coverage holes, and documentation issues.

### Critical Fixes (Phase 32)

- [ ] **FIX-01**: MIT LICENSE file exists at project root
- [ ] **FIX-02**: AudioSprite `loop: true` actually loops (duration arg not passed to `source.start()` when looping)
- [ ] **FIX-03**: `EnvelopeOptions` uses short ADSR property names (`attack`, `decay`, `sustain`, `release`)
- [ ] **FIX-04**: `Playable` interface return types match implementations (`Promise<void>` for async methods)
- [ ] **FIX-05**: Stale setTimeout cannot corrupt `_isPlaying` across play cycles
- [ ] **FIX-06**: `Sound` constructor `opts` parameter typed (not `any`)
- [ ] **FIX-07**: `createFont()` validates response status and handles fetch errors
- [ ] **FIX-08**: `CLAUDE.md` uses current API (`.as()` not `.from()`)
- [ ] **FIX-09**: Oscillator GainNode replacement documented or mitigated

### DX Convenience APIs (Phase 33)

- [x] **DX2-01**: `fadeIn(duration)` / `fadeOut(duration)` convenience methods on BaseSound
- [x] **DX2-02**: `loop` property on Sound and Track for native looping
- [x] **DX2-03**: `dispose()` cleanup method on BaseSound
- [x] **DX2-04**: `createAnalyzer()` overload without AudioContext parameter
- [x] **DX2-05**: `createOscillator({ note: 'A4' })` accepts note name
- [x] **DX2-06**: `BeatTrack.setPattern([1,0,1,0])` convenience method

### Test Gap Closure (Phase 34)

- [x] **TEST2-01**: Factory functions have dedicated tests including error paths
- [x] **TEST2-02**: Oscillator `frequency: 0` behavior consistent (contradiction resolved)
- [x] **TEST2-03**: `AudioSprite.stop()` and `stopAll()` tested
- [x] **TEST2-04**: `changeGainTo()` negative value and gain > 1 warning tested
- [x] **TEST2-05**: `getGainNode()` tested
- [x] **TEST2-06**: `addEffects()` happy path tested
- [x] **TEST2-07**: `BeatTrack.on()`/`.off()`/`.once()` tested
- [x] **TEST2-08**: `Envelope.estimateCurrentValue()` and `isActive` tested
- [x] **TEST2-09**: `Analyzer.fftSize` setter validation tested

### Documentation Expansion (Phase 35)

- [x] **DOC2-01**: AudioSprite interactive example page
- [x] **DOC2-02**: LayeredSound interactive example page
- [x] **DOC2-03**: Crossfade interactive demo page
- [x] **DOC2-04**: React integration example
- [x] **DOC2-05**: `concepts.md` split into focused pages
- [x] **DOC2-06**: `changeFrequencyTo()` corrected in synthesis.md
- [x] **DOC2-07**: `audio-routing.md` uses recommended `wrapEffect()` form
- [x] **DOC2-08**: Example pages have proper `<script setup>` imports
- [x] **DOC2-09**: Integration patterns listed on examples index page

### Documentation Sync (Phase 36)

- [x] **SYNC-01**: Every API method signature in guides matches implementation
- [x] **SYNC-02**: Every code example compiles against current TypeScript types
- [x] **SYNC-03**: TypeDoc API reference regenerated for Phase 32-33 changes
- [x] **SYNC-04**: CHANGELOG.md updated with Phase 32-35 changes

### Nice-to-Have DX (Phase 37)

- [x] **DX3-01**: `createSound()`/`createTrack()` accept ArrayBuffer, Blob, or File input
- [x] **DX3-02**: `createNoise('pink' | 'brown' | 'white')` factory
- [x] **DX3-03**: `volume` alias property for gain on BaseSound
- [x] **DX3-04**: `createTracks(urls[], onProgress?)` batch loader
- [x] **DX3-05**: Event detail `source` typed as union (not `unknown`)
- [x] **DX3-06**: `ControlType` narrowed per class
- [x] **DX3-07**: Event map types (`SoundEventType`, `BeatTrackEventMap`, etc.) exported
- [x] **DX3-08**: Event system `on/off/once/emit` extracted into shared mixin (DRY)
- [x] **DX3-09**: `onPlaySet()` schedule consumption behavior prominently documented

### Final Documentation Sync (Phase 38)

- [x] **SYNC2-01**: All Phase 37 APIs documented with examples
- [x] **SYNC2-02**: Every public export in `index.ts` mentioned in guides
- [x] **SYNC2-03**: Full lint + typecheck + test suite passes
- [x] **SYNC2-04**: CHANGELOG.md has complete Phase 32-38 record

### API Type Safety (Phase 41)

- [x] **TYPE-01**: `ParamController.updateAudioSource` typed as `(source: OscillatorNode | AudioBufferSourceNode) => void` (no `any`)
- [x] **TYPE-02**: `BaseSoundEventMap` (play, stop, end) and `TrackEventMap` (adds pause, resume, seek) exported as separate types; `SoundEventMap` retained as backward-compatible alias
- [x] **TYPE-03**: `Connectable.audioSourceNode` typed as `OscillatorNode | AudioBufferSourceNode` (not `AudioNode`)
- [x] **TYPE-04**: `Playable` interface expanded with `fadeIn`, `fadeOut`, `dispose` as optional members, or documented as minimal contract with JSDoc

### Source Code Correctness Bugs (Phase 42)

- [x] **BUG-01**: Oscillator.setup() preserves user-set gain across plays instead of resetting to defaultValue
- [x] **BUG-02**: Sound.setup() calls controller.updateAudioSource() so detune schedules apply to current source node
- [x] **BUG-03**: load() calls initAudio() before using AudioContext (fixes iOS silent first-play in cache-hit path)
- [x] **BUG-04**: load() and createSprite() call evictIfNeeded() after writing to responseCache
- [x] **BUG-05**: responseCache is not directly mutable by consumers — exposed through controlled access only

### Test Coverage Gaps (Phase 43)

- [x] **TCOV-01**: `setPreloadCacheLimit` and `evictIfNeeded()` have tests for setting limit, eviction when exceeded, limit of 0, reducing below current size
- [x] **TCOV-02**: `preventEventDefaults` and `useInteractionMethods` tested with DOM simulation — verify listeners registered and cleanup removes them
- [x] **TCOV-03**: `Sound.loop` property tested — default value, set/get, persistence through play/stop cycles
- [x] **TCOV-04**: `createOscillator({ note: 'A4' })` note-name-to-frequency path tested — A4→440Hz, invalid note handling
- [x] **TCOV-05**: `Sampler.stop()` tested — stop propagation, isPlaying state after stop
- [x] **TCOV-06**: `audio-context.ts` has dedicated test file — singleton creation, closed-state recreation
- [x] **TCOV-07**: `createNotes()` factory function has test coverage
- [x] **TCOV-08**: `_disposeUnmute()` has test coverage
- [x] **TCOV-09**: `createAnalyzer` context-free overload tested via index.ts factory
- [x] **TCOV-10**: `createLayeredSound` factory tested via index.ts
- [x] **TCOV-11**: Oscillator `frequency: 0` behavior verified — test confirms resulting frequency value
- [x] **TCOV-12**: Envelope validates negative attack/decay/release values (or documents acceptance)
- [x] **TCOV-13**: Preload cache accessor functions (`getFromCache`, `setInCache`, `hasInCache`, `getCacheSize`) tested

### Docs Site SEO and Accessibility (Phase 44)

- [x] **SEO-01**: OG image is a 1200x630 PNG (not SVG favicon), `og:image:width`/`og:image:height` meta tags present, `twitter:card` set to `summary_large_image`
- [x] **SEO-02**: Per-page OG title/description via VitePress `transformHead` hook (not static across all pages)
- [x] **SEO-03**: Canonical URL per page via `link rel="canonical"` in `transformHead`
- [x] **SEO-04**: JSON-LD structured data includes `version` and `dateCreated` properties
- [ ] **A11Y-01**: All interactive demo buttons have visible `:focus-visible` outline styles
- [ ] **A11Y-02**: Visualization canvases have `role="img"` and descriptive `aria-label`
- [x] **A11Y-03**: XY Pad canvas is keyboard operable (arrow key handlers for frequency/gain control)
- [ ] **A11Y-04**: DrumMachine beat state has secondary visual indicator beyond color alone (WCAG 1.4.1)
- [ ] **A11Y-05**: DrumMachine 16-step grid has scroll affordance on small mobile viewports
- [x] **A11Y-06**: Piano keyboard shortcut hint is announced to screen readers
- [ ] **A11Y-07**: DrumMachine shows loading state on first play while audio initializes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Spatial Audio

- **SPATIAL-01**: User can position sounds in 3D space
- **SPATIAL-02**: Listener position is configurable
- **SPATIAL-03**: Distance attenuation models available

### Advanced Audio

- **ADV-01**: Ducking/sidechain compression (auto-lower music when voice plays)
- **ADV-02**: Recording/capture to audio file
- **ADV-03**: Microphone input processing

### Framework Bindings

- **REACT-01**: React hooks package (useSound, useTrack, useOscillator)
- **VUE-01**: Vue composables package

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New audio capabilities | v1.0 is API polish + security, not new audio features |
| Spatial audio | Requires multi-AudioContext, deferred to v2 |
| Configurable BeatTrack lookahead timing | Low priority, current 100ms/25ms works well |
| Beat flag renaming (active→enabled, isPlaying→playing) | Naming is functional, change risks breaking existing demos |
| Volume presets (sound.setVolume('quiet')) | Over-abstraction for simple gain values |
| Preset effect factories (createReverbEffect, createEchoEffect) | Effects adapter pattern is correct — users bring own effects |
| Connectable interface refactoring | Renaming to Adjustable/Controllable adds churn without value |
| SampledNote.name shadow fix | Architectural decision needs more thought, defer |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 17-01 | Complete |
| SEC-02 | Phase 17-01 | Complete |
| SEC-03 | Phase 17-01 | Complete |
| SEC-04 | Phase 17-02 | Complete |
| SEC-05 | Phase 17-03 | Complete |
| SEC-06 | Phase 17-01 | Complete |
| API-01 | Phase 18 (verified: Phase 24) | Complete |
| API-02 | Phase 18 (verified: Phase 24) | Complete |
| API-03 | Phase 18 (verified: Phase 24) | Complete |
| API-04 | Phase 18 (verified: Phase 24) | Complete |
| API-05 | Phase 18 (verified: Phase 24) | Complete |
| API-06 | Phase 18 (verified: Phase 24) | Complete |
| API-07 | Phase 18 (verified: Phase 24) | Complete |
| DOC-01 | Phase 18 (verified: Phase 24) | Complete |
| DX-01 | Phase 19 (verified: Phase 24) | Complete |
| DX-02 | Phase 19 (verified: Phase 24) | Complete |
| DX-03 | Phase 19 (verified: Phase 24) | Complete |
| DX-04 | Phase 19 (verified: Phase 24) | Complete |
| DX-05 | Phase 19 (verified: Phase 24) | Complete |
| DX-06 | Phase 19 (verified: Phase 24) | Complete |
| DX-07 | Phase 19 (verified: Phase 24) | Complete |
| DX-08 | Phase 19 (verified: Phase 24) | Complete |
| DOC-03 | Phase 19 (verified: Phase 24) | Complete |
| DEF-05 | Phase 19 (verified: Phase 24) | Complete |
| DEF-01 | Phase 20 | Complete |
| DEF-02 | Phase 20 | Complete |
| DEF-03 | Phase 20 | Complete |
| DEF-04 | Phase 20 | Complete |
| TEST-01 | Phase 21 | Complete |
| TEST-02 | Phase 21 | Complete |
| TEST-03 | Phase 21 | Complete |
| DOC-02 | Phase 22 | Complete |
| DOC-04 | Phase 22 | Complete |

| FIX-01 | Phase 32 | Pending |
| FIX-02 | Phase 32 | Pending |
| FIX-03 | Phase 32 | Pending |
| FIX-04 | Phase 32 | Pending |
| FIX-05 | Phase 32 | Pending |
| FIX-06 | Phase 32 | Pending |
| FIX-07 | Phase 32 | Pending |
| FIX-08 | Phase 32 | Pending |
| FIX-09 | Phase 32 | Pending |
| DX2-01 | Phase 33 | Complete |
| DX2-02 | Phase 33 | Complete |
| DX2-03 | Phase 33 | Complete |
| DX2-04 | Phase 33 | Complete |
| DX2-05 | Phase 33 | Complete |
| DX2-06 | Phase 33 | Complete |
| TEST2-01 | Phase 34 | Complete |
| TEST2-02 | Phase 34 | Complete |
| TEST2-03 | Phase 34 | Complete |
| TEST2-04 | Phase 34 | Complete |
| TEST2-05 | Phase 34 | Complete |
| TEST2-06 | Phase 34 | Complete |
| TEST2-07 | Phase 34 | Complete |
| TEST2-08 | Phase 34 | Complete |
| TEST2-09 | Phase 34 | Complete |
| DOC2-01 | Phase 35 | Complete |
| DOC2-02 | Phase 35 | Complete |
| DOC2-03 | Phase 35 | Complete |
| DOC2-04 | Phase 35 | Complete |
| DOC2-05 | Phase 35 | Complete |
| DOC2-06 | Phase 35 | Complete |
| DOC2-07 | Phase 35 | Complete |
| DOC2-08 | Phase 35 | Complete |
| DOC2-09 | Phase 35 | Complete |
| SYNC-01 | Phase 36 | Complete |
| SYNC-02 | Phase 36 | Complete |
| SYNC-03 | Phase 36 | Complete |
| SYNC-04 | Phase 36 | Complete |
| DX3-01 | Phase 37 | Complete |
| DX3-02 | Phase 37 | Complete |
| DX3-03 | Phase 37 | Complete |
| DX3-04 | Phase 37 | Complete |
| DX3-05 | Phase 37 | Complete |
| DX3-06 | Phase 37 | Complete |
| DX3-07 | Phase 37 | Complete |
| DX3-08 | Phase 37 | Complete |
| DX3-09 | Phase 37 | Complete |
| SYNC2-01 | Phase 38 | Complete |
| SYNC2-02 | Phase 38 | Complete |
| SYNC2-03 | Phase 38 | Complete |
| SYNC2-04 | Phase 38 | Complete |

| BUG-01 | Phase 42 | Complete |
| BUG-02 | Phase 42 | Complete |
| BUG-03 | Phase 42 | Complete |
| BUG-04 | Phase 42 | Complete |
| BUG-05 | Phase 42 | Complete |
| TCOV-01 | Phase 43 | Complete |
| TCOV-02 | Phase 43 | Complete |
| TCOV-03 | Phase 43 | Complete |
| TCOV-04 | Phase 43 | Complete |
| TCOV-05 | Phase 43 | Complete |
| TCOV-06 | Phase 43 | Complete |
| TCOV-07 | Phase 43 | Complete |
| TCOV-08 | Phase 43 | Complete |
| TCOV-09 | Phase 43 | Complete |
| TCOV-10 | Phase 43 | Complete |
| TCOV-11 | Phase 43 | Complete |
| TCOV-12 | Phase 43 | Complete |
| TCOV-13 | Phase 43 | Complete |

**Coverage:**
- v1.0 original requirements: 33 total, 33 completed
- v1.0 gap closure requirements: 68 total, 54 completed
- Grand total: 101 requirements mapped to phases

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-22 after code review gap closure (phases 32-38)*

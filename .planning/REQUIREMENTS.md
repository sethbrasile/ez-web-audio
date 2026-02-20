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

**Coverage:**
- v1.0 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0
- Completed: 33 (Phase 24 will formally verify Phase 18/19 via VERIFICATION.md)

Note: REQUIREMENTS.md header stated "30 total" but enumeration yields 33 (API-07 + DEF-05 + DOC-01 through DOC-04 account for the difference). All 33 listed requirements are mapped.

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation (phases 17-22)*

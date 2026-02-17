# Requirements: EZ Audio

**Defined:** 2026-02-16
**Core Value:** Make the Web Audio API easy to use

## v1.0 Requirements — First Stable Release

**Defined:** 2026-02-16

Implement all deferred audit improvements, breaking API cleanup (free pre-1.0), dependency security upgrades, convenience APIs, defensive hardening, test expansion, and documentation updates. Ship as npm 1.0.0.

### Breaking API Changes

- [ ] **API-01**: Fluent API `.from()` method renamed to `.as()` on `update().to()` and `seek()` chains
- [ ] **API-02**: `ifActivePlayIn()` renamed to `playInIfActive()` for naming consistency with `playIfActive()`
- [ ] **API-03**: `gainNode`, `pannerNode`, `effectChainInput` changed from public to protected on BaseSound
- [ ] **API-04**: `startOffset` changed from public to protected on BaseSound (remains accessible on Track)
- [ ] **API-05**: Deprecated `connections` API removed entirely (`addConnection`, `removeConnection`, `getConnection`, `getNodeFrom`, `connections` array)
- [ ] **API-06**: Deprecated type aliases removed (`OscillatorOpts`, `OscillatorOptsFilterValues`) — only `OscillatorOptions` and `OscillatorFilterOptions` remain
- [ ] **API-07**: Commented-out `stopAfter` removed from Playable interface

### DX Improvements

- [ ] **DX-01**: Effect chain auto-rewires when `effect.bypass` is toggled (no manual `rewireEffects()` call needed)
- [ ] **DX-02**: Effect factory functions (`createFilterEffect`, `createGainEffect`) work without requiring AudioContext argument (auto-create internally)
- [ ] **DX-03**: `addEffects(effects[])` convenience method on BaseSound for batch effect addition
- [ ] **DX-04**: `playTogether(playables[])` utility function syncs multiple sounds to same AudioContext start time
- [ ] **DX-05**: `createSounds(urls[])` batch loader with progress events
- [ ] **DX-06**: `getFilters()` accessor on Oscillator returns readonly filter nodes for advanced users
- [ ] **DX-07**: `getSounds()` accessor on Sampler returns readonly sound list for inspection
- [ ] **DX-08**: `ControlType` made extensible via mapped type for future parameter additions

### Defensive Code

- [ ] **DEF-01**: Null checks added to effect/filter/sound iterations to prevent crashes from null entries
- [ ] **DEF-02**: `addEffect()` position parameter validated (no negative values)
- [ ] **DEF-03**: Sampler `play()` guards against empty sounds set with clear error
- [ ] **DEF-04**: Controller parameter arrays cleared between plays to prevent memory leak
- [ ] **DEF-05**: `unlockAudioContext` necessity documented with explanatory comment (resolves TODO)

### Dependency Security

- [ ] **SEC-01**: happy-dom upgraded from 15.x to 20.x (fixes 2 critical RCE vulnerabilities)
- [ ] **SEC-02**: vitest upgraded from 2.x to 4.x (fixes 1 critical RCE vulnerability)
- [ ] **SEC-03**: vite upgraded from 5.x to 7.x (fixes multiple moderate vulnerabilities)
- [ ] **SEC-04**: eslint upgraded from 9.x to 10.x and @antfu/eslint-config from 2.x to 7.x
- [ ] **SEC-05**: TypeScript upgraded from 5.6 to 5.9
- [ ] **SEC-06**: Unused dependencies removed (@dotenvx/dotenvx, concurrently — if confirmed unused)

### Test Coverage

- [ ] **TEST-01**: Integration tests added for Sound→Effect→Analyzer chain and full soundfont workflow
- [ ] **TEST-02**: `base-sound.test.ts` split by concern (events, effects, debug, analyzer)
- [ ] **TEST-03**: Concurrent operation tests added (play while playing, rapid seek, double stop)

### Documentation

- [ ] **DOC-01**: All JSDoc updated for renamed methods (`.from()` → `.as()`, `ifActivePlayIn` → `playInIfActive`)
- [ ] **DOC-02**: Demo app Vue components updated for all API changes (protected properties, removed deprecated APIs, new convenience methods)
- [ ] **DOC-03**: Guide pages (Getting Started, Core Concepts) updated with new convenience APIs and renamed methods
- [ ] **DOC-04**: TypeDoc/API reference reflects new protected visibility and removed deprecated exports

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

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1.0 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after initial definition*

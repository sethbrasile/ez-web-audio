# Requirements: EZ Audio

**Defined:** 2026-01-31
**Core Value:** Make the Web Audio API easy to use

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Events

- [x] **EVT-01**: User can subscribe to play event on any Playable
- [x] **EVT-02**: User can subscribe to stop event on any Playable
- [x] **EVT-03**: User can subscribe to end event (playback finished naturally)
- [x] **EVT-04**: User can subscribe to seek event on Track
- [x] **EVT-05**: User can subscribe to pause/resume events on Track
- [x] **EVT-06**: Events are typed (TypeScript knows event payload shape)
- [x] **EVT-07**: User can unsubscribe from events

### ADSR Envelopes

- [x] **ADSR-01**: User can create Oscillator with ADSR envelope options
- [x] **ADSR-02**: Attack phase ramps gain from 0 to peak over specified time
- [x] **ADSR-03**: Decay phase ramps gain from peak to sustain level
- [x] **ADSR-04**: Sustain holds gain at specified level while note is held
- [x] **ADSR-05**: Release phase ramps gain to 0 when stop() called
- [x] **ADSR-06**: Rapid retriggering doesn't cause clicks (picks up from current value)
- [x] **ADSR-07**: ADSR works with existing onPlaySet/onPlayRamp API

### LayeredSound

- [x] **LAYER-01**: User can create LayeredSound from multiple Sound/Oscillator instances
- [x] **LAYER-02**: LayeredSound.play() plays all sounds simultaneously
- [x] **LAYER-03**: LayeredSound.stop() stops all sounds
- [x] **LAYER-04**: LayeredSound supports gain/pan control affecting all layers
- [x] **LAYER-05**: LayeredSound emits events (play, stop, end)
- [x] **LAYER-06**: Individual layers can be accessed and controlled

### BeatTrack

- [x] **BEAT-01**: User can stop BeatTrack mid-playback
- [x] **BEAT-02**: User can pause/resume BeatTrack playback
- [x] **BEAT-03**: BeatTrack emits events for beat triggers

### Collection Utilities

- [x] **COLL-01**: stopAll() stops all Playables in an array
- [x] **COLL-02**: pauseAll() pauses all Tracks in an array
- [x] **COLL-03**: playAll() plays all Playables in an array
- [x] **COLL-04**: Utilities work on nested arrays (recursive)
- [x] **COLL-05**: Utilities are tree-shakeable (only imported if used)

### Preloading

- [x] **PRE-01**: User can preload a sound URL without creating a Sound instance
- [x] **PRE-02**: User can preload multiple URLs in parallel
- [x] **PRE-03**: Preloaded audio is cached and reused by createSound/createTrack
- [x] **PRE-04**: User can check if a URL is preloaded
- [x] **PRE-05**: User can clear preload cache

### Audio Sprites

- [x] **SPRITE-01**: User can create sprite from audio file + timing metadata
- [x] **SPRITE-02**: Sprite metadata specifies name, start time, duration for each sound
- [x] **SPRITE-03**: User can play individual sounds from sprite by name
- [x] **SPRITE-04**: Sprite sounds support gain/pan control
- [x] **SPRITE-05**: Sprite supports standard JSON format (audiosprite compatible)

### Crossfading

- [x] **FADE-01**: User can crossfade from one Track to another
- [x] **FADE-02**: Crossfade uses equal-power curve (no volume dip)
- [x] **FADE-03**: User can specify crossfade duration
- [x] **FADE-04**: Crossfade works with Track seek positions

### Effects

- [x] **FX-01**: User can add any effect via adapter pattern (external libraries like Tuna.js via wrapEffect)
- [x] **FX-02**: User can add built-in GainEffect for volume control
- [x] **FX-03**: User can add built-in FilterEffect with all BiquadFilter types
- [x] **FX-04**: Effects integrate with existing sound chain (addEffect/removeEffect)
- [x] **FX-05**: User can remove effects
- [ ] **FX-06**: Effect presets shown in demo site (external libraries, not bundled)

*Note: Per discuss-phase decision, ez-audio uses adapter pattern. Complex effects (reverb, delay, distortion) come from external libraries like Tuna.js. Only GainEffect and FilterEffect are built-in. FX-06 deferred to Phase 7 (Demo Site).*

### Visualization

- [x] **VIZ-01**: User can get frequency data from any playing Playable
- [x] **VIZ-02**: User can get waveform data from any playing Playable
- [x] **VIZ-03**: Data is provided as typed arrays (Uint8Array)
- [x] **VIZ-04**: User can configure FFT size
- [x] **VIZ-05**: Visualization doesn't significantly impact performance

### Debug Mode

- [x] **DBG-01**: User can enable debug mode globally
- [x] **DBG-02**: Debug mode logs play/stop/seek events with timestamps
- [x] **DBG-03**: Debug mode logs connection chain for each sound
- [x] **DBG-04**: Debug mode warns about common issues (e.g., AudioContext suspended)
- [x] **DBG-05**: Debug mode can be disabled in production builds (tree-shaking)

### Bug Fixes

- [x] **FIX-01**: Track.play refactored to _play pattern (fixes inheritance fragility)
- [x] **FIX-02**: Oscillator.duration returns meaningful value or documents "not applicable"
- [x] **FIX-03**: BeatTrack RAF loop properly cleaned up on stop
- [x] **FIX-04**: AudioBufferSourceNodes properly disconnected after playback (memory leak fix)

### Error Handling

- [x] **ERR-01**: All errors include actionable guidance (what went wrong, how to fix)
- [x] **ERR-02**: AudioContext initialization errors are clear
- [x] **ERR-03**: Invalid note identifiers throw descriptive errors
- [x] **ERR-04**: Missing audio files throw errors with URL

### Testing

- [x] **TEST-01**: Sound class has comprehensive test coverage
- [x] **TEST-02**: Track class has comprehensive test coverage
- [x] **TEST-03**: Oscillator class has comprehensive test coverage
- [x] **TEST-04**: Sampler class has comprehensive test coverage
- [x] **TEST-05**: BeatTrack class has comprehensive test coverage
- [x] **TEST-06**: Controllers have comprehensive test coverage
- [x] **TEST-07**: Event system has comprehensive test coverage
- [x] **TEST-08**: ADSR envelopes have test coverage including edge cases

### Documentation

- [ ] **DOC-01**: All public classes documented with TypeDoc
- [ ] **DOC-02**: All public methods have JSDoc with examples
- [ ] **DOC-03**: Getting started guide exists
- [ ] **DOC-04**: API reference is complete and navigable
- [ ] **DOC-05**: Interactive examples for each major feature

### Demo Site

- [ ] **SITE-01**: Demo site migrated to Vue + Vitepress
- [ ] **SITE-02**: Interactive examples work in browser
- [ ] **SITE-03**: API docs generated and integrated
- [ ] **SITE-04**: Site is deployed and accessible

### Build & Distribution

- [ ] **BUILD-01**: Library exports are tree-shakeable
- [ ] **BUILD-02**: ESM and CJS builds available
- [ ] **BUILD-03**: TypeScript declarations included
- [ ] **BUILD-04**: Package published to npm

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
| Central AudioManager/registry | Users manage own collections; utilities are sufficient |
| Multiple AudioContexts | Single context pattern is simpler and adequate |
| Full DAW features | Out of scope; Tone.js owns this space |
| Transport system (global timeline) | Complex, better served by dedicated libraries |
| MIDI support | Specialized, can be a separate package |
| Audio worklets | Too low-level for "easy" API; advanced users use Web Audio directly |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVT-01 to EVT-07 | Phase 1 | Complete |
| FIX-01 to FIX-04 | Phase 1 | Complete |
| ERR-01 to ERR-04 | Phase 1 | Complete |
| ADSR-01 to ADSR-07 | Phase 2 | Complete |
| SPRITE-01 to SPRITE-05 | Phase 3 | Pending |
| COLL-01 to COLL-05 | Phase 3 | Pending |
| PRE-01 to PRE-05 | Phase 3 | Pending |
| LAYER-01 to LAYER-06 | Phase 4 | Pending |
| FADE-01 to FADE-04 | Phase 4 | Pending |
| BEAT-01 to BEAT-03 | Phase 4 | Pending |
| FX-01 to FX-05 | Phase 5 | Complete |
| FX-06 | Phase 7 | Pending |
| VIZ-01 to VIZ-05 | Phase 5 | Complete |
| DBG-01 to DBG-05 | Phase 5 | Complete |
| TEST-01 to TEST-08 | Phase 6 | Complete |
| DOC-01 to DOC-05 | Phase 7 | Pending |
| SITE-01 to SITE-04 | Phase 7 | Pending |
| BUILD-01 to BUILD-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 71 total
- Mapped to phases: 71
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-02-01 after Phase 6 complete*

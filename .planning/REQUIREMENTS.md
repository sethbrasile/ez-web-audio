# Requirements: EZ Audio

**Defined:** 2026-01-31
**Core Value:** Make the Web Audio API easy to use

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Events

- [ ] **EVT-01**: User can subscribe to play event on any Playable
- [ ] **EVT-02**: User can subscribe to stop event on any Playable
- [ ] **EVT-03**: User can subscribe to end event (playback finished naturally)
- [ ] **EVT-04**: User can subscribe to seek event on Track
- [ ] **EVT-05**: User can subscribe to pause/resume events on Track
- [ ] **EVT-06**: Events are typed (TypeScript knows event payload shape)
- [ ] **EVT-07**: User can unsubscribe from events

### ADSR Envelopes

- [ ] **ADSR-01**: User can create Oscillator with ADSR envelope options
- [ ] **ADSR-02**: Attack phase ramps gain from 0 to peak over specified time
- [ ] **ADSR-03**: Decay phase ramps gain from peak to sustain level
- [ ] **ADSR-04**: Sustain holds gain at specified level while note is held
- [ ] **ADSR-05**: Release phase ramps gain to 0 when stop() called
- [ ] **ADSR-06**: Rapid retriggering doesn't cause clicks (picks up from current value)
- [ ] **ADSR-07**: ADSR works with existing onPlaySet/onPlayRamp API

### LayeredSound

- [ ] **LAYER-01**: User can create LayeredSound from multiple Sound/Oscillator instances
- [ ] **LAYER-02**: LayeredSound.play() plays all sounds simultaneously
- [ ] **LAYER-03**: LayeredSound.stop() stops all sounds
- [ ] **LAYER-04**: LayeredSound supports gain/pan control affecting all layers
- [ ] **LAYER-05**: LayeredSound emits events (play, stop, end)
- [ ] **LAYER-06**: Individual layers can be accessed and controlled

### BeatTrack

- [ ] **BEAT-01**: User can stop BeatTrack mid-playback
- [ ] **BEAT-02**: User can pause/resume BeatTrack playback
- [ ] **BEAT-03**: BeatTrack emits events for beat triggers

### Collection Utilities

- [ ] **COLL-01**: stopAll() stops all Playables in an array
- [ ] **COLL-02**: pauseAll() pauses all Tracks in an array
- [ ] **COLL-03**: playAll() plays all Playables in an array
- [ ] **COLL-04**: Utilities work on nested arrays (recursive)
- [ ] **COLL-05**: Utilities are tree-shakeable (only imported if used)

### Preloading

- [ ] **PRE-01**: User can preload a sound URL without creating a Sound instance
- [ ] **PRE-02**: User can preload multiple URLs in parallel
- [ ] **PRE-03**: Preloaded audio is cached and reused by createSound/createTrack
- [ ] **PRE-04**: User can check if a URL is preloaded
- [ ] **PRE-05**: User can clear preload cache

### Audio Sprites

- [ ] **SPRITE-01**: User can create sprite from audio file + timing metadata
- [ ] **SPRITE-02**: Sprite metadata specifies name, start time, duration for each sound
- [ ] **SPRITE-03**: User can play individual sounds from sprite by name
- [ ] **SPRITE-04**: Sprite sounds support gain/pan control
- [ ] **SPRITE-05**: Sprite supports standard JSON format (audiosprite compatible)

### Crossfading

- [ ] **FADE-01**: User can crossfade from one Track to another
- [ ] **FADE-02**: Crossfade uses equal-power curve (no volume dip)
- [ ] **FADE-03**: User can specify crossfade duration
- [ ] **FADE-04**: Crossfade works with Track seek positions

### Effects

- [ ] **FX-01**: User can add reverb effect with simple options (decay time)
- [ ] **FX-02**: User can add delay effect with options (time, feedback)
- [ ] **FX-03**: User can add distortion effect with options (amount)
- [ ] **FX-04**: Effects integrate with existing connections array
- [ ] **FX-05**: User can remove effects
- [ ] **FX-06**: Effect presets available (e.g., "small room", "large hall")

### Visualization

- [ ] **VIZ-01**: User can get frequency data from any playing Playable
- [ ] **VIZ-02**: User can get waveform data from any playing Playable
- [ ] **VIZ-03**: Data is provided as typed arrays (Uint8Array)
- [ ] **VIZ-04**: User can configure FFT size
- [ ] **VIZ-05**: Visualization doesn't significantly impact performance

### Debug Mode

- [ ] **DBG-01**: User can enable debug mode globally
- [ ] **DBG-02**: Debug mode logs play/stop/seek events with timestamps
- [ ] **DBG-03**: Debug mode logs connection chain for each sound
- [ ] **DBG-04**: Debug mode warns about common issues (e.g., AudioContext suspended)
- [ ] **DBG-05**: Debug mode can be disabled in production builds (tree-shaking)

### Bug Fixes

- [ ] **FIX-01**: Track.play refactored to _play pattern (fixes inheritance fragility)
- [ ] **FIX-02**: Oscillator.duration returns meaningful value or documents "not applicable"
- [ ] **FIX-03**: BeatTrack RAF loop properly cleaned up on stop
- [ ] **FIX-04**: AudioBufferSourceNodes properly disconnected after playback (memory leak fix)

### Error Handling

- [ ] **ERR-01**: All errors include actionable guidance (what went wrong, how to fix)
- [ ] **ERR-02**: AudioContext initialization errors are clear
- [ ] **ERR-03**: Invalid note identifiers throw descriptive errors
- [ ] **ERR-04**: Missing audio files throw errors with URL

### Testing

- [ ] **TEST-01**: Sound class has comprehensive test coverage
- [ ] **TEST-02**: Track class has comprehensive test coverage
- [ ] **TEST-03**: Oscillator class has comprehensive test coverage
- [ ] **TEST-04**: Sampler class has comprehensive test coverage
- [ ] **TEST-05**: BeatTrack class has comprehensive test coverage
- [ ] **TEST-06**: Controllers have comprehensive test coverage
- [ ] **TEST-07**: Event system has comprehensive test coverage
- [ ] **TEST-08**: ADSR envelopes have test coverage including edge cases

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
| EVT-01 to EVT-07 | Phase 1 | Pending |
| FIX-01 to FIX-04 | Phase 1 | Pending |
| ERR-01 to ERR-04 | Phase 1 | Pending |
| ADSR-01 to ADSR-07 | Phase 2 | Pending |
| SPRITE-01 to SPRITE-05 | Phase 3 | Pending |
| COLL-01 to COLL-05 | Phase 3 | Pending |
| PRE-01 to PRE-05 | Phase 3 | Pending |
| LAYER-01 to LAYER-06 | Phase 4 | Pending |
| FADE-01 to FADE-04 | Phase 4 | Pending |
| BEAT-01 to BEAT-03 | Phase 4 | Pending |
| FX-01 to FX-06 | Phase 5 | Pending |
| VIZ-01 to VIZ-05 | Phase 5 | Pending |
| DBG-01 to DBG-05 | Phase 5 | Pending |
| TEST-01 to TEST-08 | Phase 6 | Pending |
| DOC-01 to DOC-05 | Phase 7 | Pending |
| SITE-01 to SITE-04 | Phase 7 | Pending |
| BUILD-01 to BUILD-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 71 total
- Mapped to phases: 71
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*

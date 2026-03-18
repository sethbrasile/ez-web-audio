# Requirements: EZ Audio — Milestone 7 (Feature Demos)

**Defined:** 2026-03-08
**Core Value:** Make the Web Audio API easy to use

## Milestone 7 Requirements

Interactive demo pages for all M5 features that currently lack examples.

### LFO Modulation

- [x] **LFO-01**: User can hear LFO tremolo (gain modulation) on an oscillator
- [x] **LFO-02**: User can hear LFO vibrato (frequency modulation) on an oscillator
- [x] **LFO-03**: User can hear LFO filter sweep (cutoff modulation) on a filtered oscillator
- [x] **LFO-04**: User can see real-time canvas visualization of the LFO waveform
- [x] **LFO-05**: User can adjust LFO rate and depth per modulation target

### PolySynth

- [x] **POLY-01**: User can play polyphonic notes via keyboard UI (reuses PianoKeyboard.vue)
- [x] **POLY-02**: User can see active voice count and max voices displayed
- [x] **POLY-03**: User can switch between steal strategies (oldest/quietest/newest) live
- [x] **POLY-04**: User can adjust ADSR envelope parameters for synth voices

### Effects Chain

- [x] **FX-01**: User can toggle delay, reverb, compressor, and EQ effects on/off via bypass
- [x] **FX-02**: User can adjust parameters for each effect (delay time, reverb mix, threshold, EQ bands)
- [x] **FX-03**: User can reorder effects in the chain
- [x] **FX-04**: User can switch between oscillator and loaded audio file as source
- [x] **FX-05**: User can see a signal flow diagram showing audio path through active effects

### Transport + Sequencer

- [ ] **TSEQ-01**: User can play/pause/stop transport with adjustable BPM
- [ ] **TSEQ-02**: User can mute/solo individual tracks
- [ ] **TSEQ-03**: User can hear a sequence using musical time notation (4n, 8t, 2m)
- [ ] **TSEQ-04**: User can see current beat/bar position with visual playhead

### GrainPlayer

- [ ] **GRAIN-01**: User can independently control pitch without changing playback speed
- [ ] **GRAIN-02**: User can independently control playback speed without changing pitch
- [ ] **GRAIN-03**: User can adjust grain size for texture variation
- [ ] **GRAIN-04**: User can see source waveform with grain position overlay on canvas

## Future Requirements

None — showcase examples (pseudo DAW, guitar pedalboard) deferred to Milestone 8.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pseudo DAW showcase | Deferred to Milestone 8 — build individual demos first |
| Guitar effects pedalboard showcase | Deferred to Milestone 8 — build individual demos first |
| Drag-and-drop effect reordering | Button-based reordering sufficient for demo |
| MIDI input for PolySynth | Specialized, out of scope for docs demos |
| File upload for GrainPlayer | Use bundled audio asset, not user uploads |
| Shared component extraction (ParameterSlider) | Not worth the abstraction for 5 pages |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LFO-01 | Phase 67 | Complete |
| LFO-02 | Phase 67 | Complete |
| LFO-03 | Phase 67 | Complete |
| LFO-04 | Phase 67 | Complete |
| LFO-05 | Phase 67 | Complete |
| POLY-01 | Phase 68 | Complete |
| POLY-02 | Phase 68 | Complete |
| POLY-03 | Phase 68 | Complete |
| POLY-04 | Phase 68 | Complete |
| FX-01 | Phase 69 | Complete |
| FX-02 | Phase 69 | Complete |
| FX-03 | Phase 69 | Complete |
| FX-04 | Phase 69 | Complete |
| FX-05 | Phase 69 | Complete |
| TSEQ-01 | Phase 71 | Pending |
| TSEQ-02 | Phase 71 | Pending |
| TSEQ-03 | Phase 71 | Pending |
| TSEQ-04 | Phase 71 | Pending |
| GRAIN-01 | Phase 70 | Pending |
| GRAIN-02 | Phase 70 | Pending |
| GRAIN-03 | Phase 70 | Pending |
| GRAIN-04 | Phase 70 | Pending |

**Coverage:**
- Milestone 7 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation*

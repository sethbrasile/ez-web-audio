# Requirements: EZ Audio — Effects & Transport

**Defined:** 2026-02-28
**Core Value:** Make the Web Audio API easy to use

## Milestone Requirements

Requirements for the Effects & Transport milestone. Each maps to roadmap phases.

### Effects

- [ ] **FX-01**: Developer can create a delay effect with configurable time, feedback, and wet/dry mix
- [ ] **FX-02**: Developer can create a reverb effect with configurable decay and wet/dry mix
- [ ] **FX-03**: Developer can create a distortion effect with configurable amount and wet/dry mix
- [ ] **FX-04**: Developer can create a compressor effect with threshold, ratio, knee, attack, release
- [ ] **FX-05**: Developer can create a 3-band EQ effect with configurable low/mid/high gain
- [ ] **FX-06**: All built-in effects work with existing `addEffect()` on Sound, Oscillator, and LayeredSound

### Modulation

- [x] **MOD-01**: Developer can create an LFO with configurable frequency, depth, and waveform
- [x] **MOD-02**: Developer can connect an LFO to any AudioParam on any sound (gain, pan, frequency, filter cutoff)
- [x] **MOD-03**: LFO is properly disposed when the target sound is disposed (no memory leaks)

### Synthesis

- [x] **SYNTH-01**: Developer can create a PolySynth that plays multiple notes simultaneously
- [x] **SYNTH-02**: PolySynth manages voice allocation with configurable max voices and voice stealing
- [x] **SYNTH-03**: Developer can create a GrainPlayer from an audio buffer with configurable grain size and overlap
- [x] **SYNTH-04**: GrainPlayer supports independent pitch shifting and playback rate control

### Transport

- [ ] **TRANS-01**: Developer can create a global Transport with configurable BPM and time signature
- [ ] **TRANS-02**: Transport provides start/stop/pause controls and current position
- [ ] **TRANS-03**: BeatTrack can sync to a Transport instead of using its own internal clock
- [ ] **TRANS-04**: Multiple BeatTracks synced to one Transport play in perfect sync

### Sequencer

- [x] **SEQ-01**: Developer can create a Sequence that schedules arbitrary callbacks at musical time divisions
- [x] **SEQ-02**: Developer can use musical time notation ("4n", "8t", "2m") to specify timing
- [x] **SEQ-03**: Sequences respond to live BPM changes without re-scheduling

## Future Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Effects (deferred)

- **FX-07**: Developer can create a chorus effect with configurable rate, depth, and wet/dry mix
- **FX-08**: Developer can create a limiter effect with configurable threshold

### Advanced Effects (discussion topics)

- **ADV-01**: Developer can load WASM-based audio effects
- **ADV-02**: Developer can load VST-style plugins (feasibility TBD)
- **ADV-03**: Developer can use third-party effect libraries (tuna.js, etc.) via wrapEffect

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Signal-rate math (Add, Multiply, Scale) | Too low-level for "EZ" philosophy |
| Offline rendering | Niche, orthogonal to core library |
| Recording/capture | Requires MediaRecorder, separate concern |
| 3D spatial audio | Specialized, low demand |
| AudioWorklet-based effects | Complexity; native nodes sufficient |
| MIDI I/O | Separate package territory |
| Multiple AudioContexts | Single context pattern is simpler and sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FX-01 | Phase 53 | Pending |
| FX-02 | Phase 53 | Pending |
| FX-03 | Phase 53 | Pending |
| FX-04 | Phase 53 | Pending |
| FX-05 | Phase 53 | Pending |
| FX-06 | Phase 53 | Pending |
| MOD-01 | Phase 54 | Complete |
| MOD-02 | Phase 54 | Complete |
| MOD-03 | Phase 54 | Complete |
| SYNTH-01 | Phase 57 | Complete |
| SYNTH-02 | Phase 57 | Complete |
| SYNTH-03 | Phase 58 | Complete |
| SYNTH-04 | Phase 58 | Complete |
| TRANS-01 | Phase 55 | Pending |
| TRANS-02 | Phase 55 | Pending |
| TRANS-03 | Phase 55 | Pending |
| TRANS-04 | Phase 55 | Pending |
| SEQ-01 | Phase 56 | Complete |
| SEQ-02 | Phase 56 | Complete |
| SEQ-03 | Phase 56 | Complete |

**Coverage:**
- Milestone requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap created (phases 53-58 mapped)*

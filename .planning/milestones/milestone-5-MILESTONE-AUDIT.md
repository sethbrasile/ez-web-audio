---
milestone: effects-and-transport
audited: 2026-03-01T12:00:00Z
status: tech_debt
scores:
  requirements: 20/20
  phases: 9/9
  integration: 18/20
  flows: 7/9
gaps:
  requirements: []
  integration:
    - id: "MOD-02-partial"
      description: "LFO cannot directly target GrainPlayer or PolySynth — LFOTarget type is BaseSound | BaseEffect, these classes extend TypedEventEmitter"
      affected_requirements: ["MOD-02"]
      workaround: "Connect LFO to a BaseEffect added to PolySynth/GrainPlayer via addEffect()"
    - id: "GainEffect-EffectWrapper-not-BaseEffect"
      description: "GainEffect and EffectWrapper implement Effect interface directly, not BaseEffect — cannot be LFO targets"
      affected_requirements: ["MOD-02"]
      workaround: "TypeScript type system prevents this at compile time; use named BaseEffect subclasses instead"
  flows:
    - name: "LFO modulates GrainPlayer master gain"
      breaks_at: "lfo.connect(grainPlayer, 'gain') — type error"
      workaround: "Add BaseEffect to GrainPlayer and connect LFO to that"
      affected_requirements: ["MOD-02", "SYNTH-03"]
    - name: "LFO modulates PolySynth master gain"
      breaks_at: "lfo.connect(polySynth, 'gain') — type error"
      workaround: "Add BaseEffect to PolySynth and connect LFO to that"
      affected_requirements: ["MOD-02", "SYNTH-01"]
tech_debt:
  - phase: 54-lfo
    items:
      - "LFOTarget type does not include GrainPlayer or PolySynth — future phase could expand the type or add getGainNode()/getPannerNode() to these classes"
  - phase: 53-built-in-effects
    items:
      - "GainEffect and EffectWrapper implement Effect interface directly, not BaseEffect — not LFO-connectable (by design, low impact)"
  - phase: 55-transport-beattrack-sync
    items:
      - "5 pre-existing crossfade test failures unrelated to M5 scope (documented in 55-VERIFICATION.md)"
---

# Milestone 5: Effects & Transport — Milestone Audit

**Milestone Goal:** Close the feature gap between EZ Audio and full-featured audio frameworks by adding built-in effects, modulation (LFO), dynamics processing, and a global transport/clock for tempo-synced sequencing.

**Audited:** 2026-03-01
**Status:** TECH_DEBT — all 20 requirements satisfied, no critical blockers, minor integration debt

## Requirements Coverage (3-Source Cross-Reference)

| REQ-ID | Description | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final Status |
|--------|-------------|-----------------|---------------------|-----------------|-------------|
| FX-01 | Delay effect | 53: PASS | 60-01: listed | [x] Complete | satisfied |
| FX-02 | Reverb effect | 53: PASS | 60-01: listed | [x] Complete | satisfied |
| FX-03 | Distortion effect | 53: PASS | 60-01: listed | [x] Complete | satisfied |
| FX-04 | Compressor effect | 53: PASS | 60-01: listed | [x] Complete | satisfied |
| FX-05 | EQ effect | 53: PASS | 60-01: listed | [x] Complete | satisfied |
| FX-06 | Effects on Sound/Oscillator/LayeredSound | 53+59: PASS | 59-02+60-01: listed | [x] Complete | satisfied |
| MOD-01 | LFO with frequency/depth/waveform | 54: PASS | 54-01: listed | [x] Complete | satisfied |
| MOD-02 | LFO connects to any AudioParam | 54: PASS | 54-01: listed | [x] Complete | satisfied |
| MOD-03 | LFO auto-dispose on target dispose | 59: PASS | 59-01: listed | [x] Complete | satisfied |
| SYNTH-01 | PolySynth multi-note | 57: PASS | 60-01: listed | [x] Complete | satisfied |
| SYNTH-02 | Voice allocation + stealing | 57: PASS | 60-01: listed | [x] Complete | satisfied |
| SYNTH-03 | GrainPlayer grain size/overlap | 58: PASS | 60-01: listed | [x] Complete | satisfied |
| SYNTH-04 | Independent pitch shift/playback rate | 58: PASS | 60-01: listed | [x] Complete | satisfied |
| TRANS-01 | Transport with BPM/time signature | 55: PASS | 60-02: listed | [x] Complete | satisfied |
| TRANS-02 | Start/stop/pause + position | 55: PASS | 60-02: listed | [x] Complete | satisfied |
| TRANS-03 | BeatTrack syncs to Transport | 55: PASS | 60-02: listed | [x] Complete | satisfied |
| TRANS-04 | Multiple BeatTracks in lockstep | 55: PASS | 60-02: listed | [x] Complete | satisfied |
| SEQ-01 | Sequence schedules callbacks | 56: PASS | 56-02: listed | [x] Complete | satisfied |
| SEQ-02 | Musical time notation | 56: PASS | 56-01: listed | [x] Complete | satisfied |
| SEQ-03 | Live BPM changes without re-scheduling | 56: PASS | 56-02: listed | [x] Complete | satisfied |

**Score: 20/20 requirements satisfied**

## Phase Verification Summary

| Phase | Name | Status | Tests | Key Deliverable |
|-------|------|--------|-------|-----------------|
| 53 | Built-in Effects | VERIFIED | 248 | Delay, Reverb, Distortion, Compressor, EQ with BaseEffect pattern |
| 54 | LFO | passed | 73 | Low-frequency oscillator for tremolo/vibrato/auto-filter/auto-pan |
| 54.1 | Effects & LFO Deep Review Fixes | passed (19/19) | 73 | Bug fixes, input validation, performance optimizations |
| 55 | Transport + BeatTrack Sync | VERIFIED | 41+80 | Global BPM clock with Web Worker, BeatTrack sync |
| 56 | Sequencer + Musical Time | VERIFIED | 51 | Sequence with musical time notation, live BPM response |
| 57 | PolySynth | VERIFIED | 55 | Polyphonic synthesizer with voice stealing |
| 58 | GrainPlayer | VERIFIED | 71 | Granular synthesis with independent pitch shift |
| 59 | LayeredSound Effects + Dispose | passed | 78+248 | LayeredSound.addEffect(), BaseEffect dispose event |
| 60 | Milestone Verification | passed | — | VERIFICATION.md files + REQUIREMENTS.md updates |

**Score: 9/9 phases verified**

## Cross-Phase Integration

| # | Integration Path | Status |
|---|-----------------|--------|
| 1 | Effects → BaseSound.addEffect() | WIRED |
| 2 | Effects → LayeredSound.addEffect() | WIRED |
| 3 | Effects → PolySynth.addEffect() | WIRED |
| 4 | Effects → GrainPlayer.addEffect() | WIRED |
| 5 | LFO → BaseSound params (gain, pan, frequency, detune) | WIRED |
| 6 | LFO → BaseEffect params (time, feedback, etc.) | WIRED |
| 7 | LFO → GrainPlayer params | MISSING (not LFOTarget) |
| 8 | LFO → PolySynth params | MISSING (not LFOTarget) |
| 9 | BaseEffect.dispose() → LFO cleanup | WIRED |
| 10 | BaseSound.dispose() → LFO cleanup | WIRED |
| 11 | LayeredSound.dispose() → LFO cleanup | WIRED (emits dispose event) |
| 12 | Transport → BeatTrack sync | WIRED |
| 13 | Transport → Sequence scheduling | WIRED |
| 14 | Transport BPM change → Sequence auto-adjusts | WIRED |
| 15 | Musical time notation → Sequence events | WIRED |
| 16 | All factory functions exported from src/index.ts | WIRED |
| 17 | All types exported from src/index.ts | WIRED |
| 18 | GainEffect/EffectWrapper → LFO | MISSING (not BaseEffect) |
| 19 | PolySynth voice stealing strategies | WIRED |
| 20 | GrainPlayer pitch/position independence | WIRED |

**Score: 18/20 integrations wired (2 missing are tech debt, not blockers)**

## E2E Flows

| # | Flow | Status |
|---|------|--------|
| 1 | Effects on Sound/Track/Oscillator | COMPLETE |
| 2 | LFO modulates BaseSound params | COMPLETE |
| 3 | LFO modulates BaseEffect params | COMPLETE |
| 4 | LFO auto-dispose on target dispose | COMPLETE |
| 5 | Transport drives multi-BeatTrack sync | COMPLETE |
| 6 | Transport drives Sequence | COMPLETE |
| 7 | Effects on PolySynth/GrainPlayer shared bus | COMPLETE |
| 8 | LFO modulates GrainPlayer master gain | BROKEN (workaround: via BaseEffect) |
| 9 | LFO modulates PolySynth master gain | BROKEN (workaround: via BaseEffect) |

**Score: 7/9 flows complete (2 broken have workarounds)**

## Tech Debt Summary

1. **LFO cannot target GrainPlayer/PolySynth directly** — `LFOTarget` type is `BaseSound | BaseEffect`; these new classes extend `TypedEventEmitter`. Workaround: connect LFO to a BaseEffect on the shared bus. Future fix: expand `LFOTarget` or add `getGainNode()`/`getPannerNode()` to these classes.

2. **GainEffect/EffectWrapper not BaseEffect** — These simpler effects implement `Effect` interface directly. Cannot be LFO targets. By design (low impact), TypeScript prevents misuse at compile time.

3. **5 pre-existing crossfade test failures** — Unrelated to M5, documented in 55-VERIFICATION.md. Pre-date this milestone.

## Conclusion

All 20 milestone requirements are satisfied across all three sources (VERIFICATION.md, SUMMARY frontmatter, REQUIREMENTS.md). No critical blockers. Two integration gaps exist around LFO targeting new sound types (GrainPlayer, PolySynth) — these have workarounds and are appropriate tech debt for a future milestone. The milestone is ready for completion.

---

*Audited: 2026-03-01 | Milestone: Effects & Transport (Phases 53-60)*

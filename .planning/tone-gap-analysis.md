# Tone.js Feature Gap Analysis

Assessment date: 2026-02-28

## Context

Evaluated what it would take for EZ Web Audio to support "serious music applications" by comparing against Tone.js's ~150+ exported classes/functions.

## What EZ Audio Already Covers

| Category | EZ Audio | Tone.js Equivalent |
|----------|----------|-------------------|
| Sample playback | `Sound`, `Track` (pause/seek/position) | `Player` |
| Multi-sample | `Sampler` (round-robin), `Font` (soundfonts) | `Sampler`, `Players` |
| Synthesis | `Oscillator` (4 waveforms, filters, ADSR) | `Synth` |
| Noise | `createNoise('white'\|'pink'\|'brown')` | `Noise` |
| Effects | `createFilterEffect`, `createGainEffect`, `wrapEffect` (any native node) | `Filter`, `Volume`, `Effect` |
| Drum patterns | `BeatTrack` + `Beat` (active/inactive, round-robin) | No direct equivalent (uses `Sequence`) |
| Layering | `LayeredSound`, `playTogether` | Manual routing |
| Crossfade | `crossfade()` | `CrossFade` |
| Sprites | `AudioSprite` | No built-in |
| Analysis | `Analyzer` (FFT + waveform) | `Analyser`, `FFT`, `Waveform` |
| Musical identity | `MusicallyAware`, `Note`, `frequencyMap` | `Frequency`, `Midi` |
| Gain/Pan control | `SoundController`, `OscillatorController` | `Channel`, `PanVol` |
| Events | `TypedEventEmitter` (play/stop/pause/seek/beat/end) | Event callbacks |

EZ Audio is quite competitive for its target audience. BeatTrack/Beat and AudioSprite are things Tone.js doesn't have out of the box.

## Tier 1: Low Effort, High Value

Could add without changing the library's identity.

| Feature | What Tone.js Has | What It Would Take |
|---------|-------------------|-------------------|
| **Built-in effects** | ~20 effects (delay, reverb, chorus, etc.) | Create pre-built wrappers using `wrapEffect` + native nodes. Distortion, delay, compressor are easy. Reverb needs convolution or algorithmic approach. |
| **LFO** | `LFO` class connectable to any param | Relatively simple — oscillator driving a parameter range. Enables auto-filter, tremolo, vibrato, auto-pan. |
| **Compressor/Limiter** | `Compressor`, `Limiter`, `Gate` | Thin wrappers around `DynamicsCompressorNode` — trivial. |
| **EQ** | `EQ3` (3-band) | Chain of `BiquadFilterNode`s — straightforward. |

### Effects Discussion Topics (for when we get to implementation)
- Possibility of supporting effects written in WASM languages (Rust, C++, etc.)
- Whether it's possible to support any type of VSTs
- Reference ember-audio routing example
- Apply effects to piano demo
- Show plugging in tuna.js or similar external effect libraries

## Tier 2: Medium Effort, Meaningful Capabilities

More architecture work required.

| Feature | What Tone.js Has | Consideration |
|---------|-------------------|--------------|
| **Transport / Clock** | Global BPM-synced timeline with scheduling, swing, time signatures | Tone.js's crown jewel. BeatTrack currently has its own timing but it's per-track, not global. A shared transport would let multiple BeatTracks sync to one clock. |
| **Sequencer / Pattern** | `Sequence`, `Part`, `Pattern` (arpeggiator) | Could extend BeatTrack concept into a more general sequencer. `Sequence` is essentially what BeatTrack already is, but Tone's version accepts arbitrary callbacks and musical time notation. |
| **Musical time notation** | `"4n"`, `"8t"`, `"2m"`, `"@1m"` | Nice DX. Would require a time parser and BPM reference. |
| **Polyphony management** | `PolySynth` (voice allocation) | Currently users create multiple oscillators manually. A polyphonic wrapper would be useful. |
| **GrainPlayer** | Independent pitch/time control | Significant but doable with AudioWorklet. |

## Tier 3: Out of Scope

Would fundamentally change the library. Not pursuing, but documented for reference.

| Feature | What Tone.js Has | Why Out of Scope |
|---------|-------------------|-----------------|
| **Signal-rate parameter automation** | Everything is a `Signal` — audio-rate modulation, math ops | Core Tone.js architecture. EZ Audio uses Web Audio scheduling API directly which is sufficient. |
| **Audio-rate math** | `Add`, `Multiply`, `Scale`, etc. | For building custom synth architectures. Out of scope for "EZ." |
| **Offline rendering** | `Offline()` for faster-than-realtime bounce | Niche. Useful for export/bounce but not core mission. |
| **Recording** | `Recorder` via MediaRecorder | Useful but orthogonal to the library. |
| **3D spatial audio** | `Panner3D` (HRTF) | Very niche. |

## Summary

EZ Audio is closer than expected for 80% of use cases. The key gaps that separate "toy" from "music app":

1. **Shared transport/clock** — enables DAWs, multi-track sequencers, tempo-synced anything
2. **Built-in effects** — `wrapEffect` escape hatch is powerful but forces Web Audio API knowledge
3. **LFO** — unlocks tremolo, vibrato, auto-filter, wobble bass
4. **PolySynth** — playing chords without manual oscillator management

# Phase 54: LFO - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a low-frequency oscillator that developers can connect to any audio parameter on any sound or effect, enabling tremolo, vibrato, auto-filter, and auto-pan modulation with no memory leaks. Does NOT include Transport integration (Phase 55) or sequencer features (Phase 56).

</domain>

<decisions>
## Implementation Decisions

### API Shape & Connection Model
- LFO connects to both sound-level parameters (gain, pan, frequency, detune) AND effect parameters (e.g., FilterEffect cutoff frequency)
- One LFO can modulate multiple targets simultaneously — one LFO controlling gain on sound A and filter frequency on sound B at the same time
- Connection pattern: `lfo.connect(target, paramName)` style — mirrors Web Audio's native AudioNode.connect() pattern

### Modulation Depth & Range
- Depth is specified as a ratio of the target's current value — `depth: 0.3` means ±30% of current value
- Frequency and depth are changeable while LFO is running, with smooth ramping support (not just immediate snap)

### Waveform Options
- Standard four waveform types: sine, square, sawtooth, triangle
- Sample-and-hold (S&H / random step) waveform — classic synth feature for glitchy/generative modulation
- Custom PeriodicWave support for advanced users — `createLFO({ waveform: myPeriodicWave })`

### Lifecycle & Sync
- LFO runs independently from connected sounds by default
- Opt-in lifecycle sync via connection options: `lfo.connect(sound, 'gain', { syncLifecycle: true })` ties LFO start/stop to sound play/stop
- Opt-in retrigger mode: `lfo.connect(sound, 'gain', { retrigger: true })` resets LFO phase to 0 each time sound.play() fires
- Basic BPM sync without Transport: `lfo.syncToBPM(120, '1/4')` sets frequency to match quarter-note rate at given BPM — just math, no Transport dependency

### Claude's Discretion
- Ownership model: whether connection is LFO-driven (push) or sound-driven (pull), or hybrid — pick based on cleanup ergonomics and BaseSound surface area
- AudioContext sourcing: require upfront vs. infer from first connection — pick based on existing factory function patterns
- Per-target depth semantics: whether frequency modulation uses cents/semitones vs. uniform ratio — pick what produces musically useful results
- Clamping: whether to auto-clamp modulated values to safe ranges — pick based on Web Audio's native behavior
- Presets: whether to ship named presets (slowTremolo, fastVibrato, etc.) or just document examples — pick based on EZ Audio's simplicity philosophy
- Phase configurability: whether LFO starting phase is configurable (0–360°) — pick based on implementation cost vs. usefulness
- Dispose behavior: what happens to LFO when connected sounds are disposed — pick approach that prevents memory leaks

</decisions>

<specifics>
## Specific Ideas

- BPM sync DX should feel like "set BPM and note length, don't do math" — user explicitly wants this simplicity
- S&H waveform is important for creative/generative use cases
- PeriodicWave acceptance makes the LFO a power-user tool too, not just beginner-friendly

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Oscillator` class: wraps OscillatorNode with frequency, type, envelope — LFO's internal oscillator can follow similar patterns
- `BaseEffect` class: input/output node pattern with bypass and wet/dry mix — LFO is NOT an effect but BaseEffect's node management is a reference pattern
- `OscillatorController`: manages frequency AudioParam with scheduled value changes — useful reference for LFO parameter ramping
- Effects system: `getAudioParam()` method on effects exposes AudioParams — LFO can use this to connect to effect parameters

### Established Patterns
- Factory functions (`createSound`, `createOscillator`, etc.) in `src/index.ts` — LFO needs a `createLFO()` factory
- `dispose()` pattern on sounds handles cleanup — LFO needs similar cleanup
- `SoundControlType = 'gain' | 'pan' | 'detune'` + OscillatorController adds `'frequency'` — LFO target types should align
- Audio chain: `audioSourceNode → [connections] → gainNode → pannerNode → destination` — LFO modulates params on nodes in this chain

### Integration Points
- `src/index.ts`: new `createLFO()` factory function export
- `src/effects/index.ts`: LFO may need to import Effect interface to type-check effect targets
- `BaseSound.gainNode` and `BaseSound.pannerNode`: LFO modulation targets
- `OscillatorController.frequencyNode`: vibrato modulation target

</code_context>

<deferred>
## Deferred Ideas

- BPM-aware note length syntax on BeatTrack (similar DX to LFO's syncToBPM — "set BPM and note length, don't do math") — consider for BeatTrack enhancement or Phase 55 Transport integration
- Transport-synced LFO (lock LFO to Transport clock) — Phase 55

</deferred>

---

*Phase: 54-lfo*
*Context gathered: 2026-02-28*

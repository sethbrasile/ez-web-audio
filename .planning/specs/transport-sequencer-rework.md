# Transport/Sequencer Rework — Design Spec

**Date:** 2026-07-11
**Bead:** ez-audio-a30 (gate-2 round-4 feedback, collab session held)
**Approach:** Core-first, layered — core API features, screech root-cause, then demo rebuild on the real API.

## Problem

Gate-2 listening feedback: transport/sequencer demo fundamentally off. Diagnosis against benchmarks (Tone.js Transport, Ableton Learning Music, Chrome Labs shiny-drum-machine, drumhaus, io-808):

1. Grid is read-only — a sequencer you can't touch is a screenshot, not a demo.
2. Bass lane uses raw per-note Oscillators with manual gain-ramp gating — bypasses library idioms (library-fidelity violation) and is the prime suspect for the intermittent play glitch/screech.
3. No swing (shuffle preset hand-fakes swung positions), no transport loop region (bar counter runs unbounded), no velocity (patterns sound flat).
4. Piano soundfont stabs sound dated.
5. Patterns composed ad hoc rather than sourced from authentic material.

## Scope decisions (Seth, 2026-07-11)

- Core + demo rework (not demo-only).
- Demo identity: **Transport showcase** — teaches transport concepts. Phase 76 groovebox remains the full-instrument demo (kits, per-step fx). No merge.
- Melodic content: bass + synth lead/keys, voices matched to each preset's genre. No soundfont.
- Editability: drum lanes editable; melodic lanes read-only preset visualization.
- Core features in scope: swing, loop region, per-step velocity/accent. Quantized (next-bar) preset changes **deferred** — log as future work.

## Part 1 — Core API

### Swing
- `transport.swing: number` — 0–1, default 0. 0 = straight; 1 = full triplet feel (off-subdivision delayed to the triplet position). Same scale as Tone.js; maps to MPC 50%→66%.
- `transport.swingSubdivision: 1/8 | 1/16` — default `1/16` (MPC-style; matches the 16th-note step-grid context).
- Implementation: applied at schedule time in `Transport.schedulerTick()`. Any BeatTrack beat or Sequence event whose musical position falls on an odd subdivision of `swingSubdivision` gets `+ swing * subdivisionDuration / 3` added to its scheduled AudioContext time. Events that do not land exactly on a subdivision boundary (e.g. hand-placed off-grid Sequence events) are never swung. `tick` events / position tracking unaffected — playhead stays on-grid. Live-changeable during playback, like BPM.

### Loop region
- `transport.loop: boolean` (default false), `transport.loopStart` / `transport.loopEnd` (MusicalTimeNotation, e.g. `'2m'`).
- When enabled: tick index wraps at loop end; position display wraps; synced-track beat indices and Sequence elapsed-beats computed modulo loop length.
- Pattern length vs loop length mismatch is allowed (polymeter remains possible with loop off).

### Velocity / accent
- `Beat.velocity: number` — 0–1, default 1. Playback gain scaled by velocity.
- `BeatTrack.setPattern` accepts numbers: `[1, 0, 0.6, 0]` — 0 = rest, any other value = velocity. Existing 0/1 arrays behave identically (backward compatible).
- Motivation: consumes 260-book accent rows directly; Phase 76 groovebox needs it regardless.

All three features TDD'd; dedicated unit tests for swing math, loop wrap (position + track index + sequence), velocity gain scaling and pattern parsing.

## Part 2 — Screech root-cause

Systematic-debugging pass, before demo rebuild. Ranked hypotheses:

1. Demo's manual `gain.setValueAtTime`/`linearRampToValueAtTime` collides with the library's own gain writes on retrigger (`playIn` while a previous note's ramp is still pending → param discontinuity).
2. Oscillator retrigger race: `setup()` neutralizes the previous node while its ramp is still scheduled.
3. Soundfont note overlap.

Deliverable: reproduction + root cause recorded on the bead. If library-level → core fix + regression test. If demo-only → note it; the rebuild removes the trigger site either way.

## Part 3 — Demo rebuild ("Transport showcase")

### Pattern source
Presets pulled from machine-readable transcriptions of *200/260 Drum Machine Patterns* (Bardet) — repos: `stephenhandley/DrumMachinePatterns`, `gvellut/dmp_midi`. Accent rows map to velocity. (Rhythm patterns are not copyrightable; transcriptions used as data reference, patterns re-encoded into our preset format.)

### Presets

| Preset | Book pattern family | BPM | Swing | Lead voice |
|---|---|---|---|---|
| Rock | Rock 1 | 112 | 0 | saw pluck + lowpass |
| Funk | Funk | 104 | ~15% | square clav stab |
| Disco | Disco | 118 | 0 | octave saw stab |
| Bossa | Bossa Nova | 132 | 0 | soft sine/tri keys |
| Shuffle | Shuffle/blues | 96 | ~55% | tri lead |

- Drum lanes: kick / snare / hihat (+ clap where the book pattern uses it), pattern + accents from book.
- Bass + lead composed per preset, one key each, scheduled via `Sequence.at()`.
- Both melodic voices built with library idioms only: Oscillator + envelope. No raw gain automation, no soundfont. Piano lane removed.
- Shuffle preset is written STRAIGHT on the grid — the swing knob supplies the shuffle. Turning it to 0 flattens the groove audibly (pedagogical payoff).

### UX
- Drum lanes editable: click toggles step; click on an active cell cycles normal → accent → off. Accent cells rendered brighter/deeper.
- Bass/lead lanes: read-only visualization with note names (as now).
- Transport bar: Play/Pause/Stop, bar:beat display (wraps 1–2 via loop region), BPM slider, swing knob 0–100%.
- Loop region fixed at `'2m'`; the 32-step grid itself is the loop visualization.
- Mute/Solo retained.
- Preset switch stays instant-apply (quantized change deferred).
- No loading buttons; first interaction initializes (existing rule). No layout shift (existing rule).

### Docs
Demo page prose rewritten around transport concepts: multi-resolution track sync, swing, loop region, live BPM. Code samples show the new API surface.

## Testing
- Unit: swing scheduling math, loop wrap, velocity (core).
- E2E: grid editing (toggle/accent cycle), swing knob affects state, preset switching, play/stop.
- Loudness E2E rows updated for new voices.

## Deferred / future work
- Quantized (next-bar) pattern and preset changes.
- Tempo ramps (`bpm.rampTo`).
- Position seek (`transport.position = '2:1:0'`).
- Envelope-attack-to-1.0 core API friction (already tracked — strongest pre-1.0 candidate).

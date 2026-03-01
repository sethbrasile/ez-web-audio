# Milestone 6: Documentation, MIDI, Amp Modeling & Showcase Demos

## Overview

Milestone 6 covers documentation and interactive demos for all Milestone 5 features (built-in effects, LFO, Transport, Sequence, PolySynth, GrainPlayer), three new library features (BeatTrack musical time notation, MIDI input utility, amp model API), and two flagship showcase demos (guitar pedalboard, multi-track DAW).

**Phases: 61-70 (10 total)**
**Structure: Feature-first** — library features ship before their demos, each phase is self-contained, showcase demos come last as capstones.

---

## Audio Asset Strategy

New audio assets (~2-3 MB total) sourced from permissively-licensed libraries:

| Use Case | Source | License | Est. Size |
|---|---|---|---|
| Guitar DI clips (3-4) | FreePats Clean Electric Guitar "Direct" | CC0 | ~500 KB |
| Cabinet IRs (3-5) | musical-artifacts.com | CC-BY 4.0 | ~100 KB |
| Spring reverb IR | cwilso/web-audio-samples | Apache 2.0 | ~20 KB |
| Granular: vocal swells | Signature Sounds "Angelic Choirs SFX" | CC0 | ~150 KB |
| Granular: spoken word | Signature Sounds / Producer Space | CC0 | ~100 KB |
| Granular: textures | Signature Sounds "Experimental Soundscapes" | CC0 | ~150 KB |

All WAV sources trimmed to 5-15 seconds and encoded to MP3 at 128kbps for web delivery.

---

## Sidebar Organization

New pages added to existing sidebar sections (no restructuring):

- **Synthesis**: LFO, PolySynth, Arpeggiator
- **Timing & Sequencing**: Transport
- **Effects & Routing**: Built-in Effects, Pedalboard
- **Creative**: GrainPlayer, DAW

---

## Phase Details

### Phase 61: BeatTrack Musical Time Notation (Library)

Update BeatTrack to accept musical time notation strings (`'4n'`, `'8n'`, `'16n'`) in addition to existing numeric fractions.

**Scope:**
- `syncTo(transport, { noteType: '4n' })` accepts string notation alongside `1/4` numeric
- Uses existing `parseMusicalTime()` utility already exported from the library
- Standalone BeatTrack accepts optional `bpm` parameter to resolve musical time without a Transport
- Fully backward compatible — existing numeric `noteType` values continue to work

**Success criteria:** Existing tests pass unchanged; new tests cover string notation; existing drum machine demos unaffected.

---

### Phase 62: MIDI Input Utility (Library)

Add `createMIDIInput()` to the library wrapping the Web MIDI API.

**Scope:**
- `createMIDIInput()` factory — requests MIDI access, returns a `MIDIInput` instance
- Events: `noteon` (note, velocity, channel), `noteoff`, `cc` (control change)
- `midiInput.listDevices()` — available MIDI devices
- `midiInput.selectDevice(id)` — connect to specific device
- `MIDIInput.isSupported()` static method — checks `navigator.requestMIDIAccess` availability
- Graceful degradation for non-Chromium browsers

**Docs site additions:**
- `useMIDI()` Vue composable wrapping the library utility
- Code examples showing Vue composable, vanilla TS, and React hook patterns (if substantive enough to be compelling)

**Success criteria:** MIDI input works in Chrome with a connected USB MIDI device; unsupported browsers get a clear "not supported" message (shown but disabled in UI).

---

### Phase 63: Amp Model API (Library)

Add `createAmpModel()` as a first-class connectable effect chain.

**Signal chain:**
```
Input Gain -> Pre-amp Stage 1 (Gain + WaveShaper + HP Filter)
           -> Pre-amp Stage 2 (Gain + WaveShaper + HP Filter)
           -> Tone Stack (bass lowshelf + mid peaking + treble highshelf)
           -> Master Volume
           -> Power Amp (softer WaveShaper)
           -> Presence (highshelf)
           -> Cabinet IR (ConvolverNode)
```

**Scope:**
- Asymmetric tube curves for warm even-order harmonics
- `oversample: '4x'` on all WaveShaperNodes
- Presets: `'clean'`, `'crunch'`, `'highgain'` (Fender/Marshall/Mesa-inspired frequency centers)
- Parameters: `drive`, `bass`, `mid`, `treble`, `master`, `presence`
- `ampModel.loadCabinet(urlOrBuffer)` — load cabinet IR
- Ships with 3-5 bundled cabinet IRs (~17 KB each)
- Implements `Connectable` interface for `sound.addConnection(ampModel)`

**Research references:**
- WebAudio-Guitar-Amplifier-Simulator-3 (MIT) for architecture validation
- AmpBooks DSP reference for tube curve modeling
- Inter-stage coupling filters: 120 Hz (clean), 200 Hz (crunch), 300+ Hz (highgain)

**Success criteria:** Dry guitar DI clip played through each preset sounds distinctly different and musically convincing; cab IR swap changes the character audibly.

---

### Phase 64: Built-in Effects Documentation

**New page:** `docs/examples/built-in-effects.md`

Showcases `createDelay`, `createReverb`, `createDistortion`, `createCompressor`, `createEQ` with an interactive demo.

**Interactive demo:** Sound source (oscillator or loaded sample) with a chain of toggleable effects. Each effect has a knob/slider panel. Visual signal chain diagram (Source -> Effect -> Gain -> Pan -> Destination).

**Updates to existing pages:**
- `effects.md` — add references to new factory functions. Position `wrapEffect()` as the "advanced/custom" approach.
- `audio-routing.md` — update manual examples to show new factories first, keep `wrapEffect()` patterns in a "custom effects" section.

**Sidebar:** Effects & Routing

---

### Phase 65: LFO Documentation + Demo

**New page:** `docs/examples/lfo.md`

**Interactive demo:** Four mini-demos showing one LFO application each:
1. **Tremolo** — LFO -> gain on oscillator, rate/depth sliders
2. **Vibrato** — LFO -> frequency on oscillator
3. **Auto-pan** — LFO -> pan, stereo sweep
4. **Auto-filter** — LFO -> filter cutoff frequency

Each has waveform selector (sine, square, triangle, sawtooth, S&H) and BPM sync toggle demonstrating `lfo.syncToBPM()`.

**Sidebar:** Synthesis

---

### Phase 66: Transport + Sequence Documentation

**New page:** `docs/examples/transport.md`

**Interactive demo:** Multi-track BeatTrack setup synced to a shared Transport:
- 3-4 BeatTracks: kick on `'4n'`, snare on `'4n'`, hihat on `'8n'` or `'16n'`
- Transport controls: play/pause/stop, BPM slider, position display (bar:beat:tick)
- Per-track mute/solo with stackable solo
- A Sequence triggering a melodic event on specific beats to demo `createSequence()` + `seq.at()`

**Sidebar:** Timing & Sequencing

---

### Phase 67: PolySynth + Arpeggiator Documentation

**New page:** `docs/examples/polysynth.md` — basic chord playback demo

**New page:** `docs/examples/arpeggiator.md` — rich arpeggiator demo

**PolySynth demo:**
- PianoKeyboard.vue connected to PolySynth
- Chord playback, voice count display, voice stealing demonstration
- USB MIDI support via `createMIDIInput()`
- MIDI indicator: shows device name or "Not supported in this browser"

**Arpeggiator demo:**
- Switchable sound source: PolySynth oscillators / soundfont piano
- Selectable scales/modes: major, minor, pentatonic, dorian, mixolydian, etc.
- Controls: direction (up, down, up-down, random), octave range (1-3), rate (synced to Transport BPM via musical time notation)
- Waveform selector + ADSR controls in synth mode
- USB MIDI support for root note selection
- Built on Transport + Sequence internally

**Sidebar:** Synthesis

---

### Phase 68: GrainPlayer Documentation + Demo

**New page:** `docs/examples/grain-player.md`

**Interactive demo:**
- Source selector: curated CC0 clips (vocal swell, spoken word, synth pad) + user file upload via file picker
- Real-time parameter controls: grain size, overlap, pitch (semitones), jitter, position (scrub slider)
- Visual waveform display showing current playback position and grain windows
- Play/stop controls

**Audio assets:** 3-5 clips sourced from Signature Sounds (CC0), trimmed to 5-15 seconds, encoded to MP3.

**Sidebar:** Creative

---

### Phase 69: Guitar Pedalboard + Amp Simulator Demo

**New page:** `docs/examples/pedalboard.md`

**Interactive demo — a visual pedalboard/amp rig:**

**Input section:**
- Dropdown to select pre-recorded clean guitar DI clips (FreePats CC0)
- Toggle for live microphone/line input via `getUserMedia()`

**Pre-amp pedals:** Compressor, Wah (sweepable bandpass / LFO-driven auto-wah)

**Amp section:** `createAmpModel()` with preset selector (clean/crunch/highgain) and knobs for drive, bass, mid, treble, master, presence

**Cabinet selector:** Dropdown of bundled IRs (clean combo, rock 2x12, metal 4x12)

**Post-amp effects:** Delay, Reverb (room/hall IR), Tremolo (LFO), Chorus

**Visual style:** Skeuomorphic pedal boxes on dark "pedalboard" background. Each pedal is a card with rotary knob sliders, on/off stomp LED, and label. Signal flows left-to-right. Each effect has a bypass toggle.

**Audio assets:** Guitar DI clips (~500 KB), cabinet IRs (~100 KB), spring reverb IR (~20 KB).

**Sidebar:** Effects & Routing

---

### Phase 70: DAW / Multi-Track Sequencer Demo

**New page:** `docs/examples/daw.md`

**The capstone showcase — a simplified but functional 6-track DAW.**

**Layout:**
- **Top bar:** Transport controls (play/pause/stop, record), BPM, time signature, position display, master volume
- **Track list (left rail):** 6 tracks with name, instrument selector, mute/solo, volume fader, pan knob
- **Piano roll editor (main area):** Clickable grid for note placement. Horizontal = time (bars/beats), vertical = pitch. Quantize snap selector.
- **MIDI indicator:** Connected device name or "Not supported in this browser"

**Available instruments (per-track selector):**
- Synth Lead — PolySynth (saw/square, ADSR)
- Synth Pad — PolySynth (longer attack/release)
- Synth Bass — PolySynth (low octave, filtered)
- Piano — Soundfont (existing midi.js CDN)
- Drum Kit — BeatTrack with step sequencer grid view
- Sampled Drums — existing kick/snare/hihat via BeatTrack

**Piano roll features:**
- Click to place note, drag right edge to resize duration
- Click to select, drag to move, delete to remove
- Velocity editing
- MIDI record: arm track, hit play, play USB MIDI keyboard, notes appear in real time
- Quantize snap: 1/4, 1/8, 1/16, 1/32
- Loop region selector

**Effects per track:** Optional chain via dropdown (delay, reverb, distortion, compressor, EQ) using `addConnection()`

**What this showcases:**
- `createTransport()` — master clock
- `createSequence()` — note scheduling
- `createPolySynth()` — synth instruments
- `createBeatTrack()` + `syncTo(transport)` — drum tracks
- `createMIDIInput()` — USB MIDI recording
- Mute/solo — Transport track management
- Effects chain — `addConnection()` with built-in effects
- Musical time notation — throughout

**Sidebar:** Creative

**Estimated component size:** 800-1200 lines of Vue

---

## Phase Dependency Graph

```
Phase 61 (BeatTrack timing) ─────────────────────────┐
Phase 62 (MIDI Input) ───────────────────────────┐    │
Phase 63 (Amp Model) ──────────────────────┐     │    │
                                           │     │    │
Phase 64 (Effects docs) ──────────────────┐│     │    │
Phase 65 (LFO docs) ─────────────────────┐││     │    │
Phase 66 (Transport docs) ──────────────┐│││     │    │
Phase 67 (PolySynth + Arp docs) ───────┐││││     │    │
Phase 68 (GrainPlayer docs) ──────────┐│││││     │    │
                                      │││││├─────┤    │
Phase 69 (Pedalboard) ◄──────────────────┘63     │    │
Phase 70 (DAW) ◄──────────────────────────────all of above
```

Phase 70 depends on all prior phases. Phase 69 depends on Phase 63 (Amp Model). All other phases are independent and could theoretically run in parallel, though the feature-first ordering (61-63 before 64-68) is recommended.

---

## License Attribution Requirements

| Asset Source | License | Attribution Needed |
|---|---|---|
| FreePats guitar DI | CC0 | No |
| Signature Sounds samples | CC0 | No |
| Producer Space samples | CC0 | No |
| musical-artifacts.com cab IRs | CC-BY 4.0 | Yes — credit author in docs page |
| cwilso/web-audio-samples spring IR | Apache 2.0 | Yes — include license notice |
| nbrosowsky/tonejs-instruments | MIT (code) / CC-BY 3.0 (samples) | Yes — if used |

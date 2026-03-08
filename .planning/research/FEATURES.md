# Feature Landscape

**Domain:** Interactive audio education demo pages (VitePress + Vue 3)
**Researched:** 2026-03-08
**Confidence:** HIGH

## Context

This research covers 5 new demo pages for M5 features that already exist in the ez-web-audio library but lack interactive documentation examples. The existing docs site has 20 example pages and 22 Vue components establishing clear patterns: lazy `initIfNeeded()` on first interaction, no load buttons, Vue `ref()` for reactive state, `onUnmounted` cleanup, volume warnings for oscillator-based demos, and consistent VitePress styling.

Available audio assets: `short-music.mp3` (2.1MB track), drum samples (kick/snare/hihat .wav), `click.mp3`, piano soundfont, `Db5.mp3`/`Eb5.mp3` note samples, sfx-sprite files. New demos requiring longer audio (GrainPlayer) may need an additional sample.

Available library APIs for demos:
- **Effects:** `createDelay`, `createReverb`, `createCompressor`, `createDistortion`, `createEQ`, `createFilterEffect`, `createGainEffect`, `wrapEffect` -- all implementing `Effect` interface (bypass, mix, input, output)
- **LFO:** `createLFO` with frequency/depth/type, `.connect(target, param, options)` with syncLifecycle/retrigger/depthUnit
- **PolySynth:** `createPolySynth` with maxVoices/stealStrategy/type/envelope/filters, `.play(options)` returns VoiceHandle, events: voiceStolen
- **Transport:** `createTransport` with bpm/timeSignature/ticksPerBeat, `.start()/.stop()/.pause()`, position tracking, `.sync(beatTrack)`
- **Sequence:** `createSequence(transport, options)` with musical time notation, `.at(time, callback)`, loop support
- **GrainPlayer:** `createGrainPlayer(buffer, options)` with grainSize/overlap/position/pitch/jitter, real-time parameter adjustment

---

## Demo 1: Effects Chain

**Purpose:** Demonstrate `createDelay`, `createReverb`, `createCompressor`, `createEQ`, `createDistortion`, `addEffect`, `removeEffect`, bypass, and mix controls.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Toggle individual effects on/off | Core value prop of bypass system | Low | `effect.bypass = !effect.bypass` |
| Per-effect parameter sliders | Users need to hear parameter changes | Med | Each effect type has different params |
| Audio source selector | Need input signal to process | Low | Reuse oscillator + noise pattern from FilterDemo |
| Visual effect chain order display | Users must understand signal flow | Low | Horizontal list of effect "cards" |
| Wet/dry mix per effect | Demonstrates mix control | Low | Single slider per effect |
| Play/stop toggle | Basic playback control | Low | Existing pattern from FilterDemo |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Before/after waveform visualization | Lets users SEE the effect | High | Requires two Analyzers (pre/post chain) |
| Preset effect chains | Quick "telephone", "cave reverb", "radio" presets | Med | Pre-configured parameter sets |
| Effect reordering via drag-and-drop | Teaches that order matters in signal chains | High | Requires drag library or manual implementation |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Drag-and-drop reordering | Too complex for docs demo, requires drag library | Show chain order visually, let users toggle effects on/off |
| Saving/loading presets to storage | Scope creep, not about the library | Hardcoded preset buttons |
| External effect (Tuna.js) demo | Adds a dependency to the docs site | Mention in code examples text, not interactive demo |

### Recommended Scope

**5 effect cards** in a fixed chain: EQ (3-band) -> Compressor -> Delay -> Distortion -> Reverb. Each card has: effect name, bypass toggle, 2-3 key parameter sliders, mix slider. Audio source: oscillator (sawtooth at 200Hz, matching FilterDemo) or `short-music.mp3` Track. Include a "preset" dropdown (Clean, Telephone, Cave, Radio, Heavy) that sets all parameters at once.

**Complexity: Medium-High.** Most complex demo due to number of controls. Keep each effect card compact. Estimated ~300-400 lines of Vue.

**Dependencies:** Uses existing `short-music.mp3`. Reuses patterns from FilterDemo and DistortionDemo. No new components needed.

---

## Demo 2: LFO Modulation

**Purpose:** Demonstrate `createLFO`, connecting to parameters (gain, frequency, filter), waveform types, depth/rate control, syncLifecycle, retrigger.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| LFO rate (frequency) slider | Core LFO parameter | Low | 0.1-20 Hz range |
| LFO depth slider | Core LFO parameter | Low | 0-1 range |
| Waveform type selector | 5 types: sine, square, saw, triangle, sample-and-hold | Low | Dropdown or radio buttons |
| Target parameter selector | Show LFO can modulate different params | Med | gain (tremolo), frequency (vibrato), filter cutoff (wah) |
| Play/stop with volume warning | Oscillator-based, can be loud | Low | Existing pattern |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated LFO waveform visualization | Users see the modulation shape in real-time | Med | Canvas drawing the LFO wave with animated phase cursor |
| Side-by-side dry vs modulated comparison | Hear the difference immediately | Med | Two oscillators, one with LFO |
| syncLifecycle / retrigger toggles | Demonstrates advanced LFO options | Low | Two checkboxes |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiple simultaneous LFOs | Confusing for a demo | One LFO, switchable target |
| Custom PeriodicWave editor | Niche, complex UI for minimal value | Mention in docs text only |
| Precise modulation depth visualization (oscilloscope-level) | Requires complex real-time analysis | Simple animated waveform shape is sufficient |

### Recommended Scope

**Single oscillator** (sawtooth, 200Hz) with **one LFO** that can target: gain (tremolo), frequency (vibrato), or filter cutoff (auto-wah). When targeting filter, auto-add a lowpass filter. Controls: rate slider (0.1-20Hz), depth slider (0-100%), waveform selector (5 types), target selector (3 options). Include animated canvas showing the LFO waveform shape with a moving phase dot. Add syncLifecycle and retrigger checkboxes.

**Visual:** Canvas at top showing the LFO waveform (~200px tall), controls below. The waveform draws continuously using `requestAnimationFrame`, showing the selected shape with amplitude matching the depth setting. The canvas draws the mathematical waveform (not actual audio signal) so it works whether audio is playing or not, serving as educational visualization of what the LFO is doing.

**Complexity: Medium.** Canvas animation is the main challenge but follows XYPad patterns. Estimated ~250 lines.

**Dependencies:** No new audio assets needed (oscillator-based). Reuses canvas patterns from XYPad and VisualizationDemo.

---

## Demo 3: PolySynth

**Purpose:** Demonstrate `createPolySynth`, voice allocation, steal strategies, per-voice control, envelope.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Piano keyboard input | Natural interface for polyphonic playing | Low | Reuse existing PianoKeyboard component |
| Computer keyboard mapping | Standard for web synths | Low | Already in PianoKeyboard (a-j keys) |
| Waveform type selector | Choose oscillator type | Low | Dropdown |
| Max voices display | Show the voice pool concept | Low | "Voices: 3/8" counter |
| Volume warning | Oscillator-based | Low | Existing pattern |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Voice allocation visualization | See which voices are active, released, stolen | Med | Row of voice "slots" with color states |
| Steal strategy selector + demonstration | Core PolySynth differentiator | Low | Dropdown with live switching |
| Active voice count with steal indicator | Visual feedback when voice stealing occurs | Low | Flash/highlight when a voice is stolen |
| ADSR envelope controls | Common synth UI, maps to PolySynth envelope option | Med | 4 sliders for attack/decay/sustain/release |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| MIDI input | Requires Web MIDI API, niche hardware | Computer keyboard + mouse/touch on piano |
| Custom voice factory editor | Too advanced for demo | Mention in code example text |
| Multi-octave scrollable keyboard | Complex UI, PianoKeyboard is C4-C5 | One octave is sufficient to demonstrate polyphony |
| Filter controls per voice | Clutters UI, not the point of this demo | Use PolySynth-level filter options only |

### Recommended Scope

**PianoKeyboard component** (C4-C5) at top. Below: voice allocation display as 8 boxes in a row, each showing state (idle=gray, active=green, releasing=yellow, stolen=red flash). Controls: waveform dropdown, max voices slider (1-8), steal strategy dropdown (lru/oldest-active/quietest), ADSR sliders (attack 0-2s, decay 0-2s, sustain 0-1, release 0-3s). Show "Voices: X/Y" and "Steals: N" counter.

Use `polySynth.on('voiceStolen')` event to trigger steal visualization. Use `polySynth.activeVoiceCount` for the counter.

**Complexity: Medium.** PianoKeyboard reuse saves significant effort. Voice visualization is new but simple (colored divs). Estimated ~250-300 lines.

**Dependencies:** Reuses existing `PianoKeyboard.vue` component. No audio assets needed.

---

## Demo 4: Transport + Sequencer

**Purpose:** Demonstrate `createTransport`, `createSequence`, BPM control, time signature, position tracking, mute/solo on synced BeatTracks, musical time notation.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Play/pause/stop transport controls | Core transport functionality | Low | Three buttons |
| BPM slider with live update | Core transport feature, live BPM changes | Low | 60-200 BPM range |
| Position display (bar:beat:tick) | Shows Transport position tracking | Low | `formatPosition()` utility |
| At least 2 synced BeatTracks | Demonstrates multi-track sync | Med | Reuse drum sample patterns |
| Beat grid with playhead indicator | Visual feedback of current position | Med | Existing DrumMachine pattern |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Mute/solo per track | Demonstrates track-level control | Low | Toggle buttons per track row |
| Sequence with musical time events | Shows Sequence scheduling API | Med | Schedule melodic notes at musical positions |
| Time signature selector | Demonstrates time signature support | Low | Dropdown: 4/4, 3/4, 6/8 |
| Live BPM change demonstration | Key selling point -- events auto-adjust | Low | Already works via transport.bpm setter |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full DAW timeline with zoom/scroll | Massive scope, not about the library | Fixed-width beat grid |
| Recording/overdub | Out of scope for ez-web-audio | Pre-set patterns only |
| Piano roll note editor | Complex UI for minimal API demo value | Use Sequence with pre-programmed notes |
| Waveform display per track | Complex, requires per-track analyzer | Beat grid with playhead is sufficient |

### Recommended Scope

**Transport controls** at top: play/pause/stop buttons, BPM slider (60-200), position display (bar:beat:tick), time signature dropdown.

**Two drum BeatTracks** synced to transport (kick + hihat, 16-step patterns), displayed as togglable beat grids (reuse DrumMachine pattern). Each track has mute/solo buttons.

**One Sequence track** displaying a simple bass line: 4 notes scheduled at musical positions ("1:1:0", "1:3:0", "2:1:0", "2:3:0") using `createOscillator` triggered from Sequence callbacks. Show the scheduled events as colored markers on a timeline.

**Key interaction:** Change BPM while playing and hear timing adjust instantly. Toggle mute/solo and see/hear tracks enable/disable.

**Complexity: Medium-High.** Combines Transport + BeatTrack + Sequence. The beat grid is reusable from DrumMachine. The sequence timeline visualization is new. Estimated ~350-400 lines.

**Dependencies:** Drum samples (existing). Reuses beat grid pattern from DrumMachine.vue.

---

## Demo 5: GrainPlayer

**Purpose:** Demonstrate `createGrainPlayer`, independent pitch/time control, grain parameters (size, overlap, jitter), position scrubbing.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Waveform display of source buffer | Shows what audio is being granulated | Med | Canvas waveform drawing |
| Position slider/scrubber | Core GrainPlayer feature (position 0-1) | Low | Slider overlaid on waveform |
| Pitch control (semitones) | Core feature: independent pitch shift | Low | Slider -24 to +24 |
| Play/stop | Basic playback | Low | Existing pattern |
| Grain size slider | Key granular parameter | Low | 0.01-0.5s range |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual grain indicators on waveform | Shows where grains are being sampled from | High | Animated markers at grain positions |
| Jitter visualization | Shows randomization of grain positions | Med | Scatter dots around position indicator |
| Overlap slider | Controls grain density | Low | Simple slider |
| Freeze mode (position stays fixed) | Classic granular technique | Low | Just stop moving position |
| Real-time parameter display | Show current grain stats | Low | Text display of active values |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User audio file upload | Scope creep, security considerations | Use provided sample |
| Multi-position playback (multiple cursors) | Not supported by single GrainPlayer | Single position with jitter demonstrates the concept |
| Grain envelope editor | Too detailed for a demo | Use default Hann window, mention in docs |
| 3D/spectral visualization | Complex, niche | Simple waveform with position indicator |

### Recommended Scope

**Waveform display** (canvas, ~150px tall) showing the source audio buffer with a vertical position indicator line and a shaded "grain window" region (position +/- grainSize). Controls below: position slider (0-1), pitch slider (-24 to +24 semitones), grain size slider (0.01-0.5s), overlap slider (0.01-0.2s), jitter slider (0-0.5). Play/stop button. Real-time display showing: "Position: 45%", "Pitch: +7 semitones", "Grain Size: 100ms".

**Audio source:** Use `short-music.mp3` loaded via `createSound` to get the AudioBuffer, then pass to `createGrainPlayer`. This requires loading an audio file, unlike the oscillator demos.

**Key interaction:** Drag position slider while playing to "scrub" through the audio. Adjust pitch without changing speed (the core granular synthesis value proposition). Increase jitter for organic textures.

**Complexity: Medium.** Waveform drawing is the main visual challenge. Follows VisualizationDemo canvas patterns. Estimated ~250-300 lines.

**Dependencies:** Requires `short-music.mp3` (already exists in docs/public/audio/). The 2.1MB track is long enough for granular exploration. No additional audio asset needed.

---

## Feature Dependencies

```
PianoKeyboard.vue (existing) --> PolySynth Demo (reuses component)
DrumMachine beat grid pattern --> Transport+Sequencer Demo (reuses pattern)
FilterDemo init pattern --> All 5 demos (lazy initIfNeeded)
VisualizationDemo canvas pattern --> LFO Demo, GrainPlayer Demo (canvas drawing)
XYPad canvas/input pattern --> LFO Demo (animated waveform)
short-music.mp3 (existing) --> Effects Chain Demo, GrainPlayer Demo
drum samples (existing) --> Transport+Sequencer Demo
```

## Cross-Demo Shared Patterns

All 5 demos share these established patterns from the existing 22 components:

1. **Lazy init**: `let lib: any = null; async function initIfNeeded() { if (!lib) lib = await import('ez-web-audio') }`
2. **Volume warning**: Yellow box at top for oscillator-based demos (Effects Chain, LFO, PolySynth)
3. **Error display**: `ref('')` with red error box in template
4. **Cleanup**: `onUnmounted()` stops all audio, cancels animation frames
5. **VitePress styling**: `.demo { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 1rem; background: var(--vp-c-bg-soft); }`
6. **Touch support**: `@touchstart.prevent` alongside mouse events
7. **Focus-visible**: `outline: 2px solid var(--vp-c-brand)` on interactive elements
8. **llm-exclude/llm-only**: Interactive demos wrapped in `<llm-exclude>`, text descriptions in `<llm-only>` for AI discoverability

## MVP Recommendation

**Build order (based on complexity and dependency):**

1. **LFO Modulation Demo** -- Simplest new visualization (animated waveform), no audio assets needed, standalone
2. **PolySynth Demo** -- Reuses PianoKeyboard component, moderate complexity, standalone
3. **Effects Chain Demo** -- Most controls but each effect card is repetitive, reuses existing audio
4. **GrainPlayer Demo** -- Needs waveform visualization, may need new audio asset
5. **Transport + Sequencer Demo** -- Most complex, combines multiple concepts, benefits from patterns established in earlier demos

**Defer:** Before/after waveform visualization on Effects Chain (can add later). Grain position visualization on GrainPlayer waveform (start with simple position line, add grain markers later if desired).

## Complexity Summary

| Demo | Est. Lines | Est. Effort | New Patterns | Reuse |
|------|-----------|-------------|--------------|-------|
| LFO Modulation | ~250 | Low-Med | Animated waveform canvas | XYPad canvas |
| PolySynth | ~250-300 | Medium | Voice allocation viz | PianoKeyboard |
| Effects Chain | ~300-400 | Med-High | Multi-effect card layout | FilterDemo, DistortionDemo |
| GrainPlayer | ~250-300 | Medium | Buffer waveform drawing | VisualizationDemo |
| Transport+Sequencer | ~350-400 | Med-High | Sequence timeline, mute/solo | DrumMachine beat grid |

## Sources

- [Tone.js Step Sequencer](https://tonejs.github.io/examples/stepSequencer) - Transport/sequencer UI patterns
- [Tone.js PolySynth docs](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html) - Polyphonic voice management patterns
- [ZYA Granular Synthesiser](https://zya.github.io/granular/) - Granular synthesis web UI with waveform interaction
- [Pedalboard.js](https://dashersw.github.io/pedalboard.js/) - Effect chain toggle/bypass UI patterns
- [CodePen LFO slider demo](https://codepen.io/eti313/pen/rOgWrG) - LFO parameter control with range sliders
- [MDN Web Audio Advanced Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) - Sequencing and scheduling patterns
- [web-synth LFO module](https://github.com/chasms/web-synth/pull/12) - LFO animated waveform preview with phase cursor
- [W3C Web Audio Demo List](https://webaudio.github.io/demo-list/) - Reference demos for various Web Audio features
- [Pedalboard Audio Studio](https://github.com/jo56/pedalboard-audio-studio) - Drag-and-drop effect reordering UI
- [Building a sequencer with Web Audio](https://www.ivanprignano.com/posts/building-a-sequencer-web-audio/) - Sequencer UI patterns
- Existing ez-web-audio demos (FilterDemo, DistortionDemo, XYPad, DrumMachine, VisualizationDemo, PianoKeyboard, SynthDrumKit) - Established project patterns

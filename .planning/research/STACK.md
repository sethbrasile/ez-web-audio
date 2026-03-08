# Technology Stack

**Project:** EZ Web Audio — Milestone 7 Feature Demo Pages
**Researched:** 2026-03-08

## Context: What Is NOT Being Researched

The core library, build tooling, and docs infrastructure are all proven and unchanged. This research covers ONLY what is needed for building **5 new interactive demo pages** in the existing VitePress + Vue 3 docs site. All M5 audio features (effects, LFO, PolySynth, Transport/Sequencer, GrainPlayer) are already built and exported.

## Recommendation: No New Dependencies

**Confidence:** HIGH

After reviewing all 22 existing demo components, the established patterns already cover every UI need for the M7 demos. The project has a strong zero-dependency philosophy for good reason, and adding UI component libraries for 5 demo pages would be architectural debt for marginal gain.

### Evidence from Existing Components

| UI Need | Already Solved By | Component Example |
|---------|-------------------|-------------------|
| Sliders/Range inputs | Native `<input type="range">` + scoped CSS | FilterDemo.vue, DistortionDemo.vue |
| Waveform/spectrum visualization | Canvas 2D + `requestAnimationFrame` | VisualizationDemo.vue |
| Piano keyboard | Custom CSS + mouse/touch/keyboard events | PianoKeyboard.vue (reusable) |
| Signal chain diagram | CSS flexbox + styled divs | DistortionDemo.vue |
| Parameter controls with labels | `<label>` + range + value display pattern | FilterDemo.vue (logarithmic mapping included) |
| 2D XY pad control | Canvas-based with mouse/touch tracking | XYPad.vue |
| Button groups/toggles | CSS-styled buttons with `:class="{ active }"` | FilterDemo.vue, SynthKeyboard.vue |
| ADSR controls | Four range sliders with presets | SynthKeyboard.vue |
| Drum machine grid | CSS grid + BeatTrack reactive integration | DrumMachine.vue, DrumMachineVue.vue |
| Dropdowns/selects | Native `<select>` + `v-model` | FilterDemo.vue, VisualizationDemo.vue |

---

## Recommended Stack

### Core Framework (unchanged)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vue 3 | (via VitePress 1.6.4) | Demo component framework | Already in use; all 22 demos are Vue SFCs |
| VitePress | ^1.6.4 | Docs site with Vue component embedding | Already configured and working |
| TypeScript | ^5.9.3 | Type safety in demo components | Already configured |

### UI Controls: Native HTML + Scoped CSS

| Control Type | Implementation | Why Not a Library |
|-------------|----------------|-------------------|
| Knobs/rotary controls | Native `<input type="range">` styled vertically, or CSS-styled circular knob using `transform: rotate()` | @slipmatio/control-knob has 11 GitHub stars, last updated April 2024, 8 open issues -- too unmaintained to depend on |
| Sliders | Native `<input type="range">` with custom CSS | Already used in 6+ components; consistent, accessible, zero-bundle-cost |
| Waveform display | `<canvas>` with Canvas 2D API | VisualizationDemo.vue already implements this pattern with DPI-aware rendering |
| Frequency spectrum | `<canvas>` with Canvas 2D API | VisualizationDemo.vue already has frequency bar rendering |
| Piano keyboard | PianoKeyboard.vue (existing reusable component) | Already built with mouse, touch, and keyboard support including glissando |

### Visualization: Canvas 2D API (native)

| Technology | Purpose | Why |
|------------|---------|-----|
| Canvas 2D | Waveform, spectrum, LFO wave, grain position display | Already proven in VisualizationDemo.vue; zero dependencies; full control over rendering |
| `requestAnimationFrame` | Animation loop for real-time visualizations | Already used in VisualizationDemo.vue and XYPad.vue |
| `devicePixelRatio` scaling | Crisp rendering on Retina/HiDPI | Pattern already established in VisualizationDemo.vue |

### Audio Integration: ez-web-audio (the library itself)

| Feature | API to Use | Notes |
|---------|-----------|-------|
| Effects chain | `createDelay()`, `createReverb()`, `createCompressor()`, `createFilterEffect()`, `createDistortion()` | All M5 effect factories are exported |
| LFO | `createLFO()` | Connects to any AudioParam |
| PolySynth | `createPolySynth()` | Voice allocation with steal strategies |
| Transport | `createTransport()` | BPM clock, position tracking |
| Sequencer | `createSequencer()` | Musical time notation scheduling |
| GrainPlayer | `createGrainPlayer()` | Pitch/time independent control |
| Analyzer | `createAnalyzer()` | `getFrequencyData()`, `getTimeDomainData()` for visualizations |

---

## What Each Demo Page Needs (Stack-wise)

### 1. Effects Chain Demo
- **Controls:** Range sliders for each effect parameter (delay time, feedback, reverb decay, EQ bands, compressor threshold/ratio)
- **Visualization:** Signal chain diagram (CSS boxes + arrows, same pattern as DistortionDemo.vue), optional real-time waveform before/after
- **Stack needs:** Nothing new. Copy pattern from DistortionDemo.vue and FilterDemo.vue.

### 2. LFO Modulation Demo
- **Controls:** Rate slider, depth slider, waveform select, target param select
- **Visualization:** Canvas showing LFO waveform shape in real-time (draw sine/triangle/square/sawtooth at current rate)
- **Stack needs:** Nothing new. Canvas rendering from VisualizationDemo.vue + sliders from FilterDemo.vue.

### 3. PolySynth Demo
- **Controls:** PianoKeyboard.vue (reuse), voice count selector, steal strategy selector, ADSR sliders
- **Visualization:** Active voice indicators (CSS boxes showing which voices are playing and their notes)
- **Stack needs:** PianoKeyboard.vue already exists. Voice display is just reactive state rendered as styled divs.

### 4. Transport + Sequencer Demo
- **Controls:** Play/pause/stop buttons, BPM slider, time signature select, pattern grid
- **Visualization:** Beat position indicator (CSS animation or reactive class), bar counter
- **Stack needs:** Nothing new. DrumMachine.vue already shows the pattern grid approach. Transport state is reactive Vue refs.

### 5. GrainPlayer Demo
- **Controls:** Position slider, pitch slider, grain size slider, overlap slider, spread slider
- **Visualization:** Waveform display with playhead position marker (Canvas), grain scatter visualization
- **Stack needs:** Waveform rendering from VisualizationDemo.vue. Position overlay is a Canvas drawing on top.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Knob controls | Native range inputs or CSS rotate knob | @slipmatio/control-knob | 11 stars, unmaintained since April 2024, adds dependency for cosmetic improvement |
| Waveform viz | Raw Canvas 2D | wavesurfer.js | 35KB+ dependency for one demo page; existing Canvas pattern is proven |
| Waveform viz | Raw Canvas 2D | vue-audio-visual | Adds dependency; less control than raw Canvas which is already working |
| UI components | Native HTML + scoped CSS | Vuetify/PrimeVue | Massive bundle for 5 demo pages; conflicts with VitePress theme; overkill |
| Keyboard UI | PianoKeyboard.vue (existing) | @tonejs/piano | Separate dependency for something already built and working |
| Animation | `requestAnimationFrame` | GSAP/anime.js | Dependency for simple animations that CSS transitions and rAF already handle |

---

## Shared Component Extraction

Several patterns repeat across the 5 demos. Extract these as reusable components within `docs/.vitepress/theme/components/`:

| Component | Purpose | Used By |
|-----------|---------|---------|
| PianoKeyboard.vue | Already exists | PolySynth demo, potentially LFO demo |
| (new) ParameterSlider.vue | Labeled range input with value display, optional log scale | All 5 demos |
| (new) SignalChainDiagram.vue | Visual audio routing display | Effects chain demo, LFO demo |

**ParameterSlider.vue rationale:** The pattern of `<label>` + `<input type="range">` + `<span class="value">` appears in DistortionDemo, FilterDemo, SynthKeyboard, and VisualizationDemo with slight variations. A shared component reduces duplication across the 5 new demos. Keep it simple -- props for min/max/step/label/unit/logScale, emits modelValue.

**SignalChainDiagram.vue rationale:** DistortionDemo already has a signal chain visualization. Effects chain and LFO demos both need similar routing diagrams. Extract the CSS-box-and-arrow pattern into a reusable component that accepts a chain definition as props.

Whether to extract these is a judgment call during implementation. The demos work fine without extraction (copy-paste the pattern), but extraction would reduce ~30 lines of repeated template/style per slider across 5 demos.

---

## Installation

```bash
# No new dependencies needed.
# All demo pages use existing stack: VitePress + Vue 3 + Canvas API + ez-web-audio.
pnpm install   # existing dependencies only
```

---

## Sources

- [DistortionDemo.vue, FilterDemo.vue, VisualizationDemo.vue, PianoKeyboard.vue, SynthKeyboard.vue, XYPad.vue](local codebase) -- existing patterns reviewed; HIGH confidence
- [@slipmatio/control-knob GitHub](https://github.com/slipmatio/control-knob) -- evaluated and rejected (11 stars, last commit April 2024, 8 open issues); HIGH confidence in rejection
- [vue-audio-visual npm](https://www.npmjs.com/package/vue-audio-visual) -- evaluated and rejected (adds dependency for capability already built); MEDIUM confidence
- [MDN: Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) -- Canvas visualization patterns; HIGH confidence

---
*Stack research for: ez-audio Milestone 7 Feature Demo Pages*
*Researched: 2026-03-08*

# Phase 67: LFO Modulation Demo - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive demo page showing LFO modulation — tremolo, vibrato, and filter sweep — with real-time scrolling waveform visualization and adjustable rate/depth controls. Pure documentation/UX work — no library code changes.

</domain>

<decisions>
## Implementation Decisions

### Layout & Interaction Flow
- Tabbed layout with three tabs: Tremolo, Vibrato, Filter Sweep
- One shared Play/Stop button — oscillator runs continuously, tabs switch what the LFO modulates
- Switching tabs while playing seamlessly transitions the modulation (disconnect old target, connect new target — no audio interruption)
- Filter Sweep tab auto-creates a lowpass filter on the oscillator — no separate filter controls exposed
- Lazy init on first Play click (dynamic import + AudioContext), no load buttons

### LFO Waveform Visualization
- Canvas shows LFO wave shape only (not the modulated output)
- Scrolling waveform animation (oscilloscope-style, left-to-right) — matches VisualizationDemo.vue pattern
- Different accent color per tab (tremolo/vibrato/filter) — same line style, distinct color per modulation type
- DPR-aware canvas setup with requestAnimationFrame (established pattern)

### Parameter Controls
- Shared controls across all tabs — one set of rate/depth/waveform applies to active tab. Switching tabs keeps the same settings.
- Rate slider: 0.1–20 Hz, logarithmic scale (more resolution in 0.5–8 Hz musical range)
- Depth slider: 0–100% uniform across all tabs — library handles unit conversion internally (ratio for gain, cents for frequency, Hz range for filter cutoff)
- Waveform type: toggle buttons with visual wave shape icons (sine, square, sawtooth, triangle, sample-and-hold)

### Audio Source
- Single oscillator (sawtooth, ~200–440 Hz) — rich harmonics make LFO effects clearly audible
- No audio file loading, no carrier waveform selector — keep focus on the LFO

### Presets
- 2–3 named preset buttons (e.g., "Slow Tremolo", "Fast Vibrato", "Wah Pedal") that set rate/depth/waveform to curated starting values
- Clicking a preset also switches to the appropriate tab — one click to hear a complete effect
- Presets serve as entry points for beginners; they can tweak from there

### Claude's Discretion
- Canvas overlay labels (current rate/depth values) — decide what looks cleanest
- Exact preset names and parameter values
- Oscillator frequency choice within 200–440 Hz range
- Tab visual styling and accent colors
- Canvas height and aspect ratio
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- Presets as curated entry points — "click one button, hear something cool, then tweak"
- Seamless tab switching is key to the exploration UX — user should be able to A/B compare tremolo vs vibrato instantly
- Waveform toggle buttons with visual wave icons, not text-only — immediately recognizable for audio people

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VisualizationDemo.vue`: DPR-aware canvas setup, requestAnimationFrame loop, resize handling — direct pattern for LFO waveform canvas
- `FilterDemo.vue`: Logarithmic slider mapping (20-20kHz), source type switching, dynamic import pattern — reference for slider implementation
- `OscillatorDemo.vue`: Oscillator creation, waveform type toggle buttons — reference for carrier + LFO waveform selectors
- `XYPad.vue`: Canvas with interactive overlays, real-time parameter control
- `createLFO()` factory in `src/index.ts` — the API being demoed
- `LFO.connect(target, paramName, options)` — connection/reconnection for tab switching
- `LFOConnectOptions.depthUnit` — 'ratio', 'cents', 'absolute' for depth unit handling

### Established Patterns
- Lazy init: `if (!lib) { lib = await import('ez-web-audio') }` on first user interaction
- Ref-based state: `const playing = ref(false)`, `const loading = ref(false)`, `const error = ref('')`
- Canvas DPR: `canvas.width = logicalWidth * dpr`, `ctx.scale(dpr, dpr)`, store logical dims in dataset
- Cleanup: `onUnmounted()` stops audio, cancels animation frames, disposes resources

### Integration Points
- New file: `docs/.vitepress/theme/components/LFODemo.vue`
- New page: `docs/examples/lfo-modulation.md`
- Register in sidebar nav (docs config)
- Follow existing component naming convention (PascalCase + "Demo" suffix)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 67-lfo-modulation-demo*
*Context gathered: 2026-03-09*

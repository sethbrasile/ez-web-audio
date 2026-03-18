# Phase 70: GrainPlayer Demo - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive demo page for granular synthesis — users independently control pitch and playback speed, adjust grain parameters (size, overlap, jitter), and see a waveform display with grain position overlay. Pure documentation/UX work — no library code changes.

</domain>

<decisions>
## Implementation Decisions

### Audio Source
- Bundle a CC0/public domain audio clip (NOT short-music.mp3)
- Claude selects content type (speech, instrument, texture) and duration based on what best demonstrates pitch/speed independence and grain texture variation
- Target: short enough for quick loading, long enough for meaningful position exploration
- File upload explicitly out of scope (per REQUIREMENTS.md)

### Position Interaction
- Click/drag directly on the waveform canvas to set grain position — "point at where you want to hear"
- Live scrub: position updates continuously during drag (real-time grain repositioning while playing)
- No separate position slider — the waveform IS the position control
- Jitter visualized as a translucent shaded zone around the position indicator, widening as jitter increases

### Claude's Discretion
- Waveform canvas visualization style (static full-buffer waveform with overlaid indicators)
- Control layout and parameter grouping for pitch, speed, grain size, overlap, jitter
- Canvas height, aspect ratio, colors, DPR handling
- Whether to include presets (curated starting configurations)
- Position indicator styling (dot, line, etc.)
- Error state handling
- Grain size and overlap default values

</decisions>

<specifics>
## Specific Ideas

- The waveform canvas serves double duty: visualization AND primary interaction surface (click/drag to set position)
- Jitter zone visualization makes an abstract parameter immediately understandable — "grains come from this region"
- Live scrub during drag is key to the exploration UX — users should feel like they're "playing" the waveform

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VisualizationDemo.vue`: DPR-aware canvas setup, requestAnimationFrame loop, resize handling — pattern for waveform canvas
- `XYPad.vue`: Canvas with interactive mouse/touch handling — pattern for click/drag position control
- `FilterDemo.vue`: Logarithmic slider mapping, source type switching — reference for parameter sliders
- `createGrainPlayer()` factory in `src/index.ts` — the API being demoed
- `GrainPlayer` API: `.position` (0-1), `.pitch` (semitones), `.grainSize`, `.overlap`, `.jitter`, `.loop`, `.playbackRate`, `.play()/.stop()/.pause()/.resume()`
- `short-music.mp3` at `/ez-web-audio/audio/` — NOT used for this demo, new sample needed

### Established Patterns
- Lazy init: `if (!lib) { lib = await import('ez-web-audio') }` on first user interaction
- Ref-based state: `const playing = ref(false)`, `const loading = ref(false)`, `const error = ref('')`
- Canvas DPR: `canvas.width = logicalWidth * dpr`, `ctx.scale(dpr, dpr)`, store logical dims in dataset
- Cleanup: `onUnmounted()` stops audio, cancels animation frames, disposes resources
- Audio loading: `createSound()` to get AudioBuffer, then pass to `createGrainPlayer(sound.audioBuffer, options)`

### Integration Points
- New file: `docs/.vitepress/theme/components/GrainPlayerDemo.vue`
- New page: `docs/examples/grainplayer.md`
- New audio asset: `docs/.vitepress/theme/audio/` or `docs/public/audio/` (CC0 sample)
- Register in sidebar nav under appropriate section in `docs/.vitepress/config.mts`
- Follow existing component naming convention (PascalCase + "Demo" suffix)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 70-grainplayer-demo*
*Context gathered: 2026-03-18*

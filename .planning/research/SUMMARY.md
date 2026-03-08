# Project Research Summary

**Project:** EZ Web Audio -- Milestone 7 Feature Demo Pages
**Domain:** Interactive audio education demos (VitePress + Vue 3 documentation site)
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

Milestone 7 adds 5 interactive demo pages to the existing documentation site, showcasing M5 features that are already implemented and tested (Effects Chain, LFO, PolySynth, Transport/Sequencer, GrainPlayer). This is a pure documentation and UX task -- no library code changes are needed. The existing codebase of 22 Vue demo components establishes every pattern required: lazy audio initialization, Canvas visualization, reactive state management, touch support, and VitePress integration. No new dependencies are needed.

The recommended approach is to build each demo as a self-contained Vue SFC following the established patterns verbatim. The key differentiator from existing demos is complexity: the Transport+Sequencer demo combines 3 subsystems, the Effects Chain manages 5 simultaneous effect cards, and the PolySynth must synchronize voice pool state with keyboard UI. These are not technically novel but require careful state management and cleanup. Each demo reuses existing audio assets and component patterns, keeping scope tight.

The primary risks are resource leaks on VitePress SPA navigation (Transport and GrainPlayer use Web Workers internally), PolySynth voice/UI desync when voices are stolen, and reactive performance issues from Transport tick events. All three have clear prevention strategies documented in PITFALLS.md. The cleanup registry pattern (`cleanups.push(() => resource.dispose())`) should be adopted as standard for all 5 demos.

## Key Findings

### Recommended Stack

No new dependencies. All 5 demos use the existing stack: Vue 3 (via VitePress 1.6.4), Canvas 2D API for visualization, native HTML inputs for controls, and ez-web-audio itself. Every UI control needed (sliders, toggles, dropdowns, piano keyboard, beat grids, canvas waveforms) is already proven in existing components. Third-party UI libraries were evaluated and rejected -- they add bundle weight and maintenance burden for 5 demo pages.

**Core technologies (all existing):**
- **Vue 3 SFCs**: Demo component framework -- 22 components already established
- **Canvas 2D + requestAnimationFrame**: Real-time visualization -- proven in VisualizationDemo, XYPad
- **Native HTML inputs**: Sliders, selects, buttons -- accessible, zero-bundle-cost, touch-compatible
- **PianoKeyboard.vue**: Reusable keyboard component -- already built with mouse, touch, and keyboard support

See [STACK.md](./STACK.md) for full evaluation including rejected alternatives.

### Expected Features

**Must have (table stakes per demo):**
- Effects Chain: per-effect bypass toggle, parameter sliders, wet/dry mix, audio source selector
- LFO: rate/depth sliders, waveform selector, target parameter selector (tremolo/vibrato/filter)
- PolySynth: piano keyboard input, voice count display, steal strategy selector, ADSR controls
- Transport: play/pause/stop, BPM slider with live update, position display, synced beat grid
- GrainPlayer: waveform display, position scrubber, pitch slider, grain size/overlap controls

**Should have (differentiators):**
- Effects Chain: preset effect chains (Telephone, Cave, Radio)
- LFO: animated waveform visualization showing LFO shape
- PolySynth: voice allocation visualization (active/released/stolen states)
- Transport: mute/solo per track, Sequence with musical time events
- GrainPlayer: jitter slider, real-time parameter value display

**Defer:**
- Before/after waveform comparison on Effects Chain
- Drag-and-drop effect reordering
- MIDI input for PolySynth
- Grain position scatter visualization
- Full DAW timeline with zoom/scroll

See [FEATURES.md](./FEATURES.md) for complete table stakes/differentiators/anti-features per demo.

### Architecture Approach

Every demo follows the identical integration model: a Markdown page imports a Vue SFC, the SFC uses dynamic `import('ez-web-audio')` on first user interaction, Vue refs drive the UI, and `onUnmounted` disposes all audio resources. No shared audio state between components. Each component is fully self-contained.

**Major components (5 new Vue SFCs):**
1. **EffectsChainDemo.vue** (~350 lines) -- 5 effect cards with bypass/mix/params, oscillator or track source
2. **LFODemo.vue** (~300 lines) -- single oscillator with switchable LFO target, animated canvas waveform
3. **PolySynthDemo.vue** (~250 lines) -- PianoKeyboard reuse, voice allocation display, steal strategy
4. **TransportSequencerDemo.vue** (~400 lines) -- BPM clock, 2 drum BeatTracks, 1 Sequence bass line, mute/solo
5. **GrainPlayerDemo.vue** (~350 lines) -- buffer waveform canvas, position/pitch/grain sliders

Plus 5 Markdown pages, sidebar config updates, and E2E tests. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component boundaries, data flow, and file listing.

### Critical Pitfalls

1. **rAF and Worker leaks on navigation** -- Transport and GrainPlayer use internal Web Workers that survive component unmount. Use a cleanup registry pattern and call `.dispose()` on every audio object in `onUnmounted`.
2. **PolySynth voice/UI desync** -- When voices are stolen, the keyboard UI shows more active notes than are actually playing. Listen for `voicestolen` events and update UI state accordingly.
3. **Transport tick reactive cascade** -- Binding `transport.on('tick')` directly to Vue refs causes 8+ reactive updates/sec. Poll `transport.position` in a `requestAnimationFrame` loop instead.
4. **Effect toggle clicks** -- `addEffect()`/`removeEffect()` during playback causes audio pops. Use `effect.bypass` for live toggling instead.
5. **GrainPlayer buffer loading delay** -- Large audio files cause multi-second startup. Use a short sample (1-2 seconds) and show a loading spinner.

See [PITFALLS.md](./PITFALLS.md) for all 15 pitfalls with prevention strategies and detection methods.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order and ascending complexity.

### Phase 1: LFO Modulation Demo
**Rationale:** Simplest new visualization (animated waveform canvas). No audio assets needed (oscillator-based). Standalone -- no dependencies on other new demos. Establishes the canvas animation pattern reused by GrainPlayer.
**Delivers:** LFODemo.vue + docs/examples/lfo.md + E2E test
**Addresses:** LFO rate/depth/waveform/target controls, animated waveform viz, syncLifecycle/retrigger toggles
**Avoids:** Pitfall 6 (depth units) via absolute depth mode and sensible slider ranges; Pitfall 7 (canvas resize) via ResizeObserver

### Phase 2: PolySynth Demo
**Rationale:** Reuses existing PianoKeyboard.vue (proven pattern from SynthKeyboard). Self-contained with no audio assets. Medium complexity but well-understood integration.
**Delivers:** PolySynthDemo.vue + docs/examples/poly-synth.md + E2E test
**Addresses:** Piano keyboard, voice allocation viz, steal strategies, ADSR controls
**Avoids:** Pitfall 2 (voice desync) via voicestolen event listener; Pitfall 10 (envelope config) via createVoice factory reading from refs

### Phase 3: Effects Chain Demo
**Rationale:** Most controls of any demo but each effect card follows the same pattern (repetitive, not complex). Builds on FilterDemo and DistortionDemo patterns. Uses existing audio assets.
**Delivers:** EffectsChainDemo.vue + docs/examples/effects-chain.md + E2E test
**Addresses:** 5 effect types with bypass/mix/params, preset chains, audio source toggle
**Avoids:** Pitfall 4 (toggle clicks) via bypass-only live toggling; Pitfall 13 (dangerous values) via clamped slider ranges

### Phase 4: GrainPlayer Demo
**Rationale:** Needs waveform canvas visualization (pattern established in Phase 1). Requires audio buffer loading (slightly novel). Independent from other demos.
**Delivers:** GrainPlayerDemo.vue + docs/examples/grain-player.md + E2E test
**Addresses:** Buffer waveform display, position/pitch/grain controls, jitter
**Avoids:** Pitfall 5 (loading delay) via short sample + loading spinner; Pitfall 1 (Worker leak) via cleanup registry

### Phase 5: Transport + Sequencer Demo
**Rationale:** Most complex demo. Combines Transport clock, BeatTrack sync, and Sequence scheduling -- three subsystems. Benefits from patterns established in Phases 1-4. Reuses beat grid pattern from DrumMachine.
**Delivers:** TransportSequencerDemo.vue + docs/examples/transport-sequencer.md + E2E test
**Addresses:** BPM control, position display, synced beat grids, Sequence with musical time, mute/solo
**Avoids:** Pitfall 3 (position reactive cascade) via rAF polling; Pitfall 8 (notation confusion) via visual grid + plain English labels; Pitfall 11 (BPM path) via Transport-only tempo control

### Phase Ordering Rationale

- **Ascending complexity:** LFO (Low-Med) -> PolySynth (Med) -> Effects (Med-High) -> GrainPlayer (Med) -> Transport (Med-High)
- **Pattern reuse:** Phase 1 establishes canvas animation; Phase 4 reuses it. Phase 2 proves PianoKeyboard integration. Phase 3 proves multi-control card layout.
- **Independence:** Phases 1-4 are fully independent and could be parallelized if desired. Phase 5 benefits from all prior patterns.
- **Risk ordering:** The two highest-risk demos (Transport with its tick/reactive issues, and Effects with its toggle click pitfall) are positioned where they have maximum pattern support.

### Research Flags

Phases with standard patterns (skip phase research):
- **Phase 1 (LFO):** Canvas animation pattern from XYPad + sliders from FilterDemo. Fully documented.
- **Phase 2 (PolySynth):** PianoKeyboard reuse pattern from SynthKeyboard. Well-understood.
- **Phase 3 (Effects):** Direct extension of FilterDemo + DistortionDemo patterns.
- **Phase 4 (GrainPlayer):** Canvas waveform from VisualizationDemo. Buffer loading from DrumMachine.

Phase that may benefit from brief research during planning:
- **Phase 5 (Transport+Sequencer):** The Sequence timeline visualization (showing scheduled events as markers) is genuinely new. The rAF-based position polling pattern needs careful implementation. Brief research into how Tone.js and similar tools render sequencer timelines could help. However, the DrumMachine beat grid pattern covers 70% of the work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; all patterns proven in 22 existing components |
| Features | HIGH | All M5 APIs are implemented and tested; feature scope is documentation UX |
| Architecture | HIGH | Identical architecture to 22 existing demos; no new patterns needed |
| Pitfalls | HIGH | 5 critical pitfalls identified from codebase analysis + M5 API internals |

**Overall confidence:** HIGH

All research was based on direct codebase analysis of existing components and M5 source code. The domain is narrow (Vue demo pages for an existing library) and the patterns are thoroughly established.

### Gaps to Address

- **GrainPlayer audio asset:** Need to decide between using `short-music.mp3` (2.1MB, exists) or adding a shorter dedicated sample. The existing file works but may be larger than needed. Decide during Phase 4 planning.
- **Sequence timeline visualization:** No existing component shows scheduled events on a timeline. The beat grid pattern is close but not identical. May need iteration during Phase 5 implementation.
- **ParameterSlider.vue extraction:** STACK.md suggests extracting a shared slider component; ARCHITECTURE.md recommends against it. Recommendation: skip extraction. The overhead of abstraction outweighs savings for 5 demos. Copy the pattern.

## Sources

### Primary (HIGH confidence)
- 22 existing Vue demo components in `docs/.vitepress/theme/components/` -- direct codebase analysis
- M5 library source: `src/lfo.ts`, `src/poly-synth.ts`, `src/transport.ts`, `src/sequence.ts`, `src/grain-player.ts`, `src/effects/`
- [MDN: Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: Web Audio Advanced Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)

### Secondary (MEDIUM confidence)
- [Tone.js Step Sequencer](https://tonejs.github.io/examples/stepSequencer) -- Transport/sequencer UI patterns
- [Tone.js PolySynth docs](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html) -- Voice management patterns
- [ZYA Granular Synthesiser](https://zya.github.io/granular/) -- Granular synthesis web UI
- [Vue Memory Leak Prevention](https://coreui.io/answers/how-to-fix-memory-leaks-in-vue/) -- Cleanup patterns
- [Building a sequencer with Web Audio](https://www.ivanprignano.com/posts/building-a-sequencer-web-audio/) -- Sequencer UI

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*

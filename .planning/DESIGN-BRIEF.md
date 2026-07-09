# EZ Web Audio — Demo UI Design Brief (for claude-design)

**Date:** 2026-07-09
**Repo:** https://github.com/sethbrasile/ez-web-audio
**Live docs site (current state, for behavior reference):** https://sethbrasile.github.io/ez-web-audio/
**Return deliverable:** a handoff packet (format spec at the bottom) that engineers implement into `.planning/DESIGN-HANDOFF/` in this repo.

## What this is

EZ Web Audio is an open-source, zero-dependency TypeScript library that makes the browser's Web Audio API easy. The documentation site (VitePress) contains 20+ interactive audio demos — they are the product's marketing and its teaching material. The demos work correctly and sound right; they now need **deliberate visual design**. We are asking you to design the demo components themselves — their look, feel, states, and per-component layout.

**You own layout per component.** This brief intentionally gives you concept, controls, and constraints — never arrangement. The live site shows current behavior; treat its visuals as placeholder, not precedent.

**Audience:** web developers evaluating or learning the library. Many are not musicians. Each demo must communicate its audio concept visually within ~30 seconds of play.

**Scope boundary:** individual demo components (plus one shared-element system across them). This is NOT a site redesign — the VitePress docs frame (nav, sidebar, typography of prose) stays. One advisory exception at the bottom.

## Hard Constraints (binding — designs violating these can't be built)

1. Components render inside the VitePress default theme content column (~688px max width) and must degrade gracefully to 320px.
2. Light AND dark mode via VitePress CSS custom properties (`--vp-c-*` family); canvas visualizations read colors from CSS vars at draw time — no hardcoded hex.
3. Implementable as Vue 3 SFCs with scoped styles; **no new runtime dependencies** (no component libraries, no icon fonts; inline SVG fine).
4. WCAG 2.1 AA: contrast, visible focus states, keyboard operability, ARIA on custom controls; touch targets ≥44×44px.
5. Demos render fully visible immediately — no load/init buttons; the first interaction (e.g. Play) starts audio.
6. Volume-safety messaging: current demos have 3 inconsistent warning styles — design ONE pattern used everywhere.
7. Available to implementers: Vue 3 Composition API, scoped CSS, VitePress CSS vars, `<canvas>`, inline SVG. Nothing else.

## Shared elements (hint, not a spec)

Implementation will extract repeated elements into shared components — parameter sliders with value readouts, play/stop buttons, demo container/frames, volume warnings, preset selectors, step-grid cells. Consistent treatment of these multiplies your leverage: design the element once, it lands in 20 demos. What these look like is your call.

## Demo inventory

Grouped as in the site sidebar. Per demo: concept · controls · displays · the 30-second takeaway.

### Basic Playback (`/examples/basic-playback`)
- **One-shot sound:** Play button, volume slider, pan slider (L/C/R readout). Takeaway: playing a sound is one function call.
- **Music track:** play/pause/stop, seek slider with MM:SS position display, volume. Takeaway: tracks have position tracking and seeking built in.
- **Play together:** trigger multiple sounds simultaneously. Takeaway: composition is trivial.

### Sampling
- **Sampled Drum Kit** (`/examples/sampled-drum-kit`): 3 pads (kick/snare/hihat) triggering samples. Takeaway: tap pads, hear samples instantly.
- **Soundfont Piano** (`/examples/soundfont-piano`): piano keyboard (shared PianoKeyboard element — 12+ keys, computer-keyboard shortcuts A–K, shortcut hints) playing soundfont notes. Takeaway: real instrument sounds from a soundfont file.

### Synthesis
- **Synthesis** (`/examples/synthesis`): oscillator basics — frequency slider, volume, waveform select; plus filter playground — filter-type select, frequency, resonance Q, gain sliders. Takeaway: synthesizers are oscillators plus filters.
- **Synth Keyboard** (`/examples/synth-keyboard`): PianoKeyboard + 4 sound presets (piano/pad/lead/pluck) + ~7 envelope/tone sliders + master volume. Takeaway: ADSR envelopes shape a note's character.
- **XY Pad** (`/examples/xy-pad`): 2D touch surface (canvas) — X = frequency, Y = gain; waveform select; fully keyboard-operable (arrow keys). Takeaway: expressive continuous control, theremin-style.
- **Synth Drum Kit** (`/examples/synth-drum-kit`): 7 trigger buttons (kick, snare, snare layers ×2, full snare, hi-hat, bass drop) — all synthesized, no samples. Takeaway: drums from pure synthesis, layered sounds.
- **PolySynth** (`/examples/polysynth`): PianoKeyboard + live voice-count display (n of max), max-voices control, steal-strategy select (oldest/quietest/newest), waveform select, ADSR sliders, presets. Takeaway: polyphony with visible voice allocation — watch voices get stolen.
- **GrainPlayer** (`/examples/grainplayer`): source waveform on canvas with click/drag playback-position control + grain-position overlay; sliders: pitch (semitones), speed, grain size, overlap, jitter; presets (e.g. Freeze, Choppy); play/stop. Takeaway: granular synthesis — pitch and speed are independent.

### Modulation
- **LFO Modulation** (`/examples/lfo-modulation`): three modes (tremolo/vibrato/filter sweep) as tabs or equivalent; animated canvas of the LFO waveform; rate + depth sliders (depth readout changes meaning per mode: %, cents, Hz); LFO waveform choice (sine/square/saw/triangle, currently icon buttons + text); presets. Takeaway: one LFO, three musical effects, seen and heard simultaneously.

### Timing & Sequencing
- **Timing Basics** (`/examples/timing`): demonstrates scheduling accuracy (setTimeout drift vs Web Audio clock). Takeaway: why audio scheduling needs the audio clock.
- **Drum Machine** (`/examples/drum-machine`): 3-track × 16-step grid, click-to-toggle steps, tempo slider, play/stop, animated playhead. Takeaway: build a beat in seconds.
- **Transport + Sequencer** (`/examples/transport-sequencer`): 5 tracks (3 drum + bass + piano) × 32-step grid (READ-ONLY — patterns come from presets; grid needs to communicate this), play/pause/stop, BPM slider, bar:beat position display, per-track mute/solo, 3 pattern presets, column playhead. Takeaway: a BPM-synced timeline with musical time notation.

### Integration Patterns
- **Vue Reactive Pattern** (`/examples/drum-machine-vue`) and **Vanilla TS Events** (`/examples/drum-machine-vanilla`): two more drum machines (Vue one adds mute/solo) that exist to show framework integration code. Visual design should match the main Drum Machine — same elements, code is the differentiator.
- **React Integration** (`/examples/react-integration`): currently code-only page; will gain an embedded external sandbox. No component design needed; a framed-embed treatment is welcome if you have one.

### Effects & Routing
- **Effects** (`/examples/effects`): distortion playground — amount + wet/dry sliders on a playing loop. Takeaway: effects wrap and route automatically.
- **Audio Routing** (`/examples/audio-routing`): explains the connection chain (source → filters → connections → gain → pan → destination) with a runnable example. A designed signal-flow visual language here would also serve Effects Chain.
- **Effects Chain** (`/examples/effects-chain`): the deep one — 4 effect slots (delay: time/feedback/mix; reverb: mix; compressor: threshold/ratio/attack/release/knee; 3-band EQ gains), per-effect bypass toggle, reorder (currently up/down buttons), source switch (oscillator vs audio file), live signal-flow diagram showing active chain order. Takeaway: build, reorder, and hear an effects chain.

### Composition
- **Audio Sprite** (`/examples/audio-sprite`): one audio file, 6 named segments — trigger buttons + a timeline visualization highlighting the playing segment. Takeaway: many sounds, one file.
- **Layered Sound** (`/examples/layered-sound`): 3 layers with individual gain sliders + master gain, single trigger. Takeaway: stacked sounds, one play call.
- **Crossfade** (`/examples/crossfade`): two tracks, crossfade trigger, duration slider. Takeaway: smooth source-to-source transitions.

### Creative
- **Ambient Generator** (`/examples/ambient-generator`): generative soundscape — start/stop, drone frequency, shimmer, texture filter cutoff, master volume sliders. Takeaway: the library composes, not just plays.
- **Visualization** (`/examples/visualization`): two live canvases (waveform + frequency spectrum), source select, frequency slider. Takeaway: analyzer data is one call away.

## The flagship: Groovebox (NEW — design this from scratch, give it the most attention)

The announcement centerpiece. Full page at `/examples/groovebox` + a compact hero variant embedded on the site homepage. Nothing exists yet — greenfield.

**Full version — control inventory:**
- Transport: play/stop (single toggling button), BPM slider (60–180), swing slider (0–100%).
- Step grid: 32 steps (2 bars, 16ths; bar/beat groupings should be visually legible), 6 lanes:
  - 4 drum lanes (kick/snare/hihat/clap) — click/tap to toggle steps.
  - Bass lane — per-step note entry (notes ~C1–C4 range, or empty); waveform select (triangle/saw/square).
  - Lead lane — NOT per-step: on/off, arp-pattern select (up/down/updown), root-note select.
- Per-lane mute/solo.
- Master FX: delay (time, feedback, send) + reverb (send).
- Preset selector: 3 curated patterns (House / Boom Bap / Breaks).
- Share button: copies a URL that restores the exact machine state; needs a transient "copied" confirmation.
- Playhead: current-step indicator spanning all lanes while playing.

**Hero variant (homepage):** must keep play/stop, preset selector, and the drum-lane grid; plus a "open full groovebox →" affordance. Everything else — your call. It sits on the VitePress homepage below the existing tagline/CTA hero; it must read as an invitation to touch, not a screenshot.

## ADVISORY — suggestions welcome, site redesign NOT requested

Severable section; we adopt selectively. Current information architecture:

- Top nav: Guide / Examples / API.
- Guide sidebar: Introduction (getting started, concepts, parameter control, utilities) → Synthesis & Sequencing (transport, sequence, polysynth, grainplayer, LFO) → Advanced (multiple contexts).
- Examples sidebar: Overview → Basic Playback → Sampling → Synthesis (6 pages) → Modulation → Timing & Sequencing → Integration Patterns → Effects & Routing → Composition → Creative.
- Concept arc the docs try to teach: playback → sampling → synthesis → modulation → timing/sequencing → integration → effects/routing → composition → creative/showcase.

If you see better ways to organize, sequence, name, or present this material — or how demo pages should relate prose, code, and the interactive component — tell us. Tips, not mandates. Please keep any IA suggestions in a separate section of the packet so they're easy to evaluate independently.

## Handoff packet — what to return

1. **Design language spec:** color roles mapped to VitePress CSS vars where possible (plus any new tokens as CSS custom properties with light+dark values), spacing scale, type treatment within the content column, interaction states (hover/active/focus/disabled/playing).
2. **Shared element specs:** every repeated element you define (sliders, buttons, cards, grids, warnings, preset selectors...) — structure, states, sizing.
3. **Per-component specs:** for each demo above — structure/arrangement, which shared elements it uses, component-specific pieces (canvases, grids, keyboards), and state behavior (what changes visually while playing). Text/annotation mockups or images both fine; engineers implement from your spec, not pixel-perfect redlines.
4. **Groovebox:** full + hero variants, highest fidelity you can give.
5. **Advisory IA section:** separate, clearly labeled.

Constraint conflicts: if a design idea collides with a Hard Constraint, the constraint wins — note the tension rather than breaking it.

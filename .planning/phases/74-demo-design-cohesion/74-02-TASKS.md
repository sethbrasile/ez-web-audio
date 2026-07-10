# 74-02 Task List — claude-design packet implementation

> Authored by the orchestrator per 74-02-PLAN Task 0 (2026-07-10). Packet read in full
> (`.planning/DESIGN-HANDOFF/` 00–06 + embedded dc-scripts, where the token values and
> per-demo specs live). Execute top-to-bottom under the M8 dispatch protocol.

## Standing rules (apply to every task)

- Presentation ONLY. No audio-logic changes, no new audio-wired controls. If a packet
  spec wants a control the demo lacks (e.g. pan on one-shot), keep existing controls,
  log the want to `M8-QUESTIONS.md`.
- Do not revert this week's gate-2 reworks: `TransportSequencerDemo.vue` fluid grid +
  musical presets, `AmbientGenerator.vue` layer naming, `EffectsChainDemo.vue`
  three-source switcher. Design lands ON TOP of them.
- Tokens only — components use `--ewa-*` vars (Task 1); never hardcode hex. Canvas code
  reads colors via `getComputedStyle(el).getPropertyValue('--ewa-...')` at draw time.
- Hard constraints beat packet: touch targets ≥44×44px (packet shows 30px grid cells —
  constraint wins; grids horizontal-scroll instead of shrinking, per packet 00's own
  "noted tension"), AA contrast, 320–688px, no new runtime deps, no load buttons.
- `prefers-reduced-motion`: animations degrade to discrete steps (single shared media
  query where possible).
- Per-task gate: `pnpm typecheck && pnpm lint && pnpm test:e2e` + Playwright screenshots
  (light + dark) of every touched page → `.planning/phases/74-demo-design-cohesion/screenshots/`.
  E2E selector updates allowed; assertion changes need a SUMMARY sign-off note.
- A11y per demo: keyboard-only operation, `aria-label` on icon-only buttons,
  focus-visible ring in both schemes (2px ring, 3px offset — packet state vocabulary).
- Commit per task: `feat(74-02): <thing> per design packet`.

## Screenshot harness (once, part of Task 1 verification)

Script at `.planning/phases/74-demo-design-cohesion/screenshot.mjs`: boots nothing
itself — assumes `pnpm dev` running; for each given path, loads
`http://localhost:5173/ez-web-audio/examples/<page>`, captures
`{page}-light.png` / `{page}-dark.png` (via `page.emulateMedia({ colorScheme })` AND
VitePress `.dark` class toggle since VP themes by class).

---

## Part A — Foundation

### Task 1: EWA token layer (`custom.css`)

Create `docs/.vitepress/theme/custom.css`, import from `theme/index.ts`.

- Declare all `--ewa-*` tokens on `:root` (light) and `.dark` (dark), values verbatim
  from packet 01 Foundations dc-script `themes` object:

  Light: bg `#ffffff`·panel `#f6f6f8`·well `#ececef`·line `#e2e2e6`·line-2 `#d3d3d9`·
  text `#1c1c22`·text-2 `#5a5a66`·text-3 `#8c8c98`·accent `#0e9268`·accent-strong
  `#0b7d59`·accent-ink `#067552`·on-accent `#ffffff`·accent-soft `rgba(14,146,104,0.12)`·
  danger `#e5484d`·danger-soft `rgba(229,72,77,0.12)`·warn `#a9720a`·warn-soft
  `rgba(234,179,8,0.14)`·warn-line `#eab308`·kick `#e5544b`·snare `#e08a2f`·hat
  `#b99310`·clap `#d84f9e`·bass `#6a5cf0`·lead `#2f9fd6`·shadow
  `0 1px 2px rgba(0,0,0,0.06),0 3px 10px rgba(0,0,0,0.05)`

  Dark: bg `#161619`·panel `#1e1e23`·well `#131316`·line `#2c2c33`·line-2 `#3a3a42`·
  text `#f4f4f6`·text-2 `#a6a6b0`·text-3 `#70707a`·accent `#2fe3a4`·accent-strong
  `#57ecba`·accent-ink `#35e0a6`·on-accent `#05231a`·accent-soft
  `rgba(47,227,164,0.16)`·danger `#ff6b6b`·danger-soft `rgba(255,107,107,0.16)`·warn
  `#f2cf3f`·warn-soft `rgba(242,207,63,0.12)`·warn-line `#f2cf3f`·kick `#ff7a6e`·snare
  `#f2a64a`·hat `#f2cf3f`·clap `#f277c0`·bass `#9c8dff`·lead `#56c4f0`·shadow
  `0 1px 2px rgba(0,0,0,0.4),0 4px 12px rgba(0,0,0,0.35)`

- Alias to VitePress where VP owns the role (packet §3 map): `--ewa-bg: var(--vp-c-bg)`,
  `--ewa-panel: var(--vp-c-bg-soft)`, `--ewa-well: var(--vp-c-bg-mute)`,
  `--ewa-line: var(--vp-c-divider)`, `--ewa-text: var(--vp-c-text-1)` etc. — raw hex
  only for roles VP lacks (accent family, sound palette, warn/danger softs).
- Adopt packet's `--vp-c-brand-1/-2/-3` override → Signal green (`#0e9268` light /
  `#2fe3a4` dark family) so docs links/buttons unify with demos. (Packet §1
  recommendation; pure CSS, presentation-only. Note in SUMMARY.)
- Shared `@media (prefers-reduced-motion: reduce)` rule for demo animations.
- Shared keyframes: `ewa-blink` (live dot), `ewa-pulse`.

### Task 2: Kit primitives — `DemoFrame`, `PlayButton`, `VolumeWarning`

`docs/.vitepress/theme/components/kit/`:

- **DemoFrame.vue** — panel container: `--ewa-panel` bg, 1px `--ewa-line` border,
  12px radius, 16–20px padding; optional `takeaway` prop → accent one-liner rendered in
  the same slot on every demo (IA cross-cut "one takeaway callout"); default slot for
  demo body; error slot/prop styled `--ewa-danger`.
- **PlayButton.vue** — 44px height, 10px radius, Inter 600 14px. Idle: `--ewa-accent`
  bg / `--ewa-on-accent` text + triangle icon (CSS border trick or inline SVG). Playing:
  `--ewa-danger` bg + square icon + blinking live dot (`ewa-blink`, disabled under
  reduced-motion). Hover lift 1px; active press 1px down; disabled 0.55 opacity;
  loading state text. Props: `playing`, `loading`, `label`/`playingLabel`.
- **VolumeWarning.vue** — ONE pattern (hard constraint #6): `--ewa-warn-soft` bg,
  left border `--ewa-warn-line`, headphone glyph (inline SVG), text slot with default
  "Headphone check…" copy from packet 01 §6.

### Task 3: Kit controls — `ParameterSlider`, `Knob`

- **ParameterSlider.vue** — label (Inter) left, mono value readout right (DM Mono falls
  back to `--vp-font-family-mono`); custom track: 6px `--ewa-well` round bar, accent
  fill, 16px thumb; pointer drag + Arrow keys (`role="slider"` + aria-valuemin/max/now,
  or a visually-hidden native range input — implementer's call, must be
  keyboard-operable); props `label, modelValue, min, max, step, format` + `center`
  variant (pan: fill grows from center, readout `L 30 / C / R 30`). Focus ring 2px/3px.
  Touch target: 44px-tall hit area even though track is 6px.
- **Knob.vue** — 270° arc (−135°…+135°), vertical drag + Arrow keys, accent arc on
  `--ewa-well` ring (SVG), mono value in center, label under. Same ARIA/focus rules.

### Task 4: Kit selectors — `PresetSelector`, `WaveformSelector`, `KeyboardHintChip`

- **PresetSelector.vue** — segmented row in a `--ewa-well` pill; selected: accent bg +
  on-accent text + shadow; unselected: transparent + `--ewa-text-2`; 36px height min
  (44px hit area); `role="radiogroup"`. Props: `options`, `modelValue`.
- **WaveformSelector.vue** — icon buttons 52×44 with inline-SVG wave paths verbatim from
  packet (sine `M2 12 Q7 2 12 12 T22 12 T32 12 T38 12`, square `M2 18 V6 H12 V18 H22 V6
  H32 V18 H38`, sawtooth `M2 18 L12 6 L12 18 L22 6 L22 18 L32 6 L32 18`, triangle
  `M2 18 L7 6 L12 18 L17 6 L22 18 L27 6 L32 18 L37 6`); selected: `--ewa-accent-soft`
  bg + accent border + accent-ink; `aria-label` per wave; `small` prop (42×36).
- **KeyboardHintChip.vue** — mono chip (`--ewa-well` bg, `--ewa-line-2` border, 6px
  radius) for shortcut hints ("A–K trigger notes"); one treatment everywhere (IA O3).

### Task 5: Kit displays — `SegmentDisplay`, `SignalFlow`, `TriggerPad`

- **SegmentDisplay.vue** — dark well tile, DM Mono/mono numeric readout in accent,
  small `--ewa-text-3` caption under (e.g. `BAR : BEAT`). Props `value`, `caption`.
- **SignalFlow.vue** — the shared routing language (packet 04): horizontal node chain,
  each node mono 12px in `--ewa-panel` with 1.5px border in the node's color prop,
  `→` connectors in `--ewa-text-3`; wraps or x-scrolls under 688px; props
  `nodes: { label, color?, active? }[]`; active node highlights accent.
- **TriggerPad.vue** — pad button (min 44×44, colored fill from sound palette prop or
  accent), label bottom, press: depress transform + color ring flash (box-shadow pulse,
  reduced-motion safe). Emits `trigger` on pointerdown/keydown(Space|Enter).

### Task 6: Kit `StepGrid`

- **StepGrid.vue** — lanes × steps editable grid per packet 01 §6: fixed lane-label
  column (name in lane color + `M` mute toggle), cell area x-scrolls when narrow
  (constraint: cells stay ≥44px, never shrink below); step-number header row (`1 · · ·
  2 · · ·` — numbers on downbeats); active cell = lane color fill, current-step active
  cell = glow `0 0 0 2px bg, 0 0 14px 2px color` + scale 1.06, current-step inactive =
  inset accent-soft ring; muted lane dims cells; `readonly` prop (Transport-Sequencer
  treatment: pointer-events off, full opacity pattern, no hover affordance);
  `aria-pressed` per cell, `aria-label` "Toggle {lane} step {n}".
- Props: `lanes: { name, color, cells: boolean[], muted? }`, `currentStep`, `playing`,
  `readonly`. Emits `toggle(lane, step)`, `mute(lane)`.
- Used by: DrumMachine ×3 (Task 14). TransportSequencer keeps its custom fluid grid
  (this week's rework) restyled with tokens — DECISION logged below.

### Task 7: `PianoKeyboard` restyle (existing shared component)

- Restyle to packet spec: white keys `--ewa-bg` + `--ewa-line-2` border, black keys
  `--ewa-text` bg, shortcut letters (DM Mono, A–K / W E T Y U) on keys, pressed white =
  `--ewa-accent-soft` + 2px depress, pressed black = accent fill; add KeyboardHintChip
  row under. Keep all existing behavior/props/events untouched.

### Task 8: Kit `README.md`

- `kit/README.md`: one section per component — purpose, props/events, usage snippet,
  which demos use it. Written after Tasks 2–7 land (update at end if later tasks touch
  kit APIs).

---

## Part B — Demo application (packet 03/04/05 specs; "Uses" per 05 card)

Each task: wrap demo in `DemoFrame` (+ takeaway line from the 05 card), swap controls
to kit components, apply state vocabulary, screenshots of the page(s), full per-task gate.

### Task 9: Basic playback — `AudioDemo`, `TrackDemo`, `PlayTogetherDemo`
Pages: `basic-playback`, `layered-sound` (PlayTogether embeds there).
- AudioDemo: PlayButton + ParameterSlider(vol) [+ pan slider ONLY if control already
  exists; else log].
- TrackDemo: transport PlayButton + stop, seek bar as accent-fill progress slider,
  MM:SS mono readout (packet 05 "seek" card).
- PlayTogetherDemo: TriggerPad row — "each pad flashes accent on trigger; multiple
  light simultaneously".

### Task 10: Sampling — `SampledDrumKit`, `SoundfontPiano`
Pages: `sampled-drum-kit`, `soundfont-piano`.
- SampledDrumKit: 3 TriggerPads in kick/snare/hat sound-palette colors, depress + color
  ring on hit; VolumeWarning if it generates loud output (keep existing warning policy).
- SoundfontPiano: restyled PianoKeyboard; loading shimmer while soundfont fetches
  (presentation-only skeleton, packet 05).

### Task 11: Synthesis — `OscillatorDemo` (synthesis), `FilterDemo` (effects page)
Pages: `synthesis`, `effects`.
- WaveformSelector, freq/cutoff ParameterSliders, Q Knob, filter-type PresetSelector,
  VolumeWarning, PlayButton; filter response curve canvas reads stroke/fill from
  `--ewa-accent`/`--ewa-accent-soft` at draw time, dashed cutoff marker (packet 03).
  Apply the pieces each demo actually has — no new audio controls.

### Task 12: `XYPad`
Page: `xy-pad`.
- Pad canvas: `--ewa-line-2` grid + accent crosshair, accent puck; freq/gain mono
  readouts; small WaveformSelector; PlayButton; KeyboardHintChip (arrows); focus ring
  on pad; playing dot blink (packet 03).

### Task 13: Synth family — `SynthKeyboard`, `SynthDrumKit`, `PolySynthDemo`
Pages: `synth-keyboard`, `synth-drum-kit`, `polysynth`.
- SynthKeyboard: PianoKeyboard + PresetSelector + ADSR ParameterSliders + VolumeWarning;
  ADSR mini-curve (inline SVG redrawing from slider values — presentation of existing
  state, packet 05).
- SynthDrumKit: 7 TriggerPads with layer-grouping labels (packet 05 "Layer grouping
  labels"); grouped pulse OK if pure CSS.
- PolySynth: PianoKeyboard + PresetSelector + sliders + WaveformSelector + voice-count
  pill meter (n/8 pills fill in `--ewa-bass`; dim on steal — drive from existing voice
  state only) + steal-strategy control restyle if it exists.

### Task 14: Drum machines ×3 — `DrumMachine`, `DrumMachineVue`, `DrumMachineVanilla`
Pages: `drum-machine`, `drum-machine-vue`, `drum-machine-vanilla`.
- Adopt StepGrid + PlayButton + BPM ParameterSlider (packet 04). All three visually
  identical (IA: "code is the differentiator"). Vanilla variant: match DOM/CSS output
  as closely as its non-SFC structure allows; reuse kit if it's a Vue SFC (check —
  if truly no-Vue, mirror kit CSS classes from custom.css utility layer; note approach
  in SUMMARY).

### Task 15: Rhythm/timing — `TimingDemo`, `TransportSequencerDemo`
Pages: `timing`, `transport-sequencer`.
- Timing: TriggerPads/buttons + dual-timeline visual (drift dots `--ewa-kick` vs locked
  dots accent, packet 05 "clock" card).
- TransportSequencer: tokens + DemoFrame + PlayButton + BPM slider + PresetSelector +
  SegmentDisplay (bar:beat) + read-only grid treatment (keep this week's fluid grid;
  non-editable affordance per packet 05: no hover scale, `--ewa-text-3` labels; mute/solo
  restyle). DO NOT restructure the grid.

### Task 16: Effects & routing — `DistortionDemo` (effects + audio-routing pages)
Pages: `effects`, `audio-routing`.
- DistortionDemo: DemoFrame + PlayButton + Amount/Mix ParameterSliders + VolumeWarning.
  Live output waveform only if an analyser already exists in the demo — else log to
  M8-QUESTIONS, ship static-styled visual (packet 05 "distortion").
- audio-routing page: add SignalFlow (`SRC→FILT→GAIN→PAN→OUT`, packet 05 "routing") as
  a static diagram above the embedded demo (markdown-embeddable kit use).

### Task 17: `EffectsChainDemo`
Page: `effects-chain`.
- Restyle onto kit: PlayButton, source PresetSelector (keep 3-source switcher!), effect
  slot cards (active = solid border in slot color lead/clap/snare/bass; bypassed =
  dashed `--ewa-line-2` + 0.6 opacity + params collapsed), ▲▼ reorder buttons (44px,
  aria-labels), bypass toggle chip, live SignalFlow reflecting active slots + source
  (packet 04). Param rows: mono value + mini accent fill bars.

### Task 18: `LFODemo`
Page: `lfo-modulation`.
- Mode tabs (PresetSelector), scrolling LFO canvas (accent stroke + glow from CSS vars,
  reduced-motion freezes phase), Rate/Depth ParameterSliders, small WaveformSelector,
  Slow/Fast preset chips, context-aware depth readout (%/cents/Hz — packet 04; existing
  behavior, presentation only).

### Task 19: Composition — `AudioSpriteDemo`, `LayeredSoundDemo`, `CrossfadeDemo`
Pages: `audio-sprite`, `layered-sound`, `crossfade`.
- AudioSprite: 6 TriggerPads + segment timeline (colored slices per sprite; triggering
  highlights its slice + sweeps a playhead across that slice — CSS anim timed to
  existing duration data, packet 05 "sprite").
- LayeredSound: PlayButton + per-layer/master sliders (vertical fader look optional —
  ParameterSlider acceptable); meters only if data already exposed, else log.
- Crossfade: dual-track A/B tiles (`--ewa-lead`/`--ewa-clap`), gradient crossfader rail
  + accent-ring handle gliding A→B over set duration; track tile opacities invert with
  fade progress (packet 05 "crossfade").

### Task 20: Creative — `AmbientGenerator`, `VisualizationDemo`
Pages: `ambient-generator`, `visualization`.
- Ambient: DemoFrame + PlayButton + 4 ParameterSliders + VolumeWarning + generative
  bloom visual (concentric accent rings breathing while playing; fade in/out on
  start/stop; reduced-motion = static rings; packet 05 "ambient"). Keep this week's
  layer renames.
- Visualization: canvases pull colors from CSS vars at draw time; source select +
  freq slider onto kit.

---

## Part C — Wrap-up

### Task 21: IA triage (packet 06) → adoptions + `M8-QUESTIONS.md`

| Suggestion | Recommendation |
|---|---|
| B1 rename by outcome ("Timing Basics"→"Why timing drifts" etc.) | ADOPT — pure config (`config.mts` sidebar text + page h1s). Keep URLs. |
| B3 Groovebox first in Examples order | DEFER — Phase 76 not built; note in QUESTIONS for 76. |
| B2 fold 3 drum-machine pages into one tabbed page | NEEDS-SETH — structural (deletes pages/URLs) → M8-QUESTIONS. |
| A demo-page template (component-first ordering) | PARTIAL — takeaway line ships via DemoFrame (Part B). Reordering prose/code on 20+ pages is content restructuring → M8-QUESTIONS, recommend adopting in a docs pass. |
| C1 playable overview index | NEEDS-SETH — structural → M8-QUESTIONS. |
| C4 volume notice once-per-session | SKIP for now — session state = behavior; single VolumeWarning pattern already unifies. Log. |
| D cross-cuts (takeaway, signal-flow reuse, playing-state, reduced-motion) | ADOPTED throughout Part A/B. |

Execute the ADOPT row, write the QUESTIONS entries, commit.

### Task 22: Exit gate

- Full gate `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build && pnpm test:e2e`.
- Screenshot set complete (every demo page, light+dark) in `screenshots/`.
- Finalize `kit/README.md`; write `74-02-SUMMARY.md` (deviations, IA adoptions,
  questions filed) + `74-VERIFICATION.md` if phase-complete; update STATE/ROADMAP.

---

## Decisions made at expansion (orchestrator, logged for gate review)

1. **TransportSequencer keeps its bespoke grid** (restyled with tokens, read-only
   treatment) instead of adopting kit StepGrid — the fluid-width grid + chord labels
   shipped this week for gate 2; a rebuild risks regressing listened-to work. StepGrid
   serves the editable 16-step machines.
2. **`--vp-c-brand-1` → Signal green adopted** site-wide per packet recommendation
   (presentation-only; reversible one-liner).
3. **44px touch floor beats packet's 30px cells** (hard constraint; packet 00
   acknowledges the tension and endorses scroll-don't-shrink).
4. **No new audio-wired controls** — pan/analyser/meter wants land in M8-QUESTIONS.
5. Screenshots against `pnpm dev` server; VitePress dark = `.dark` class toggle, not
   just `emulateMedia`.

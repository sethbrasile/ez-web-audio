# EWA Demo Kit

Shared Vue SFC parts for the docs demos, implementing the claude-design handoff
packet (`.planning/DESIGN-HANDOFF/`, 74-02). All colors come from the `--ewa-*`
tokens declared in `../../custom.css` (VitePress-var aliases + light/dark raw
values). Canvas code must read tokens via `getComputedStyle(...).getPropertyValue()`
at draw time — never hardcode hex.

Conventions: every class is `ewa-`-prefixed (the global reduced-motion rule in
custom.css keys off that), touch targets ≥44×44px, focus-visible = 2px accent
ring / 3px offset, playing state = danger fill + blinking live dot.

## Components

### DemoFrame
Panel wrapper for every demo. Props: `takeaway?` (accent one-liner rendered at
top — the packet's "one takeaway callout"), `error?` (rendered `role="alert"` in
danger). Slots: default (demo body), `status` (bottom status line).
```html
<DemoFrame class="my-demo" :error="error" takeaway="Playing a sound is one function call.">
  …controls…
  <template #status>{{ status }}</template>
</DemoFrame>
```
Used by: every restyled demo.

### PlayButton
Transport play/stop. Props: `playing`, `loading`, `disabled`, `label` ('Play'),
`playingLabel` ('Stop'), `loadingLabel`. Emits `click`. Idle = accent fill +
triangle; playing = danger fill + square + live dot. Carries legacy `.play-btn`
class — E2E selectors depend on it; do not remove.
Used by: all demos with a transport.

### ParameterSlider
Labeled slider with mono value readout. A real `<input type="range">` (opacity 0,
full 44px hit area) drives native keyboard/SR behavior; custom track/fill/thumb
underneath. Props: `label`, `modelValue` (v-model), `min`, `max`, `step`,
`format?`, `center?` (pan-style fill-from-center), `disabled?`, `id?`.
Used by: nearly all demos for gain/frequency/BPM/time params.

### Knob
Rotary control, 270° arc. `role="slider"` + pointer-capture vertical drag +
full keyboard map (arrows/Home/End/PageUp/Down). Props: `label`, `modelValue`
(v-model), `min`, `max`, `step`, `format?`, `disabled?`, `size?` (px, default 64).
Used by: FilterDemo (resonance Q).

### PresetSelector
Segmented radiogroup. Props: `options` (`string[]` or `{label,value}[]`),
`modelValue` (v-model), `label?`, `disabled?`. Roving tabindex + arrow keys.
Used by: SynthKeyboard (ADSR presets), EffectsChain-style source rows where E2E
allows. NOTE: several demos keep native selects/buttons instead because E2E
drives `selectOption()` or literal classes (`.preset-btn`, `.tab-button`,
`#filter-type`) — those are token-restyled in place.

### WaveformSelector
Icon radiogroup for sine/square/sawtooth/triangle (inline SVG paths from the
packet). Props: `modelValue` (v-model), `waves?`, `small?`, `label?`, `disabled?`.
Used by: Oscillator, SynthKeyboard, PolySynth, XYPad, LFO.

### KeyboardHintChip
Mono hint chip; styles `<kbd>` children. Slot-only.
```html
<KeyboardHintChip><kbd>A</kbd>–<kbd>K</kbd> trigger notes</KeyboardHintChip>
```
Used by: PianoKeyboard, XYPad.

### SegmentDisplay
Mono numeric readout tile (bar:beat clock, MM:SS, Hz). Props: `value`,
`caption?`, `size?` ('md'|'lg'), `timer?` (adds `role="timer"`).
Used by: TrackDemo, TransportSequencer, XYPad, TimingDemo.

### SignalFlow
Shared routing-diagram language: mono node chain with → connectors,
`role="img"` with a full aria-label. Props: `nodes: { label, color?, active? }[]`
(color = CSS color string, e.g. `var(--ewa-lead)`).
Used by: audio-routing page (static). EffectsChain and Distortion keep bespoke
diagrams (E2E asserts node counts incl. bypassed; bypass state isn't expressible
here) restyled to the same visual language.

### TriggerPad
Momentary pad. Fires on pointerdown + Space/Enter (key-repeat guarded), flashes
180ms. Props: `label`, `sublabel?`, `color?` (sound-palette var), `disabled?`,
`active?` (external "sounding" state). Emits `trigger`.
Used by: PlayTogether, SampledDrumKit, SynthDrumKit, TimingDemo, AudioSprite.

### StepGrid
Sequencer grid: sticky 84px lane-label column, 44px cells that x-scroll (never
shrink — hard constraint), step-number header, per-lane color via `--lane-color`,
playhead glow on current step, optional mute buttons, `readonly` mode (full-
opacity pattern, non-interactive). Props: `lanes: { name, color?, cells:
boolean[], muted? }[]`, `currentStep?`, `playing?`, `readonly?`, `showMutes?`,
`stepsPerBeat?`. Emits `toggle(lane, step)`, `mute(lane)`. Cells carry legacy
`.beat-cell` class for E2E.
Used by: DrumMachine, DrumMachineVue. (DrumMachineVanilla mirrors the geometry
in CSS but keeps imperative DOM — it showcases the vanilla event API.
TransportSequencer keeps its bespoke fluid grid, token-restyled.)

### id.ts
`nextId(prefix)` — module-counter unique ids for label/input pairing.

## Adding a demo

1. Wrap in `DemoFrame` with a one-line `takeaway`.
2. Use kit controls; pass exact ranges/steps the audio code expects.
3. `VolumeWarning` on anything that synthesizes live sound.
4. Canvas colors from CSS vars at draw time; redraw on theme flip
   (MutationObserver on `documentElement` class) unless a rAF loop already
   re-reads colors each frame.
5. Check `e2e/*.spec.ts` for selectors before renaming any class.

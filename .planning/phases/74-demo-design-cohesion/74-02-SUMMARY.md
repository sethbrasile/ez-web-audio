# 74-02 Summary — claude-design packet implemented

**Status:** COMPLETE (2026-07-10). Exit gate green: 1944 core + 31 vue unit,
typecheck, lint, docs build, 72/72 E2E. Light+dark screenshot set for every
example page in `screenshots/`.

## What was built

**Token layer** (`docs/.vitepress/theme/custom.css`): all `--ewa-*` tokens from
packet 01, light + dark; VitePress-var aliases where VP owns the role; Signal-green
`--vp-c-brand-*` override site-wide; shared keyframes + scoped reduced-motion rule.

**Parts kit** (`docs/.vitepress/theme/components/kit/`, 12 SFCs + id.ts + README):
DemoFrame, PlayButton, VolumeWarning, ParameterSlider, Knob, PresetSelector,
WaveformSelector, KeyboardHintChip, SegmentDisplay, SignalFlow, TriggerPad,
StepGrid. See `kit/README.md` for API + usage map.

**All 22 demo components restyled onto the kit** (plus PianoKeyboard shared
component, plus the audio-routing page gained a static SignalFlow). Every demo:
DemoFrame + takeaway one-liner, kit controls, tokens only, canvas colors read
from CSS vars at draw time, VolumeWarning unified on the single pattern, AA
focus rings, ≥44px touch targets. Audio logic untouched throughout.

## Deviations (constraint beats packet / E2E beats packet)

1. **AA fix:** packet set `--vp-c-brand-1: #0e9268` — 3.95:1 on white, fails AA
   for link text. brand-1/-3 use accent-ink `#067552` in light mode instead
   (packet's own accent-as-text rule).
2. **44px touch floor beats packet's 30px grid cells** — StepGrid cells are
   44px and x-scroll (packet 00 endorses scroll-don't-shrink).
3. **E2E-driven keeps** (token-restyled in place instead of kit components):
   FilterDemo `#filter-type` native select; PolySynth steal-strategy select +
   `.preset-btn` buttons; LFO `.tab-button` mode tabs; EffectsChain source
   switcher (per-button aria-labels) + its 4-node flow diagram (bypassed nodes
   stay in DOM); TransportSequencer BPM native input (dynamic aria-label
   locator) + `.preset-btn`. Kit components carry legacy alias classes
   `.play-btn` / `.beat-cell` for the same reason.
4. **XYPad stays square** (packet mock 1.4 aspect would desync pointer math
   with the single-`size` canvas buffer).
5. **DrumMachineVanilla keeps imperative DOM** (it showcases the vanilla event
   API); CSS mirrors StepGrid geometry so all three machines look identical.
   Vue/Vanilla machines keep their pre-existing Mute/Solo rows.
6. **TransportSequencer bespoke fluid grid preserved** (gate-2 rework);
   active cells uniform accent — per-lane palette needs a script-side color
   map, logged in M8-QUESTIONS as polish candidate.
7. **DistortionDemo keeps its bypass-aware chain diagram** (SignalFlow can't
   express bypass); token-restyled to the shared language.
8. **Visualization spectrum**: rainbow HSL bars → single accent hue with
   amplitude-driven opacity (one accent token by design).
9. **Timing demo has no setTimeout-drift row** — packet's dual-timeline halved
   to the existing audio-clock row + caption (no invented behavior).
10. **No new audio-wired controls** anywhere (packet's pan/analyser/meter wants
    either already existed or were dropped).

## E2E note (per plan sign-off rule)

No assertion or behavior changes to any spec file. Selector stability handled
in components: kit PlayButton carries `.play-btn`, StepGrid cells carry
`.beat-cell`, demos keep their root classes and native controls where tests
drive them (list above).

## IA triage (packet 06) — Task 21

Adopted: two packet-explicit outcome renames ("Why Timing Drifts",
"LFO — One Knob, Three Effects" — sidebar + h1 + cross-links, URLs unchanged);
cross-cutting conventions shipped via the kit. Deferred with recommendations in
`M8-QUESTIONS.md` (2026-07-10 · 74-02 entry): drum-machine page fold, groovebox
ordering (blocked on 76), page-template inversion, playable overview index,
volume-notice-once-per-session (recommend skip), full rename batch.

## Verification evidence

- Per-task commits `feat(74-02): …` (18 commits), each gated typecheck+lint+E2E.
- Exit gate 2026-07-10: `pnpm typecheck && pnpm lint && pnpm test && pnpm build
  && pnpm test:e2e` all green (1944 + 31 unit, 72/72 E2E; one transient loudness
  timing flake observed across runs, passes on re-run, pre-existing).
- Screenshots: every `/examples/*` page + home, light+dark, in `screenshots/`.

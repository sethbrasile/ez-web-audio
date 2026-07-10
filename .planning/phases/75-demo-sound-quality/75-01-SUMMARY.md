# 75-01 Summary — Demo Sound Quality (Master Bus, Gain Staging, Preset Tuning)

**Status:** Tasks 1–4 COMPLETE. Exit gate green (typecheck ✓, lint ✓ 0-errors, 1926 core + 31 vue tests ✓, build ✓, E2E **72/72** = 55 + 17 loudness). **STOPPED at HUMAN GATE 2 (Seth listening checkpoint).**

## Task 1 — Routing spike → core hook

`75-SPIKE.md`: `setDestination()` exists on top-level types but not Sampler/BeatTrack/Font/Sprite (they delegate to child Sounds), so per-instance routing would re-add phase-73 plumbing. **Decision (b): global master-destination hook in core** — approved by Seth.

Shipped `setMasterDestination(node)` / `getMasterDestination()` + `getAudioContextSync()` (needed for synchronous, race-free bus install inside a gesture handler). Every `BaseSound`/`LayeredSound`/`GrainPlayer`/`PolySynth` constructor now reads `getMasterDestination() ?? audioContext.destination`; wrapper types inherit via their child instances. Additive, backward-compatible, reset by `_resetAudioContext`. +5 core tests (1921→1926). Full public JSDoc with examples.

## Task 2 — Demo master bus

`docs/.vitepress/theme/audio/demo-master-bus.ts`: `input(gain) → limiter(DynamicsCompressor, −1 dBFS / ratio 20 / 1 ms attack) → analyser → destination`, singleton per context, `peak()` via `getFloatTimeDomainData`. Installed on the first user gesture (capture phase, **synchronous** via `getAudioContextSync` so the same gesture's first instance already routes through it). Exposes `window.__EZ_DEMO_PEAK__`. **Zero per-demo changes** — the global hook does the routing.

## Task 3 — Objective loudness E2E

`e2e/loudness.spec.ts`: 17 demos, trigger primary sound, sample peak 3 s, assert `0.05 ≤ peak ≤ 0.985` (audible, no clip). Piano-key/canvas-only demos (PolySynth, SynthKeyboard, SoundfontPiano, XYPad) covered by page-load smoke instead — left for manual listening. The harness immediately caught 4 clippers.

## Task 4 — Gain staging + preset tuning

**Measured master-bus peaks (post-fix, all pass):**

| Demo | peak | Demo | peak |
|---|---|---|---|
| Oscillator | 0.23 | Ambient | 0.24 |
| Sound+Track | 0.15 | DrumMachine | 0.76 |
| Filter | 0.22 | DrumMachineVue | 0.78 |
| Distortion | 0.23 | TransportSequencer | 0.63 |
| Timing | 0.44 | SampledDrumKit | 0.19 |
| Visualization | 0.23 | SynthDrumKit | 0.16 |
| LFO | 0.74 | Crossfade | 0.52 |
| EffectsChain | 0.18 | Layered+PlayTogether | 0.41 |
| GrainPlayer | 0.13 | | |

**Fixes (clippers, were >1.0):**
- **DrumMachine / DrumMachineVue** (1.00 → 0.76/0.78): `Sampler.gain = 0.7` per track.
- **TransportSequencer** (1.00 → 0.63): drum `gain` 0.7/0.7/0.6, bass `changeGainTo(0.5)` + lowpass 600 Hz (reference table).
- **Ambient** (1.05 → 0.24): replaced the drone/shimmer full-scale ADSR envelopes with `onPlayRamp('gain')` swells to low targets. Root cause: `Envelope.applyTo` ramps to **absolute 1.0**, overriding `changeGainTo` — logged as library friction in `M8-QUESTIONS.md`.

**Preset audit (reference table):** LFO (vibrato ≤50¢, wah bandpass Q6), EffectsChain (delay mix 0.3, compressor below threshold at default gain), GrainPlayer (Freeze overlap≈grainSize/jitter≤0.02, Choppy grainSize=40 ms) already compliant (fixed in b0dee2f, cited comments). Only the TransportSequencer bass lowpass was added.

## Deviations / decisions logged to M8-QUESTIONS.md

- Core global master-destination hook = new public API (approved).
- `getAudioContextSync()` added to enable race-free bus install (companion to async `getAudioContext`).
- Envelope-attack-to-1.0 library friction (Ambient) — demo worked around; pre-1.0 core enhancement candidate.

## → HUMAN GATE 2 (listening) — what to check

Run `pnpm dev`, ~15 min, all demos. Objective clipping is handled (peaks above). Ears needed for:
- **Ambient**: linear `onPlayRamp` swell replaced the ADSR — does the pad still swell/feel right (no release tail now)?
- **Drum levels** (DrumMachine/Vue/TransportSequencer) at 0.6–0.7 gain — still punchy, not thin?
- **TransportSequencer bass** lowpass @600 Hz — sits under piano as intended?
  (Post-hoc review note: a 41.2 Hz triangle's harmonics roll off at 1/n², so its
  content above 600 Hz is already <−45 dB — the filter is close to an audible
  no-op. If the bass still fights the piano, the lever is its gain (0.5), not
  the filter.)
- General: consistent loudness across demos; presets hit their musical targets (LFO vibrato/tremolo/wah, GrainPlayer freeze/choppy, EffectsChain first-impression).

Seth's findings become fix tasks appended here before Phase 76 unblocks.

### Gate 2 — round 1 (Ambient, 2026-07-10)

Seth listened to Ambient: (1) layers started **staggered** — texture instant, drone/shimmer lagged; (2) **checkbox toggles clicked** (Start/Stop did not).

Cause: my ADSR→ramp swap left texture on instant `changeGainTo` while drone/shimmer used 1.5 s / 2.0 s `onPlayRamp` (staggered onset); toggles used instant `changeGainTo(0↔gain)` = hard step = click.

Fix (`fix(75): ambient gate-2`): all three layers swell in together over a uniform `SWELL_SEC` (0.6 s); toggles + master-volume now ramp via `getGainNode().gain.linearRampToValueAtTime` over `TOGGLE_FADE_SEC` (0.12 s); initial swell respects masterVolume. Verified: 0 pageerrors toggling all layers; loudness 17/17 still green (Ambient 0.12). **Re-listen pending.** Other demos not yet reported on.

### Gate 2 — round 2 (Ambient drone pop, 2026-07-10)

Seth re-listened: swell + toggles fixed, but the **Drone layer pops** (texture/shimmer don't).

Root cause is a **core library bug**, not the demo: `onPlayRamp` defaults to an
`exponential` ramp (`base-param-controller.ts`), and the demo's
`onPlayRamp('gain').from(0)` scheduled `setValueAtTime(0)` +
`exponentialRampToValueAtTime(target)`. Per the Web Audio spec, an exponential
ramp whose previous event value is exactly **0 never ramps — it holds at 0 for
the whole interval, then steps instantly to the target at ramp end**. So every
layer was silent for 0.6 s then jumped in; only the drone's jump was audible
(0.125 amplitude 80 Hz sine vs 0.04 noise / 0.025 @600 Hz). This is also the
true cause of round 1's "stagger": the old 1.5 s / 2.0 s ramps were
silence-then-jump at 1.5 s / 2.0 s, not slow swells — round 1 fixed the symptom.
The canonical fade-in example in the README/docs (`onPlayRamp('gain').from(0)`)
was broken for every consumer.

Fix (two levels):
- **Core** (`base-param-controller.ts`): `onPlayRamp(...).from(0)` with an
  exponential ramp now clamps the start to `SAFE_NEAR_ZERO` (1e-5) — symmetric
  with the existing target-value guard. +2 unit tests (1928 core green).
- **Demo**: Ambient swells switched to explicit `'linear'` ramps — matches the
  toggle fades, and avoids the perceptual late-bloom of an exponential rise
  from near-zero (which would read as stagger again).

Verified: typecheck green, 1928 core unit tests, loudness E2E 17/17 (Ambient
peak unchanged). **Re-listen pending.**

### Gate 2 — round 3 (full demo sweep, 2026-07-10)

Seth listened across all demos. **Confirmed good:** drone pop FIXED, LFO good,
GrainPlayer mostly good. **Findings tracked as beads** (`bd list`, prefix
`ez-audio-`) — 12 issues, NOT fixed yet by Seth's instruction:

| Bead | Finding |
|---|---|
| ez-audio-5b2 (P0) | PolySynth voice ADSR not independent — releases collapse together; pop on stop with multiple voices (likely core `poly-synth.ts`) |
| ez-audio-01q (P1, epic) | TransportSequencer musical design review — audio makes no sense; children below |
| ez-audio-20p (P0) | ↳ start/stop buggy: notes after stop, hanging bass notes |
| ez-audio-s8v (P1) | ↳ funk/groove start screeches |
| ez-audio-ttc (P1) | ↳ content depends on prior start/stop of other pattern (state leak) |
| ez-audio-jui (P2) | ↳ grid overflows viewport |
| ez-audio-7uq (P1) | Ambient sound not pleasing — research good synthesized ambient, redesign |
| ez-audio-1c9 (P1) | SynthDrumKit bass drop too long — port ember-audio original settings |
| ez-audio-5w9 (P1) | EffectsChain needs transient/dynamic source material |
| ez-audio-8de (P1) | SoundfontPiano note-start click + smooth decay before ~4s end |
| ez-audio-aub (P1) | XYPad small clicks/pops changing gain with note held |
| ez-audio-7fk (P2) | GrainPlayer pad preset sounds like decaying piano, not a pad |

Gate 2 stays OPEN until these are fixed and Seth re-listens. Phase 76 still
blocked. Several are likely **core library** bugs (PolySynth envelopes,
Transport stop scheduling, note-start clicks) — library-fidelity rule applies.

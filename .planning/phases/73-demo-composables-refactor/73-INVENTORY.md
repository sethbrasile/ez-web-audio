# 73-01: Demo Composables Refactor — Inventory (Task 0)

Read-only recon pass over all 27 `*.vue` files in
`docs/.vitepress/theme/components/`. No components were modified. This
inventory drives Tasks 1–N of `73-01-PLAN.md`.

**Composables that exist today** (`packages/vue/src/index.ts`): `useSound`,
`useTrack`, `useOscillator`, `useSampler`, `usePolySynth`, `useGrainPlayer`,
`useLFO`, `useTransport`, `useBeatTrack`, `useAudioContext`, `useCleanup`.
`useAudioContext()` only returns `{ ready, init }` — it does **not** expose the
underlying `AudioContext` object.

**Core factories that have no composable at all**: `createFont`,
`createSequence`, `createSounds`, `createTracks`, `createWhiteNoise`,
`createLayeredSound`, `createNoise`, `createSprite`, `createAnalyzer`,
`createFilterEffect` + all effect factories (`createDelay`, `createReverb`,
`createCompressor`, `createEQ`), plus the utility functions `crossfade`,
`playTogether`, `audioContextAwareTimeout`, `wrapEffect`, `getAudioContext`.

## Component table

| Component | Uses audio? | Core factories/APIs used | Init pattern | Instances created (register w/ useCleanup) | Manual onUnmounted disposal? | Non-library resources (stay manual) | E2E specs covering it | Target composables | Notes/risks |
|---|---|---|---|---|---|---|---|---|---|
| AmbientGenerator.vue | Yes | `createOscillator` ×2 (drone, shimmer), `createWhiteNoise` (texture), `createFilterEffect` | Inline `await import('ez-web-audio')` inside `startAll()`, no module-level `lib`/guard var | droneOscillator, textureNoise, shimmerOscillator (3); textureFilter is an effect attached via `addEffect`, not a top-level disposable | Yes — `stopAll()` stops all 3 | none | demos.spec.ts smoke only (`examples/ambient-generator`) | useOscillator ×2, useCleanup | `createWhiteNoise` has no composable → gap. 3 layers created once at Start, then toggled by gain — not per-interaction churn, so maps cleanly once the gap is filled. |
| AudioDemo.vue | Yes | `createSound` | `ensureInit()` guard on module `sound`/`lib` | sound (1) | Yes — stop only, no dispose | none | interactions.spec.ts "Basic Playback page interactions" (`examples/basic-playback`, shared w/ TrackDemo) + demos.spec.ts | useSound, useCleanup | Clean, single instance. |
| AudioSpriteDemo.vue | Yes | `createSprite`, `createSound` | `ensureLoaded()` guard on `loaded`/`loading` refs | sprite (Sprite, stop+dispose), fullSound (Sound) | Yes — stops+disposes sprite, stops fullSound | playTimer/fullTimer (`setTimeout`), playheadFrame (RAF loop) | **None** — `examples/audio-sprite` is absent from both `demos.spec.ts` and `interactions.spec.ts` | useSound (fullSound); `createSprite` has no composable → gap | Zero E2E safety net. Riskier than its plan position (#9) implies. |
| CrossfadeDemo.vue | Yes | `createTrack` ×2, `crossfade` (utility) | `ensureLoaded()` guard, module `lib` | trackA, trackB (2 Track) | Yes (async) — stops both + cancels RAF | animFrame (RAF position-display loop) | **None** — `examples/crossfade` absent from both spec files | useTrack ×2, useCleanup | `crossfade()` utility has no composable wrapper → gap. Zero E2E coverage. |
| DistortionDemo.vue | Yes | `createOscillator`, `getAudioContext`, `wrapEffect` (on `ctx.createWaveShaper()`) | `initIfNeeded()` guard, module `lib` | oscillator (1) | Yes — stop, nulls effect | none | demos.spec.ts smoke only, via `examples/audio-routing` (route name is misleading — this page actually hosts DistortionDemo, not a routing demo) | useOscillator, useCleanup | Needs raw `AudioContext` object (`getAudioContext`) + `wrapEffect` — neither is composable-wrapped. `useAudioContext()` doesn't expose the context object → gap. |
| DrumMachine.vue | Yes | `createBeatTrack` ×3 (looped over `trackDefs`, `wrapWith: reactive`) | `init()` guarded by plain `initialized` boolean, lazy import inside | 3 BeatTrack (kick/snare/hihat) | Yes — stops all 3 | none | interactions.spec.ts "Drum Machine page interactions" + Mobile viewport test + demos.spec.ts — best-covered demo | useBeatTrack ×3, useCleanup | Loop-of-3 creation must be unrolled into 3 static `useBeatTrack()` calls (composables can't be invoked inside a runtime loop). `useBeatTrack` already bakes in `wrapWith: reactive` (see `composables.ts`), so the component's own `wrapWith` option becomes redundant/duplicated — drop it. |
| DrumMachineVanilla.vue | Yes (excluded — see Exclusions) | `createBeatTrack` ×3 | Same shape as DrumMachine.vue | 3 BeatTrack | Yes | none | demos.spec.ts smoke (`examples/drum-machine-vanilla`) | N/A — excluded | Exists specifically to demo event-based (`.on('beat', ...)`) + direct-DOM vanilla patterns, explicitly NOT using `wrapWith`/reactive. Confirmed exclude. |
| DrumMachineVue.vue | Yes | `createBeatTrack` ×3 (loop, `wrapWith: reactive`) | Same shape as DrumMachine.vue | 3 BeatTrack | Yes | none | interactions.spec.ts "Drum Machine Vue page interactions" + demos.spec.ts | useBeatTrack ×3, useCleanup | Same loop-unroll note as DrumMachine.vue. Near-duplicate of DrumMachine.vue (adds mute/solo) — plan's task 17 groups both, reasonable. |
| EffectsChainDemo.vue | Yes | `createOscillator` OR `createTrack` (switchable), `createDelay`, `createReverb`, `createCompressor`, `createEQ` | `ensureLib()` guard, module `lib` | source (Oscillator\|Track, swapped by `switchSource()`), 4 effect objects in `effectRefs` map | Yes — stops+disposes source, disposes each effect | none | interactions.spec.ts "EffectsChain page interactions" + demos.spec.ts | useOscillator or useTrack (dynamic swap), useCleanup; 4 effect factories have no composables → gap | **Highest risk in the set.** Source-type swap requires dispose+recreate of the composable instance, which `createFactoryComposable`'s memoized `load()` does not support (`if (instance.value) return Promise.resolve(instance.value)` short-circuits forever). Combined with 4 missing effect composables. |
| FilterDemo.vue | Yes | `createOscillator` OR `createWhiteNoise` (switchable), `createFilterEffect` (recreated on type change) | Lazy import inside `playSound()`, `initialized` ref | source (Sound\|Oscillator, swapped), filter (recreated per type change) | Yes — `stopSound()` | none | interactions.spec.ts "Effects page (FilterDemo) interactions" + demos.spec.ts | useOscillator or (gap) useWhiteNoise; `createFilterEffect` has no composable | Same source-swap/recreate problem as EffectsChainDemo, smaller scale. `createWhiteNoise` gap. |
| GrainPlayerDemo.vue | Yes | `createSound` (only to extract `.audioBuffer` via `as any` cast), `createGrainPlayer` | `ensureLoaded()` guard, module `lib` | grainPlayer (1); the intermediate `sound` is discarded after buffer extraction and never played/stopped/disposed today | Yes — stops+disposes grainPlayer | animFrameId (RAF playhead/auto-advance loop), document mouseup/touchend/touchcancel listeners, window resize listener | interactions.spec.ts "GrainPlayer page interactions" + demos.spec.ts | useSound (or direct call) for the buffer, useGrainPlayer, useCleanup | `(sound as any).audioBuffer` is exactly the kind of cast the plan's exit sweep (`grep -rn "as any"`) is meant to catch — needs a typed accessor. Routing the throwaway `sound` through `useSound()`+`cleanup.register()` would incidentally fix an existing (harmless) leak. |
| LFODemo.vue | Yes | `createOscillator`, `createFilterEffect`, `createLFO` | `ensureLoaded()` guard, module `lib: typeof EzWebAudio \| null` | oscillator, lfo (both stopped/disposed); filter is nulled, never disposed | Yes — cancels RAF, disposes lfo, stops oscillator | animationFrameId (RAF canvas draw loop), window resize listener | interactions.spec.ts "LFO Modulation page interactions" + demos.spec.ts — good coverage | useOscillator, useLFO, useCleanup; `createFilterEffect` gap | Create-once-per-play pattern (not repeated recreate mid-play) — should map cleanly once filter-effect gap is resolved. |
| LayeredSoundDemo.vue | Yes | `createSound` ×3 (loop over `layerUrls`), `createLayeredSound` | `ensureLoaded()` guard, module `lib` | sounds[] (3 Sound), layered (1, wraps the 3) | Yes — stops `layered` only; individual `sounds[]` are never stopped in `onUnmounted` (pre-existing inconsistency, not introduced by refactor) | none | **None** — `examples/layered-sound` absent from both spec files (page also hosts PlayTogetherDemo) | useSound ×3 (loop), useCleanup; `createLayeredSound` has no composable → gap | Zero E2E coverage. Plan lists this early (#5) but the gap + loop-of-3 + no safety net make it harder than that position implies. |
| LlmsFooter.vue | No (excluded) | — | — | — | — | — | navigation smoke only (static footer, not a "demo page") | N/A — excluded | Confirmed: no `ez-web-audio` import. Pure static link footer (`withBase('/llms.txt')`). |
| OscillatorDemo.vue | Yes | `createOscillator` | Inline `await import('ez-web-audio')` per `play()` call, no module-level `lib` | oscillator (1, recreated every `play()` and on `waveType` change since `OscillatorNode.type` is immutable post-start) | Yes — `stop()` | none | interactions.spec.ts "Synthesis page (OscillatorDemo) interactions" + demos.spec.ts — good coverage | useOscillator, useCleanup | Cleanest demo — correctly plan's task #1. Recreate-on-waveType-change is a stop+`load()` cycle; `createFactoryComposable`'s `instance` ref is never reset by the composable itself, so the demo needs its own "is loaded" bookkeeping around `load()` (same friction, smaller scale, as the FilterDemo/PolySynth recreate problem). |
| PianoKeyboard.vue | No (excluded) | — | — | — | — | window keydown/keyup, document mouseup listeners; multi-touch tracking | demos.spec.ts (indirectly, as a sub-component of pages it's embedded in) | N/A — excluded | Confirmed: no `ez-web-audio` import. Pure UI component emitting `noteOn`/`noteOff` events consumed by SoundfontPiano, SynthKeyboard, PolySynthDemo. |
| PlayTogetherDemo.vue | Yes | `createSound` ×3 (loop), `playTogether` (utility) | `ensureLoaded()` guard, module `sounds[]`/`lib` | sounds[] (3 Sound) | Yes — stops all | none | **None** — shares `examples/layered-sound` page with LayeredSoundDemo, page not covered by either spec file | useSound ×3 (loop), useCleanup | `playTogether` utility has no composable wrapper → gap. Zero E2E coverage (same page as LayeredSoundDemo). |
| PolySynthDemo.vue | Yes | `createPolySynth` | `ensureLoaded()` guard, module `lib` | synth (1, but explicitly disposed+recreated via `recreateSynth()` on maxVoices/stealStrategy change or when "dirty" from waveform/envelope edits) | Yes — stops polling, clears 2 timeouts, stopAll+dispose | rafId (RAF voice-count poll, conditionally started/stopped), stealTimeout, recreateTimeout (`setTimeout`) | interactions.spec.ts "PolySynth page interactions" + demos.spec.ts — good coverage | usePolySynth, useCleanup | **High risk.** `recreateSynth()` repeatedly disposes+reconstructs — `createFactoryComposable`'s single-shot `load()` memoization can't do this. Needs either a raw `createPolySynth()` + `cleanup.register()` escape hatch, or a `reset()`-capable factory composable — likely a real `packages/vue` API gap despite `usePolySynth` existing. Harder than its plan position (#19) suggests. |
| SampledDrumKit.vue | Yes | `createSampler` ×3 (loop — kick/snare/hihat) | `initSamplers()` guard on `initialized` ref, module `lib` | kickSampler, snareSampler, hihatSampler (3 Sampler) | Nulls the 3 vars only, no `.stop()`/`.dispose()` calls | none | demos.spec.ts smoke only (`examples/sampled-drum-kit`) | useSampler ×3 (loop), useCleanup | Confirmed via `packages/core/src/sampler.ts`: `Sampler` has **no** `stop()`/`dispose()` method at all, so `useCleanup.register()`'s optional-chained calls are safe no-ops — this is not a missing-disposal bug, current `onUnmounted` is already equivalent. |
| SoundfontPiano.vue | Yes | `createFont` | `initFont()` guard on `initialized` ref, module `lib`/`font` | font (1, holds internal SampledNote array) | Stops any playing notes via `font.notes`, nulls `font` — no `font.dispose()` call | none | demos.spec.ts smoke only (`examples/soundfont-piano`) | **Blocked** — `createFont` has no composable (confirmed "known missing" gap) | Straightforward otherwise; entirely gated on the `useFont`-equivalent gap being filled first. |
| SynthDrumKit.vue | Yes | `createOscillator` (many, per-hit, incl. `Promise.all` loop for hi-hat's 6 harmonics), `createWhiteNoise`, `createFilterEffect`, `createLayeredSound` | `initIfNeeded()` guard, module `lib`, `activeOscillators[]` tracking array | Many short-lived instances created **per drum hit** (kick osc, snareMeat+snareCrack+layered snare, 6× hihat oscillators+layered hihat, bassDrop osc), each self-removed via `setTimeout` after natural decay | Stops everything still in `activeOscillators` | per-hit `setTimeout` cleanup timers (not individually cancelled, only final unmount matters) | demos.spec.ts smoke only (`examples/synth-drum-kit`) | useOscillator called many times per interaction (not once); `createWhiteNoise`/`createLayeredSound` gaps | **Highest instance-churn demo.** `createFactoryComposable`'s one-shot memoized `load()` model does not fit "create N ephemeral instances repeatedly over the component's life" — needs raw `createOscillator()`/`createWhiteNoise()`/`createLayeredSound()` + `cleanup.register()` per instance, the same escape hatch PolySynthDemo/EffectsChainDemo/SynthKeyboard/XYPad need. Harder than its plan position (#12) suggests. |
| SynthKeyboard.vue | Yes | `createOscillator` (one per active note, held in `Map<note, Oscillator>`), `frequencyMap` (data import) | Inline `await import('ez-web-audio')` per `handleNoteOn()`, no module-level `lib` | Multiple concurrent Oscillator instances, Map-keyed by note | Stops all oscillators in Map, clears | none | demos.spec.ts smoke only (`examples/synth-keyboard`) | useOscillator (same multi-instance churn problem as SynthDrumKit/PolySynth); `frequencyMap` is a plain data export — no composable needed, just import directly | Same "many concurrent instances, not one" pattern as PolySynthDemo/SynthDrumKit. Harder than its plan position (#13) suggests. |
| TimingDemo.vue | Yes | `createSound` ×3 (across sections), `createOscillator` ×3 (chord), `getAudioContext`, `audioContextAwareTimeout` | `initIfNeeded()` guard, module `lib` | Ephemeral sounds/oscillators created per button click, scoped to the triggering function | Cancels RAF + clears tracked `setTimeout`s via the audio-clock-aware `clearTimeout` | rafId (countdown RAF), timeouts[] via `acSetTimeout`/`acClearTimeout` (audio-clock-synced, not real `setTimeout` — must stay manual) | demos.spec.ts smoke only (`examples/timing`) | useSound/useOscillator called repeatedly (ephemeral, same churn pattern); `getAudioContext` + `audioContextAwareTimeout` have no composable wrapper → gap | Needs the raw `AudioContext` object for `playAt()` and the audio-clock timer utility — `useAudioContext()` only exposes `{ready, init}`. This AudioContext-object gap recurs in DistortionDemo, VisualizationDemo, TransportSequencerDemo — worth fixing once centrally. |
| TrackDemo.vue | Yes | `createTrack` | `loadTrack()` guard on `loaded` ref, module `track` | track (1) | Cancels RAF, stops track | animationFrame (RAF position-update loop) | interactions.spec.ts "Basic Playback page interactions" (shared w/ AudioDemo) + demos.spec.ts | useTrack, useCleanup | Clean, single instance — matches its early plan position (#3) well. |
| TransportSequencerDemo.vue | Yes | `createTransport`, `createBeatTrack` ×3, `createOscillator`, `createFont`, `createSequence` ×2, `getAudioContext` | `ensureLoaded()` guard, module `lib` + many module-level instance vars | transport (1), kickTrack/snareTrack/hihatTrack (3 BeatTrack, synced to transport), bassOsc (1), pianoFont (1), bassSeq/pianoSeq (2 Sequence) | Yes — disposes transport, 3 beatTracks, 2 sequences; stops bassOsc; nulls pianoFont (no dispose call — Font may not expose one, same shape as SoundfontPiano) | none (the `transport.on('tick', ...)` listener lives on the transport instance itself and is presumably torn down by `transport.dispose()`) | interactions.spec.ts "TransportSequencer page interactions" + demos.spec.ts — good coverage | useTransport, useBeatTrack ×3, useOscillator, useCleanup; `createFont` + `createSequence` (×2) have no composables → confirmed gaps | **Most complex demo** — 8 distinct library instances across 2 gap-blocked factories, plus needs raw `AudioContext`. Correctly ordered last (#22). Exercises 2 of the 5 "known missing" composables plus transport/sequence wiring with no precedent elsewhere. |
| VisualizationDemo.vue | Yes | `createOscillator`, `createAnalyzer` (audioContext-first overload: `createAnalyzer(ctx, opts)`), `getAudioContext` | Inline `await import('ez-web-audio')` per `startVisualization()` call, no module-level `lib` | oscillator (1), analyzer (1, requires explicit ctx) | `stopVisualization()` — stops oscillator, cancels RAF, nulls analyzer (no dispose call) | animationFrameId (RAF canvas draw loop), window resize listener | demos.spec.ts smoke only (`examples/visualization`) | useOscillator; `createAnalyzer` has no composable → **newly discovered gap, not in the task's "known missing" list** | Also needs raw `AudioContext` (compounds the recurring gap). The audioContext-first `createAnalyzer(ctx, options)` signature is a two-step call that doesn't fit the simple `(...args) => Promise<T>` factory-composable pattern as cleanly as the others. |
| XYPad.vue | **Yes — contradicts task assumption** | `createOscillator` | `initIfNeeded()` guard, module `lib` | oscillator (1, recreated on every `startPlaying()` — every mousedown/touchstart/arrow-key-press) | Removes document mouseup listener, calls `stopPlaying()` | document mouseup listener (global drag-release catch); canvas drawing is synchronous, no RAF | demos.spec.ts smoke only (`examples/xy-pad`) | useOscillator, useCleanup | **See Exclusions — this component was wrongly assumed to be UI-only.** It directly imports `ez-web-audio` and drives an Oscillator on every interaction. It is entirely **missing from `73-01-PLAN.md`'s task table** (rows 1–22 never mention it) — needs its own task. |

## Exclusions

Per the phase-73 escalation rule, three demos were expected to be excluded.
Verified by reading each file directly:

- **`DrumMachineVanilla.vue`** — Confirmed genuinely vanilla-pattern. It
  explicitly avoids `wrapWith`/reactive (code comment: *"NO wrapWith
  option — we use event listeners for playhead sync"*) and drives its
  playhead via `rootEl.value.querySelectorAll(...)` direct DOM manipulation
  (comment: *"Direct DOM manipulation for playhead — NOT Vue reactivity"*),
  listening to `kickTrack.on('beat', beatHandler)`. Refactoring this onto
  composables would defeat its stated purpose of demoing the vanilla-TS
  event API. **Exclude — confirmed.** (Note: it does still create 3
  `BeatTrack` instances via `createBeatTrack` — it's audio-using, just
  intentionally not composable-based.)
- **`LlmsFooter.vue`** — Confirmed no `ez-web-audio` import. Pure static
  markup (two links to `/llms.txt` / `/llms-full.txt`). **Exclude —
  confirmed.**
- **`PianoKeyboard.vue`** — Confirmed no `ez-web-audio` import. Pure
  presentational keyboard component; emits `noteOn`/`noteOff` events that
  parent demos (SoundfontPiano, SynthKeyboard, PolySynthDemo) consume to
  drive their own audio calls. **Exclude — confirmed.**

### Exclusion assumption that does NOT hold

- **`XYPad.vue`** — The task listed this as "expected non-audio/UI-only;
  confirm no `ez-web-audio` import and exclude." That assumption is
  **incorrect**. `XYPad.vue` line 2 imports `type { Oscillator } from
  'ez-web-audio'`, and `startPlaying()`/`initIfNeeded()` call
  `lib.createOscillator(...)` directly, driving pitch/gain in real time via
  `oscillator.update(...)` on every pointer/keyboard move. **This component
  must be INCLUDED in the refactor**, not excluded. It is also completely
  absent from `73-01-PLAN.md`'s task table (rows 1–22) — the plan itself
  needs a new task added for it (see Refactor order confidence below).

No other component turned out to be non-audio; all remaining 24 files
import from `ez-web-audio` and create at least one library instance.

**Count: 27 total components. 25 use `ez-web-audio`. 2 are non-audio
(`LlmsFooter.vue`, `PianoKeyboard.vue`) and correctly excluded. Of the 25
audio-using components, 1 (`DrumMachineVanilla.vue`) is excluded by design
intent, leaving 24 components in scope for the composable refactor** — one
more than the 23 the plan's task table currently accounts for (22 tasks ×
~1 component each, with task 17 covering 2 components), because `XYPad.vue`
was missed.

## API gaps for packages/vue

### Known-missing composables (from task prompt) — confirmed usage

| Factory | Used by | Status |
|---|---|---|
| `createFont` | SoundfontPiano.vue, TransportSequencerDemo.vue | Confirmed blocker for 2 demos |
| `createSequence` | TransportSequencerDemo.vue (×2 instances: bassSeq, pianoSeq) | Confirmed blocker |
| `createWhiteNoise` | FilterDemo.vue, AmbientGenerator.vue, SynthDrumKit.vue | Confirmed blocker for 3 demos |
| `createSounds` (plural/batch) | **Not actually called by any demo** — components that load multiple sounds (PlayTogetherDemo, LayeredSoundDemo, SynthDrumKit) all use `Promise.all(urls.map(u => createSound(u)))` manually instead | Not a blocker today, but adding it would let those demos simplify |
| `createTracks` (plural/batch) | **Not actually called by any demo** — CrossfadeDemo creates 2 tracks via `Promise.all` of individual `createTrack` calls | Not a blocker today |

### Additional gaps discovered during inventory (not in the original "known missing" list)

| Factory/utility | Used by | Notes |
|---|---|---|
| `createLayeredSound` | LayeredSoundDemo.vue, SynthDrumKit.vue (×2 usages) | Blocks 2 demos |
| `createFilterEffect` | FilterDemo.vue, LFODemo.vue, AmbientGenerator.vue, SynthDrumKit.vue | Effect attaches via `.addEffect()`, dies with its source — may not need its own composable, just direct import, but currently has zero composable wrapper of any kind |
| `createAnalyzer` | VisualizationDemo.vue | Two-step (needs ctx first via `getAudioContext`) — doesn't fit the simple factory pattern cleanly |
| `createDelay` / `createReverb` / `createCompressor` / `createEQ` | EffectsChainDemo.vue | 4 effect factories, all missing — the single biggest gap cluster, concentrated in the hardest demo |
| `createSprite` | AudioSpriteDemo.vue | Blocks 1 demo (also zero E2E coverage) |
| `wrapEffect` | DistortionDemo.vue | Wraps a raw custom `WaveShaperNode`; needs raw ctx too |
| `crossfade` (utility fn) | CrossfadeDemo.vue | Not a factory — a plain async utility; no composable needed, just direct import, but worth confirming the demo can still call it after the refactor |
| `playTogether` (utility fn) | PlayTogetherDemo.vue | Same as above |
| `audioContextAwareTimeout` (utility fn) | TimingDemo.vue | Same as above |
| `getAudioContext` (raw `AudioContext` object) | DistortionDemo.vue, TimingDemo.vue, VisualizationDemo.vue, TransportSequencerDemo.vue | **Recurring gap across 4 demos.** `useAudioContext()` only returns `{ready, init}` — never the context object itself. Worth adding an `audioContext` ref (or a `getContext()` method) to `useAudioContext()`'s return shape once, rather than 4 separate workarounds. |
| `frequencyMap` (data export) | SynthKeyboard.vue, PolySynthDemo.vue (via `lib.frequencyMap`) | Trivial — plain object, not a factory. Just import directly from `'ez-web-audio'`, no composable needed. |

### Structural gap: "recreate mid-life" pattern

Beyond missing factories, `createFactoryComposable`'s `load()` memoizes
permanently after the first successful call (`packages/vue/src/create-factory-composable.ts:21`
— `if (instance.value) return Promise.resolve(instance.value)`). Several
demos dispose-and-recreate their primary instance repeatedly during the
component's lifetime, which this model does not support:

- **PolySynthDemo.vue** — `recreateSynth()` on every structural param change
- **FilterDemo.vue** / **EffectsChainDemo.vue** — source-type swap (oscillator ↔ noise/track)
- **SynthDrumKit.vue** / **SynthKeyboard.vue** — many concurrent short-lived instances (Map- or array-tracked), not a single memoized one
- **XYPad.vue** — new oscillator per interaction
- **OscillatorDemo.vue** — recreated on waveform change (smaller-scale version of the same issue)

This affects 6 of the 24 in-scope demos. It is a `packages/vue` API design
question, not just a missing factory — options include adding a `reset()`
to `UseFactoryReturn`, or codifying "raw `createX()` call +
`cleanup.register()`" as the sanctioned escape hatch for these cases.
Per the phase's escalation rule, whichever approach is chosen should be
implemented with a unit test in `packages/vue` rather than left as bespoke
per-demo plumbing.

## Refactor order confidence

The plan's "simple → complex" ordering holds well for demos that create
**one instance, once** (OscillatorDemo, AudioDemo, TrackDemo, LFODemo,
AmbientGenerator, DrumMachine/DrumMachineVue). It underestimates two
complexity dimensions it didn't explicitly track:

1. **Missing composables for non-core factories** (white noise, layered
   sound, filter/delay/reverb/compressor/EQ effects, analyzer, sprite,
   font, sequence, plus the AudioContext-object and utility-function gaps
   above).
2. **The "recreate mid-life" pattern** (see above) that 6 demos hit.

Specific recommendations:

- **Solve the recreate-mid-life pattern before task 6 (FilterDemo).**
  6 of the 22 listed tasks (FilterDemo, PolySynthDemo, EffectsChainDemo,
  SynthDrumKit, SynthKeyboard, plus the missing XYPad task) need it. Doing
  PolySynthDemo (currently #19) early, as the reference implementation for
  this pattern, would de-risk the others rather than discovering the gap
  mid-sequence at task 6.
- **`XYPad.vue` is missing from the plan entirely.** Add it as a new task —
  it's single-instance/recreate-per-interaction, similar difficulty class
  to OscillatorDemo/DistortionDemo. Suggest inserting it early (e.g. right
  after OscillatorDemo) since it shares that demo's exact recreate-on-change
  pattern.
- **SynthDrumKit.vue (#12) and SynthKeyboard.vue (#13) are harder than their
  plan position suggests.** Both have the highest instance-churn of any
  demo (new library objects created on every interaction, tracked in an
  array/Map rather than a single ref) — conceptually closer in difficulty
  to PolySynthDemo/EffectsChainDemo (#19/#21) than to their neighbors.
  Consider resequencing them alongside PolySynthDemo.
- **Four demos have zero E2E coverage at all**, not even a `demos.spec.ts`
  page-load smoke test: `PlayTogetherDemo.vue` and `LayeredSoundDemo.vue`
  (share the uncovered `examples/layered-sound` page), `CrossfadeDemo.vue`
  (`examples/crossfade`), and `AudioSpriteDemo.vue` (`examples/audio-sprite`).
  The playbook's premise that "E2E suite is the referee" is weaker for
  these 4 tasks (#4, #5, #7, #9) — there's no automated regression signal
  if the refactor subtly breaks play/stop behavior. Recommend either manual
  verification during those tasks or adding smoke-test coverage for these
  3 pages before/during their refactor.
- **TimingDemo.vue (#8), DistortionDemo.vue (#14), and
  VisualizationDemo.vue (#15)** all independently need raw `AudioContext`
  access that `useAudioContext()` doesn't provide today — worth fixing once
  centrally (see API gaps) rather than 3 separate workarounds; whichever
  demo is tackled first among these three should add the fix.
- **EffectsChainDemo.vue (#21) and TransportSequencerDemo.vue (#22)** are
  correctly ordered last — they are the two hardest demos, combining the
  recreate-mid-life problem (EffectsChainDemo) or the largest gap cluster
  (TransportSequencerDemo: `createFont` + `createSequence` ×2 + raw
  AudioContext) with the highest instance counts in the set.

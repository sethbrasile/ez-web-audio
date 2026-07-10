# 73-01 Summary — Refactor All Docs Demos onto @ez-web-audio/vue

**Status:** COMPLETE (2026-07-10). Exit gate green: typecheck ✓, lint ✓ (0 errors, 5 pre-existing jsdoc/README warnings), unit tests 1921 core + 31 vue ✓, build ✓, E2E 55/55 ✓.

## What was built

Every audio-using docs demo now gets its library instances + cleanup from `@ez-web-audio/vue` (or, where a composable doesn't fit, from static `ez-web-audio` factory imports + explicit lifecycle management). Zero bespoke `let lib: any` / `await import('ez-web-audio')` / `(x as any)` plumbing remains in demo components (except `DrumMachineVanilla.vue`, excluded by design).

### Task A — library hardening (foundation, committed first)

Before touching demos, hardened `packages/vue` (commit `bbcd42c`). Each addition unit-tested (vue suite 25→31 tests):

- **`reset()` on `createFactoryComposable`** — nulls the memoized `instance`/`error`/`pending` so a demo can dispose-and-recreate a single instance mid-life. Enables the recreate-per-play / recreate-on-param-change demos (OscillatorDemo, XYPad, PolySynthDemo, LFODemo, AmbientGenerator, DistortionDemo, VisualizationDemo).
- **`getContext()` on `useAudioContext`** — returns the raw shared `AudioContext` (was `{ ready, init }` only). Used by DistortionDemo, TimingDemo, TransportSequencerDemo.
- **Six new composables**: `useWhiteNoise`, `useLayeredSound`, `useSprite`, `useFont`, `useAnalyzer`, `useSequence` (the last wraps the synchronous core `createSequence(transport, options)`).
- **Escape-hatch comment** in `composables.ts`: for many-concurrent/ephemeral instances, call raw `createX()` + `useCleanup().register()` rather than a single-instance composable.

### Core change (Task 20, GrainPlayerDemo)

- **`Sound.audioBuffer` is now `public readonly`** (was `private`) — kills the `(sound as any).audioBuffer` cast and aligns with the `createGrainPlayer` docstring which already reads `sound.audioBuffer`. Core suite 1920→1921. Commit `72dfc85`.

### 24 demo components refactored (1 commit each)

Composable demos (single-instance, memoized + `useCleanup`): OscillatorDemo, AudioDemo, TrackDemo, PolySynthDemo, XYPad, SampledDrumKit, SoundfontPiano, LFODemo, GrainPlayerDemo, DrumMachine, DrumMachineVue, AmbientGenerator, LayeredSoundDemo, CrossfadeDemo, AudioSpriteDemo, DistortionDemo, VisualizationDemo, TransportSequencerDemo.

Escape-hatch demos (static factory imports + explicit lifecycle, no composable — churn or type-swap): FilterDemo, PlayTogetherDemo, TimingDemo, SynthKeyboard, SynthDrumKit, EffectsChainDemo.

Excluded: **DrumMachineVanilla** (intentional vanilla-TS event-API showcase; top-of-file comment added). Non-audio (never in scope): LlmsFooter, PianoKeyboard.

## API hardening beyond the plan

- Plan listed `useSound ×3 (loop)` / `useBeatTrack ×3 (loop)` — composables cannot be called in a runtime loop, so loop creations were **unrolled to N static composable calls** (DrumMachine/DrumMachineVue: 3 `useBeatTrack()`; Crossfade: 2 `useTrack()`) or moved to the **static-import escape hatch** (LayeredSound/PlayTogether: `Promise.all(map(createSound))` + `cleanup.register`).
- `wrapWith` dropped from DrumMachine/DrumMachineVue — `useBeatTrack` bakes `wrapWith: reactive` in.
- VisualizationDemo dropped its explicit `getAudioContext()` call: `useAnalyzer().load({fftSize})` uses the same singleton context the oscillator uses, so `oscillator.setAnalyzer(analyzer)` still works.

## Deviations

- **DistortionDemo**: added a null-guard before `oscillator.value.removeEffect(effect)` — required once `effect` is typed `EffectWrapper | null` (was `any`). Behavior identical.
- **EffectsChainDemo**: the core `Effect` interface does not declare `dispose()` (it's per-concrete-subclass). Replaced `(effect as any).dispose()` with a precise local `interface Disposable { dispose?: () => void }` cast. **Minor library-gap candidate**: `Effect` could declare optional `dispose()`. Not fixed (out of this file's scope); noted here.
- **XYPad** was missing from the plan's task table (found in Task 0 inventory); added and refactored.
- **SynthKeyboard / SynthDrumKit**: kept their bounded manual voice-teardown (`Map` / `activeOscillators[]`) rather than `useCleanup`, because `useCleanup` has no `unregister` and would accumulate every ephemeral voice for the component's life. Only the dynamic import → static import was changed. See `M8-QUESTIONS.md` (useCleanup-unregister gap logged as a pre-1.0 library-enhancement candidate).
- **4 zero-E2E demos** (LayeredSound, PlayTogether, Crossfade, AudioSprite): verified via a scratch Playwright smoke (load page + click audio controls, assert no library/pageerror console errors) since the suite has no coverage for their pages. Only benign VitePress code-copy clipboard-permission errors appeared. No new E2E specs added (scope call flagged in M8-QUESTIONS; not expanded).

## Test counts

- Core unit: **1921** (+1: Sound.audioBuffer accessor).
- Vue unit: **31** (+6: reset ×2, getContext, six-composable load paths ×… consolidated).
- E2E: **55/55** green after every demo commit.

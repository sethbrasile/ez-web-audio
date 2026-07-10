# M8 Questions — judgment calls for Seth's review at human gates

Per playbook: each entry = question, recommendation, what was done (recommendation taken unless noted).

## 2026-07-09 · 72-01 · Restored features silently dropped by deep-review commit

**Found:** b0dee2f ("apply all 55 deep review findings", 2026-03-19) rewrote EffectsChainDemo and dropped the EQ effect (4→3 slots), the oscillator/file source switching, and GrainPlayerDemo's `loaded` waveform class — none mentioned in the commit message, and the e2e tests that covered them were left failing. CI on main has been red since 2026-03-01, so nothing caught it.

**Question:** Were EQ + source switching intentionally cut?
**Recommendation:** Treat as accidental scope loss — phase 69 docs/spec define the 4-effect chain + source switch as the demo's contract.
**Done:** Restored both against the current (improved) component architecture; default chain back to documented EQ → Compressor → Delay → Reverb. E2E green. **Not ear-checked** — headless verification only. Listen at human gate 2 (EQ band gains audible; oscillator↔file switch behavior).

## 2026-07-09 · 72-01 · E2E selector contract updates

Deep-review markup changes were kept where deliberate improvements (reorder buttons labeled "earlier/later" not "up/down", bypassed flow-nodes dimmed instead of removed, bypass button `aria-pressed` = bypassed). Tests updated to that contract rather than reverting the markup. Sign-off note per 72-01 E2E rule: assertion changes limited to those inversions + relative-path fixes in navigation.spec.ts.

## 2026-07-09 · 72-01 · Repo hygiene done early

Lint debt (44 real errors + ~1400 phantom errors from a stale `.claude/worktrees/` copy eslint was crawling) fixed in 72-01 rather than waiting for 78-01's hygiene task: exit gate requires green and CI/docs-deploy on main have been failing on the Lint step since March. `.claude/` now git-ignored and eslint-ignored. **Heads-up: the docs site on Pages hasn't deployed since 2026-03-01** — next push to main redeploys it (with M7 demos + these fixes).

## 2026-07-09 · 72-01 · Phantom @dotenvx/dotenvx import removed

`typedoc.config.mjs` imported `@dotenvx/dotenvx` (removed from deps in 17-01 as "confirmed unused") — survived only via hoisting, broke under workspace install. Import deleted; `VITE_DOCS_URL`/`hostedBaseUrl` still honored if set in the environment. CI never set it (`.env.ci` is empty), so no CI behavior change.

## 2026-07-09 · 73 Task 0 · Inventory found plan gaps (before any refactor)

Recon over all 27 demo components (`73-INVENTORY.md`) surfaced four things the 73-01 plan doesn't account for. Recommendations logged; nothing refactored yet — these shape how 73's remaining tasks run.

1. **XYPad.vue is audio + missing from the plan.** It drives a live `createOscillator()` on every pointer/keyboard move but isn't in 73-01's 22-task table. **Rec:** add it as a task (complex — recreate-mid-life pattern, see #3).
2. **Four in-scope demos have ZERO E2E coverage:** PlayTogetherDemo, LayeredSoundDemo, CrossfadeDemo, AudioSpriteDemo. The plan's "E2E suite is the referee" safety net doesn't exist for them. **Rec:** add smoke E2E specs for these before/as-part-of their refactor tasks, or accept manual verification and say so per-task. Needs-Seth if adding tests expands scope.
3. **`createFactoryComposable.load()` memoizes permanently — 6 demos need dispose-and-recreate or many concurrent instances** (PolySynthDemo, FilterDemo, EffectsChainDemo, SynthDrumKit, SynthKeyboard, XYPad). Current composable can't express that. **Rec (library-fidelity):** this is a real `packages/vue` API gap, not a demo problem — harden the composable (e.g. a `reload()`/`reset()` or a per-call instance mode) with unit tests, per 73's escalation rule. Solve it EARLY (first affected demo) rather than discovering it at task 6.
4. **API gaps wider than the known 5.** Besides createFont/createSequence/createSounds/createTracks/createWhiteNoise, demos also use createLayeredSound, createAnalyzer, createSprite, the 4 effect factories (createDelay/Reverb/Compressor/EQ), and raw `AudioContext` access that `useAudioContext()` doesn't expose (4 demos). **Rec:** add composables as demos demand them (escalation rule), not speculatively; but budget for it — this is more than a mechanical refactor.

**Net:** 24 in-scope components (25 audio, minus DrumMachineVanilla by design; LlmsFooter + PianoKeyboard non-audio). Phase 73 is more than mechanical plumbing swaps — it will harden `packages/vue`. That's the intended direction (demos as the binding's test), but it means 73 ≈ real library work, not a quick pass.

## 2026-07-10 · 73 · API-hardening decision (foundation before demo refactors)

Resolving inventory findings #3/#4 into a concrete `packages/vue` hardening plan, done as **73-01 Task A (foundation)** before the mechanical demo tasks, per the inventory's "solve recreate-mid-life early" recommendation. Each item ships with a unit test.

**Decisions (recommendation taken, executing):**

1. **`reset()` added to `createFactoryComposable`** — clears `instance.value` + `pending` so the next `load()` builds fresh. This is the sanctioned answer to the recreate-single-instance demos (OscillatorDemo waveform change, FilterDemo/EffectsChainDemo source swap, PolySynthDemo `recreateSynth`, XYPad per-interaction). Keeps the composable idiom; no `reload` overload needed.
2. **`useAudioContext()` gains `getContext(): Promise<AudioContext>`** (wraps core `getAudioContext()`) — the raw-context gap hitting Distortion/Timing/Visualization/TransportSequencer. `{ ready, init }` unchanged; additive.
3. **Six new composables** for primary instances a demo holds+disposes: `useFont`, `useSequence` (sync core fn → async wrapper; load takes `(transport, options)`), `useWhiteNoise`, `useLayeredSound`, `useSprite`, `useAnalyzer` (ctx-first overload). Exported from index, each unit-tested.
4. **Effects + utilities get NO composable — by design.** `createFilterEffect`, `createDelay/Reverb/Compressor/EQ`, `wrapEffect` attach to a source and die with it → demos import them directly and `cleanup.register()` any disposable. `crossfade`, `playTogether`, `audioContextAwareTimeout`, `frequencyMap` are plain fns/data → direct import. Composables are reserved for lifecycle-managed *instances*, keeping the binding surface honest.
5. **Many-concurrent-instance churn** (SynthKeyboard, SynthDrumKit, TimingDemo ephemeral hits) → sanctioned escape hatch: raw `createX()` + `cleanup.register()` per instance. This is the intended pattern for ephemeral objects, not bespoke plumbing the rule forbids — documented in a composables.ts comment.
6. **XYPad added as a task** (inventory #1). **4 zero-E2E demos** (PlayTogether, LayeredSound, Crossfade, AudioSprite): refactor with manual/headless verification noted per-task; NOT expanding E2E scope here (that's a separate call for Seth) — flagged, proceeding without new specs.

**Net:** Task A hardens the library; Tasks 1–24 then become near-mechanical contract-applications. Resequenced so PolySynthDemo (recreate-mid-life reference) runs right after the trivial single-instance demos, ahead of the other recreate cases.

## 2026-07-10 · 73 · useCleanup has no `unregister` → high-churn demos keep manual teardown

**Found:** SynthKeyboard (a `Map<note, Oscillator>`, one voice per held key) and SynthDrumKit (an `activeOscillators[]` of per-hit voices that self-remove after decay) create/destroy many short-lived instances continuously. `useCleanup().register()` only accumulates into a Set with no `unregister`, so registering every voice would grow that Set unboundedly for the component's life (each key-press / drum-hit adds a permanently-retained reference, only freed at unmount).

**Recommendation/Done:** Left both demos with their existing **bounded manual teardown** (Map / array holding only currently-sounding voices, stopped in `onUnmounted`) and only converted the `await import('ez-web-audio')` init plumbing to STATIC `createOscillator`/`createWhiteNoise`/`createFilterEffect`/`createLayeredSound` + `frequencyMap` imports (kills the dynamic-import + `any`, satisfies the sweep). These two do NOT use `useCleanup` — their own lifecycle management is more correct for continuous churn. This is the documented "raw createX for ephemeral churn" escape hatch, minus the `.register()` call which doesn't fit here.

**Library gap surfaced (pre-1.0 candidate, not blocking):** `useCleanup` could gain an `unregister(inst)` (or `register` could return a disposer handle) so churn-heavy consumers can hand voice lifecycle to the binding without leaking. Logging per library-fidelity rule; no code change made to `packages/vue` now.

## 2026-07-09 · 77 · React doc examples are illustrative, not real (Seth flagged)

`docs/examples/react-integration.md` shows hand-rolled React (`useRef`/`useEffect` over raw `ez-web-audio`) as "how you'd implement this concept in React" — no package involved. After Phase 77 ships `@ez-web-audio/react`, these must be shored up to match the real hooks. React's paradigm differs from Vue's (refs not reactive state; `wrapWith`/BeatTrack reactivity handled very differently), so don't mirror the Vue guide 1:1. Noted directly in 77-01-PLAN.md Task 5 (also corrected the path there: file is under `docs/examples/`, plan said `docs/guide/`).

# 72-02 Summary: @ez-web-audio/vue Composables

**Completed:** 2026-07-09 (orchestrator: Fable; implementers: Sonnet ×2, TDD red-then-green throughout)

**Goal achieved:** `@ez-web-audio/vue@0.2.0` builds (Vite lib, ESM + rolled-up d.ts), 22 unit tests, zero runtime deps (peers: `ez-web-audio`, `vue ^3.4`). SSR-safe: no AudioContext access until `load()`/`init()`.

## Composable inventory (the contract Phases 73/76/77 consume)

Uniform shape: `{ instance: ShallowRef<T | null>, loading: Ref<boolean>, error: Ref<Error | null>, load(...args): Promise<T> }`. Single-flight `load()` (concurrent calls share one factory invocation), instance cached, error captured + rethrown, retry after failure.

- `useSound(input)` · `useTrack(input)` · `useOscillator(options?)` · `useSampler(inputs, opts?)` · `usePolySynth(options?)` · `useGrainPlayer(buffer, options?)` · `useLFO(options?)` (core factory is sync — wrapped async) · `useTransport(options)` · `useBeatTrack(inputs, opts?)`
- `useBeatTrack` injects `wrapWith: reactive` by default (Beat state reactive in templates); explicit caller `wrapWith` wins.
- `useAudioContext(): { ready: Ref<boolean>, init(): Promise<void> }` — lazy-imports `initAudio`.
- `useCleanup(): { register<T>(d): T, disposeAll() }` — `stop()` then `dispose()` on unmount, throw-safe per object.
- `createFactoryComposable` + types `UseFactoryReturn`, `Disposable` exported for custom factories.

## Commits

- `13dbd85` feat(vue): package scaffolding + useCleanup composable
- `5c01676` feat(vue): createFactoryComposable generic
- `55a2444` feat(vue): factory composables, useAudioContext, useBeatTrack
- (this commit) README usage + root workspace dependency + summary

## Deviations / notes for downstream phases

- **Overload narrowing:** wrappers type against the no-context overload only (e.g. `useSound(input)`, not `useSound(ctx, input)`). Docs demos never pass a context; if the multiple-audiocontext spec lands, add ctx-carrying variants then.
- **`wrapWith: reactive` cast:** `reactive()` returns `Reactive<T>` which can't preserve `Beat`'s private fields, so `reactive as unknown as (beat: Beat) => Beat` with an explanatory comment. Runtime-identical.
- `vite.config.ts` sets `build.lib.fileName: 'index.js'` — Vite otherwise derives `vue.js` from the scoped package name, breaking the exports map.
- Core factories NOT wrapped (not used by demos as composables today): `createFont`, `createSequence`, `createSounds`, `createTracks`, `createWhiteNoise`, `createNotes`. Phase 73 should shout if it needs one.

## Test counts

22 vue unit tests (4 files) · core 1920 unchanged · exit gate green (typecheck, lint, unit, build, 55 E2E).

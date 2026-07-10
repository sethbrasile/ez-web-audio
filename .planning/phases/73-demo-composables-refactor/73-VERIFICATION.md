# Phase 73 Verification — Demo Composables Refactor

**Verdict: PASS** (goal-backward, 2026-07-10)

**Phase goal:** Every audio-using docs demo uses `@ez-web-audio/vue` composables (or the sanctioned static-import escape hatch) for init and cleanup, with zero behavior change, eliminating the per-demo `let lib: any`/`await import`/`onUnmounted` disposal boilerplate that produced the 2026-03-19 deep-review leak findings.

## Success criteria → evidence

1. **Demos no longer hand-roll init plumbing.**
   `grep -rn "await import('ez-web-audio')" docs/.vitepress/theme/components/` → **only `DrumMachineVanilla.vue`** (excluded by design, with an explanatory top-of-file comment). All 24 in-scope demos import statically or via composables.

2. **No library-type `as any` casts remain.**
   `grep -rn "as any" docs/.vitepress/theme/components/` → **zero matches**. The two known offenders — `(sound as any).audioBuffer` (GrainPlayerDemo) and `(effect as any).dispose()` (EffectsChainDemo) — are gone: the former via a new `public readonly Sound.audioBuffer`, the latter via a precise local `Disposable` cast.

3. **Cleanup is centralized in the binding (leak findings addressed).**
   Single-instance demos register instances with `useCleanup()`, whose internal `onUnmounted` runs `stop?.()`+`dispose?.()` — replacing the ad-hoc per-demo disposal the deep review flagged. Churn demos keep bounded explicit teardown (documented rationale + `useCleanup.unregister` gap logged).

4. **Zero behavior change.**
   Full E2E suite **55/55 green after every single demo commit** and at the phase exit gate. The complex TransportSequencer path is exercised by "Step grid playhead advances after transport starts" ✓. The 4 pages with no E2E coverage were smoke-verified in a real browser (no library errors).

5. **Library hardened as the demos demanded (escalation rule).**
   `packages/vue` gained `reset()`, `useAudioContext().getContext()`, and 6 composables (`useWhiteNoise/useLayeredSound/useSprite/useFont/useAnalyzer/useSequence`), each unit-tested (vue suite 25→31). `packages/core` exposed `Sound.audioBuffer` (core suite 1920→1921). The demos genuinely exercised the binding rather than bypassing it (library-fidelity rule).

## Exit gate

`pnpm typecheck` ✓ · `pnpm lint` ✓ (0 errors; 5 pre-existing jsdoc/README warnings, untouched files) · `pnpm test` ✓ (1921 core + 31 vue) · `pnpm build` ✓ · `pnpm test:e2e` ✓ (55/55).

## Follow-ups (non-blocking, logged in M8-QUESTIONS.md)

- `useCleanup` has no `unregister` → churn demos can't hand voice lifecycle to the binding (pre-1.0 enhancement candidate).
- Core `Effect` interface could declare optional `dispose()` (EffectsChainDemo used a local cast).
- 4 demo pages still have no E2E coverage (LayeredSound, PlayTogether, Crossfade, AudioSprite) — smoke-verified manually; adding specs deferred as a scope call for Seth.

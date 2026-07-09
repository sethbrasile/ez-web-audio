---
phase: 57-polysynth
plan: 02
status: complete
commit: 9517c05
requirements: [SYNTH-01]
files_modified:
  - src/index.ts
---

## What was done

Wired PolySynth into the library's public API with factory function and full type exports.

### Key deliverables

1. **`createPolySynth` factory function** — follows the same `initAudio()` + `getOrCreateAudioContext()` pattern as `createOscillator`:
   ```typescript
   export async function createPolySynth(options?: PolySynthOptions): Promise<PolySynth>
   ```

2. **Value exports** added to `export {}` block:
   - `PolySynth` — the class itself
   - `VoiceHandle` — per-voice control handle

3. **Type exports** added:
   - `PolySynthOptions`, `PlayOptions`, `StealStrategy` — configuration types
   - `PolySynthEventMap`, `VoiceStolenEventDetail` — event types

4. **Bonus**: Fixed pre-existing import/export sort order violations in `src/index.ts` that were flagged by the `perfectionist` lint plugin.

### Verification

- `pnpm typecheck` — clean
- `pnpm lint` — no errors in `src/index.ts`
- `pnpm build:lib` — library builds successfully with new exports
- `pnpm test src/poly-synth.test.ts` — 55/55 pass

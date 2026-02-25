---
phase: 32-critical-fixes-api-contracts
plan: 02
status: complete
date: 2026-02-22
---

## Summary

Renamed EnvelopeOptions from verbose names to standard short ADSR names, and added GainNode replacement warning to Oscillator.setup().

### Property renames

| Old Name | New Name |
|----------|----------|
| `attackTime` | `attack` |
| `decayTime` | `decay` |
| `sustainLevel` | `sustain` |
| `releaseTime` | `release` |

### Method rename

The `Envelope.release()` method was renamed to `Envelope.triggerRelease()` to avoid a name collision with the new `release` property. All callers updated:
- `OscillatorController.triggerRelease()` internal call
- All test files
- Documentation examples in `docs/guide/concepts.md`

### Files modified

- `src/envelope.ts` -- Interface, class properties, constructor, internal references, JSDoc
- `src/envelope.test.ts` -- All property and method references
- `src/oscillator.ts` -- `this.envelope.release` property access, GainNode warning JSDoc on `setup()`
- `src/oscillator.test.ts` -- All envelope option references
- `src/controllers/oscillator-controller.ts` -- `envelope.triggerRelease()` call
- `src/controllers/oscillator-controller.test.ts` -- Envelope option references and spy target
- `docs/guide/concepts.md` -- Envelope constructor example and options table

## Verification

- `pnpm typecheck` passes
- `pnpm test` passes (1038 tests, 0 failures)
- No stale `attackTime`/`decayTime`/`sustainLevel`/`releaseTime` property references in src/ or docs/

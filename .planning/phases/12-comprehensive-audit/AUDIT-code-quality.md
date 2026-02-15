# Code Quality & Dead Code Audit

**Date:** 2026-02-15
**Phase:** 12 Comprehensive Audit
**Plan:** 12-01
**Scope:** All library source files (~40 files in src/, excluding tests and src/app/)

---

## Executive Summary

Audit of all library source code for consistency, readability, pattern adherence, dead code, unused exports, and WeakMap holdovers. Overall the codebase is in excellent condition with strong consistency and adherence to established patterns.

**Key Findings:**
- ✅ No WeakMap holdovers found (BeatTrack fix was successful)
- ✅ Naming and code style highly consistent across all files
- ✅ All classes follow documented patterns (mixin, controller, fluent API, connection chain)
- ⚠️ 3 TODO comments indicating minor technical debt
- ⚠️ 1 commented-out line (touchcancel event listener)
- ⚠️ Some parameter/variable type inconsistencies (minor)

---

## Code Quality Findings (QUAL-01)

### Naming Consistency

| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| src/controllers/base-param-controller.ts | 39-47 | Interface `AudioSource` with minimal typing | Add JSDoc explaining this is a minimal duck-type interface for AudioBufferSourceNode/OscillatorNode, or use a union type |
| src/index.ts | 166 | Parameter `json` typed as `any` | Type as `Record<string, number>` or create FrequencyMap type alias |
| src/index.ts | 493 | Parameter `props` typed as `any` | Type as `AudioBuffer` or create specific type |
| src/musical-identity.ts | 51-54 | Constructor uses `...args: any[]` | Document why this is necessary for mixin pattern (it's correct, just add JSDoc) |

**Overall: EXCELLENT.** Naming is highly consistent across all files. Variables, methods, and parameters follow the same conventions. Minor typing improvements possible but not critical.

---

### Code Style Consistency

| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| src/base-sound.ts | 226-267 | Deeply nested try/catch blocks in `wireEffectChain()` (4 separate try/catch) | Extract to helper method `safeDisconnect(node: AudioNode)` to reduce nesting |
| src/oscillator.ts | 153-154 | Comment about unused oscillator is confusing | Clarify comment: "Placeholder oscillator created here. A fresh oscillator is created on each play() in setup()" |
| src/index.ts | 641 | Commented-out `touchcancel` event listener | Either enable it with explanation or remove entirely |

**Overall: EXCELLENT.** Error handling patterns are consistent (try/catch for disconnect operations). Null checking is consistent. Use of `this` vs local variables is consistent.

---

### Readability

| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| src/base-sound.ts | 223-295 | `wireEffectChain()` method is 73 lines with multiple concerns | Extract helper: `disconnectNode(node)` to reduce repetition and improve clarity |
| src/beat-track.ts | 305-318 | `scheduler()` method has subtle timing logic | Add inline comment explaining lookahead scheduling pattern for maintainability |
| src/musical-identity.ts | 61-64 | Complex conditional warning logic | Extract to `validateNoteIdentifierOptions(opts)` helper |
| src/effect-wrapper.ts | 71-80 | Complex duck-typing logic for external effects | Add JSDoc examples showing what kinds of objects pass each branch |

**Overall: VERY GOOD.** No methods exceed 110 lines. Most are under 50 lines. Nesting depth is generally 2-3 levels. A few areas could benefit from extraction but nothing critical.

---

### Pattern Adherence

| File | Line | Pattern | Adherence | Notes |
|------|------|---------|-----------|-------|
| All sound classes | - | Mixin Pattern | ✅ PASS | `MusicallyAware(Sound)` pattern correctly applied in SampledNote |
| All sound classes | - | Controller Pattern | ✅ PASS | SoundController, OscillatorController correctly manage params |
| All sound classes | - | Fluent API | ✅ PASS | `update().to().from()`, `onPlaySet().to().at()` consistent everywhere |
| All sound classes | - | Connection Chain | ✅ PASS | `source -> [filters/connections] -> effectChainInput -> [effects] -> gain -> panner -> destination` |
| Effects | - | Effect Interface | ✅ PASS | All effects implement `input`, `output`, `bypass`, `mix` |
| BeatTrack | 69-70 | Instance property pattern | ✅ PASS | Uses `_beats` instance property instead of module-level WeakMap |

**Overall: EXCELLENT.** All classes follow documented patterns precisely. No deviations found.

---

### Code Duplication

| Location | Code | Recommendation |
|----------|------|----------------|
| src/effects/gain-effect.ts:94-96<br>src/effects/filter-effect.ts:171-181<br>src/effects/effect-wrapper.ts:137-147 | Equal-power crossfade calculation `angle = mix * 0.5 * Math.PI` | Extract to `src/utils/equal-power-crossfade.ts` helper |
| src/controllers/sound-controller.ts:38-70<br>src/controllers/oscillator-controller.ts:75-108 | `applyRampValues()` logic nearly identical | Extract shared logic to base class or create `applyRampsToParam(param, values, currentTime, rampType)` helper |
| src/base-sound.ts:226-267 | Four identical try/catch blocks for `disconnect()` | Extract to `safeDisconnect(node: AudioNode)` utility |

**Overall: GOOD.** Minimal duplication. The duplication that exists is in low-churn areas (effects, controllers) and could be addressed in a refactoring pass.

---

## Dead Code & Stale Patterns (QUAL-03)

### Unused Exports

Analysis methodology: Checked all exports from `src/index.ts` against internal usage and public API documentation.

| Symbol | Exported From | Used Internally | Public API | Recommendation |
|--------|--------------|-----------------|-----------|----------------|
| `createNotes` | src/index.ts | No | Yes (docs) | **KEEP** - Public API for custom frequency maps |
| `preventEventDefaults` | src/index.ts | No | Yes (docs) | **KEEP** - Public utility for piano keys |
| `useInteractionMethods` | src/index.ts | No | Yes (docs) | **KEEP** - Public utility for UI integration |
| `frequencyMap` | src/utils/frequency-map.ts | Yes (internal) | Yes (exported) | **KEEP** - Useful for advanced users |
| `responseCache` | src/preload.ts | Yes (internal) | Yes (exported) | **KEEP** - Intentionally public for cache inspection |

**Result: NO UNUSED EXPORTS.** All exports are either used internally or documented as public API.

---

### Dead Code

| File | Line | Code | Reason | Recommendation |
|------|------|------|--------|----------------|
| src/index.ts | 641 | `// key.addEventListener('touchcancel', stop)` | Commented-out event listener | Uncomment with explanation OR remove entirely |
| src/interfaces/playable.ts | 13 | `// stopAfter: (duration: number) => void` | Commented-out interface member | Remove if not planned, or add TODO if planned |

**Result: MINIMAL DEAD CODE.** Only 2 instances found, both trivial.

---

### WeakMap / Module-Level State Holdovers

Per MEMORY.md, the codebase was ported from ember-audio and had WeakMap issues with framework proxies (Vue `reactive()`, Solid signals, etc.). Module-level WeakMaps break when proxies wrap instances.

**Search Results:**

| File | Line | Pattern | Risk | Recommendation |
|------|------|---------|------|----------------|
| src/beat-track.ts | 69-70 | `private _beats: Beat[]` with comment "replaces module-level WeakMap" | ✅ FIXED | None - already fixed |
| src/preload.ts | 5 | `export const responseCache = new Map<string, Response>()` | ✅ SAFE | None - keyed by string URLs, not object refs |

**Result: NO WEAKMAP HOLDOVERS.** The BeatTrack fix was successful. The only module-level Map is `responseCache`, which is intentionally global and keyed by strings (no proxy issue).

---

### Stale Ember Patterns

Searched for: Ember-style computed properties, observer patterns, Ember references in comments.

**Result: NONE FOUND.** No stale Ember patterns detected. The port to vanilla TypeScript is complete.

---

### Technical Debt (TODO Comments)

| File | Line | TODO | Recommendation |
|------|------|------|----------------|
| src/controllers/base-param-controller.ts | 57 | `// TODO: handle all gainNode and pannerNode props` | Create follow-up issue. Currently only gain/pan are controlled, which is sufficient for v1.1 |
| src/controllers/base-param-controller.ts | 102 | `// TODO: Consider changing 'from' to be something like 'using' or 'as'` | Defer - API breaking change. Consider for v2.0 |
| src/index.ts | 122 | `// TODO: without this, synth note hangs on first press?` | Investigate and document why `unlockAudioContext()` is needed. Add explanatory comment |

**Non-library TODOs found in `src/app/` (not part of library):**
- src/app/pages/sound-fonts/note-objects.ts:12 - Not part of library
- src/app/components/permission-banner.ts:13 - Not part of library

---

## Metrics

- **Files reviewed:** 40 library source files
- **Lines of code reviewed:** ~8,500 (excluding tests and src/app/)
- **Naming issues:** 4 minor type annotations
- **Code style issues:** 3 (all minor readability improvements)
- **Pattern violations:** 0
- **Duplicated code blocks:** 3 (low priority)
- **Dead code instances:** 2 (trivial)
- **WeakMap holdovers:** 0
- **Stale patterns:** 0
- **TODO comments:** 3 (library), 2 (app)

---

## Recommendations

### High Priority (v1.1)
1. **Remove or enable commented code** in src/index.ts line 641 (touchcancel)
2. **Document unlockAudioContext necessity** in src/index.ts line 122-123
3. **Add JSDoc to AudioSource interface** in src/controllers/base-param-controller.ts

### Medium Priority (v1.2)
4. **Extract equal-power crossfade to utility** to eliminate duplication across effects
5. **Extract safeDisconnect helper** to reduce try/catch repetition in base-sound.ts
6. **Type improvements:** Replace `any` with proper types in createNotes, createSoundFor

### Low Priority (Future)
7. **Extract validateNoteIdentifierOptions** in musical-identity.ts
8. **Consider API naming improvements** (e.g., `.from()` → `.using()`) for v2.0
9. **Add scheduler explanation comment** in beat-track.ts

---

## Conclusion

The codebase is in **excellent condition** for v1.1 release. Consistency is high, patterns are well-adhered to, and there is minimal technical debt. No WeakMap holdovers were found. The few issues identified are minor and can be addressed in a quick polish pass (Phase 13).

**Overall Grade: A-**

- Code Quality: A
- Pattern Adherence: A+
- Dead Code: A
- Technical Debt: B+ (3 TODOs)

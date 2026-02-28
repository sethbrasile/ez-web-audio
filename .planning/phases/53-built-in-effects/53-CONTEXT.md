# Phase 53: Built-in Effects - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Five professional-quality audio effects (Delay, Reverb, Distortion, Compressor, EQ) that plug into the existing `addEffect()` system. All use native Web Audio API nodes. No third-party libraries required.

</domain>

<decisions>
## Implementation Decisions

### Reverb approach
- Support both convolution and algorithmic reverb via a single `createReverb()` factory
- Auto-detect mode: `createReverb('hall.wav')` → convolution, `createReverb({ decay: 2 })` → algorithmic
- No bundled impulse response files — user provides URL. Document where to find free IR files
- Algorithmic reverb parameters: `decay`, `preDelay`, `damping`, `mix` (all optional with good defaults)

### Distortion character
- Selectable curve types: `'soft'` (warm/tube), `'hard'` (aggressive), `'fuzz'` (heavy), `'overdrive'` (classic)
- Built-in tone control (`tone` param, 0-1, dark to bright) as post-distortion filter
- Default oversample: `'4x'`, configurable to `'none'` or `'2x'`
- Support custom curve via `{ type: 'custom', curve: Float32Array }`

### API surface & defaults
- All 5 effects use options-object pattern: `createDelay({ time: 0.3, feedback: 0.5 })`
- All options are optional with good defaults — every effect works with zero config
- Specific factory functions only (no generic `createEffect('delay', ...)` dispatcher)
- Context-free pattern: AudioContext auto-resolved from shared library context, optional explicit override

### Effect parameter control
- Real-time getters/setters on all effect parameters (matches FilterEffect pattern)
- Setter is instant (direct `.value` assignment)
- Add `rampTo()` method for smooth transitions (avoids clicks/pops)
- Shared BaseEffect class/mixin for common wet/dry/bypass/rampTo logic

### Architecture: BaseEffect refactor
- Create a shared BaseEffect base class with wet/dry mixing, bypass, and rampTo()
- Refactor existing FilterEffect and GainEffect to extend BaseEffect
- All 5 new effects extend BaseEffect for consistency

### Claude's Discretion
- Specific default values for each effect's parameters
- Algorithmic reverb implementation approach (Schroeder, Freeverb, etc.)
- Distortion curve generation algorithms for each type
- BaseEffect internal architecture details
- rampTo() time constant and smoothing approach

</decisions>

<specifics>
## Specific Ideas

- Reverb should be a single smart factory: string arg = convolution (load file), object arg = algorithmic (generate)
- Distortion tone knob is important — raw distortion without tone shaping is unusable in most contexts
- The "EZ" philosophy: every effect should work with `createX()` and zero arguments

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Effect` interface (`src/effects/index.ts`): Standard `input`/`output`/`bypass`/`mix` contract
- `EffectWrapper` (`src/effects/effect-wrapper.ts`): Wet/dry routing with equal-power crossfade — pattern to follow
- `FilterEffect` (`src/effects/filter-effect.ts`): Full example of a built-in effect with getters/setters
- `GainEffect` (`src/effects/gain-effect.ts`): Simpler single-node effect example
- `applyEqualPowerCrossfade` (`src/utils/equal-power-crossfade.ts`): Shared wet/dry mixing utility
- `getOrCreateAudioContext` (`src/audio-context.ts`): Context-free factory pattern

### Established Patterns
- Context-free factory functions with AudioContext overload (see `createFilterEffect`, `createGainEffect`)
- Effect interface with `input`/`output` AudioNodes for chain wiring
- BaseSound's `addEffect()`/`addEffects()` manages effect chain wiring automatically
- Equal-power crossfade for all wet/dry mixing

### Integration Points
- New effects export from `src/effects/index.ts`
- Factory functions re-exported from `src/index.ts` (public API)
- BaseSound's `addEffect()` accepts any `Effect` — no changes needed there

</code_context>

<deferred>
## Deferred Ideas

- WASM-based audio effects (ADV-01) — future milestone
- VST-style plugin loading (ADV-02) — future milestone, feasibility TBD
- Third-party effect library integration like tuna.js via wrapEffect (ADV-03) — future milestone
- Chorus effect (FX-07) — deferred to next milestone
- Limiter effect (FX-08) — deferred to next milestone

</deferred>

---

*Phase: 53-built-in-effects*
*Context gathered: 2026-02-28*

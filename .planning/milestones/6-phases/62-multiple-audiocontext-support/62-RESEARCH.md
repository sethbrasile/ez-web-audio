# Phase 62: Multiple AudioContext Support - Research

**Researched:** 2026-03-07
**Domain:** TypeScript function overloads, Web Audio API AudioContext/BaseAudioContext
**Confidence:** HIGH

## Summary

This phase adds optional `AudioContext` (typed as `BaseAudioContext`) first-parameter overloads to ~16 factory functions in `src/index.ts`, following the pattern already established by `createAnalyzer` in `index.ts` and the effect factories in `src/effects/`. The existing effect factories use duck-typing (`typeof arg.createGain === 'function'`) for detection and need migration to `instanceof BaseAudioContext`. The core factory functions (createSound, createOscillator, etc.) currently have no overload at all and need one added.

The work is primarily mechanical: each function gets TypeScript overload signatures, an implementation that branches on `instanceof BaseAudioContext`, and when an explicit context is provided, `initAudio()` is skipped. A new guide page documents the advanced pattern. Tests verify both paths.

**Primary recommendation:** Follow the `createAnalyzer` pattern in `index.ts` (lines 644-655) as the reference implementation, but replace `instanceof AudioContext` with `instanceof BaseAudioContext` throughout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use `instanceof BaseAudioContext` for runtime detection (not duck-typing)
- Migrate existing effect factories (createDelay, createDistortion, createCompressor, createEQ, createReverb, createGainEffect) from duck-typing to `instanceof BaseAudioContext` for consistency
- TypeScript overload signatures type the parameter as `BaseAudioContext` (not `AudioContext`)
- Add overloads only to functions that call `getOrCreateAudioContext()` internally
- Skip createLFO (infers context from target), createSequence (takes Transport), createNotes (pure data)
- Full list: createSound, createSounds, createTrack, createTracks, createOscillator, createPolySynth, createGrainPlayer, createBeatTrack, createSprite, createNoise, createWhiteNoise, createFont, createLayeredSound, createTransport, createSampler, playTogether
- New dedicated guide page: `docs/guide/multiple-contexts.md`
- Code examples only, no interactive demo
- Highlight four use cases: separate output devices (sinkId), context isolation (clean teardown), multiple widgets on one page, different sample rates
- Include browser limitations, shared-context constraint, and when NOT to use multiple contexts

### Claude's Discretion
- JSDoc wording for new overloads
- Test structure and organization
- Exact code examples in the guide page
- Order of function updates

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Architecture Patterns

### Reference Implementation: createAnalyzer (index.ts:644-655)

This is the only factory function in `index.ts` that already has the overload pattern:

```typescript
// Source: src/index.ts lines 644-655
export async function createAnalyzer(options?: AnalyzerOptions): Promise<Analyzer>
export async function createAnalyzer(audioContext: AudioContext, options?: AnalyzerOptions): Promise<Analyzer>
export async function createAnalyzer(
  audioContextOrOptions?: AudioContext | AnalyzerOptions,
  maybeOptions?: AnalyzerOptions,
): Promise<Analyzer> {
  if (audioContextOrOptions instanceof AudioContext) {
    return new Analyzer(audioContextOrOptions, maybeOptions)
  }
  await initAudio()
  return new Analyzer(getOrCreateAudioContext(), audioContextOrOptions)
}
```

**Key behavior:** When explicit context is passed, `initAudio()` is skipped entirely. When no context is passed, the singleton path runs `await initAudio()` first.

### Effect Factory Pattern (duck-typing, needs migration)

Current pattern in all 6 effect factories (delay, distortion, compressor, eq, reverb, gain):

```typescript
// Source: src/effects/delay-effect.ts lines 135-147
export function createDelay(options?: DelayOptions): DelayEffect
export function createDelay(audioContext: AudioContext, options?: DelayOptions): DelayEffect
export function createDelay(
  audioContextOrOptions?: AudioContext | DelayOptions,
  options?: DelayOptions,
): DelayEffect {
  if (audioContextOrOptions !== undefined
    && typeof (audioContextOrOptions as AudioContext).createGain === 'function') {
    return new DelayEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new DelayEffect(getOrCreateAudioContext(), (audioContextOrOptions as DelayOptions) ?? {})
}
```

**Migration:** Replace the duck-typing check with `instanceof BaseAudioContext`. Update TypeScript overload signatures from `AudioContext` to `BaseAudioContext`.

### Special Cases by Function Category

**Category 1 -- Simple constructors (async, single options param):**
createOscillator, createPolySynth, createTransport, createLayeredSound

Pattern: `await initAudio(); return new Foo(getOrCreateAudioContext(), options)`
Overload: `(options?) | (ctx, options?)`

**Category 2 -- Audio loading (async, AudioInput param):**
createSound, createTrack

These delegate to `resolveSound()` / `load()` / `loadFromBuffer()` which internally call `initAudio()` and `getOrCreateAudioContext()`. The overload needs to thread the explicit context through the resolution chain, OR take a simpler approach: resolve the input first, then construct with the explicit context.

Implementation approach: When an explicit `BaseAudioContext` is provided, the factory should decode audio using that context (since `decodeAudioData` is a method on the context). The private helpers `load()`, `loadFromBuffer()`, and `createSoundFor()` will need an optional `audioContext` parameter, or the factory does its own loading.

**Category 3 -- Batch loaders (async, array of URLs):**
createSounds, createTracks

These call `load()` internally. Threading the context means either passing it to `load()` or doing the loading differently in the overloaded path.

**Category 4 -- Compound factories (async, resolve sounds then construct):**
createBeatTrack, createSampler

These call `resolveSound()` first, then construct. If an explicit context is passed, the resolved sounds should use that context too.

**Category 5 -- Buffer generators (async, generate AudioBuffer):**
createWhiteNoise, createNoise

These create AudioBuffer using `audioContext.createBuffer()`. The explicit context path simply uses the provided context.

**Category 6 -- Special:**
- `createFont`: Fetches + decodes + constructs. Needs context threaded through decode step.
- `createSprite`: Fetches + decodes + constructs AudioSprite. Same pattern.
- `createGrainPlayer`: Takes an already-decoded AudioBuffer, so simple constructor pattern.
- `playTogether`: Already extracts context from playables. Overload adds explicit context as first param.

### Private Helper Refactoring

The private helpers `load()`, `loadFromBuffer()`, `createSoundFor()`, and `resolveSound()` all use `getOrCreateAudioContext()` internally. Two approaches:

**Approach A -- Thread context through helpers:**
Add optional `audioContext?: BaseAudioContext` param to each helper. When provided, skip `initAudio()` and use the passed context. This is cleaner but touches more functions.

**Approach B -- Duplicate loading in overloaded path:**
When explicit context is passed, do the fetch/decode/construct inline without using the helpers. This avoids touching helpers but duplicates code.

**Recommendation: Approach A.** The helpers are private, so the refactoring is safe. It avoids code duplication and keeps the pattern consistent.

### playTogether Special Case

`playTogether` lives in `src/utils/play-together.ts` and is re-exported from `index.ts`. It currently uses `instanceof AudioContext` (not duck-typing) to extract context from playables. The overload should be added at the `play-together.ts` level and the re-export updated.

Current detection in play-together.ts:
```typescript
function hasAudioContext(p: unknown): p is WithAudioContext {
  return typeof p === 'object' && p !== null
    && 'audioContext' in p
    && (p as WithAudioContext).audioContext instanceof AudioContext
}
```

This should also be updated to `instanceof BaseAudioContext` for consistency.

### createFilterEffect Special Case

`createFilterEffect` has a 3-param overload (audioContext, type, options) where the first arg can be either a string (FilterType) or an AudioContext. It uses `typeof audioContextOrType === 'string'` to distinguish. This already works correctly -- `string` vs `BaseAudioContext` are unambiguous. Just update the type signature from `AudioContext` to `BaseAudioContext`.

### createGainEffect Special Case

Uses `typeof audioContextOrValue === 'number'` to distinguish -- same approach, already unambiguous. Just update type signature.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AudioContext detection | Custom duck-typing | `instanceof BaseAudioContext` | Standard, future-proof, works with OfflineAudioContext too |
| Test AudioContext | Custom mock | `standardized-audio-context-mock` | Already used project-wide |

## Common Pitfalls

### Pitfall 1: BaseAudioContext not in test globals
**What goes wrong:** `instanceof BaseAudioContext` throws ReferenceError in tests because happy-dom doesn't provide audio globals.
**Why it happens:** happy-dom has no Web Audio API implementation.
**How to avoid:** Tests must `vi.stubGlobal('BaseAudioContext', ...)` in addition to the existing `AudioContext` stub. Create a mock `BaseAudioContext` class that the mock `AudioContext` extends, or simply stub it to be the same as the mock `AudioContext` constructor (since `new MockAudioContext() instanceof MockAudioContext` is true when MockAudioContext IS BaseAudioContext).
**Warning signs:** Tests passing locally but `instanceof` checks always returning false.

**Recommended test setup:**
```typescript
import { AudioContext as Mock } from 'standardized-audio-context-mock'

// BaseAudioContext must be a parent class that AudioContext extends
// Simplest approach: stub both to the same constructor
const MockConstructor = vi.fn(function() { return new Mock() })
vi.stubGlobal('AudioContext', MockConstructor)
vi.stubGlobal('BaseAudioContext', MockConstructor)
```

Or more accurately, create a proper prototype chain:
```typescript
function MockBaseAudioContext() {}
function MockAudioContext() { return new Mock() }
Object.setPrototypeOf(MockAudioContext.prototype, MockBaseAudioContext.prototype)
vi.stubGlobal('BaseAudioContext', MockBaseAudioContext)
vi.stubGlobal('AudioContext', MockAudioContext)
```

The existing `createAnalyzer` tests work because they use `instanceof AudioContext` (not `BaseAudioContext`). All existing tests stub only `AudioContext`. This phase must add `BaseAudioContext` stubbing wherever the detection is used.

### Pitfall 2: Forgetting to skip initAudio() on explicit context path
**What goes wrong:** Calling `initAudio()` with an explicit context is unnecessary and can fail if no singleton exists yet.
**Why it happens:** Copy-paste from the default path.
**How to avoid:** Every explicit-context branch should skip `initAudio()` entirely. The `createAnalyzer` reference shows this.

### Pitfall 3: Sounds created in different contexts can't connect
**What goes wrong:** User creates a Sound with context A and an effect with context B, then tries `sound.addEffect(effect)`.
**Why it happens:** Web Audio API requires all nodes in a graph to share the same context.
**How to avoid:** Document this constraint clearly. This is NOT something to enforce in code -- the Web Audio API itself will throw.

### Pitfall 4: Private helpers using singleton context
**What goes wrong:** Factory overload passes explicit context but private helper still calls `getOrCreateAudioContext()`.
**Why it happens:** The helpers were written for singleton-only usage.
**How to avoid:** Thread the explicit context through all helper calls. Audit each function's call chain.

### Pitfall 5: createSampler constructor doesn't take AudioContext
**What goes wrong:** `Sampler` constructor takes `(sounds, opts)` -- no AudioContext param.
**How to avoid:** Check if Sampler needs the context. Looking at the code: `createSampler` calls `resolveSound` then `new Sampler(sounds, opts)` -- the Sampler itself doesn't use AudioContext directly (it delegates to its Sound instances). So the overload for `createSampler` only needs to thread the context through `resolveSound`, not into the Sampler constructor.

## Code Examples

### Overload pattern for simple constructor (e.g., createOscillator)

```typescript
export async function createOscillator(options?: OscillatorOptions): Promise<Oscillator>
export async function createOscillator(audioContext: BaseAudioContext, options?: OscillatorOptions): Promise<Oscillator>
export async function createOscillator(
  audioContextOrOptions?: BaseAudioContext | OscillatorOptions,
  maybeOptions?: OscillatorOptions,
): Promise<Oscillator> {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    return new Oscillator(audioContextOrOptions as AudioContext, maybeOptions)
  }
  await initAudio()
  return new Oscillator(getOrCreateAudioContext(), audioContextOrOptions)
}
```

### Overload pattern for audio-loading factory (e.g., createSound)

```typescript
export async function createSound(input: AudioInput): Promise<Sound>
export async function createSound(audioContext: BaseAudioContext, input: AudioInput): Promise<Sound>
export async function createSound(
  audioContextOrInput: BaseAudioContext | AudioInput,
  maybeInput?: AudioInput,
): Promise<Sound> {
  if (audioContextOrInput instanceof BaseAudioContext) {
    return resolveSound(maybeInput!, audioContextOrInput as AudioContext)
  }
  return resolveSound(audioContextOrInput)
}
```

### Migrated effect factory (e.g., createDelay)

```typescript
export function createDelay(options?: DelayOptions): DelayEffect
export function createDelay(audioContext: BaseAudioContext, options?: DelayOptions): DelayEffect
export function createDelay(
  audioContextOrOptions?: BaseAudioContext | DelayOptions,
  options?: DelayOptions,
): DelayEffect {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    return new DelayEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new DelayEffect(getOrCreateAudioContext(), (audioContextOrOptions as DelayOptions) ?? {})
}
```

### Test pattern for overloaded factory

```typescript
describe('createOscillator with explicit context', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    const MockCtx = Mock as unknown as typeof AudioContext
    vi.stubGlobal('AudioContext', MockCtx)
    vi.stubGlobal('BaseAudioContext', MockCtx) // Required for instanceof check
    audioContext = new Mock() as unknown as AudioContext
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses provided context instead of singleton', async () => {
    const osc = await createOscillator(audioContext, { frequency: 440 })
    expect(osc).toBeDefined()
    // Verify it used the explicit context, not the singleton
  })

  it('works without context (default path)', async () => {
    const osc = await createOscillator({ frequency: 440 })
    expect(osc).toBeDefined()
  })
})
```

## File Impact Analysis

### Primary file: `src/index.ts`
- ~16 factory functions need overloads added
- Private helpers `load()`, `loadFromBuffer()`, `resolveSound()`, `createSoundFor()` need optional context param
- `createAnalyzer` needs `AudioContext` changed to `BaseAudioContext`
- Estimated: ~150-200 lines of changes

### Effect factories (6 files):
- `src/effects/delay-effect.ts` -- migrate duck-typing to `instanceof BaseAudioContext`
- `src/effects/distortion-effect.ts` -- same
- `src/effects/compressor-effect.ts` -- same
- `src/effects/eq-effect.ts` -- same
- `src/effects/reverb-effect.ts` -- same (has special AudioBuffer detection too, leave that as-is)
- `src/effects/gain-effect.ts` -- same (uses `typeof === 'number'`, just update type sig)
- `src/effects/filter-effect.ts` -- same (uses `typeof === 'string'`, just update type sig)

### Utility file:
- `src/utils/play-together.ts` -- add overload, migrate `instanceof AudioContext` to `instanceof BaseAudioContext`

### Documentation:
- `docs/guide/multiple-contexts.md` -- new file
- `docs/.vitepress/config.mts` -- add sidebar entry under Guide > Introduction

### Tests:
- New test file or section in `src/index.test.ts` for overloaded factory paths
- Update effect factory tests if they test the detection pattern
- Update `src/utils/play-together.test.ts` for new overload

## Implementation Order Recommendation

1. **Wave 1 -- Effect factory migration + simple constructor overloads:** Migrate 7 effect factories from duck-typing to `instanceof BaseAudioContext`. Add overloads to simple constructor factories (createOscillator, createPolySynth, createGrainPlayer, createTransport, createLayeredSound, createAnalyzer migration). These are mechanical and independent.

2. **Wave 2 -- Audio-loading factories + helpers:** Refactor private helpers to accept optional context. Add overloads to createSound, createTrack, createSounds, createTracks, createBeatTrack, createSampler, createFont, createSprite, createNoise, createWhiteNoise. Add playTogether overload. These depend on helper refactoring.

3. **Wave 3 -- Documentation + tests:** Write guide page, add sidebar entry, write tests for both overloaded and default paths.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (happy-dom environment) |
| Config file | `vite.config.js` (test section) |
| Quick run command | `pnpm test src/index.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-01 | All factory functions accept optional AudioContext first param | unit | `pnpm test src/index.test.ts` | Partially (createAnalyzer only) |
| SC-02 | Existing code without context param works identically | unit | `pnpm test` (full suite) | Yes (existing tests) |
| SC-03 | Explicit context is used, not singleton | unit | `pnpm test src/index.test.ts` | No |
| SC-04 | Effect factories use instanceof BaseAudioContext | unit | `pnpm test src/effects/` | Partially |
| SC-05 | Guide page renders | smoke | `pnpm dev` (manual) | No |

### Sampling Rate
- **Per task commit:** `pnpm test src/index.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] BaseAudioContext global stub pattern needed in test setup for new overload tests
- [ ] New test describe blocks for explicit-context factory paths in `src/index.test.ts`
- [ ] Effect factory tests may need BaseAudioContext stub updates

## Sources

### Primary (HIGH confidence)
- Project source code: `src/index.ts`, `src/effects/*.ts`, `src/utils/play-together.ts` -- direct inspection
- `createAnalyzer` reference implementation: `src/index.ts:644-655`
- Effect factory duck-typing pattern: `src/effects/delay-effect.ts:141`, `distortion-effect.ts:244`, `compressor-effect.ts:169`, `eq-effect.ts:196`, `reverb-effect.ts:354`

### Secondary (MEDIUM confidence)
- [MDN BaseAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext) -- confirms BaseAudioContext is a global available in all modern browsers
- [CanIUse BaseAudioContext](https://caniuse.com/mdn-api_baseaudiocontext) -- Chrome 56+, Firefox 53+, Safari 14.1+, Edge 79+ (95.92% global support)
- `standardized-audio-context-mock` -- verified it does NOT export BaseAudioContext (requires manual global stubbing in tests)
- `happy-dom` -- verified it does NOT provide AudioContext or BaseAudioContext globals

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, purely internal refactoring
- Architecture: HIGH -- reference implementation exists (`createAnalyzer`), pattern is mechanical
- Pitfalls: HIGH -- verified test environment gaps, identified helper threading needs

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain, no external dependencies)

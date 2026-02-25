# Documentation Review: EZ Web Audio VitePress Site

**Reviewer:** Code Review Agent (Opus 4.6)
**Date:** 2026-02-20
**Scope:** All guides, examples, navigation, API reference spot-checks, and completeness gap analysis against `src/index.ts`

---

## Summary

The documentation site is well-structured and thorough for a library of this scope. The Getting Started guide can genuinely get a developer from install to audio in 5 minutes. The interactive examples are a major strength. However, there are several incorrect code examples, inconsistent API usage patterns, and a few completeness gaps that would frustrate users who try to copy-paste from the docs.

**Critical findings:** 4 incorrect code examples, 2 inconsistent `percentPlayed` values
**High findings:** 3 API reference JSDoc inconsistencies, 1 missing `createAnalyzer` parameter in example
**Medium findings:** 8 completeness gaps, 3 navigation/guide suggestions
**Low findings:** 5 minor documentation improvements

---

## CRITICAL Findings

### [CRITICAL] Incorrect `percentPlayed` values throughout docs -- 0-1 vs 0-100

**Location:** Multiple files
**Category:** Incorrect Example

**Description:** `track.percentPlayed` returns 0-100 (confirmed in `src/track.ts:81`: `return ratio * 100`), but multiple docs show it as 0-1:

- `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:67` -- `console.log(track.percentPlayed) // 0.35 (35% complete)` should be `35`
- `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:95` -- `console.log(track.percentPlayed) // 0.31 (31%)` should be `31`
- `/Users/seth/Documents/GitHub/ez-audio/docs/examples/basic-playback.md:54` -- `console.log(song.percentPlayed) // 0.25 (25%)` should be `25`
- `/Users/seth/Documents/GitHub/ez-audio/docs/examples/basic-playback.md:132` -- `console.log(track.percentPlayed) // 0.25` should be `25`

Meanwhile, the API reference (`/Users/seth/Documents/GitHub/ez-audio/docs/api/classes/Track.md:417`) correctly shows `progressBar.style.width = \`${track.percentPlayed}%\`` which implies 0-100. And the Track class example at line 34 shows `console.log(track.percentPlayed) // 15.5` which is correct.

The basic-playback progress bar example at line 179 uses `track.percentPlayed * 100` which double-multiplies -- if percentPlayed is already 0-100, this would give 0-10000.

**Suggestion:** Audit every occurrence of `percentPlayed` in docs. Use `track.percentPlayed` directly for percentage display (it is already 0-100). The progress bar code at `/Users/seth/Documents/GitHub/ez-audio/docs/examples/basic-playback.md:179` should be:
```typescript
progressBar.style.width = `${track.percentPlayed}%`
```
And the `track.seek(percent).as('ratio')` at line 192 should use:
```typescript
track.seek(percent * 100).as('percent')
// OR
track.seek(percent).as('ratio')
```
These need to be checked for internal consistency: if the click handler computes `percent` as 0-1, then `.as('ratio')` is correct, but calling it `percent` is misleading.

---

### [CRITICAL] Visualization example calls `createAnalyzer()` without required AudioContext parameter

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/visualization.md:57`
**Category:** Incorrect Example

**Description:** The visualization code example calls:
```typescript
const analyzer = createAnalyzer({ fftSize: 1024 })
```
But `createAnalyzer()` requires AudioContext as its first parameter:
```typescript
export function createAnalyzer(audioContext: AudioContext, options?: AnalyzerOptions): Analyzer
```

The same file at line 147 also calls `createAnalyzer({ fftSize: 2048 })` without AudioContext.

**Suggestion:** Fix both occurrences to:
```typescript
import { createAnalyzer, createOscillator, getAudioContext } from 'ez-web-audio'

const ctx = await getAudioContext()
const analyzer = createAnalyzer(ctx, { fftSize: 1024 })
```

---

### [CRITICAL] Ambient generator example uses wrong property access pattern for filter frequency

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/ambient-generator.md:93`
**Category:** Incorrect Example

**Description:** The code uses:
```typescript
lowpass.frequency.value = 1200
```
But `FilterEffect` exposes `frequency` as a direct property setter (not `.value`), per `src/effects/filter-effect.ts:129`:
```typescript
set frequency(v: number) {
    this.filterNode.frequency.value = v
}
```

The correct call is:
```typescript
lowpass.frequency = 1200
```

The same example also uses `Q: 1.0` (uppercase Q) in the `createFilterEffect` options at line 69, but the `FilterEffectOptions` interface uses lowercase `q`.

**Suggestion:** Fix line 69 from `Q: 1.0` to `q: 1.0`, and fix line 93 from `lowpass.frequency.value = 1200` to `lowpass.frequency = 1200`.

---

### [CRITICAL] API reference JSDoc for `addEffect()` uses old signature with AudioContext

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/api/classes/Sound.md:451` and `/Users/seth/Documents/GitHub/ez-audio/docs/api/classes/Track.md:510`
**Category:** Incorrect Example

**Description:** The `addEffect()` example in the auto-generated API docs shows:
```typescript
const filter = createFilterEffect(audioContext, 'lowpass', { frequency: 1000 })
```
This uses the backwards-compatible overload with explicit AudioContext. While technically valid, it contradicts the recommended pattern used everywhere else in the docs (context-free calls). Since this is a JSDoc issue, it originates in `src/base-sound.ts`.

**Suggestion:** Update the JSDoc in `src/base-sound.ts` for `addEffect()` to use the recommended context-free pattern:
```typescript
const filter = createFilterEffect('lowpass', { frequency: 1000 })
sound.addEffect(filter)
```
Then regenerate API docs.

---

## HIGH Findings

### [HIGH] Effects page shows `sound.rewireEffects()` call that may not be necessary

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/effects.md:224`
**Category:** Incorrect Example

**Description:** The "Toggling Effects On/Off" example shows:
```typescript
function toggleFilter() {
  filter.bypass = !filter.bypass
  sound.rewireEffects()
}
```
If `rewireEffects()` must be called manually after bypass changes, this is a significant DX pitfall that should be documented more prominently. If bypass is supposed to auto-rewire, the manual call is misleading. Either way, this pattern is not shown in the concepts guide, which says:
```typescript
filter.bypass = true // Signal skips this effect
filter.bypass = false // Signal flows through effect again
```
These two code blocks contradict each other -- one says manual rewire is needed, the other implies it is automatic.

**Suggestion:** Clarify the actual behavior. If `rewireEffects()` is required after bypass changes, add a note in the concepts guide at `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:278` explaining this requirement. If it is not required, remove the `rewireEffects()` call from the effects example.

---

### [HIGH] API reference JSDoc for `setAnalyzer()` uses old `createAnalyzer` signature

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/api/classes/Sound.md:1476` and `/Users/seth/Documents/GitHub/ez-audio/docs/api/classes/Track.md:1663`
**Category:** Incorrect Example

**Description:** The `setAnalyzer()` JSDoc example shows:
```typescript
const analyzer = createAnalyzer(audioContext, { fftSize: 2048 })
```
While this is technically correct (createAnalyzer does take audioContext), the variable `audioContext` appears without being obtained first. Users may not know how to get it.

**Suggestion:** Add `const audioContext = await getAudioContext()` or use the pattern from the effects page: `const ctx = await getAudioContext()`.

---

### [HIGH] Missing `async` keyword in synth keyboard polyphonic example

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/synth-keyboard.md:74`
**Category:** Incorrect Example

**Description:** The `playNote` function uses `await` but is not declared `async`:
```typescript
function playNote(note: string) {
  const frequency = frequencyMap[note]
  const osc = await createOscillator({ frequency, envelope })
  // ...
}
```

**Suggestion:** Fix to:
```typescript
async function playNote(note: string) {
```

---

## MEDIUM Findings

### [MEDIUM] Missing documentation coverage: AudioSprite / createSprite

**Location:** Missing page
**Category:** Missing Documentation

**Description:** `AudioSprite` and `createSprite` are exported from `src/index.ts` and documented in the API reference, but have zero coverage in the guides or examples. Audio sprites are a common pattern for game audio and web performance optimization.

**Suggestion:** Add a section in the concepts guide under "Other Sound Types" (it is already partially there at line 425), and consider adding an "Audio Sprites" example page or a section in Basic Playback showing sprite usage. The factory function JSDoc already has a good example to start from.

---

### [MEDIUM] Missing documentation coverage: Preload utilities (preload, isPreloaded, clearPreloadCache)

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md`
**Category:** Missing Documentation

**Description:** `preload()`, `isPreloaded()`, and `clearPreloadCache()` are covered in Getting Started and Basic Playback but `clearPreloadCache()` is never shown in any example. Users managing memory in long-running apps (SPAs) would need to know about cache clearing.

**Suggestion:** Add `clearPreloadCache()` to the preloading section in Getting Started or Basic Playback. One line showing cache management is sufficient:
```typescript
// Clear cache when navigating away or when memory is a concern
clearPreloadCache()
```

---

### [MEDIUM] Missing documentation coverage: Debug utilities have no dedicated guide section

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:513-525`
**Category:** Completeness

**Description:** `setDebugMode()` and `setDebugHandler()` are shown briefly in the concepts guide but there is no example of what debug output looks like, what message types exist, or when debug mode is useful. The `DebugMessage` type is exported but not explained anywhere in the narrative docs.

**Suggestion:** Expand the debug section in concepts to show sample output and explain when to use debug mode (e.g., troubleshooting audio not playing, timing issues, effect chain problems).

---

### [MEDIUM] Missing documentation coverage: Envelope class

**Location:** Missing from guides/examples
**Category:** Missing Documentation

**Description:** The `Envelope` class and `EnvelopeOptions` type are exported but only used implicitly through `createOscillator({ envelope: {...} })`. If users want to create or manipulate envelopes programmatically (e.g., changing envelope parameters on an existing oscillator), there is no guidance.

**Suggestion:** Add a brief mention in the synthesis example that the Envelope class exists for advanced use cases, or document how to change envelope parameters on a live oscillator.

---

### [MEDIUM] Missing documentation coverage: Error classes

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/basic-playback.md:220-237`
**Category:** Completeness

**Description:** Error handling is shown in Basic Playback with `AudioLoadError` and `AudioContextError`, but `AudioError` (the base class) and `InvalidNoteError` are never shown in examples. Users working with soundfonts would encounter `InvalidNoteError`.

**Suggestion:** Add `InvalidNoteError` handling to the Soundfont Piano example:
```typescript
try {
  piano.play('X9') // Invalid note
} catch (error) {
  if (error instanceof InvalidNoteError) {
    console.error('Invalid note:', error.message)
  }
}
```

---

### [MEDIUM] Missing documentation coverage: useInteractionMethods / preventEventDefaults

**Location:** Missing from examples
**Category:** Missing Documentation

**Description:** `useInteractionMethods()` and `preventEventDefaults()` are exported helper functions that simplify building interactive audio controls. They are not mentioned in any guide or example. The synth keyboard and XY pad examples would be natural places to show these.

**Suggestion:** Add a note in the Synth Keyboard or XY Pad example showing how `useInteractionMethods` and `preventEventDefaults` simplify event handling:
```typescript
import { useInteractionMethods, preventEventDefaults } from 'ez-web-audio'

// Simplify piano key event handling
preventEventDefaults(pianoKey)
await useInteractionMethods(pianoKey, oscillator)
```

---

### [MEDIUM] Missing documentation coverage: playAll / pauseAll / stopAll collection utilities

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:457-464`
**Category:** Completeness

**Description:** The concepts guide shows these utilities but notes `pauseAll` has "no effect on non-track sounds". This limitation is important but could be clearer. Also, no example page demonstrates these in a real scenario.

**Suggestion:** Consider showing these in the drum machine example where multiple tracks need to be stopped together, which is already the pattern used there.

---

### [MEDIUM] Drum machine Vue example uses setTimeout for tempo change instead of setTempo

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/drum-machine-vue.md:195-199`
**Category:** Incorrect Example

**Description:** The "Complete Example" at the bottom uses a stop-then-setTimeout-then-restart pattern for tempo changes:
```typescript
watch(bpm, (val) => {
  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack.stop())
    setTimeout(() => {
      tracks.value.forEach(t => t.beatTrack.playBeats(val, 1 / 16))
    }, 50)
  }
})
```
But the main drum machine page at `/Users/seth/Documents/GitHub/ez-audio/docs/examples/drum-machine.md:121` documents `setTempo(bpm)` as the correct method for changing tempo while playing, and the earlier Vue example at `/Users/seth/Documents/GitHub/ez-audio/docs/examples/drum-machine.md:120` uses it correctly.

**Suggestion:** Replace the setTimeout hack with `setTempo()`:
```typescript
watch(bpm, (val) => {
  tracks.value.forEach(t => t.beatTrack.setTempo(val))
})
```

---

## LOW Findings

### [LOW] Homepage code snippet could be more impressive

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/index.md:34-39`
**Category:** Homepage

**Description:** The homepage shows the simplest possible example (3 lines). While this proves "easy," it does not showcase the library's depth. A second, slightly more complex example showing synthesis or effects would better communicate the value proposition.

**Suggestion:** Add a second code block below the first one showing a more impressive use case:
```typescript
// Or create a synthesizer with ADSR envelope
const synth = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 }
})
synth.play()
```

---

### [LOW] Navigation sidebar missing guide links from examples section

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/config.mts`
**Category:** Navigation

**Description:** When a user is browsing the examples, the sidebar does not show the Guide section. They have to use the top nav to switch contexts. Adding a "Getting Started" or "Concepts" link at the top of the examples sidebar would help users who land on an example page first.

**Suggestion:** Add a "Guide" section at the top of the `/examples/` sidebar:
```typescript
{
  text: 'Guide',
  items: [
    { text: 'Getting Started', link: '/guide/getting-started' },
    { text: 'Core Concepts', link: '/guide/concepts' },
  ],
},
```

---

### [LOW] Missing guides that would be valuable

**Location:** Missing pages
**Category:** Guide Gap

**Description:** The following guides would fill gaps for common developer workflows:

1. **"iOS & Mobile Audio"** -- The library handles iOS workarounds internally, but developers frequently hit mobile audio issues. A guide explaining what the library does automatically (mute switch workaround, user interaction requirement) and what developers need to handle themselves would save support time.

2. **"Framework Integration (Vue/React/Svelte)"** -- The drum machine examples show Vue and vanilla patterns, but a dedicated guide showing the general pattern for React (useEffect cleanup, ref management) and Svelte (onMount/onDestroy) would be valuable. React is the most popular framework and currently has zero examples.

3. **"Working with Effects"** -- The effects example page covers filters and the routing page covers custom effects, but a unified guide explaining the effect lifecycle (create, add, bypass, remove, rewire) with a mental model diagram would help.

**Suggestion:** Prioritize "iOS & Mobile Audio" (saves support time) and "Framework Integration" (broadens audience). "Working with Effects" is lower priority since the existing example pages cover most use cases.

---

### [LOW] Concepts guide audio routing section mentions `connections` implicitly

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/guide/concepts.md:228`
**Category:** Completeness

**Description:** The routing diagram shows `Source -> [Effects] -> Gain -> Panner -> Destination` which is correct and does not mention the old `connections` API. This is good. However, the CLAUDE.md file mentions a `connections` array in the Connection Chain description. If the `connections` API was removed in breaking changes, ensure no stale references exist anywhere in the docs.

**Suggestion:** Already verified -- no `connections` API references found in the docs. This is clean.

---

### [LOW] `onPlayRamp('frequency')` used for oscillators but `frequency` is not in base ControlType

**Location:** `/Users/seth/Documents/GitHub/ez-audio/docs/examples/synth-drum-kit.md:31` and `/Users/seth/Documents/GitHub/ez-audio/docs/examples/synthesis.md:243`
**Category:** Completeness

**Description:** Multiple examples use `onPlayRamp('frequency')` and `update('frequency')` on oscillators. The concepts guide mentions the ControlType module augmentation pattern but the base type only includes `gain` and `pan`. If `frequency` works on oscillators due to a different controller, this should be documented more clearly so users understand which parameters work on which sound types.

**Suggestion:** Add a note in the Concepts guide "Parameter Control" section explaining that Oscillators support `'frequency'` and `'detune'` in addition to the base `'gain'` and `'pan'` parameters.

---

## Completeness Gap Summary

Cross-referencing `src/index.ts` exports against documentation coverage:

| Export | Guides | Examples | API Ref | Status |
|--------|--------|----------|---------|--------|
| createSound | Yes | Yes | Yes | Complete |
| createTrack | Yes | Yes | Yes | Complete |
| createSounds | Yes | Yes | Yes | Complete |
| createOscillator | Yes | Yes | Yes | Complete |
| createBeatTrack | Yes | Yes | Yes | Complete |
| createSampler | Yes | Yes | Yes | Complete |
| createFont | Yes | Yes | Yes | Complete |
| createLayeredSound | Brief | In synth-drum-kit | Yes | Adequate |
| createSprite | Brief | No | Yes | **Needs example** |
| createWhiteNoise | Yes | Yes | Yes | Complete |
| createAnalyzer | Yes | Yes | Yes | Complete |
| initAudio | Yes | No | Yes | Adequate |
| getAudioContext | Yes | Yes | Yes | Complete |
| createNotes | Yes | Yes | Yes | Complete |
| createFilterEffect | Yes | Yes | Yes | Complete |
| createGainEffect | Yes | Yes | Yes | Complete |
| createEffect | Yes | Yes | Yes | Complete |
| wrapEffect | Yes | Yes | Yes | Complete |
| crossfade | Brief | No | Yes | **Needs example** |
| playTogether | Brief | No | Yes | **Needs example** |
| playAll/pauseAll/stopAll | Brief | No | Yes | Adequate |
| preload/isPreloaded | Yes | Yes | Yes | Complete |
| clearPreloadCache | No | No | Yes | **Needs mention** |
| setDebugMode/Handler | Brief | No | Yes | **Needs expansion** |
| useInteractionMethods | No | No | Yes | **Needs mention** |
| preventEventDefaults | No | No | Yes | **Needs mention** |
| Envelope class | Implicit | No | Yes | **Needs mention** |
| Error classes | Partial | Partial | Yes | Adequate |
| frequencyMap | Yes | Yes | Yes | Complete |
| audioContextAwareTimeout | Explained | No | Yes | Adequate |
| ControlTypeMap augment | Yes | No | Yes | Adequate |
| LayeredSoundEventMap | No | No | Yes | Low priority |
| MusicallyAware | No | No | Yes | Low priority (advanced) |
| SampledNote | No | No | Yes | Low priority (internal) |

---

## Overall Assessment

**Strengths:**
- Getting Started guide is excellent -- clear, progressive, achievable in under 5 minutes
- Interactive examples are a major differentiator
- Concepts guide covers the mental model well (class hierarchy, AudioContext lifecycle, routing)
- Code examples are consistently well-formatted and use correct imports from 'ez-web-audio'
- The Sound vs Track comparison table is very helpful
- Drum machine integration patterns (Vue reactive vs vanilla events) are well explained

**Weaknesses:**
- `percentPlayed` inconsistency is the most likely source of user bugs
- Missing AudioContext parameter on `createAnalyzer` calls will cause TypeScript errors
- Several exports have zero narrative documentation (createSprite, crossfade, playTogether)
- No React integration example despite React being the dominant framework
- Effect bypass behavior (manual rewire vs automatic) is contradictory

**Recommendation:** Fix the 4 critical issues first (percentPlayed, createAnalyzer parameter, filter property access, JSDoc). Then address the high-priority items. The medium completeness gaps can be addressed incrementally.

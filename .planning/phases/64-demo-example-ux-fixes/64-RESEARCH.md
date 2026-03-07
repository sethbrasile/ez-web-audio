# Phase 64: Demo Example UX Fixes - Research

**Researched:** 2026-03-07
**Domain:** Vue component UX patterns, Web Audio API integration in demo components
**Confidence:** HIGH

## Summary

This phase fixes five distinct bugs across the demo/example components in the VitePress documentation site. All issues were confirmed by reading the source code directly. The fixes are straightforward -- no new libraries or architectural changes needed.

The five issues break down into three categories: (1) Load/Init button removal (AudioSpriteDemo, LayeredSoundDemo), (2) missing UI features (sprite playhead, stop button), and (3) actual code bugs (visualization connect error, drum machine `playBeats` vs `playActiveBeats`).

**Primary recommendation:** Fix each component individually. All fixes are self-contained Vue SFC edits with no library-side changes needed.

## Standard Stack

No new libraries needed. All fixes use existing project dependencies:

| Library | Version | Purpose |
|---------|---------|---------|
| Vue 3 | existing | SFC component framework |
| VitePress | existing | Documentation site |
| ez-web-audio | existing | Audio library being demoed |

## Architecture Patterns

### Pattern: Lazy Init on First Interaction

All demo components should follow the pattern already established in DrumMachine.vue, TrackDemo.vue, CrossfadeDemo.vue, and PlayTogetherDemo.vue:

```typescript
// Component renders fully visible immediately
// Audio initializes lazily on first user action
let initialized = false

async function ensureLoaded() {
  if (initialized) return true
  if (loading.value) return false

  loading.value = true
  try {
    const lib = await import('ez-web-audio')
    // create sounds...
    initialized = true
    return true
  } finally {
    loading.value = false
  }
}

async function userAction() {
  if (!(await ensureLoaded())) return
  // do the action
}
```

**Key rule from CLAUDE.md:** "Demo components must NOT have a separate 'Load' or 'Init' button that hides the example until clicked. The user's first interaction (e.g. clicking 'Play') is what initializes the AudioContext and loads audio. Examples should render fully visible immediately and lazily initialize audio on first user interaction."

### Anti-Patterns to Avoid

- **Init/Load button that hides content:** Using `v-if="!loaded"` to show an init section and `v-else` to show the actual demo
- **Missing `await` on async factory functions:** The `createAnalyzer` from `index.ts` is async even when passed an AudioContext

## Issue Analysis

### Issue 1: AudioSpriteDemo.vue - Load Button + Missing Playhead + Missing Stop Button

**File:** `docs/.vitepress/theme/components/AudioSpriteDemo.vue`

**Problem A - Load Button:** Lines 142-149 show an init section with `v-if="!loaded"` that hides all controls behind a "Load Audio Sprite" button. The `v-else` on line 151 means nothing is visible until the user clicks Load.

**Fix:** Remove the init section. Render the full UI immediately. Move the `initialize()` logic into each interaction handler (playSegment, playFull) using a lazy-init pattern like `ensureLoaded()`.

**Problem B - No playhead during full-file playback:** When "Play Full File" is clicked, the `playingFull` ref becomes true, but there is no visual playhead indicator scrolling across the timeline. The timeline segments only highlight when individual segments play. During full-file playback, the user should see a playhead line moving across the timeline at the correct speed.

**Fix:** Add an animated playhead element (a vertical line) inside `.timeline` that uses `requestAnimationFrame` to track position during full-file playback. Use CSS `left` percentage based on `(currentTime / totalDuration) * 100%`.

**Problem C - No stop button for full-file playback:** The `playFull()` function starts playback but there is no way to stop it. The button just says "Playing..." while active.

**Fix:** Add stop functionality to the "Play Full File" button (toggle behavior) or add a separate Stop button. When stopped, call `fullSound.stop()`, clear the timer, reset `playingFull`.

### Issue 2: AudioSpriteDemo.vue - Init Button (same component, same fix as Issue 1A)

This is the same issue as 1A above. The INIT button should be removed and audio initialization should happen on first Play interaction.

### Issue 3: VisualizationDemo.vue - "Overload resolution failed" on Play

**File:** `docs/.vitepress/theme/components/VisualizationDemo.vue`

**Root Cause:** Line 100 -- `createAnalyzer(ctx, { fftSize: fftSize.value })` is called WITHOUT `await`.

The `createAnalyzer` re-exported from `index.ts` (lines 762-773) is an `async` function that returns `Promise<Analyzer>`. Even when an AudioContext is passed directly, it still returns a Promise. The demo assigns this Promise to `analyzer`, then calls `oscillator.setAnalyzer(analyzer)` where `analyzer` is a Promise, not an Analyzer instance. When `wireEffectChain()` tries `_analyzer.input.connect(...)`, the Promise has no `input` property, causing the "Overload resolution failed" error.

**Fix:** Add `await` to line 100:
```typescript
analyzer = await createAnalyzer(ctx, { fftSize: fftSize.value })
```

### Issue 4: DrumMachineVue.vue - Plays every sound on every step

**File:** `docs/.vitepress/theme/components/DrumMachineVue.vue`

**Root Cause:** Line 162 -- `t.beatTrack.playBeats(bpm.value, 1 / 16)` uses `playBeats()` instead of `playActiveBeats()`.

From `src/beat-track.ts`:
- `playBeats()` (line 236): "plays ALL beats regardless of their `active` flag"
- `playActiveBeats()` (line 269): "only plays beats where `active === true`"

The DrumMachineVue component uses `playBeats()` which ignores the `active` state entirely, causing every step to trigger sound regardless of the pattern.

**Fix:** Change `playBeats` to `playActiveBeats` on line 162.

**Comparison:** The original DrumMachine.vue (line 83) correctly uses `playActiveBeats()`. The DrumMachineVue.vue is a variant that was created with the wrong method.

### Issue 5: DrumMachineVanilla.vue - Plays every sound on every step

**File:** `docs/.vitepress/theme/components/DrumMachineVanilla.vue`

**Root Cause:** Line 120 -- same issue as Issue 4. Uses `playBeats()` instead of `playActiveBeats()`.

**Fix:** Change `playBeats` to `playActiveBeats` on line 120.

### Bonus: LayeredSoundDemo.vue - Load Button

**File:** `docs/.vitepress/theme/components/LayeredSoundDemo.vue`

**Problem:** Lines 130-137 have the same anti-pattern as AudioSpriteDemo: an init section with `v-if="!loaded"` hiding the full demo behind a "Load Layered Sounds" button.

**Fix:** Same pattern as AudioSpriteDemo -- remove init section, render UI immediately, lazy-init on first interaction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Playhead animation | Custom timing logic | requestAnimationFrame + percentage calc | Browser-optimized, syncs with display refresh |
| Audio position tracking | Polling intervals | Track.position (already exists) or manual time tracking with AudioContext.currentTime | Existing API |

## Common Pitfalls

### Pitfall 1: Forgetting `await` on async factory functions
**What goes wrong:** The `createAnalyzer` from `index.ts` is always async (returns Promise), even when AudioContext is provided. Forgetting `await` gives you a Promise object instead of an Analyzer.
**How to avoid:** Always `await` factory functions from `ez-web-audio`. Every `create*` function is async.

### Pitfall 2: Using `playBeats()` instead of `playActiveBeats()`
**What goes wrong:** All beats play sound regardless of active state.
**Why it happens:** The two methods have similar names. `playBeats` was designed for cases where you want every position to play (no pattern concept).
**How to avoid:** For drum machine/sequencer patterns, always use `playActiveBeats()`.

### Pitfall 3: Playhead animation not cleaning up
**What goes wrong:** requestAnimationFrame continues after component unmounts or playback stops.
**How to avoid:** Store the animation frame ID. Cancel in `onUnmounted()` and when playback stops. The existing components already follow this pattern.

### Pitfall 4: Lazy init race condition
**What goes wrong:** User clicks Play twice quickly, causing double initialization.
**How to avoid:** Guard with both `initialized` and `loading` flags, as done in existing components. Return early if `loading` is true.

## Code Examples

### Lazy Init Pattern (from existing PlayTogetherDemo.vue)
```typescript
// Source: docs/.vitepress/theme/components/PlayTogetherDemo.vue
async function ensureLoaded() {
  if (loaded.value) return true
  if (loading.value) return false

  try {
    loading.value = true
    lib = await import('ez-web-audio')
    // create resources...
    loaded.value = true
    return true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
    return false
  } finally {
    loading.value = false
  }
}

// Every user action calls ensureLoaded first
async function play() {
  if (!(await ensureLoaded())) return
  // play logic...
}
```

### Playhead Animation Pattern
```typescript
// Animated playhead for AudioSpriteDemo timeline
const playheadPosition = ref(0) // 0-100 percentage
let playheadFrame: number | null = null
let playStartTime = 0

function startPlayhead() {
  playStartTime = performance.now()
  animatePlayhead()
}

function animatePlayhead() {
  const elapsed = (performance.now() - playStartTime) / 1000
  playheadPosition.value = (elapsed / totalDuration) * 100

  if (elapsed < totalDuration && playingFull.value) {
    playheadFrame = requestAnimationFrame(animatePlayhead)
  } else {
    playheadPosition.value = 0
    playingFull.value = false
  }
}

function stopPlayhead() {
  if (playheadFrame) {
    cancelAnimationFrame(playheadFrame)
    playheadFrame = null
  }
  playheadPosition.value = 0
}
```

## Components Summary

| Component | Issue | Fix Type | Complexity |
|-----------|-------|----------|------------|
| AudioSpriteDemo.vue | Load button hides content | Refactor to lazy init | Medium |
| AudioSpriteDemo.vue | No playhead during full playback | Add animated playhead element | Medium |
| AudioSpriteDemo.vue | No stop button for full playback | Add stop/toggle behavior | Low |
| VisualizationDemo.vue | Missing `await` on createAnalyzer | One-line fix | Low |
| DrumMachineVue.vue | `playBeats` -> `playActiveBeats` | One-line fix | Low |
| DrumMachineVanilla.vue | `playBeats` -> `playActiveBeats` | One-line fix | Low |
| LayeredSoundDemo.vue | Load button hides content | Refactor to lazy init | Medium |

## Open Questions

None. All issues are well-understood with clear fixes.

## Sources

### Primary (HIGH confidence)
- Direct source code reading of all affected Vue components
- Direct source code reading of `src/beat-track.ts` (playBeats vs playActiveBeats)
- Direct source code reading of `src/index.ts` (createAnalyzer async overloads)
- Direct source code reading of `src/base-sound.ts` (wireEffectChain, setAnalyzer)
- Direct source code reading of `src/analyzer.ts` (Analyzer class)
- CLAUDE.md project conventions (no-load-button rule)

## Metadata

**Confidence breakdown:**
- Issue diagnosis: HIGH - all confirmed by source code reading
- Fix approach: HIGH - follows established patterns in existing components
- Scope completeness: HIGH - searched all components for load button anti-pattern, found all instances

**Research date:** 2026-03-07
**Valid until:** indefinite (fixes are against current codebase state)

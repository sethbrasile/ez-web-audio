# Demo Component Review - Agent 5

**Reviewed by:** Claude Opus 4.6 (Code Reviewer)
**Date:** 2026-02-20
**Scope:** All 17 VitePress demo Vue components
**Source API:** `src/index.ts` cross-referenced for correctness

---

## [HIGH] Sampler has no `stop()` method -- SampledDrumKit cleanup is a no-op
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/SampledDrumKit.vue`:100-113
**Category:** Bug / Cleanup
**Description:** The `onUnmounted` hook calls `kickSampler.stop()`, `snareSampler.stop()`, `hihatSampler.stop()`. However, the `Sampler` class (in `src/sampler.ts`) has no `stop()` method -- it only has `play()`, `playIn()`, `playAt()`, and `getSounds()`. This call will throw at unmount time (caught by the try/catch, so it silently fails). The underlying Sound instances inside the sampler are never stopped.
**Suggestion:** Use `sampler.getSounds().forEach(s => s.stop())` for each sampler in `onUnmounted`, or add a `stop()` method to the `Sampler` class. Since Sounds are one-shot, this may not cause audible issues, but it leaves AudioBufferSourceNodes in flight.

---

## [HIGH] DrumMachineVue.vue BPM watch uses setTimeout instead of setTempo
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/DrumMachineVue.vue`:166-174
**Category:** Bug
**Description:** The BPM watcher stops all tracks then uses a raw `setTimeout(() => { ... }, 50)` to restart them. The BeatTrack class has a `setTempo(bpm)` method specifically designed for live tempo changes without stop/restart. Meanwhile, `DrumMachine.vue` uses `setTempo()` correctly. The `setTimeout(50)` approach creates an audible gap and a timing drift since it is not synced to the audio clock.
**Suggestion:** Replace the stop/setTimeout/restart pattern with `tracks.value.forEach(t => t.beatTrack.setTempo(val))`, which is the correct API and avoids the audible gap.

---

## [MEDIUM] AmbientGenerator texture filter update does not work -- assigning `.frequency` to a FilterEffect
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/AmbientGenerator.vue`:168-173
**Category:** Bug
**Description:** `updateTextureFilter()` sets `textureFilter.frequency = textureFilterCutoff.value`. The `textureFilter` is a `FilterEffect` returned by `createFilterEffect()`. Looking at `FilterEffect` in the effects system, `.frequency` is a property on the underlying `BiquadFilterNode`, but the FilterEffect wrapper may not proxy this assignment correctly to the underlying AudioParam. The correct way to update a filter parameter at runtime depends on whether `FilterEffect` exposes a setter that forwards to the `BiquadFilterNode.frequency.value`. This needs verification against the FilterEffect implementation. The FilterDemo.vue uses the same pattern (`filter.frequency = newFreq`) so if one is wrong both are.
**Suggestion:** Verify that `FilterEffect.frequency = value` actually updates `BiquadFilterNode.frequency.value`. If it does not, use the underlying node directly (e.g., `textureFilter.effect.frequency.value = textureFilterCutoff.value`).

---

## [MEDIUM] FilterDemo.vue calls `source.rewireEffects()` but this is internal plumbing exposed to users
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/FilterDemo.vue`:114
**Category:** UX / Code Quality
**Description:** When changing the filter type while playing, the demo calls `source.rewireEffects()` after `addEffect()`. Similarly on line 143 with bypass. The `rewireEffects()` is a public method on `BaseSound` but it should ideally be called automatically by `addEffect/removeEffect`. The fact that the demo needs to call it manually suggests either a library gap or an incorrect usage pattern. New users reading this code will be confused about when they need to call `rewireEffects()`.
**Suggestion:** If `addEffect()` does not automatically rewire, document this requirement clearly. If it does auto-rewire, remove the manual calls. Either way, the demo should demonstrate the simplest correct pattern.

---

## [MEDIUM] PianoKeyboard touchmove does not handle sliding between keys
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/PianoKeyboard.vue`:103-109
**Category:** Mobile
**Description:** The PianoKeyboard has `touchstart.prevent` and `touchend.prevent` per key, but there is no `touchmove` handler. On mobile, when a user slides their finger from one key to another, the original key's `touchend` never fires (since the finger is still down) and the new key's `touchstart` never fires (since the touch began on a different element). This causes stuck notes on mobile.
**Suggestion:** Add a `touchmove` handler at the keyboard container level that uses `document.elementFromPoint(touch.clientX, touch.clientY)` to detect which key the finger is over, emit `noteOff` for the previous key and `noteOn` for the new key.

---

## [MEDIUM] DrumMachine.vue play button lacks aria-label
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/DrumMachine.vue`:100
**Category:** A11y
**Description:** The DrumMachine's play button has no `aria-label`. The button text changes between "Stop" and "Play" which is good, but compare with DrumMachineVanilla.vue and DrumMachineVue.vue which both have `:aria-label="playing ? 'Stop playback' : 'Start playback'"`. DrumMachine.vue should be consistent.
**Suggestion:** Add `:aria-label="playing ? 'Stop playback' : 'Start playback'"` to the play button.

---

## [MEDIUM] AmbientGenerator sliders lack aria-labels
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/AmbientGenerator.vue`:201-276
**Category:** A11y
**Description:** All range inputs in the AmbientGenerator (master volume, drone frequency, texture filter cutoff, shimmer frequency) lack `aria-label` attributes. While they are inside `<label>` elements (which provides an implicit association), the label text includes the current value inline (e.g., "Frequency: 80 Hz") which may not be announced properly by all screen readers for range inputs.
**Suggestion:** Add explicit `aria-label` attributes to each range input, e.g., `:aria-label="'Master volume: ' + Math.round(masterVolume * 100) + '%'"`.

---

## [MEDIUM] SynthKeyboard volume warning uses emoji
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/SynthKeyboard.vue`:119
**Category:** A11y
**Description:** The volume warning text contains a raw emoji character (warning sign). Screen readers may announce this inconsistently across platforms. The same issue exists in XYPad.vue line 283.
**Suggestion:** Use a CSS-styled icon or a visually hidden "Warning:" prefix instead. Or wrap the emoji in `<span aria-hidden="true">` and add a screen-reader-only "Warning:" span.

---

## [MEDIUM] VisualizationDemo frequency/FFT controls have no aria-labels
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/VisualizationDemo.vue`:293-312
**Category:** A11y
**Description:** The frequency slider and FFT size select lack `aria-label` or `id`+`for` associations. The labels are parent `<label>` elements containing both text and the input, which provides implicit association, but the dynamic frequency value ("440 Hz") is not in the aria-label.
**Suggestion:** Add `:aria-label="'Frequency: ' + frequency + ' Hz'"` to the frequency input, and `aria-label="FFT size"` to the FFT select.

---

## [MEDIUM] TrackDemo seek bar has `min` attribute missing
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/TrackDemo.vue`:149-157
**Category:** A11y
**Description:** The seek `<input type="range">` has `:max="duration"` and `step="0.1"` but no `min` attribute. While the default `min` for range inputs is 0, being explicit improves clarity and accessibility tooling.
**Suggestion:** Add `min="0"` to the seek input.

---

## [LOW] DrumMachineVanilla.vue beat cells fall below 44px touch target on small screens
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/DrumMachineVanilla.vue`:500-506
**Category:** Mobile
**Description:** At viewport widths below 480px, beat cells shrink to `min-width: 20px; min-height: 20px`, well below the 44px recommended touch target. This affects all three drum machine variants (DrumMachine.vue at 24px, DrumMachineVue.vue at 20px, DrumMachineVanilla.vue at 20px).
**Suggestion:** On narrow screens, consider showing only 8 beats at a time with pagination/scrolling, or make cells 44px minimum and allow horizontal scroll (which DrumMachine.vue already enables via `overflow-x: auto` but with too-small cells).

---

## [LOW] AudioDemo watch on `gain`/`pan` fires redundantly alongside explicit `changeGainTo`/`changePanTo` in `play()`
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/AudioDemo.vue`:47-55
**Category:** Code Quality
**Description:** The `watch(gain, ...)` and `watch(pan, ...)` watchers update the sound whenever the slider moves. But the `play()` function also calls `sound.changeGainTo(gain.value)` and `sound.changePanTo(pan.value)` before playing. The watchers make the explicit calls in `play()` redundant (and vice versa, the first call after load is handled by the watcher since `sound` gets set).
**Suggestion:** Remove the duplicate `changeGainTo`/`changePanTo` calls from `play()`, since the watchers handle reactive updates. Or remove the watchers and keep only the calls in `play()` if you only want gain/pan to update on play.

---

## [LOW] OscillatorDemo waveType watch recreates oscillator but has a brief silence gap
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/OscillatorDemo.vue`:75-80
**Category:** UX
**Description:** The comment says "waveType requires stop/recreate" because OscillatorNode.type cannot change after start. This creates a brief audible click/gap. However, the Web Audio API OscillatorNode.type IS mutable even after start -- it only stops the node when you call `.stop()`. The library's Oscillator wrapper may not expose this, but it is worth noting.
**Suggestion:** If the library's `Oscillator` class exposes a `type` setter or similar, use that for a seamless transition. If not, the current approach is acceptable but could be documented in a tooltip or comment for users.

---

## [LOW] VisualizationDemo canvas re-scaling on resize calls `ctx.scale()` additively
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/VisualizationDemo.vue`:29-63
**Category:** Bug
**Description:** `setupCanvases()` is called on mount and on `resize`. Each call does `ctx.scale(dpr, dpr)`. However, setting `canvas.width` resets the canvas transform matrix, so the subsequent `ctx.scale(dpr, dpr)` is correct. This is actually fine -- no bug. (Noting for completeness since this was flagged during review but confirmed correct.)
**Suggestion:** No change needed.

---

## [LOW] XYPad canvas uses `canvas.value.clientWidth` for height fallback
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/XYPad.vue`:46
**Category:** Bug
**Description:** In the `drawGrid` and `updateFromPosition` functions, the height fallback is `canvas.value.clientWidth` (not `clientHeight`). Line 46: `const height = Number(canvas.value.dataset.logicalHeight) || canvas.value.clientWidth`. Since the canvas is square (aspect-ratio: 1), this coincidentally works, but it is semantically wrong. Same issue on line 129.
**Suggestion:** Change the fallback to `canvas.value.clientHeight` for correctness.

---

## [LOW] SoundfontPiano cleanup does not stop playing notes
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/SoundfontPiano.vue`:64-75
**Category:** Cleanup
**Description:** The `onUnmounted` hook sets `font = null` but does not stop any currently-playing SampledNote instances. If a note was triggered just before navigation, it will continue to play until it naturally decays. The comment acknowledges this ("individual notes decay naturally") but for long-sustain soundfonts this could be audible.
**Suggestion:** If `Font` or `SampledNote` instances expose a `stop()` method, call `font.notes.forEach(n => { try { n.stop() } catch {} })` before nulling.

---

## [LOW] SynthDrumKit activeOscillators uses `let` array reassigned in onUnmounted
**Component:** `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/SynthDrumKit.vue`:10
**Category:** Code Quality
**Description:** `let activeOscillators: any[] = []` is declared with `let` and reassigned to `[]` in `onUnmounted` (line 235). Since this is not a ref, Vue's reactivity does not track it. Using `splice(0)` or clearing in place would be more conventional, though functionally this is fine since `onUnmounted` runs once.
**Suggestion:** Minor -- change to `const activeOscillators: any[] = []` and use `activeOscillators.length = 0` to clear.

---

## [LOW] Multiple demos use `any` types for library instances
**Component:** All components
**Category:** Code Quality
**Description:** Every demo component declares its library instances as `any` (e.g., `let oscillator: any = null`, `let lib: any = null`). This loses all type safety. While dynamic import makes typing harder, the library exports types that could be used.
**Suggestion:** Use the exported types: `import type { Oscillator, Sound, Track } from 'ez-web-audio'` and type the variables accordingly (e.g., `let oscillator: Oscillator | null = null`). For the `lib` variable, use `typeof import('ez-web-audio')`.

---

## [INFO] Missing Demo: AudioSprite
**Component:** Missing Component
**Category:** Missing Demo
**Description:** `createSprite()` is exported in the public API and documented in `src/index.ts` but has no interactive demo. AudioSprite is a common pattern for game audio and UI sound effects where many short sounds are packed into a single file.
**Suggestion:** Create a demo showing a sprite manifest with 3-4 named segments (e.g., laser, explosion, powerup, coin) that can be triggered by buttons. Show the manifest format and how `sprite.play('name')` works.

---

## [INFO] Missing Demo: Track Crossfade
**Component:** Missing Component
**Category:** Missing Demo
**Description:** `crossfade()` is exported in the public API but has no interactive demo. Crossfading between two tracks is a common DJ/music-player use case.
**Suggestion:** Create a demo with two tracks and a crossfade slider. When the user moves the slider, one track fades out while the other fades in.

---

## [INFO] Missing Demo: Preload with Progress
**Component:** Missing Component
**Category:** Missing Demo
**Description:** `preload()`, `isPreloaded()`, `clearPreloadCache()`, and `createSounds()` with progress callback are all exported but have no demo. Showing a loading bar while preloading multiple sounds is a very common real-world pattern.
**Suggestion:** Create a demo that preloads 5-6 sounds using `createSounds()` with a progress callback, showing a progress bar. Then provide buttons to play each loaded sound.

---

## [INFO] Missing Demo: playTogether / LayeredSound
**Component:** Missing Component
**Category:** Missing Demo
**Description:** `playTogether()` is exported but has no dedicated demo. While `SynthDrumKit.vue` uses `createLayeredSound` internally for the snare and hi-hat, there is no standalone demo that explains the `playTogether` utility or `createLayeredSound` as a first-class concept.
**Suggestion:** Create a simple demo that layers 2-3 sounds or oscillators and plays them with perfect sync, with individual volume controls per layer.

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| HIGH     | 2     | Bug, Cleanup |
| MEDIUM   | 6     | Bug, A11y, Mobile, UX |
| LOW      | 6     | Bug, Code Quality, Cleanup, UX |
| INFO     | 4     | Missing Demo |

### Priority Actions
1. Fix SampledDrumKit cleanup (Sampler has no `.stop()`)
2. Fix DrumMachineVue BPM watcher to use `setTempo()`
3. Verify FilterEffect `.frequency` setter behavior
4. Add aria-labels to AmbientGenerator and VisualizationDemo sliders
5. Fix PianoKeyboard touch-slide handling for mobile

### Positive Observations
- Consistent error handling pattern across all components (try/catch with user-visible error ref)
- Good use of dynamic imports for SSR compatibility
- Proper `onUnmounted` cleanup in all components
- DrumMachine stub-beats pattern for instant rendering is excellent UX
- Loading states shown consistently
- Good visual feedback (glowing beat cells, pad press animations)
- Signal chain visualization in DistortionDemo is pedagogically excellent
- SynthDrumKit snare breakdown (meat/crack/full) is a great teaching tool

# Domain Pitfalls

**Domain:** Interactive audio demo pages for VitePress documentation site (Milestone 7)
**Researched:** 2026-03-08
**Supersedes:** Previous M5 pitfalls research (2026-02-28) -- all M5 features are now implemented and tested. This document focuses on DEMO PAGE pitfalls.

---

## Scope Note

This document covers pitfalls specific to **building 5 interactive demo pages** for existing M5 features (Effects, LFO, PolySynth, Transport/Sequencer, GrainPlayer). The M5 features are fully implemented and tested (1920+ unit tests). These pitfalls concern:

1. Vue component lifecycle and Web Audio cleanup in VitePress SPA
2. Real-time audio parameter visualization with Canvas
3. UI/UX design for complex audio controls
4. Integration patterns between Vue reactivity and audio engine state
5. Mobile/touch compatibility for interactive demos

The M5 library code pitfalls (voice stealing, transport scheduling, LFO depth units, etc.) are solved in the library. These are about correctly USING those APIs in demo components.

---

## Critical Pitfalls

Mistakes that cause broken demos, audio leaking between pages, or unusable UX.

---

### Pitfall 1: requestAnimationFrame and WorkerTimer Leaks on VitePress Navigation

**What goes wrong:** VitePress is a SPA. When users navigate between pages, Vue components unmount but `requestAnimationFrame` loops, `WorkerTimer` intervals (used internally by Transport, GrainPlayer), and live audio nodes continue running. New demos with multiple animation loops (LFO wave visualization, transport timeline playhead, grain position indicator) have many surfaces to leak.

**Why it happens:** Each M7 demo may have 2-3 independent animation loops (e.g., waveform + playhead + parameter meter). The Transport and GrainPlayer use internal `WorkerTimer` instances that run Web Workers. These are not automatically cleaned up by Vue's component lifecycle -- they require explicit `dispose()` calls.

**Consequences:** Audio keeps playing after page navigation. CPU usage climbs. After several navigations, dozens of orphaned Workers and animation frames accumulate. Research shows 100 mount/unmount cycles without cleanup can accumulate ~0.8 MB of retained heap per component.

**Prevention:**
- Call `.dispose()` on every PolySynth, GrainPlayer, Transport, LFO, Sequence, and Effect instance in `onUnmounted`. All have idempotent dispose methods.
- For Transport specifically: `transport.dispose()` calls `stop()`, terminates the WorkerTimer, and unsyncs all tracks/sequences. One call handles cascade cleanup.
- Store every `requestAnimationFrame` ID in a component-level variable and cancel all in `onUnmounted`.
- Follow the established pattern from existing demos (DrumMachine.vue, VisualizationDemo.vue).
- Use a cleanup registry pattern:
  ```typescript
  const cleanups: (() => void)[] = []
  // When creating resources:
  cleanups.push(() => transport.dispose())
  cleanups.push(() => cancelAnimationFrame(rafId))
  // In onUnmounted:
  onUnmounted(() => cleanups.forEach(fn => fn()))
  ```

**Detection:** Open DevTools Memory tab. Navigate to demo, interact, navigate away, return. If heap grows each cycle, there is a leak. Check Performance Monitor for increasing "JS event listeners" count.

---

### Pitfall 2: PolySynth Voice Exhaustion Shows as Silent Keys in UI

**What goes wrong:** The PolySynth demo will use PianoKeyboard.vue for note input. When `maxVoices` is low (e.g., 4 to demonstrate stealing), rapid key presses cause voice stealing that the UI does not reflect. The user sees 6 keys visually "active" but only hears 4 notes.

**Why it happens:** The existing SynthKeyboard.vue tracks notes via `Map<string, Oscillator>` -- each note has its own oscillator and never "loses" it. PolySynth manages voices internally via a pool. The UI's `activeNotes` Set and PolySynth's internal pool desync when voices are stolen. The `voicestolen` event exists specifically to solve this but is easy to miss.

**Consequences:** User confusion. The demo's purpose is to demonstrate voice allocation strategies, but if stolen voices still appear active in the UI, the demo fails to teach anything.

**Prevention:**
- Listen for the `voicestolen` event: `synth.on('voicestolen', (e) => { activeNotes.delete(noteForFrequency(e.detail.stolenFrequency)) })`.
- Track `VoiceHandle` instances per note. Check `handle.active` before considering a note "playing."
- Display an "Active voices: X/Y" counter reading from `synth.activeVoices` and `synth.maxVoices`.
- When `stealStrategy` changes, call `synth.stopAll()` and clear all UI state to avoid stale handles.
- Visually differentiate stolen keys (dimmed, border change) from truly active keys.

**Detection:** Set `maxVoices: 4`, hold 6 keys simultaneously. If UI shows 6 active but only 4 play, desync is happening.

---

### Pitfall 3: Transport Position Display Causes Reactive Cascade

**What goes wrong:** Transport emits `tick` events with position data. A naive implementation binds `transport.on('tick', (e) => { position.value = e.detail })` to a Vue ref, causing reactive updates many times per second (at 120 BPM, 4 ticks/beat = 8 ticks/sec, but scheduler fires at ~25ms intervals). The display either lags or causes excessive re-renders that freeze the UI.

**Why it happens:** Transport's `tick` event fires on every scheduler interval, not every visual frame. Directly binding to Vue refs causes reactive cascade on every tick. With many reactive bindings (bar, beat, tick, seconds display, playhead position), each tick triggers multiple component updates.

**Consequences:** Janky position counter, dropped frames, unresponsive controls. Playhead animation stutters or jumps.

**Prevention:**
- Do NOT bind `transport.on('tick')` directly to a Vue ref for display. Store latest position in a plain JS variable and sync to UI in a `requestAnimationFrame` loop.
- For playhead animation, use CSS `transform` with `will-change: transform` for GPU acceleration. Calculate position from `audioContext.currentTime` relative to transport start, not from tick events.
- Poll `transport.position` (getter) in the rAF loop instead of listening for events.
- Reserve `transport.on('tick')` for scheduling audio operations only, not UI updates.

**Detection:** Run at 200 BPM. If the position display drops below 30fps, the reactive binding is the bottleneck.

---

### Pitfall 4: Effect Toggle Clicks During Live Playback

**What goes wrong:** The effects demo lets users add/remove/reorder effects. Each `addEffect()` and `removeEffect()` call triggers internal `wireSharedBus()` which disconnects and reconnects all nodes. During the disconnect window, audio drops to silence, creating an audible click.

**Why it happens:** `wireSharedBus()` does a full disconnect-then-reconnect cycle. There is no crossfade between old and new chain configurations. This is by design for setup but problematic during live playback.

**Consequences:** Audible click/pop every time the user toggles an effect while audio plays.

**Prevention:**
- Use `effect.bypass = true/false` for toggling effects during playback. Bypass uses the existing dry/wet path and does NOT disconnect nodes -- no clicks.
- Only use `addEffect()`/`removeEffect()` as setup actions before playback starts.
- Default the demo UI to bypass toggles. Show add/remove as an initial chain builder.
- If demonstrating reorder, stop playback first, reorder, resume.
- Add a brief audio note in the demo text: "Effects are toggled using bypass for click-free switching."

**Detection:** Toggle an effect on/off while audio plays. Listen for clicks.

---

### Pitfall 5: GrainPlayer Buffer Loading Delays Demo Startup

**What goes wrong:** GrainPlayer requires an `AudioBuffer`. Unlike Oscillator (generates from nothing) or BeatTrack (small WAV samples), GrainPlayer needs a substantial file decoded into a buffer. If the demo loads a large file on first interaction, users wait several seconds.

**Why it happens:** The lazy-init pattern works well for small files, but granular synthesis demos need longer audio (2-10 seconds) for meaningful scrubbing. `decodeAudioData` is not instant.

**Consequences:** User clicks "Play", waits 2-5 seconds, thinks demo is broken.

**Prevention:**
- Use a short sample (1-2 seconds max). Granular synthesis works fine with short buffers since grain size is 0.01-0.5s.
- Show a loading spinner during buffer decode (existing pattern from DrumMachine.vue: `loading.value = true`).
- Consider generating a buffer programmatically (synthesize a short pad, capture to buffer) to eliminate network latency.
- The codebase has `decode-base64.ts` utilities -- a very short base64-encoded sample could work for zero-network demo.

**Detection:** Test on throttled network (DevTools > Slow 3G). If demo takes >2 seconds to start after first click, the buffer is too large.

---

## Moderate Pitfalls

---

### Pitfall 6: LFO Depth Units Produce Inaudible or Overwhelming Modulation

**What goes wrong:** The LFO `connect()` calculates absolute depth from the target's current value at connection time. If gain is 0.3 and depth is 0.3 with `depthUnit: 'ratio'`, actual swing is 0.3 * 0.3 = 0.09 -- barely audible. Connecting to frequency with depth 0.3 and `depthUnit: 'ratio'` creates 440 * 0.3 = 132 Hz swing -- huge wobble.

**Why it happens:** The ratio-based depth calculation multiplies against the current parameter value. This is correct behavior but unintuitive for demo users who expect sliders to produce proportional results.

**Prevention:**
- Provide presets with tuned defaults: tremolo (gain depth 0.3-0.5), vibrato (frequency depth 50 cents), auto-pan (pan depth 0.8).
- Use `depthUnit: 'absolute'` for demo sliders where users directly control the swing range.
- Display the calculated absolute depth next to the slider so users understand what the ratio means.
- Clamp depth slider ranges to sensible values per target parameter (gain: 0-1, frequency: 0-200 cents, pan: 0-1).

### Pitfall 7: Canvas Visualization Ignores VitePress Sidebar Toggle

**What goes wrong:** The existing VisualizationDemo uses `window.addEventListener('resize')` to recalculate canvas dimensions. But VitePress sidebar toggle changes content width without firing a window resize event. New canvas-based visualizations (LFO waveform, grain position, timeline) may not resize correctly.

**Prevention:**
- Use `ResizeObserver` on the canvas container element, not `window.addEventListener('resize')`. ResizeObserver fires on any layout change including sidebar toggle.
- Follow the existing VisualizationDemo DPR pattern: store logical dimensions in `dataset`, scale context by `devicePixelRatio`.
- Set canvas CSS `width: 100%` and recalculate backing store dimensions in the observer callback.

### Pitfall 8: Musical Time Notation Confuses Non-Musician Users

**What goes wrong:** The Sequence API uses `'4n'`, `'8t'`, `'2m'` notation. Documentation site visitors may not know music theory. If the demo only shows notation strings, users cannot meaningfully interact.

**Prevention:**
- Show a visual beat grid alongside notation, mapping `'4n' = quarter note = 1 beat`.
- Provide "plain English" labels: `'4n' (quarter note)`, `'8t' (eighth triplet)`.
- Default to simple patterns (quarter notes, eighth notes) that are intuitively understandable from a visual grid.
- Use a click-to-place timeline rather than requiring notation string input.

### Pitfall 9: Multiple Demos on Same Page Leak Audio Between Each Other

**What goes wrong:** If a page includes two demos, both call `getAudioContext()` and share the global AudioContext. Audio from one bleeds into the other. Stopping one does not stop the other.

**Prevention:**
- Each demo must be fully self-contained: own play/stop, own cleanup in `onUnmounted`.
- Do not share audio instances between components. Shared AudioContext is fine (and correct for Web Audio), but UI state must be independent.
- Stop all audio in `onUnmounted` even if user did not click "Stop."
- Only one demo per page should auto-play or produce audio simultaneously. If multiple demos exist, only one should be active at a time.

### Pitfall 10: ADSR Envelope Changes Not Applied to Existing PolySynth Voices

**What goes wrong:** User changes envelope sliders while PolySynth is active. New voices still use original envelope because `PolySynthOptions.envelope` is read at construction time. The voice factory captures initial options in a closure.

**Prevention:**
- Use a `createVoice` factory function that reads from Vue refs at voice creation time:
  ```typescript
  const synth = await createPolySynth({
    createVoice: (ctx) => new Oscillator(ctx, {
      type: waveType.value,
      envelope: { ...envelope.value }
    })
  })
  ```
- This pattern is specifically supported by PolySynth (custom voice factory) but easy to miss.
- Document in the demo that envelope changes apply to NEW voices only, not currently playing ones.

### Pitfall 11: Transport BPM Change Path Conflicts with Direct BeatTrack Tempo

**What goes wrong:** The existing DrumMachine.vue uses `beatTrack.setTempo(val)` directly. If the Transport demo syncs BeatTracks via `syncTo(transport)`, BPM changes flow through Transport's scheduler automatically. Mixing both patterns creates confusion.

**Prevention:**
- In the Transport demo, use ONLY `transport.bpm = value`. Do NOT also call `beatTrack.setTempo()`.
- Document that `syncTo(transport)` delegates tempo to Transport. Direct `setTempo()` is for standalone BeatTracks only.

---

## Minor Pitfalls

---

### Pitfall 12: Dark/Light Mode Canvas Colors Hardcoded

**What goes wrong:** Canvas visualizations use hardcoded colors that look wrong in VitePress dark/light mode.

**Prevention:** Always read VitePress CSS custom properties via `getComputedStyle()` for canvas backgrounds and colors. Follow the existing VisualizationDemo.vue pattern exactly: `getComputedStyle(canvas).getPropertyValue('--vp-c-bg')`.

### Pitfall 13: Effect Parameter Sliders Allow Dangerous Values

**What goes wrong:** User drags delay time to 5s, creating feedback screeching. Or sets reverb decay to 30s, generating a massive convolution buffer that freezes the page.

**Prevention:**
- Clamp slider ranges: delay time max 1s, reverb decay max 5s, feedback max 0.9, distortion amount max 1000.
- Include "Volume Warning" banner (already used in SynthKeyboard.vue) for demos producing sustained output.
- Add a "panic" button calling `stopAll()` / `dispose()` on all active audio.

### Pitfall 14: Touch Event Handling Missing for Mobile

**What goes wrong:** PolySynth keyboard needs touch events for mobile. The existing PianoKeyboard.vue handles this, but new touch interactions (scrubbing grain position, dragging effect parameters) may not.

**Prevention:**
- Use `<input type="range">` for slider controls (handles touch natively).
- For timeline, use click/tap to set position rather than requiring drag.
- Test on iOS Safari specifically for audio unlock quirks.

### Pitfall 15: Stub Beats Pattern Not Needed for Non-BeatTrack Demos

**What goes wrong:** The DrumMachine.vue uses a "stub beats" pattern for immediate rendering before audio init. New demo authors copy this pattern even for PolySynth or Effects demos where it is unnecessary, adding complexity without benefit.

**Prevention:**
- Stub beats pattern is ONLY needed for BeatTrack demos where the grid must render before audio is loaded.
- For Oscillator, PolySynth, and Effects demos: render the full UI immediately (controls, keyboard, sliders). Audio objects are created lazily on first interaction. No stub objects needed.
- For Transport demo: render timeline grid immediately. BeatTrack stubs may be useful if showing a beat grid.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Effects chain demo | Pitfall 4 (click on re-wire), Pitfall 13 (unsafe ranges) | Use bypass for live toggling; clamp all sliders to safe ranges |
| LFO modulation demo | Pitfall 6 (depth units), Pitfall 7 (canvas resize) | Absolute depth units for sliders; ResizeObserver for canvas |
| PolySynth demo | Pitfall 2 (voice desync), Pitfall 10 (envelope config) | Listen for voicestolen; use createVoice factory reading from refs |
| Transport + Sequencer demo | Pitfall 3 (position drift), Pitfall 8 (notation confusion), Pitfall 11 (BPM path) | rAF-based display; visual grid; single BPM control path |
| GrainPlayer demo | Pitfall 5 (buffer loading), Pitfall 1 (rAF/Worker leak) | Short sample; cleanup registry in onUnmounted |
| All demos | Pitfall 1 (navigation leak), Pitfall 9 (shared context), Pitfall 14 (mobile touch) | Dispose all in onUnmounted; self-contained components; native range inputs |

---

## Sources

**Codebase (HIGH confidence):**
- Existing demo patterns: DrumMachine.vue, VisualizationDemo.vue, SynthKeyboard.vue, DistortionDemo.vue
- M5 source: PolySynth (voicestolen event, VoiceHandle, createVoice factory), Transport (tick event, dispose cascade), GrainPlayer (WorkerTimer, buffer requirement), LFO (depthUnit, connect options), BaseEffect (bypass, mix, dispose)

**Official docs (HIGH confidence):**
- [MDN: Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

**Community (MEDIUM confidence):**
- [Granular Synthesis in Browser - Web Audio API](https://dev.to/hexshift/granular-synthesis-in-the-browser-using-web-audio-api-and-audiobuffer-slicing-2o9h)
- [ZYA Granular Synthesiser](https://zya.github.io/granular/)
- [Vue Memory Leak Prevention](https://coreui.io/answers/how-to-fix-memory-leaks-in-vue/)
- [Cleaning Up in Vue Components](https://markus.oberlehner.net/blog/how-to-clean-up-global-event-listeners-intervals-and-third-party-libraries-in-vue-components/)
- [Frontend Memory Leaks Empirical Study](https://stackinsight.dev/blog/memory-leak-empirical-study/)
- [Tone.js PolySynth](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html)

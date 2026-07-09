---
status: final
date: 2026-03-19
type: deep-review
mode: mid-build
scope: "Milestone 7 Feature Demos (Phases 67-71): LFO, PolySynth, Effects Chain, GrainPlayer, Transport+Sequencer"
verdict: NOT READY
blocking_count: 6
total_count: 55
---

# Deep Review — EZ Web Audio M7 Feature Demos
## 2026-03-19 | Mode: Mid-build | Scope: M7 Demos (Phases 67-71)

> **How to use this report:** Start with the Proposed Action Plan — each grouping is self-contained. Read Critical/High Findings for evidence and context. Structural Patterns identify root causes spanning multiple findings.

### Meta
- Lenses activated: UX/UI (×2), Musical/Audio (×2), Architecture, Content/Copy, Fix Verification
- Skills referenced: frontend-design
- Files examined: 6 Vue components + 5 docs pages + 10 library source files = 21 files
- Reviewers: 7 (all Opus)
- Verdict: **NOT READY** — 6 blocking findings
- Blocking findings: 6 / Total findings: 55
- Fix Verification: All 3 prior patterns (inconsistent-event-systems, missing-effect-dispose, fluent-api-conversion-gap) **FULLY RESOLVED**

---

### Critical Findings

#### C1: TransportSequencer BeatTrack/Sequence not disposed on unmount
- **severity:** critical | **blocking:** yes
- **file:** TransportSequencerDemo.vue:397-410
- **lens:** Architecture
- **what:** `onUnmounted` nulls `kickTrack`, `snareTrack`, `hihatTrack`, `bassSeq`, `pianoSeq` but never calls `.dispose()` on them. Only `transport?.dispose()` and `bassOsc?.stop()` are called.
- **why:** BeatTrack and Sequence objects hold internal AudioNode references and timers. In VitePress SPA navigation, these persist after route change.
- **fix:** Call `.dispose()` on all 5 objects before nulling them.

#### C2: EffectsChainDemo currentSource not disposed on unmount
- **severity:** critical | **blocking:** yes
- **file:** EffectsChainDemo.vue:226-229
- **lens:** Architecture
- **what:** `currentSource.stop()` is called but `currentSource.dispose?.()` is never called, leaving internal AudioNode subgraphs connected.
- **why:** Same VitePress SPA issue — source nodes persist across client-side route changes.
- **fix:** Add `currentSource.dispose?.()` after `currentSource.stop()`.

---

### High Findings (Blocking)

#### H1: GrainPlayer missing touchend handler — mobile drag permanently stuck
- **severity:** high | **blocking:** yes
- **file:** GrainPlayerDemo.vue:311-323
- **lens:** UX/UI
- **what:** `handleTouchStart` and `handleTouchMove` exist but no `handleTouchEnd` is defined or registered. After touch-lifting, `isDragging` stays `true`.
- **why:** On touch devices, every subsequent touch move anywhere will update grain position, breaking the demo on mobile.
- **fix:** Add `handleTouchEnd` setting `isDragging = false`, register on `document` in `onMounted`, remove in `onUnmounted`.

#### H2: TransportSequencer preset before init causes audio/visual desync
- **severity:** high | **blocking:** yes
- **file:** TransportSequencerDemo.vue:392-394
- **lens:** UX/UI
- **what:** `selectPreset` calls `applyPreset` which calls `kickTrack?.setPattern()` etc. — all silently no-op before `ensureLoaded`. But `stepCells` (visual grid) updates from `activePreset` immediately.
- **why:** User clicks "Funk Groove" → sees grid change → presses Play → hears Straight Rock.
- **fix:** Gate `applyPreset`'s audio-side calls behind `if (lib)`, and re-apply on next `ensureLoaded` completion.

#### H3: "Triplet Feel" hi-hat pattern is straight 8th notes
- **severity:** high | **blocking:** yes
- **file:** TransportSequencerDemo.vue:93
- **lens:** Musical/Audio
- **what:** Hi-hat pattern `[1,0,1,0,1,0,1,0,...]` is identical to Straight Rock — no triplet character in the drum part.
- **why:** The label says "Triplet Feel" but the drums play straight 8ths. Only the bass/piano melody uses triplet timing, which is inaudible against straight drums.
- **fix:** Either shuffle the hi-hat pattern to approximate triplets on the 16th grid (e.g., steps 1,4,5,8,9,12,13,16...) or rename to "Straight Drums + Triplet Melody" to set correct expectations.

#### H4: Triplet quantization with ticksPerBeat:4
- **severity:** high | **blocking:** yes
- **file:** TransportSequencerDemo.vue:96-97,296
- **lens:** Musical/Audio
- **what:** Transport uses `ticksPerBeat: 4` (16th-note resolution). Bass notes at `time: 1/3` and `time: 2/3` beat positions can't be expressed as integer ticks (0.333... × 4 = 1.333 ticks).
- **why:** If the Sequence API quantizes to tick boundaries, triplet positions will snap to the nearest 16th note, making "Triplet Feel" sound identical to straight time.
- **fix:** Use `ticksPerBeat: 12` (supports both 16ths and triplets, since LCM(4,3)=12) or verify that Sequence bypasses tick quantization for numeric time values.

---

### High Findings (Non-blocking)

#### H5: LFO rate mapping midpoint too low for musical use
- **severity:** high | **blocking:** no
- **file:** LFODemo.vue:34
- **lens:** Musical/Audio
- **what:** `0.1 * (200 ** (rateSlider/100))` puts slider midpoint (50) at ~1.4 Hz. The musically critical 4-8 Hz range occupies only slider positions ~70-85.
- **why:** Lower 60% of slider feels "dead" — sub-1.5 Hz produces slow wobble, not recognizable tremolo/vibrato.
- **fix:** Shift base so midpoint lands near 3-5 Hz, e.g., `0.1 * (100 ** (rateSlider/100))`.

#### H6: Tremolo depth too subtle at max
- **severity:** high | **blocking:** no
- **file:** LFODemo.vue:46
- **lens:** Musical/Audio
- **what:** Max tremolo depth is 0.5 (50% gain wobble) on a base gain of 0.3, producing gain swing of 0.15-0.45 — never reaching silence.
- **why:** Real tremolo (guitar amp, Leslie cabinet) swings near-silence to full volume. This produces a faint flutter.
- **fix:** Raise base gain to 0.6-0.7 or increase max depth to 0.8-1.0.

#### H7: Vibrato depth max 100 cents is a full semitone — too wide
- **severity:** high | **blocking:** no
- **file:** LFODemo.vue:48
- **lens:** Musical/Audio
- **what:** Max vibrato depth is 100 cents (1 semitone). Classical/vocal vibrato is typically ±25-50 cents.
- **why:** At 50% slider (50 cents), the pitch swings noticeably sharp and flat — sounds like a whammy bar, not expressive vibrato.
- **fix:** Reduce max vibrato depth to 50 cents so full slider covers the musically useful range.

#### H8: Wah Pedal preset uses lowpass filter — should be bandpass
- **severity:** high | **blocking:** no
- **file:** LFODemo.vue:121,184
- **lens:** Musical/Audio
- **what:** The "Wah Pedal" preset sweeps a lowpass filter. Real wah pedals use a resonant bandpass filter.
- **why:** Lowpass produces "muffled to bright" sweep. A wah's character comes from a resonant mid-peak — musicians will not recognize this as wah.
- **fix:** Use `'bandpass'` with Q of 4-8 for the filter tab, or rename the preset to "Filter Sweep."

#### H9: LFO preset rates off-target
- **severity:** high | **blocking:** no
- **file:** LFODemo.vue:182-183
- **lens:** Musical/Audio
- **what:** "Slow Tremolo" rate=40 (~0.8 Hz, below musical tremolo). "Fast Vibrato" rate=65 (~3.2 Hz, below standard vibrato 5-7 Hz).
- **why:** Both presets produce effects slower than their genre names promise.
- **fix:** Slow Tremolo rate→50-55 (~1.4-2 Hz). Fast Vibrato rate→72-78 (~5.5-7 Hz).

#### H10: GrainPlayer hardcoded dark canvas colors break light mode
- **severity:** high | **blocking:** no
- **file:** GrainPlayerDemo.vue:201-202
- **lens:** UX/UI + Architecture
- **what:** Canvas uses hardcoded `#1a1a2e` background and `#4ecdc4` stroke. In VitePress light mode, this creates a jarring dark rectangle.
- **why:** All other demos use VitePress CSS variables. This breaks visual consistency.
- **fix:** Use CSS custom properties read via `getComputedStyle` in canvas drawing.

#### H11: Sequencer grid is read-only but looks clickable
- **severity:** high | **blocking:** no
- **file:** TransportSequencerDemo.vue:561-580
- **lens:** UX/UI
- **what:** 32-step grid cells have no click handler — purely display. But no UI communicates this.
- **why:** Every drum machine UI ever made allows clicking steps. Users will try to click and assume the demo is broken.
- **fix:** Either add click-to-toggle for drum rows, or display "Use presets to change patterns" label.

#### H12: Sequencer grid overflows, track labels scroll away
- **severity:** high | **blocking:** no
- **file:** TransportSequencerDemo.vue:863-865
- **lens:** UX/UI
- **what:** 32 × 24px cells + 150px label + 52px M/S = ~970px minimum. VitePress content area is often <800px.
- **why:** Track labels scroll off-screen, losing context while scrolling through steps.
- **fix:** Use `position: sticky; left: 0` on track controls within the scrollable container.

#### H13: PianoKeyboard global key listeners trigger on search input
- **severity:** high | **blocking:** no
- **file:** PianoKeyboard.vue:149-177
- **lens:** UX/UI
- **what:** Key handlers attached to `window` fire for any keypress — including VitePress search.
- **why:** Typing in search will trigger notes, which is disorienting.
- **fix:** Guard with `if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return`.

#### H14: EffectsChain moveEffect dead before Play
- **severity:** high | **blocking:** no
- **file:** EffectsChainDemo.vue:208-224
- **lens:** UX/UI
- **what:** `moveEffect` returns early if `!currentSource`, so reorder buttons are silently inert until Play is pressed.
- **why:** User reads signal flow diagram, tries to reorder effects — nothing happens.
- **fix:** Allow reordering the `chainOrder` array regardless of playback state; only rewire audio nodes when a source exists.

#### H15: Effect bypass may not truly disconnect
- **severity:** high | **blocking:** no
- **file:** EffectsChainDemo.vue:202-206
- **lens:** Musical/Audio
- **what:** `toggleBypass` sets `entry.effect.bypass = true` but effects remain in `addEffects()` call. Whether bypass truly disconnects depends on the library's `bypass` setter implementation.
- **why:** If bypass only sets dry/wet to 100% dry, the effect's node latency and coloration still affect the signal.
- **fix:** Verify library's bypass disconnects nodes, or explicitly `removeEffect`/`addEffect` on toggle.

#### H16: Track labels have hardcoded timing annotations
- **severity:** high | **blocking:** no
- **file:** TransportSequencerDemo.vue:417-418
- **lens:** UX/UI + Musical/Audio
- **what:** Labels say "Synth (8th notes)" and "Piano (quarter notes)" but these don't match all presets — Triplet Feel uses triplet subdivisions.
- **why:** Labels actively misinform about what the user is hearing.
- **fix:** Remove timing annotations or compute dynamically from active preset.

#### H17: Effects Chain page has no educational content
- **severity:** high | **blocking:** no
- **file:** effects-chain.md:1-14
- **lens:** Content/Copy
- **what:** Only a title, one sentence, and bare component embed — no "How It Works," no code example, no API reference.
- **why:** Every other M7 and existing demo page has explanatory prose and code snippets. A developer landing here gets zero educational value.
- **fix:** Add How It Works section, code example, and API reference table.

#### H18: Missing LLM fallback tags on all M7 pages
- **severity:** high | **blocking:** no
- **file:** lfo-modulation.md, polysynth.md, effects-chain.md, grainplayer.md, transport-sequencer.md
- **lens:** Content/Copy
- **what:** Existing pages (drum-machine, synth-keyboard) use `<llm-exclude>`/`<llm-only>` for LLM-friendly fallback. None of the M7 pages implement this.
- **why:** LLM-served versions will embed a Vue component tag with no fallback description.
- **fix:** Add `<llm-exclude>` around component embed and `<llm-only>` with plain-text description.

#### H19: Bass oscillator is raw sawtooth with no filtering
- **severity:** high | **blocking:** no
- **file:** TransportSequencerDemo.vue:330-331
- **lens:** Musical/Audio
- **what:** Bass is sawtooth at E1 (41.2 Hz) with no filter. All harmonics present — extremely buzzy and harsh.
- **why:** Competes spectrally with the piano soundfont. Makes the overall demo sound amateurish.
- **fix:** Change to `'triangle'` or add a lowpass filter at ~400 Hz.

---

### Medium Findings

#### M1: PianoKeyboard single-touch only — multi-touch drops notes
- **file:** PianoKeyboard.vue:107-139 | **lens:** UX/UI
- Tracks only `event.touches[0]`. Lifting one finger during two-finger play kills both.
- Fix: Implement per-touch tracking via `touch.identifier`.

#### M2: LFO Depth slider shows raw % regardless of modulation target
- **file:** LFODemo.vue:480-483 | **lens:** UX/UI
- "50%" means different things for tremolo (gain), vibrato (cents), and filter (Hz).
- Fix: Display computed real-world value per tab.

#### M3: LFO waveform buttons have no text labels
- **file:** LFODemo.vue:487-527 | **lens:** UX/UI
- Only tiny 24×12 SVG icons. Sawtooth vs triangle indistinguishable at small sizes.
- Fix: Add waveform name text beneath icons.

#### M4: ADSR grid collapses awkwardly at narrow viewports
- **file:** PolySynthDemo.vue:251-268,464 | **lens:** UX/UI
- `auto-fit, minmax(140px, 1fr)` creates asymmetric 2+2 layout.
- Fix: Force 4-column with overflow, or single-column stacked on narrow.

#### M5: PolySynth recreateSynth silences held notes without feedback
- **file:** PolySynthDemo.vue:130-132 | **lens:** UX/UI
- Changing maxVoices/stealStrategy while playing calls `stopAll()` silently.
- Fix: Debounce or show transient status message.

#### M6: LFO canvas may render as empty rectangle on hydration
- **file:** LFODemo.vue:380-383 | **lens:** UX/UI
- `drawStaticWaveform()` in `onMounted` reads width before layout.
- Fix: Use `nextTick()` + ResizeObserver fallback.

#### M7: PianoKeyboard tabindex creates 12-step Tab trap
- **file:** PianoKeyboard.vue:197-199 | **lens:** UX/UI
- Every key has `tabindex="0"`. Screen reader users must Tab through all 12.
- Fix: Roving tabindex pattern with arrow-key navigation.

#### M8: PianoKeyboard role="button" keys don't respond to Space/Enter
- **file:** PianoKeyboard.vue:199 | **lens:** UX/UI
- Keys have `role="button"` but no keyboard activation handler.
- Fix: Add `@keydown.space`/`@keydown.enter` handlers on key elements.

#### M9: Bypass button label is ambiguous state vs action
- **file:** EffectsChainDemo.vue:306-335 | **lens:** UX/UI
- "Active"/"Bypassed" describes state, not action.
- Fix: Use "Bypass"/"Enable" to describe the action that will occur on click.

#### M10: Signal flow diagram wraps on mobile, breaking visual metaphor
- **file:** EffectsChainDemo.vue:281-295 | **lens:** UX/UI
- `flex-wrap` causes arrows to break mid-chain.
- Fix: `overflow-x: auto` with `flex-wrap: nowrap`.

#### M11: Bypassed effect card hides parameters instead of dimming
- **file:** EffectsChainDemo.vue:598-600 | **lens:** UX/UI
- `v-if="!entry.bypassed"` removes parameters. Card shrinks to just header.
- Fix: Keep params visible but visually dimmed.

#### M12: Reorder buttons have no tooltip or affordance
- **file:** EffectsChainDemo.vue:319-333 | **lens:** UX/UI
- `↑ ↓` buttons with no label — could mean scroll, collapse, or adjust.
- Fix: Add title tooltips and visual handle glyph.

#### M13: GrainPlayer crosshair cursor on unloaded canvas
- **file:** GrainPlayerDemo.vue:18-21 | **lens:** UX/UI
- Crosshair implies interactivity before waveform loads.
- Fix: `cursor: default` until waveform loaded.

#### M14: GrainPlayer Overlap slider silently clamped
- **file:** GrainPlayerDemo.vue:63 | **lens:** UX/UI
- Slider max dynamically bound to grain size. Thumb jumps without feedback.
- Fix: Show inline message when clamp fires.

#### M15: GrainPlayer preset buttons have no active state
- **file:** GrainPlayerDemo.vue:75-81 | **lens:** UX/UI
- No indication which preset is active.
- Fix: Track `activePreset` ref, apply active class.

#### M16: TransportSequencer Play/Pause buttons swap via v-if causing layout shift
- **file:** TransportSequencerDemo.vue:435-457 | **lens:** UX/UI
- Buttons insert/remove from DOM, shifting layout.
- Fix: Single button with reactive label, fixed min-width.

#### M17: TransportSequencer M/S buttons too small for touch
- **file:** TransportSequencerDemo.vue:817-820 | **lens:** UX/UI
- ~14×14px touch targets, well below 44×44px minimum.
- Fix: Increase padding to reach ≥32px height.

#### M18: TransportSequencer position display has no label
- **file:** TransportSequencerDemo.vue:459-461 | **lens:** UX/UI
- Shows "1:1" with no indication it means bar:beat.
- Fix: Add "Bar : Beat" label or tooltip.

#### M19: TransportSequencer playhead is per-cell outline, not column
- **file:** TransportSequencerDemo.vue:889-905 | **lens:** UX/UI
- Yellow outline on individual cells, not a spanning vertical line.
- Fix: Add absolutely-positioned vertical bar spanning all tracks.

#### M20: LFO oscillator at 330 Hz instead of standard reference
- **file:** LFODemo.vue:117 | **lens:** Musical/Audio
- 330 Hz ≈ E4 is arbitrary. Standard A4=440 Hz would help musicians orient.
- Fix: Use 440 Hz or 261.63 Hz (middle C).

#### M21: Filter sweep depth can drive cutoff below 0 Hz
- **file:** LFODemo.vue:50-51 | **lens:** Musical/Audio
- Max sweep 2000 Hz on base 1500 Hz → potential negative frequency clamping.
- Fix: Constrain max depth to base frequency or raise base.

#### M22: Compressor demo omits attack/release parameters
- **file:** EffectsChainDemo.vue:23-27 | **lens:** Musical/Audio
- Only threshold and ratio exposed. Attack/release are the most musically impactful.
- Fix: Add attack (0.001-0.5s) and release (0.01-1.0s) sliders.

#### M23: Effects oscillator source saturates compressor at defaults
- **file:** EffectsChainDemo.vue:134 | **lens:** Musical/Audio
- 220 Hz sawtooth at 0.3 gain is always above -24 dB threshold.
- Fix: Use 440 Hz sine at 0.15 gain, or add source gain control.

#### M24: "Freeze" preset not frozen enough
- **file:** GrainPlayerDemo.vue:337 | **lens:** Musical/Audio
- grainSize=0.15, jitter=0.15 creates wandering texture, not a true freeze.
- Fix: Use overlap near grain size (0.19) and near-zero jitter (0.02).

#### M25: "Choppy" preset grains too short for tonal material
- **file:** GrainPlayerDemo.vue:335 | **lens:** Musical/Audio
- 20ms grains can't complete one cycle below 500 Hz → spectral artifacts.
- Fix: Increase to 40ms grainSize.

#### M26: "Straight Rock" piano bar 2 has Csus2 against E minor bass
- **file:** TransportSequencerDemo.vue:65-67 | **lens:** Musical/Audio
- C→D→G piano clashes with E minor/A bass implied harmony.
- Fix: Use C→E→G for clean C major arpeggio.

#### M27: EffectsChain chainOrder initialized with null effects typed as any
- **file:** EffectsChainDemo.vue:38-43 | **lens:** Architecture
- `effect: null as any` until ensureLoaded patches them.
- Fix: Initialize as empty array, populate in ensureLoaded.

#### M28: EffectsChain 11 individual watch() calls for parameter sync
- **file:** EffectsChainDemo.vue:49-92 | **lens:** Architecture
- Could be a single watchEffect block.
- Fix: Consolidate to one watchEffect or deep-watch a config object.

#### M29: Canvas static/animated drawing paths share no code
- **file:** LFODemo.vue:319-370, GrainPlayerDemo.vue:191-223 | **lens:** Architecture
- Duplicate drawing logic with visual discrepancies (e.g., globalAlpha mismatch).
- Fix: Unify behind a single draw(animated) function.

#### M30: TransportSequencer casts (transport as any).audioContext
- **file:** TransportSequencerDemo.vue:297 | **lens:** Architecture + Content
- Reaches into internal property. Published in docs code example too.
- Fix: Expose audioContext publicly in library or compute time via Transport method.

#### M31: GrainPlayer inconsistent container styling
- **file:** GrainPlayerDemo.vue:365-370 | **lens:** Architecture
- No border/background card. Other demos use bordered cards.
- Fix: Match EffectsChainDemo styling pattern.

#### M32: PianoKeyboard unused startNote/endNote props
- **file:** PianoKeyboard.vue:6-13,43-55 | **lens:** Architecture
- Props accepted but completely ignored. allNotes hardcoded.
- Fix: Remove unused props or implement dynamic generation.

#### M33: PolySynth intro doesn't explain polyphony
- **file:** polysynth.md:8 | **lens:** Content/Copy
- Jumps to "play chords" with no definition of voice allocation.
- Fix: Add one sentence defining polyphony in plain terms.

#### M34: voicestolen event payload undocumented in code example
- **file:** polysynth.md:44-53 | **lens:** Content/Copy
- `event.detail` used but properties never documented.
- Fix: Add inline comment or table showing payload shape.

#### M35: LFO code example omits cleanup/lifecycle
- **file:** lfo-modulation.md:33-38 | **lens:** Content/Copy
- No stop/cleanup shown. Other pages address lifecycle.
- Fix: Add lfo.stop()/oscillator.stop() with recommended stop order.

#### M36: GrainPlayer title/heading mismatch
- **file:** grainplayer.md:1-7 | **lens:** Content/Copy
- Frontmatter title: "GrainPlayer - Granular Synthesis" vs H1: "GrainPlayer".
- Fix: Align title and heading.

#### M37: Sidebar "Granular" group has only one entry
- **file:** config.mts:199-210 | **lens:** Content/Copy
- Single-item section looks like a placeholder.
- Fix: Move to "Synthesis" group or rename to "Granular Synthesis."

#### M38: Missing cross-reference links to guide pages
- **file:** lfo-modulation.md, grainplayer.md, effects-chain.md, transport-sequencer.md | **lens:** Content/Copy
- Only polysynth.md links to its guide page. Others don't.
- Fix: Add "Further Reading" section linking to guide pages.

---

### Low Findings

#### L1: Volume warning banners inconsistent across demos (3 different styles, GrainPlayer has none)
#### L2: PolySynth ADSR preset buttons have no active state indicator
#### L3: LFO Play button buried below canvas and tab bar
#### L4: PolySynth Release slider max 3s too short for pads (should be 5-8s)
#### L5: Pad preset release=1.0s is short for pad character (should be 2.5-3.0s)
#### L6: PianoKeyboard black key labels use sharps while note names use flats (inconsistent notation)
#### L7: PianoKeyboard stops at B4 — missing high C5 to complete octave
#### L8: lib typed as `any` in 3 of 5 demos (PolySynth correctly types it)
#### L9: PolySynth RAF voice count poll runs perpetually from mount
#### L10: GrainPlayer presets object reallocated on every applyPreset call
#### L11: Effect delay mix default 0.5 is too wet for first impression
#### L12: GrainPlayer speed slider min=0 duplicates Freeze preset
#### L13: EQ mid-band Q=0.7 is extremely wide, not exposed in demo
#### L14: GrainPlayer pitch "st" abbreviation is ambiguous
#### L15: LFO DPR ctx.scale vs ctx.setTransform inconsistency
#### L16: TransportSequencer bar/beat labels too small and low-contrast
#### L17: TransportSequencer M/S button colors hardcoded, won't adapt to dark/light mode
#### L18: EffectsChain button styles use overly broad element selector
#### L19: EffectsChain status-bar reserves space with no idle content
#### L20: M7 page frontmatter titles missing SEO keywords (vs existing pages' expanded titles)
#### L21: Transport-sequencer "Key API" table heading should be "Demo Controls"
#### L22: PolySynth code example return type not annotated
#### L23: Em dash vs double-hyphen inconsistency across pages
#### L24: GrainPlayer code example pitch=7 doesn't explain semitone unit
#### L25: No visual mapping between keyboard shortcuts (A-J) and piano keys (C-B)
#### L26: PianoKeyboard mouseUp edge case with drag-between-keys
#### L27: EffectsChain volume warning non-dismissible
#### L28: Effects chain signal flow comment lacks educational "why"

---

### Structural Patterns

#### Pattern: Demo Resource Cleanup Inconsistency
- **Symptoms:** C1 (TransportSequencer missing dispose), C2 (EffectsChain missing source dispose), L9 (PolySynth perpetual RAF)
- **Root cause:** No shared cleanup pattern. Each demo implements its own onUnmounted with different levels of thoroughness.
- **Instance-level fix:** Add missing dispose/stop calls in each demo individually.
- **Structural fix:** Extract a `useAudioCleanup()` composable that registers disposable resources and handles cleanup on unmount.
- **Recommendation:** Instance fixes are sufficient for now — these are demo components, not production code. The 5 demos share patterns but extracting composables is premature unless more demos are planned.

#### Pattern: Demo Audio Init Duplication
- **Symptoms:** H4 duplicate ensureLoaded (5 copies), M27 null-typed effects, L8 any-typed lib
- **Root cause:** Each demo independently implements the same init guard with slight inconsistencies.
- **Instance-level fix:** Fix each individually.
- **Structural fix:** Extract `useAudioLib()` composable returning `{ lib, ensureLoaded, initialized, error }`.
- **Recommendation:** Instance fixes are sufficient — composable extraction is a nice-to-have but not blocking.

---

### Proposed Action Plan (Parallel-Optimized)

> **Parallel strategy:** Groupings are organized by file ownership so all 6 can run simultaneously without merge conflicts. Each grouping touches a different file (or set of non-overlapping files).

---

**WAVE 1 — All 6 groupings run in parallel:**

#### Grouping A: LFODemo — Musical Calibration + UX
- **Goal:** Make LFO demo sound musically convincing and improve UX
- **Findings addressed:**
  - H5: Rate mapping midpoint too low (high)
  - H6: Tremolo depth too subtle (high)
  - H7: Vibrato depth too wide (high)
  - H8: Wah Pedal wrong filter type (high)
  - H9: Preset rates off-target (high)
  - M2: Depth slider shows raw % regardless of tab (medium)
  - M3: Waveform buttons have no text labels (medium)
  - M6: Canvas may render empty on hydration (medium)
  - M20: Oscillator at non-standard frequency (medium)
  - M21: Filter sweep depth can go negative (medium)
  - M29: Canvas static/animated drawing paths share no code (medium) — LFO side only
  - L3: Play button buried below canvas (low)
  - L8: lib typed as any (low)
  - L15: DPR ctx.scale vs ctx.setTransform inconsistency (low)
- **Fix approach:** Instance fixes — tune parameter ranges, preset values, add labels, fix canvas
- **Scope:** LFODemo.vue
- **Effort:** medium
- **Dependencies:** none

#### Grouping B: TransportSequencerDemo — Musical + UX + Resource Leak
- **Goal:** Fix musically incorrect presets, make sequencer usable, fix resource leak
- **Findings addressed:**
  - C1: BeatTrack/Sequence not disposed on unmount (critical, blocking)
  - H2: Preset before init causes audio/visual desync (high, blocking)
  - H3: Triplet Feel hi-hat is straight 8ths (high, blocking)
  - H4: Triplet quantization with ticksPerBeat:4 (high, blocking)
  - H11: Read-only grid with no indication (high)
  - H12: Grid overflows, track labels scroll away (high)
  - H16: Track labels hardcoded timing annotations (high)
  - H19: Bass oscillator raw sawtooth (high)
  - M16: Play/Pause layout shift (medium)
  - M17: M/S buttons too small for touch (medium)
  - M18: Position display unlabeled (medium)
  - M19: Playhead not column-spanning (medium)
  - M26: Bar 2 piano harmony clash (medium)
  - M30: (transport as any).audioContext cast (medium)
  - L16: Bar/beat labels too small (low)
  - L17: M/S button colors hardcoded (low)
  - L21: "Key API" table should be "Demo Controls" (low)
- **Fix approach:** Instance fixes — fix patterns, increase tick resolution, add dispose, fix UX
- **Scope:** TransportSequencerDemo.vue
- **Effort:** large
- **Dependencies:** Verify Sequence API handles ticksPerBeat:12

#### Grouping C: EffectsChainDemo — UX + Musical + Resource Leak
- **Goal:** Make effects chain intuitive, educational, and fix resource leak
- **Findings addressed:**
  - C2: currentSource not disposed on unmount (critical, blocking)
  - H14: moveEffect dead before Play (high)
  - H15: Bypass may not truly disconnect (high)
  - M9: Bypass button label ambiguous (medium)
  - M10: Signal flow diagram wraps on mobile (medium)
  - M11: Bypassed card hides parameters (medium)
  - M12: Reorder buttons no affordance (medium)
  - M22: Compressor missing attack/release (medium)
  - M23: Oscillator saturates compressor (medium)
  - M27: chainOrder initialized with null as any (medium)
  - M28: 11 individual watch() calls (medium)
  - L11: Delay mix default too wet (low)
  - L18: Button styles overly broad selector (low)
  - L19: Status-bar reserves space with no idle content (low)
  - L27: Volume warning non-dismissible (low)
  - L28: Signal flow comment lacks educational "why" (low)
- **Fix approach:** Instance fixes — add dispose, fix bypass, improve UX, add compressor params
- **Scope:** EffectsChainDemo.vue
- **Effort:** large
- **Dependencies:** Verify library's bypass setter behavior

#### Grouping D: GrainPlayerDemo — Touch Fix + Polish
- **Goal:** Fix mobile interaction, visual consistency, and preset accuracy
- **Findings addressed:**
  - H1: Missing touchend handler — mobile broken (high, blocking)
  - H10: Hardcoded dark colors break light mode (high)
  - M13: Crosshair on unloaded canvas (medium)
  - M14: Overlap slider silently clamped (medium)
  - M15: No active preset indicator (medium)
  - M24: Freeze preset not frozen enough (medium)
  - M25: Choppy preset grains too short (medium)
  - M29: Canvas static/animated drawing code duplication (medium) — GrainPlayer side
  - M31: Inconsistent container styling (medium)
  - L10: Presets object reallocated on every call (low)
  - L12: Speed slider min=0 duplicates Freeze (low)
  - L14: Pitch "st" abbreviation ambiguous (low)
- **Fix approach:** Instance fixes — add touchend, fix colors, tune presets, clean up canvas
- **Scope:** GrainPlayerDemo.vue
- **Effort:** medium
- **Dependencies:** none

#### Grouping E: PianoKeyboard + PolySynth — A11y + Touch + Polish
- **Goal:** Fix keyboard a11y, touch limitations, and PolySynth UX
- **Findings addressed:**
  - H13: Global key listeners trigger on search (high)
  - M1: Single-touch limitation (medium)
  - M4: ADSR grid collapses awkwardly (medium)
  - M5: recreateSynth silences held notes (medium)
  - M7: Tab trap through 12 keys (medium)
  - M8: role="button" keys don't respond to keyboard (medium)
  - M32: Unused startNote/endNote props (medium)
  - L1: Volume warning inconsistent (low) — PolySynth side
  - L2: ADSR preset buttons no active state (low)
  - L4: Release slider max too short (low)
  - L5: Pad preset release too short (low)
  - L6: Black key label notation inconsistent (low)
  - L7: Missing high C5 (low)
  - L9: RAF voice count poll perpetual (low)
  - L25: No keyboard shortcut visual mapping (low)
  - L26: mouseUp edge case with drag (low)
- **Fix approach:** Instance fixes
- **Scope:** PianoKeyboard.vue + PolySynthDemo.vue (no overlap with other groupings)
- **Effort:** medium
- **Dependencies:** none

#### Grouping F: Content/Docs Pages
- **Goal:** Bring M7 docs to parity with existing pages
- **Findings addressed:**
  - H17: Effects Chain page bare (high)
  - H18: Missing LLM fallback tags on all 5 pages (high)
  - M33: PolySynth intro missing (medium)
  - M34: voicestolen payload undocumented (medium)
  - M35: LFO cleanup not shown (medium)
  - M36: GrainPlayer title mismatch (medium)
  - M37: Sidebar Granular group single entry (medium)
  - M38: Missing guide cross-references (medium)
  - L20: SEO titles missing keywords (low)
  - L22: PolySynth code example return type (low)
  - L23: Em dash inconsistency (low)
  - L24: GrainPlayer pitch semitone unit (low)
- **Fix approach:** Instance fixes
- **Scope:** All 5 .md files + config.mts (no overlap with Vue component groupings)
- **Effort:** medium
- **Dependencies:** none

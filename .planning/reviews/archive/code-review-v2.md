# Comprehensive Code Review — Pre-1.0.0 Final Check

**Date:** 2026-02-20
**Scope:** Full project — library source, tests, docs site, demo components, package quality
**Goal:** Catch everything that matters before 1.0.0: API correctness, missing exports, bugs, test gaps, doc accuracy, demo quality, and release readiness

---

## Context

The library is at v1.0.0 (published or about to be). The last review (Phase 23) focused on runtime bugs in demo Vue components. This review is broader and deeper — the final gate before we're locked into a public API contract.

Key questions this review must answer:
- Is the public API surface correct, complete, and ergonomic?
- Are there bugs, race conditions, or edge cases that will bite early adopters?
- Is test coverage thorough enough to catch regressions?
- Are docs accurate and compelling enough that developers can succeed without hand-holding?
- Is the package ready for npm (README, exports, types, keywords)?

The `src/app/` directory is a legacy vanilla JS demo app — **ignore it entirely**. Focus is `src/` (library) and `docs/` (VitePress site).

---

## How to Execute

Launch **7 agents in parallel** in a single message. Each agent reads its assigned files and writes findings to its output file. After all complete, consolidate into `REVIEW-FINDINGS.md`.

```
Task(subagent_type="code-reviewer", ...) × 7 in parallel
```

---

## Agent 1: Core Sound System Review

**Focus:** The class hierarchy that forms the backbone of the library — BaseSound through its subclasses, plus the audio context lifecycle.

**Prompt:**
```
Review the core sound system of the ez-web-audio library for correctness, API quality, and edge cases.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Read these files in order:
- src/index.ts (public API surface — scan for how these classes are exposed)
- src/audio-context.ts (AudioContext lifecycle — critical for correctness)
- src/base-sound.ts (abstract base — every sound type inherits from this)
- src/sound.ts (one-shot playback)
- src/track.ts (music playback with pause/resume/seek)
- src/oscillator.ts (synthesis)
- src/sampler.ts (round-robin playback)
- src/sampled-note.ts (note with musical identity)
- src/musical-identity.ts (MusicallyAware mixin)
- src/note.ts (Note class)
- src/envelope.ts (ADSR envelope)
- src/interfaces/connectable.ts
- src/interfaces/playable.ts

Review focus areas:

1. **Audio context lifecycle**: Is the lazy creation + iOS workaround + unlock flow robust? What happens if AudioContext is closed or interrupted mid-playback? Are there race conditions between initAudio() and factory functions?

2. **BaseSound correctness**: Does the connection chain (source → filters → effects → gain → pan → destination) handle all edge cases? What happens when you add/remove effects mid-playback? Is cleanup thorough (no leaked AudioNodes)?

3. **Sound vs Track**: Is the distinction clear and correct? Does Track's pause/resume/seek handle edge cases (seek past end, pause when stopped, resume when not paused)?

4. **Oscillator**: Does playFor() handle envelope + stop correctly? Are filter options validated? Does the oscillator clean up properly after stop?

5. **Sampler**: Does round-robin work correctly at boundaries? What if sounds array is empty?

6. **Musical identity**: Is the MusicallyAware mixin type-safe? Does frequency lookup handle edge cases (missing notes, enharmonic equivalents)?

7. **Memory management**: Are AudioNodes properly disconnected on stop? Are there potential memory leaks from event listeners or closures?

8. **Error handling**: Are errors thrown with useful messages? Are edge inputs (empty strings, negative values, NaN) handled?

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent1-core.md`

Format each issue as:
## [SEVERITY] Issue Title
**File:** src/file.ts:line
**Category:** Bug | Race Condition | Memory Leak | Edge Case | API Design | Error Handling
**Description:** What's wrong or risky
**Suggestion:** Concrete fix

Severity: CRITICAL (breaks things or data loss), HIGH (significant problem for users), MEDIUM (notable improvement), LOW (minor polish)
```

---

## Agent 2: Feature Modules & Infrastructure Review

**Focus:** The higher-level features built on the core system, plus effects, controllers, and utilities.

**Prompt:**
```
Review the feature modules, effects system, controllers, and utilities of ez-web-audio for correctness, API quality, and completeness.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Read these files:

Feature modules:
- src/beat.ts
- src/beat-track.ts
- src/sprite.ts (AudioSprite)
- src/font.ts (soundfont loading)
- src/layered-sound.ts
- src/analyzer.ts
- src/preload.ts

Effects system:
- src/effects/index.ts
- src/effects/effect-wrapper.ts
- src/effects/filter-effect.ts
- src/effects/gain-effect.ts

Controllers:
- src/controllers/base-param-controller.ts
- src/controllers/sound-controller.ts
- src/controllers/oscillator-controller.ts

Utilities:
- src/utils/crossfade.ts
- src/utils/equal-power-crossfade.ts
- src/utils/play-together.ts
- src/utils/timeout.ts (audioContextAwareTimeout)
- src/utils/collections.ts (playAll, stopAll, pauseAll)
- src/utils/array-methods.ts
- src/utils/create-time-object.ts
- src/utils/prop-access.ts
- src/utils/within-range.ts
- src/utils/exponential-ratio.ts
- src/utils/zeroify.ts
- src/utils/decode-base64.ts
- src/utils/note-methods.ts

Errors & events:
- src/errors/audio-error.ts
- src/errors/context-error.ts
- src/errors/load-error.ts
- src/errors/invalid-note-error.ts
- src/errors/index.ts
- src/events/event-types.ts
- src/debug/index.ts
- src/debug/logger.ts
- src/debug/messages.ts

Also read src/index.ts to understand what's exported.

Review focus areas:

1. **BeatTrack timing**: Is the beat scheduling accurate? Does wrapWith option work correctly with reactive frameworks? What happens when BPM changes mid-playback?

2. **AudioSprite**: Are start/end boundaries precise? What happens with overlapping sprite plays? Does it handle edge cases (sprite name not found, zero-duration segments)?

3. **Font/soundfont**: Is the base64 decoding robust? Error handling for malformed fonts? Performance for large soundfonts?

4. **LayeredSound**: Is layer synchronization truly sample-accurate? Does gain control work correctly per-layer and globally?

5. **Effect system**: Does bypass auto-rewire work correctly? Can effects be added/removed during playback without glitches? Is the chain ordering deterministic?

6. **Controllers (onPlaySet/onPlayRamp)**: Are consume-once semantics correct? What happens if you set multiple onPlaySet for the same parameter? Does the fluent API chain correctly in all cases?

7. **Crossfade**: Is the equal-power curve correct? Does it handle edge cases (same sound, zero duration)?

8. **Preload/cache**: Is the response cache correctly keyed? Are there cache invalidation issues? Memory impact of caching?

9. **Error hierarchy**: Are error classes properly structured? Do they carry enough context for debugging?

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent2-features.md`

Format each issue as:
## [SEVERITY] Issue Title
**File:** src/file.ts:line
**Category:** Bug | Timing | Memory | API Design | Missing Feature | Error Handling
**Description:** What's wrong or risky
**Suggestion:** Concrete fix

Severity: CRITICAL, HIGH, MEDIUM, LOW
```

---

## Agent 3: Test Coverage Audit

**Focus:** Map every source module against its test file(s). Identify untested behaviors, weak assertions, and missing edge case coverage.

**Prompt:**
```
Audit test coverage for the ez-web-audio library. Your job is to find gaps — behaviors that exist in source code but have no corresponding test.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Strategy: For each source module, read the source file first to understand its public API and behaviors, then read its test file to see what's covered. Compare systematically.

Source → Test file pairs to audit:

Core classes:
- src/base-sound.ts → src/base-sound-effects.test.ts, src/base-sound-events.test.ts, src/base-sound-debug.test.ts, src/base-sound-analyzer.test.ts
- src/sound.ts → src/sound.test.ts
- src/track.ts → src/track.test.ts
- src/oscillator.ts → src/oscillator.test.ts
- src/sampler.ts → src/sampler.test.ts
- src/sampled-note.ts → src/sampled-note.test.ts

Feature modules:
- src/beat.ts → src/beat.test.ts
- src/beat-track.ts → src/beat-track.test.ts
- src/sprite.ts → src/sprite.test.ts
- src/font.ts → src/font.test.ts
- src/layered-sound.ts → src/layered-sound.test.ts
- src/analyzer.ts → src/analyzer.test.ts
- src/envelope.ts → src/envelope.test.ts
- src/preload.ts → src/preload.test.ts

Effects & controllers:
- src/effects/effect-wrapper.ts → src/effects/effect-wrapper.test.ts
- src/effects/filter-effect.ts → src/effects/filter-effect.test.ts
- src/effects/gain-effect.ts → src/effects/gain-effect.test.ts
- src/controllers/base-param-controller.ts → src/controllers/base-param-controller.test.ts
- src/controllers/sound-controller.ts → src/controllers/sound-controller.test.ts
- src/controllers/oscillator-controller.ts → src/controllers/oscillator-controller.test.ts

Utilities:
- src/utils/crossfade.ts → src/utils/crossfade.test.ts
- src/utils/collections.ts → src/utils/collections.test.ts
- src/utils/create-time-object.ts → src/utils/create-time-object.test.ts
- src/utils/prop-access.ts → src/utils/prop-access.test.ts
- src/utils/within-range.ts → src/utils/within-range.test.ts
- src/utils/array-methods.ts → src/utils/array-methods.test.ts
- src/utils/zeroify.ts → src/utils/zeroify.test.ts
- src/utils/decode-base64.ts → src/utils/decode-base64.test.ts
- src/utils/note-methods.ts → src/utils/note-methods.test.ts
- src/utils/exponential-ratio.ts → src/utils/exponential-ratio.test.ts
- src/utils/frequency-map.ts → src/utils/frequency-map.test.ts

Other:
- src/musical-identity.ts → src/musical-identity.test.ts
- src/note.ts → src/note.test.ts
- src/errors/*.ts → src/errors/error-classes.test.ts
- src/debug/*.ts → src/debug/debug.test.ts
- src/index.ts → src/index.test.ts

Cross-cutting tests (read these too):
- src/integration.test.ts
- src/concurrent.test.ts

Also check for files with NO test coverage:
- src/audio-context.ts — does it have tests?
- src/events/event-types.ts — are event types tested anywhere?
- src/utils/play-together.ts — does a test file exist?
- src/utils/timeout.ts — does a test file exist?
- src/utils/equal-power-crossfade.ts — does a test file exist?

For each module, assess:
- What key behaviors ARE tested?
- What behaviors are NOT tested that should be?
- Are error paths (throws, invalid inputs) tested?
- Are edge cases covered (empty arrays, boundary values, concurrent usage)?
- Are assertions strong (checking specific values) or weak (just checking no throw)?

High-priority gaps to specifically look for:
1. AudioSprite — sprite boundary precision, overlapping plays, missing sprite name
2. LayeredSound — layer sync, per-layer gain, add/remove layers
3. BeatTrack — timing accuracy, wrapWith reactive wrapper, BPM changes, pattern changes during playback
4. onPlaySet/onPlayRamp — consume-once semantics, multiple schedulings, interaction with play()
5. Effect bypass — auto-rewire on bypass toggle, effect ordering
6. Crossfade — equal-power curve accuracy, edge cases
7. Track — seek edge cases, pause/resume state machine
8. Error messages — do tests verify error message content is useful?

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent3-tests.md`

Format:
## Module: [source-file.ts]
**Test file(s):** [test files]
**Coverage assessment:** Good | Partial | Weak | None
**Tested behaviors:** (brief list)
**Missing scenarios:**
- Description → what a test should verify
**Priority:** HIGH (core behavior untested) | MEDIUM (edge case) | LOW (nice to have)
```

---

## Agent 4: Documentation & Guides Review

**Focus:** Accuracy, completeness, and quality of all documentation. Cross-reference docs against the actual API.

**Prompt:**
```
Review the VitePress documentation site for ez-web-audio. Your primary job is to catch incorrect examples, missing documentation, and gaps that would frustrate new users.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Files to read:

Guides & homepage:
- docs/index.md (homepage — first impression)
- docs/guide/getting-started.md
- docs/guide/concepts.md

Examples (all of them):
- docs/examples/index.md
- docs/examples/basic-playback.md
- docs/examples/synthesis.md
- docs/examples/effects.md
- docs/examples/timing.md
- docs/examples/visualization.md
- docs/examples/drum-machine.md
- docs/examples/drum-machine-vanilla.md
- docs/examples/drum-machine-vue.md
- docs/examples/synth-keyboard.md
- docs/examples/synth-drum-kit.md
- docs/examples/sampled-drum-kit.md
- docs/examples/soundfont-piano.md
- docs/examples/xy-pad.md
- docs/examples/audio-routing.md
- docs/examples/ambient-generator.md

Navigation:
- docs/.vitepress/config.mts

Cross-reference:
- src/index.ts (the actual public API — compare against what docs cover)

API reference (spot-check a few for accuracy):
- docs/api/index.md
- docs/api/classes/Sound.md
- docs/api/classes/Track.md
- docs/api/classes/BeatTrack.md
- docs/api/functions/createSound.md
- docs/api/functions/createOscillator.md

Review focus areas:

1. **Code example correctness** (MOST IMPORTANT):
   - Current API uses `.as('ratio' | 'percent' | 'inverseRatio')` — NOT `.as('number')` or `.from('ratio')`
   - Effect factories are context-free: `createFilterEffect('lowpass', {...})` — NOT `createFilterEffect(ctx, ...)`
   - `.as()` not `.from()` on update/seek chains (EXCEPT `onPlayRamp().from()` which sets start value)
   - No `connections` API references (was removed in breaking changes)
   - `createAnalyzer()` takes AudioContext as first parameter
   - Imports should use 'ez-web-audio' not relative paths
   - Check EVERY code block in EVERY file for accuracy

2. **Completeness gap analysis**: Cross-reference src/index.ts exports against docs coverage.
   Every public export should have at least one example somewhere. Flag missing coverage for:
   - AudioSprite / createSprite
   - LayeredSound / createLayeredSound
   - createWhiteNoise
   - crossfade utility
   - playTogether utility
   - Preload utilities (preload, isPreloaded, clearPreloadCache)
   - Debug utilities (setDebugMode, setDebugHandler)
   - useInteractionMethods / preventEventDefaults
   - ControlTypeMap module augmentation
   - Envelope class and options
   - Error classes
   - Event types

3. **Getting Started quality**: Can a developer go from `npm install` to hearing audio in under 5 minutes with the getting started guide? Is the path clear?

4. **Concepts guide**: Does it explain the mental model well? Connection chain, factory functions, AudioContext lifecycle, iOS requirements?

5. **Homepage**: Does it clearly communicate value proposition, show a compelling code snippet, and direct users to the right place?

6. **Navigation**: Is the sidebar well-organized? Can users find what they need?

7. **Missing guides**: Would any of these be valuable? "Working with Effects", "iOS & Mobile Audio", "Framework Integration (Vue/React/Svelte)", "Building a Music Player"

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent4-docs.md`

Format:
## [SEVERITY] Finding Title
**Location:** docs/file.md:line (or "Navigation" or "Homepage" or "Missing Page")
**Category:** Incorrect Example | Missing Documentation | Guide Gap | Navigation | Completeness
**Description:** What's wrong or missing
**Suggestion:** Concrete improvement
```

---

## Agent 5: Demo Components Review

**Focus:** Quality, correctness, UX, and accessibility of all interactive Vue demo components.

**Prompt:**
```
Review all VitePress demo Vue components for ez-web-audio. These are the live interactive examples embedded in the docs site — they're the library's showroom.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Files to read (ALL of these):
- docs/.vitepress/theme/components/AmbientGenerator.vue
- docs/.vitepress/theme/components/AudioDemo.vue
- docs/.vitepress/theme/components/DistortionDemo.vue
- docs/.vitepress/theme/components/DrumMachine.vue
- docs/.vitepress/theme/components/DrumMachineVanilla.vue
- docs/.vitepress/theme/components/DrumMachineVue.vue
- docs/.vitepress/theme/components/FilterDemo.vue
- docs/.vitepress/theme/components/OscillatorDemo.vue
- docs/.vitepress/theme/components/PianoKeyboard.vue
- docs/.vitepress/theme/components/SampledDrumKit.vue
- docs/.vitepress/theme/components/SoundfontPiano.vue
- docs/.vitepress/theme/components/SynthDrumKit.vue
- docs/.vitepress/theme/components/SynthKeyboard.vue
- docs/.vitepress/theme/components/TimingDemo.vue
- docs/.vitepress/theme/components/TrackDemo.vue
- docs/.vitepress/theme/components/VisualizationDemo.vue
- docs/.vitepress/theme/components/XYPad.vue

Also read:
- src/index.ts (to understand the current public API and verify demos use it correctly)

Context: Phase 23 recently fixed 12 bugs across these components. The following are ALREADY FIXED — don't re-report:
- audioContextAwareTimeout exported and used in TimingDemo
- createAnalyzer() receives AudioContext as first parameter
- .as() calls use valid RatioType values (ratio/inverseRatio/percent)
- FilterEffectOptions uses lowercase q
- Effect factories are context-free (wrapEffect(node) not wrapEffect(ctx, node))
- OscillatorDemo freq/gain update in real-time
- XYPad mouseup on document not canvas
- SynthKeyboard release phase fix
- HiDPI canvas scaling for XYPad and VisualizationDemo

Review focus areas:

1. **API correctness**: Any remaining incorrect API usage? Check every import, every function call, every type against src/index.ts.

2. **UX quality**: For each demo, assess:
   - Is there clear visual feedback when loading? When playing? When stopped?
   - Are controls intuitive? Are sliders labeled with current values?
   - Is the initial state obvious (what does the user do first)?
   - Are error states handled gracefully (failed audio load, denied permissions)?

3. **Missing demos**: What important library features have no interactive demo?
   Consider: AudioSprite, LayeredSound, createWhiteNoise+filter combo, crossfade between tracks, preload with progress bar, playTogether, Sound event listeners

4. **Accessibility**:
   - Do buttons have descriptive labels?
   - Can piano keys be played via keyboard?
   - Do sliders have aria-labels and min/max/step attributes?
   - Is color contrast sufficient?
   - Are loading/error states announced to screen readers?

5. **Mobile/touch**:
   - Do touch events work correctly (no ghost clicks, no stuck notes)?
   - Are touch targets large enough (44px minimum)?
   - Does the layout work on narrow screens?

6. **Code quality**:
   - Are there unnecessary watchers or computed properties?
   - Is cleanup done properly in onUnmounted? (Stop sounds, disconnect nodes, remove event listeners)
   - Are there Vue 3 anti-patterns?

7. **Resource cleanup**: Do components properly clean up audio resources when unmounted? This matters for SPA navigation — leaked AudioNodes will accumulate.

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent5-demos.md`

Format:
## [SEVERITY] Issue Title
**Component:** ComponentName.vue:line (or "Missing Component")
**Category:** Bug | UX | Missing Demo | A11y | Mobile | Code Quality | Cleanup
**Description:** What's wrong or missing
**Suggestion:** Concrete fix
```

---

## Agent 6: Package Quality & Release Readiness

**Focus:** Everything a developer sees before they write code — npm listing, README, package config, TypeScript integration, CI pipeline.

**Prompt:**
```
Review the package quality and release readiness of ez-web-audio for its 1.0.0 release.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Files to read:
- README.md (CRITICAL — this is the npm landing page)
- package.json
- CHANGELOG.md
- tsconfig.json
- vite.config.ts
- .github/workflows/deploy-docs-site.yml
- .github/workflows/publish.yml
- src/index.ts (the public API surface — every export)

Review focus areas:

1. **README** (HIGHEST PRIORITY):
   - Is it compelling? Does it sell the library?
   - Does it show a quick code example that demonstrates value?
   - Does it link to docs, API reference, and examples?
   - Does it mention key features (synthesis, drum machines, sprites, effects, soundfonts)?
   - IMPORTANT: Check if it still says "WORK IN PROGRESS" or anything that contradicts a 1.0 release
   - Compare against best-in-class library READMEs (howler.js, tone.js)

2. **package.json**:
   - Is `exports` field correct for ESM + types?
   - Is CJS intentionally omitted? If so, is that documented?
   - Are `keywords` comprehensive? (should include: sound, music, drum machine, synthesizer, soundfont, audio sprite, beat, rhythm, Web Audio API, effects, filter, equalizer)
   - Is `sideEffects: false` present for tree-shaking?
   - Is `files` field correct (not shipping source or test files)?
   - Is `engines` field set if there's a Node.js minimum?
   - Is `homepage` set to the docs site URL?
   - Is `bugs` URL set?

3. **TypeScript experience** (critical for DX):
   - Read through ALL exports in src/index.ts
   - Flag any public types that are NOT exported (users need these to type their variables)
   - Specifically check: TimeObject, BeatTrackOptions, SamplerOptions, RatioType, SoundController, OscillatorController
   - Are there `any` types in the public API?
   - Does the library export enough types for full type-safe usage?

4. **Build configuration**:
   - Does vite.config produce correct output?
   - Are source maps included in the dist?
   - Is the bundle size reasonable?

5. **CI pipeline**:
   - Does publish workflow run tests before publishing?
   - Is there a lint check in CI?
   - Is there a typecheck in CI?
   - Does docs deployment work correctly?

6. **CHANGELOG**:
   - Does it accurately list all breaking changes for 1.0.0?
   - Is there a migration guide from pre-1.0 usage?
   - Are all new features documented?

7. **JSDoc quality** (spot-check):
   - Read through src/index.ts JSDoc comments on all factory functions
   - Are examples accurate and using current API?
   - Do they demonstrate common use patterns?
   - Would a developer get value from IntelliSense hover without opening docs?

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent6-package.md`

Format:
## [SEVERITY] Finding Title
**Category:** README | Package Config | TypeScript | Build | CI | CHANGELOG | JSDoc
**Description:** What's wrong or missing
**Suggestion:** Concrete improvement
```

---

## Agent 7: E2E Tests & Cross-Cutting Concerns

**Focus:** E2E test coverage, integration patterns, and cross-cutting concerns that no single module review would catch.

**Prompt:**
```
Review the E2E tests, integration tests, and cross-cutting concerns for the ez-web-audio library.

Working directory: /Users/seth/Documents/GitHub/ez-audio

Files to read:

E2E tests:
- e2e/demos.spec.ts
- e2e/navigation.spec.ts

Integration/concurrent unit tests:
- src/integration.test.ts
- src/concurrent.test.ts

Playwright config (look for it):
- Search for playwright.config.ts or playwright.config.js at the project root

Also read these for context on what's being tested:
- docs/.vitepress/config.mts (navigation structure — does E2E test all routes?)
- src/index.ts (public API — are integration tests covering real-world workflows?)

Review focus areas:

1. **E2E coverage**:
   - Does demos.spec.ts test ALL 17 demo components?
   - For each demo, does it test: initialization, basic interaction, and cleanup?
   - Are there smoke tests for audio playback (at minimum, verifying no JS errors)?
   - Is navigation.spec.ts testing all sidebar routes?

2. **E2E gaps**: What demo interactions are NOT tested?
   - Drum machine: start/stop, toggle beats, change BPM
   - Piano/keyboard: key press, note plays
   - Visualization: canvas renders
   - Effects: parameter changes
   - Track: play/pause/seek

3. **Integration test quality**:
   - Do integration tests cover real-world workflows (load sound → add effect → play → stop)?
   - Are multi-module interactions tested (e.g., BeatTrack with effects, Sampler with crossfade)?
   - Do concurrent tests verify that multiple sounds can play simultaneously without interference?

4. **Cross-cutting concerns** (things that fall between module boundaries):
   - AudioContext sharing: Do all factory functions use the same AudioContext?
   - Cleanup patterns: Is there a consistent way to clean up all resources?
   - Error propagation: Do errors from deep modules (decode, network) surface correctly through factory functions?
   - Event system: Are events (play, stop, end) tested across different sound types?

5. **Playwright configuration**:
   - Is it configured for Chromium only (as noted in memory)?
   - Are there timeout settings appropriate for audio loading?
   - Is there a way to test on mobile viewports?

Output: Write findings to `/Users/seth/Documents/GitHub/ez-audio/.planning/review-agent7-e2e.md`

Format:
## [SEVERITY] Finding Title
**Category:** E2E Gap | Integration Gap | Cross-Cutting | Config
**Description:** What's wrong or missing
**Suggestion:** Concrete improvement (including example test code where helpful)
```

---

## After All Agents Complete

**Step 8: Consolidate findings**

Read all 7 agent output files and write a master findings document:

```
/Users/seth/Documents/GitHub/ez-audio/.planning/REVIEW-FINDINGS.md
```

Structure:
```markdown
# Code Review Findings — Pre-1.0.0 Final Check

## Summary
{N critical, N high, N medium, N low issues across 7 review areas}

## Critical Issues
...

## High Priority
...

## Medium Priority
...

## Low Priority / Polish
...

## Test Coverage Gaps (prioritized)
...

## Missing Documentation
...

## Deduplication Notes
(Issues flagged by multiple agents — these are likely the most important)
```

**ALL findings are pre-release.** Everything identified in this review must be addressed before 1.0.0 ships. There is no "fix later" bucket — if it's not worth fixing before release, it's not worth reporting.

**Step 9: Create phases** to fix all findings. Group into phases by domain:
- Phase A: Source code fixes (bugs, API issues, missing exports)
- Phase B: Test coverage gaps
- Phase C: Documentation & guide fixes
- Phase D: Demo component fixes + new example pages (see below)
- Phase E: Package quality & release readiness (README, package.json, CI)

---

## Known Example Gaps — New Examples Needed Before 1.0.0

Cross-referencing `src/index.ts` exports against `docs/examples/` reveals these features have **no interactive demo**:

### Must-have examples:

1. **AudioSprite** (`createSprite`) — A significant feature with zero interactive coverage. Only a 5-line snippet in concepts.md. Needs a full example page + Vue component showing sprite loading, named segment playback, and use cases (game SFX, UI sound packs).

2. **Crossfade** (`crossfade`) — Only mentioned in concepts.md. Needs an interactive demo showing smooth transition between two tracks (e.g., a DJ-style crossfader or ambient scene transition).

3. **playTogether** (`playTogether`) — Only a code snippet in concepts.md. Could be demonstrated as a chord builder or synchronized sound trigger.

### Nice-to-have (could be folded into existing examples):

- **Preload with progress** — `preload`/`isPreloaded` are shown in getting-started code but no interactive loading bar demo. Could be added to basic-playback example.
- **LayeredSound standalone** — Used inside synth-drum-kit but not showcased as its own feature. Could get a callout section rather than a full page.

### Already covered adequately:
- Envelope (via synth-keyboard ADSR controls)
- createWhiteNoise (via ambient-generator)
- Debug utilities (developer tool, not user-facing)
- Collection utilities (playAll/stopAll/pauseAll — utility functions, not demo-worthy)
- useInteractionMethods/preventEventDefaults (helper functions for vanilla JS)

---

## Notes for Execution

- The previous review was Feb 17, Phase 23 (demo bugfixes only)
- `src/app/` is a legacy vanilla JS app — **all agents should ignore it**
- Phase 24 (just completed) added verification docs — no code changes
- VitePress demo components use Vue 3 Composition API with `<script setup>`
- Tests use Vitest with happy-dom + standardized-audio-context-mock
- The README currently says "WORK IN PROGRESS" — this is a known critical issue

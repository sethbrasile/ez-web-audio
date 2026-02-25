# Deep Review v2 — EZ Web Audio

## 2026-02-23 | Mode: Pre-delivery | Scope: Full codebase (133 TS files, 44 test files, VitePress docs site)

### Meta

- **Lenses activated:** Architecture, API Design, Code Quality, Security, Performance, Bundle, Testing, Documentation, Content, Packaging, Build, SEO, Accessibility, UX/UI
- **Reviewers dispatched:** 7 parallel agents
- **Files examined:** ~133 source + test files, docs site, build config, CI, 3 GitHub Actions workflows
- **Total findings:** 50 (2 Critical, 6 High, 22 Medium, 20+ Low)
- **Previous review (v1):** 35 findings — all 9 Critical/High findings confirmed resolved

---

## Previous Review Resolution

All findings from the 2026-02-23 v1 review have been verified as resolved:

| ID | Finding | Status |
|----|---------|--------|
| C1 | `audioContext` public writable | Fixed — now `public readonly` |
| C2 | Oscillator GainNode replaced on every play() | Fixed — reuses GainNode, cancels scheduled values |
| C3 | Stale `docs/index.html` with "WORK IN PROGRESS" | Fixed — file deleted |
| H1 | Playable `stopIn` returns void instead of Promise<void> | Fixed — interface updated |
| H2 | Singleton AudioContext no recovery from closed state | Fixed — checks `state === 'closed'` and recreates |
| H3 | responseCache grew unbounded | Fixed — bounded with configurable limit + FIFO eviction |
| H4 | N independent RAF loops per instance | Fixed — shared scheduler per AudioContext via WeakMap |
| H5 | Single-file bundle prevented tree-shaking | Fixed — `preserveModules: true` + `sideEffects: false` |
| H6 | No sitemap, robots.txt, or OG image | Fixed — sitemap config, robots.txt present (OG image partially — see SEO1) |

---

## Critical Findings

### CR1. Type declaration barrel files missing JS counterparts in dist

- **Severity:** Critical
- **Files:** `dist/effects/index.d.ts`, `dist/errors/index.d.ts`
- **What:** `dist/index.d.ts` imports from `'./effects'` and `'./errors'`, resolving to barrel `index.d.ts` files. However, Vite's `preserveModules` + tree-shaking eliminated the corresponding `index.js` files. The runtime `dist/index.js` imports directly from concrete files (`./effects/effect-wrapper.js`, etc.), so the `.d.ts` and `.js` import graphs are out of sync.
- **Why it matters:** Consumers using `"moduleResolution": "nodenext"` or `"node16"` (increasingly the recommended ESM resolution mode) will get type resolution errors. Tools like `attw` (Are The Types Wrong) will flag this package.
- **Recommendation:** Set `rollupTypes: true` in vite-plugin-dts config to bundle all declarations into a single `dist/index.d.ts`. This eliminates the barrel mismatch entirely. Alternatively, restructure `src/index.ts` to import from barrel files so Rollup preserves them as entry chunks.

### CR2. Landing page synthesizer example uses nonexistent API

- **Severity:** Critical
- **File:** `docs/index.md:46-50`
- **What:** Three errors in the "Create a Synthesizer" example:
  1. `createEnvelope` is not exported — `Envelope` is a class, and envelopes are passed as options to `createOscillator()`
  2. `createOscillator()` returns `Promise<Oscillator>` — missing `await`
  3. `synth.play(envelope)` is not a valid call — `play()` takes no arguments
- **Why it matters:** This is the first code prospective users see on the homepage. Non-functional code destroys credibility.
- **Recommendation:** Replace with:
  ```typescript
  import { createOscillator } from 'ez-web-audio'

  const synth = await createOscillator({
    type: 'sawtooth',
    note: 'A4',
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
  })
  synth.play()
  ```

---

## High Findings

### HI1. CI pipeline does not run `pnpm build:lib`

- **Severity:** High
- **File:** `.github/workflows/ci.yml`
- **What:** The CI workflow runs typecheck, lint, and test but never runs `pnpm build:lib`. A PR could break the Vite build without being caught until the publish workflow runs on a tag push.
- **Recommendation:** Add `pnpm build:lib` step to CI before tests.

### HI2. `createAnalyzer()` missing `await` in docs and JSDoc

- **Severity:** High
- **Files:** `docs/guide/utilities.md:234`, `docs/examples/visualization.md:57,148`, `src/index.ts:498` (JSDoc)
- **What:** `createAnalyzer()` is async (returns `Promise<Analyzer>`) but shown without `await` in three doc pages and the JSDoc example. Users copying this get a Promise object, and `setAnalyzer(analyzer)` silently fails or throws.
- **Recommendation:** Add `await` to all four locations.

### HI3. React example uses wrong property name `waveType`

- **Severity:** High
- **File:** `docs/examples/react-integration.md:130`
- **What:** `createOscillator({ frequency: 440, waveType: 'sine' })` — the correct property is `type`, not `waveType`. `OscillatorOptions` defines `type?: OscillatorType`.
- **Why it matters:** The unknown option is silently ignored, producing a default waveform instead of the intended sine wave.
- **Recommendation:** Change `waveType: 'sine'` to `type: 'sine'`.

### HI4. OG image is an SVG favicon — broken social cards

- **Severity:** High
- **File:** `docs/.vitepress/config.mts:41`
- **What:** `og:image` and `twitter:image` both point to `favicon.svg`. Most social platforms (Twitter/X, Facebook, LinkedIn, Discord) don't render SVG as OG images.
- **Why it matters:** Shared links show no image or a broken image, reducing click-through rate.
- **Recommendation:** Create a 1200x630 PNG image (`docs/public/og-image.png`), update meta tags, change `twitter:card` to `summary_large_image`.

### HI5. No focus styles on interactive demo buttons

- **Severity:** High
- **Files:** `DrumMachine.vue`, `AudioDemo.vue`, `VisualizationDemo.vue`, `SynthKeyboard.vue`, `AmbientGenerator.vue`, `FilterDemo.vue`
- **What:** Only PianoKeyboard and XYPad define `:focus` styles. All other components' buttons use `border: none` which removes default focus indicators.
- **Why it matters:** WCAG 2.1 Level AA failure (2.4.7 Focus Visible). Keyboard users cannot see which element is focused.
- **Recommendation:** Add to each component or a shared CSS file:
  ```css
  button:focus-visible {
    outline: 2px solid var(--vp-c-brand);
    outline-offset: 2px;
  }
  ```

### HI6. `any` type in ParamController.updateAudioSource

- **Severity:** High
- **File:** `src/controllers/base-param-controller.ts:52`
- **What:** `updateAudioSource: (source: any) => void` is the only `any` in production source. Published in `.d.ts` files.
- **Why it matters:** Defeats type safety for consumers. Any value passes without compile-time error.
- **Recommendation:** Change to `updateAudioSource: (source: OscillatorNode | AudioBufferSourceNode) => void`.

---

## Medium Findings

### Code Correctness

#### M1. Oscillator.setup() resets gain to defaultValue on every play()

- **File:** `src/oscillator.ts:288-289`
- **What:** `this.gainNode.gain.setValueAtTime(this.gainNode.gain.defaultValue, ...)` resets gain to 1.0. If the user called `osc.changeGainTo(0.5)` between plays, that value is silently discarded.
- **Why it matters:** Inconsistent with Sound, which preserves gain across plays.
- **Recommendation:** Capture current gain value before canceling, then restore:
  ```typescript
  const currentGain = this.gainNode.gain.value
  this.gainNode.gain.cancelScheduledValues(0)
  this.gainNode.gain.setValueAtTime(currentGain, this.audioContext.currentTime)
  ```

#### M2. SoundController never gets updateAudioSource() called

- **File:** `src/sound.ts:103-125`
- **What:** `Sound.setup()` creates a new `AudioBufferSourceNode` but never calls `this.controller.updateAudioSource(audioSourceNode)`. The SoundController retains a stale reference. `OscillatorController` by contrast does get updated in `Oscillator.setup()`.
- **Why it matters:** Detune values scheduled on the stale (disconnected) source node will have no audible effect on subsequent plays.
- **Recommendation:** Add `this.controller.updateAudioSource(audioSourceNode)` after line 119.

#### M3. `load()` uses AudioContext before calling `initAudio()`

- **File:** `src/index.ts:769,799`
- **What:** `getOrCreateAudioContext()` is called at line 769 before `await initAudio()` at line 799. The iOS mute workaround and context unlock happen after the context is already in use.
- **Why it matters:** On iOS Safari, the AudioContext may be suspended when `decodeAudioData` is called. Could manifest as silent first-play in certain timing conditions.
- **Recommendation:** Move `await initAudio()` before the first use of `audioContext` in `load()`.

#### M4. Cache eviction not triggered on ad-hoc loads

- **File:** `src/index.ts:797`, `src/index.ts:634`
- **What:** `load()` and `createSprite()` write to `responseCache` but never call `evictIfNeeded()`. Only `preload()` triggers eviction.
- **Why it matters:** Apps that load many sounds via `createSound()` without using `preload()` bypass the cache limit entirely.
- **Recommendation:** Call `evictIfNeeded()` after each `responseCache.set()` in `load()` and `createSprite()`, or centralize into a `cacheResponse(url, response)` helper.

### Architecture

#### M5. BeatTrack reimplements event system instead of using TypedEventEmitter

- **File:** `src/beat-track.ts:54,452-530`
- **What:** BeatTrack extends Sampler (not TypedEventEmitter) and creates its own EventTarget with 80 lines of duplicated event plumbing. A BeatTrack is not `instanceof TypedEventEmitter`.
- **Why it matters:** Two parallel event systems in the same library. Different event handler signatures (CustomEvent with `.detail` vs plain objects). If TypedEventEmitter gains features, BeatTrack won't get them.
- **Recommendation:** Refactor to use TypedEventEmitter via composition or mixin. Can be deferred post-1.0 if documented.

#### M6. Sampler.gain/pan silently overrides per-sound settings

- **File:** `src/sampler.ts:160-165`
- **What:** `setGainAndPan()` calls `changeGainTo()` and `changePanTo()` on the underlying Sound every time `getNextSound()` is called, permanently mutating the Sound's state.
- **Why it matters:** Per-sound customization is silently clobbered on every play cycle.
- **Recommendation:** Document behavior explicitly, or apply gain as a separate GainNode post-sampler.

#### M7. SoundEventMap includes events that Sound never emits

- **File:** `src/events/event-types.ts:114-121`
- **What:** `SoundEventMap` includes `pause`, `resume`, `seek` — only Track emits these. `sound.on('pause', ...)` compiles but creates a dead listener.
- **Why it matters:** Misleading typed event system.
- **Recommendation:** Split into `BaseSoundEventMap` (play, stop, end) and `TrackEventMap` (extends with pause, resume, seek).

#### M8. Track onended/stop coupling is fragile

- **File:** `src/track.ts:99-123`
- **What:** Natural completion calls `void this.stop()` for cleanup side effects, relying on the `_isPlaying` guard (already set false) to prevent the 'stop' event. Works correctly but the intent is hidden.
- **Recommendation:** Extract cleanup into a private `_resetPosition()` method called directly from onended.

### Documentation

#### M9. README says "Node.js 16+" but engines says `>=18`

- **File:** `README.md:85` vs `package.json:58`
- **Recommendation:** Change README to "Node.js 18+".

#### M10. Bundle size claim "~15 KB" unverified

- **File:** `docs/index.md:97-111`
- **What:** Comparison table claims "~15 KB (zero deps, tree-shakeable)". Should be verified against actual gzipped output.
- **Recommendation:** Run `pnpm build:lib && gzip -c dist/index.js | wc -c`, update with actual figure and qualifier "(gzipped)" or "(minified + gzipped)".

#### M11. Noise docs say "looped Sound instance" but loop isn't auto-set

- **File:** `docs/guide/concepts.md:247`
- **What:** States "All noise types return a looped `Sound` instance" but `createNoise()` does not set `loop = true`.
- **Recommendation:** Change to "All noise types return a 1-second `Sound` instance. Set `.loop = true` for continuous playback."

#### M12. Comparison table wrong about Tone.js TypeScript

- **File:** `docs/index.md:104`
- **What:** Claims Tone.js has "Community @types". Tone.js v14+ ships built-in TypeScript types (it's written in TypeScript).
- **Recommendation:** Change to "Built-in (TypeScript source)".

### Testing Gaps

#### M13. `setPreloadCacheLimit` — zero test coverage

- **File:** `src/preload.ts:29`
- **What:** Cache eviction logic (`evictIfNeeded()`, `setPreloadCacheLimit()`) is public API with no tests.
- **Recommendation:** Add tests for: setting a limit, eviction when exceeded, limit of 0, reducing below current size.

#### M14. `preventEventDefaults`/`useInteractionMethods` — zero test coverage

- **File:** `src/index.ts:839,890`
- **What:** DOM-interacting public API functions with cleanup functions, completely untested.
- **Recommendation:** Test with happy-dom DOM simulation — verify listeners registered, cleanup removes them.

#### M15. `Sound.loop` property — zero test coverage

- **File:** `src/sound.ts:60`
- **Recommendation:** Test default value, set/get, persistence through play/stop cycles.

#### M16. `createOscillator({ note: 'A4' })` — untested

- **File:** `src/oscillator.ts`
- **What:** Note-name-to-frequency path documented in JSDoc but no test verifies it works.
- **Recommendation:** Test A4→440Hz, invalid note throws.

#### M17. `Sampler.stop()` — untested

- **File:** `src/sampler.test.ts`
- **What:** No tests for stop behavior. Users need to be able to stop a sampler.
- **Recommendation:** Test stop propagation, isPlaying state after stop.

#### M18. `audio-context.ts` — no dedicated test file

- **File:** `src/audio-context.ts`
- **What:** Closed-state recovery (the fix for H2) is only tested indirectly.
- **Recommendation:** Add `audio-context.test.ts` with direct tests for singleton creation, closed-state recreation.

### Build/Packaging

#### M19. deploy-docs workflow missing `--frozen-lockfile`

- **File:** `.github/workflows/deploy-docs-site.yml:34`
- **What:** Uses `pnpm install` without `--frozen-lockfile`, unlike CI and publish workflows.
- **Recommendation:** Change to `pnpm install --frozen-lockfile`.

#### M20. `prepublishOnly` only builds — doesn't run tests

- **File:** `package.json:75`
- **What:** `"prepublishOnly": "pnpm build:lib"` — no typecheck, lint, or tests.
- **Why it matters:** Local `npm publish` could ship broken code.
- **Recommendation:** Expand to `"prepublishOnly": "pnpm typecheck && pnpm lint && pnpm test --run && pnpm build:lib"`.

### SEO/Accessibility/UX

#### M21. Visualization canvases lack accessible alternatives

- **File:** `docs/.vitepress/theme/components/VisualizationDemo.vue:322-323,330`
- **Recommendation:** Add `role="img"` and `aria-label` to each canvas.

#### M22. XY Pad canvas not keyboard operable

- **File:** `docs/.vitepress/theme/components/XYPad.vue:287-297`
- **What:** Has `tabindex="0"` and `role="application"` but no `@keydown` handler. Appears focusable but provides no keyboard interaction.
- **Recommendation:** Add arrow key handlers for frequency/gain adjustment.

#### M23. DrumMachine color-only beat state indication

- **File:** `docs/.vitepress/theme/components/DrumMachine.vue:249-270`
- **What:** Active beats indicated only by color change. WCAG 1.4.1 Use of Color.
- **Recommendation:** Add secondary visual indicator (filled dot, thicker border, checkmark).

#### M24. DrumMachine 16-step grid overflows on small mobile

- **File:** `docs/.vitepress/theme/components/DrumMachine.vue:221-225,309-315`
- **What:** 16 cells at 24px + gaps = ~416px, overflows 320px viewport. Has `overflow-x: auto` but no scroll affordance.
- **Recommendation:** Add scroll shadow indicator or 8-beat mobile layout.

---

## Low Findings

### Code Quality (Low)

- **L1.** `Beat.pendingTimerIds` / `BaseSound._pendingTimeoutIds` accumulate stale IDs — `src/beat.ts:54`, `src/base-sound.ts:95`. Self-remove on callback completion.
- **L2.** Track.trackPlayPosition drift from accumulating floating-point error — `src/track.ts:247-260`. Use absolute reference instead.
- **L3.** `createNotes()` uses `for...in` without hasOwnProperty guard — `src/index.ts:168`. Use `Object.entries()`.
- **L4.** Missing `dispose()` on AudioSprite — `src/sprite.ts`. No way to release buffer resources.
- **L5.** `Connectable` interface types `audioSourceNode` as `AudioNode` (too broad) — `src/interfaces/connectable.ts:12`. Narrow to `OscillatorNode | AudioBufferSourceNode`.
- **L6.** `Playable` interface missing `fadeIn`, `fadeOut`, `dispose`, `playFor` — `src/interfaces/playable.ts`. Either expand or document as minimal contract.
- **L7.** Module-level `_unmuteDispose` mutable state — `src/index.ts:54`. Add `@internal` JSDoc.
- **L8.** `BaseSound.stopAt()` double-schedules with both timeout and `node.stop(time)` — `src/base-sound.ts:977-1009`. Use `node.stop(time)` directly for precision.
- **L9.** `responseCache` exported as public mutable Map — `src/preload.ts:14`. Consumers can corrupt it. Expose only through controlled access functions.

### Performance (Low)

- **L10.** Scheduler tasks scanned twice per tick — `src/utils/timeout.ts:38-44`. Single-pass optimization.
- **L11.** `clearTimeout` allocates new array per call — `src/utils/timeout.ts:136`. Use `splice` + `findIndex`.
- **L12.** AudioSprite creates GainNode + StereoPannerNode unconditionally — `src/sprite.ts:171-179`. Only create when values differ from defaults.
- **L13.** Oscillator constructor creates throwaway OscillatorNode — `src/oscillator.ts:186`. Pragmatic, acknowledged in comment.
- **L14.** Response-level caching instead of AudioBuffer — `src/preload.ts:14`. AudioBuffer caching would avoid redundant decoding.

### Testing (Low)

- **L15.** `createNotes()` factory — zero coverage — `src/index.ts:162`.
- **L16.** `_disposeUnmute()` — zero coverage — `src/index.ts:62`.
- **L17.** `createAnalyzer` context-free overload not tested via index.ts.
- **L18.** `createLayeredSound` factory not tested via index.ts.
- **L19.** Oscillator `frequency: 0` silently becomes 440 due to `||` vs `??` — `src/oscillator.ts`. Test asserts behavior but doesn't verify resulting frequency.
- **L20.** Envelope accepts negative attack/decay/release without validation — `src/envelope.test.ts:479-493`.
- **L21.** E2E tests are Chromium-only — no WebKit despite Safari-specific workarounds.
- **L22.** E2E tests don't verify AudioContext.state after interaction.

### Packaging/Build (Low)

- **L23.** `build:ci` and `build:base` scripts identical to `build` — `package.json:62-64`. Remove redundant scripts.
- **L24.** `build:lib` runs `tsc` then Vite overwrites output — `package.json:65`. Use `tsc --noEmit && vite build`.
- **L25.** Publish workflow builds library twice — `.github/workflows/publish.yml:41-45`.
- **L26.** Source maps reference `src/` not included in published package — `vite.config.js:30`.
- **L27.** Stale tsconfig.json path aliases (`@app/*`, `@common/*`, `@test/*`).
- **L28.** Missing `unmute.d.ts` in dist (internal module, no consumer impact).

### SEO/UX (Low)

- **L29.** Missing `og:image:width`/`og:image:height` meta tags — `docs/.vitepress/config.mts:41`.
- **L30.** Static OG title/description on all pages — use `transformHead` for per-page values.
- **L31.** No canonical URL per page.
- **L32.** Inline cross-links sparse within guide page body text.
- **L33.** Structured data schema missing `version`, `dateCreated` properties.
- **L34.** Piano keyboard shortcut hint not announced to screen readers.
- **L35.** No loading state on DrumMachine first play.
- **L36.** No interactive demo on Getting Started page.

### Security (Low)

- **L37.** No URL validation on fetch() calls — `src/index.ts:779`. Client-side only, but relevant for Electron/Tauri. Consider documenting.
- **L38.** `get()` in prop-access.ts lacks `__proto__`/`constructor` key guard (only `set()` has it) — `src/utils/prop-access.ts`. Low risk since call sites use hardcoded keys.
- **L39.** Soundfont parsing trusts input format after `JSON.parse()` — `src/utils/decode-base64.ts:62-63`. Consider validating key patterns.

---

## Proposed Action Plan

### Grouping 1: Documentation Code Correctness

- **Goal:** Fix all broken/wrong code examples in docs and JSDoc before users copy them
- **Findings addressed:** CR2, HI2, HI3, M9, M10, M11, M12
- **Scope:** `docs/index.md`, `docs/guide/utilities.md`, `docs/examples/visualization.md`, `docs/examples/react-integration.md`, `docs/guide/concepts.md`, `src/index.ts` (JSDoc), `README.md`
- **Effort:** Small
- **Dependencies:** None

### Grouping 2: Build & Type Declaration Fixes

- **Goal:** Ensure the published package works for all TypeScript moduleResolution modes and CI catches build failures
- **Findings addressed:** CR1, HI1, M19, M20, L23, L24, L25, L27
- **Scope:** `vite.config.js`, `.github/workflows/ci.yml`, `.github/workflows/deploy-docs-site.yml`, `package.json`, `tsconfig.json`
- **Effort:** Small
- **Dependencies:** None

### Grouping 3: API Type Safety

- **Goal:** Eliminate `any` from published types and fix misleading type contracts
- **Findings addressed:** HI6, M7, L5, L6
- **Scope:** `src/controllers/base-param-controller.ts`, `src/events/event-types.ts`, `src/interfaces/connectable.ts`, `src/interfaces/playable.ts`
- **Effort:** Small
- **Dependencies:** None

### Grouping 4: Source Code Correctness Bugs

- **Goal:** Fix real bugs where audio behavior doesn't match user intent
- **Findings addressed:** M1, M2, M3, M4, L1, L9
- **Scope:** `src/oscillator.ts`, `src/sound.ts`, `src/index.ts`, `src/preload.ts`, `src/base-sound.ts`, `src/beat.ts`
- **Effort:** Medium
- **Dependencies:** None

### Grouping 5: Test Coverage Gaps

- **Goal:** Cover untested public API functions to prevent regressions
- **Findings addressed:** M13, M14, M15, M16, M17, M18, L15-L20
- **Scope:** New test files: `src/audio-context.test.ts`, `src/utils/noise.test.ts`; additions to existing: `src/preload.test.ts`, `src/index.test.ts`, `src/sound.test.ts`, `src/oscillator.test.ts`, `src/sampler.test.ts`
- **Effort:** Medium
- **Dependencies:** Grouping 4 (fix bugs before testing them)

### Grouping 6: Docs Site SEO + Accessibility

- **Goal:** Ensure docs site is shareable and usable by all users
- **Findings addressed:** HI4, HI5, M21, M22, M23, M24, L29-L36
- **Scope:** `docs/.vitepress/config.mts`, `docs/public/og-image.png` (new), all Vue demo components in `docs/.vitepress/theme/components/`
- **Effort:** Medium
- **Dependencies:** None

### Grouping 7: Architecture Improvements (Post-1.0)

- **Goal:** Unify event system, fix Sampler behavior, clarify Track lifecycle
- **Findings addressed:** M5, M6, M8, L4, L7, L8
- **Scope:** `src/beat-track.ts`, `src/sampler.ts`, `src/track.ts`, `src/sprite.ts`, `src/index.ts`
- **Effort:** Large
- **Dependencies:** None, but recommend deferring to 1.1

---

## Recommended Priority

**Pre-publish (blockers):**
1. Grouping 1 — Docs code correctness (broken examples = immediate user pain)
2. Grouping 2 — Build & types (package won't work for nodenext users)
3. Grouping 3 — API type safety (any in published .d.ts)
4. Grouping 4 — Source code bugs (Oscillator gain reset, stale controller refs)

**High-value polish (pre or shortly after publish):**
5. Grouping 6 — SEO + Accessibility
6. Grouping 5 — Test coverage gaps

**Post-1.0:**
7. Grouping 7 — Architecture improvements

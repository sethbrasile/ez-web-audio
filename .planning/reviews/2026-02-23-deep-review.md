# Deep Review — EZ Web Audio

## 2026-02-23 | Mode: Pre-delivery | Scope: Full codebase (87 source files, 44 test files, VitePress docs site)

### Meta

- **Lenses activated:** Architecture, API Design, Code Quality, Security, Performance, Bundle, Testing, Packaging, Documentation, SEO, Content/Copy
- **Reviewers dispatched:** 6 parallel agents
- **Files examined:** ~131 source + test files, docs site, build config, CI
- **Total findings:** 35 (3 Critical, 8 High, 12 Medium, 12 Low)

---

## Critical Findings

### C1. `audioContext` is a public writable property on every sound instance

- **File:** `src/base-sound.ts:201`
- **Impact:** Once 1.0 ships, `sound.audioContext` is permanent public API. Consumers can reassign it, corrupting internal state (all audio nodes were created with the original context).
- **Evidence:** `constructor(public audioContext: AudioContext, opts?: BaseSoundOptions)` — the `public` modifier exposes it as writable.
- **Recommendation:** Change to `protected readonly audioContext` (or `private readonly` with a getter if external access is needed). The `crossfade` utility uses `fromTrack.audioContext` internally but can access it through other means.

### C2. Oscillator.setup() replaces GainNode on every play(), breaking getGainNode()

- **File:** `src/oscillator.ts:284-317`
- **Impact:** Every `play()` creates a new GainNode (line 300-301), invalidating cached references from `getGainNode()`. Callers modifying the old node affect a disconnected node — silent correctness bug. Sound/Track do NOT have this problem.
- **Evidence:** JSDoc at line 279-282 acknowledges this. The crossfade utility at `src/utils/crossfade.ts:72` relies on stable `getGainNode()` references.
- **Also flagged by:** Code Quality reviewer (#6), Performance reviewer (#5) — triple-flagged across lenses.
- **Recommendation:** Reuse the existing GainNode (matching Sound's pattern). Only recreate the OscillatorNode (which is single-use per Web Audio spec). Use `cancelScheduledValues()` on the existing gain param instead of replacing the node.

### C3. Stale `docs/index.html` contains "WORK IN PROGRESS — Not ready for use!!"

- **File:** `docs/index.html`
- **Impact:** A TypeDoc-generated HTML leftover in the docs root. If indexed by Google, this becomes the landing page result with "Not ready for use" messaging.
- **Recommendation:** Delete `docs/index.html`. The VitePress `docs/index.md` is the real landing page. TypeDoc output goes to `docs/api/` per `typedoc.json`.

---

## High Findings

### H1. `Playable` interface declares `stopIn` returns `void`, but implementation returns `Promise<void>`

- **File:** `src/interfaces/playable.ts:12`
- **Evidence:** Interface: `stopIn: (seconds: number) => void`. Implementation in `BaseSound`: `public async stopIn(seconds: number): Promise<void>`. TypeScript allows this (Promise<void> assignable to void) but consumers typed against `Playable` can't await it.
- **Recommendation:** Update interface to `stopIn: (seconds: number) => Promise<void>`.

### H2. Singleton AudioContext has no recovery from `closed` state

- **File:** `src/audio-context.ts:12-29`
- **Impact:** If AudioContext enters `closed` state (browser tab discard/restore), `getOrCreateAudioContext()` keeps returning the closed context. No recovery path exists. `_resetAudioContext()` is `@internal` and test-only.
- **Recommendation:** Add state check: `if (_audioContext?.state === 'closed') _audioContext = null` in `getOrCreateAudioContext()`. Consider exposing a public `resetAudioContext()` for advanced use cases.

### H3. `responseCache` grows unbounded — memory leak for long-running apps

- **File:** `src/preload.ts:7`
- **Impact:** Every loaded URL is cached as a `Response` forever. `Response.clone()` is called on every cache hit (index.ts:754), creating additional pressure. A 5-min MP3 at 128kbps = ~4.8MB per entry.
- **Triple-flagged by:** Architecture, Code Quality, Performance reviewers.
- **Recommendation:** At minimum, document prominently. Consider: (a) LRU eviction with configurable max, (b) only auto-cache when `preload()` is called explicitly, or (c) cache decoded `AudioBuffer` instead of `Response` objects.

### H4. `audioContextAwareTimeout` creates N independent RAF loops

- **File:** `src/utils/timeout.ts:64-107`
- **Impact:** Every BaseSound, BeatTrack, and Beat instance gets its own RAF-driven timer closure with its own `tasks` array. A 4-track 16-beat drum machine = 72+ independent RAF loops at ~60Hz each.
- **Recommendation:** Refactor to a shared singleton scheduler per AudioContext using a `WeakMap<BaseAudioContext, SharedScheduler>`. One RAF loop, one consolidated task list.

### H5. Single-file bundle prevents tree-shaking

- **File:** `vite.config.js:24-36`
- **Impact:** Build produces one 147KB `dist/index.js`. `import { createSound }` pulls in the entire library (BeatTrack, Oscillator, Font, frequencyMap, unmute.js, etc.).
- **Recommendation:** Use `preserveModules: true` in Rollup options:
  ```javascript
  rollupOptions: {
    output: {
      preserveModules: true,
      preserveModulesRoot: 'src',
    },
  },
  ```

### H6. No sitemap, robots.txt, or OG image for docs site

- **Files:** `docs/.vitepress/config.mts`, `docs/public/`
- **Impact:** Missing standard SEO infrastructure. No sitemap means deep pages may not get indexed. No OG image means plain text cards when shared on Twitter/Discord/Reddit.
- **Recommendation:**
  - Add `sitemap: { hostname: 'https://sethbrasile.github.io/ez-web-audio' }` to VitePress config
  - Create `docs/public/robots.txt` with sitemap reference
  - Create a 1200x630 social card image, add `og:image` and `twitter:image` meta tags
  - Change `twitter:card` from `summary` to `summary_large_image`

### H7. Landing page content is too thin below the fold

- **File:** `docs/index.md`
- **Impact:** Only four feature cards and a 3-line code example. README is a better sales pitch than the docs landing page. Developers searching "typescript audio library" need to see breadth of capabilities.
- **Recommendation:**
  - Add 2-3 more code examples (synth, drum machine, effects)
  - Add "Why EZ Web Audio?" positioning section ("Web Audio API needs 15+ lines to play a sound. EZ does it in 3.")
  - Link best demos (Drum Machine, Synth Keyboard) directly from hero
  - Bring landing page up to README quality

### H8. CHANGELOG `[Unreleased]` section misaligned with version 1.0.0

- **File:** `CHANGELOG.md:5-51`
- **Impact:** Publishing as 1.0.0 while CHANGELOG shows unreleased breaking changes above the 1.0.0 entry. Confusing for consumers.
- **Recommendation:** Fold `[Unreleased]` content into `[1.0.0]` section and update the date before publishing.

---

## Medium Findings

### M1. BeatTrack doesn't extend TypedEventEmitter — inconsistent event API

- **File:** `src/beat-track.ts:52-54`
- **Impact:** BeatTrack uses a private `eventTarget: EventTarget` field and reimplements `on()`, `off()`, `once()`, `addEventListener()`, `removeEventListener()`, `emit()` manually (lines 442-540). Meanwhile Sound/Oscillator/Track/LayeredSound all extend `TypedEventEmitter`. This means `beatTrack instanceof EventTarget` is false, `dispatchEvent()` doesn't exist, and no array-of-types overload on `on()`.
- **Recommendation:** Consider refactoring BeatTrack to use composition (hold Sampler as private field) and extend `TypedEventEmitter<BeatTrackEventMap>`. Or document the inconsistency.

### M2. `createAnalyzer()` context-free overload skips `initAudio()`

- **File:** `src/index.ts:495-505`
- **Impact:** Unlike every other factory function, the context-free `createAnalyzer()` calls `getOrCreateAudioContext()` directly without `initAudio()`. If it's the first API call, iOS mute workaround and `unlockAudioContext()` are skipped.
- **Recommendation:** Make `createAnalyzer` async and call `initAudio()`, or document that it should be called after `initAudio()`.

### M3. `Player` interface is too generic and incompatible with `Playable`

- **File:** `src/index.ts:797-800`
- **Impact:** `Player` has `play: () => void` and `stop: () => void`, but `Playable.play()` returns `Promise<void>`. A `Playable` is not assignable to `Player`. The name "Player" is likely to collide with consumer code.
- **Recommendation:** Rename to `InteractionTarget`, or make compatible with `Playable` by accepting `() => void | Promise<void>`.

### M4. Untyped `unmute.js` import with `@ts-expect-error`

- **File:** `src/index.ts:49-50`
- **Impact:** The only `@ts-expect-error` in production code. Zero compile-time protection.
- **Recommendation:** Create `src/utils/unmute.d.ts`: `declare const unmuteIosAudio: (audioContext: AudioContext) => void; export default unmuteIosAudio;`

### M5. `prop-access.ts` uses `any` heavily; `set()` has prototype pollution potential

- **File:** `src/utils/prop-access.ts:1-20`
- **Impact:** `set()` creates intermediate objects on arbitrary dot-separated paths. If `path` were `"__proto__.polluted"`, it would set `Object.prototype.polluted`. Currently not called with user-controlled paths, but `any` types defeat TypeScript's type system.
- **Recommendation:** If `set` is test-only, move to test helpers. Add `__proto__`/`constructor` guard. Replace `any` with `Record<string, unknown>`.

### M6. `.env*` files not gitignored

- **File:** `.gitignore`
- **Impact:** `.env.local` and `.env.ci` exist untracked but there's no protection against accidentally committing them.
- **Recommendation:** Add `.env*` to `.gitignore`.

### M7. Beat-level timers not cancelled on `BeatTrack.stop()`

- **Files:** `src/beat-track.ts:260-274`, `src/beat.ts:94-108`
- **Impact:** `BeatTrack.stop()` clears the scheduler timer but not individual Beat timers scheduled in the lookahead window. Beats already scheduled still fire `isPlaying` toggles and `parentPlayIn()` audio playback after stop.
- **Recommendation:** Track timeout IDs in Beat for cancellation, or use a generation counter that scheduled callbacks check before executing.

### M8. `unmute.js` global listeners never cleaned up

- **File:** `src/index.ts:95-98`
- **Impact:** `unmuteIosAudio(audioContext)` return value (containing `dispose()`) is discarded. 9+ event listeners on `window` are registered permanently, even on non-iOS platforms.
- **Recommendation:** Store the dispose function. Call it when audio is confirmed running, or document that persistent global listeners are registered.

### M9. No CI workflow for pull requests

- **File:** Missing `.github/workflows/ci.yml`
- **Impact:** Only the tag-based publish workflow runs tests. Contributors get no CI feedback on PRs. Main branch could accumulate broken code.
- **Recommendation:** Add a `ci.yml` triggered by `push` and `pull_request` running typecheck, lint, and tests.

### M10. No `dispose()` test coverage

- **File:** Missing tests for `src/base-sound.ts:1183-1216`
- **Impact:** `dispose()` is the only explicit resource cleanup method. No tests verify: `disposed` returns true, `play()` after dispose throws, idempotency, effects cleared.
- **Recommendation:** Add `describe('dispose')` block covering these four cases.

### M11. `update('gain')` test asserts `toBeDefined()` not actual value

- **File:** `src/sound.test.ts:361`
- **Impact:** Test passes even if `update('gain')` is completely broken — `gain.value` always exists on an AudioParam.
- **Recommendation:** Change to `expect(sound.gainNode.gain.value).toBeCloseTo(0.5)`.

### M12. No comparison to alternatives (Tone.js, Howler.js) anywhere on site

- **Files:** `docs/index.md`, `README.md`
- **Impact:** Developers evaluating audio libraries have no positioning context.
- **Recommendation:** Add brief comparison section. Tone.js = full music framework (DAW in browser). Howler.js = sound playback. EZ Web Audio = simple API covering sounds + synthesis + drum machines + effects with zero deps and full TypeScript.

---

## Low Findings

### L1. `any` casts in bypass interception

- **File:** `src/base-sound.ts:257, 264, 281, 289`
- **Recommendation:** Define `type BypassableEffect = Effect & { _bypass?: boolean }` instead of `as any`.

### L2. `ParamController.updateAudioSource` uses `any`

- **File:** `src/controllers/base-param-controller.ts:70`
- **Recommendation:** Use `OscillatorNode | AudioBufferSourceNode`.

### L3. Oscillator filter type cast `as any`

- **File:** `src/oscillator.ts:201`
- **Recommendation:** Type `FILTERS` array as `BiquadFilterType[]`.

### L4. `Track.trackPlayPosition` captures stale `startedPlayingAt` in closure

- **File:** `src/track.ts:247-261`
- **Recommendation:** Read `this.startedPlayingAt` from `this` on each frame instead of capturing once.

### L5. BeatTrack scheduler uses `window.setTimeout` — drifts in background tabs

- **File:** `src/beat-track.ts:375`
- **Recommendation:** Document limitation or consider Web Worker-based timer.

### L6. `responseCache` Map exported publicly

- **File:** `src/index.ts:38`, `src/preload.ts:7`
- **Recommendation:** Remove `responseCache` from public exports. `clearPreloadCache()`, `isPreloaded()`, `preload()` provide the needed interface.

### L7. Dynamic import in `createLayeredSound` is pointless (statically exported elsewhere)

- **File:** `src/index.ts:528-531` vs line 968
- **Recommendation:** Replace with static import, matching all other factory functions.

### L8. No `engines` field in package.json

- **File:** `package.json`
- **Recommendation:** Add `"engines": { "node": ">=16" }`.

### L9. "View Source" reference in examples index may be broken

- **File:** `docs/examples/index.md:237-239`
- **Recommendation:** Rewrite to "browse source files in GitHub" or implement the feature.

### L10. No favicon for docs site

- **File:** `docs/.vitepress/config.mts`, `docs/public/`
- **Recommendation:** Add a simple favicon.

### L11. npm description is a tagline, not descriptive

- **File:** `package.json:6`
- **Recommendation:** Change to: "A zero-dependency TypeScript library that makes the Web Audio API easy. Play sounds, synthesizers, drum machines, and audio effects with minimal code."

### L12. `ControlTypeMap` extensibility docs don't work at runtime

- **File:** `src/controllers/base-param-controller.ts:7-29`
- **Recommendation:** Remove the module augmentation documentation since the runtime switch-case doesn't support it.

---

## Proposed Action Plan

### Grouping A: API Contract Fixes

- **Goal:** Fix public API issues that become frozen at 1.0
- **Findings addressed:** C1, C2, H1, M2, M3
- **Scope:** `src/base-sound.ts`, `src/oscillator.ts`, `src/interfaces/playable.ts`, `src/index.ts`
- **Effort:** Medium
- **Dependencies:** None — can run first or in parallel with D

### Grouping B: Runtime Reliability

- **Goal:** Fix memory leaks, timer architecture, and AudioContext recovery
- **Findings addressed:** H2, H3, H4, M7, M8
- **Scope:** `src/audio-context.ts`, `src/preload.ts`, `src/utils/timeout.ts`, `src/beat-track.ts`, `src/beat.ts`, `src/index.ts`
- **Effort:** Large
- **Dependencies:** Should run after A (since A changes base-sound and oscillator)

### Grouping C: Bundle & Tree-shaking

- **Goal:** Enable per-module tree-shaking for consumers
- **Findings addressed:** H5, L7
- **Scope:** `vite.config.js`, `src/index.ts`
- **Effort:** Small
- **Dependencies:** Run after A and B (to avoid merge conflicts). Verify dist output with `pnpm build:lib`.

### Grouping D: Docs Site Launch Readiness

- **Goal:** SEO infrastructure, landing page content, CHANGELOG alignment
- **Findings addressed:** C3, H6, H7, H8, M12, L9, L10, L11
- **Scope:** `docs/`, `CHANGELOG.md`, `package.json` (description only)
- **Effort:** Medium
- **Dependencies:** None — fully independent of A/B/C. Can run in parallel.

### Grouping E: Code Hygiene

- **Goal:** Type safety fixes, security hardening, test gaps
- **Findings addressed:** M4, M5, M6, M10, M11, L1, L2, L3, L12
- **Scope:** Various src files, `.gitignore`, test files
- **Effort:** Small
- **Dependencies:** Run after A (some files overlap)

### Grouping F: CI/DX Polish

- **Goal:** PR workflow, remaining low-priority polish
- **Findings addressed:** M9, L4, L5, L6, L8
- **Scope:** `.github/workflows/`, `src/track.ts`, `src/beat-track.ts`, `src/preload.ts`, `package.json`
- **Effort:** Small
- **Dependencies:** Run after B (some files overlap with timer work)

### Execution Order

```
Phase 1 (parallel):  A: API Contract Fixes  |  D: Docs Site Launch Readiness
Phase 2:             B: Runtime Reliability
Phase 3:             C: Bundle & Tree-shaking
Phase 4 (parallel):  E: Code Hygiene  |  F: CI/DX Polish
```

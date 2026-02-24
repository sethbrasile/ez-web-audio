# Project State: EZ Audio

**Last Updated:** 2026-02-24 (Phase 44 complete — transitioning to Phase 45)
**Current Focus:** Phase 45 — Architecture Improvements

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Make the Web Audio API easy to use
**Current focus:** Phase 45 — Architecture Improvements

## Current Position

Phase: 44 of 45 (Docs Site SEO and Accessibility) — In Progress
Plan: 1/3
Status: Plan 01 complete — OG image, transformHead per-page meta, canonical URLs, JSON-LD enrichment
Last activity: 2026-02-24 — Phase 44 Plan 01 executed (2 tasks, 2 commits)

**Progress:** [████████████████████] 116/116 plans (100%)

## Performance Metrics

**Velocity (prior milestones):**
- Total plans completed: 48 (v1.0 MVP) + 20 (v1.1) = 68 total
- Prior milestone avg: ~4 plans/phase

**By Phase (v1.0 Stable):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 17-01 | 1/3 | 3min | 3min |
| 17-02 | 2/3 | 10min | 6.5min |
| 17-03 | 3/3 | 3min | 5.3min |
| 18-01 | 1/3 | 4min | 4min |
| 18-02 | 2/3 | 6min | 5min |
| 18-03 | 3/3 | 8min | 6min |
| 19-01 | 1/3 | 4min | 4min |
| 19-02 | 2/3 | 4min | 4min |
| 19-03 | 3/3 | 3min | 3.7min |
| 20-01 | 1/TBD | 5min | 5min |
| 21-01 | 1/TBD | 8min | 8min |
| 21-02 | 2/TBD | 7min | 7.5min |
| 22-01 | 1/TBD | 6min | 6min |
| 22-02 | 2/TBD | 1min | 3.5min |
| 22-03 | 3/TBD | 8min | 5min |
| 23-01 | 1/2 | 3min | 3min |
| 23-02 | 2/2 | 2min | 2.5min |
| 23-03 | 3/3 | 12min | 5.7min |
| 23-04 | 4/4 | 2min | 4.8min |

*Updated after each plan completion*
| Phase 26-source-code-fixes P01 | 2min | 2 tasks | 3 files |
| Phase 26-source-code-fixes P03 | 10min | 2 tasks | 3 files |
| Phase 26-source-code-fixes P04 | 6min | 2 tasks | 6 files |
| Phase 26-source-code-fixes P02 | 7 | 2 tasks | 5 files |
| Phase 26-source-code-fixes P05 | 9min | 2 tasks | 3 files |
| Phase 26-source-code-fixes P06 | 5min | 2 tasks | 11 files |
| Phase 27-package-quality-readme P02 | 2min | 1 tasks | 1 files |
| Phase 27-package-quality-readme P01 | 2min | 2 tasks | 4 files |
| Phase 28-documentation-corrections P01 | 8min | 2 tasks | 8 files |
| Phase 28 P02 | 2min | 2 tasks | 1 files |
| Phase 29-demo-component-fixes P01 | 2min | 2 tasks | 3 files |
| Phase 29 P02 | 2min | 2 tasks | 2 files |
| Phase 29-demo-component-fixes P03 | 4min | 2 tasks | 8 files |
| Phase 30 P02 | 6min | 2 tasks | 3 files |
| Phase 30-test-coverage-expansion P01 | 8min | 2 tasks | 3 files |
| Phase 30-test-coverage-expansion P03 | 3min | 2 tasks | 2 files |
| Phase 31-e2e-integration-test-expansion P01 | 2min | 2 tasks | 3 files |
| Phase 31-e2e-integration-test-expansion P02 | 2min | 2 tasks | 1 files |
| Phase 33-dx-convenience-apis P02 | 5min | 2 tasks | 3 files |
| Phase 33-dx-convenience-apis P01 | 3min | 2 tasks | 2 files |
| Phase 34 P02 | 8min | 2 tasks | 3 files |
| Phase 34-test-gap-closure P01 | 2min | 2 tasks | 3 files |
| Phase 35 P01 | 10min | 2 tasks | 6 files |
| Phase 35-documentation-expansion P02 | 4min | 2 tasks | 9 files |
| Phase 35 P03 | 8min | 2 tasks | 3 files |
| Phase 36-documentation-sync P01 | 4min | 2 tasks | 4 files |
| Phase 36-documentation-sync P02 | 4min | 2 tasks | 2 files |
| Phase 37-nice-to-have-dx-features P37-02 | 7min | 2 tasks | 6 files |
| Phase 37-nice-to-have-dx-features P01 | 8min | 2 tasks | 6 files |
| Phase 37-nice-to-have-dx-features P37-03 | 7min | 2 tasks | 5 files |
| Phase 38-final-documentation-sync P01 | 6min | 2 tasks | 4 files |
| Phase 38-final-documentation-sync P02 | 1min | 2 tasks | 1 files |
| Phase 44-docs-site-seo-and-accessibility P03 | 2min | 2 tasks | 3 files |
| Phase 44-docs-site-seo-and-accessibility P01 | 2min | 2 tasks | 2 files |
| Phase 44-docs-site-seo-and-accessibility P02 | 4min | 2 tasks | 15 files |

## Accumulated Context

### Decisions

See .planning/PROJECT.md Key Decisions table for full history.

Recent decisions affecting current work:
- Pre-1.0: Breaking changes are free — no backwards compatibility required
- Phase 13: String concat for error messages (consistency across codebase)
- Phase 16: E2E tests focus on error-detection, not element checks (VitePress SPA timing)
- Phase 17-01: Vitest 4 constructor mocks require function syntax, not arrow functions
- Phase 17-02: ESLint config uses per-directory overrides; docs Vue rules relaxed for Phase 22
- Phase 17-03: TS 5.9 typed arrays require explicit ArrayBuffer generic for Web Audio API
- Phase 18: onPlayRamp().from() NOT renamed (different semantic: "from value X")
- Phase 18: debugConnection kept despite name (logs effect chain changes, not public API)
- Phase 18: 885 tests (9 connection tests removed)
- Phase 19: Bypass interception via Object.defineProperty (simpler than Proxy)
- Phase 19: ControlTypeMap interface for module augmentation extensibility
- Phase 19: 891 tests (6 new tests added)
- Phase 20: 901 tests (10 new tests added in 20-01)
- [Phase 20]: DEF-04 consume-once semantics: onPlaySet/onPlayRamp schedules cleared after each setValuesAtTimes() call — users re-schedule before each play() for repeated automation
- Phase 21-02: Integration test assertion depth uses node presence checks (getEffects/getAnalyzer), not AnalyserNode data (impractical with mock)
- Phase 21-02: Soundfont integration tests use mock SampledNote pattern (duck-typed identifier+play) — fetch/decode tested elsewhere
- Phase 21-02: 937 tests (36 new tests added in 21-02: 16 integration + 20 concurrent)
- Phase 21-01: base-sound.test.ts split into 4 focused files (events, effects, debug, analyzer) — 937 tests unchanged
- Phase 22-01: .as() is correct API for update/seek type hints — .from() is reserved for onPlayRamp value semantics
- Phase 22-01: createFilterEffect/createGainEffect are context-free — AudioContext resolved internally
- Phase 22-01: addEffects([]) batch replaces consecutive addEffect() calls (SynthDrumKit hi-hat)
- Phase 22-02: excludeProtected=false in typedoc.json so protected members appear in API reference with visibility badges
- Phase 22-02: CHANGELOG.md fully rewritten covering all breaking changes (renames, visibility, removed APIs), migration guide, features from phases 17-21, and 0.1.0 MVP feature set
- Phase 22-03: CI pipeline runs pnpm build (full: lib+typedoc+docs) before E2E — E2E tests need the built docs site
- Phase 22-03: Playwright installs only chromium --with-deps matching playwright.config.ts targeting Chromium only
- Phase 23-01: audioContextAwareTimeout exported as public API — consumers need audio-sync timers for beat UIs, not just library internals
- Phase 23-01: wrapEffect() context-free overload preferred — consistent with createFilterEffect/createGainEffect pattern
- Phase 23-01: .as('ratio') is correct for update().to().as() — 'number' was never a valid RatioType value
- Phase 23-02: waveType requires stop/recreate in OscillatorDemo — Web Audio API OscillatorNode.type immutable after start; freq/gain update in real-time
- Phase 23-02: document-level mouseup for XYPad canvas drag interactions — canvas-only misses out-of-bounds releases
- Phase 23-02: Oscillator.stop() already respects ADSR release — no additional scheduling needed in demo components
- Phase 23-02: Remove oscillator from map before stop() in SynthKeyboard so re-press during release creates fresh oscillator
- Phase 23-03: HiDPI canvas pattern — store logical dims as data-logical-width/height attributes for drawing functions; context scaled by devicePixelRatio
- Phase 23-03: EffectWrapper.effect is the accessor for the wrapped node; .input is the routing GainNode (not the effect node)
- Phase 23-03: FilterEffect.frequency setter (not .frequency.value AudioParam) is the correct public API
- Phase 23-04: XYPad canvas drawing functions read dataset.logicalWidth/logicalHeight (not canvas.width/height) — canvas.width is physical pixels after HiDPI setup
- [Phase 26-source-code-fixes]: Connectable.update() takes only ControlType (no value parameter) — value is chained via .to()
- [Phase 26-source-code-fixes]: Playable.play() and .stop() return Promise<void> — matches actual async BaseSound implementations
- [Phase 26-03]: playBeats() uses _playAllBeats=true (beat.playIn unconditional); playActiveBeats() uses _playAllBeats=false (beat.playInIfActive conditional); flag persists across pause/resume
- [Phase 26-03]: BeatTrack.resume() resets nextBeatTime=audioContext.currentTime (not stale pausedBeatTime) to prevent catch-up beats after long pause
- [Phase 26-03]: Beat.playIn() flag reset uses nested setTimeout inside offset callback — set true, then schedule reset after this.duration ms
- [Phase 26-source-code-fixes]: onPlaySet dedup uses startingValues-only filter: last bare to() wins, ramp arrays preserved, multi-point automation changed
- [Phase 26-source-code-fixes]: SAFE_NEAR_ZERO = 0.00001 for exponentialRampToValueAtTime zero guard — MDN standard workaround
- [Phase 26-source-code-fixes]: OscillatorController and SoundController now support all ControlType values in scheduled automation
- [Phase 26-02]: seek().as() returns Promise<void> — callers seeking while playing must await to avoid race with stop()
- [Phase 26-02]: _isPaused explicit flag preferred over startOffset > 0 guard — startOffset can be 0 when track is paused at start
- [Phase 26-02]: Track._onPlaybackStarted() is the single onended owner for Track; BaseSound.playAt() sets it first then Track overrides — intentional
- [Phase 26-source-code-fixes]: Phase 26-05: Oscillator GainNode disconnect wrapped in try/catch; AudioSprite activeSources only tracks looping sprites; LayeredSound layerEndHandlers Map for reliable off() deduplication
- [Phase 26-source-code-fixes]: mungeSoundFont validation sequence: type check, MIDI.Soundfont. marker, = assignment, boundary check, JSON.parse try/catch
- [Phase 26-source-code-fixes]: Response cache: store clone / consume original in load() and createSprite() — more defensive than clone-on-read
- [Phase 26-source-code-fixes]: GainEffect equal-power: cos(mix*π/2)*dry + sin(mix*π/2)*wet avoids volume dip at midpoint
- [Phase 27-package-quality-readme]: CI badge uses shields.io github/actions/workflow/status URL (not github.com badge.svg) so all 3 badges use img.shields.io domain for consistent grep verification
- [Phase 27-01]: homepage and bugs fields ordered before repository in package.json per ESLint jsonc/sort-keys rule
- [Phase 27-01]: SoundController and OscillatorController exported as named exports for advanced consumers needing direct controller access
- [Phase 27-01]: Player interface exported (not type-only) as a concrete contract for useInteractionMethods API consumers
- [Phase 28-documentation-corrections]: percentPlayed is 0-100 — progress bar code updated: no * 100 multiplication needed
- [Phase 28-documentation-corrections]: createAnalyzer() requires AudioContext as first arg — getAudioContext() added before each call in visualization.md
- [Phase 28-documentation-corrections]: Effect bypass auto-rewires chain — manual rewireEffects() after bypass toggle removed from docs
- [Phase 28]: Envelope section placed under ADSR Envelope subsection — logical grouping since Envelope class powers oscillator envelopes
- [Phase 28]: Preloading Audio section added alongside Cache Management — natural pairing for load/clear workflow
- [Phase 29-demo-component-fixes]: SampledDrumKit cleanup: null references not stop() — Sampler has no stop() method; one-shot sounds complete naturally
- [Phase 29-demo-component-fixes]: DrumMachineVue BPM: setTempo() directly from watch — no stop/restart gap; setTempo updates on next scheduler tick
- [Phase 29-demo-component-fixes]: FilterDemo bypass: filter.bypass direct assignment — Phase 19 auto-rewire handles chain reconnect; no rewireEffects() needed
- [Phase 29]: Font.notes (public array) used directly in SoundfontPiano cleanup — Font has no getNotes() method
- [Phase 29]: AmbientGenerator.vue textureFilter.frequency setter confirmed correct — no change needed
- [Phase 29-demo-component-fixes]: import type ordering: ez-web-audio type imports before vue value imports per perfectionist/sort-imports rule
- [Phase 29-demo-component-fixes]: SoundfontPiano font.notes cast removed: Font.notes is SampledNote[] — cast unnecessary once font is typed as Font
- [Phase 29-demo-component-fixes]: lib: any retained for dynamic import module references — no clean type for await import() result in variable
- [Phase 30]: playFor isPlaying lifecycle test uses spy on stop() rather than settle-waiting for flag reset — audioContextAwareTimeout uses requestAnimationFrame (not native setTimeout) and doesn't fire in happy-dom test environment
- [Phase 30-test-coverage-expansion]: stubGlobal('AudioContext', MockAudioContext) required because play-together.ts uses instanceof AudioContext and happy-dom does not define AudioContext
- [Phase 30-test-coverage-expansion]: Plain object with mutable currentTime cast as AudioContext is simpler for timeout tests — avoids async lifecycle of real MockAudioContext
- [Phase 30-test-coverage-expansion]: addFilter() API does not exist on Oscillator — constructor-only filter setup; tests use getFilters() verification
- [Phase 30-test-coverage-expansion]: BeatTrack/Sampler have no getEffects()/addEffect() — effects live on individual Sound instances within BeatTrack; integration tests verify per-Sound effect persistence
- [Phase 31-e2e-integration-test-expansion]: waitForSelector('.VPContent') + waitForLoadState('networkidle') replaces waitForTimeout(3000) for VitePress SPA hydration
- [Phase 31-e2e-integration-test-expansion]: Mobile viewport for E2E uses iPhone 14 dimensions (390x844) via test.use({ viewport })
- [Phase 31-02]: Oscillator filter API uses named options (lowpass/highpass/bandpass) not a filters array — plan test code had wrong signature, corrected
- [Phase 31-02]: LayeredSound.play() calls layer.playAt(startTime) for exact sync — spy target must be playAt not play in integration tests
- [Phase 33-dx-convenience-apis]: createAnalyzer overload in index.ts (not analyzer.ts) — index.ts has getOrCreateAudioContext() access; keeps Analyzer class dependency-free
- [Phase 33-dx-convenience-apis]: note option takes precedence over frequency in OscillatorOptions — note is higher-level API; frequencyMap cast as Record<string, number> for string key lookup
- [Phase 33-dx-convenience-apis]: BeatTrack.setPattern shorter arrays default remaining beats to inactive — prevents stale state from prior patterns
- [Phase 33-dx-convenience-apis]: fadeOut returns Promise via _trackedTimeout wrapping stop() for cleanup tracking
- [Phase 33-dx-convenience-apis]: Sound._isLooping override keeps loop logic in Sound, BaseSound default is false
- [Phase 33-dx-convenience-apis]: Track inherits loop from Sound — no setup() override means Sound.setup() handles AudioBufferSourceNode.loop for both
- [Phase 34]: BeatTrack on/off/once tests trigger events via stop() since BeatTrack uses a private internal eventTarget — spy-based approaches not needed
- [Phase 34]: changeGainTo() warn tests use vi.spyOn(console, 'warn').mockImplementation pattern to suppress test output noise
- [Phase 34-test-gap-closure]: Factory function tests use vi.resetModules() + vi.stubGlobal('fetch') pattern matching existing index.test.ts conventions
- [Phase 34-test-gap-closure]: Oscillator frequency:0 test replaced with accurate documentation: 0 is falsy so defaults to 440 via || operator, negative values throw
- [Phase 34-test-gap-closure]: AudioSprite stop/stopAll tests use per-test createdSources factory to track unique source nodes per play() call
- [Phase 35]: concepts.md trimmed from 693 to 245 lines by splitting parameter control and utilities into dedicated guide pages
- [Phase 35]: synthesis.md changeFrequencyTo() replaced with update('frequency').to().as('ratio') — fluent API is the recommended consistent pattern
- [Phase 35]: audio-routing.md all wrapEffect(ctx, node) calls updated to 1-arg wrapEffect(node) form
- [Phase 35-documentation-expansion]: AudioSpriteDemo uses kick1.wav with artificial sprite regions — no dedicated sprite file in assets
- [Phase 35-documentation-expansion]: CrossfadeDemo loads short-music.mp3 twice as two Track instances for bidirectional crossfade demo
- [Phase 35-documentation-expansion]: Composition sidebar section added for AudioSprite/LayeredSound/Crossfade — composition patterns distinct from Sampling
- [Phase 35]: React example uses pure markdown code blocks — satisfies DOC2-08 since page documents React patterns, not Vue; ESLint processes tsx code blocks in markdown so imports must follow perfectionist/sort-imports rules
- [Phase 36-01]: Pre-existing lint errors in utilities.md code block import sort order are out-of-scope — present before this plan, no new errors introduced
- [Phase 36-01]: concepts.md TimeObject example condensed to prose to keep file under 250 lines while preserving information
- [Phase 36-02]: docs/api/ is gitignored — TypeDoc output generated during build, not committed
- [Phase 36-02]: JSDoc inline type mentions like Promise<void> must use backticks to avoid VitePress HTML parse errors in generated API docs
- [Phase 36-02]: changeFrequencyTo removed in Phase 26 — correct replacement is fluent update('frequency').to(v).as('ratio')
- [Phase 37-nice-to-have-dx-features]: AudioEventSource uses import type in event-types.ts — erased at compile time, no circular runtime dep between base-sound.ts and event-types.ts
- [Phase 37-nice-to-have-dx-features]: SoundControlType is manual literal union 'gain'|'pan'|'detune' — keeps Sound types stable when consumers augment ControlTypeMap
- [Phase 37-nice-to-have-dx-features]: Connectable.update narrowed to SoundControlType; Oscillator overrides with ControlType — method override satisfies TypeScript covariance rules
- [Phase 37-nice-to-have-dx-features]: AudioInput union type (string|ArrayBuffer|Blob|File) extends createSound/createTrack for ergonomic raw data input
- [Phase 37-nice-to-have-dx-features]: createNoise('white'|'pink'|'brown') unified factory: pink uses Voss-McCartney 16-generator, brown uses cumulative random walk ±0.02 clamped to [-1,1]
- [Phase 37-nice-to-have-dx-features]: volume getter/setter alias on BaseSound delegates to changeGainTo() — reuses validation (negative throws, >1 warns)
- [Phase 37-nice-to-have-dx-features]: createTracks() mirrors createSounds() pattern — same progress callback signature (loaded, total, url)
- [Phase 37-nice-to-have-dx-features]: TypedEventEmitter uses any in implementation signatures — resolves TS overload contravariance; BeatTrack kept as-is (delegated EventTarget, extends Sampler not EventTarget)
- [Phase 37-nice-to-have-dx-features]: TypedEventEmitter self-referential constraint avoids requiring index signature on existing SoundEventMap/LayeredSoundEventMap interfaces
- [Phase 38]: concepts.md trimmed to ~262 lines by condensing ADSR, init, and effect chain sections for 250-line target
- [Phase 38]: Pre-existing lint errors (43) left unfixed — not introduced by Phase 38; typecheck and 1109 tests pass
- [Phase 44-docs-site-seo-and-accessibility]: XY Pad oscillator starts on first arrow keydown and stops when all arrow keys released — matches mouse press-and-hold semantics
- [Phase 44-docs-site-seo-and-accessibility]: canvas:focus and .key:focus updated to :focus-visible — avoids outline appearing on mouse click (modern a11y practice)
- [Phase 44-docs-site-seo-and-accessibility]: OG image generated with pure Node.js Buffer writes — no external dependencies, valid PNG
- [Phase 44-docs-site-seo-and-accessibility]: transformHead hook generates per-page og:title, og:description, og:url, canonical link — static duplicates removed from head array
- [Phase 44-02]: button:focus-visible applied component-scoped in each Vue component — consistent 2px brand-color outline pattern
- [Phase 44-02]: DrumMachine beat-cell uses flex-direction:column to stack beat-number and beat-active-indicator vertically

### Roadmap Evolution

- Phase 39 added: Documentation Code Correctness (review findings CR2, HI2, HI3, M9-M12)
- Phase 40 added: Build and Type Declaration Fixes (review findings CR1, HI1, M19, M20, L23-L25, L27)
- Phase 41 added: API Type Safety (review findings HI6, M7, L5, L6)
- Phase 42 added: Source Code Correctness Bugs (review findings M1-M4, L1, L9)
- Phase 43 added: Test Coverage Gaps (review findings M13-M18, L15-L20)
- Phase 44 added: Docs Site SEO and Accessibility (review findings HI4, HI5, M21-M24, L29-L36)
- Phase 45 added: Architecture Improvements (review findings M5, M6, M8, L4, L7, L8)

### Pending Todos

None active.

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-24
Stopped at: Phase 44 complete, ready to plan Phase 45
Resume file: None

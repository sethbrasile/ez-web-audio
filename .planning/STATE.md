# Project State: EZ Audio

**Last Updated:** 2026-02-22 (Phase 27 complete: professional README, package metadata, CI gates)
**Current Focus:** Phase 28 — Documentation Corrections

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Make the Web Audio API easy to use
**Current focus:** Phase 28 — Documentation Corrections

## Current Position

Phase: 28 of 31 (Documentation Corrections)
Plan: Not started
Status: Ready to plan
Last activity: 2026-02-22 — Phase 27 complete (2 plans, 8/8 success criteria verified)

**Progress:** [██████████] 97%

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

### Pending Todos

None active.

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 27-01-PLAN.md
Resume file: None

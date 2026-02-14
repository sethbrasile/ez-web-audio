# Project State: EZ Audio

**Last Updated:** 2026-02-14T07:21:44Z
**Current Focus:** Phase 9 - Interactive Examples (In Progress)

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** Spiritual successor to ember-audio, rebuilt as framework-agnostic TypeScript library. Core architecture (BaseSound, controllers, interfaces) is solid. v1 adds advanced features (ADSR, LayeredSound, effects) while maintaining zero dependencies and simplicity.

## Current Position

**Phase:** 9 of 9 (Interactive Examples)
**Plan:** 1 of 9+ complete
**Status:** In progress

**Progress:** [████████████████████░] 98% (Phase 9.1 complete)

**Phase Goal:** Create interactive examples for the documentation site that demonstrate library features.

**Next Action:** Continue Phase 9 (Plan 02+ - build example components).

## Performance Metrics

**Roadmap:**
- Total phases: 9
- Current phase: 9 (in progress)
- Completed phases: 8
- Phase 9 progress: 1/9+ plans

**Velocity:**
- Plan 02-01 completed in 6 minutes
- Plan 02-03 completed in 13 minutes
- Plan 02-04 completed in 6 minutes
- Plan 03-01 completed in 4 minutes
- Plan 03-02 completed in 7 minutes
- Plan 03-03 completed in 5 minutes
- Plan 04-01 completed in 9 minutes
- Plan 04-02 completed in 11 minutes
- Plan 04-03 completed in 14 minutes
- Plan 05-01 completed in 8 minutes
- Plan 05-02 completed in 6 minutes
- Plan 05-03 completed in 6 minutes
- Plan 05-04 completed in 7 minutes
- Plan 06-01 completed in 8 minutes
- Plan 06-04 completed in 6 minutes (gap closure)
- Plan 07-01 completed in 10 minutes
- Plan 07-02 completed in 8 minutes
- Plan 07-02b completed in 9 minutes
- Plan 07-03 completed in 3 minutes
- Plan 07-04 completed in 2 minutes
- Plan 07-05 completed in 3 minutes
- Plan 07-06 completed in 38 minutes (includes human verification)
- Plan 08-01 completed in 2 minutes
- Plan 08-02 completed in 3 minutes
- Plan 09-01 completed in 2 minutes

## Accumulated Context

### Decisions Made

**Architectural:**
- BaseSound extends EventTarget pattern (Phase 1) - native browser API for events
- ADSR as separate Envelope class, integrated via controllers (Phase 2)
- LayeredSound uses composition over inheritance (Phase 4)
- Effects integrate with existing connections array (Phase 5)
- Effect interface: input, output, bypass, mix properties (Phase 5)
- Analyzer at end of chain shows processed signal (Phase 5)

**Technical:**
- All features use native Web Audio API (zero dependencies maintained)
- Event timing uses audioContext.currentTime (prevents timer desynchronization)
- AudioParam automation always uses scheduling methods (never direct assignment)
- Tree-shakeable exports (Phase 8)

**Phase 6 Decisions:**
- Avoided fake timers for complex async - Mock AudioContext and settle() helper work better
- Used spies for method verification - vi.spyOn() to verify methods called without timing dependencies
- Focused on API correctness - Tests verify fluent API patterns return correct objects
- Event payload validation - Tests verify event detail structure matches interface
- Used vi.resetModules() for testing module-level state (AudioContext singleton)
- Documented automated vs manual testing boundaries for iOS behavior

**Phase 7 Decisions:**
- Upgrade TypeDoc to 0.28.x (peer dependency for typedoc-plugin-markdown)
- Create tsconfig.typedoc.json (exclude test files from documentation)
- Track VitePress source files in git (exclude generated docs/api/)
- Modern JSDoc with @example tags for all public APIs (Plan 02)
- Factory function preference noted in constructor docs (Plan 02)
- Getting Started prioritizes quick wins (first sound in 5 minutes)
- Core Concepts uses diagrams and tables for visual clarity
- Component-first examples: interactive demos at top of pages before code (Plan 05)
- Combined TypeDoc + VitePress in single docs:build script (Plan 06)
- Split GitHub Actions into build and deploy jobs (Plan 06)

**Phase 8 Decisions:**
- ESM-only build (no CommonJS/UMD) - modern Node.js/bundler support only
- Per-file type declarations (rollupTypes: false) - better IDE "Go to Definition" experience
- Unminified source for npm - consumers handle minification in their builds
- External source maps and declaration maps included for debugging and IDE navigation
- Version 0.1.0 for initial release - allows breaking changes before 1.0 stabilization
- Modern package.json exports field only (no legacy main/module fallback)
- Tree-shaking via sideEffects: false
- Files whitelist (dist, README.md, LICENSE) for security
- Use pnpm 10 in CI to match packageManager field (Plan 02)
- Run tests before publishing to fail fast on broken builds (Plan 02)
- Include npm provenance flag for supply chain attestation (Plan 02)
- Exclude src/app and src/test from package via dts plugin (Plan 02)

**Phase 9 Decisions:**
- Skip large MP3s (barely-there.mp3, do-wah-diddy.mp3) - keep docs audio under 7MB
- Keep existing synthesis.md for backward compatibility during transition
- Attribution for sample packs in LICENSE.txt (Prezja Productions, Erkan Dogantimur)
- Total audio budget under 7MB for efficient GitHub Pages deployment

**Scope:**
- Visualization (VIZ) included in Phase 5 (research suggested optional v2)
- Debug mode included in Phase 5 (development tool value)
- Framework bindings (React/Vue) deferred to v2 (separate packages)

### Roadmap Evolution

- Phase 9 added: Interactive Examples

### Active TODOs

**Phase 7 Execution (Complete):**
- [x] Plan 01: VitePress Documentation Setup
- [x] Plan 02: Core API JSDoc Documentation
- [x] Plan 02b: Remaining Classes JSDoc Documentation
- [x] Plan 03: Getting Started and Core Concepts
- [x] Plan 04: Interactive Audio Demo Components
- [x] Plan 05: Interactive Example Pages
- [x] Plan 06: Deployment Pipeline

**Cross-Phase:**
- [x] Verify standardized-audio-context-mock supports event testing - VERIFIED (works)
- [x] ADSR envelope retriggering - IMPLEMENTED (Plan 03)
- [x] Voice pooling strategy for LayeredSound - RESOLVED (no pooling, fresh Set per play)
- [ ] Research impulse response libraries for effects presets (Phase 7)

### Known Blockers

None active.

### Research Findings

**From research/SUMMARY.md:**

**Critical Pitfalls to Prevent:**
1. ~~ADSR envelope retriggering discontinuities (Phase 2)~~ - SOLVED: pick up from current value, use cancelAndHoldAtTime
2. JavaScript timer / AudioContext clock desynchronization (Phase 1) - use audioContext.currentTime for scheduling
3. AudioParam event accumulation performance (Phase 2, 5) - swap nodes periodically, use cancelScheduledValues
4. AudioBufferSourceNode single-use violation (Phase 3, 4) - create new source per playback
5. Direct AudioParam assignment during automation (Phase 2, 5) - always use AudioParam methods

### Test Coverage Summary

**711 tests across 29 test files:**
- Sound: 70 tests
- Track: 64 tests
- Oscillator: 19 tests
- Sampler: 16 tests
- BeatTrack: 16 tests
- Controllers: 98 tests (BaseParamController, SoundController, OscillatorController)
- AudioContext init: 23 tests (initAudio, getAudioContext, unlockAudioContext)
- And more across all feature areas

## Session Continuity

**Last session:** 2026-02-14T07:21:44Z
**Stopped at:** Completed 09-01-PLAN.md (Foundation Setup)
**Resume file:** None

**Where we are:**
Phase 9 (Plan 1 complete). Foundation for interactive examples established:
- Audio assets copied to docs/public/audio/ (~6.7MB total)
- VitePress sidebar restructured with 5 category groups
- Examples overview page rewritten with all 10 planned examples
- Proper attribution in LICENSE.txt for sample packs

**What's next:**
Phase 9 Plan 02+ (Build interactive example components - Drum Machine, Synth Keyboard, etc.)

**Context to preserve:**
- All audio assets available at /ez-web-audio/audio/ paths
- Sidebar shows: Examples, Sampling, Synthesis, Timing & Sequencing, Effects & Routing
- Overview page lists 10 examples with descriptions and learning objectives
- Total docs audio: ~6.7MB (9 WAV drum samples + piano.js soundfont + note MP3s)
- License attribution: Prezja Productions (kick/snare), Erkan Dogantimur (hi-hat)

---

*STATE.md updated: 2026-02-14T07:21:44Z*

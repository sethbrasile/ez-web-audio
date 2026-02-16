# Project State: EZ Audio

**Last Updated:** 2026-02-16
**Current Focus:** Milestone v1.1 - Quality & Polish

## Project Reference

**Core Value:** Make the Web Audio API easy to use. If the API is confusing or requires the user to understand Web Audio internals, we've failed.

**Context:** All v1 feature work complete (11 phases, 83 requirements). v1.1 is a comprehensive audit and polish milestone before npm publish.

## Current Position

Phase: 15 of 16 (Test Coverage)
Plan: 02 of 04 complete
Status: In Progress - Improving test quality and edge case coverage
Last activity: 2026-02-16 — Fixed 6 false positive tests and added 30+ edge case tests covering boundary conditions, rapid state changes, and input validation (15-02)

**Progress:** [███████████░░] 88%

## Roadmap Summary

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 12 | Comprehensive Audit | QUAL-01, QUAL-03, DX-01-04, MAINT-01-03, TEST-03 | Complete (5/5) |
| 13 | Code Quality Implementation | QUAL-02, QUAL-04 | Complete (4/4) |
| 14 | Docs & Examples Polish | DOCS-01-05 | Complete (6/6) |
| 15 | Test Coverage | TEST-01, TEST-02 | In Progress (1/4) |
| 16 | SEO & Discoverability | SEO-01-03 | Not started |

## Accumulated Context

### Decisions Made

Carried forward from v1 — see previous STATE.md commits for full history.
- [Phase 12]: Confirmed library ships with zero runtime dependencies
- [Phase 12]: Identified 3 critical security vulnerabilities requiring immediate upgrades
- [Phase 12]: Created 6-phase upgrade plan prioritizing security fixes
- [Phase 12]: Prioritize error path testing in Phase 15 (found largely untested)
- [Phase 12]: Create test files for untested core features (font.ts, sampled-note.ts, create-time-object.ts, frequency-map.ts)
- [Phase 12]: Fix 6 false positive tests that provide zero value
- [Phase 12]: Single global AudioContext blocks v2 spatial audio - requires opt-in multi-context mode
- [Phase 12]: ControlType union should be extensible via mapped type for v2 parameter additions
- [Phase 12]: Spatial audio requires PannerNode (3D) vs StereoPannerNode (2D) - add setSpatialMode() API
- [Phase 12]: Framework bindings (React/Vue) require zero library changes - external packages only
- [Phase 12 DX]: Found 4 critical DX issues: missing validations (BPM/noteType/numBeats/gain), effect bypass footgun, type naming inconsistency, Web Audio leaks
- [Phase 12 DX]: .from() method name confusing in fluent APIs - recommend .as() or .using()
- [Phase 12 DX]: Factory functions show perfect consistency (13/13 use create* pattern)
- [Phase 12 DX]: Happy paths are 1-2 steps for all common tasks (excellent beginner DX)
- [Phase 13-01]: Extracted equal-power crossfade to shared utility (single source of truth for consistent mixing)
- [Phase 13-01]: Added safeDisconnect helper to eliminate 5 identical try/catch blocks
- [Phase 13-01]: Extracted applyRampToParam to base controller (eliminates nested switch duplication)
- [Phase 13-01]: Uncommented touchcancel event listener (prevents stuck playing state on interrupted touches)
- [Phase 13]: Use string concatenation for error messages instead of template literals (consistency)
- [Phase 13]: Keep deprecated type aliases for backwards compatibility (OscillatorOpts, OscillatorOptsFilterValues)
- [Phase 13]: Add console.warn for gain > 1 instead of error (non-fatal but alerts to potential distortion)
- [Phase 13-03]: Keep startOffset public with @deprecated tag for backwards compatibility
- [Phase 13-03]: Document noteType with formula and common values for improved discoverability
- [Phase 14-01]: Reduced default oscillator gain from 0.5 to 0.3 for safer initial volume in demos
- [Phase 14-01]: Added volume warnings to oscillator and filter demos (can be loud)
- [Phase 14-02]: Improved touch targets across interactive demos (DrumMachine beats 32px, optimized for mobile)
- [Phase 14-02]: Added comprehensive accessibility labels (aria-label, aria-pressed) to all interactive controls
- [Phase 14-02]: Canvas-based demos (XYPad) now have proper ARIA roles and keyboard navigation hints
- [Phase 14-03]: Track active oscillators in SynthDrumKit for proper cleanup (prevents memory leaks)
- [Phase 14-03]: Replace console.error with console.warn in demos (errors shown in UI, not console-critical)
- [Phase 14-03]: Add keyboard navigation to custom interactive elements (SampledDrumKit pads)
- [Phase 14-04]: Added utility functions section to Core Concepts (debug mode, crossfade, collections, white noise)
- [Phase 14-04]: Fixed seek() API calls to use required fluent .from() syntax
- [Phase 14-04]: Updated test count on homepage from 711 to 714 per current test suite
- [Phase 14-06]: Use separate Canvas instances for frequency and waveform visualization (clearer visual separation)
- [Phase 14-06]: Remove API links from documentation pages (TypeDoc paths cause dead links; use plain text references)
- [Phase 14-06]: Place creative demos in dedicated section after Effects & Routing (groups advanced examples separately)
- [Phase 15-02]: Edge case tests document current behavior without adding validation (Web Audio API handles clamping)
- [Phase 15-02]: False positive test fixes verify actual values (pan, gain, percentages) not just truthiness
- [Phase 15-02]: Modern Vitest doesn't require expect count assertions - removed all placeholders
- [Phase 15-02]: BeatTrack tempo validation already exists and works correctly (tests verify throw behavior)
- [Phase 15-01]: frequency-map has 100 entries (12 notes × 8 octaves + 4 notes in octave 8, not 84)
- [Phase 15-01]: Only test flat accidentals (sharps commented out in frequency-map)
- [Phase 15-01]: Use mock SampledNote objects for Font tests (avoid AudioContext setup complexity)
- [Phase 15-01]: Pre-existing test failures in unrelated files logged to deferred-items.md (out of scope for utility module tests)

### Known Blockers

None active.

### Test Coverage Summary

**873 tests across 36 test files** (Phase 15-01 added 93 tests for untested modules; Phase 15-02 added 30+ edge case tests and fixed 6 false positives)

---

*STATE.md updated: 2026-02-16*

---
phase: 12-comprehensive-audit
plan: 03
subsystem: quality-assurance
tags:
  - maintainability
  - forward-compatibility
  - brittleness-analysis
  - v2-planning
dependency-graph:
  requires: []
  provides:
    - brittle-areas-identified
    - v2-compatibility-assessed
    - hardening-roadmap
  affects:
    - phase-13-code-quality
    - v2-architecture
tech-stack:
  added: []
  patterns:
    - defensive-programming-gaps
    - temporal-coupling-detection
    - api-extensibility-analysis
key-files:
  created:
    - .planning/phases/12-comprehensive-audit/AUDIT-maintainability.md
  modified: []
decisions:
  - "Single global AudioContext is blocking issue for v2 spatial audio - requires opt-in multi-context mode"
  - "ControlType union should be extensible via mapped type for v2 parameter additions"
  - "Spatial audio requires PannerNode (3D) vs StereoPannerNode (2D) choice - add setSpatialMode() API"
  - "Framework bindings (React/Vue) require zero library changes - external packages only"
metrics:
  duration: 3 minutes
  tasks-completed: 2
  completed-date: 2026-02-15
---

# Phase 12 Plan 03: Maintainability & Forward-Compatibility Audit Summary

**One-liner:** Comprehensive brittleness analysis (37 issues) and v2 feature compatibility assessment across spatial audio, recording, microphone input, and framework bindings

## What Was Done

### Task 1: Identify Brittle Areas (MAINT-01)
Analyzed entire library codebase for maintainability risks across 6 categories:

**Tight Coupling (6 instances):**
- Controllers directly instantiated in Sound/Oscillator constructors
- BeatTrack.beats getter directly instantiates Beat with hardcoded args
- Sampler assumes sounds implement both Playable & Connectable interfaces

**Fragile Inheritance (6 patterns):**
- Track._onPlaybackStarted() overrides without calling super
- Oscillator.setup() relies on controller method signatures
- BaseSound.wireEffectChain() uses try/catch to hide disconnection errors

**Hard-coded Assumptions (7 issues):**
- Filter names hard-coded in array (oscillator.ts:73-82)
- Lookahead timing non-configurable (beat-track.ts:57-58)
- Single global AudioContext in module closure (index.ts:44)
- Note identifier parsing assumes 2-3 char format only

**Missing Defensive Code (10 critical gaps):**
- No null checks on effect/filter iterations
- No position validation in addEffect() (allows negative)
- No bounds check on beatIndex in scheduleBeat()
- Empty sampler crashes on play()
- Race condition in responseCache (has() vs get())

**State Management Risks (7 scenarios):**
- Track startOffset mutated during playback (concurrent seek corruption)
- Controller parameter arrays never cleared (memory leak)
- connections array mutable mid-playback (glitches)

**Connection Chain (8 edge cases):**
- Adding/removing effects mid-playback causes audio glitches
- Toggle effect.bypass requires manual rewireEffects() call
- Legacy connections come before effect chain (can't reorder)

### Task 2: Evaluate Forward-Compatibility (MAINT-02)
Assessed v2 feature compatibility for all 5 categories from REQUIREMENTS.md:

**Spatial Audio (SPATIAL-01/02/03):** Partial compatibility
- Current StereoPannerNode is 2D only - needs PannerNode for 3D
- Recommendation: Add `setSpatialMode('3d')` to create PannerNode instead
- Listener position: AudioContext.listener already available, add wrapper
- Distance models: PannerNode supports all distance models

**Recording/Capture (ADV-02):** Blocking issue
- Current chain ends at destination - no MediaStream access
- Recommendation: Add `getOutputStream(): MediaStream` that taps pannerNode
- Requires creating MediaStreamDestination node
- Non-breaking - additive API only

**Microphone Input (ADV-03):** Compatible pattern
- No MicrophoneSource class exists
- Recommendation: Create `MicrophoneInput extends BaseSound` using MediaStreamAudioSourceNode
- Fits existing class hierarchy - zero breaking changes

**React Hooks (REACT-01):** Fully compatible
- Library is framework-agnostic, returns plain objects
- Hooks wrap factory functions: `useSound(url)`, `useTrack(url)`
- Zero library changes needed

**Vue Composables (VUE-01):** Fully compatible
- Same as React - composables wrap factory functions
- Zero library changes needed

**Type Constraints Assessed:**
- ControlType union is hardcoded - needs extensibility for new parameters
- Playable interface too minimal - no `isPlaying` or `duration` introspection
- Connectable assumes stereo panner - incompatible with 3D spatial
- Recommendation: Make pannerNode generic: `StereoPannerNode | PannerNode`

**Module Structure:**
- Single barrel export from index.ts - tree-shakable by modern bundlers
- No sub-package structure for ez-audio/react or ez-audio/spatial
- Recommendation: Monorepo structure with packages/core, packages/react, packages/vue

## Deviations from Plan

None - plan executed exactly as written. Both MAINT-01 and MAINT-02 completed in single comprehensive analysis pass.

## Key Decisions Made

1. **Single AudioContext is v2 blocker:** Current global AudioContext pattern (index.ts:44) blocks multi-context scenarios (spatial audio, multi-scene apps). Decision: Add opt-in multi-context mode in v2 without breaking existing API.

2. **ControlType needs extensibility:** Hardcoded union type blocks adding parameters (playbackRate, spatialPosition). Decision: Migrate to mapped type or plugin system in v2.

3. **Spatial audio requires API choice:** 2D (StereoPannerNode) vs 3D (PannerNode) are incompatible node types. Decision: Add `setSpatialMode('3d')` method that switches internal node type. Default remains 2D for backward compatibility.

4. **Framework bindings are external packages:** React/Vue hooks don't require library changes. Decision: Create separate npm packages (ez-audio-react, ez-audio-vue) that import from core.

## Hardening Priorities (Phase 13)

**Immediate (P0 - Safety):**
1. Add null checks to effect/filter/sound iterations (prevents crashes)
2. Add bounds validation to seek(), addEffect() position, beatIndex
3. Validate sampler has sounds before play()
4. Fix responseCache race condition (has() -> get())

**High (P1 - Correctness):**
5. Clear controller parameter arrays between plays (memory leak)
6. Add mutex or disable seek during Track playback (concurrent mutation)
7. Freeze connections array during playback (defensive copy)

**Medium (P2 - Developer Experience):**
8. Document temporal coupling (setup() -> wireConnections() order)
9. Document that effects should be added before playback
10. Add getFilters(), getSounds() for introspection

## v2 Preparation (Deferred)

**API Additions (non-breaking):**
- `setSpatialMode('3d')` - switches to PannerNode
- `setListenerPosition(x, y, z)` - wrapper for AudioContext.listener
- `getOutputStream(): MediaStream` - for recording
- `MicrophoneInput` class - for mic processing

**Architectural Changes:**
- Monorepo structure (packages/core, packages/react, packages/vue)
- Extensible ControlType (mapped type or plugin system)
- Optional multi-context mode (opt-in to avoid breaking changes)
- Spatial audio code split to `src/spatial/`

## Outcome

**Deliverable:** `.planning/phases/12-comprehensive-audit/AUDIT-maintainability.md`

**Findings:**
- 37 brittle areas documented with specific file/line references
- 10 critical defensive code gaps identified
- 7 hard-coded assumptions blocking extensibility
- All 5 v2 feature categories assessed for compatibility

**Verification:**
- ✅ MAINT-01: Brittle areas identified with hardening recommendations
- ✅ MAINT-02: v2 features assessed (Spatial Audio partial, Recording blocked, Mic compatible, React/Vue fully compatible)
- ✅ Each finding includes specific file/line references
- ✅ Actionable recommendations provided for Phase 13 implementation

**Next Steps:**
- Phase 13 implements P0/P1 hardening priorities (null checks, bounds validation, memory leak fixes)
- v2 milestone adds spatial audio, recording, and microphone input APIs
- External packages created for React/Vue framework bindings

## Self-Check: PASSED

**Created files verified:**
```
✓ .planning/phases/12-comprehensive-audit/AUDIT-maintainability.md (exists)
```

**Commits verified:**
```
✓ 75dfcd4: docs(12-03): identify brittle areas and hardening recommendations (MAINT-01)
```

**Content verified:**
```
✓ MAINT-01 section present (line 7)
✓ MAINT-02 section present (line 83)
✓ 37 brittle areas documented
✓ 5 v2 features assessed
✓ File/line references included
✓ Hardening recommendations provided
```

---

*Summary completed: 2026-02-15*

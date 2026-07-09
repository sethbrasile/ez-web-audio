---
round: 1
started: 2026-03-07
source_review: .planning/reviews/2026-03-07-deep-review.md
---

## Findings

### Round 1 (2026-03-07)

| ID | Source | Severity | Area | Description | Phase |
|----|--------|----------|------|-------------|-------|
| QC-1-01 | deep-review | high | PolySynth | `released` state unreachable — dead voice stealing code | 57.1 |
| QC-1-02 | deep-review | high | Transport | `(track as any)` casts to BeatTrack internals | 57.1 |
| QC-1-03 | deep-review | high | GrainPlayer | Overlap has no upper bound — can cause 1000+ grains/sec | 58.1 |
| QC-1-04 | deep-review | high | LFO | `syncLifecycle` stops ALL connections when one target stops | 54.2 |
| QC-1-05 | deep-review | high | Testing | crossfade afterFade 'continue'/'stop' untested | 60.1 |
| QC-1-06 | deep-review | high | Testing | BeatTrack.setPattern() zero test coverage | 60.1 |
| QC-1-07 | deep-review | high | GrainPlayer/PolySynth | `update().as()` ignores RatioType — silent correctness bug | 59.1 |
| QC-1-08 | deep-review | medium | Sequence | Same-beat scheduling drops events | 57.1 |
| QC-1-09 | deep-review | medium | PolySynth | Orphaned event listeners on rapid reactivation | 57.1 |
| QC-1-10 | deep-review | medium | Sequence | Position off by one loop iteration | 57.1 |
| QC-1-11 | deep-review | medium | GrainPlayer | setTimeout instead of WorkerTimer | 58.1 |
| QC-1-12 | deep-review | medium | MusicalTime | beatUnit ignored from time signature | 57.1 |
| QC-1-13 | deep-review | medium | Effects | Missing dispose() for 4 subclasses | 54.2 |
| QC-1-14 | deep-review | medium | LFO | Depth baked at connection time (docs fix) | 54.2 |
| QC-1-15 | deep-review | medium | LFO | Tests don't verify actual depth values | 60.1 |
| QC-1-16 | deep-review | medium | AudioSprite | end < start not validated | 59.1 |
| QC-1-17 | deep-review | medium | Testing | createFont(ctx) overload untested | 60.1 |
| QC-1-18 | deep-review | medium | LayeredSound | setGain/setPan bypasses output bus | 59.1 |
| QC-1-19 | deep-review | medium | Crossfade | async in setTimeout — unhandled rejections | 59.1 |
| QC-1-20 | deep-review | medium | Crossfade | _targetGain not restored after fade | 59.1 |
| QC-1-21 | deep-review | medium | PolySynth | activeVoices getter scans array every access | 57.1 |
| QC-1-22 | deep-review | medium | Transport | tracks getter allocates+freezes every access | 57.1 |
| QC-1-23 | deep-review | medium | Docs | M5 features missing from homepage/getting-started | 60.2 |
| QC-1-24 | deep-review | medium | Docs | multiple-contexts guide inaccuracies | 60.2 |
| QC-1-25 | deep-review | medium | GrainPlayer | Dead code in loop offset handling | 58.1 |

## Structural Patterns (from historical scan)

| Pattern | Slug | Reviews | Status | Fix Phase |
|---------|------|---------|--------|-----------|
| Inconsistent event system implementations | inconsistent-event-systems | 2026-03-07 | fix phase created | 57.1 |
| Missing dispose() overrides in effects | missing-effect-dispose | 2026-03-07 | fix phase created | 54.2 |
| Fluent API reimplementation without conversion | fluent-api-conversion-gap | 2026-03-07 | fix phase created | 59.1 |

## Phases Created

| Phase | Name | Status | Findings |
|-------|------|--------|----------|
| 54.2 | Effects & LFO Lifecycle Fixes | pending | QC-1-04, QC-1-13, QC-1-14 |
| 57.1 | Transport, Sequence & PolySynth Core Fixes | pending | QC-1-01, QC-1-02, QC-1-08, QC-1-09, QC-1-10, QC-1-12, QC-1-21, QC-1-22 |
| 58.1 | GrainPlayer Hardening | pending | QC-1-03, QC-1-11, QC-1-25 |
| 59.1 | Shared API Utilities & Crossfade Fixes | pending | QC-1-07, QC-1-16, QC-1-18, QC-1-19, QC-1-20 |
| 60.1 | Test Coverage Gaps | pending | QC-1-05, QC-1-06, QC-1-15, QC-1-17 |
| 60.2 | Documentation Sync | pending | QC-1-23, QC-1-24 |

## Execution Plan

### Wave 1 (parallel — all independent, touch different files)
- Phase 54.2 — Effects & LFO Lifecycle Fixes (src/effects/, src/lfo.ts)
- Phase 57.1 — Transport, Sequence & PolySynth Core Fixes (src/transport.ts, src/sequence.ts, src/poly-synth.ts)
- Phase 58.1 — GrainPlayer Hardening (src/grain-player.ts)
- Phase 59.1 — Shared API Utilities & Crossfade Fixes (src/utils/, src/layered-sound.ts, src/crossfade.ts)
- Phase 60.2 — Documentation Sync (docs/ only)

### Wave 2 (after wave 1 — tests verify fixed behavior)
- Phase 60.1 — Test Coverage Gaps (test files only, depends on 54.2, 57.1, 58.1, 59.1)

## Current Position

Round: 1
Step: planning
Next: Plan wave 1 phases (54.2, 57.1, 58.1, 59.1, 60.2)

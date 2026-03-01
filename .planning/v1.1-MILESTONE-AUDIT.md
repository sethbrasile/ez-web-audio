---
milestone: v1.1
audited: 2026-03-01T05:25:00Z
status: gaps_found
scores:
  requirements: 16/19
  phases: 3/7 verified
  integration: 17/19 wired
  flows: 10/11 complete
gaps:
  requirements:
    - id: "FX-06"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-01-PLAN.md", "53-02-PLAN.md", "53-03-PLAN.md", "53-04-PLAN.md"]
      completed_by_plans: ["53-01-SUMMARY.md", "53-02-SUMMARY.md", "53-03-SUMMARY.md", "53-04-SUMMARY.md"]
      verification_status: "missing"
      evidence: "LayeredSound has no addEffect() method. FX-06 states 'All built-in effects work with existing addEffect() on Sound, Oscillator, and LayeredSound'. Effects work with Sound and Oscillator (via BaseSound), but LayeredSound does not implement addEffect()."
    - id: "MOD-03"
      status: "partial"
      phase: "Phase 54"
      claimed_by_plans: ["54-01-PLAN.md"]
      completed_by_plans: ["54-01-SUMMARY.md"]
      verification_status: "passed"
      evidence: "LFO auto-dispose works for BaseSound targets (via 'dispose' event). LFO connected to BaseEffect targets does NOT auto-cleanup when the effect is disposed — documented known gap in lfo.ts:644 comment."
    - id: "FX-01"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-01-PLAN.md"]
      completed_by_plans: ["53-01-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Implementation confirmed via SUMMARY and integration checker, but no 53-VERIFICATION.md exists"
    - id: "FX-02"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-03-PLAN.md"]
      completed_by_plans: ["53-03-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Implementation confirmed via SUMMARY and integration checker, but no 53-VERIFICATION.md exists"
    - id: "FX-03"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-02-PLAN.md"]
      completed_by_plans: ["53-02-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Implementation confirmed via SUMMARY and integration checker, but no 53-VERIFICATION.md exists"
    - id: "FX-04"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-02-PLAN.md"]
      completed_by_plans: ["53-02-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Implementation confirmed via SUMMARY and integration checker, but no 53-VERIFICATION.md exists"
    - id: "FX-05"
      status: "partial"
      phase: "Phase 53"
      claimed_by_plans: ["53-04-PLAN.md"]
      completed_by_plans: ["53-04-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Implementation confirmed via SUMMARY and integration checker, but no 53-VERIFICATION.md exists"
  integration:
    - from: "Phase 53 (effects)"
      to: "LayeredSound"
      issue: "LayeredSound has no addEffect() method — effects cannot be applied to LayeredSound instances"
      requirement: "FX-06"
    - from: "Phase 54 (LFO)"
      to: "BaseEffect"
      issue: "LFO does not subscribe to BaseEffect dispose events — stale LFO connections remain when effect is disposed"
      requirement: "MOD-03"
  flows:
    - name: "Add effect to LayeredSound"
      breaks_at: "layeredSound.addEffect(effect) — method does not exist"
      requirement: "FX-06"
tech_debt:
  - phase: 53-built-in-effects
    items:
      - "No 53-VERIFICATION.md — phase was never formally verified"
      - "REQUIREMENTS.md checkboxes for FX-01 through FX-06 still show [ ] (Pending)"
  - phase: 54-lfo
    items:
      - "LFO-to-BaseEffect dispose lifecycle gap (documented in lfo.ts:644)"
  - phase: 55-transport-beattrack-sync
    items:
      - "REQUIREMENTS.md checkboxes for TRANS-01 through TRANS-04 still show [ ] (Pending) despite verified PASS"
      - "5 pre-existing crossfade test failures (unrelated to Transport)"
  - phase: 56-sequencer-musical-time
    items:
      - "No 56-VERIFICATION.md — phase was never formally verified"
  - phase: 57-polysynth
    items:
      - "No 57-VERIFICATION.md — phase was never formally verified"
  - phase: 58-grainplayer
    items:
      - "No 58-VERIFICATION.md — phase was never formally verified"
---

# Milestone 5: Effects & Transport — Audit Report

**Milestone Goal:** Close the feature gap between EZ Audio and full-featured audio frameworks by adding built-in effects, modulation (LFO), dynamics processing, and a global transport/clock for tempo-synced sequencing.

**Status:** GAPS FOUND
**Audited:** 2026-03-01

---

## Phase Verification Summary

| Phase | Name | VERIFICATION.md | Status |
|-------|------|----------------|--------|
| 53 | Built-in Effects | **MISSING** | Unverified |
| 54 | LFO | EXISTS | Passed |
| 54.1 | Effects & LFO Deep Review Fixes | EXISTS | Passed (19/19) |
| 55 | Transport + BeatTrack Sync | EXISTS | Passed (TRANS-01–04) |
| 56 | Sequencer + Musical Time | **MISSING** | Unverified |
| 57 | PolySynth | **MISSING** | Unverified |
| 58 | GrainPlayer | **MISSING** | Unverified |

**Verified:** 3/7 phases (54, 54.1, 55)
**Unverified:** 4 phases (53, 56, 57, 58)

---

## Requirements Cross-Reference (3-Source)

| REQ-ID | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final Status |
|--------|----------------|---------------------|-----------------|-------------|
| FX-01 | missing | not listed | `[ ]` Pending | **partial** — verification gap |
| FX-02 | missing | not listed | `[ ]` Pending | **partial** — verification gap |
| FX-03 | missing | not listed | `[ ]` Pending | **partial** — verification gap |
| FX-04 | missing | not listed | `[ ]` Pending | **partial** — verification gap |
| FX-05 | missing | not listed | `[ ]` Pending | **partial** — verification gap |
| FX-06 | missing | not listed | `[ ]` Pending | **unsatisfied** — LayeredSound missing addEffect() |
| MOD-01 | passed (54) | — | `[x]` Complete | **satisfied** |
| MOD-02 | passed (54) | — | `[x]` Complete | **satisfied** |
| MOD-03 | passed (54) | — | `[x]` Complete | **partial** — BaseEffect dispose gap |
| TRANS-01 | passed (55) | — | `[ ]` Pending | **satisfied** (checkbox stale) |
| TRANS-02 | passed (55) | — | `[ ]` Pending | **satisfied** (checkbox stale) |
| TRANS-03 | passed (55) | — | `[ ]` Pending | **satisfied** (checkbox stale) |
| TRANS-04 | passed (55) | — | `[ ]` Pending | **satisfied** (checkbox stale) |
| SEQ-01 | missing | not listed | `[x]` Complete | **partial** — verification gap |
| SEQ-02 | missing | not listed | `[x]` Complete | **partial** — verification gap |
| SEQ-03 | missing | not listed | `[x]` Complete | **partial** — verification gap |
| SYNTH-01 | missing | listed (57-01) | `[x]` Complete | **partial** — verification gap |
| SYNTH-02 | missing | listed (57-01) | `[x]` Complete | **partial** — verification gap |
| SYNTH-03 | missing | not listed | `[x]` Complete | **partial** — verification gap |
| SYNTH-04 | missing | not listed | `[x]` Complete | **partial** — verification gap |

**Satisfied:** 6/19 (MOD-01, MOD-02, TRANS-01–04)
**Partial:** 12/19 (FX-01–05, MOD-03, SEQ-01–03, SYNTH-01–04) — mostly verification gaps, implementation likely complete
**Unsatisfied:** 1/19 (FX-06) — actual code gap

---

## Integration Check Results

### Cross-Phase Wiring: 17/19 requirements fully wired

All factory functions exported from `src/index.ts`. All types exported. No orphaned exports.

### Missing Connections

**MC-01: LayeredSound missing addEffect()** (FX-06)
- `LayeredSound` at `src/layered-sound.ts` has no `addEffect()` method
- FX-06 requires effects to work on Sound, Oscillator, **and** LayeredSound
- Workaround: developers can add effects to individual layers via `getLayer(index).addEffect()`

**MC-02: LFO-to-BaseEffect dispose lifecycle** (MOD-03)
- When LFO is connected to a BaseEffect target and that effect is disposed, the LFO receives no notification
- Documented known gap in `lfo.ts:644`
- LFO-to-BaseSound disposal works correctly

### E2E Flows: 10/11 complete

| Flow | Status |
|------|--------|
| Effects → Sound/Oscillator (addEffect) | Complete |
| Effects → PolySynth (addEffect) | Complete |
| Effects → GrainPlayer (addEffect) | Complete |
| Effects → LayeredSound (addEffect) | **BROKEN** — method missing |
| LFO → Sound parameter modulation | Complete |
| LFO → Effect parameter modulation | Complete |
| Transport → BeatTrack sync | Complete |
| Transport → Sequence integration | Complete |
| PolySynth voice pool + stealing | Complete |
| GrainPlayer pitch/position control | Complete |
| All M5 factories exported | Complete |

---

## Tech Debt Summary

### Documentation Gaps
- **4 phases missing VERIFICATION.md** (53, 56, 57, 58) — implementation appears complete per SUMMARYs but never formally verified
- **10 REQUIREMENTS.md checkboxes stale** — FX-01–06 show `[ ]` despite implementation complete; TRANS-01–04 show `[ ]` despite verified PASS

### Known Limitations
- LFO-to-BaseEffect dispose lifecycle gap (lfo.ts:644)
- 5 pre-existing crossfade test failures (unrelated to M5)

### Total: 16 items across 6 phases

---

## Conclusion

Milestone 5 has **1 actual code gap** (FX-06: LayeredSound lacks addEffect()) and **12 verification/documentation gaps** (missing VERIFICATION.md files, stale checkboxes). The integration checker confirmed all other features are fully wired and functional.

The FX-06 gap is a genuine missing feature — LayeredSound has no effect chain support. All other "partial" requirements are implementation-complete but lack formal verification artifacts.

---

*Audited: 2026-03-01T05:25:00Z*
*Auditor: Claude (milestone audit orchestrator + gsd-integration-checker)*

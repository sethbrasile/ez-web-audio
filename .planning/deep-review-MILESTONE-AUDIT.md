---
milestone: deep-review-hardening
audited: 2026-02-28T01:00:00Z
status: tech_debt
scores:
  requirements: 29/29
  phases: 5/6
  integration: 28/28
  flows: 6/6
gaps:
  requirements: []
  integration: []
  flows: []
tech_debt:
  - phase: 48-safety-and-correctness
    items:
      - "Missing VERIFICATION.md — 6 requirements (SAFE-01 through SAFE-06) have SUMMARY evidence and REQUIREMENTS.md checkboxes but no formal gsd-verifier report"
  - phase: 52-documentation-examples
    items:
      - "Human verification needed: playTogether audio timing (simultaneous vs sequential) cannot be verified statically"
      - "Human verification needed: VitePress :::warning callout rendering for consume-once semantics"
---

# Deep Review Hardening — Milestone Audit

**Milestone Goal:** Address all findings from the 2026-02-26 deep review — fix the ship-blocker type declaration bug, eliminate runtime crashes and unhandled rejections, clean up public exports, optimize hot-path performance, fix misleading docs, strengthen test assertions, and improve build/refactoring quality.

**Audited:** 2026-02-28
**Status:** TECH_DEBT — all requirements satisfied, no critical blockers, minor process debt

## Phase Verification Summary

| Phase | Name | VERIFICATION.md | Status | Score |
|-------|------|-----------------|--------|-------|
| 47 | Ship-Blocker Fix | Present | PASSED | 4/4 |
| 48 | Safety & Correctness | **MISSING** | Unverified | — |
| 49 | Export Cleanup | Present | PASSED | 4/4 |
| 50 | Code Quality | Present | PASSED | 6/6 |
| 51 | Performance & Safety | Present | PASSED | 8/8 |
| 52 | Documentation & Examples | Present | PASSED | 8/8 |

**Phase Score:** 5/6 verified (Phase 48 missing formal verification)

## Requirements Coverage (3-Source Cross-Reference)

### Fully Satisfied (VERIFICATION + SUMMARY + REQUIREMENTS.md agree)

| REQ-ID | Description | Phase | VERIFICATION | SUMMARY | REQ [x] |
|--------|-------------|-------|--------------|---------|---------|
| SHIP-01 | Published type declarations free of test-only deps | 47 | SATISFIED | listed | [x] |
| EXPORT-01 | _disposeUnmute not a public export | 49 | SATISFIED | listed | [x] |
| EXPORT-02 | createFont → AudioLoadError; Oscillator → InvalidNoteError | 49 | SATISFIED | listed | [x] |
| REFAC-01 | Gain-interception extracted to BaseSound | 50 | SATISFIED | listed | [x] |
| REFAC-02 | Controller applyValues/applyRampValues extracted | 50 | SATISFIED | listed | [x] |
| TEST-01 | onPlaySet/onPlayRamp verify scheduled values | 50 | SATISFIED | listed | [x] |
| TEST-02 | Sound end event test for natural completion | 50 | SATISFIED | listed | [x] |
| TEST-03 | Event listeners stop after dispose() | 50 | SATISFIED | listed | [x] |
| BUILD-01 | Publish workflow tag verification | 50 | SATISFIED | listed | [x] |
| PERF-02 | durationRaw numeric getter | 51 | SATISFIED | listed | [x] |
| PERF-04 | audioContext.resume() guarded | 51 | SATISFIED | listed | [x] |
| PERF-05 | AudioSprite skips nodes at defaults | 51 | SATISFIED | listed | [x] |
| PERF-06 | Crossfade curves cached | 51 | SATISFIED | listed | [x] |
| SAFE-07 | AudioContext replacement warning | 51 | SATISFIED | listed | [x] |
| SAFE-08 | dispose() silences events | 51 | SATISFIED | listed | [x] |
| SAFE-09 | LayeredSound.dispose() | 51 | SATISFIED | listed | [x] |
| SAFE-10 | changePanTo() warns outside [-1, 1] | 51 | SATISFIED | listed | [x] |
| DOCS-01 | Vibrato consume-once caveat | 52 | SATISFIED | listed | [x] |
| DOCS-02 | README seek example corrected | 52 | SATISFIED | listed | [x] |
| DOCS-03 | Soundfont parsing caveat | 52 | SATISFIED | listed | [x] |
| DOCS-04 | playTogether example page | 52 | SATISFIED | listed | [x] |
| DX-01 | createBeatTrack/createSampler accept AudioInput[] | 52 | SATISFIED | listed | [x] |

### Partial — Verification Gap (SUMMARY + REQUIREMENTS.md agree, VERIFICATION missing)

| REQ-ID | Description | Phase | VERIFICATION | SUMMARY | REQ [x] |
|--------|-------------|-------|--------------|---------|---------|
| SAFE-01 | Fire-and-forget play methods handle rejections | 48 | MISSING | listed | [x] |
| SAFE-02 | dispose() disconnects audioSourceNode | 48 | MISSING | listed | [x] |
| SAFE-03 | BeatTrack.dispose() | 48 | MISSING | listed | [x] |
| SAFE-04 | Track.percentPlayed zero-guard | 48 | MISSING | listed | [x] |
| SAFE-05 | Track.seek() race condition guard | 48 | MISSING | listed | [x] |
| SAFE-06 | LayeredSound.play() Promise.allSettled | 48 | MISSING | listed | [x] |

**Note:** These 6 requirements have strong evidence of completion (SUMMARY frontmatter claims them, REQUIREMENTS.md marks them [x], commit hashes exist, and the integration checker verified the code exists at expected locations). The gap is purely a missing formal verification report.

### Pre-existing / Removed

| REQ-ID | Description | Status |
|--------|-------------|--------|
| PERF-01 | Preload cache stores decoded AudioBuffer | Pre-existing — complete before this milestone |
| PERF-03 | Scheduler tick() single pass | Removed as N/A — already implemented |

### Orphan Detection

**0 orphaned requirements.** All 29 in-scope REQ-IDs in the traceability table are present in at least one phase VERIFICATION.md or SUMMARY `requirements-completed` frontmatter.

## Integration Report

**Cross-phase wiring:** 28/28 connections verified
**Broken flows:** 0
**Orphaned exports:** 0

### E2E Flows Verified

1. **Type declaration chain** (SHIP-01) — `src/utils/timeout.ts` → `dist/index.d.ts` clean
2. **Fire-and-forget safety** (SAFE-01, SAFE-06) — `.catch()` wrapping on all void-promise paths
3. **Dispose lifecycle chain** (SAFE-02, SAFE-03, SAFE-08, SAFE-09) — BaseSound, BeatTrack, LayeredSound all dispose correctly
4. **Export surface cleanup** (EXPORT-01, EXPORT-02) — private helper, domain error types
5. **Factory function DX widening** (DX-01) — `resolveSound()` helper, AudioInput[] signatures
6. **PlayTogether example page** (DOCS-04) — sidebar → markdown → Vue component → library import

## Tech Debt

### Phase 48: Missing Verification Report

Phase 48 (Safety & Correctness) completed execution with 2 plans (48-01, 48-02) producing 4 commits across 10 files. Both SUMMARYs document the work and claim requirements SAFE-01 through SAFE-06. However, no formal `VERIFICATION.md` was generated by the gsd-verifier agent.

**Risk:** Low. The implementation is confirmed present in the codebase by the integration checker. All 1244 tests pass including tests added for these features.

**Recommendation:** Generate 48-VERIFICATION.md retroactively, or accept the debt since Phase 51's verification covers the extended dispose/safety patterns that build on Phase 48's work.

### Phase 52: Human Verification Items

Two items require manual testing with the docs development server:

1. **playTogether audio timing** — Open `/examples/play-together`, verify simultaneous vs sequential playback is audibly distinct
2. **VitePress warning callout** — Open the Parameter Control guide, verify the `:::warning` callout renders as a visible warning box

## Test Suite

- **Unit tests:** 1244 passed (47 files)
- **Typecheck:** Clean (0 errors)
- **Build:** Succeeds

## Requirements Score

**29/29** requirements satisfied (22 fully verified, 6 partial with strong evidence, 1 pre-existing)
**1 removed** (PERF-03 — N/A)

---

_Audited: 2026-02-28T01:00:00Z_
_Auditor: Claude (gsd milestone auditor)_

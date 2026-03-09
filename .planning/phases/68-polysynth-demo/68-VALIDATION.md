---
phase: 68
slug: polysynth-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (Chromium only) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth"` |
| **Full suite command** | `pnpm exec playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth"`
- **After every plan wave:** Run `pnpm exec playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 68-01-01 | 01 | 1 | POLY-01 | E2E smoke | `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth.*keyboard"` | ❌ W0 | ⬜ pending |
| 68-01-02 | 01 | 1 | POLY-02 | E2E smoke | `pnpm exec playwright test e2e/interactions.spec.ts --grep "voice count"` | ❌ W0 | ⬜ pending |
| 68-01-03 | 01 | 1 | POLY-03 | E2E interaction | `pnpm exec playwright test e2e/interactions.spec.ts --grep "steal strategy"` | ❌ W0 | ⬜ pending |
| 68-01-04 | 01 | 1 | POLY-04 | E2E interaction | `pnpm exec playwright test e2e/interactions.spec.ts --grep "ADSR"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `PolySynth` test describe block in `e2e/interactions.spec.ts`
- [ ] Add page load smoke test in `e2e/demos.spec.ts` for polysynth page

*Existing Playwright infrastructure covers all phase requirements — only new test cases needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Polyphonic chord audio | POLY-01 | Audio output requires human ear | Play C-E-G chord, confirm all three notes audible simultaneously |
| Steal strategy audible difference | POLY-03 | Audio perception test | Set max voices to 2, play 3+ notes with each strategy, confirm different behavior |
| ADSR envelope audible change | POLY-04 | Audio perception test | Switch presets (piano/pad/pluck), play notes, confirm distinctly different envelopes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

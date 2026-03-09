---
phase: 67
slug: lfo-modulation-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (Chromium) + Vitest |
| **Config file** | `playwright.config.ts`, `vitest.config.ts` |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm exec playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan wave:** Run `pnpm exec playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 67-01-01 | 01 | 1 | LFO-01 | e2e (smoke) | `pnpm exec playwright test e2e/demos.spec.ts` | Partial (needs LFO page added) | ⬜ pending |
| 67-01-02 | 01 | 1 | LFO-02 | e2e (smoke) | same | Partial | ⬜ pending |
| 67-01-03 | 01 | 1 | LFO-03 | e2e (smoke) | same | Partial | ⬜ pending |
| 67-01-04 | 01 | 1 | LFO-04 | e2e | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new test | ⬜ pending |
| 67-01-05 | 01 | 1 | LFO-05 | e2e | same | No — needs new test | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add LFO modulation page to `e2e/demos.spec.ts` page load test list
- [ ] Add LFO-specific interaction tests to `e2e/interactions.spec.ts` (play button, tab switching, slider adjustment)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tremolo sounds distinctly different from vibrato | LFO-01, LFO-02 | Audio output quality is subjective | Play each tab, verify gain wobble vs pitch wobble are perceptually different |
| Filter sweep sounds like a wah effect | LFO-03 | Audio quality is subjective | Play filter tab, verify cutoff modulation produces sweeping sound |
| Canvas waveform animates smoothly | LFO-04 | Visual smoothness requires human judgment | Watch canvas while playing, verify no jank or flickering |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

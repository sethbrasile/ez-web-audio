---
phase: 69
slug: effects-chain-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 69 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (Chromium) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `pnpm exec playwright test e2e/demos.spec.ts` |
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
| 69-01-01 | 01 | 1 | FX-01, FX-02, FX-03, FX-04, FX-05 | e2e (smoke) | `pnpm exec playwright test e2e/demos.spec.ts` | Partial — needs entry | ⬜ pending |
| 69-02-01 | 02 | 2 | FX-01 | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new block | ⬜ pending |
| 69-02-02 | 02 | 2 | FX-02 | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new block | ⬜ pending |
| 69-02-03 | 02 | 2 | FX-03 | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new block | ⬜ pending |
| 69-02-04 | 02 | 2 | FX-04 | e2e (smoke) | `pnpm exec playwright test e2e/demos.spec.ts` | Partial | ⬜ pending |
| 69-02-05 | 02 | 2 | FX-05 | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new block | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `examples/effects-chain` to `e2e/demos.spec.ts` page load array
- [ ] Add `EffectsChain page interactions` describe block to `e2e/interactions.spec.ts` covering: bypass toggle DOM change, slider presence, move button presence, source switch button, signal flow node visibility

*Existing infrastructure covers framework setup; only new test entries needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio clicks on bypass toggle | FX-01 | Audio artifact detection requires human ear | Toggle each effect on/off rapidly; listen for clicks or pops |
| Sonic difference on reorder | FX-03 | Perceptual audio quality is subjective | Reorder delay before/after reverb; confirm audible difference |
| Parameter slider audio response | FX-02 | Real-time audio change quality needs human verification | Adjust each slider; confirm smooth, immediate audio response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

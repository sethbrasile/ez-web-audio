---
phase: 70
slug: grainplayer-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (E2E, Chromium only) |
| **Config file** | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && npx playwright test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | GRAIN-01, GRAIN-02, GRAIN-03, GRAIN-04 | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ W0 | ⬜ pending |
| 70-01-02 | 01 | 1 | GRAIN-04 | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ W0 | ⬜ pending |
| 70-02-01 | 02 | 2 | GRAIN-01, GRAIN-02, GRAIN-03, GRAIN-04 | E2E interaction | `npx playwright test --grep "GrainPlayer"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/interactions.spec.ts` — add GrainPlayer describe block (E2E tests for GRAIN-01 through GRAIN-04 UI behaviors)
- [ ] `docs/public/audio/[sample].mp3` — CC0 audio asset must exist before demo can function

*Existing infrastructure covers unit test needs. Only E2E test stubs and audio asset are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pitch shift sounds independent of speed | GRAIN-01 | Audio quality is subjective | Play, adjust pitch slider, confirm speed unchanged |
| Speed change sounds independent of pitch | GRAIN-02 | Audio quality is subjective | Play, adjust speed slider, confirm pitch unchanged |
| Grain size texture variation audible | GRAIN-03 | Texture smoothness is subjective | Drag grain size from min to max, listen for artifacts |
| Jitter zone visualization accurate | GRAIN-04 | Visual accuracy assessment | Increase jitter, confirm shaded zone widens around position |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 62
slug: multiple-audiocontext-support
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + happy-dom |
| **Config file** | vite.config.js |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | SC-4 | unit | `pnpm test src/effects/` | existing | pending |
| 62-01-02 | 01 | 1 | SC-1,SC-2,SC-3 | unit | `pnpm test src/sound.test.ts src/oscillator.test.ts` | existing + new | pending |
| 62-01-03 | 01 | 1 | SC-6 | unit | `pnpm test` | new | pending |
| 62-02-01 | 02 | 2 | SC-5 | manual | N/A (docs) | new | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The test framework and mocking (standardized-audio-context-mock) are already in place. Tests may need `vi.stubGlobal('BaseAudioContext', ...)` for instanceof checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guide page renders correctly | SC-5 | VitePress rendering | Run `pnpm dev`, navigate to /guide/multiple-contexts |

*All code behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

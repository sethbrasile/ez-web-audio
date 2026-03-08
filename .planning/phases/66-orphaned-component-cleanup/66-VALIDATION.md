---
phase: 66
slug: orphaned-component-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-08
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + happy-dom |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Not applicable (no code changes expected)
- **Phase gate:** Grep-based verification of component references
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | SC-1 | manual-only | `grep -rl "PlayTogetherDemo" docs/examples/` | N/A (audit) | ⬜ pending |
| 66-01-02 | 01 | 1 | SC-2 | manual-only | orphan scan script | N/A (audit) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PlayTogetherDemo.vue has docs page | SC-1 | Audit check, not runtime behavior | `grep -rl "PlayTogetherDemo" docs/examples/` must return a result |
| No orphaned components | SC-2 | Audit check, not runtime behavior | For each .vue in components dir, verify at least one reference from docs/theme |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

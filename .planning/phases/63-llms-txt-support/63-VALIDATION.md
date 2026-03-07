---
phase: 63
slug: llms-txt-support
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
updated: 2026-03-07
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom |
| **Config file** | vite.config.js (test section) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test` + `pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 63-01-01 | 01 | 1 | SC-1 (plugin install + config) | build | `pnpm build` | existing | green |
| 63-01-02 | 01 | 1 | SC-5 (footer component + size patch) | build | `pnpm build` | existing | green |
| 63-02-01 | 02 | 2 | SC-4 (llm-only/llm-exclude annotations) | build | `pnpm build && grep -c 'llm-only' docs/.vitepress/dist/llms-full.txt` | existing | green |
| 63-02-02 | 02 | 2 | SC-2,SC-3,SC-6 (build verify + URL correctness) | build | `pnpm build && grep -c 'ez-web-audio/ez-web-audio' docs/.vitepress/dist/llms.txt` | existing | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or configuration needed. The vitepress-plugin-llms plugin handles generation as part of the standard VitePress build.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Footer visible on doc pages | SC-5 | Visual layout + CSS styling | Visit any doc page (e.g., /guide/getting-started), scroll to bottom, verify llms.txt footer text with links |
| Footer absent on home page | SC-5 | Layout-conditional rendering | Visit home page (/), verify no llms.txt footer appears |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

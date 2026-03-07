---
phase: 61
slug: audio-sprites-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom |
| **Config file** | vite.config.js (test section) |
| **Quick run command** | `pnpm test src/sprite.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test src/sprite.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | SC-1 (Howler tuples) | unit | `pnpm test src/sprite.test.ts` | Needs new tests | ⬜ pending |
| 61-01-02 | 01 | 1 | SC-2 (audiosprite objects) | unit | `pnpm test src/sprite.test.ts` | ✅ existing | ⬜ pending |
| 61-01-03 | 01 | 1 | SC-3 (auto detection) | unit | `pnpm test src/sprite.test.ts` | Needs new tests | ⬜ pending |
| 61-01-04 | 01 | 1 | SC-4 (ms->s conversion) | unit | `pnpm test src/sprite.test.ts` | Needs new tests | ⬜ pending |
| 61-01-05 | 01 | 1 | SC-5 (loop flag) | unit | `pnpm test src/sprite.test.ts` | Needs new tests | ⬜ pending |
| 61-01-06 | 01 | 1 | SC-9 (existing tests pass) | unit | `pnpm test src/sprite.test.ts` | ✅ existing | ⬜ pending |
| 61-02-01 | 02 | 2 | SC-3 (demo plays full file) | manual | Visual/audio check | N/A | ⬜ pending |
| 61-02-02 | 02 | 2 | SC-4 (visual timeline) | manual | Visual check | N/A | ⬜ pending |
| 61-02-03 | 02 | 2 | SC-5 (spritemap JSON displayed) | manual | Visual check | N/A | ⬜ pending |
| 61-02-04 | 02 | 2 | SC-6 (both formats documented) | manual | Page review | N/A | ⬜ pending |
| 61-02-05 | 02 | 2 | SC-8 (CC-BY-3.0 attribution) | manual | Page review | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or configuration needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demo plays full combined file | SC-3 | Requires browser audio + user interaction | Click "Play Full File" button, verify all sounds play sequentially |
| Visual timeline highlights on play | SC-4 | CSS visual behavior | Click segment, verify highlight appears and clears after duration |
| Spritemap JSON displayed on page | SC-5 | Content rendering | Verify JSON block visible on example page |
| Both formats documented | SC-6 | Content review | Verify both Howler and audiosprite examples shown |
| Attribution displayed | SC-8 | Content review | Verify CC-BY-3.0 attribution text on page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

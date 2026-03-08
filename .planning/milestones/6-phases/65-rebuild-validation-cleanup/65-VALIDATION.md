---
phase: 65
slug: rebuild-validation-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom |
| **Config file** | vite.config.js |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test` + `pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green + build clean
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | SC-1 | build+grep | `pnpm build && grep -c 'ez-web-audio/ez-web-audio' docs/.vitepress/dist/llms.txt` | N/A (cmd) | pending |
| 65-01-02 | 01 | 1 | SC-2 | file check | `head -6 .planning/phases/61-audio-sprites-redesign/61-VALIDATION.md` | Yes (draft) | pending |
| 65-01-03 | 01 | 1 | SC-3 | file check | `head -6 .planning/phases/62-multiple-audiocontext-support/62-VALIDATION.md` | Yes (draft) | pending |
| 65-01-04 | 01 | 1 | SC-4 | file check | `test -f .planning/phases/63-llms-txt-support/63-VALIDATION.md` | No -- W0 | pending |
| 65-01-05 | 01 | 1 | SC-5 | file check | `test -f .planning/phases/64-demo-example-ux-fixes/64-VALIDATION.md` | No -- W0 | pending |
| 65-02-01 | 02 | 2 | SC-6 | manual | `pnpm dev` + browser | N/A | pending |
| 65-02-02 | 02 | 2 | SC-7 | manual | `pnpm dev` + browser | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/63-llms-txt-support/63-VALIDATION.md` -- needs creation
- [ ] `.planning/phases/64-demo-example-ux-fixes/64-VALIDATION.md` -- needs creation

*These are created as part of Plan 01 tasks, not as a separate Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 61: Full file playback | SC-6 | Audio output cannot be automated | Play Full File on Audio Sprites page; hear 6 distinct sounds sequentially |
| Phase 61: Segment highlighting | SC-6 | Visual glow effect requires human eye | Click individual segments; verify highlight + correct sound |
| Phase 61: Visual timeline layout | SC-6 | Layout/proportions require human judgment | Verify 6 colored segments, proportional sizing, labels visible |
| Phase 64: Visualization demo | SC-7 | Canvas animation requires visual confirmation | Click Play, switch waveforms; verify canvas animates |
| Phase 64: Drum machine beat pattern | SC-7 | Audio output per-beat requires human ear | Toggle beats on/off; only active beats produce sound |
| Phase 64: Audio sprite playhead | SC-7 | Playhead animation requires visual check | Play Full File; white playhead sweeps L-R; Stop halts/resets |
| Phase 64: Lazy init on first interaction | SC-7 | Loading state timing requires human observation | Fresh load; first Play shows brief Loading then plays; subsequent immediate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

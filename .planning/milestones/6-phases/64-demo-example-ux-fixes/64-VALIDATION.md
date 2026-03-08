---
phase: 64
slug: demo-example-ux-fixes
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
updated: 2026-03-07
---

# Phase 64 — Validation Strategy

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
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 64-01-01 | 01 | 1 | SC-1 (visualization async fix) | unit | `pnpm test` | existing | green |
| 64-01-02 | 01 | 1 | SC-2,SC-3 (drum machine playActiveBeats) | unit | `pnpm test` | existing | green |
| 64-02-01 | 02 | 2 | SC-4,SC-5,SC-6,SC-7 (sprite demo lazy init + playhead) | manual | Visual check | N/A | green |
| 64-02-02 | 02 | 2 | SC-8,SC-9 (layered sound demo lazy init) | manual | Visual check | N/A | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or configuration needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visualization demo plays without errors | SC-1 | Runtime AudioContext + canvas rendering | Click Play on visualization demo, select waveforms, verify spectrum animates without console errors |
| Drum machine plays only active beats | SC-2,SC-3 | Audio playback requires listening | Toggle beats on/off in Vue and Vanilla drum machines, click Play, verify only active beats produce sound |
| Audio sprite playhead animation | SC-4,SC-5,SC-6,SC-7 | Animation smoothness requires visual observation | Click "Play Full File", verify white playhead sweeps left-to-right; click "Stop" to halt and reset |
| Lazy init on first interaction | SC-8,SC-9 | Loading state timing requires runtime observation | Load AudioSpriteDemo and LayeredSoundDemo fresh; click Play; verify brief loading state then audio plays |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

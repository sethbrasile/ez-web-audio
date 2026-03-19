---
phase: 71
slug: transport-sequencer-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (E2E) |
| **Config file** | vitest.config.ts / playwright.config.ts |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test --run && pnpm exec playwright test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test --run && pnpm exec playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 71-01-01 | 01 | 1 | TSEQ-01 | typecheck | `test -f docs/.vitepress/theme/components/TransportSequencerDemo.vue && pnpm typecheck 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 71-01-02 | 01 | 1 | TSEQ-02 | typecheck | `test -f docs/.vitepress/theme/components/TransportSequencerDemo.vue && pnpm typecheck 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 71-01-03 | 01 | 1 | TSEQ-03 | typecheck | `test -f docs/.vitepress/theme/components/TransportSequencerDemo.vue && pnpm typecheck 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 71-01-04 | 01 | 1 | TSEQ-04 | typecheck | `test -f docs/.vitepress/theme/components/TransportSequencerDemo.vue && pnpm typecheck 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 71-02-01 | 02 | 2 | TSEQ-01..04 | E2E | `pnpm exec playwright test e2e/demos.spec.ts e2e/interactions.spec.ts --reporter=list 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docs/.vitepress/theme/components/TransportSequencerDemo.vue` — component created (Plan 01, Task 1)
- [ ] `e2e/demos.spec.ts` — `examples/transport-sequencer` added to smoke list (Plan 02, Task 1)
- [ ] `e2e/interactions.spec.ts` — `TransportSequencer page interactions` describe block added (Plan 02, Task 1)
- [ ] Audio playback assertions use `.play-btn` / `.stop-btn` class selector pattern (consistent with LFO/PolySynth)

*Existing unit test infrastructure covers all unit-level needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BPM change audible during playback | TSEQ-01 | Cannot automate tempo perception | Play, drag BPM slider, verify tempo changes immediately |
| Mute/solo audible effect | TSEQ-02 | Cannot automate track isolation hearing | Play all tracks, mute kick, verify kick silent; solo hihat, verify only hihat |
| Musical time durations audible | TSEQ-03 | Cannot automate rhythm perception | Play, listen for different note durations in melody tracks |
| Playhead visually synced to audio | TSEQ-04 | Cannot automate visual-audio sync perception | Play, verify playhead column advances on each beat |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

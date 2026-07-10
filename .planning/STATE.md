---
gsd_state_version: 1.0
milestone: 7
milestone_name: Feature Demos
status: awaiting_uat
stopped_at: M8 phase 73 complete (all 24 docs demos refactored onto @ez-web-audio/vue; binding + Sound.audioBuffer hardened)
last_updated: "2026-07-10T00:00:00.000Z"
last_activity: 2026-07-10 — Phase 73 shipped (Task A library hardening + 24 demo refactors, ~30 commits, exit gate green 55/55 E2E). Next per playbook: 75-01 (sound quality) → human gate 2 (listening). 74-02 + 77-01 now unblocked/parallel.
progress:
  total_phases: 11
  completed_phases: 11
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# Project State: EZ Audio

**Last Updated:** 2026-07-09 (planning reconciliation after ~3.5 month pause)
**Current Focus:** Human UAT for M7 demos, then complete Milestone 7

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** Make the Web Audio API easy to use
**Current milestone:** 7 — Feature Demos (5 phases + 6 deep-review fix phases, all code complete)

## Current Position

Phase: M8 Phase 73 COMPLETE (all 24 audio demos on @ez-web-audio/vue; binding + Sound.audioBuffer hardened). Phases 72+73 done.
Status: Executing M8 per `.planning/M8-PLAYBOOK.md`. Design packet at `.planning/DESIGN-HANDOFF/` (gate 1 done). M7 UAT waived to run in parallel (Seth, 2026-07-09).
Next: 75-01 (demo sound quality) → **human gate 2 (listening checkpoint)** — STOP for Seth's ears. Also unblocked now: 74-02 (design cohesion impl, needs the returned packet) + 77-01 (React bindings, parallel-ok). Judgment log: `.planning/M8-QUESTIONS.md`. Note: main is ~45 commits ahead of origin — pushing redeploys docs site (stale since March).

## Milestone 8 Scope Decisions (user, 2026-07-09)

- Flagship groovebox showcase: YES (Phase 76) — announcement centerpiece, homepage hero
- Bindings: Vue AND React both ship with 0.2.0 (Vue first as infra, phases 72-73; React phase 77)
- M7 UAT: quick pass now before M8 refactoring begins; full UAT gate again before Phase 78 announce

## Release Position

- npm published: `ez-web-audio@0.1.0` (only public release)
- Local package.json: `0.2.0` (downgraded from erroneous 1.0.0 — staying <1.0 until confident; user decision 2026-07-09)
- Publish CI fires on `v*` tags only

## Performance Metrics

**Velocity:**
- Total plans completed: 150
- Milestones shipped: 6

## Accumulated Context

### Decisions

See .planning/PROJECT.md Key Decisions table for full history.

- [2026-07-09] Stay <1.0 until very confident in stability. Next release 0.2.0. Announce after: demos perfected + framework bindings planned + UAT passed.
- All M7 demos are pure documentation/UX — no library code changes needed
- [Phase 69]: Effect instances live at module level outside reactive state — ensureLoaded() creates them once, kept alive across source switches
- [Phase 70]: Speed slider drives RAF position advance (not playbackRate) for true pitch/speed independence
- [Phase 71]: ticksPerBeat:12 for Sequence scheduling compatibility; scale to 16th-note display with Math.floor(tick*4/12)
- [Deep review 2026-03-19]: All 55 findings applied in single commit b0dee2f; re-verification caught one regression (transport.resume() no-op — Transport has start/pause/stop only; fixed 2026-07-09)

### Pending Todos

- Contribute WASM target to MUSE for Web Audio compatibility (`todos/pending/2026-03-28-verify-muse-compatibility.md`) — speculative external PR, parked per user 2026-07-09

### Roadmap Evolution

- Phases 71.1–71.6 inserted from 2026-03-19 deep review; executed together in commit b0dee2f; closed 2026-07-09 during reconciliation

### Blockers/Concerns

- Human UAT not yet run — deep-review mega-commit b0dee2f touched all 6 demo components at once; all demos need ears, not just transport
- Structural patterns left open by design (demo components, not library code): demo-resource-cleanup-inconsistency, demo-audio-init-duplication — revisit only if more demos added

## Session Continuity

Last session: 2026-07-09
Stopped at: Planning reconciliation complete
Resume file: None

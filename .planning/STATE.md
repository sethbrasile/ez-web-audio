---
gsd_state_version: 1.0
milestone: 7
milestone_name: Feature Demos
status: awaiting_uat
stopped_at: M8 Phases 74 + 77 COMPLETE — all machine-runnable work done; STOPPED at HUMAN GATE 2 (listening, deferred) which blocks Phase 76; gate 3 (UAT) then blocks 78
last_updated: "2026-07-11T01:30:00.000Z"
last_activity: 2026-07-10 — Phases 74 AND 77 complete in one run. 74-02: claude-design packet implemented (EWA tokens + Signal-green brand, 12-SFC kit, all 22 demos + PianoKeyboard restyled presentation-only, IA triage; screenshots in phase dir). 77-01: @ez-web-audio/react — 15 hooks mirroring Vue 1:1, SSR/StrictMode-safe, 34 TDD tests, examples/react-basic StackBlitz app (embed dead until publish), react-integration guide rewritten on real package. Exit gates green (1944 core + 31 vue + 34 react unit, docs build, 72/72 E2E). REMAINING M8: Phase 76 (needs gate-2 listen), Phase 78 (needs gate-3 UAT + gate-4 publish). Nothing machine-runnable left — waiting on Seth. ~100 commits ahead of origin (Seth pushes).
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

Phase: M8 Phases 72, 73, 75 code-complete. Phase 75 STOPPED at HUMAN GATE 2 (listening). Phases 72+73 fully done.
Status: Executing M8 per `.planning/M8-PLAYBOOK.md`. Design packet at `.planning/DESIGN-HANDOFF/` (gate 1 done). M7 UAT waived to run in parallel (Seth, 2026-07-09).
Next: **74-02 (design implementation)** — start at `.planning/phases/74-demo-design-cohesion/74-02-RESUME.md` (Task 0: expand `.planning/DESIGN-HANDOFF/` packet into 74-02-TASKS.md, then execute). **Gate-2 re-listen DEFERRED by Seth 2026-07-10** — gate 2 stays OPEN, Phase 76 stays blocked, re-listen happens when Seth returns to it.

Round-3 fix record: all 12 beads closed (`bd list` empty). Core: stale-source-node lifecycle fixes (PolySynth voice independence, Sound retrigger release, SampledNote end fade, stop-cancels-scheduled, frequency persistence) — 1928→1944 tests. Demos: TransportSequencer rebuilt (mechanics + musical redesign + fluid grid), Ambient rebuilt from research, EffectsChain plucked pattern source, GrainPlayer pad retune, SynthDrumKit 4s drop, XYPad/SoundfontPiano click fixes. Full record: 75-01-SUMMARY.md "round-3 fix work" section. Gates green: 1944+31 unit, 72/72 E2E, lint, typecheck.

Previous round-3 context: **HUMAN GATE 2 — round-3 fix work.** Rounds 1–2 (Ambient stagger/click/drone-pop) FIXED — drone pop was a core bug (exponential onPlayRamp from(0) = silence-then-jump; fixed f33ef32). Round 3 (2026-07-10): Seth swept ALL demos — LFO good, GrainPlayer mostly good, 12 findings tracked as **beads** (`bd list` / `bd ready`, prefix ez-audio-): P0 PolySynth voice-ADSR-not-independent + stop-pop (ez-audio-5b2), P0 TransportSequencer stop bugs (ez-audio-20p) under a TransportSequencer musical-redesign epic (ez-audio-01q), Ambient sound redesign via research (ez-audio-7uq), SynthDrumKit bass drop (ez-audio-1c9, port ember-audio settings), EffectsChain transient source (ez-audio-5w9), SoundfontPiano clicks (ez-audio-8de), XYPad clicks (ez-audio-aub), GrainPlayer pad preset (ez-audio-7fk), TransportSequencer screech/state-leak/layout (ez-audio-s8v/ttc/jui). Full table in `75-01-SUMMARY.md` round-3 section. Fix these, re-verify (loudness E2E + unit), then Seth re-listens → gate 2 closes → Phase 76 unblocks. Parallel-runnable: 74-02 (design cohesion) + 77-01 (React bindings). Judgment log: `.planning/M8-QUESTIONS.md`. Commits ahead of origin — Seth pushes manually.

## How to resume M8 (read these, in order)
1. `.planning/AUTOPILOT.md` — continue-trigger protocol
2. `.planning/M8-PLAYBOOK.md` — execution order + gates + dispatch protocol
3. `.planning/M8-QUESTIONS.md` — all judgment calls/decisions (setMasterDestination approved, envelope-peak friction, useCleanup-unregister gap, etc.)
4. This STATE.md + `.planning/phases/75-demo-sound-quality/75-01-SUMMARY.md` (gate-2 findings)
5. Cross-check git log — commits are source of truth over any stale frontmatter

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

Last session: 2026-07-10 (gate-2 round-3 fix work, all 12 beads closed)
Stopped at: Round-3 complete; Seth deferred re-listen, queued 74-02 next
Resume file: .planning/phases/74-demo-design-cohesion/74-02-RESUME.md

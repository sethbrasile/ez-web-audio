# 74-02 Resume — start here (saved 2026-07-10, gate-2 listening deferred)

**Context:** Gate-2 round-3 fix work is DONE (all 12 beads closed, gates green
— see 75-01-SUMMARY.md "round-3 fix work"). Seth deferred the gate-2
re-listen and asked to run **74-02 (design implementation)** next. Gate 2
stays OPEN; Phase 76 stays blocked on it. Do NOT treat 74-02 completion as
gate-2 closure.

## First actions (in order)

1. Read `.planning/M8-PLAYBOOK.md` (dispatch protocol) + `74-02-PLAN.md`
   (this directory) — the plan is runtime-expanded; **Task 0 = read the full
   packet and author `74-02-TASKS.md`**, then execute task-by-task.
2. Read the packet at `.planning/DESIGN-HANDOFF/` — 7 HTML files
   (claude-design output; read as HTML, prose-heavy):
   - `00 Start Here` — packet guide
   - `01 Foundations` — design tokens ("Signal" accent, six lane/track
     voices, VitePress-var mapping, state vocabulary) + **the parts kit**
     (component inventory lives here — knobs, toggles, meter bars, grid rows
     were visible at a skim; extract the packet's own component names)
   - `02 Groovebox` — hero spec (implementation itself is Phase 76, blocked;
     only kit pieces it demands are in 74-02 scope)
   - `03 Playback and Synthesis` / `04 Rhythm and FX` / `05 Demo Specs` —
     per-demo specs
   - `06 Advisory - IA` — advisory only; triage per plan Task 0.3
     (adopt only pure config changes; structural → M8-QUESTIONS.md)
   - `support.js` — packet interactivity, not spec content
   - `screenshots/` is EMPTY — the per-task Playwright screenshot set
     (light + dark) required by the plan goes in the phase directory.

## Constraints reminders (from 74-02-PLAN + 74-01 hard constraints)

- Presentation ONLY — audio logic untouched. Behavior-requiring designs →
  log to M8-QUESTIONS.md, implement closest presentation-only version.
- VitePress CSS vars, 320–688px, AA contrast, ≥44px touch, no new runtime
  deps, no load buttons. Constraint beats packet on conflict (log it).
- Kit lives at `docs/.vitepress/theme/components/kit/` + README.
- Per-task gate: typecheck + lint + full E2E + light/dark screenshots.
  E2E assertion changes need a SUMMARY sign-off note.

## Fresh facts the packet authors didn't know (this session's changes)

- **TransportSequencerDemo.vue was reworked today** (gate-2): fluid-width
  grid (flex cells, min 560px, compact 84px labels), musically redesigned
  presets, chord labels in melody cells. Design work must build ON this,
  not revert it. Same for **AmbientGenerator.vue** (Pad/Texture/Shimmer
  layers renamed/redescribed) and **EffectsChainDemo.vue** (three-source
  switcher: Pattern default / Oscillator / Audio File).
- Baseline: 1944 core + 31 vue unit tests, 72/72 E2E (55 + 17 loudness),
  lint + typecheck green. Loudness bounds per demo: peak in [0.05, 0.985].
- Seth's working preference (this session): planning/design decisions made
  by the orchestrator itself; subagents for bounded execution, work
  reviewed against an explicit spec before commit.

## Parallel/blocked

- 77-01 (React bindings) also parallel-runnable, untouched.
- Phase 76 (groovebox) blocked on gate-2 re-listen (deferred, pending).
- Commits stay local — Seth pushes manually.

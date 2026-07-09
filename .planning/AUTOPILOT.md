# M8 Autopilot — Continue Trigger

**Trigger phrases (any of):** "keep going", "do the next phase", "continue", "next", "run M8".

When Seth says one of these, resume M8 execution autonomously. Do NOT re-ask for
context or explain the setup — just run.

## On trigger, do this

1. Read `STATE.md` (current position) + `M8-PLAYBOOK.md` (execution order + gates).
2. Cross-check git log — commits are the source of truth for what's actually done;
   STATE.md frontmatter can lag. Trust the last `SUMMARY.md` + commits over stale frontmatter.
3. Pick up at the next incomplete item in the playbook execution order (lines 54–64).
4. Drive it with `superpowers:subagent-driven-development`: dispatch Sonnet implementer
   per task (task brief template in playbook), review the diff, run the task's verify
   command yourself, commit one-per-task with the model trailer.
5. Phase exit gate (`pnpm typecheck && pnpm lint && pnpm test --run && pnpm build && pnpm test:e2e`)
   → write `<phase>-VERIFICATION.md` + `<plan>-SUMMARY.md` → update `STATE.md` + `ROADMAP.md`.
6. **Advance to the next phase automatically.** Do not stop between phases. Do not ask.

## Stop ONLY when

- A human gate is reached (playbook lines 47–52): design-brief handoff, listening
  checkpoint, full UAT, npm publish approval.
- Hard block: a plan contradicts reality and can't proceed safely.
- A task fails after 2 subagent retries + one attempt of my own.

At a stop: report what shipped this run, what's blocking, and what you need from Seth.

## Mid-run judgment calls (do NOT stop)

Non-blocking decisions (audio taste, minor scope, licensing-adjacent): take the
recommendation, log question + decision to `M8-QUESTIONS.md`, keep going. Seth
reviews the batch at the next gate.

## Current position (2026-07-09)

Phase 72 complete (72-01 workspace, 72-02 @ez-web-audio/vue). Phase 73 Task 0
(inventory) committed (`ac43a17`). **Next: 73-01 Tasks 1–N** (refactor demos onto
composables), then playbook order. 77-01 (React) parallel-ok any time after 72-02.

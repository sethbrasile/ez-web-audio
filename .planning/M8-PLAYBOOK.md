# M8 Execution Playbook — Demo Excellence, Bindings & 0.2.0

> **For the orchestrator (Opus):** You drive this milestone. Read this file + ONE phase PLAN.md, then execute that plan task-by-task using the protocol below. The methodology mirrors `superpowers:subagent-driven-development` (use it if available). Spec: `.planning/specs/2026-07-09-m8-design.md`. Do not read other phase plans unless resolving an interface question.

## Model policy

| Role | Model | Used for |
|---|---|---|
| Orchestrator | Opus | Reading plans, dispatching, reviewing every diff, running gates, commits, state updates |
| Implementer | Sonnet | All code tasks (default — any task without a `model:` tag) |
| Mechanical | Haiku | Only tasks explicitly tagged `model: haiku` (file moves, config find/replace) |

## Dispatch protocol (per task)

1. Read the task in the phase PLAN.md. Read the files it touches (or enough of them to review competently).
2. Dispatch ONE implementer subagent with a self-contained brief:
   - Task goal (one sentence) + full task text from the plan (files, interfaces, steps, code)
   - Current-state summary of the touched files (you write this — implementer starts cold)
   - Acceptance criteria + the task's verification command
   - Repo conventions: pnpm, `@antfu/eslint-config`, tests co-located, no new runtime deps, commit style `type(scope): message`
   - Explicit instruction: do NOT commit; return a summary of changes made
3. Review the diff (`git diff`) against acceptance criteria. Run the task's verification command yourself.
4. Fail → re-dispatch with specific feedback. Max 2 retries, then implement it yourself.
5. Pass → commit exactly the task's files. One commit per task. Trailer: `Co-Authored-By:` the implementer model.

## Task brief template

```
TASK: <goal sentence>
CONTEXT: <2-5 sentences: what exists now in the touched files, what neighbors produce/consume>
INSTRUCTIONS: <the task's steps + code from the plan, verbatim>
ACCEPTANCE: <criteria list>
VERIFY WITH: <command>
RULES: pnpm only. No new runtime dependencies. Match existing code style. Do not commit. Do not touch files outside the task's file list. Report what you changed and any deviation you had to make.
```

## Gates

**Per-phase exit gate** (run before marking a phase complete):

```bash
pnpm typecheck && pnpm lint && pnpm test --run && pnpm build && pnpm test:e2e
```

All green → write `<phase>-VERIFICATION.md` (goal-backward: does the codebase now deliver the phase goal? cite evidence per success criterion) → update `STATE.md` + ROADMAP checkbox → proceed.

**Human gates — STOP execution and report to Seth:**

1. **Design brief handoff** — after 74-01, Seth takes `DESIGN-BRIEF.md` to claude-design. Blocks 74-02 and Phase 76 UI tasks ONLY; continue with 72/73/75/77.
2. **Listening checkpoint** — after Phase 75 exit gate. Blocks Phase 76.
3. **Full UAT** — after Phases 74, 75, 76, 77 all complete. Blocks Phase 78.
4. **npm org + publish approval** — inside Phase 78 (see its plan).

## Execution order

```
FIRST: 74-01 (design brief) → hand to Seth (human gate 1)
THEN:  72-01 → 72-02 → 73-01 → 75-01 → human gate 2 (listen)
PARALLEL-OK: 77-01 any time after 72-02
BLOCKED: 74-02 (needs handoff packet + 73-01), 76-01/76-02 (needs gate 2; 76-02 UI needs packet)
LAST: human gate 3 (UAT) → 78-01
```

Phases are sequential within themselves. If the handoff packet hasn't returned by the time 75 finishes, run 77 while waiting.

## Deviations and questions

Never silently deviate from a plan. Options, in order of preference:

1. Trivial gap (missing import, path typo in plan): fix, note in commit message.
2. Plan conflicts with reality (API doesn't exist, file moved): adjust the approach minimally, record in the phase SUMMARY.md under "Deviations."
3. Judgment call a human should see (scope, UX, audio taste, licensing, anything touching publish/announce): write to `.planning/M8-QUESTIONS.md` — question, your recommendation, what you did (take your recommendation and continue). Seth reviews at human gates.
4. Blocked hard (cannot proceed safely): stop, report.

## State updates

After each plan completes: write `<plan>-SUMMARY.md` next to the plan (what was built, deviations, test counts). After each phase: update `STATE.md` (position, last_activity) and check the ROADMAP box. Keep commits granular — never batch a phase into one commit.

## Constants (verbatim everywhere)

- Versions: all packages `0.2.0`, version-locked. NEVER 1.0. NEVER publish without human gate 4.
- Package names: `ez-web-audio` (core), `@ez-web-audio/vue`, `@ez-web-audio/react`.
- No new runtime dependencies in any package. devDependencies allowed with justification in SUMMARY.
- No new audio assets — existing repo assets only; asset wants go to `M8-QUESTIONS.md`.
- Demo rule (CLAUDE.md): no Load/Init buttons; first user interaction initializes audio.
- E2E baseURL includes `/ez-web-audio/` prefix — relative paths in tests.
- Commit trailer: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.

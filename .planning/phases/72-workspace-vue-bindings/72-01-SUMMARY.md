# 72-01 Summary: pnpm Workspace Conversion

**Completed:** 2026-07-09 (orchestrator: Fable; implementers: Sonnet ×4, Haiku ×1)

**Goal achieved:** Repo is a pnpm workspace — `packages/core` (`ez-web-audio@0.2.0`), `packages/vue` + `packages/react` stubs (`@ez-web-audio/*@0.2.0`), private root orchestration shell, docs consuming `ez-web-audio` via `workspace:*`. All root commands preserved. Exit gate green (typecheck, lint, 1920 unit tests, build, 55 E2E).

## Commits

- `14cb518` refactor(workspace): move library to packages/core
- `50f367f` refactor(workspace): root package as private orchestration shell
- `3acd3ad` feat(workspace): stub @ez-web-audio/vue and @ez-web-audio/react packages
- `e1f3f6b` ci: publish all workspace packages on version tags
- `b6eabf0` fix(m7-demos): restore EQ effect, source switching, waveform loaded state
- `d4a55c1` test(e2e): repair stale selectors and baseURL-relative paths
- `1510f32` style: repo-wide lint fix — CI lint has been red since March
- (this commit) ci/docs: workflow audit fix + CLAUDE.md workspace layout + summary

## Beyond-plan work (all pre-existing breakage the exit gate forced to the surface)

1. **10 E2E failures pre-dated the conversion** — proven by running the failing specs on pre-move commit b08393a in a worktree (identical 10 failures). Causes: deep-review commit b0dee2f dropped EffectsChain's EQ + source switching and GrainPlayer's `loaded` class without updating tests; navigation tests used absolute paths that bypass the `/ez-web-audio/` baseURL. Features restored, tests repaired. Details in M8-QUESTIONS.md (listen-check owed at gate 2).
2. **CI on main red since 2026-03-01** (lint step) — which also means **docs-site deploys have failed since March**. 44 real lint errors hand-fixed + `lint:fix` sweep; `.claude/` (stale agent worktree inside it) was feeding eslint ~1400 phantom errors — now git- and eslint-ignored.
3. **publish packaging** — `files` arrays listed LICENSE/README that only existed at repo root; copies added per package. `pnpm -r publish --dry-run` packs all three at 0.2.0, skips root.

## Deviations

- Root package renamed `ez-web-audio-workspace` in Task 1 (duplicate-name guard) — plan implied Task 2.
- Kept `docs:dev` script (plan's script list omitted it; preserved existing behavior).
- Dropped phantom `@dotenvx/dotenvx` import from typedoc.config.mjs (removed from deps in 17-01; only worked via hoisting). `VITE_DOCS_URL` still honored from environment.
- ci.yml `pnpm test --run` → `pnpm test`: root script now embeds `--run`, and vitest 4 hard-errors on the duplicated flag. Playbook's exit-gate one-liner has the same issue — use `pnpm test` at gates from now on.
- Task-4 devDependency prune: root keeps only docs/e2e/lint tooling; build deps live in packages/core.

## Interfaces produced (for 72-02, 73-01, 77-01)

- Workspace members: `packages/core` (full), `packages/vue` + `packages/react` (package.json + README only — no src/, no build tooling yet; 72-02/77-01 add them).
- `pnpm --filter ez-web-audio <script>`; root `pnpm -r typecheck` / `pnpm -r --parallel test --run`.
- Publish: tag `v*` ⇒ version-lock check across the 3 packages ⇒ `pnpm -r publish`.

## Test counts

1920 unit (61 files) · 55 E2E (was 45/55 at phase start; 10 pre-existing failures fixed) · lint 0 errors (3 pre-existing jsdoc warnings).

# M8 Questions — judgment calls for Seth's review at human gates

Per playbook: each entry = question, recommendation, what was done (recommendation taken unless noted).

## 2026-07-09 · 72-01 · Restored features silently dropped by deep-review commit

**Found:** b0dee2f ("apply all 55 deep review findings", 2026-03-19) rewrote EffectsChainDemo and dropped the EQ effect (4→3 slots), the oscillator/file source switching, and GrainPlayerDemo's `loaded` waveform class — none mentioned in the commit message, and the e2e tests that covered them were left failing. CI on main has been red since 2026-03-01, so nothing caught it.

**Question:** Were EQ + source switching intentionally cut?
**Recommendation:** Treat as accidental scope loss — phase 69 docs/spec define the 4-effect chain + source switch as the demo's contract.
**Done:** Restored both against the current (improved) component architecture; default chain back to documented EQ → Compressor → Delay → Reverb. E2E green. **Not ear-checked** — headless verification only. Listen at human gate 2 (EQ band gains audible; oscillator↔file switch behavior).

## 2026-07-09 · 72-01 · E2E selector contract updates

Deep-review markup changes were kept where deliberate improvements (reorder buttons labeled "earlier/later" not "up/down", bypassed flow-nodes dimmed instead of removed, bypass button `aria-pressed` = bypassed). Tests updated to that contract rather than reverting the markup. Sign-off note per 72-01 E2E rule: assertion changes limited to those inversions + relative-path fixes in navigation.spec.ts.

## 2026-07-09 · 72-01 · Repo hygiene done early

Lint debt (44 real errors + ~1400 phantom errors from a stale `.claude/worktrees/` copy eslint was crawling) fixed in 72-01 rather than waiting for 78-01's hygiene task: exit gate requires green and CI/docs-deploy on main have been failing on the Lint step since March. `.claude/` now git-ignored and eslint-ignored. **Heads-up: the docs site on Pages hasn't deployed since 2026-03-01** — next push to main redeploys it (with M7 demos + these fixes).

## 2026-07-09 · 72-01 · Phantom @dotenvx/dotenvx import removed

`typedoc.config.mjs` imported `@dotenvx/dotenvx` (removed from deps in 17-01 as "confirmed unused") — survived only via hoisting, broke under workspace install. Import deleted; `VITE_DOCS_URL`/`hostedBaseUrl` still honored if set in the environment. CI never set it (`.env.ci` is empty), so no CI behavior change.

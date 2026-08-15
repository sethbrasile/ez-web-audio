# Product and API Fit Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute Workstream 0 and produce an evidence-backed decision about whether EZ Web Audio solves meaningful application-audio friction, supports progressive musical ambition, and is reliably discoverable and usable by coding LLMs.

**Architecture:** The audit separates collection from judgment. It first freezes the product contract, evidence schema, prompts, score thresholds, and current-tree baseline; then gathers external research, independent code/API reviews, human journey comparisons, and isolated cross-family LLM runs. The primary agent triangulates those streams, verifies high-impact claims, maintains a continuous documentation-opportunity tally, checkpoints findings with the user, and stops at a durable diagnosis rather than implementing fixes.

**Tech Stack:** TypeScript, pnpm 10, Vitest, Playwright, Markdown/JSON artifacts, QMD, Git/Beads, Node.js validation scripts, and non-interactive Codex/Claude/Gemini CLIs selected and cost-capped at execution time.

**Spec:** `.planning/specs/2026-08-15-product-api-fit-audit-design.md`

## Global Constraints

- This is a diagnosis-only workstream. Do not change production library, framework binding, demo, or public documentation code while executing it.
- Evaluation fixtures, prompts, validation scripts, raw runs, research records, and review reports are allowed audit artifacts; they must remain outside shipping packages.
- Use QMD MCP against collection `ez-audio` before direct repository searches in every fresh execution session.
- Use Beads for task state and discoveries. Do not use markdown checklists as live issue tracking; the checkboxes in this plan describe execution steps only.
- Never read `.env`, `.env.*`, credential, secret, certificate, or private-key files. Record only that credentials or authentication are unavailable.
- Do not launch research/review agents until Task 2 presents the exact agent count, tier/model mix, file scopes, and estimated token range and the user explicitly consents.
- Do not run paid or quota-bearing LLM trials until Task 2 presents exact provider models, call count, output caps, and maximum estimated cost and the user explicitly consents.
- Use direct provider CLIs or SDKs. `litellm` is banned and must not be installed, imported, or recommended.
- Run all black-box LLMs without repository access. Supply only the condition-specific prompt and explicitly allowed documentation context.
- Keep research collectors and code/API reviewers independent. Reviewers receive the product contract and their file scope, not the external-research synthesis.
- External research uses primary sources, weighs the latest 12 months most heavily, records source bias, and continues until the spec's saturation rule and minimum corpus are satisfied.
- A model-generated solution is not correct because it compiles. Lifecycle-sensitive tasks must pass browser/runtime assertions.
- A generic “Initialize AudioContext” gate fails the intent-bound activation task unless the scenario contains a documented exceptional reason for explicit activation.
- Every task records tips, gotchas, recovery guidance, example ideas, comparisons, and migration notes in its own documentation-candidate file. Do not opportunistically rewrite public docs during the audit.
- Examples promoted from the documentation ledger later must use public entry points and type-check in CI.
- Use `.planning/reviews/` for the report and index because the approved project spec explicitly selects the repository's established review history location. This is a user-approved path override to the generic deep-review adapter's default `reviews/` path.
- At Task 1, set the task-specific `EZA_AUDIT_DATE` value to the output of `date +%F` and write it into the manifest. Every later session reads that recorded value before resolving report filenames; it never substitutes its own date.
- Critical and High findings require primary-agent verification. Reviewer assertions are evidence leads, not facts.
- The findings checkpoint is live. Do not delegate it and do not continue into implementation after finalizing the report.

### Orchestrator tier-switch policy

Use the least capable orchestrator that can reliably enforce the frozen protocol. Model price alone is not the target: choose the tier expected to finish the stage without repeated turns, rework, or lost state.

- Keep or return to the most capable available orchestrator for Task 2 protocol/threshold freeze, any ruling that changes the plan, Critical/High evidence adjudication, conditional debates, Task 7 cross-stream synthesis, Task 8 live findings decisions, and later architecture or implementation-planning gates.
- A standard mid-tier orchestrator may own bounded execution after Task 2 approval: dispatch sequencing, immutable artifact intake, schema validation, fixture/build orchestration, reproducible reruns, score aggregation, and ledger bookkeeping. Its workers and reviewers still use the separately consented tier map.
- A cheap orchestrator is appropriate only for deterministic, script-driven validation or file bookkeeping with no scope, scoring, or product judgment. Do not use it for prose-to-task dispatch, reviewer adjudication, or user-facing recommendations.
- At every task boundary, record `orchestrator tier`, `why this tier is sufficient`, and `next mandatory escalation gate` in the audit manifest and SDD ledger. Recommend a fresh lower-tier task when the next uninterrupted stage is bounded and the handoff artifacts validate; recommend a fresh frontier-tier task before the next judgment gate.
- Escalate immediately if the orchestrator must reinterpret a frozen rubric, reconcile conflicting evidence, rule on a reviewer finding, or recover from repeated state/validation mistakes. A cheaper run that creates another full review turn is not a saving.

## Audit Artifact Map

| Path | Responsibility |
| --- | --- |
| `.planning/reviews/product-api-fit/README.md` | Audit manifest, frozen tree commit, orientation, scopes, consent record, and artifact index |
| `.planning/reviews/product-api-fit/evidence.schema.json` | Required structure for one external or observed evidence record |
| `.planning/reviews/product-api-fit/evidence/*.json` | One immutable source observation per file; collectors use separate ID ranges |
| `.planning/reviews/product-api-fit/source-register.md` | Human-readable source coverage, recency, ecosystems, and bias accounting |
| `.planning/reviews/product-api-fit/external-research-synthesis.md` | JTBD, friction, alternatives, confidence, and research-gap synthesis |
| `.planning/reviews/product-api-fit/api-responsibility-map.md` | Existing public objects mapped to the four product layers and semantic roles |
| `.planning/reviews/product-api-fit/comparative-journeys.md` | EZ/native/Howler/Tone journey results and responsibility comparisons |
| `.planning/reviews/product-api-fit/reviewer-outputs/*.md` | Unedited independent reviewer results and coverage declarations |
| `.planning/reviews/product-api-fit/documentation-candidates/*.md` | Per-task tips, gotchas, examples, troubleshooting, comparison, and migration suggestions |
| `.planning/reviews/product-api-fit/documentation-opportunities.md` | Deduplicated, evidence-linked documentation ledger produced during synthesis |
| `.planning/evals/product-api-fit/evaluation-protocol.md` | Frozen tasks, conditions, model sampling, scoring rules, thresholds, and failure taxonomy |
| `.planning/evals/product-api-fit/prompts/*.md` | Exact black-box prompts, hashed before any run |
| `.planning/evals/product-api-fit/schemas/run-result.schema.json` | Structured provider response contract |
| `.planning/evals/product-api-fit/fixtures/` | Human baseline and model-generated vanilla, React, and Vue projects |
| `.planning/evals/product-api-fit/runs/` | Raw provider responses, materialized files, command metadata, build/runtime output, and scores |
| `.planning/evals/product-api-fit/scorecard.md` | Aggregate and per-model evaluation results |
| `.planning/reviews/$EZA_AUDIT_DATE-product-api-fit-audit-draft.md` | Persisted synthesis before user checkpoint |
| `.planning/reviews/$EZA_AUDIT_DATE-product-api-fit-audit.md` | Final user-approved report |
| `.planning/reviews/review-index.json` | Cross-review history and structural-pattern state |

---

### Task 1: Establish the audit workspace and evidence contracts

**Files:**
- Create: `.planning/reviews/product-api-fit/README.md`
- Create: `.planning/reviews/product-api-fit/evidence.schema.json`
- Create: `.planning/reviews/product-api-fit/source-register.md`
- Create: `.planning/reviews/product-api-fit/api-responsibility-map.md`
- Create: `.planning/reviews/product-api-fit/comparative-journeys.md`
- Create: `.planning/reviews/product-api-fit/documentation-opportunities.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-01-workspace.md`
- Create: `.planning/reviews/product-api-fit/evidence/.gitkeep`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/.gitkeep`
- Create: `.planning/evals/product-api-fit/evaluation-protocol.md`
- Create: `.planning/evals/product-api-fit/schemas/run-result.schema.json`
- Create: `.planning/evals/product-api-fit/scripts/validate-artifacts.mjs`
- Create: `.planning/evals/product-api-fit/fixtures/.gitkeep`
- Create: `.planning/evals/product-api-fit/runs/.gitkeep`

**Interfaces:**
- Consumes: approved product/API fit spec and existing `.planning/reviews/review-index.json`.
- Produces: stable evidence, LLM-run, documentation-candidate, and audit-manifest contracts used by every later task.

- [ ] **Step 1: Create the audit directory structure**

Create these directories with non-interactive `mkdir -p`:

```text
.planning/reviews/product-api-fit/evidence
.planning/reviews/product-api-fit/reviewer-outputs
.planning/reviews/product-api-fit/documentation-candidates
.planning/evals/product-api-fit/prompts
.planning/evals/product-api-fit/schemas
.planning/evals/product-api-fit/scripts
.planning/evals/product-api-fit/fixtures
.planning/evals/product-api-fit/runs
```

Create the four `.gitkeep` files listed above through `apply_patch` so the evidence, reviewer-output, fixture, and run directories survive task-level commits and fresh worktrees.

- [ ] **Step 2: Write the audit manifest**

`README.md` must contain these sections with current values resolved during execution:

```markdown
# Product/API Fit Audit Workspace

## Frozen baseline
- Tree commit: output of `git rev-parse HEAD`
- Execution date: output of `date +%F`
- Package versions: root, core, React, and Vue package versions
- Public npm versions: verified from the registry
- Docs deployment URL and deployed version signals: verified, not assumed

## Product contract
- Primary human: experienced frontend developer new to audio
- LLM roles: researcher, implementer, debugger
- North-star journey: interface sounds, overlap, background media, persisted global controls, navigation cleanup, mobile recovery, then effects/analysis/synthesis/timing
- Intent-bound activation: an audio-intent action activates audio; generic initialization UI is a failure unless justified

## Artifact index
- [Evidence and review workspace](./)
- [Source register](./source-register.md)
- [API responsibility map](./api-responsibility-map.md)
- [Comparative journeys](./comparative-journeys.md)
- [Documentation opportunities](./documentation-opportunities.md)
- [Evaluation protocol](../../evals/product-api-fit/evaluation-protocol.md)
- [LLM scorecard](../../evals/product-api-fit/scorecard.md)

## Consent record
- Review fan-out: pending until Task 2
- Paid/quota-bearing LLM calls: pending until Task 2
- External outreach: not authorized
```

- [ ] **Step 3: Define one-record-per-file evidence JSON**

Write `evidence.schema.json` as JSON Schema draft 2020-12. Require these fields:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://sethbrasile.github.io/ez-web-audio/schemas/product-fit-evidence.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id", "capturedAt", "sourceType", "sourceTitle", "sourceUrl",
    "sourceDate", "ecosystem", "audience", "job", "observation",
    "tags", "confidence", "bias", "productLayers", "implication"
  ],
  "properties": {
    "id": { "type": "string", "pattern": "^EZA-[0-9]{4}$" },
    "capturedAt": { "type": "string", "format": "date" },
    "sourceType": {
      "enum": ["official-doc", "issue", "discussion", "public-project", "human-observation", "runtime-reproduction", "llm-run"]
    },
    "sourceTitle": { "type": "string", "minLength": 1 },
    "sourceUrl": { "type": "string", "minLength": 1 },
    "sourceDate": { "type": ["string", "null"] },
    "ecosystem": { "type": "string", "minLength": 1 },
    "audience": { "type": "string", "minLength": 1 },
    "job": { "type": "string", "minLength": 1 },
    "observation": { "type": "string", "minLength": 1 },
    "quote": { "type": ["string", "null"] },
    "tags": {
      "type": "array",
      "items": { "enum": ["pain", "trigger", "outcome", "language", "alternative", "objection", "competitor", "tip", "gotcha", "example"] },
      "minItems": 1,
      "uniqueItems": true
    },
    "confidence": { "enum": ["demonstrated", "probable", "possible", "unknown"] },
    "bias": { "type": "string", "minLength": 1 },
    "productLayers": {
      "type": "array",
      "items": { "enum": ["foundation", "application-playback", "expressive-audio", "musical-systems", "acquisition"] },
      "minItems": 1,
      "uniqueItems": true
    },
    "implication": { "type": "string", "minLength": 1 },
    "documentationCandidate": { "type": ["string", "null"] }
  }
}
```

Collectors own non-overlapping evidence ranges: primary agent `EZA-0001`–`EZA-0999`, application-audio researcher `EZA-1000`–`EZA-1999`, expressive/agent researcher `EZA-2000`–`EZA-2999`. Never renumber a committed record; record duplicates in synthesis.

- [ ] **Step 4: Define documentation candidate and final ledger formats**

Every file in `documentation-candidates/` uses this entry format:

```markdown
### Candidate: concise working title
- Source: evidence ID, review finding, fixture path, LLM run ID, or implementation observation
- Audience: human, LLM, or both
- Product layer: foundation, application playback, expressive audio, musical systems, or acquisition
- Observed friction: one concrete sentence
- Suggested form: recipe, concept, troubleshooting, comparison, migration, or API reference
- Suggested content: the specific tip, gotcha, recovery step, or example to teach
- Canonical public API: symbols involved, or “unresolved by audit”
- Confidence: demonstrated, probable, possible, or unknown
- Priority signal: blocking, high-value, supporting, or speculative
```

`documentation-opportunities.md` starts with the same fields plus `ID`, `Duplicates merged`, `Decision`, and `Status`. Allowed status values are `candidate`, `validated`, `rejected`, and `shipped`. During Workstream 0, only the first three may be used.

- [ ] **Step 5: Define the LLM run result schema**

`run-result.schema.json` must require:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["taskId", "condition", "answer", "files", "activationSite", "assumptions"],
  "properties": {
    "taskId": { "type": "string", "pattern": "^LLM-[0-9]{2}$" },
    "condition": { "enum": ["unseeded", "package-aware", "docs-seeded", "repair"] },
    "answer": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["path", "content"],
        "properties": {
          "path": { "type": "string", "minLength": 1 },
          "content": { "type": "string" }
        }
      }
    },
    "activationSite": { "type": ["string", "null"] },
    "assumptions": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 6: Write the zero-dependency artifact validator**

`validate-artifacts.mjs` must:

1. Parse `evidence.schema.json` and `run-result.schema.json`.
2. Parse every `evidence/*.json` file.
3. Reject duplicate evidence IDs.
4. Reject records missing any required field.
5. Reject invalid confidence, product-layer, or tag values.
6. Parse every `runs/*/result.json` that exists and reject missing run fields.
7. Print counts for evidence records, unique ecosystems, run results, and documentation candidate files.
8. Exit nonzero on any failure.

Use Node built-ins only (`node:fs`, `node:path`, `node:url`). Do not add a JSON-schema dependency; the script validates the required subset explicitly.

Use this implementation:

```javascript
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const evalRoot = resolve(scriptDir, '..')
const repoRoot = resolve(evalRoot, '../../..')
const reviewRoot = join(repoRoot, '.planning/reviews/product-api-fit')
const evidenceDir = join(reviewRoot, 'evidence')
const candidateDir = join(reviewRoot, 'documentation-candidates')
const runsDir = join(evalRoot, 'runs')

const evidenceSchema = JSON.parse(await readFile(join(reviewRoot, 'evidence.schema.json'), 'utf8'))
const runSchema = JSON.parse(await readFile(join(evalRoot, 'schemas/run-result.schema.json'), 'utf8'))
const failures = []

async function entries(path, directories = false) {
  try {
    const found = await readdir(path, { withFileTypes: true })
    return found
      .filter(entry => directories ? entry.isDirectory() : entry.isFile())
      .map(entry => entry.name)
      .sort()
  }
  catch (error) {
    if (error && error.code === 'ENOENT')
      return []
    throw error
  }
}

function validateRequired(record, schema, label) {
  for (const key of schema.required ?? []) {
    if (!(key in record))
      failures.push(`${label}: missing ${key}`)
  }
}

function validateEnum(value, allowed, label) {
  if (!allowed.includes(value))
    failures.push(`${label}: invalid value ${JSON.stringify(value)}`)
}

const evidenceIds = new Set()
const ecosystems = new Set()
const evidenceFiles = (await entries(evidenceDir)).filter(name => name.endsWith('.json'))
for (const name of evidenceFiles) {
  const label = `evidence/${name}`
  const record = JSON.parse(await readFile(join(evidenceDir, name), 'utf8'))
  validateRequired(record, evidenceSchema, label)
  if (evidenceIds.has(record.id))
    failures.push(`${label}: duplicate id ${record.id}`)
  evidenceIds.add(record.id)
  ecosystems.add(record.ecosystem)
  validateEnum(record.confidence, evidenceSchema.properties.confidence.enum, `${label}.confidence`)
  for (const layer of record.productLayers ?? [])
    validateEnum(layer, evidenceSchema.properties.productLayers.items.enum, `${label}.productLayers`)
  for (const tag of record.tags ?? [])
    validateEnum(tag, evidenceSchema.properties.tags.items.enum, `${label}.tags`)
}

let runCount = 0
for (const runId of await entries(runsDir, true)) {
  const resultPath = join(runsDir, runId, 'result.json')
  try {
    const result = JSON.parse(await readFile(resultPath, 'utf8'))
    validateRequired(result, runSchema, `runs/${runId}/result.json`)
    validateEnum(result.condition, runSchema.properties.condition.enum, `runs/${runId}.condition`)
    runCount += 1
  }
  catch (error) {
    const message = error && error.code === 'ENOENT' ? 'missing result.json' : error.message
    failures.push(`runs/${runId}/result.json: ${message}`)
  }
}

const candidateCount = (await entries(candidateDir)).filter(name => name.endsWith('.md')).length
if (failures.length > 0) {
  for (const failure of failures)
    console.error(failure)
  process.exitCode = 1
}
else {
  console.log(`evidence=${evidenceFiles.length} ecosystems=${ecosystems.size} runs=${runCount} documentationCandidates=${candidateCount}`)
}
```

- [ ] **Step 7: Verify Task 1 artifacts**

Run:

```bash
node .planning/evals/product-api-fit/scripts/validate-artifacts.mjs
git diff --check
```

Expected: validator reports zero evidence and run records without error; Git reports no whitespace errors.

- [ ] **Step 8: Record documentation candidates and commit**

Add any protocol-level documentation observations to `documentation-candidates/task-01-workspace.md`; if none exist, write `No new documentation candidates in Task 1.`

Commit only Task 1 artifacts:

```bash
git add .planning/reviews/product-api-fit .planning/evals/product-api-fit
git commit -m "chore(audit): establish product fit evidence workspace"
```

---

### Task 2: Freeze orientation, evaluation protocol, and consent proposal

**Files:**
- Modify: `.planning/reviews/product-api-fit/README.md`
- Modify: `.planning/reviews/product-api-fit/api-responsibility-map.md`
- Modify: `.planning/evals/product-api-fit/evaluation-protocol.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-01-ui-sound.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-02-overlap.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-03-background-stream.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-04-global-controls.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-05-activation-recovery.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-06-framework-cleanup.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-07-effect-analysis.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-08-musical-graduation.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-09-repair-lifecycle.md`
- Create: `.planning/evals/product-api-fit/prompts/LLM-10-library-selection.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-02-orientation.md`

**Interfaces:**
- Consumes: Task 1 artifact contracts, approved spec, public exports, package metadata, previous review index, and current documentation.
- Produces: a frozen tree/API baseline, exact prompts and thresholds, plus the user-facing consent proposal required before Tasks 3–6.

- [ ] **Step 1: Capture the current-tree orientation**

Use QMD first, then read the minimum files needed to record:

- root/core/React/Vue package versions and exports;
- current docs and npm version signals;
- public API inventory by product layer;
- existing `initAudio`, context, loading, playback, global-routing, cleanup, framework, effects, analysis, and transport concepts;
- the latest three relevant reviews and every structural pattern in `review-index.json`;
- current seed hypotheses from the approved spec;
- exact baseline Git commit.

Populate `api-responsibility-map.md` with columns:

```text
Public symbol or behavior | Current responsibility | Product layer | Ownership/lifetime | State exposed | Canonical docs path | North-star use | Suspected gap | Verification status
```

Mark suspected gaps as hypotheses. Do not convert them into findings yet.

- [ ] **Step 2: Write the ten exact prompts**

Each prompt must be self-contained and must require the structured run-result shape. Use these invariant scenarios:

1. One button plays a UI sound; no infrastructure-specific UI requested.
2. Rapid clicks overlap the same sound without cutting earlier instances off.
3. Background music is long enough to require a streaming decision and has play/pause/seek.
4. Global mute and volume persist and affect current and future playback.
5. Audio begins on the first meaningful interaction and recovers after suspension; the prompt explicitly mentions autoplay restrictions.
6. React and Vue route/component cleanup versions of the same feature; activation may not move into an effect or watcher.
7. Add an effect and analyzer to the existing playback structure.
8. Add transport-driven musical timing without replacing the playback foundation.
9. Repair a supplied implementation that awaits loading before trying to activate audio and leaks route-owned playback.
10. Select among native Web Audio, Howler, Tone, and EZ for six cases: simple UI sounds, sound-rich app, long-form player, synthesizer, sequencer, and audio-analysis UI.

Prompts must not mention the generic-init anti-pattern except LLM-05 and LLM-09, which mention browser restrictions without suggesting a solution. This preserves a real adversarial test.

- [ ] **Step 3: Preregister the scorecard before any model run**

`evaluation-protocol.md` must freeze these dimensions and thresholds:

| Dimension | Release signal |
| --- | --- |
| Public-symbol accuracy | At least 95% of referenced EZ symbols exist in the tested package |
| First-pass type-check | At least 80% of docs-seeded implementation runs pass |
| One-attempt repair | At least 95% of ordinary type/lifecycle failures pass after one real error response |
| Intent-bound activation | Zero docs-seeded critical runs add a generic init gate without a scenario-specific justification |
| Activation/runtime correctness | At least 90% of critical runs pass the browser/runtime assertions |
| Cleanup correctness | At least 90% of React/Vue critical runs leave no route-owned active playback, listeners, or timers |
| Architectural continuity | At least 80% of graduation runs retain the original session/resource/playback ownership model |
| Fit classification | At least 80% correct selection across appropriate and inappropriate project cases when EZ context is supplied |

Unseeded recommendation frequency is recorded but does not affect the API release verdict.

For every metric, define numerator, denominator, scorer, evidence file, and what counts as `not-applicable`. Never remove a failed run from the denominator because the provider produced inconvenient output; classify malformed output separately and retain it.

- [ ] **Step 4: Freeze the model sampling matrix**

Resolve exact current models from official provider documentation at execution time. Use one current coding-capable family from each installed non-interactive CLI: Codex, Claude, and Gemini.

Base matrix:

- one docs-seeded run for LLM-01 through LLM-09 on each family: 27 calls;
- one unseeded LLM-10 selection run on each family: 3 calls;
- two additional docs-seeded repetitions for critical tasks LLM-01, LLM-03, LLM-05, LLM-06, and LLM-09 on each family: 30 calls;
- one package-aware run for LLM-01, LLM-05, and LLM-06 on each family: 9 calls.

Total planned external-family calls: **69**. A pilot run from each provider counts toward the matrix if prompt hash, model, condition, and output cap remain unchanged.

- [ ] **Step 5: Hash and freeze prompts**

Run:

```bash
shasum -a 256 .planning/evals/product-api-fit/prompts/*.md
```

Record every hash in `evaluation-protocol.md`. Any later prompt change creates a new protocol revision; never mix old and new prompt versions in one aggregate score.

- [ ] **Step 6: Prepare the review fan-out proposal**

After measuring filtered file counts and LOC per lens, prepare an orientation proposal with this expected shape:

- 2 Tier 2 external-research collectors;
- 2 Tier 1 holistic reviewers: Product/JTBD and Architecture/progressive continuity;
- 4 Tier 2 bounded reviewers: lifecycle/activation, resources/playback, framework ownership, and agent/public surface;
- 1 Tier 3 previous-finding verifier;
- up to 3 Tier 1 debate agents only if Critical/High tensions exist;
- primary session performs orientation, synthesis, fact verification, and report writing.

Expected base fan-out: **9 agents**, run in waves of at most three concurrent agents because the root occupies one of four slots. Conditional maximum: **12 agents** if a high-impact debate is required.

Do not lock reviewers to a model name in the plan. Map the current provider's models to the three capability tiers immediately before consent. Estimate tokens from actual filtered scopes; the preliminary planning range is 140k–240k aggregate agent tokens before conditional debates.

Include an orchestrator handoff recommendation in the proposal. Name the lowest reliable orchestrator tier for each remaining stage, the validated files that make a low-context handoff safe, and the exact gate where a frontier orchestrator must resume. The default recommendation should be mid-tier orchestration for bounded Tasks 3–6 after consent, then frontier orchestration for Tasks 7–8; deviate only when Task 2 evidence shows the stage needs more or less judgment.

- [ ] **Step 7: Prepare the paid/quota-bearing model proposal**

For Codex, Claude, and Gemini, record:

- installed CLI version;
- authenticated/non-interactive readiness without exposing credentials;
- exact model identifier;
- input and output token cap per call;
- pricing or subscription/quota basis from official provider information;
- maximum cost for 69 calls;
- failure/retry policy and maximum additional cost;
- whether calls can be completed under existing subscriptions without incremental API billing.

If a CLI requests login or another interactive prompt, stop. Give the user the exact command to run in a separate terminal and resume only after they confirm authentication.

- [ ] **Step 8: Present the combined consent checkpoint and stop**

Present the review agent count/tier mix/token range and the LLM provider/model/call-count/cost ceiling as two separately approvable items. Also present the stage-by-stage orchestrator recommendation, including every planned downgrade and return-to-frontier gate. Recommend the downgraded mix above. Wait for explicit approval before dispatching an agent or making a quota-bearing model call.

Record the user's exact decisions in the manifest. If either portion is declined, preserve the refusal and adjust completion claims: no cross-family LLM-readiness conclusion without cross-family trials; no deep-review conclusion without its required reviewers.

- [ ] **Step 9: Record documentation candidates and commit**

Update `documentation-candidates/task-02-orientation.md` with every docs/API mismatch or teaching opportunity observed during orientation. Commit the frozen protocol only after prompt hashes and consent state are recorded:

```bash
git add .planning/reviews/product-api-fit .planning/evals/product-api-fit
git commit -m "docs(audit): freeze product fit protocol and prompts"
```

---

### Task 3: Build the external friction and competitive ownership corpus

**Files:**
- Create: `.planning/reviews/product-api-fit/evidence/EZA-1000.json` onward within the first researcher's range
- Create: `.planning/reviews/product-api-fit/evidence/EZA-2000.json` onward within the second researcher's range
- Modify: `.planning/reviews/product-api-fit/source-register.md`
- Create: `.planning/reviews/product-api-fit/external-research-synthesis.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-03-external-research.md`

**Interfaces:**
- Consumes: evidence schema, product contract, audience, research saturation rule, and approved agent consent.
- Produces: independently collected primary-source evidence and an orchestrator-verified JTBD/friction/alternative synthesis used only after reviewer outputs are complete.

- [ ] **Step 1: Dispatch two independent research collectors**

Assign non-overlapping work and evidence ID ranges:

- Application-audio collector (`EZA-1000`–`EZA-1999`): browser policies, native Web Audio, Howler, Pixi Sound, application frameworks, streaming, overlap, global controls, route ownership, mobile recovery.
- Expressive/agent collector (`EZA-2000`–`EZA-2999`): Tone and musical tooling, effects/analysis/synthesis progression, developer library-selection discussions, AI search visibility, package/docs/entity signals.

Collectors follow the customer-research confidence and bias rules. Every observation requires a direct URL, date when available, job, verbatim quote when legally and usefully short, and implication. They may not edit each other's files or read the code reviewers' outputs.

- [ ] **Step 2: Meet the corpus floor and saturation test**

Require:

- at least 30 qualifying observations;
- at least four ecosystems plus official browser documentation;
- no single issue tracker supplies more than 40% of records;
- primary emphasis on the latest 12 months;
- two consecutive collection batches that introduce no new high-confidence friction category.

If saturation occurs before 30 records, continue to 30. If 30 records arrive before saturation, continue until saturation or document why an inaccessible source prevents it.

- [ ] **Step 3: Validate and spot-check the corpus**

Run the artifact validator. The primary agent opens and verifies at least:

- every record supporting a demonstrated-confidence theme;
- two records per ecosystem;
- every record used to claim a competitor owns a responsibility EZ does not;
- every short quote included in the synthesis.

Downgrade or reject records that do not directly support their implication.

- [ ] **Step 4: Synthesize without averaging unlike users**

Write `external-research-synthesis.md` with:

1. Jobs ranked by frequency × intensity.
2. Friction themes and confidence.
3. Trigger events and desired outcomes.
4. Alternatives including native APIs, doing nothing, and custom code.
5. Competitive ownership table: responsibility owned, responsibility delegated, escape hatch, and unsuitable project types.
6. Source-bias and recency limitations.
7. Research gaps requiring observation or interviews.

Keep application-audio and musical-tool segments distinct when their jobs differ.

- [ ] **Step 5: Tally documentation opportunities**

Merge research tips, gotchas, vocabulary, comparison questions, and example ideas into `documentation-candidates/task-03-external-research.md`, preserving evidence IDs. Do not write comparison marketing copy yet.

- [ ] **Step 6: Verify and commit**

Run:

```bash
node .planning/evals/product-api-fit/scripts/validate-artifacts.mjs
git diff --check
```

Commit:

```bash
git add .planning/reviews/product-api-fit
git commit -m "research(audit): map developer audio friction and alternatives"
```

---

### Task 4: Execute the independent holistic product and code review

**Files:**
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/product-jtbd.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/architecture-continuity.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/lifecycle-activation.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/resources-playback.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/framework-ownership.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/agent-public-surface.md`
- Create: `.planning/reviews/product-api-fit/reviewer-outputs/fix-verification.md`
- Modify: `.planning/reviews/product-api-fit/api-responsibility-map.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-04-holistic-review.md`

**Interfaces:**
- Consumes: approved review consent, frozen commit and product contract, filtered scope lists, prior review index, and deep-review prompt template.
- Produces: seven independent, evidence-bearing review outputs. External-research synthesis remains hidden until all seven outputs are complete.

- [ ] **Step 1: Reconfirm the frozen tree**

Run `git rev-parse HEAD` and compare it with the manifest. If only committed audit artifacts changed, record both the product baseline commit and current audit commit. If production code changed, stop and either re-freeze the baseline with user approval or review the original commit in a worktree.

- [ ] **Step 2: Build filtered lens scopes**

Use deep-review exclusion rules and semantic partitions. Keep architecture holistic; keep each Tier 2 partition at or below approximately 1,000 relevant LOC unless the user explicitly approves a tier change after seeing the measured scope.

Required lenses:

| Lens | Required focus |
| --- | --- |
| Product/JTBD | North-star completeness, practical application wedge, beginner-to-ambitious continuity, feature distraction |
| Architecture/continuity | Four-layer dependency direction, semantic roles, replacement points, escape hatches, global ownership |
| Lifecycle/activation | Intent-bound activation, interruption recovery, current/future global controls, session state, errors |
| Resources/playback | Buffering, decoding, caching, streaming, resource/playback identity, overlap, concurrency, disposal |
| Framework ownership | React/Vue parity, synchronous gesture path, route cleanup, reactive state, SSR, StrictMode |
| Agent/public surface | Canonical-path entropy, types, errors, examples, versions, metadata, `llms.txt`, retrieval and selection signals |
| Fix verification | Every applicable Critical/High finding and structural pattern from the latest relevant review |

- [ ] **Step 3: Dispatch in bounded waves**

Use the deep-review reviewer template verbatim. Substitute lens-specific criteria and file lists. Run no more than three reviewers concurrently. Reviewers work independently and cannot modify production code.

Every output must include severity, layer, reachability, blocking, file/line, lens, what, why, fix, and coverage counts. A reviewer returning no conforming result creates a visible reviewer-gap warning; do not silently replace the lens with root-agent intuition.

- [ ] **Step 4: Verify reviewer coverage and factual claims**

Before synthesis:

- check each output against the required format;
- independently verify every Critical and High factual assertion;
- apply the propagation check to named APIs and patterns;
- discard doc-polish that fails the implementer-gap test;
- enforce the test/gate meta-layer cap;
- keep product gaps distinct from correctness bugs.

Do not expose external-research themes to reviewers retroactively. Triangulation belongs to Task 7.

- [ ] **Step 5: Update the responsibility map**

For every semantic role—session, resource, playback, scope, graph capability, musical clock—record:

- current owner(s);
- missing or duplicated responsibility;
- canonical and alternate public paths;
- north-star consequences;
- reviewer evidence;
- whether the role should be kept, deepened, redesigned, removed, or validated.

These remain proposed classifications until the user checkpoint.

- [ ] **Step 6: Tally documentation opportunities**

Write `documentation-candidates/task-04-holistic-review.md`. Capture any tip, gotcha, example, counterexample, recovery message, public-type explanation, or migration concern, linked to reviewer finding and code evidence.

- [ ] **Step 7: Verify and commit raw review evidence**

Run `git diff --check`. Commit independent outputs and the updated responsibility map without synthesizing a verdict:

```bash
git add .planning/reviews/product-api-fit
git commit -m "review(audit): capture independent product and API lenses"
```

---

### Task 5: Run human and comparative north-star journeys

**Files:**
- Create: `.planning/evals/product-api-fit/fixtures/vanilla/`
- Create: `.planning/evals/product-api-fit/fixtures/react/`
- Create: `.planning/evals/product-api-fit/fixtures/vue/`
- Create: `.planning/evals/product-api-fit/fixtures/native-web-audio/`
- Create: `.planning/evals/product-api-fit/fixtures/howler/`
- Create: `.planning/evals/product-api-fit/fixtures/tone/`
- Modify: `.planning/reviews/product-api-fit/comparative-journeys.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-05-comparative-journeys.md`

**Interfaces:**
- Consumes: frozen north-star acceptance criteria and current-tree packed packages.
- Produces: buildable, non-shipping reference fixtures and an evidence-backed responsibility comparison. Later model outputs are scored against behavior, not copied from these fixtures.

- [ ] **Step 1: Pack the current tree as a public consumer would receive it**

Build and pack core, React, and Vue packages. Store tarballs in a task-specific temporary directory created with `mktemp -d`; do not commit tarballs. Record package hashes and manifest exports in `comparative-journeys.md`.

Run the package's existing build/typecheck gates before using the tarballs. A failing package build is an audit finding, not permission to fix product code.

- [ ] **Step 2: Build three EZ north-star fixtures**

The plan intentionally specifies observable behavior instead of prescribing fixture implementation code: application-owned code and concepts are measurements in this audit. Copying a prewritten solution would invalidate the comparison. This is a frozen behavioral contract, not an unfinished implementation step.

Vanilla TypeScript, React, and Vue fixtures must each implement:

- at least three interface sounds with rapid overlap;
- streamed or intentionally selected long-form background audio;
- persisted global mute and volume affecting current and future playback;
- navigation/component ownership and cleanup;
- activation on the first meaningful audio-intent action with no generic init screen;
- observable handling of suspended/interrupted state;
- one analyzer/effect addition without replacing the initial ownership model.

React and Vue fixtures must use only their public binding packages plus public core exports. Record every place application code touches browser-native audio or manually manages listeners/timers.

- [ ] **Step 3: Build scoped alternative fixtures**

Use alternatives only for jobs they plausibly target:

- native Web Audio: application playback foundation baseline;
- Howler: interface sounds, overlap, global controls, and long-form playback;
- Tone: synthesis, analysis/effects, and musical graduation.

Do not force Tone into a simple sound-effects comparison or Howler into transport-heavy synthesis. Pin exact versions in each fixture, resolve the lockfile, and run `pnpm audit` before executing the fixture. A high-severity new dependency finding stops that fixture and is documented rather than waived.

- [ ] **Step 4: Add automated behavioral probes**

Use Playwright assertions for:

- first audio-intent interaction invokes the action without a prior init control;
- rapid overlap creates independent playbacks where supported;
- global controls affect already-active and later playback;
- route/component disposal removes owned activity;
- suspended-state recovery preserves the intended action;
- analyzer/effect graduation preserves the original resource/playback layer.

Run Chromium and WebKit where available. Headless browser state is not proof of audible quality; label those checks structural/runtime only.

- [ ] **Step 5: Conduct the human/device portion**

Prepare a concise UAT script for desktop Safari and a real iOS device covering first interaction, background/foreground, route changes, persisted controls, and resumed playback. The user performs any step requiring a physical device or listening judgment. Record results verbatim; do not infer a pass from automated tests.

- [ ] **Step 6: Score responsibility, not code golf**

For each fixture record:

- concepts required before first sound;
- application-owned activation/recovery code;
- loading/streaming decisions exposed to the app;
- active-playback and overlap model;
- global-control ownership;
- cleanup operations;
- error recovery;
- structural changes needed for analyzer/effect/timing graduation;
- source LOC as context only.

- [ ] **Step 7: Tally documentation opportunities**

Write `documentation-candidates/task-05-comparative-journeys.md` with every implementation tip, browser gotcha, framework cleanup pattern, activation counterexample, and useful canonical example discovered while building or running fixtures.

- [ ] **Step 8: Verify and commit**

Run every fixture build and automated probe, then `git diff --check`. Commit only audit fixtures and results:

```bash
git add .planning/evals/product-api-fit/fixtures .planning/reviews/product-api-fit
git commit -m "test(audit): exercise product fit journeys and alternatives"
```

---

### Task 6: Execute isolated cross-family LLM evaluations

**Files:**
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/request.md`
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/metadata.json`
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/result.json`
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/build.txt`
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/runtime.json`
- Create: `.planning/evals/product-api-fit/runs/$EZA_RUN_ID/score.json`
- Create: `.planning/evals/product-api-fit/scorecard.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-06-llm-evaluations.md`

**Interfaces:**
- Consumes: approved model/cost consent, frozen prompt hashes, run schema, current packed public artifacts, condition-specific documentation, and runtime probes.
- Produces: 69 reproducible raw runs plus aggregate selection, compilation, lifecycle, cleanup, continuity, and repair scores.

- [ ] **Step 1: Verify consent and provider readiness**

Compare exact model identifiers, CLI versions, call count, and maximum cost with the manifest consent record. If any exceeds the approved ceiling, stop and request renewed approval.

Run one non-billable or minimal pilot per CLI in an isolated temporary directory. Do not read credentials. Stop on interactive login.

- [ ] **Step 2: Isolate every model condition**

For each run, create a new `mktemp -d` directory outside the repository. Supply:

- unseeded: project scenario and response schema only;
- package-aware: package name, description, and exported type declarations only;
- docs-seeded: exact approved README/recipe/reference bundle plus scenario;
- repair: generated code, one actual compiler/runtime error, and allowed docs context.

Do not give a model repository paths, ground-truth fixtures, previous model output, review findings, or external-research synthesis.

- [ ] **Step 3: Use non-interactive, non-writing provider invocations**

Use provider-native structured output where available:

Before each invocation, resolve and record these task-specific values from the frozen protocol and consent record:

```text
EZA_RUN_ID=R001-codex-LLM-01-docs-seeded-t1 (then increment sequence/provider/task/condition/trial deterministically)
EZA_RUN_SCHEMA=.planning/evals/product-api-fit/schemas/run-result.schema.json
EZA_RUN_SCHEMA_JSON=the compact JSON content of EZA_RUN_SCHEMA, whose SHA-256 is recorded in metadata
EZA_REQUEST_FILE=.planning/evals/product-api-fit/runs/$EZA_RUN_ID/request.md
EZA_RESULT_FILE=.planning/evals/product-api-fit/runs/$EZA_RUN_ID/result.json
EZA_MODEL=the exact model ID recorded in the consent manifest
EZA_PER_CALL_USD=the approved provider-specific per-call ceiling
```

Invoke the providers with those resolved values:

```text
Codex:  codex exec --ephemeral --ignore-user-config --ignore-rules --sandbox read-only --output-schema "$EZA_RUN_SCHEMA" --output-last-message "$EZA_RESULT_FILE" --model "$EZA_MODEL" - < "$EZA_REQUEST_FILE"
Claude: claude --print --no-session-persistence --tools "" --permission-mode plan --json-schema "$EZA_RUN_SCHEMA_JSON" --output-format json --model "$EZA_MODEL" --max-budget-usd "$EZA_PER_CALL_USD" < "$EZA_REQUEST_FILE"
Gemini: gemini --prompt "Follow the complete request provided on standard input and return only its required structured result." --approval-mode plan --sandbox --output-format json --model "$EZA_MODEL" < "$EZA_REQUEST_FILE"
```

For Claude, `EZA_RUN_SCHEMA_JSON` is the compact JSON content of `run-result.schema.json`, resolved before the command and recorded by SHA-256 in metadata. Codex reads the same schema file directly. Gemini's returned JSON is normalized into the same schema without editing its substantive answer.

The actual commands and exact models must be recorded in `metadata.json`, with credentials and environment values excluded.

- [ ] **Step 4: Materialize and test generated projects**

Validate `result.json`, write its `files` into the isolated run directory, install only the packed current-tree packages and declared framework dependencies, and run:

- TypeScript type-check;
- production build;
- task-specific Playwright/runtime probe;
- public-symbol scan against shipped declarations;
- DOM scan for generic initialization gates;
- lifecycle/cleanup assertions.

Capture the exact error. For repair-eligible failures, provide only that error and the original allowed context for one repair attempt. Never hand-edit generated code before scoring.

- [ ] **Step 5: Score without post-hoc exceptions**

Each `score.json` records:

```text
symbolAccuracy | typecheckFirstPass | buildFirstPass | runtimePass | activationPass | cleanupPass | continuityPass | genericInitGate | repairAttempted | repairPass | malformedOutput | notes
```

Malformed output remains in the denominator defined by the frozen protocol. Record provider outages separately and retry only under the approved retry policy.

- [ ] **Step 6: Aggregate by task, condition, and family**

`scorecard.md` must show:

- aggregate versus every preregistered threshold;
- per-family results without declaring one provider universally better;
- unseeded selection frequency separated from release gates;
- package-aware versus docs-seeded improvement;
- recurring hallucinated symbols or architectures;
- intent-bound activation failure rate and UI examples;
- repair effectiveness;
- total calls, retries, measured tokens where available, and actual cost/quota use.

- [ ] **Step 7: Tally documentation opportunities**

Write `documentation-candidates/task-06-llm-evaluations.md`. Capture recurring misconceptions, missing examples, retrieval failures, error-message opportunities, and model-generated examples worth adapting. Link every candidate to run IDs; never promote a generated example without human and build verification.

- [ ] **Step 8: Validate and commit**

Run:

```bash
node .planning/evals/product-api-fit/scripts/validate-artifacts.mjs
git diff --check
```

Commit raw runs and scorecard. If raw text exceeds 5 MB, commit all metadata, hashes, scores, errors, and representative failures; store the complete raw artifact at a user-approved durable location and record its checksum. Do not silently discard oversized output.

```bash
git add .planning/evals/product-api-fit .planning/reviews/product-api-fit/documentation-candidates/task-06-llm-evaluations.md
git commit -m "test(audit): measure cross-family LLM product usability"
```

---

### Task 7: Triangulate evidence and write the draft product/API fit report

**Files:**
- Create: `.planning/reviews/$EZA_AUDIT_DATE-product-api-fit-audit-draft.md`
- Modify: `.planning/reviews/product-api-fit/documentation-opportunities.md`
- Modify: `.planning/reviews/review-index.json`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-07-synthesis.md`

**Interfaces:**
- Consumes: external evidence, reviewer outputs, responsibility map, comparative journeys, LLM scorecard, documentation candidates, prior review history, and approved decision gates.
- Produces: a non-trivial persisted draft, verified findings, structural-pattern entries, deduplicated documentation ledger, and proposed product work groupings ready for the mandatory user checkpoint.

- [ ] **Step 1: Triangulate rather than vote**

For each possible finding, compare:

- external developer evidence;
- current code/API evidence;
- human/comparative fixture behavior;
- LLM behavior;
- prior review history.

Agreement across streams raises confidence. Disagreement becomes a tension or validation gap; reviewer count is not a vote.

- [ ] **Step 2: Apply the finding taxonomy and gates**

Every final finding must include:

- unique ID;
- severity and blocking status;
- affected product layer and north-star journey;
- violated decision gate;
- evidence links from at least one stream;
- confidence and source-bias note;
- structural cause;
- classification: keep/emphasize, reposition, deepen, redesign-before-1.0, remove, add-foundation, or validate;
- API vs documentation vs acquisition vs irreducible-model cause;
- specific recommendation and non-goals.

A blocker must satisfy the approved blocking test. Do not elevate popularity or a single model hallucination into an API blocker.

- [ ] **Step 3: Independently verify Critical and High findings**

The primary agent verifies the core factual assertion of every Critical and High finding with fresh code, build, browser, source, or run inspection. Expand named-pattern findings across all occurrences. Remove or downgrade anything that fails verification.

- [ ] **Step 4: Analyze structural patterns and genuine tensions**

Group symptoms by root cause and cross-reference `review-index.json`. If a Critical/High tension remains, dispatch two or three Tier 1 debate agents under the consented contingency. Each receives evidence for opposing positions and returns a 200–300 word argument. The primary agent makes a clear recommendation rather than averaging positions.

Write structural pattern entries to `review-index.json` immediately, following the deep-review schema. Do not wait for finalization.

- [ ] **Step 5: Deduplicate the documentation ledger**

Merge all `documentation-candidates/*.md` into `documentation-opportunities.md`:

- assign stable `DOC-###` IDs;
- merge duplicates and list their sources;
- reject unsupported or obsolete candidates explicitly;
- classify form and product layer;
- tie validated entries to findings, evidence, fixture paths, or run IDs;
- identify the canonical example and public API symbols when known;
- preserve unresolved API-dependent candidates as `candidate`, not invented guidance.

The ledger must include intent-bound activation guidance and counterexamples if supported by the audit.

- [ ] **Step 6: Write the draft report to disk before conversation**

Use the deep-review report structure plus product-specific sections:

1. Executive product verdict.
2. Evidence and methodology.
3. Decision-gate scorecard.
4. Critical and High findings.
5. Tension resolutions.
6. Structural patterns.
7. Medium and Low findings.
8. Four-layer API responsibility map.
9. Competitive ownership and human journeys.
10. LLM evaluation results.
11. Documentation opportunity summary.
12. “Do not build” list.
13. Validation and interview gaps.
14. Proposed action groupings.

Set `status: draft`. Qualify the verdict to the product/API fit scope. Verify the file is at least 20 lines before presenting any finding.

- [ ] **Step 7: Record synthesis documentation candidates**

Add any report-navigation, methodology, decision-explanation, or migration-documentation suggestions unique to synthesis in `task-07-synthesis.md`, then merge them before the checkpoint.

- [ ] **Step 8: Verify and commit the draft**

Run:

```bash
node .planning/evals/product-api-fit/scripts/validate-artifacts.mjs
git diff --check
```

Validate `review-index.json` parses. Commit the draft and supporting ledgers before the user checkpoint so context loss cannot erase findings:

```bash
git add .planning/reviews .planning/evals/product-api-fit/scorecard.md
git commit -m "review(audit): synthesize product and API fit findings"
```

---

### Task 8: Checkpoint, finalize, record, and stop

**Files:**
- Rename: `.planning/reviews/$EZA_AUDIT_DATE-product-api-fit-audit-draft.md` to `.planning/reviews/$EZA_AUDIT_DATE-product-api-fit-audit.md`
- Modify: `.planning/reviews/product-api-fit/README.md`
- Modify: `.planning/reviews/product-api-fit/documentation-opportunities.md`
- Create: `.planning/reviews/product-api-fit/documentation-candidates/task-08-finalization.md`
- Modify: `.planning/reviews/review-index.json`
- Append: `~/.claude/reference/review-scorecards.jsonl` when that ledger is available

**Interfaces:**
- Consumes: persisted draft and live user decisions.
- Produces: final approved report, valid review history, measured review scorecard, follow-up Beads groupings, and a hard handoff boundary with no fixes started.

- [ ] **Step 1: Present the live findings checkpoint**

Present Critical/High findings first, then grouped Medium/Low findings, tension recommendations, documentation ledger summary, and proposed work groupings. Tell the user where the full draft lives.

Offer these decisions:

- act on all findings;
- select groupings;
- reclassify;
- escalate a tension;
- redirect scope;
- finish with report only.

Wait for the user's response. This checkpoint cannot be delegated.

- [ ] **Step 2: Apply user decisions to the existing draft**

Do not regenerate the report. Update the persisted draft:

- add accepted/rejected/reclassified decisions;
- incorporate debate outcomes;
- remove dismissed findings;
- recompute blocking count and scoped verdict;
- finalize action groupings;
- finalize documentation-ledger decisions without implementing docs;
- change `status: draft` to `status: final`.

Record any late documentation opportunities exposed by the user's questions, reclassifications, or wording corrections in `documentation-candidates/task-08-finalization.md`. Merge them into `documentation-opportunities.md` using the same evidence, audience, product-layer, form, confidence, priority, and status fields as Task 7. If no new opportunity appears, record that explicitly in the task file.

- [ ] **Step 3: Finalize review history and scorecard**

Rename the draft to the final filename and replace draft references in `review-index.json`. Append one review entry with counts and structural pattern slugs. Validate JSON.

Record the global review scorecard with measured—not estimated—tokens, raw/refuted/final funnel, verification coverage, and prior-scope escape count. If the global ledger is unavailable, record that fact in report metadata.

Any structural pattern still open after two or more reviews receives a P1 structural Bead with its recurrence history. Structural items route to design work, not direct symptom fixes.

Every approved implementation-grouping Bead must include this acceptance requirement: read the relevant `DOC-###` ledger entries before implementation, record new tips/gotchas/examples discovered during the work, and update each affected ledger entry to validated, rejected, or still-candidate. Subsequent implementation plans carry the same per-task documentation-candidate step used by this audit.

- [ ] **Step 4: Run final audit quality gates**

Run:

```bash
node .planning/evals/product-api-fit/scripts/validate-artifacts.mjs
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

Run fixture builds and Playwright probes again if Task 8 changed any fixture, protocol, scoring, or result artifact. A report-only edit does not require rerunning model calls.

- [ ] **Step 5: Close tracking and commit**

Close the Workstream 0 execution Bead only after the final report and index validate. File Beads for approved action groupings and unresolved human-validation work. Commit the final report and state:

```bash
git add .planning/reviews .planning/evals/product-api-fit
git commit -m "review: finalize product and API fit audit"
```

Follow repository close protocol: `git pull --rebase`, `bd dolt push`, `git push`, and confirm `git status --short --branch` is synchronized.

- [ ] **Step 6: Stop at the context boundary**

Report the final path, scoped verdict, finding counts, structural patterns, documentation-opportunity count, and approved work groupings. Do not create implementation plans or begin fixes in this session. Each approved grouping gets a fresh design/planning context and reads only its relevant findings plus ledger entries.

## Plan acceptance checks

Before execution begins, confirm:

- the spec amendment captures continuous documentation tallying;
- audit artifacts are isolated from shipping packages;
- external research and reviewer discovery remain independent;
- the user explicitly approves review fan-out and model cost after exact orientation;
- prompts and numeric thresholds freeze before model trials;
- intent-bound activation has an adversarial and runtime-tested gate;
- vanilla, React, Vue, native, Howler, and Tone comparisons are scoped to appropriate jobs;
- all high-impact findings require primary-agent verification;
- documentation suggestions are deduplicated and evidence-linked rather than implemented opportunistically;
- the live findings checkpoint and no-auto-fix boundary remain intact.

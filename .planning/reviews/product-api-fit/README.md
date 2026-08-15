# Product/API Fit Audit Workspace

## Frozen orientation

- Product-tree commit: `8c67cf119d32ba39e67b8b8d256345ac65ddeb34` (the code, packages, and docs being evaluated).
- Audit-contract checkpoint consumed by Task 2: `b1c7db3a95816942ea670dc2f52fb92812fcff8d`.
- Orientation date: `2026-08-15`.
- Package versions: root `0.2.0`; core (`ez-web-audio`) `0.2.0`; React (`@ez-web-audio/react`) `0.2.0`; Vue (`@ez-web-audio/vue`) `0.2.0`.
- Package export shape: each published package exposes one `.` ESM entry with `dist/index.js` and `dist/index.d.ts`; root is an orchestration-only workspace package.
- Public npm signals: `ez-web-audio` was `0.1.0`; both adapter packages returned registry 404 on `2026-08-15`.
- Deployed docs signal: `https://sethbrasile.github.io/ez-web-audio/` was reachable on `2026-08-15`; its HTML identified VitePress `1.6.4` and Schema.org `SoftwareSourceCode.version` `1.0.0`. These observations are not treated as package truth.

The [API responsibility map](./api-responsibility-map.md) is an orientation inventory, not a finding register. Every suspected gap remains a hypothesis until the independent research, review, fixture, or model evidence required by the approved design exists.

## Product contract

- Primary human: an experienced frontend developer new to audio.
- LLM roles: researcher, implementer, and debugger.
- North-star journey: interface sounds, overlap, background media, persisted global controls, navigation cleanup, mobile recovery, then effects, analysis, synthesis, and timing without replacing the original ownership model.
- Intent-bound activation: an audio-intent action activates audio. An infrastructure-themed gate is a failure unless the scenario specifically justifies one.
- Scope: diagnosis and recommendations only. This audit does not implement fixes.

## Prior-review orientation

The three indexed reviews are all relevant and are retained as historical evidence rather than current findings:

| Date | Scope | Blocking counts | Indexed structural patterns |
| --- | --- | --- | --- |
| 2026-03-07 | M5 Effects/Transport and M6 DX/Discoverability delta | 0 Critical, 7 High, 18 Medium, 22 Low | inconsistent event systems; missing effect disposal; fluent API conversion gap |
| 2026-03-19 | M7 feature demos | 2 Critical, 19 High, 38 Medium, 28 Low | demo cleanup inconsistency; duplicated demo audio initialization |
| 2026-07-11 | Full codebase pre-1.0 health check | 2 Critical, 19 High, 11 Medium, 1 Low, plus about 87 non-blocking | stale scheduled work; ramp/setter desync; constructor/setter parity; incomplete disposal cascade |

Every pattern in `.planning/reviews/review-index.json` is currently marked resolved: `inconsistent-event-systems`, `missing-effect-dispose`, `fluent-api-conversion-gap`, `demo-resource-cleanup-inconsistency`, `demo-audio-init-duplication`, `stale-scheduled-work`, `ramp-setter-desync`, `ctor-setter-parity`, and `incomplete-disposal-cascade`. Task 4's verifier must test those resolution claims independently, especially the recurring ownership/disposal and initialization shapes; their presence here does not reactivate a finding.

## Seed hypotheses retained

The approved design's eight hypotheses remain unchanged: intent activation may not be first-class enough for LLMs; longer media may lack streaming; preload may cache responses rather than decoded resources; global controls may not consistently own all session audio; framework bindings may retain manual ownership gaps; public messaging may foreground brevity/breadth over operational ownership; agent-readable docs may improve ingestion without baseline recommendation; and public version signals may disagree. See the responsibility map for the oriented surface and required verification. The audit must be willing to refute all eight.

## Artifact index

- [Source register](./source-register.md)
- [API responsibility map](./api-responsibility-map.md)
- [Comparative journeys](./comparative-journeys.md)
- [Documentation opportunities](./documentation-opportunities.md)
- [Task 2 documentation candidates](./documentation-candidates/task-02-orientation.md)
- [Evaluation protocol and consent proposal](../../evals/product-api-fit/evaluation-protocol.md)
- [Run-result schema](../../evals/product-api-fit/schemas/run-result.schema.json)

## Consent checkpoint — approved

Exact user response: `approve both`.

Task 2 records that response as approval of Items A and B and the proposed orchestrator handoff, unchanged and within every limit below. No review/research agent has been dispatched and no model inference, quota-bearing call, paid call, interactive login, or external outreach has occurred in Task 2.

### Item A — independent research and review fan-out

- **Decision:** `approved unchanged`.
- Approved base: **9 agents** — 2 `gpt-5.6-terra`/`medium` external-research collectors, 2 `gpt-5.6-sol`/`high` holistic reviewers, 4 `gpt-5.6-terra`/`high` bounded reviewers, and 1 `gpt-5.6-luna`/`medium` previous-finding verifier.
- Conditional maximum: **12 agents** only if Critical/High tensions require up to 3 independent `gpt-5.6-sol`/`xhigh` debate agents.
- Concurrency: waves of at most 3 agents because the root orchestrator occupies the fourth slot.
- Estimated aggregate agent usage: **140k–240k tokens before conditional debates**, derived from the exact file manifests, measurements, hashes, first review turns, and later blinded-scoring turns in the evaluation protocol. The two blinded scorers for each judgment metric reuse six base reviewers in later turns, so the unique-agent ceiling remains 9 base / 12 conditional. Debate agents require a new estimate before dispatch.
- Independence: research collectors do not receive code-review conclusions; reviewers do not receive synthesized external-research themes; triangulation occurs in Task 7.
- Local/read-only work: agents collect evidence or produce bounded review artifacts only. No product fix is authorized.

### Item B — isolated cross-family model evaluation

- **Decision:** `approved unchanged`.
- Approved matrix: **69 calls**, 23 per provider family, exactly as frozen in the evaluation protocol.
- Approved models: OpenAI `gpt-5.3-codex`; Anthropic `claude-sonnet-5`; Google `gemini-3.5-flash`.
- Per-call caps: **20,000 input tokens and 6,000 output tokens**. No tools, web search, or autonomous repository edits in model runs.
- API-list-price ceiling for the 69-call matrix: **$6.97 USD**. One transient-infrastructure retry per provider adds at most **$0.31**, for a hard proposed ceiling of **$7.28**. Malformed, refused, or low-quality outputs are retained and are not retried.
- Subscription basis: Codex reports `Logged in using ChatGPT`, so the planned CLI calls may consume included ChatGPT/Codex quota without incremental API billing; the API list price remains the conservative comparison ceiling. Claude is installed but logged out. Gemini authentication is unverified without a prohibited model call or credential/config inspection. Neither uncertain provider is ready to run.
- Required separate-terminal readiness actions after consent: run `claude auth login`, then let the audit re-run `claude auth status`; for Gemini run `gemini`, complete `/auth`, exit, and let the audit perform the approved pilot. If either exact model is unavailable or the auth/billing basis differs from this proposal, the protocol returns to consent before calls continue.

Pricing/model evidence is current official provider material accessed on `2026-08-15`: [OpenAI GPT-5.3-Codex model and API pricing](https://developers.openai.com/api/docs/models/gpt-5.3-codex), [OpenAI Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [Anthropic current models](https://platform.claude.com/docs/en/about-claude/models/overview), [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Anthropic Claude Code subscription authentication](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan), [Google Gemini 3.5 Flash pricing](https://ai.google.dev/gemini-api/docs/pricing), and [Gemini CLI quota/authentication basis](https://github.com/google-gemini/gemini-cli/blob/main/docs/resources/quota-and-pricing.md).

### Orchestrator handoff approval

**Decision:** `approved unchanged`. Use `gpt-5.6-terra` at `high` reasoning for bounded Tasks 3–6. The validated evidence schema, source register, API map, exact prompt hashes, run schema, sampling matrix, scoring definitions, and blind-packet procedure constrain those handoffs. `gpt-5.6-sol` at `high` must resume immediately for any plan-changing ruling or unresolved Critical/High adjudication, and unconditionally for Task 7 cross-stream synthesis and Task 8 live findings decisions/finalization; conditional Critical/High debates use `gpt-5.6-sol` at `xhigh`. The stage table and exact return gates are in the evaluation protocol.

### Exact user decisions

- User wording: `approve both`.
- Review fan-out decision: `approved unchanged`.
- Model-call decision: `approved unchanged`.
- Orchestrator handoff decision: `approved unchanged`.
- Approved deviations, limits, or refusals: `none recorded`.
- External outreach: `not authorized`.

This checkpoint freezes both approvals. The post-consent authentication, exact-model, billing-basis, protocol-change, and frontier-return gates remain mandatory; approval does not authorize a silent fallback or external outreach.

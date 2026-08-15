# Product/API Fit Evaluation Protocol

## Status and boundary

- Protocol revision: `task-02-pending-consent`.
- Product baseline: `8c67cf119d32ba39e67b8b8d256345ac65ddeb34`.
- Audit-contract checkpoint: `b1c7db3a95816942ea670dc2f52fb92812fcff8d`.
- Consent: review fan-out `pending`; quota-bearing model calls `pending`; external outreach `not authorized`.
- Task 2 made no inference call, dispatched no agent, performed no interactive login, and inspected no credential, token, certificate, key, `.env`, or authentication-config file.
- Scope is diagnosis and recommendation only. Runs and reviewers may produce evidence and disposable fixtures; they may not fix the product.

This protocol evaluates whether a human or LLM can discover, select, implement, and repair EZ Web Audio for the north-star journey using only public surface. Hypotheses in the orientation map remain hypotheses until the required independent evidence exists.

## Frozen run contract

Each external-family run has a unique directory named:

```text
runs/LLM-XX-<provider>-<condition>-rNN/
```

It contains the exact prompt, the exact supplied context packet, raw provider output, generated files, build/runtime logs, scorer records, token/cost metadata, and `result.json`. `result.json` must conform to `schemas/run-result.schema.json`; the model is required to return that shape, but the harness preserves malformed raw output and emits a scorer-owned failure record rather than silently repairing the answer.

Conditions are frozen as:

- `unseeded`: the task prompt only; no EZ package or documentation context.
- `package-aware`: the task prompt plus installed package name/version, package metadata, and public declarations/exports; no narrative docs.
- `docs-seeded`: package-aware context plus a hashed, run-recorded bundle of relevant public README/guide/reference anchors.
- `repair`: an intentionally flawed implementation plus one real compiler or browser/runtime error response. The base 69-call matrix uses the docs-seeded LLM-09 repair task; `repair` is reserved for separately approved follow-on repair attempts and must not be smuggled into the base call count.

The context packet supplies the run condition and package snapshot outside the hashed task prompt. The prompt tells the model to copy that condition into `result.json`, defaulting to its task's base condition only when the runner omitted it. Context packets are stored and hashed per run. No model receives another model's answer, scorer result, external-research synthesis, or reviewer conclusion.

## Frozen prompts

| Task | Scenario | Base condition | Critical | Repetitions per family in base matrix |
| --- | --- | --- | --- | --- |
| LLM-01 | One-button UI sound | docs-seeded | yes | 3 docs-seeded + 1 package-aware |
| LLM-02 | Overlapping repeated clicks | docs-seeded | no | 1 docs-seeded |
| LLM-03 | Long background stream with controls | docs-seeded | yes | 3 docs-seeded |
| LLM-04 | Persisted global mute/volume | docs-seeded | no | 1 docs-seeded |
| LLM-05 | First-interaction activation and recovery | docs-seeded | yes | 3 docs-seeded + 1 package-aware |
| LLM-06 | React/Vue cleanup and activation boundary | docs-seeded | yes | 3 docs-seeded + 1 package-aware |
| LLM-07 | Add effect and analyzer | docs-seeded | no, graduation | 1 docs-seeded |
| LLM-08 | Add transport timing | docs-seeded | no, graduation | 1 docs-seeded |
| LLM-09 | Repair loading/activation order and route leak | docs-seeded | yes, repair | 3 docs-seeded |
| LLM-10 | Six-way library selection | unseeded | no, fit | 1 unseeded |

LLM-05 and LLM-09 explicitly mention browser autoplay restrictions without suggesting a remedy. No other prompt names the infrastructure-first anti-pattern. LLM-06 independently fixes the requirement that the activation boundary cannot move into an effect or watcher. That preserves the adversarial intent-bound activation test rather than tutoring the model to the answer.

### Prompt SHA-256 hashes

The following hashes were produced with `shasum -a 256 .planning/evals/product-api-fit/prompts/*.md` after the prompt text was final:

<!-- PROMPT_HASHES_START -->
| Prompt | SHA-256 |
| --- | --- |
| `LLM-01-ui-sound.md` | `2857f9796bdc178d73910d73bd74c3b42543b3a2bd9d2fa3aca7b8d3bbc85a92` |
| `LLM-02-overlap.md` | `ac69f8b80810920ea3c3e7f4f10f61e2f07c19eb293d871a9298b994a712ec93` |
| `LLM-03-background-stream.md` | `1311e98f454ff16516b5fe0c915fc9042800ea7086484b3b6361378d149fef84` |
| `LLM-04-global-controls.md` | `9cf73f3d1b6ae37fdac94e289313ce006f156a69a0e90e6768cd77e9ab07a793` |
| `LLM-05-activation-recovery.md` | `bac21ba66ab23b1e9f74e23b6898fb01b05ba840dc23f6b8b1c5dfaa8bfb9f3f` |
| `LLM-06-framework-cleanup.md` | `05c339fdfd8f9cb167e89b0e7806ea78f127d54229c889ed45cf2f31b548749f` |
| `LLM-07-effect-analysis.md` | `33e92f96989a4a35e3f7c786393378a703bf1b4059fe177476e44fd05e946640` |
| `LLM-08-musical-graduation.md` | `40f51a1c967185a39b2eaffd3c3119f62d3e7bd9e15ce0b72689a12f0db59f88` |
| `LLM-09-repair-lifecycle.md` | `4c73694a5aae1beb65f4880fac6004667d270d0cc361e5487fa73ee53e187ab3` |
| `LLM-10-library-selection.md` | `05bb6b085375836952a04c19fff238ce7098bc08de1056f14d2cf98d8ac3065b` |
<!-- PROMPT_HASHES_END -->

Any prompt edit creates a new protocol revision and new run namespace. Results from different prompt hashes must never be mixed into one aggregate score. A pilot counts toward the matrix only when prompt hash, exact model, condition packet, and 20k/6k token caps are unchanged.

## Preregistered metrics

### Global scoring rules

1. Automated build/runtime scorers retain their raw commands, versions, stdout/stderr, browser traces, and assertions. Judgment metrics are independently scored by two blinded scorers who do not see provider identity or each other's label; unresolved disagreement goes to the primary session at Task 7.
2. A planned eligible run is never removed because it is malformed, refused, truncated, low quality, or otherwise inconvenient. Such a run is classified separately and scores as a failure for every eligible run-level metric. For symbol accuracy, an eligible malformed/refused run with no scorable symbol adds one zero-numerator failure unit to prevent an empty response from improving the ratio.
3. `not-applicable` is allowed only for the scenario exclusions stated below, never for failed output. Every N/A record names the rule and is reviewed during synthesis.
4. First pass means the raw generated files before any scorer or human edit. One-attempt repair means one subsequent provider response after supplying the actual first compiler/runtime error; no hidden prompt coaching or manual patch is allowed.
5. Browser/runtime tests use the same pinned fixture, browser set, audio stubs/assets, and assertions across provider families. Model/provider errors and product/API-caused failures are classified separately, but both remain in release-signal denominators where the run was eligible.

| Dimension | Release signal | Numerator | Denominator | Scorer | Evidence file | `not-applicable` |
| --- | --- | --- | --- | --- | --- | --- |
| Public-symbol accuracy | At least 95% of referenced EZ symbols exist in the tested package | Referenced EZ imports/members/signatures that resolve against the exact tested public declarations | Every distinct referenced EZ symbol in LLM-01–09 implementation output, plus one failure unit for each eligible malformed/refused output with no symbols | Declaration/import checker; two blinded scorers adjudicate dynamic/property ambiguity | Per-run `scores/public-symbols.json`, declaration snapshot, type-check log | LLM-10 selection output; prose that makes no claim of an EZ identifier |
| First-pass type-check | At least 80% of docs-seeded implementation runs pass | Eligible runs whose untouched generated files pass the pinned type-check command | All docs-seeded LLM-01–08 runs, including repetitions and malformed/refused outputs | Deterministic TypeScript/build harness | Per-run `logs/typecheck-first-pass.txt` and `scores/typecheck.json` | LLM-09 repair task; LLM-10 selection; package-aware condition |
| One-attempt repair | At least 95% of ordinary type/lifecycle failures pass after one real error response | LLM-09 implementations that type-check and pass the activation/recovery/cleanup fixture after their single response to the supplied real browser error and lifecycle observation | All nine docs-seeded LLM-09 runs; malformed/refused output remains a failure | Deterministic compiler/browser rerun plus two blinded lifecycle scorers | Per-run supplied error, raw response, `logs/typecheck-repair.txt`, runtime log, `scores/repair.json` | None for an LLM-09 run; other tasks are outside the frozen one-attempt repair sample |
| Intent-bound activation | Zero docs-seeded critical runs add a generic init gate without scenario-specific justification | Docs-seeded critical runs with no unjustified infrastructure gate | All docs-seeded LLM-01, LLM-03, LLM-05, LLM-06, and LLM-09 runs, including repetitions and malformed/refused output | Static activation-site extraction plus two blinded lifecycle scorers | Per-run `scores/activation-intent.json`, generated UI/code, activation-site assertion | None for an eligible critical run; a genuinely explicit immersive/permission/host-owned workflow must be in the prompt to justify a gate |
| Activation/runtime correctness | At least 90% of critical runs pass browser/runtime assertions | Critical runs passing first meaningful interaction, synchronous activation boundary, preserved action after async load, suspension recovery, and no forbidden deferral assertions applicable to that task | Every critical docs-seeded run plus package-aware LLM-01, LLM-05, and LLM-06 runs; malformed/refused runs fail | Pinned Playwright fixture and two blinded lifecycle scorers | Per-run `logs/runtime.json`, trace, screenshots where useful, `scores/activation-runtime.json` | Only an assertion genuinely outside that prompt's scenario; the run itself remains in the denominator and must pass all applicable assertions |
| Cleanup correctness | At least 90% of React/Vue critical runs leave no route-owned active playback, listeners, or timers | Framework implementation units passing post-unmount/navigation resource assertions | React and Vue units from every LLM-06 run (24 framework units in the base matrix); malformed/refused run contributes two failures | Pinned navigation fixture with node/listener/timer probes; two blinded framework scorers | Per-run `logs/cleanup-react.json`, `logs/cleanup-vue.json`, `scores/cleanup.json` | No N/A for LLM-06; one framework unit can be N/A only if the harness itself is proven unavailable before any provider output and the entire affected matrix is rerun later |
| Architectural continuity | At least 80% of graduation runs retain the original session/resource/playback ownership model | LLM-07/08 runs that add the requested capability without replacing or duplicating the supplied foundation/ownership model | All docs-seeded LLM-07 and LLM-08 runs; malformed/refused output fails | Structural diff rules plus two blinded architecture scorers | Per-run baseline/generated trees and `scores/continuity.json` | None for eligible graduation runs |
| Fit classification | At least 80% correct selection across appropriate and inappropriate project cases when EZ context is supplied | LLM-10 case decisions matching the preregistered job/scope rubric and giving materially correct tradeoff reasons | All 18 case decisions in the three unseeded LLM-10 runs; EZ is explicitly supplied as one of four candidates, while no EZ documentation or package context is supplied | Two blinded Product/JTBD scorers against the frozen answer key below | Per-run `scores/fit.json`, raw answer, and this protocol revision | A case cannot be N/A; malformed/refused response makes all six cases failures |

Unseeded recommendation frequency is recorded as `EZ selections / 18 unseeded case decisions` across the three LLM-10 calls, with per-case breakdown. It is an acquisition signal only and cannot change the API release verdict.

Malformed output classification is reported independently as `malformed planned calls / 69`; refusals, truncations, provider outages, and schema-invalid answers have separate counts. These labels explain failures but do not erase them.

### Frozen LLM-10 fit answer key

The primary choice is scored against job ownership, not brand preference. A case earns its numerator only when both the choice and material rationale match this preregistration:

| Case | Expected primary choice | Required material rationale |
| --- | --- | --- |
| Three simple marketing-site sounds | Howler | Mature low-friction file playback is proportionate; switch to native for zero-dependency/basic media or EZ if the application-audio journey grows |
| Sound-rich frontend app with later visualization | EZ Web Audio | This is the stated application-audio north-star and progressive graph use case; answer must acknowledge that streaming/global ownership/runtime evidence is still subject to the supplied version's capabilities |
| Multi-hour podcast player | Howler using its HTML5-audio mode | Streaming/media controls are primary; switch to a dedicated media element/player stack if media-session/background requirements exceed the four choices |
| Browser synthesizer | Tone | Instruments, envelopes, modulation, and graph composition are the central job rather than application sound playback |
| Step sequencer | Tone | Transport, bars/beats, look-ahead scheduling, looping, and synchronized instruments are the central job |
| Performance-sensitive analysis UI | Native Web Audio | Direct graph, input, analyzer, and node-level performance control dominate; a wrapper is justified only if it preserves full access without adding lifecycle friction |

A scorer may not substitute a different preferred brand because of personal taste. If new official capability evidence proves an expected choice materially impossible before the first run, change the protocol revision and return to consent rather than editing the answer key after results exist.

## Frozen 69-call sampling matrix

Use exactly one model identifier per provider family for the whole protocol revision. Each family has the same 23-call allocation:

| Allocation per provider | Calls | Three-family total |
| --- | ---: | ---: |
| One docs-seeded LLM-01 through LLM-09 | 9 | 27 |
| One unseeded LLM-10 | 1 | 3 |
| Two more docs-seeded repetitions of LLM-01, LLM-03, LLM-05, LLM-06, LLM-09 | 10 | 30 |
| One package-aware LLM-01, LLM-05, LLM-06 | 3 | 9 |
| **Total** | **23** | **69** |

Repetition IDs are fixed `r01`–`r03` for docs-seeded critical tasks; non-repeated and package-aware calls use `r01`. Each call starts a clean provider session. Temperature/reasoning controls, CLI flags, environment, exact command, timestamps, model-reported identifier, token use, and output cap are captured. No fallback model is accepted silently: a provider fallback invalidates the call and returns to consent if the exact model cannot be restored.

## Provider, readiness, and cost proposal

Non-billable local checks on `2026-08-15` produced:

| Provider | CLI/version | Safe readiness evidence | Exact proposed model | Official token price per 1M input/output | 23-call maximum at 20k input + 6k output per call | Incremental billing assessment |
| --- | --- | --- | --- | --- | ---: | --- |
| OpenAI | `codex-cli 0.147.0` | `codex login status` → `Logged in using ChatGPT` | `gpt-5.3-codex` | $1.75 / $14.00 | $2.737 | Expected to consume included ChatGPT/Codex quota while available; API-list-price proxy retained because exact plan allowance was not inspected |
| Anthropic | Claude Code `2.1.233` | `claude auth status` → `loggedIn: false`, `authMethod: none` | `claude-sonnet-5` | Current introductory price through 2026-08-31: $2.00 / $10.00 | $2.300 | Not ready. Subscription-vs-API billing cannot be known until the user logs in; no inference may run meanwhile |
| Google | Gemini CLI `0.46.0` | Version/help only; no non-inference auth-status command was available, and credential/config inspection is prohibited | `gemini-3.5-flash` | $1.50 / $9.00 paid-tier list price; eligible free/login quota may be $0 | $1.932 | Unverified pending Task 6 pilot. Existing subscription/free quota and model availability cannot be claimed without approved login/pilot |
| **Matrix ceiling** |  |  |  |  | **$6.969 → $6.97** | Hard proposal below |

Model/cost sources (official, accessed `2026-08-15`): [OpenAI model limits and API price](https://developers.openai.com/api/docs/models/gpt-5.3-codex), [Codex ChatGPT-plan basis](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [Anthropic current model IDs/capabilities](https://platform.claude.com/docs/en/about-claude/models/overview), [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Claude Code subscription authentication/billing caveat](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan), [Gemini 3.5 Flash price](https://ai.google.dev/gemini-api/docs/pricing), and [Gemini CLI quotas by authentication method](https://github.com/google-gemini/gemini-cli/blob/main/docs/resources/quota-and-pricing.md).

The 20k input cap includes frozen prompt, context packet, and provider-added user-visible context where measurable. The 6k output cap includes reasoning tokens when the provider bills or reports them that way. These are audit caps, not provider context limits. A call that would exceed a cap is stopped and scored as truncated unless a protocol revision is approved.

### Retry and hard ceiling

- Retry only a transport/server/rate-limit failure that produced no model answer, at most once per provider across the whole matrix.
- Retry uses the identical prompt hash, context hash, model, condition, flags, and caps. The original attempt and error remain recorded.
- Do not retry malformed JSON, refusal, truncation, hallucination, poor code, failed type-check, failed runtime, or any other model-quality outcome.
- Maximum extra retry exposure: OpenAI $0.119 + Anthropic $0.100 + Google $0.084 = $0.303, rounded to **$0.31**.
- Hard maximum proposal: **69 scored calls + at most 3 non-answer transient retries; $7.28 USD API-list-price ceiling**. Any change returns to consent.

After consent, Claude requires the user to run `claude auth login` in a separate terminal. Gemini requires the user to run `gemini`, complete `/auth`, and exit. The audit then repeats safe status/version checks where available and runs one approved pilot per provider. A pilot counts toward 69 only if all frozen fields match. No account/model inference readiness is claimed before then.

## Review fan-out proposal

Capability tiers are provider-relative and mapped immediately before dispatch; no reviewer assignment is locked to a model name:

- Tier 1: strongest available reasoning for holistic Product/JTBD and architecture judgments, plus conditional debates.
- Tier 2: capable mid-tier model for bounded research/review scopes.
- Tier 3: lowest reliable model for mechanical previous-finding verification against explicit evidence.

The root session performs orientation, consent, wave coordination, fact verification, synthesis, and report writing. Base fan-out is 9 agents; conditional maximum is 12. Waves contain at most 3 agents. The two research collectors remain independent of code-review conclusions, and the seven reviewers remain independent of synthesized research themes until Task 7.

### Measured scopes and budget

Measurements use sorted `rg --files` filters, `wc -l`, `wc -c`, and `ceil(UTF-8 bytes / 4)` as a reproducible raw-token proxy. The scope is a maximum evidence boundary, not an instruction to ingest every byte: each agent starts with QMD/index files, follows only evidence-bearing paths, and records the files actually read. Agent-usage estimates include consumed context and output, not the entire maximum scope.

| Agent/lens | Tier | Filtered files | LOC | Raw scope token proxy | Planned agent-token allocation |
| --- | --- | ---: | ---: | ---: | ---: |
| External research: application-audio friction/alternatives | 2 | 4 | 607 | 9,381 | 14k–22k |
| External research: expressive/musical/agent surface | 2 | 4 | 637 | 13,257 | 14k–22k |
| Holistic Product/JTBD | 1 | 15 | 2,741 | 26,777 | 24k–38k |
| Holistic architecture/progressive continuity | 1 | 31 | 9,459 | 80,379 | 24k–38k, selective reads required |
| Bounded lifecycle/activation | 2 | 12 | 4,320 | 34,956 | 12k–20k |
| Bounded resources/playback | 2 | 11 | 4,064 | 30,782 | 12k–20k |
| Bounded framework ownership | 2 | 15 | 1,455 | 12,018 | 12k–20k |
| Bounded agent/public surface | 2 | 15 | 3,442 | 28,777 | 12k–20k |
| Previous-finding verifier | 3 | 4 | 1,364 | 22,311 | 10k–16k |

The allocations total 134k–216k before root coordination/verification overhead; reserve brings the proposal to **140k–240k aggregate agent tokens before conditional debates**. Any debate wave gets a fresh scope/count/price estimate and remains within the separately approved conditional maximum of three Tier 1 agents.

Scope filters are frozen by responsibility, not by desired conclusion: research collectors consume the approved design, source/evidence contracts, and responsibility/comparative maps; Product/JTBD consumes manifests/READMEs and selected guides/examples; architecture consumes the public index plus lifecycle/playback/effect/analyzer/transport and adapter ownership files; bounded reviewers receive only their named subsystem; the verifier receives `review-index.json` and the three indexed review files.

Checkpoint cadence is also frozen: Task 3 reports its cited corpus only after the floor and two-batch saturation rule pass; Task 4 persists all independent lenses and previous-finding verification before any cross-stream synthesis; Tasks 5 and 6 persist fixture/run artifacts before interpretation; Task 7 is the first cross-stream synthesis checkpoint; Task 8 is the mandatory live user findings checkpoint and final stop. Expected artifacts are the evidence JSON corpus, bounded lens reports, verifier records, disposable journey fixtures/logs, 69 reproducible run directories and score records, then the draft/final report and deduplicated documentation ledger.

## Stage-by-stage orchestrator handoff

| Remaining task/stage | Lowest reliable orchestrator | Why the handoff is safe | Mandatory frontier return gate |
| --- | --- | --- | --- |
| Task 3 — external friction/competitive corpus | Mid-tier | Frozen source/evidence schema, ID ranges, confidence labels, saturation rule, and independent collector scopes | Any proposed change to source floor/saturation/confidence rules; otherwise remain mid-tier through validated corpus handoff |
| Task 4 — independent holistic review | Mid-tier | Frozen API map, lens scopes, reviewer tiers, review index, evidence schema, and concurrency waves | Any Critical/High conflict, plan-changing interpretation, or conditional debate request returns immediately to frontier |
| Task 5 — human/comparative journeys | Mid-tier | Frozen north-star stages, responsibility map, fixture evidence rules, and release metrics constrain implementation/measurement | Any fixture result requiring a product-contract ruling or change to a preregistered assertion returns to frontier |
| Task 6 — isolated LLM evaluation | Mid-tier | Exact prompt hashes, model/condition matrix, caps, schemas, retry policy, and metric numerators/denominators make execution mechanical | Model unavailability/fallback, auth/billing change, cap/protocol change, or scorer ambiguity affecting a Critical/High conclusion returns to frontier |
| Task 7 — triangulation and draft report | Frontier | Cross-stream causal synthesis, confidence rulings, Critical/High adjudication, and roadmap decisions are judgment-heavy | Frontier remains in control through verified draft and documentation-ledger synthesis |
| Task 8 — live checkpoint/finalization | Frontier | User decisions, reclassification, refusal preservation, and final product gates can change conclusions | Frontier remains through final durable report and explicit stop; no automatic transition into fixes |

Default recommendation: approve the 9-agent downgraded mix and mid-tier orchestration for bounded Tasks 3–6, with frontier resuming at the listed early gates and unconditionally for Tasks 7–8.

## Combined consent checkpoint

Approve or decline separately:

1. **Research/review fan-out:** 9 base agents (2 Tier 2 research, 2 Tier 1 holistic, 4 Tier 2 bounded, 1 Tier 3 verifier), at most 3 concurrent; 140k–240k aggregate agent tokens; up to 3 additional Tier 1 debate agents only after a Critical/High tension and a refreshed estimate.
2. **Cross-family trials:** 69 calls using `gpt-5.3-codex`, `claude-sonnet-5`, and `gemini-3.5-flash`; 20k input/6k output cap per call; $6.97 matrix ceiling plus $0.31 transient retry allowance, $7.28 hard ceiling; subscription usage preferred but unverified providers remain blocked pending login/pilot.

Also approve or revise the orchestrator recommendation: mid-tier for bounded Tasks 3–6; frontier for every exceptional gate and all of Tasks 7–8.

Consent remains `pending`. If model calls are declined, preserve that refusal and do not claim cross-family LLM readiness. If fan-out is declined, preserve that refusal and do not claim the required deep review. Do not dispatch or call until the exact decision is recorded in the workspace README and all affected artifacts revalidate.

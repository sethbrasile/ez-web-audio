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
| `LLM-08-musical-graduation.md` | `0884baef4cdfdbc59c8d8fe8f58e3f4cfb1b4dfb58e6cd69371b09a9fc9540ea` |
| `LLM-09-repair-lifecycle.md` | `4c73694a5aae1beb65f4880fac6004667d270d0cc361e5487fa73ee53e187ab3` |
| `LLM-10-library-selection.md` | `05bb6b085375836952a04c19fff238ce7098bc08de1056f14d2cf98d8ac3065b` |
<!-- PROMPT_HASHES_END -->

Any prompt edit creates a new protocol revision and new run namespace. Results from different prompt hashes must never be mixed into one aggregate score. A pilot counts toward the matrix only when prompt hash, exact model, condition packet, and 20k/6k token caps are unchanged.

## Preregistered metrics

### Global scoring rules

1. Automated build/runtime scorers retain their raw commands, versions, stdout/stderr, browser traces, and assertions. Judgment metrics are independently scored by two blinded scorers who do not see provider/model identity, condition-path identifiers, or each other's label; unresolved disagreement goes to the frontier primary session at Task 7.
2. A planned eligible run is never removed because it is malformed, refused, truncated, low quality, or otherwise inconvenient. Such a run is classified separately and scores as a failure for every eligible run-level metric. For symbol accuracy, an eligible malformed/refused run with no scorable symbol adds one zero-numerator failure unit to prevent an empty response from improving the ratio.
3. `not-applicable` is allowed only for the scenario exclusions stated below, never for failed output. Every N/A record names the rule and is reviewed during synthesis.
4. First pass means the raw generated files before any scorer or human edit. One-attempt repair means one subsequent provider response after supplying the actual first compiler/runtime error; no hidden prompt coaching or manual patch is allowed.
5. Browser/runtime tests use the same pinned fixture, browser set, audio stubs/assets, and assertions across provider families. Model/provider errors and product/API-caused failures are classified separately, but both remain in release-signal denominators where the run was eligible.

### Blinded judgment assignment and procedure

Blinded scoring reuses six already-counted review agents in later turns; it does not add unique agents above the 9-agent base. The assignments are frozen as follows:

| Judgment | Independent scorer A | Independent scorer B |
| --- | --- | --- |
| Public-symbol dynamic/property ambiguity | Bounded resources/playback reviewer | Bounded agent/public-surface reviewer |
| One-attempt-repair lifecycle observations | Bounded lifecycle/activation reviewer | Bounded framework-ownership reviewer |
| Intent-bound activation | Bounded lifecycle/activation reviewer | Bounded framework-ownership reviewer |
| Activation/runtime correctness | Bounded lifecycle/activation reviewer | Bounded framework-ownership reviewer |
| Cleanup correctness | Bounded framework-ownership reviewer | Bounded lifecycle/activation reviewer |
| Architectural continuity | Holistic architecture/progressive-continuity reviewer | Holistic Product/JTBD reviewer |
| Fit classification | Holistic Product/JTBD reviewer | Holistic architecture/progressive-continuity reviewer |

Task 6's mid-tier orchestrator creates opaque scoring packets only after the raw run, deterministic logs, and Task 4 independent review artifacts are immutable. Each packet uses a stable random packet ID and removes provider name, model name, CLI, family directory, condition-path label, timestamps that reveal execution order, and provider-specific headers or metadata. Generated code/prose and deterministic evidence remain verbatim because they are the object being scored. The packet-to-run mapping is stored separately from both scorers. Each scorer receives only their packet, frozen rubric, and applicable deterministic evidence—not the mapping table, the other score, or any cross-stream synthesis. Score files are persisted independently before the mapping is revealed.

Scorers do not negotiate or overwrite disagreement. Task 7's frontier primary session resolves it from the two immutable score records, frozen rubric, and underlying evidence, preserving both original labels and recording the adjudication rationale. If answer content itself identifies a provider/model, the scorer marks `blind_compromised`; the run is re-packeted when the identifier can be removed without altering substantive evidence, otherwise the compromise remains explicit and deterministic evidence is preferred. No compromised blind is silently treated as intact.

| Dimension | Release signal | Numerator | Denominator | Scorer | Evidence file | `not-applicable` |
| --- | --- | --- | --- | --- | --- | --- |
| Public-symbol accuracy | At least 95% of referenced EZ symbols exist in the tested package | Referenced EZ imports/members/signatures that resolve against the exact tested public declarations | Every distinct referenced EZ symbol in LLM-01–09 implementation output, plus one failure unit for each eligible malformed/refused output with no symbols | Declaration/import checker; blinded resources/playback + agent/public-surface reviewers adjudicate dynamic/property ambiguity | Per-run `scores/public-symbols.json`, declaration snapshot, type-check log | LLM-10 selection output; prose that makes no claim of an EZ identifier |
| First-pass type-check | At least 80% of docs-seeded implementation runs pass | Eligible runs whose untouched generated files pass the pinned type-check command | All docs-seeded LLM-01–08 runs, including repetitions and malformed/refused outputs | Deterministic TypeScript/build harness | Per-run `logs/typecheck-first-pass.txt` and `scores/typecheck.json` | LLM-09 repair task; LLM-10 selection; package-aware condition |
| One-attempt repair | At least 95% of ordinary type/lifecycle failures pass after one real error response | LLM-09 implementations that type-check and pass the activation/recovery/cleanup fixture after their single response to the supplied real browser error and lifecycle observation | All nine docs-seeded LLM-09 runs; malformed/refused output remains a failure | Deterministic compiler/browser rerun plus blinded lifecycle/activation + framework-ownership reviewers | Per-run supplied error, raw response, `logs/typecheck-repair.txt`, runtime log, `scores/repair.json` | None for an LLM-09 run; other tasks are outside the frozen one-attempt repair sample |
| Intent-bound activation | Zero docs-seeded critical runs add a generic init gate without scenario-specific justification | Docs-seeded critical runs with no unjustified infrastructure gate | All docs-seeded LLM-01, LLM-03, LLM-05, LLM-06, and LLM-09 runs, including repetitions and malformed/refused output | Static activation-site extraction plus blinded lifecycle/activation + framework-ownership reviewers | Per-run `scores/activation-intent.json`, generated UI/code, activation-site assertion | None for an eligible critical run; a genuinely explicit immersive/permission/host-owned workflow must be in the prompt to justify a gate |
| Activation/runtime correctness | At least 90% of critical runs pass browser/runtime assertions | Critical runs passing first meaningful interaction, synchronous activation boundary, preserved action after async load, suspension recovery, and no forbidden deferral assertions applicable to that task | Every critical docs-seeded run plus package-aware LLM-01, LLM-05, and LLM-06 runs; malformed/refused runs fail | Pinned Playwright fixture plus blinded lifecycle/activation + framework-ownership reviewers | Per-run `logs/runtime.json`, trace, screenshots where useful, `scores/activation-runtime.json` | Only an assertion genuinely outside that prompt's scenario; the run itself remains in the denominator and must pass all applicable assertions |
| Cleanup correctness | At least 90% of React/Vue critical runs leave no route-owned active playback, listeners, or timers | Framework implementation units passing post-unmount/navigation resource assertions | React and Vue units from every LLM-06 run (24 framework units in the base matrix); malformed/refused run contributes two failures | Pinned navigation fixture with node/listener/timer probes plus blinded framework-ownership + lifecycle/activation reviewers | Per-run `logs/cleanup-react.json`, `logs/cleanup-vue.json`, `scores/cleanup.json` | No N/A for LLM-06; one framework unit can be N/A only if the harness itself is proven unavailable before any provider output and the entire affected matrix is rerun later |
| Architectural continuity | At least 80% of graduation runs retain the original session/resource/playback ownership model | LLM-07/08 runs that add the requested capability without replacing or duplicating the supplied foundation/ownership model | All docs-seeded LLM-07 and LLM-08 runs; malformed/refused output fails | Structural diff rules plus blinded architecture/progressive-continuity + Product/JTBD reviewers | Per-run baseline/generated trees and `scores/continuity.json` | None for eligible graduation runs |
| Fit classification | At least 80% correct selection across appropriate and inappropriate project cases when EZ context is supplied | LLM-10 case decisions matching the preregistered job/scope rubric and giving materially correct tradeoff reasons | All 18 case decisions in the three unseeded LLM-10 runs; EZ is explicitly supplied as one of four candidates, while no EZ documentation or package context is supplied | Blinded Product/JTBD + architecture/progressive-continuity reviewers against the frozen answer key below | Per-run `scores/fit.json`, raw answer, and this protocol revision | A case cannot be N/A; malformed/refused response makes all six cases failures |

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
| Anthropic | Claude Code `2.1.233` | `claude auth status` → `loggedIn: false`, `authMethod: none` | `claude-sonnet-5` | Standard price: $2.00 / $10.00; Anthropic says the previously scheduled 2026-09-01 increase will not occur | $2.300 | Not ready. Subscription-vs-API billing cannot be known until the user logs in; no inference may run meanwhile |
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

The consent proposal locks the currently available collaboration models and reasoning effort by role:

| Capability tier / role | Exact model | Reasoning effort | Rationale |
| --- | --- | --- | --- |
| Tier 1 holistic Product/JTBD | `gpt-5.6-sol` | `high` | Frontier judgment is warranted for product-fit and jobs-to-be-done synthesis without exposing this reviewer to the external-research synthesis. |
| Tier 1 holistic architecture/progressive continuity | `gpt-5.6-sol` | `high` | Frontier judgment is warranted for cross-subsystem ownership and continuity analysis over the largest selective scope. |
| Tier 1 conditional Critical/High debate | `gpt-5.6-sol` | `xhigh` | Debate exists only for a material tension whose ruling may change the plan or release conclusion. |
| Tier 2 external-research collector | `gpt-5.6-terra` | `medium` | Evidence collection is bounded by source/evidence schemas and remains independent from code-review conclusions. |
| Tier 2 bounded reviewer | `gpt-5.6-terra` | `high` | Subsystem review and later blinded scoring need careful judgment within a frozen, narrow scope. |
| Tier 3 previous-finding verifier | `gpt-5.6-luna` | `medium` | Verification is mechanical against explicit historical claims and current evidence, with no synthesis authority. |
| Deterministic helper, if needed | `gpt-5.6-luna` | `low` | Only validation/bookkeeping that cannot make prose judgments; such a helper is not part of the proposed 9-agent fan-out. |

No model substitution or reasoning-effort downgrade is permitted silently. Model unavailability, a changed model menu, or a role reassignment returns to consent. This reviewer-model proposal is distinct from the three external provider models used by the 69-call implementation evaluation.

The root session performs orientation, consent, wave coordination, fact verification, synthesis, and report writing. Base fan-out is 9 agents; conditional maximum is 12. Waves contain at most 3 agents. The two research collectors remain independent of code-review conclusions, and the seven reviewers remain independent of synthesized research themes until Task 7.

### Measured scopes and budget

Measurements use sorted `rg --files` filters, `wc -l`, `wc -c`, and `ceil(UTF-8 bytes / 4)` as a reproducible raw-token proxy. The scope is a maximum evidence boundary, not an instruction to ingest every byte: each agent starts with QMD/index files, follows only evidence-bearing paths, and records the files actually read. Agent-usage estimates include consumed context and output, not the entire maximum scope.

| Agent/lens | Tier | Filtered files | LOC | Raw scope token proxy | Planned agent-token allocation |
| --- | --- | ---: | ---: | ---: | ---: |
| External research: application-audio friction/alternatives | 2 | 4 | 607 | 9,381 | 12k–18k |
| External research: expressive/musical/agent surface | 2 | 4 | 637 | 13,257 | 12k–18k |
| Holistic Product/JTBD review turn | 1 | 15 | 2,741 | 26,777 | 18k–28k |
| Holistic architecture/progressive-continuity review turn | 1 | 31 | 9,459 | 80,379 | 18k–28k, selective reads required |
| Bounded lifecycle/activation review turn | 2 | 12 | 4,320 | 34,956 | 9k–15k |
| Bounded resources/playback review turn | 2 | 11 | 4,064 | 30,782 | 9k–15k |
| Bounded framework-ownership review turn | 2 | 15 | 1,455 | 12,018 | 9k–15k |
| Bounded agent/public-surface review turn | 2 | 15 | 3,442 | 28,777 | 9k–15k |
| Previous-finding verifier | 3 | 4 | 1,364 | 22,311 | 8k–12k |
| Product/JTBD later blinded-scoring turn | 1 | Opaque run packets | packet-capped | packet-capped | 6k–10k |
| Architecture later blinded-scoring turn | 1 | Opaque run packets | packet-capped | packet-capped | 6k–10k |
| Lifecycle later blinded-scoring turn | 2 | Opaque run packets | packet-capped | packet-capped | 5k–8k |
| Framework later blinded-scoring turn | 2 | Opaque run packets | packet-capped | packet-capped | 5k–8k |
| Resources later blinded-scoring turn | 2 | Opaque run packets | packet-capped | packet-capped | 4k–7k |
| Agent/public-surface later blinded-scoring turn | 2 | Opaque run packets | packet-capped | packet-capped | 4k–7k |

The two research turns total 24k–36k; two holistic review turns 36k–56k; four bounded review turns 36k–60k; verifier 8k–12k; and six reused-agent blinded-scoring turns 30k–50k. That is **134k–214k agent-turn tokens**, with root validation/coordination reserve bringing the consent proposal to **140k–240k aggregate agent tokens before conditional debates**. The six scoring turns do not change the 9 unique-agent base or 12 unique-agent conditional ceiling. Any debate wave gets a fresh scope/count/price estimate and remains within the separately approved conditional maximum of three Tier 1 agents.

Scope filters are frozen by responsibility, not by desired conclusion: research collectors consume the approved design, source/evidence contracts, and responsibility/comparative maps; Product/JTBD consumes manifests/READMEs and selected guides/examples; architecture consumes the public index plus lifecycle/playback/effect/analyzer/transport and adapter ownership files; bounded reviewers receive only their named subsystem; the verifier receives `review-index.json` and the three indexed review files. The exact reproducible manifests are frozen in the appendix below.

### Frozen scope-manifest appendix

Run every command from the repository root at this protocol revision; product files in the lists are pinned to product-tree baseline `8c67cf119d32ba39e67b8b8d256345ac65ddeb34`, while audit-contract files are those committed with this protocol. Each `FILTER` below emits a sorted, newline-terminated, repository-relative list. Reproduce the measurements and hashes by substituting the exact filter pipeline:

```sh
FILTER | wc -l
FILTER | xargs wc -l | tail -1
FILTER | xargs wc -c | tail -1
FILTER | shasum -a 256
FILTER | while IFS= read -r f; do shasum -a 256 "$f"; done | shasum -a 256
```

The token proxy is `ceil(total UTF-8 bytes / 4)`. The first SHA-256 is the exact file-list hash; the second is the hash of the ordered per-file content-hash manifest. Empty lists are prohibited.

#### External research — application-audio friction/alternatives

```sh
rg --files .planning/specs .planning/reviews/product-api-fit | rg '(2026-08-15-product-api-fit-audit-design|source-register|comparative-journeys|evidence\.schema)' | LC_ALL=C sort -u
```

- Measurement: 4 files; 607 LOC; 37,523 bytes; 9,381-token proxy.
- List SHA-256: `b5deed417b9e0713713903189dac946b363cfcc5e965e8aae67a753bbe927caa`.
- Content-manifest SHA-256: `e4baca1e5c5a7ed4936bbd167f539786e82076fd7b044674b57e0a28a6c6ef17`.
- Files: `.planning/reviews/product-api-fit/comparative-journeys.md`, `.planning/reviews/product-api-fit/evidence.schema.json`, `.planning/reviews/product-api-fit/source-register.md`, `.planning/specs/2026-08-15-product-api-fit-audit-design.md`.

#### External research — expressive/musical/agent surface

```sh
rg --files .planning/specs .planning/reviews/product-api-fit | rg '(2026-08-15-product-api-fit-audit-design|source-register|api-responsibility-map|evidence\.schema)' | LC_ALL=C sort -u
```

- Measurement: 4 files; 637 LOC; 53,025 bytes; 13,257-token proxy.
- List SHA-256: `48895a057b9fae6c4f1c1812b38ecf37511405d580eb395fd80cd13c38a05d75`.
- Content-manifest SHA-256: `013f183d1ea93273e6187ba0ae0db5fb2202ea79cf88e5ce238bdef670575425`.
- Files: `.planning/reviews/product-api-fit/api-responsibility-map.md`, `.planning/reviews/product-api-fit/evidence.schema.json`, `.planning/reviews/product-api-fit/source-register.md`, `.planning/specs/2026-08-15-product-api-fit-audit-design.md`.

#### Holistic Product/JTBD

```sh
rg --files .planning packages docs package.json | rg '^(package\.json|packages/(core|react|vue)/(package\.json|README\.md)|docs/(index\.md|guide/(getting-started|concepts)\.md|examples/(index|basic-playback|react-integration)\.md)|\.planning/specs/2026-08-15-product-api-fit-audit-design\.md|\.planning/reviews/review-index\.json)$' | LC_ALL=C sort -u
```

- Measurement: 15 files; 2,741 LOC; 107,108 bytes; 26,777-token proxy.
- List SHA-256: `acd3efd1e588c2a00bca60381d1ca37a0b8e82db6de740e307cc290d3f824ec7`.
- Content-manifest SHA-256: `ad356e90f8721606e4ade93bcbe87d438d1567f366e8f92892e905ace3fa430c`.
- Files: `.planning/reviews/review-index.json`, `.planning/specs/2026-08-15-product-api-fit-audit-design.md`, `docs/examples/basic-playback.md`, `docs/examples/index.md`, `docs/examples/react-integration.md`, `docs/guide/concepts.md`, `docs/guide/getting-started.md`, `docs/index.md`, `package.json`, `packages/core/README.md`, `packages/core/package.json`, `packages/react/README.md`, `packages/react/package.json`, `packages/vue/README.md`, `packages/vue/package.json`.

#### Holistic architecture/progressive continuity

```sh
rg --files .planning packages docs | rg '^(packages/core/src/(index|audio-context|base-sound|sound|track|preload|analyzer|layered-sound|transport|sequence)\.ts|packages/core/src/effects/(index|base-effect|effect-wrapper)\.ts|packages/(react|vue)/src/(index|hooks|composables|create-factory-(hook|composable)|use-cleanup|use-audio-context)\.ts|docs/(guide/(getting-started|concepts|transport)|examples/(basic-playback|effects|visualization|transport-sequencer))\.md|\.planning/specs/2026-08-15-product-api-fit-audit-design\.md)$' | LC_ALL=C sort -u
```

- Measurement: 31 files; 9,459 LOC; 321,515 bytes; 80,379-token proxy.
- List SHA-256: `bb20f846ce6a29647c0bfe79f8160c613f477db706f79cb84b65bd25086e3e2f`.
- Content-manifest SHA-256: `fed5fdd9d79dabcfa9bae7eb516bf37564652d2bf293e6b9ff9858875094733a`.
- Files: `.planning/specs/2026-08-15-product-api-fit-audit-design.md`, `docs/examples/basic-playback.md`, `docs/examples/effects.md`, `docs/examples/transport-sequencer.md`, `docs/examples/visualization.md`, `docs/guide/concepts.md`, `docs/guide/getting-started.md`, `docs/guide/transport.md`, `packages/core/src/analyzer.ts`, `packages/core/src/audio-context.ts`, `packages/core/src/base-sound.ts`, `packages/core/src/effects/base-effect.ts`, `packages/core/src/effects/effect-wrapper.ts`, `packages/core/src/effects/index.ts`, `packages/core/src/index.ts`, `packages/core/src/layered-sound.ts`, `packages/core/src/preload.ts`, `packages/core/src/sequence.ts`, `packages/core/src/sound.ts`, `packages/core/src/track.ts`, `packages/core/src/transport.ts`, `packages/react/src/create-factory-hook.ts`, `packages/react/src/hooks.ts`, `packages/react/src/index.ts`, `packages/react/src/use-audio-context.ts`, `packages/react/src/use-cleanup.ts`, `packages/vue/src/composables.ts`, `packages/vue/src/create-factory-composable.ts`, `packages/vue/src/index.ts`, `packages/vue/src/use-audio-context.ts`, `packages/vue/src/use-cleanup.ts`.

#### Bounded lifecycle/activation

```sh
rg --files packages docs | rg '^(packages/core/src/(audio-context|index|base-sound)\.ts|packages/(react|vue)/src/(use-audio-context|use-cleanup|create-factory-(hook|composable))\.ts|docs/guide/(getting-started|concepts|multiple-contexts)\.md)$' | LC_ALL=C sort -u
```

- Measurement: 12 files; 4,320 LOC; 139,823 bytes; 34,956-token proxy.
- List SHA-256: `43cc39b7cc5d0ab6015f3abdc5b636376b12c87bff62c0190b0c9480129ae9e8`.
- Content-manifest SHA-256: `5e1a3eb4c3cb86722c348a6c5f83e748acb96b9851f231b83f7aa0c2b7db0498`.
- Files: `docs/guide/concepts.md`, `docs/guide/getting-started.md`, `docs/guide/multiple-contexts.md`, `packages/core/src/audio-context.ts`, `packages/core/src/base-sound.ts`, `packages/core/src/index.ts`, `packages/react/src/create-factory-hook.ts`, `packages/react/src/use-audio-context.ts`, `packages/react/src/use-cleanup.ts`, `packages/vue/src/create-factory-composable.ts`, `packages/vue/src/use-audio-context.ts`, `packages/vue/src/use-cleanup.ts`.

#### Bounded resources/playback

```sh
rg --files packages docs | rg '^(packages/core/src/(base-sound|sound|track|preload|sprite|layered-sound|utils/collections)\.ts|docs/(guide/getting-started|examples/(basic-playback|audio-sprite|layered-sound))\.md)$' | LC_ALL=C sort -u
```

- Measurement: 11 files; 4,064 LOC; 123,125 bytes; 30,782-token proxy.
- List SHA-256: `7525c9d872726975d497a45d67309d7532ff8aae80bb70c5e2583170acb21b0d`.
- Content-manifest SHA-256: `1f49971af6518fdcdf6a66bd2eb4022f0699a7937f3c1e5c82d115efbc80c628`.
- Files: `docs/examples/audio-sprite.md`, `docs/examples/basic-playback.md`, `docs/examples/layered-sound.md`, `docs/guide/getting-started.md`, `packages/core/src/base-sound.ts`, `packages/core/src/layered-sound.ts`, `packages/core/src/preload.ts`, `packages/core/src/sound.ts`, `packages/core/src/sprite.ts`, `packages/core/src/track.ts`, `packages/core/src/utils/collections.ts`.

#### Bounded framework ownership

```sh
rg --files packages docs | rg '^(packages/(react|vue)/(README\.md|src/(index|hooks|composables|create-factory-(hook|composable)|use-audio-context|use-cleanup|use-ensure-loaded)\.ts)|docs/examples/(react-integration|drum-machine-vue)\.md)$' | LC_ALL=C sort -u
```

- Measurement: 15 files; 1,455 LOC; 48,069 bytes; 12,018-token proxy.
- List SHA-256: `482880204af9039de649bfb8cb7182fde71f4517497e5165fffe0a6b84ea2331`.
- Content-manifest SHA-256: `ab2b90f8537f66cd2a42459d38b90ec32ae2cc11c34a70007003bb819af03902`.
- Files: `docs/examples/drum-machine-vue.md`, `docs/examples/react-integration.md`, `packages/react/README.md`, `packages/react/src/create-factory-hook.ts`, `packages/react/src/hooks.ts`, `packages/react/src/index.ts`, `packages/react/src/use-audio-context.ts`, `packages/react/src/use-cleanup.ts`, `packages/vue/README.md`, `packages/vue/src/composables.ts`, `packages/vue/src/create-factory-composable.ts`, `packages/vue/src/index.ts`, `packages/vue/src/use-audio-context.ts`, `packages/vue/src/use-cleanup.ts`, `packages/vue/src/use-ensure-loaded.ts`.

#### Bounded agent/public surface

```sh
rg --files packages docs package.json | rg '^(package\.json|packages/(core|react|vue)/(package\.json|README\.md|src/index\.ts)|docs/(index\.md|guide/(getting-started|concepts)\.md|examples/index\.md|\.vitepress/config\.mts)|llms.*)$' | LC_ALL=C sort -u
```

- Measurement: 15 files; 3,442 LOC; 115,106 bytes; 28,777-token proxy.
- List SHA-256: `bd1d1b7f8ab1549df1982a2997323169d764e698e2baf8b5c2b53f8814699f1d`.
- Content-manifest SHA-256: `e94402ce600077332ec846d2ea4dd2c95f55c74a9f0b967bc7f5da7c8b609878`.
- Files: `docs/.vitepress/config.mts`, `docs/examples/index.md`, `docs/guide/concepts.md`, `docs/guide/getting-started.md`, `docs/index.md`, `package.json`, `packages/core/README.md`, `packages/core/package.json`, `packages/core/src/index.ts`, `packages/react/README.md`, `packages/react/package.json`, `packages/react/src/index.ts`, `packages/vue/README.md`, `packages/vue/package.json`, `packages/vue/src/index.ts`.

#### Previous-finding verifier

```sh
rg --files .planning/reviews | rg '^(\.planning/reviews/(review-index\.json|2026-03-07-deep-review\.md|2026-03-19-deep-review-m7-demos\.md|2026-07-11-deep-review\.md))$' | LC_ALL=C sort -u
```

- Measurement: 4 files; 1,364 LOC; 89,241 bytes; 22,311-token proxy.
- List SHA-256: `87669795f692861dce41cc8398a85e2e5306d8f3bb20fc4d04696a3f99e27ff6`.
- Content-manifest SHA-256: `19fa30d4df30a65c741744731e956126746f7a2cefe4fb914cf69c933102427b`.
- Files: `.planning/reviews/2026-03-07-deep-review.md`, `.planning/reviews/2026-03-19-deep-review-m7-demos.md`, `.planning/reviews/2026-07-11-deep-review.md`, `.planning/reviews/review-index.json`.

Checkpoint cadence is also frozen: Task 3 reports its cited corpus only after the floor and two-batch saturation rule pass; Task 4 persists all independent lenses and previous-finding verification before any cross-stream synthesis; Tasks 5 and 6 persist fixture/run artifacts before interpretation; Task 7 is the first cross-stream synthesis checkpoint; Task 8 is the mandatory live user findings checkpoint and final stop. Expected artifacts are the evidence JSON corpus, bounded lens reports, verifier records, disposable journey fixtures/logs, 69 reproducible run directories and score records, then the draft/final report and deduplicated documentation ledger.

## Stage-by-stage orchestrator handoff

| Remaining task/stage | Lowest reliable orchestrator | Why the handoff is safe | Mandatory frontier return gate |
| --- | --- | --- | --- |
| Task 3 — external friction/competitive corpus | `gpt-5.6-terra`, `high` | Frozen source/evidence schema, ID ranges, confidence labels, saturation rule, and independent collector scopes | Any proposed change to source floor/saturation/confidence rules returns to `gpt-5.6-sol`, `high`; otherwise remain on Terra through validated corpus handoff |
| Task 4 — independent holistic review | `gpt-5.6-terra`, `high` | Frozen API map, lens scopes, reviewer models/effort, review index, evidence schema, and concurrency waves | Any Critical/High conflict, plan-changing interpretation, or conditional debate request returns immediately to `gpt-5.6-sol`, `high` (`xhigh` for the debate) |
| Task 5 — human/comparative journeys | `gpt-5.6-terra`, `high` | Frozen north-star stages, responsibility map, fixture evidence rules, and release metrics constrain implementation/measurement | Any fixture result requiring a product-contract ruling or change to a preregistered assertion returns to `gpt-5.6-sol`, `high` |
| Task 6 — isolated LLM evaluation | `gpt-5.6-terra`, `high` | Exact prompt hashes, model/condition matrix, caps, schemas, retry policy, packet-blinding procedure, and metric numerators/denominators make execution mechanical | Model unavailability/fallback, auth/billing change, cap/protocol change, or scorer ambiguity affecting a Critical/High conclusion returns to `gpt-5.6-sol`, `high` |
| Task 7 — triangulation and draft report | `gpt-5.6-sol`, `high` | Cross-stream causal synthesis, blind-score adjudication, confidence rulings, Critical/High adjudication, and roadmap decisions are judgment-heavy | Sol remains in control through verified draft and documentation-ledger synthesis; a Critical/High debate uses `xhigh` |
| Task 8 — live checkpoint/finalization | `gpt-5.6-sol`, `high` | User decisions, reclassification, refusal preservation, and final product gates can change conclusions | Sol remains through final durable report and explicit stop; no automatic transition into fixes |

Default recommendation: approve the 9-agent exact-model downgraded mix and `gpt-5.6-terra`/`high` orchestration for bounded Tasks 3–6, with `gpt-5.6-sol`/`high` resuming at the listed early gates and unconditionally for Tasks 7–8.

## Combined consent checkpoint

Approve or decline separately:

1. **Research/review fan-out:** 9 base agents—2 `gpt-5.6-terra`/`medium` research collectors, 2 `gpt-5.6-sol`/`high` holistic reviewers, 4 `gpt-5.6-terra`/`high` bounded reviewers, and 1 `gpt-5.6-luna`/`medium` verifier—at most 3 concurrent; 140k–240k aggregate agent tokens including later blinded-scoring turns by six reused reviewers; up to 3 additional `gpt-5.6-sol`/`xhigh` debate agents only after a Critical/High tension and a refreshed estimate.
2. **Cross-family trials:** 69 calls using `gpt-5.3-codex`, `claude-sonnet-5`, and `gemini-3.5-flash`; 20k input/6k output cap per call; $6.97 matrix ceiling plus $0.31 transient retry allowance, $7.28 hard ceiling; subscription usage preferred but unverified providers remain blocked pending login/pilot.

Also approve or revise the orchestrator recommendation: `gpt-5.6-terra`/`high` for bounded Tasks 3–6; `gpt-5.6-sol`/`high` for every exceptional gate and all of Tasks 7–8, with `xhigh` limited to Critical/High debate.

Consent remains `pending`. If model calls are declined, preserve that refusal and do not claim cross-family LLM readiness. If fan-out is declined, preserve that refusal and do not claim the required deep review. Do not dispatch or call until the exact decision is recorded in the workspace README and all affected artifacts revalidate.

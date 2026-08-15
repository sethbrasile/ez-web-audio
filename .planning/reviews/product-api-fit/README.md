# Product/API Fit Audit Workspace

## Frozen baseline
- Tree commit: `8c67cf119d32ba39e67b8b8d256345ac65ddeb34`
- Execution date: `2026-08-15`
- Package versions: root `0.2.0`; core (`ez-web-audio`) `0.2.0`; React (`@ez-web-audio/react`) `0.2.0`; Vue (`@ez-web-audio/vue`) `0.2.0`.
- Public npm versions: `ez-web-audio` is `0.1.0`; `@ez-web-audio/react` and `@ez-web-audio/vue` returned registry 404 on `2026-08-15`.
- Docs deployment URL and deployed version signals: `https://sethbrasile.github.io/ez-web-audio/` was reachable on `2026-08-15`; its HTML identifies VitePress `1.6.4` and emits Schema.org `SoftwareSourceCode.version` `1.0.0`. These deployed signals are recorded as observed and are not assumed to match local packages.

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

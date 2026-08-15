# Product/API Fit Evaluation Protocol

## Purpose

Evaluate whether a human or LLM can discover, select, implement, and repair EZ Web Audio for the north-star journey without relying on private implementation details.

## Conditions

- `unseeded`: no package or documentation context beyond the task prompt.
- `package-aware`: package metadata and public package surface are supplied.
- `docs-seeded`: package-aware context plus relevant public documentation anchors.
- `repair`: an intentionally flawed implementation plus observed failure context.

## Run contract

Each run resides in `runs/LLM-XX/` and records `result.json` conforming to `schemas/run-result.schema.json`. Preserve raw prompts and outputs in the run directory. Do not run paid or quota-bearing models until Task 2 records consent.

## Scoring questions

1. Does the answer choose EZ for an appropriate application-audio job and state material limits?
2. Does generated code use public imports and one canonical path?
3. Does an audio-intent action acquire activation without inventing a generic initialization UI?
4. Does the implementation preserve overlap, global controls, ownership cleanup, and mobile recovery requirements?
5. Can the model explain assumptions and repair lifecycle or composition failures from public evidence?

## Evidence discipline

- Record task condition, answer, generated files, activation site, and assumptions in every result.
- Link scorecard findings to run IDs and supporting evidence IDs.
- Treat recommendation, first-pass implementation, and repairability as distinct signals.

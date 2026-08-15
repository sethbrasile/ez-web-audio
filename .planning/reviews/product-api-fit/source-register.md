# Source Register

This register makes the audit's input boundary inspectable. Add source records before relying on them in synthesis; evidence records remain one JSON file per observation.

| ID | Source | Type | Scope | Baseline status |
| --- | --- | --- | --- | --- |
| SRC-001 | Approved product/API fit design | first-party design | Product contract and audit methods | frozen |
| SRC-002 | `.planning/reviews/review-index.json` | first-party review index | Prior review findings and structural patterns | frozen |
| SRC-003 | Package manifests | first-party metadata | Local root/core/React/Vue version and public API metadata | frozen |
| SRC-004 | npm registry | public registry | Published package availability and versions | verified 2026-08-15 |
| SRC-005 | Deployed GitHub Pages documentation | deployed public artifact | Deployment URL and emitted version signals | verified 2026-08-15 |

## Collection rules

- Cite primary sources where possible and identify issue-tracker bias explicitly.
- Store each observation in `evidence/` using the evidence schema and assigned collector range.
- Do not renumber committed evidence. Record duplicates in later synthesis instead.

# Project State: EZ Audio

**Last Updated:** 2026-02-16
**Current Focus:** Milestone v1.0 — First Stable Release

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Make the Web Audio API easy to use
**Current focus:** Defining requirements for v1.0

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-16 — Milestone v1.0 started

**Progress:** [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions Made

See .planning/PROJECT.md Key Decisions table for full history.

### Known Blockers

None active.

### Open Items for This Milestone

- ControlType union should be extensible via mapped type
- SampledNote.name shadowed by BaseSound.name — architectural decision needed
- Rename `.from()` → `.as()` across fluent APIs (breaking, free pre-1.0)
- Remove deprecated `connections` API entirely (no backwards compat needed pre-1.0)
- Remove deprecated type aliases (OscillatorOpts, OscillatorOptsFilterValues)

### Deferred to v2

- Single global AudioContext blocks spatial audio — needs opt-in multi-context mode
- Framework bindings (React/Vue) — external packages only

### Test Coverage Summary

**913 unit tests across 36 test files**
**20 E2E tests via Playwright**

---

*STATE.md updated: 2026-02-16*

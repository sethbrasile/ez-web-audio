# Phase 45: Architecture Improvements - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Internal architecture improvements from code review findings M5, M6, M8, L4, L7, L8. Refactor event systems, fix silent behavior overrides, extract cleanup methods, add dispose patterns, annotate internal state, and simplify scheduling. No new public API surface — these are internal quality improvements.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions. Claude has full flexibility on:

- **M5 (BeatTrack events):** Whether to refactor to TypedEventEmitter via composition/mixin, or document the dual event system. Consider breaking change implications — if refactoring changes event handler signatures, weigh cost vs benefit for pre-1.0 release.
- **M6 (Sampler gain/pan):** Whether to document the override behavior as intended, or fix with a separate GainNode post-sampler. Consider if per-sound customization is a realistic use case.
- **M8 (Track onended/stop):** Extract cleanup into private `_resetPosition()` method for clarity. Straightforward refactor.
- **L4 (AudioSprite dispose):** Add `dispose()` method to AudioSprite for buffer resource release. Follow existing dispose pattern from BaseSound.
- **L7 (_unmuteDispose annotation):** Add `@internal` JSDoc to module-level mutable state in `src/index.ts`.
- **L8 (stopAt double-scheduling):** Simplify to use `node.stop(time)` directly instead of double-scheduling with timeout.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing patterns in the codebase for consistency.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 45-architecture-improvements*
*Context gathered: 2026-02-24*

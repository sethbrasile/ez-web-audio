# Phase 49: Export Cleanup - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up the public API surface: remove the internal `_disposeUnmute` test helper from public exports, and replace plain `Error` throws with domain-specific error classes (`AudioLoadError`, `InvalidNoteError`) in font loading and oscillator note validation paths.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Error class design: whether to extend a shared `EzAudioError` base class, what properties to include (e.g., attempted note name on `InvalidNoteError`, URL on `AudioLoadError`)
- Internal export strategy: how to remove `_disposeUnmute` from the public barrel export while keeping it accessible for tests
- Error message content and formatting
- Error class file organization (single errors file vs per-class files)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 49-export-cleanup*
*Context gathered: 2026-02-27*

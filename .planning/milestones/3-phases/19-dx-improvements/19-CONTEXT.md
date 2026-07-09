# Phase 19: DX Improvements - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add convenience methods and reduce boilerplate for common audio tasks. Covers effect bypass auto-rewire, context-free effect factories, batch operations (addEffects, playTogether, createSounds), read-only accessors (getFilters, getSounds), extensible ControlType, and guide documentation updates. No new audio capabilities — this is API ergonomics only.

Requirements: DX-01 through DX-08, DOC-03, DEF-05

</domain>

<decisions>
## Implementation Decisions

### Effect bypass auto-rewire (DX-01)
- True bypass via physical disconnect-and-rewire (not dry pass-through)
- Must be mid-playback safe — rewire happens live without audible glitches
- Full chain compaction: any combination of bypassed effects works, chain always routes through only active (non-bypassed) effect nodes
- Trigger mechanism (property setter vs method call): Claude's discretion based on existing codebase patterns

### Effect factory context handling (DX-02)
- Factories should work without requiring an AudioContext argument
- How context is obtained (deferred until attached to sound, or pulled from module-level init): Claude's discretion based on existing AudioContext flow
- Whether to keep optional AudioContext param for explicit control: Claude's discretion
- Error behavior when called before initAudio(): Claude's discretion based on existing error patterns
- Add a generic `createEffect(node)` factory in addition to createFilterEffect and createGainEffect, for wrapping arbitrary AudioNodes

### ControlType extensibility (DX-08)
- End-users (not just library contributors) should be able to extend ControlType with custom audio parameters
- Extension mechanism (module augmentation vs generics vs union merging): Claude's discretion based on TypeScript best practices
- Whether extended params get full runtime support through fluent chains: Claude's discretion based on controller architecture
- Add a section to the Core Concepts guide showing how to extend ControlType with examples

### Claude's Discretion
- Batch loader (DX-05) API design: progress event shape, partial failure handling, return type
- addEffects (DX-03) and playTogether (DX-04) implementation details
- getFilters (DX-06) and getSounds (DX-07) return types and implementation
- unlockAudioContext documentation (DEF-05)
- Guide page update scope and structure (DOC-03)

</decisions>

<specifics>
## Specific Ideas

- Generic createEffect(node) factory was specifically requested — wraps any Web Audio AudioNode into the library's effect adapter pattern
- ControlType guide section should show end-user extension with concrete examples (not just JSDoc)
- Effect bypass must handle complex chains where multiple non-adjacent effects are bypassed simultaneously

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-dx-improvements*
*Context gathered: 2026-02-17*

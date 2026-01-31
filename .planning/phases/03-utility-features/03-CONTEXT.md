# Phase 3: Utility Features - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Efficiently manage audio loading, playback collections, and sprite-based assets. This phase delivers:
1. Audio sprites - Play individual sounds from a single audio file using JSON metadata
2. Collection utilities - stopAll/pauseAll/playAll for arrays of Playables
3. Preloading - Cache audio before creating Sound instances

</domain>

<decisions>
## Implementation Decisions

### Collection API Design
- Standalone functions (`stopAll(sounds)`, `pauseAll(tracks)`, `playAll(sounds)`) — tree-shakeable, explicit imports
- Automatically flatten nested arrays — recursively flatten before acting
- Return `Promise<void>` — resolves when all operations complete
- Best-effort error handling — act on all items, collect errors, reject if any failed

### Claude's Discretion
- Sprite playback API design (how sprites reference sounds, concurrent playback handling)
- Preload cache implementation (lifetime, revalidation strategy)
- Error handling patterns (missing sprites, failed loads, invalid metadata)
- Function naming beyond core stopAll/pauseAll/playAll

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for sprite and preload APIs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-utility-features*
*Context gathered: 2026-01-31*

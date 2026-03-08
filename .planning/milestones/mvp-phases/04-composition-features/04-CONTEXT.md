# Phase 4: Composition Features - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Create complex musical compositions with layered sounds, synchronized drum patterns, and smooth track transitions. This includes LayeredSound for simultaneous playback, BeatTrack timing improvements, and crossfade utilities. Effects, visualization, and other features belong in later phases.

</domain>

<decisions>
## Implementation Decisions

### LayeredSound behavior
- All layers start at exactly the same audioContext.currentTime (exact sync, no per-layer offsets)
- Layers end independently — each emits its own 'end' event, LayeredSound ends when last layer finishes
- Individual layers are accessible for runtime control (gain/pan) while playing — useful for mixing
- If a layer fails to load, play available layers anyway and emit warning event (graceful degradation)

### BeatTrack timing
- Stop cuts immediately — no waiting for current beat to finish
- Tempo changes supported during playback — setTempo() takes effect on next beat
- Pause preserves beat position — resume() continues from paused beat (consistent with Track)

### Crossfade mechanics
- Standalone function: `crossfade(trackA, trackB, duration)` — tree-shakeable, doesn't pollute Track
- Source track auto-stops and cleans up after fade completes (fire and forget)
- If destination already playing, fade its volume up from current position (don't restart)
- Equal-power curve only — it's the correct choice, no need to expose complexity

### Voice management
- Soft limit on layers (warn at 8+) but allow any count — helps catch mistakes
- Layers are static — fixed at construction, no add/remove during playback
- Auto-cleanup via onended — consistent with Sound and AudioSprite patterns
- LayeredSound is reusable (like Sound) — play() creates fresh source nodes each time

### Claude's Discretion
- Beat event emission timing (lookahead vs at-play-time) — choose based on Web Audio best practices
- Exact warning threshold for layer count
- Internal voice pooling strategy

</decisions>

<specifics>
## Specific Ideas

- LayeredSound should feel like a "group" — one play() controls all, but individual layers remain adjustable
- BeatTrack should be usable for live performance (tempo changes mid-playback)
- Crossfade should be simple: `crossfade(from, to, 2)` for a 2-second transition

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-composition-features*
*Context gathered: 2026-01-31*

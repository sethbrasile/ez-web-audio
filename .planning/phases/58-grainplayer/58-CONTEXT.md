# Phase 58: GrainPlayer - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a GrainPlayer class that generates continuous texture/pad sounds from an audio buffer by scheduling many overlapping short "grains" of audio. Provides independent control over pitch (via playbackRate per grain), position (which part of the buffer to sample from), and grain parameters (size, overlap, window shape). Does not require external libraries.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User has no prior experience with granular synthesis and trusts Claude to design the full API based on:
1. Granular synthesis fundamentals and best practices
2. The project's existing patterns (BaseSound, factory functions, controller pattern)
3. Web Audio API capabilities for grain-level scheduling

**All design areas below are Claude's discretion — research and planning should follow these guidelines as informed defaults, adjusting if implementation reveals better approaches.**

### Grain Parameters
- Expose `grainSize` (seconds, default ~0.1), `overlap` (seconds or ratio, default ~0.5 of grainSize), and `windowShape` (Hann window default — standard for granular to avoid clicks)
- Optional `randomization`/`jitter` parameter for position scatter — adds organic texture
- Keep the API simple: sensible defaults that produce usable texture immediately, with advanced params available for fine-tuning
- Window function applied via gain envelope per grain (ramp up → sustain → ramp down) using Web Audio's `linearRampToValueAtTime`

### Position Scrubbing
- `position` property (0–1 normalized, representing position in buffer) — settable while playing
- Default behavior: sequential scanning through buffer at natural speed
- When position is set manually, grains sample from that region (with optional jitter spread around the position)
- At buffer boundaries: loop back to start (default), or clamp — controlled by a `loop` boolean (default true)
- Position changes audible within one grain cycle (not one lookahead window — grains are short enough)

### Pitch Shifting
- `pitch` property in semitones (integer or float, default 0)
- Internally converts to `playbackRate` on each grain's BufferSourceNode (`2^(semitones/12)`)
- Separate `playbackRate` property also available for direct ratio control
- Documentation must prominently note: this is playbackRate-based pitch shift — it changes grain duration, which the overlap system compensates for, but extreme values will affect texture quality
- Reasonable range: -24 to +24 semitones (2 octaves each direction)

### Playback Lifecycle
- **Does NOT extend BaseSound** — GrainPlayer manages many transient BufferSourceNodes, unlike BaseSound's single-source model
- Instead, follows the PolySynth pattern: standalone class with its own gain/pan/effects chain, TypedEventEmitter for events
- `play()` starts the grain scheduling loop, `stop()` stops it with a short fade-out
- `pause()` / `resume()` supported — pauses the grain scheduler
- Real-time parameter changes (grainSize, overlap, position, pitch) take effect on next grain spawn
- Factory function: `createGrainPlayer(buffer: AudioBuffer, options?: GrainPlayerOptions)`
- Integrates with effects chain via `connections` array (same pattern as BaseSound)
- Grain scheduling uses `setTimeout` loop (not requestAnimationFrame) with lookahead buffering — schedule grains slightly ahead of real time for glitch-free playback

### Audio Routing Per Grain
- Each grain: `BufferSourceNode` → per-grain `GainNode` (for window envelope) → shared `GainNode` (master volume) → `PannerNode` → effects chain → destination
- Grain BufferSourceNodes are created fresh each cycle and garbage collected after playback
- Master gain and pan controlled via the same update/onPlaySet API pattern used elsewhere

</decisions>

<specifics>
## Specific Ideas

No specific requirements from user — open to standard approaches informed by granular synthesis best practices and project conventions.

Key references for implementation:
- Tone.js GrainPlayer as conceptual reference for API surface
- Web Audio API BufferSourceNode scheduling for grain-level control
- Hann window function as standard grain envelope

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sound` class: Shows AudioBuffer playback pattern — GrainPlayer uses same buffer but different scheduling
- `PolySynth`: Pattern for managing multiple simultaneous audio sources (voices ≈ grains conceptually)
- `SoundController`/`OscillatorController`: Parameter scheduling pattern (update/onPlaySet/onPlayRamp)
- `TypedEventEmitter`: Event system for play/stop/pause lifecycle events
- `Envelope`: ADSR system — grain windows are simpler (just attack/release ramp) but same concept
- `audioContextAwareTimeout`: Timer utility that compensates for browser throttling

### Established Patterns
- Factory functions (`createX`) as primary public API
- Options interfaces with sensible defaults
- `connections` array for effect chain insertion
- Gain/pan as standard output controls on all playable sources
- Debug logging via `debugConnection`/`debugEvent`

### Integration Points
- `src/index.ts`: Export `createGrainPlayer`, `GrainPlayer`, `GrainPlayerOptions` types
- Effects chain: Same `connections` array pattern as BaseSound
- Analyzer: Should support connecting an Analyzer for visualization
- No BaseSound inheritance — standalone like PolySynth

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 58-grainplayer*
*Context gathered: 2026-02-28*

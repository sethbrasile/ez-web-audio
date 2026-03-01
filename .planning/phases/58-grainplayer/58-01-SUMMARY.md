# Phase 58, Plan 01: GrainPlayer Core Implementation — Summary

**Status:** Complete
**Completed:** 2026-02-28

## What was built

GrainPlayer class implementing granular synthesis from an audio buffer. The class extends `TypedEventEmitter<GrainPlayerEventMap>` (following PolySynth pattern) and manages a `setTimeout`-based scheduling loop that creates overlapping `BufferSourceNode` grains with Hann window gain envelopes.

### Key features
- **Grain scheduling**: 25ms `setTimeout` loop with 50ms lookahead, schedules grains slightly ahead of `audioContext.currentTime`
- **Hann window envelope**: Per-grain `GainNode` ramps (0 -> 1 -> 0) using `linearRampToValueAtTime` for click-free playback
- **Position scrubbing**: `position` property (0-1 normalized) controls which region of the buffer grains sample from
- **Pitch shifting**: `pitch` property (semitones) converts to `playbackRate` via `2^(semitones/12)`, with bidirectional `playbackRate` property
- **Grain parameters**: `grainSize`, `overlap`, `jitter` all configurable at runtime
- **Full lifecycle**: `play()`, `stop()`, `pause()`, `resume()`, `dispose()` with proper state management
- **Shared output bus**: `sharedBusInput -> [effects] -> masterGain -> masterPan -> [analyzer] -> destination`
- **Effects/analyzer**: Same API as PolySynth for effects chain and analyzer attachment

### Files created/modified
- `src/grain-player.ts` — GrainPlayer class + GrainPlayerOptions interface (580 lines)
- `src/grain-player.test.ts` — 71 unit tests (650 lines)
- `src/events/event-types.ts` — Added GrainPlayerEventMap + GrainPlayer to AudioEventSource union

## Decisions made
- Used `setTimeout` (not `setInterval` or `requestAnimationFrame`) for grain scheduling — matches Transport/BeatTrack pattern, avoids drift accumulation
- Grain duration compensated for playbackRate: `source.start(when, offset, grainSize / playbackRate)` so grain window timing stays consistent
- Minimum grainSize clamped to 0.01s, minimum hop size clamped to 0.001s to prevent CPU overload
- Used near-zero (0.0001) instead of exact 0 for gain envelope start/end — compatible with both linear and exponential ramps
- Grain nodes cleaned up via `ended` event listener with `{ once: true }` — prevents memory leaks

## Test coverage
71 tests covering: construction, play/stop lifecycle, pause/resume, position control, pitch shifting (including semitone-to-rate and rate-to-semitone conversion), grain parameters, grain scheduling verification, master controls, effects chain, analyzer, destination, dispose, and event types.

## Self-Check: PASSED
- [x] All tasks executed
- [x] 71 tests pass
- [x] TypeScript compiles cleanly
- [x] Lint passes for new files

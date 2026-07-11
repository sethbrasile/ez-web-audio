# Tech Debt Registry

## From 2026-07-11 deep review / QC cycle (closed 2026-07-11)

Source: `.planning/reviews/2026-07-11-deep-review.md` (+ items surfaced during fix execution). All items below are non-blocking; advisories included.

| Item | Source | Advisory |
|------|--------|----------|
| `interceptBypass` monkey-patches effect property descriptors (~50 lines reflection, base-sound.ts); replace with a `bypasschange` event on BaseEffect | R3#5 (med) | Worth fixing eventually — cleaner extension contract for user effects; not urgent, current mechanism works and is now dispose-safe |
| Sequence main-branch cold-state wrap edge: with `lastScheduledBeat=-1` a near-wrap event can be captured with negative lead time | G2 executor note | Worth a look next core pass — same lookahead family as H2; needs a targeted test first |
| PolySynth bus-level onPlaySet/onPlayRamp | R1#6 | Skip — no singular play() lifecycle; per-voice handles already expose scheduling; documented in JSDoc |
| Distortion crossfade residual: change arriving faster than the 15ms window can land a curve on a node with non-zero fade-out gain | close-out unit note | Skip — documented in JSDoc; inaudible in practice at knob rates |
| TypedEventEmitter `once()`/`off()` don't accept `K[]` (on() does) | R14#2 (low) | Marginal — symmetry nicety; add when touching the emitter next |
| `'interrupted'` AudioContextError message doesn't name a concrete recovery call | R14#5 (low) | Worth fixing — one-line message edit |
| AudioEventSource docstring excludes BaseEffect (deliberate, undocumented) | R14#6 (low) | One-line docs fix |
| Debug logging not tree-shakeable (unconditional calls in hot paths) | R14#10 (low) | Skip unless bundle size becomes a stated goal (`__DEV__` flag approach) |
| `settle()` real-timer helper (63 uses) vs fake timers elsewhere | R18#7 (low) | Skip — convert only if CI flake appears |
| TypedEventEmitter has no direct unit test file (indirect coverage solid) | R18#6 (low) | Skip — now partially covered by G9's typed-event-emitter.test.ts (11 cases) |
| DOM helpers (preventEventDefaults, useInteractionMethods) live in root namespace | R1#7 (low) | Deferred to a future major — `/dom` subpath export; JSDoc remarks added |
| Vue README composables table missing ~6 rows vs actual exports | G12 executor note | Small docs task |
| Hot-added transport track starts pattern at step 0 regardless of loop position | R5#6 (low) | Documented as known limitation in _addTrack JSDoc; revisit if users report phase surprises |
| LayeredSound has no addLayer/removeLayer (constructor-only) | R12#7 (low) | Documented; build only if a real use case demands it |

## Roadmap menu (features, NOT defects — from use-case coverage lens)

Ordered by value/effort. Seth decides which become milestone work:

1. **playbackRate on Sound/Track** (small, high value) — native AudioParam sibling of detune; unlocks podcast/audiobook speed. Controller plumbing exists.
2. **OfflineAudioContext support for Transport/BeatTrack/Sequence** — wall-clock schedulers silently produce nothing offline. Short term: docs caveat in multiple-contexts.md (small). Real fix: synchronous render-mode scheduling (large).
3. **Sampler maxConcurrent/voice-steal** (medium) — extract PolySynth's VoicePool for sample playback (game SFX).
4. **duck() helper** (small-medium) — gain-ramp composition over existing play/stop events (VO-over-music).
5. **Playlist/queue wrapper** (small-medium) — auto-advance + crossfade between Tracks.
6. **createMicInput** (medium) — MediaStreamAudioSourceNode into the existing Connectable chain; unlocks metering/looper.
7. **3D/HRTF panner option** (large, narrow audience) — panner type selection at construction.

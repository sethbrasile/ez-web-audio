---
phase: 57-polysynth
plan: 01
status: complete
commit: dd1c189
requirements: [SYNTH-01, SYNTH-02]
files_modified:
  - src/poly-synth.ts
  - src/poly-synth.test.ts
  - src/events/event-types.ts
---

## What was done

Created the PolySynth class with full voice pool management, VoiceHandle API, and three voice stealing strategies.

### Key deliverables

1. **PolySynth class** (`src/poly-synth.ts`) — extends TypedEventEmitter with:
   - Configurable voice pool (maxVoices default 8)
   - On-demand Oscillator voice creation with recycling
   - Three steal strategies: `lru` (default), `oldest-active`, `quietest`
   - Same-frequency retrigger (reuses existing active voice)
   - Shared output bus: voices → sharedBusInput → effects → masterGain → masterPan → destination
   - Master gain/pan controls via `update()`, `changeGainTo()`, `changePanTo()`
   - Effect chain: `addEffect()`, `removeEffect()`, `setAnalyzer()`, `setDestination()`
   - `stopAll()` and `dispose()` lifecycle management
   - Custom voice factory support via `createVoice` option

2. **VoiceHandle class** — lightweight per-voice control:
   - `active` property tracks voice validity
   - Forwards `update()`, `onPlaySet()`, `onPlayRamp()`, `stop()` to underlying Oscillator
   - Stale handles (after stop or steal) silently no-op on all method calls
   - `_invalidate()` internal method for voice stealing

3. **Event types** (`src/events/event-types.ts`):
   - Added `PolySynth` to `AudioEventSource` union
   - Added `VoiceStolenEventDetail` interface
   - Added `PolySynthEventMap` interface

4. **Test suite** (`src/poly-synth.test.ts`) — 55 tests covering:
   - Construction and defaults
   - Basic playback and voice counting
   - VoiceHandle API and stale handle safety
   - Same-frequency retrigger
   - All three steal strategies
   - stopAll and dispose
   - Shared output bus (effects, analyzer, destination)
   - Voice factory (default and custom)
   - Events (voicestolen detail shape)
   - Edge cases (maxVoices: 1, rapid play/stop, voice recycling)

### Verification

- `pnpm test src/poly-synth.test.ts` — 55/55 pass
- `pnpm typecheck` — clean
- `pnpm lint` — no errors in modified files

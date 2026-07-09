---
phase: 55-transport-beattrack-sync
plan: 04
status: complete
---

## What was done

Implemented BeatTrack ↔ Transport sync integration: syncTo/unsync methods, mute/solo per-track controls, Transport-driven beat scheduling, and standalone method guards.

### Files modified
- `src/beat-track.ts` — Added syncTo(), unsync(), isSynced getter, muted/solo properties, _shouldPlay(), _scheduleBeatFromTransport(), guardSynced(), internalStop(). Guard calls added to playBeats, playActiveBeats, stop, pause, resume, setTempo. dispose() now unsyncs before stopping.
- `src/beat-track.test.ts` — 31 new tests covering syncTo/unsync lifecycle, guard methods throwing when synced, muted property, solo property (stackable), _scheduleBeatFromTransport, Transport-driven playback with multiple tracks, dispose unsyncs.
- `src/beat.ts` — Added public triggerVisualOnly() method for muted/non-soloed visual-only beat indication.

### Key decisions
- guardSynced() pattern: standalone methods throw descriptive error when synced, directing user to transport.start()/stop()
- internalStop() extracted as private method: public stop() guards, dispose() and unsync() use internal version
- _shouldPlay() logic: muted=false always; standalone mode ignores solo; synced mode uses stackable solo (any soloed → only soloed tracks play)
- Beat events always fire even when muted (for UI sync)
- Visual-only beat indication via Beat.triggerVisualOnly() for muted tracks
- import type for Transport avoids circular dependency

### Test results
- 80 BeatTrack tests passing (49 existing + 31 new)
- 41 Transport tests passing
- pnpm typecheck passes

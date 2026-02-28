---
phase: 55-transport-beattrack-sync
plan: 03
status: complete
---

## What was done

Migrated BeatTrack's internal scheduler from window.setTimeout to WorkerTimer for background-tab-resilient timing.

### Files modified
- `src/beat-track.ts` — Replaced `timerID: number | null` with `workerTimer: WorkerTimer`, extracted schedulerTick() from scheduler(), updated stop()/pause()/dispose() to use workerTimer.stop()/dispose()
- `src/beat-track.test.ts` — Updated getTimerID() test helper to use workerTimer.isRunning instead of timerID

### Key decisions
- First tick runs synchronously in scheduler() before starting WorkerTimer to maintain backward compatibility with tests that expect immediate scheduling after playBeats()
- Removed schedulerInterval field (now handled by WorkerTimer's internal 20ms interval)
- Kept scheduleAheadTime = 0.1 (100ms lookahead window) unchanged

### Test results
- All 49 existing BeatTrack tests pass unchanged (backward compatible)
- No public API changes

# Deferred Items — Phase 54.1

## Out-of-scope pre-existing failures

### src/utils/crossfade.test.ts (5 tests failing)

**Discovered during:** 54.1-03 Task 2 verification

**Context:** `src/utils/crossfade.ts` has pre-existing unstaged changes (from before 54.1-03 execution began) that changed the crossfade API:
- Old behavior: `fromGain.setValueAtTime(fromGain.value, startTime)` before `setValueCurveAtTime`
- New behavior: `fromGain.cancelScheduledValues(startTime)` before `setValueCurveAtTime` (no `setValueAtTime`)
- Old behavior: default `stop` source track after fade
- New behavior: default `pause` source track after fade (with `afterFade` option)

The crossfade.test.ts tests were written for the OLD crossfade.ts behavior. These failures are NOT caused by 54.1-03 changes — confirmed by running tests with stashed crossfade.ts changes passing.

**Resolution needed:** Update crossfade.test.ts to match the new crossfade.ts API, OR revert crossfade.ts to match existing tests. This is part of the plan that introduced the `afterFade` option (likely 54.1-04 or later).

**Verification:** `git stash -- src/utils/crossfade.ts && pnpm test src/utils/crossfade.test.ts` passes.

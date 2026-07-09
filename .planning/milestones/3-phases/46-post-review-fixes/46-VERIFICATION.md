---
phase: 46-post-review-fixes
verified: 2026-02-25T01:20:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 46: Post-Review Fixes Verification Report

**Phase Goal:** Fix all actionable findings from the 2026-02-25 health check review — build compatibility, core API bugs, broken doc examples, type correctness, and minor leaks
**Verified:** 2026-02-25T01:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Requirement ID Source Note

The IDs C1, H1, H2, M1, M2, L1, F5, F6, F7 are sourced from `.planning/reviews/2026-02-25-deep-review.md`, not `.planning/REQUIREMENTS.md`. The REQUIREMENTS.md uses a different naming scheme (API-01, FIX-01, etc.) for earlier milestones. These review-scoped IDs are not orphaned — they are fully declared in the plan frontmatter and resolved by the phase. No cross-reference discrepancy.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Consumers using moduleResolution nodenext get zero TS errors importing ez-web-audio | VERIFIED | `dist/index.d.ts` is 4508 lines with 0 relative cross-file imports; `rollupTypes: true` in vite.config.js:13 |
| 2 | dist/index.d.ts is a single bundled declaration file | VERIFIED | File exists at 4508 lines; `grep "from './"` returns 0 matches; no orphan .d.ts files in dist subdirs |
| 3 | Library JS output still works correctly after rollupTypes change | VERIFIED | 1191 unit tests pass; typecheck clean |
| 4 | onPlayRamp('gain').from(0.5).to(1).in(2) sets gain to 0.5 at time 0 then ramps to 1 | VERIFIED | `base-param-controller.ts:267` — `this.valuesAtTime.push({ type, value: startValue, time: 0 })` bypasses dedup filter |
| 5 | After fadeOut(), subsequent play() produces audio at the expected gain level | VERIFIED | `sound.ts:124` — `this.gainNode.gain.setValueAtTime(this._targetGain, ...)` in setup(); `base-sound-gain-restore.test.ts` has 8 tests covering this |
| 6 | After Oscillator stop (anti-click fade), subsequent play() produces audio at the expected gain | VERIFIED | `oscillator.ts:310-313` — setup() uses `this._targetGain` not `gainNode.gain.value` |
| 7 | Landing page drum machine example uses createBeatTrack(urls[], opts) with correct API | VERIFIED | `docs/index.md:61` — `await createBeatTrack(['/audio/kick.wav'], { numBeats: 8 })` with `playBeats(120, 1/4)` |
| 8 | Landing page effects example uses createFilterEffect(type, options) positional signature | VERIFIED | `docs/index.md:72` — `createFilterEffect('lowpass', { frequency: 800 })` |
| 9 | Effects page createAnalyzer has await and uses Analyzer wrapper API | VERIFIED | `docs/examples/effects.md:309` — `await createAnalyzer`; line 317 — `analyzer.getFrequencyData()` |
| 10 | Layered sound page event handlers destructure from event.detail | VERIFIED | `docs/examples/layered-sound.md:90,103` — `event.detail.time` and `event.detail.message` |
| 11 | Sound instances only expose play/stop/end event listeners in TypeScript autocomplete | VERIFIED | `base-sound.ts:80` — `BaseSound<TMap extends BaseSoundEventMap & {...} = BaseSoundEventMap>`; `sound.ts:34` — `Sound<TMap extends BaseSoundEventMap & {...} = BaseSoundEventMap>` |
| 12 | Track instances expose play/stop/end/pause/resume/seek event listeners | VERIFIED | `track.ts:38` — `class Track extends Sound<TrackEventMap>` |
| 13 | _disposeUnmute test verifies the dispose handle is actually called | VERIFIED | `index.test.ts:845-858` — mocks dispose fn, calls `_disposeUnmute()`, asserts `mockDispose.toHaveBeenCalledOnce()` |
| 14 | createNotes() populates letter, accidental, and octave from standard note name keys | VERIFIED | `index.ts:173-179` — regex `/^([A-G])(b|#)?(\d)$/` parses keys; `index.test.ts:788-815` tests confirm |
| 15 | Beat.pendingTimerIds self-cleans completed timer IDs during playback | VERIFIED | `beat.ts:191-196` — callback wrapper removes own ID via `indexOf + splice` before invoking fn; `beat.test.ts:224+` tests confirm |

**Score:** 15/15 truths verified (9/9 requirement IDs covered across all plans)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|---------|--------|---------|
| `vite.config.js` | rollupTypes: true config | VERIFIED | Line 13: `rollupTypes: true` |
| `dist/index.d.ts` | Bundled type declarations | VERIFIED | 4508 lines, zero cross-file imports |
| `src/controllers/base-param-controller.ts` | Fixed onPlayRamp preserving from() value | VERIFIED | Line 267: `this.valuesAtTime.push({ type, value: startValue, time: 0 })` |
| `src/base-sound.ts` | _targetGain field and Generic BaseSound<TMap> | VERIFIED | Line 104: `protected _targetGain: number = 1`; Line 80: `BaseSound<TMap extends BaseSoundEventMap & {...}>` |
| `src/oscillator.ts` | Oscillator using _targetGain in setup() | VERIFIED | Line 310-313: `this.gainNode.gain.setValueAtTime(this._targetGain, ...)` |
| `src/sound.ts` | Sound<TMap> generic, setup() restores _targetGain | VERIFIED | Line 34: generic; Line 124: `_targetGain` restoration in setup() |
| `src/track.ts` | Track using TrackEventMap | VERIFIED | Line 38: `class Track extends Sound<TrackEventMap>` |
| `docs/index.md` | Correct landing page code examples | VERIFIED | createBeatTrack array syntax; createFilterEffect positional arg |
| `docs/examples/effects.md` | Correct effects visualization example | VERIFIED | `await createAnalyzer`; `analyzer.getFrequencyData()` |
| `docs/examples/layered-sound.md` | Correct event handling examples | VERIFIED | `event.detail.time`, `event.detail.message` |
| `src/index.ts` | createNotes with note name parsing | VERIFIED | Lines 173-179: regex match populates letter, accidental, octave |
| `src/beat.ts` | Self-cleaning pendingTimerIds | VERIFIED | Lines 191-196: splice on completion |
| `src/base-sound-gain-restore.test.ts` | Gain restoration tests (created, not just modified) | VERIFIED | File exists; 8 tests in "gain restoration after fadeOut/stop" describe block |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `vite.config.js` | `dist/index.d.ts` | vite-plugin-dts rollupTypes | WIRED | `rollupTypes: true` at line 13; dist/index.d.ts confirmed bundled |
| `src/base-sound.ts` | `src/events/typed-event-emitter.ts` | Generic TMap parameter passed to TypedEventEmitter | WIRED | Line 80: `extends TypedEventEmitter<TMap>` |
| `src/track.ts` | `src/events/event-types.ts` | Track uses TrackEventMap generic parameter | WIRED | Line 3: `import type { TrackEventMap }` + Line 38: `Sound<TrackEventMap>` |
| `src/controllers/base-param-controller.ts` | `setValuesAtTimes` | onPlayRamp stores startValue in valuesAtTime | WIRED | Line 267: `this.valuesAtTime.push({ type, value: startValue, time: 0 })` |
| `src/base-sound.ts` | `src/sound.ts` | _targetGain inherited by Sound.setup() | WIRED | `protected _targetGain` in base-sound; `this._targetGain` in sound.ts:124 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| C1 | 46-01 | .d.ts files use extension-less imports — breaks moduleResolution: nodenext | SATISFIED | `rollupTypes: true` produces single bundled dist/index.d.ts with 0 cross-file imports |
| H1 | 46-02 | onPlayRamp().from(x) silently discards the from value | SATISFIED | `valuesAtTime.push({type, value: startValue, time: 0})` in base-param-controller.ts:267 |
| H2 | 46-03 | Landing page drum machine and effects examples use nonexistent API | SATISFIED | docs/index.md uses `createBeatTrack([urls], opts)` and `createFilterEffect('lowpass', opts)` |
| M1 | 46-02 | fadeOut() and Oscillator anti-click stop leave gain at 0 — next play() is silent | SATISFIED | `_targetGain` field tracks intent; setup() restores it in both Sound and Oscillator |
| M2 | 46-03 | Additional doc code examples broken (effects.md, layered-sound.md) | SATISFIED | `await createAnalyzer`, `getFrequencyData()` wrapper, `event.detail` destructuring all fixed |
| L1 | 46-04 | BaseSound still uses deprecated SoundEventMap instead of BaseSoundEventMap | SATISFIED | `BaseSound<TMap extends BaseSoundEventMap & {...}>` generic; Sound defaults to BaseSoundEventMap; Track passes TrackEventMap |
| F5 | 46-04 | _disposeUnmute tests only check "doesn't throw" — weak assertions | SATISFIED | index.test.ts:845-874 — `mockDispose` spy, `toHaveBeenCalledOnce()` assertions |
| F6 | 46-04 | createNotes() does not populate letter, accidental, or octave | SATISFIED | index.ts:173-179 — regex parses A4/Bb3/C#5 keys into musical identity fields |
| F7 | 46-04 | Beat.pendingTimerIds grows unbounded during long playback sessions | SATISFIED | beat.ts:191-196 — self-cleaning on callback completion via indexOf + splice |

**No orphaned requirements.** All 9 IDs declared in plan frontmatter are verified satisfied. These IDs are from the 2026-02-25-deep-review.md, not REQUIREMENTS.md — no cross-reference conflict.

---

### Anti-Patterns Found

No blockers or warnings found in files modified by this phase. Scanned: `vite.config.js`, `src/controllers/base-param-controller.ts`, `src/base-sound.ts`, `src/sound.ts`, `src/oscillator.ts`, `src/track.ts`, `src/beat.ts`, `src/index.ts`, `docs/index.md`, `docs/examples/effects.md`, `docs/examples/layered-sound.md`.

---

### Human Verification Required

#### 1. moduleResolution nodenext Consumer Integration

**Test:** Create a scratch TypeScript project with `"moduleResolution": "nodenext"` and `"module": "nodenext"` in tsconfig.json, install ez-web-audio, and import from it.
**Expected:** Zero TS2835 errors from the import.
**Why human:** Cannot run a real consumer project from within this repo's test suite. The dist/index.d.ts structure looks correct (zero cross-file imports), but the only way to definitively confirm zero TS2835 errors for a nodenext consumer is a real consumer project.

#### 2. Doc Site Build Verification

**Test:** Run `pnpm build` (not just `pnpm build:lib`) and verify the VitePress docs site builds without errors.
**Expected:** Build succeeds, docs site renders landing page with all four corrected examples visible.
**Why human:** The 46-03 SUMMARY noted a pre-existing TypeScript constraint error in base-sound.ts was causing `pnpm build` to fail (later fixed by 46-04). Verify the full build now succeeds end-to-end.

---

### Summary

All 9 requirement IDs from the 2026-02-25 health check review have been satisfied:

- **C1 (Critical):** `rollupTypes: true` produces a single bundled `dist/index.d.ts` with zero cross-file imports. Orphan `.d.ts` files (event-types.d.ts, connectable.d.ts, playable.d.ts, exponential-ratio.d.ts) no longer exist as separate dist files.

- **H1 (High):** `onPlayRamp().from()` bug fixed by pushing startValue directly to `valuesAtTime` at time 0, bypassing the dedup filter that was silently discarding it. Previously documented broken behavior in tests was corrected.

- **H2 (High):** Landing page drum machine example (`createBeatTrack([urls], opts)` + `playBeats()`) and effects example (`createFilterEffect('lowpass', opts)` positional form) both corrected.

- **M1 (Medium):** `_targetGain` field added to BaseSound tracks user's intended gain independently of `gainNode.gain.value`. `Sound.setup()` and `Oscillator.setup()` restore `_targetGain` before each play cycle. `volume` getter returns `_targetGain`. 8 dedicated tests in `base-sound-gain-restore.test.ts`.

- **M2 (Medium):** `effects.md` gets `await createAnalyzer` and `analyzer.getFrequencyData()` wrapper API. `layered-sound.md` event handlers use `event.detail.time` and `event.detail.message`.

- **L1 (Low):** `BaseSound<TMap>` generic with `TMap extends BaseSoundEventMap & {[K in keyof TMap]: CustomEvent<unknown>}` default. Sound defaults to `BaseSoundEventMap` (play/stop/end only). Track passes `TrackEventMap` (all 6 events).

- **F5:** `_disposeUnmute` tests now use `vi.doMock` to spy on the dispose handle and assert `toHaveBeenCalledOnce()`.

- **F6:** `createNotes()` regex parses standard note name keys (A4, Bb3, C#5) into `letter`, `accidental`, `octave` fields.

- **F7:** `Beat.trackedTimeout()` self-removes completed timer IDs via `indexOf + splice` on callback completion.

All 1191 unit tests pass. `pnpm typecheck` is clean.

---

_Verified: 2026-02-25T01:20:00Z_
_Verifier: Claude (gsd-verifier)_

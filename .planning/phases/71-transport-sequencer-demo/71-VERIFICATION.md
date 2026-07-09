---
phase: 71-transport-sequencer-demo
verified: 2026-03-20T12:00:00Z
status: gaps_found
score: 6/7 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 7/7
  gaps_closed:
    - "Dispose leak fixed — kickTrack, snareTrack, hihatTrack, bassSeq, pianoSeq now call .dispose() on unmount (deep review C1 fix)"
    - "ticksPerBeat updated to 12 for triplet support, tick-to-step conversion corrected"
    - "Preset-before-init guard added to applyPreset()"
    - "Sticky track labels added for horizontal scroll UX"
    - "Single play/pause button replaces v-if swap (deep review M16)"
    - "Bass oscillator changed to triangle wave, getAudioContext() used instead of transport internals"
  gaps_remaining:
    - "transport.resume() does not exist on Transport — Resume button is a no-op"
  regressions:
    - "Deep review M16 fix introduced transport?.resume() call; Transport only has start()/pause()/stop()"
gaps:
  - truth: "User can play/pause/stop transport with adjustable BPM — including resume from pause"
    status: partial
    reason: "The Resume function calls transport?.resume() which does not exist on Transport. Optional chaining silently swallows the call. paused.value is set to false (hiding Resume button) but transport remains paused. User must click Play a second time to actually resume."
    artifacts:
      - path: "docs/.vitepress/theme/components/TransportSequencerDemo.vue"
        issue: "resume() function at line 391-394 calls transport?.resume() — Transport has no resume() method. Should call transport?.start() which handles resume-from-paused internally."
    missing:
      - "Change line 392 from `transport?.resume()` to `transport?.start()` in TransportSequencerDemo.vue"
human_verification:
  - test: "Audio playback — Play starts transport and sound is heard"
    expected: "Clicking Play loads audio (piano.js 1.4MB + drum samples), transport starts, drum patterns and melody are audible within a few seconds"
    why_human: "Web Audio API output cannot be verified programmatically; requires ears to confirm drums, bass, and piano are actually playing"
  - test: "BPM slider changes tempo in real time during playback"
    expected: "Dragging BPM slider from 120 to 160 makes the drums and melody noticeably speed up without stopping or glitching"
    why_human: "Tempo feel and continuity require human perception; automated tests only verify no JS errors"
  - test: "Mute silences audio and Solo isolates track"
    expected: "Clicking M on Kick row silences the kick drum (button turns yellow). Clicking S on Snare makes only snare audible (button turns blue). Clicking S again restores all tracks."
    why_human: "Audio muting effect requires listening; automated tests only verify CSS class toggling"
  - test: "Visual playhead advances left-to-right in sync with transport"
    expected: "After Play, one column of cells is highlighted with yellow outline, advancing through all 32 steps and looping back to step 1"
    why_human: "E2E playhead test covers advancement, but visual sync quality and looping behavior require human judgment"
  - test: "Preset switching changes patterns audibly and visually"
    expected: "Clicking 'Funk Groove' changes the drum grid pattern and the bass/piano note names in the melody rows; the rhythm sounds distinctly different (syncopated vs straight). 'Triplet Feel' has a swing feel."
    why_human: "Musical quality of preset patterns — whether they sound distinct and interesting — requires human judgment"
---

# Phase 71: Transport + Sequencer Demo — Re-Verification Report

**Phase Goal:** Users can control a BPM-synced transport with mute/solo tracks and hear musical sequences using time notation, with a visual beat/bar playhead
**Verified:** 2026-03-20T12:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — deep review commit `b0dee2f` (2026-03-19) changed TransportSequencerDemo.vue significantly

## Context: What Changed Since Initial Verification

The initial verification (2026-03-19T23:30:00Z) passed with `human_needed` status at 7/7 score. After that, deep review commit `b0dee2f` applied 55 findings across 6 demo components. For TransportSequencerDemo.vue specifically:

- Fixed C1 dispose leak: added `.dispose()` on all BeatTrack and Sequence instances in `onUnmounted`
- Changed `ticksPerBeat` from 4 to 12 for triplet support, added `Math.floor(tick * 4 / 12)` conversion
- Added preset-before-init guard in `applyPreset()`
- Fixed M16 play/pause layout shift: replaced separate `.play-btn`/`.pause-btn` v-if toggle with a single button that changes text between "Play", "Pause", and "Resume"
- Changed bass oscillator to triangle wave, replaced `(transport as any).audioContext` with `getAudioContext()`
- Added sticky track labels, improved touch targets, responsive layout

The M16 fix introduced a regression: the single-button's "Resume" state calls `transport?.resume()` but `Transport` has no `resume()` method.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees Play/Pause/Stop buttons, a live bar:beat counter, and a BPM slider+number input on page load — no Load button | VERIFIED | Template has `.transport-buttons` with `.play-btn` (single button, text changes), `.stop-btn`; `.position-display` bound to `positionDisplay`; BPM range input + number input both `v-model.number="bpm"`; `ensureLoaded()` called on first Play |
| 2 | User can play/pause/stop transport — including resume from pause | PARTIAL | Play and Pause work correctly. Stop works. Resume: `resume()` calls `transport?.resume()` — method does not exist on Transport class (confirmed in `dist/index.d.ts` lines 6439-6448). Optional chaining silently returns `undefined`. `paused.value` becomes false but transport stays paused. User must click Play again to actually resume. |
| 3 | User can play the sequencer and hear drum patterns (kick, snare, hihat) synced to the BPM | NEEDS HUMAN | Three BeatTracks synced via `syncTo(transport, { noteType: 1/16 })`; `ticksPerBeat: 12` with correct step conversion; audio output requires human verification |
| 4 | User can hear melody (bass oscillator + piano soundfont) playing musical patterns alongside drums | NEEDS HUMAN | `bassSeq` and `pianoSeq` registered via `createSequence`; `shouldPlay()` guard in callbacks; `bassOsc.playFor()` and `font.getNote().playIn()` called with correct offset math; audio output requires human verification |
| 5 | User can mute or solo any of the 5 tracks — M button turns yellow when muted, S button turns blue when soloed | VERIFIED | `.mute-btn.muted` CSS applies yellow (`var(--vp-c-yellow-soft)` / `var(--vp-c-yellow)` border); `.solo-btn.soloed` applies brand color; E2E test at line 712 verifies `.mute-btn.muted` and `.solo-btn.soloed` classes toggle |
| 6 | User can see a 32-step CSS grid with one highlighted column advancing in sync with transport position | VERIFIED | `currentStep.value` updated in tick handler; template applies `playhead` class when `(i - 1) === currentStep`; `.step-cell.playhead` CSS applies yellow outline; E2E test covers playhead advancement |
| 7 | User can switch among 3 presets (Straight Rock, Funk Groove, Triplet Feel) and all 5 track patterns change | VERIFIED | `PRESETS` with 3 entries; `applyPreset()` calls `setPattern()` + `bassSeq.clear()` + `pianoSeq.clear()` + re-registers events; preset-before-init guard present; E2E test switches all 3 presets without errors |

**Score:** 5/7 truths fully verified, 1/7 partial (Resume bug), 2/7 require human audio verification

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/.vitepress/theme/components/TransportSequencerDemo.vue` | Complete transport + sequencer demo component (min 200 lines) | VERIFIED | 1024 lines; all 5 tracks, 3 presets, 32-step grid, mute/solo, transport controls; dispose leak fixed |
| `docs/examples/transport-sequencer.md` | VitePress demo page containing `TransportSequencerDemo` | VERIFIED | File exists; imports `TransportSequencerDemo` at line 11, renders at line 15 (inside `<llm-exclude>`); includes "How It Works" section and Controls table |
| `docs/.vitepress/config.mts` | Sidebar navigation entry containing `transport-sequencer` | VERIFIED | Line 172: `{ text: 'Transport + Sequencer', link: '/examples/transport-sequencer' }` in "Timing & Sequencing" section |
| `e2e/demos.spec.ts` | Smoke test for transport-sequencer page load | VERIFIED | Line 32: `'examples/transport-sequencer'` in `demoPages` array |
| `e2e/interactions.spec.ts` | Describe block covering TSEQ-01 through TSEQ-04 | VERIFIED | `test.describe('TransportSequencer page interactions', ...)` at line 676 with 4 tests |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TransportSequencerDemo.vue transport.on('tick')` | `currentStep ref` | `Math.floor(tick * 4 / 12)` then `step % 32` | WIRED | Lines 358-360: `sixteenthTick = Math.floor(tick * 4 / 12)`, `step = ((bar-1)*16)+((beat-1)*4)+sixteenthTick`, `currentStep.value = step % 32` |
| `TransportSequencerDemo.vue BPM watch` | `transport.bpm setter` | `watch(bpm, v => transport.bpm = v)` | WIRED | Line 366-369: `watch(bpm, (v) => { if (transport) transport.bpm = Math.max(40, Math.min(300, v)) })` |
| `Sequence callbacks` | `shouldPlay() guard` | `mute/solo state check before playIn` | WIRED | Lines 281, 293: `if (!shouldPlay('bass')) return` and `if (!shouldPlay('piano')) return` at top of each sequence callback |
| `resume() function` | `transport.resume()` | BROKEN — method does not exist | NOT_WIRED | `transport?.resume()` at line 392 is a no-op. Transport only exposes `start()`, `pause()`, `stop()`. Resume from pause requires calling `start()` again (Transport.start() handles paused state internally at lines 204-218 of transport.ts). |

### Requirements Coverage

| Requirement | Description | Source Plan | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TSEQ-01 | User can play/pause/stop transport with adjustable BPM | 71-01, 71-02 | PARTIAL | Play and Stop: fully implemented and E2E tested. Pause: works correctly. Resume: `transport?.resume()` is a no-op (method does not exist); user must click Play twice to resume from pause. |
| TSEQ-02 | User can mute/solo individual tracks | 71-01, 71-02 | SATISFIED | `toggleMute()` and `toggleSolo()` wired; `syncDrumMuteSolo()` syncs drum BeatTrack state; `shouldPlay()` guards melody sequences; E2E test verifies CSS class toggling |
| TSEQ-03 | User can hear a sequence using musical time notation (4n, 8t, 2m) | 71-01, 71-02 | SATISFIED (audio human-needed) | `createSequence(transport, { length: '2m', loop: true })`; `seq.at()` called with `'2n'`, `'1m'`, `'2:3:0'`, `'1:3:0'`, fractional beat values `1/3`, `4/3`; invalid `'1m+2n'` bug was fixed in 71-02 |
| TSEQ-04 | User can see current beat/bar position with visual playhead | 71-01, 71-02 | SATISFIED | `positionDisplay.value` updated as `` `${bar}:${beat}` ``; `currentStep.value = step % 32` drives `.step-cell.playhead` class; E2E test verifies playhead appears after Play and advances column within 600ms |

**Orphaned requirements:** None — all 4 TSEQ requirements in REQUIREMENTS.md are mapped to Phase 71 and claimed in both plan frontmatter blocks.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `TransportSequencerDemo.vue` | 392 | `transport?.resume()` — calls non-existent method, silently no-ops via optional chaining | Blocker | Resume button does nothing; user must click Play twice to resume after pausing. Affects TSEQ-01 (pause/resume transport). |

No TODO/FIXME/placeholder comments, no stub implementations, no empty return values, no console.log-only handlers found in any phase 71 file.

### Human Verification Required

#### 1. Audio playback — Play starts transport and sound is heard

**Test:** Start dev server (`pnpm dev`). Navigate to `/ez-web-audio/examples/transport-sequencer`. Click Play. Wait up to 10 seconds for piano.js (1.4MB) and drum samples to load.
**Expected:** Kick, snare, and hihat drum patterns are audible in the "Straight Rock" feel. Bass oscillator (triangle wave, bass frequencies) and piano notes play alongside.
**Why human:** Web Audio API output cannot be verified programmatically.

#### 2. BPM slider changes tempo in real time during playback

**Test:** While transport is playing, drag BPM slider from 120 to 160, then back to 80.
**Expected:** Tempo changes immediately and continuously without stopping or glitching. Drums and melody stay in sync at the new BPM.
**Why human:** Tempo feel and audio continuity require human perception.

#### 3. Mute silences audio and Solo isolates track

**Test:** While playing, click M on Kick row. Then click S on Snare row. Then click S again.
**Expected:** Kick button turns yellow and kick drops out of mix. Snare button turns blue and only snare is audible. Clicking S again restores all tracks.
**Why human:** Audio muting effect requires listening. E2E tests only verify CSS class toggling, not audio silence.

#### 4. Visual playhead advances left-to-right in sync with transport

**Test:** Click Play and observe the step grid.
**Expected:** One highlighted column (yellow outline) moves from left to right across all 32 steps, then loops back to step 1. The bar:beat counter updates in sync.
**Why human:** E2E test covers basic playhead advancement, but visual sync quality and smooth looping require human judgment.

#### 5. Preset switching changes patterns audibly and visually

**Test:** While playing, click "Funk Groove" then "Triplet Feel" then back to "Straight Rock".
**Expected:** Grid pattern updates visibly (different cells active). Each preset sounds rhythmically distinct.
**Why human:** Musical quality and rhythmic distinctiveness require human judgment.

### Gaps Summary

One gap introduced by the deep review (`b0dee2f`) when fixing the play/pause layout shift (finding M16). The M16 fix correctly replaced separate v-if toggling buttons with a single button that changes text. However, the `resume()` function was written to call `transport?.resume()`, which does not exist on the `Transport` class.

**Root cause:** `Transport.start()` handles both fresh starts and resume-from-paused internally (when `this._paused === true`, `start()` branches to the resume path). The component should call `transport?.start()` for resume, not `transport?.resume()`. The fix is one line: change `transport?.resume()` to `transport?.start()` at line 392 of TransportSequencerDemo.vue.

**Impact:** The Resume button (shown when transport is paused) does nothing. `paused.value` is set to `false` correctly (so the UI shows "Play"), but the transport remains paused. The user must then click "Play" a second time, which calls `play()` → `ensureLoaded()` (no-op, already loaded) → `transport?.start()`, which does resume the transport. So the feature is recoverable (Play works as Resume after one extra click) but the Resume button UX is broken.

**TypeScript does not catch this:** The `docs/` directory is excluded from `pnpm typecheck` (`tsconfig.json` has `"include": ["src"]`). The bug is invisible to the type system in the demo context.

---

_Verified: 2026-03-20T12:00:00Z_
_Verifier: Claude (gsd-verifier)_

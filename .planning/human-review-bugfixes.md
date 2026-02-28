# Human Review Bug Fix Run

Systematic bug fix process: fix one issue, verify with human, move to next.

## Skill Idea: "human-verified-bugfix-run"

**Pattern**: Work through a list of bugs one at a time. For each: diagnose → fix → human verifies in browser → confirmed fixed or iterate. No GSD, no native plan mode. Just a list in a file, worked sequentially with a human in the loop confirming each fix before moving on. Think of it as a "UAT punch list" pattern.

**Key behaviors**:
- Single planning file, not a framework
- One bug at a time, no parallelism
- Human confirms each fix before marking done
- Stay on a bug until it's confirmed resolved
- Track status inline: `[ ]` pending, `[~]` in progress, `[x]` confirmed fixed

---

## Pre-fix: Doc/UX tweaks (do first since they're trivial)

- [x] **Home page lib size**: Changed to `~17–52 KB gzipped (tree-shakeable)`
- [x] **Home page "mental model" line**: Updated to "scales to complex audio"
- [x] **Home page "Best for" row**: Reworded — no longer implies Tone.js needed for serious work
- [x] **iOS init docs**: Removed iOS mention, clarified shared AudioContext
- [x] **Remove initAudio button** from PlayTogetherDemo.vue and CrossfadeDemo.vue — loads on first interaction now
- [x] **playTogether example page**: Folded into LayeredSound page with comparison table. Removed separate page and sidebar entry.

## Bug Fixes (one at a time, human-verified)

### 1. Drum machine plays all notes regardless of active status
- **Root cause**: DrumMachine.vue calls `playBeats()` instead of `playActiveBeats()`
- **Fix**: Changed to `playActiveBeats()`. Also fixed home page code example.
- **Status**: [x] confirmed fixed

### 2. Track seek broken while playing + won't play after seeking while stopped
- **Root cause (seek while playing)**: RAF position tracker overwrites seek position during stop→play cycle. Demo's stop listener reset UI state during seek's internal stop→play.
- **Root cause (play after seek)**: Demo called `resume()` but track was stopped not paused
- **Fix**: Cancel RAF before stop in Track.seek(). Demo uses `isSeeking` flag to ignore stop events during seek. Demo always uses `play()` (works for both fresh and seeked states). Added play event listener to restart RAF. Changed seek bar to `@input` for real-time feedback.
- **Status**: [x] confirmed fixed

### 3. Soundfont piano throws "mungeSoundFont - malformed sound font"
- **Root cause**: docs/public/audio/piano.js was reformatted (single quotes, unquoted keys). Parser used `lastIndexOf('"')` and `JSON.parse` which need double-quoted keys/values.
- **Fix**: Parser now handles single quotes (normalizes to double), and quotes unquoted keys via regex. Both original and reformatted soundfont formats work.
- **Remaining**: Both pianos (soundfont + synth keyboard?) show one extra note — the highest C should be removed.
- **Status**: [x] error fixed, [~] extra note cosmetic issue noted

### 4. Synth keyboard/XY pad click at end of notes
- **Status**: [x] confirmed fixed

#### Root causes
Two compounding issues:
1. `setTargetAtTime(0)` is an asymptotic exponential that **never reaches zero** — residual amplitude causes click when node stops (most audible on sine/triangle)
2. `cancelScheduledValues()` reverts to last *explicitly set* value, not current computed value — gain discontinuity → click

#### Fix (Tone.js pattern)
- **`Envelope.triggerRelease()`**: Uses `cancelAndHoldAtTime()` (preserves current computed value, no discontinuity) + `linearRampToValueAtTime(0, startTime + release)` (reaches actual zero). Fallback to `estimateCurrentValue()` + `cancelScheduledValues` for browsers without `cancelAndHoldAtTime`.
- **`Oscillator.stop()`**: Just calls `triggerRelease()` and stops the node 10ms after release ends (safety margin). No more `cancelScheduledValues` fighting with release automation.
- **`Oscillator.stopAt()`**: Still has 10ms anti-click ramp for non-envelope oscillators (XY pad case).

### 5. White noise stops shortly after starting (Real-Time Filter Control)
- **Root cause**: `createWhiteNoise()` and `createNoise()` create 1-second buffers without loop
- **Fix**: Both functions now set `loop = true` on the returned Sound by default
- **Status**: [x] confirmed fixed

### 6. Crossfade scheduling error
- **Root cause**: `setValueAtTime()` and `setValueCurveAtTime()` called at same timestamp — Web Audio rejects overlap
- **Fix**: Removed redundant setValueAtTime, added cancelScheduledValues. Also added `afterFade` option ('continue'|'pause'|'stop'), demo uses 'continue' for DJ-style. Both playheads now track continuously.
- **Status**: [x] confirmed fixed

## Post-Bug Polish

- [x] **Track demo enhancement**: Rewrote Track code example to show practical play/pause toggle, seek, and RAF position tracking. Condensed Track Events and Position/Duration sections.
- [x] **Piano keyboards**: Removed highest C from PianoKeyboard component (C4–B4, 7 white keys)

## Future Work: Example Page Code-Demo Alignment

Audit found 8 pages where interactive demos and code examples are disconnected. The pattern: demo shows something interactive, but the code to replicate it is either missing or buried after reference material. Fix pattern: show practical code immediately after each demo, then explain concepts.

### Needs Work (significant disconnect)

- [x] **effects.md** — Added "Replicating This Demo" section with slider→filter wiring code right after demo. Trimmed redundant "Adjusting Filter Parameters" to focus on shelf/peaking gain.
- [x] **drum-machine.md** — Added connecting sentence from Visual Sync section back to demo playhead.
- [x] **drum-machine-vanilla.md** — Moved "Key Code" (event listener) above "How It Works" (architecture). Renamed architecture section to "How It Works Under the Hood".
- [x] **audio-routing.md** — Added "Replicating This Demo" section showing real-time distortion amount, mix, and bypass control from UI sliders.

### OK (minor improvements)

- [x] **synthesis.md** — Added `frequencyToNote()` helper and slider→frequency wiring to the code section right after demo.
- [x] **drum-machine-vue.md** — Added anchor links from mute/solo descriptions to implementation section.
- [x] **synth-drum-kit.md** — Added code snippet showing how breakdown buttons play individual layers vs layered sound.
- [x] **ambient-generator.md** — Added slider event listener wiring code for drone, texture, and shimmer controls.

## After Bugs: Discussion Topics

- Tone.js feature gap analysis — what would it take to support "serious music applications"?
- Audio sprites redesign — real sound sprite with laser/SFX, show full file then isolated segments
- ~~Distortion/delay effect examples~~ — folded into v1.2 milestone (effects phase)
- ~~Tone.js feature gap analysis~~ — completed, saved to `.planning/tone-gap-analysis.md`, driving v1.2 milestone
- Multiple AudioContext use cases — worth supporting?
- llms.txt — research current conventions, Astro/VitePress plugins for auto-generation, should include API docs + docs site content

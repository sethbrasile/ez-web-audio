# Phase 09 - Pending Fixes & Decisions

## Status: Awaiting User Decision

---

## 1. BeatTrack playActiveBeats is Dead Code

### Problem
`playActiveBeats()` and `playBeats()` are functionally identical. Both go through `scheduler()` → `scheduleBeat()`, which checks `beat.active` internally. Neither method uses the Beat class's `ifActivePlayIn()` or `playIn()` timing methods for the scheduler path.

### Background (ember-audio design intent)
In ember-audio, the distinction mattered:
- **`playBeats`** → `beat.playIn()` → plays ALL beats, sets both `isPlaying` and `currentTimeIsPlaying`
- **`playActiveBeats`** → `beat.ifActivePlayIn()` → only plays active beats, but ALWAYS sets `currentTimeIsPlaying` (for visual playhead on rests)

This let you poll `beat.currentTimeIsPlaying` to show a visual indicator even on rest positions.

### Current ez-web-audio behavior
The lookahead scheduler replaced the simple timing approach. Visual sync now uses `beat` events (with `active: true/false` in the event detail) instead of polling beat properties. The Beat class methods (`ifActivePlayIn`, `playIn`, `currentTimeIsPlaying`, `isPlaying`) still exist but the scheduler bypasses them.

### Options

**Option A: Remove `playActiveBeats`**
- Delete the method (it's identical to `playBeats`)
- The `beat` event with `active` flag is the new, better pattern for visual sync
- Simpler API surface
- Breaking change if anyone used `playActiveBeats`

**Option B: Fix `playActiveBeats` to use `ifActivePlayIn`**
- Make `scheduleBeat` aware of which mode was requested
- When in "active beats" mode, call `beat.ifActivePlayIn()` for active beats and still emit `currentTimeIsPlaying` for all
- When in "all beats" mode, call `beat.playIn()` for all beats
- Preserves both the event-based AND property-polling patterns
- More complex but fully backward compatible

**Option C: Keep both methods, document as aliases**
- Add a note that they behave identically in the scheduler-based approach
- Recommend `playBeats` as the primary method
- Lowest effort, but confusing API

---

## 2. Committed Fixes (Already Done)

These were completed in the current session and are ready in the working tree:

### Library fix: `src/base-sound.ts`
- **Bug**: `_isPlaying` timeout used `this.duration.pojo.seconds` (just the seconds component of MM:SS) instead of total duration. A 1:30 track would set `_isPlaying = false` after 30 seconds.
- **Fix**: Changed to `(duration - this.startOffset) * 1000` for correct total remaining time.
- **Tests**: All 711 tests pass.

### Component fixes:
| File | Issue | Fix |
|------|-------|-----|
| `AudioDemo.vue` | Created new Sound every click, gain/pan sliders had no effect | Load sound once, added watchers for real-time gain/pan updates |
| `TrackDemo.vue` | Stop broke after track ended; time showed wrong format; percent display confusing; seek missing `.from('seconds')` | Listen to 'stop' event; removed percent display; added gain watcher; fixed seek call |
| `SampledDrumKit.vue` | Pads grayed out with no-click cursor before init | Removed `:disabled`, disabled CSS, loading text; pads always fully interactive |
| `SoundfontPiano.vue` | Piano hidden during loading | Loading text shows inline in note display; keyboard always visible |

### Docs fix: `docs/examples/drum-machine.md`
- `playActiveBeats()` → `playBeats()`
- `stopAll()` → `stop()`
- `changeGainTo(value)` → `gain = value`
- Added `setTempo(bpm)` to API list

---

## 3. Uncommitted Changes

All the above fixes are uncommitted. Files modified:
- `src/base-sound.ts` (library bug fix)
- `docs/.vitepress/theme/components/AudioDemo.vue`
- `docs/.vitepress/theme/components/TrackDemo.vue`
- `docs/.vitepress/theme/components/SampledDrumKit.vue`
- `docs/.vitepress/theme/components/SoundfontPiano.vue`
- `docs/examples/drum-machine.md`

### Suggested commit plan
1. `fix: use correct duration for _isPlaying timeout in BaseSound` (library fix)
2. `fix: fix AudioDemo, TrackDemo, SampledDrumKit, SoundfontPiano demo components` (component fixes)
3. `docs: fix incorrect API references in drum-machine.md` (docs fix)

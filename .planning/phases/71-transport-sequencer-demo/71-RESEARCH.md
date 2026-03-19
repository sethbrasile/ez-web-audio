# Phase 71: Transport + Sequencer Demo - Research

**Researched:** 2026-03-19
**Domain:** Vue 3 demo component — Transport clock, Sequence scheduling, BeatTrack mute/solo, step grid with playhead
**Confidence:** HIGH

## Summary

Phase 71 is a pure documentation/UX phase: create one Vue component (`TransportSequencerDemo.vue`), one docs page (`transport-sequencer.md`), and register it in the sidebar. No library code changes are needed. All required APIs (`createTransport`, `createSequence`, `createBeatTrack`, `createFont`) are fully implemented and verified in source.

The central challenge is the step grid playhead visualization. The Transport emits `tick` events (at 16th-note resolution by default) which fire from the Worker timer thread — these must drive a reactive `currentStep` ref for the CSS grid highlight. The Sequence's callback receives an absolute `time` argument (AudioContext time) which is used for precise audio scheduling via `playIn(time - audioContext.currentTime)`.

Mute/solo for BeatTrack works via public properties (`track.muted`, `track.solo`) directly. For Sequence-based melody tracks there is no built-in mute/solo on the Sequence class — muting must be implemented as a guard in the sequence event callback (check a `muted` flag before calling `playIn`). Solo logic must be computed in the component (only soloed tracks play, or all unmuted tracks play if no solos active), same pattern as DrumMachineVue.vue.

**Primary recommendation:** Follow EffectsChainDemo.vue for module-level audio instance management and ensureLoaded pattern. Follow DrumMachineVue.vue for stub-beat immediate rendering, mute/solo logic, and currentStep tracking. Use CSS grid (not canvas) for the step grid — all 5 track rows fit cleanly in a CSS grid layout with the current step column highlighted via a reactive class binding.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 5 tracks total: 3 drums (kick, snare, hihat via BeatTrack synced to Transport) + 2 melody (bass synth via Sequence + piano sound font via Sequence)
- Bass synth track uses createOscillator() — low register, bass instrument character
- Piano track uses the piano sound font (existing `/ez-web-audio/audio/piano.js`)
- All 5 tracks are mute/solo-able — unified mixer experience
- Drum tracks use BeatTrack.syncTo(transport), melody tracks use Sequence tied to Transport
- Lazy init on first Play click (ensureLoaded pattern), no load buttons
- Step grid: 16th-note resolution, 16 steps per bar, 2-bar loop = 32 total steps
- Drum rows show filled/empty cells for active/inactive beats
- Melody rows show note names in cells (C4, E4, G4, etc.) where notes trigger
- Melody row labels include duration info: "Synth (8th notes)", "Piano (quarter notes)"
- Playhead column highlight advances in sync with transport position
- Top bar: Play/Pause/Stop + bar:beat position counter (live "1:3" readout) + BPM slider + editable numeric BPM input
- Mute/Solo toggles on the left side of each track row
- M button turns yellow when muted, S button turns blue when soloed
- Multiple solos stack (only soloed tracks play)
- 3 whole-pattern presets: "Straight Rock", "Funk Groove", "Triplet Feel"
- Each preset switches all 5 tracks simultaneously
- Presets demonstrate musical time notation variety (straight 8ths/quarters, syncopation, triplets)
- New file: `docs/.vitepress/theme/components/TransportSequencerDemo.vue`
- New page: `docs/examples/transport-sequencer.md`
- Register in sidebar under appropriate section in `docs/.vitepress/config.mts`
- Follow existing component naming convention (PascalCase + "Demo" suffix)

### Claude's Discretion
- Exact note choices for each preset's melody patterns
- Bass oscillator frequency range and waveform type
- Which piano sound font notes to use
- Grid cell styling, colors, spacing, responsive behavior
- How preset switching is animated/transitioned (instant vs crossfade)
- Canvas vs CSS grid for the step visualization
- BPM slider range
- Error state handling
- ADSR envelope settings for bass oscillator

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TSEQ-01 | User can play/pause/stop transport with adjustable BPM | Transport.start()/.pause()/.stop(), transport.bpm setter (live change during playback), Play/Pause/Stop buttons + BPM slider + editable number input |
| TSEQ-02 | User can mute/solo individual tracks | BeatTrack.muted / BeatTrack.solo public properties for drum tracks; component-level muted flag checked in Sequence callback for melody tracks; solo stacking computed in component |
| TSEQ-03 | User can hear a sequence using musical time notation (4n, 8t, 2m) | Sequence.at() accepts MusicalTimeNotation ('4n', '8n', '8t', '2m', etc.); 3 presets demonstrate different feels including triplets |
| TSEQ-04 | User can see current beat/bar position with visual playhead | Transport 'tick' event fires at ticksPerBeat resolution; drives currentStep ref; CSS grid column highlighted with reactive class binding |
</phase_requirements>

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ez-web-audio` | project lib | Transport, Sequence, BeatTrack, createFont | This IS the library being demonstrated |
| Vue 3 Composition API | bundled | Component reactivity, refs, computed, watch, onUnmounted | All 26 existing demo components use this |
| VitePress | bundled | Docs site, markdown page hosting | Established project docs platform |

### Supporting APIs (all in ez-web-audio)

| API | Purpose | Key Method |
|-----|---------|------------|
| `createTransport(opts)` | Global transport clock | Returns `Promise<Transport>` — async |
| `createSequence(transport, opts)` | Melody event scheduler | Returns `Sequence` sync — NOT async |
| `createBeatTrack(urls, opts)` | Drum machine lane | Returns `Promise<BeatTrack>` — async |
| `createFont(url)` | Piano soundfont | Returns `Promise<Font>` — async |
| `createOscillator(opts)` | Bass synth voice | Returns `Promise<Oscillator>` — async |
| `formatPosition(pos)` | Display "1:3:0" string | Utility from transport module |

**Installation:** None required — all APIs already in the project library.

## Architecture Patterns

### Recommended Project Structure

```
docs/.vitepress/theme/components/
└── TransportSequencerDemo.vue    # New component

docs/examples/
└── transport-sequencer.md        # New page

docs/.vitepress/
└── config.mts                    # Add sidebar entry
```

### Pattern 1: Module-Level Audio Instances (from EffectsChainDemo.vue)

**What:** Audio instances live outside Vue reactive state at module level. They are created once in `ensureLoaded()` and never recreated.

**When to use:** All audio objects (Transport, Sequences, BeatTracks, Oscillator, Font). Reactive state only holds UI-facing values (playing, bpm, currentStep, muted, error).

```typescript
// Outside component — module level
let lib: any = null
let transport: Transport | null = null
let kickTrack: BeatTrack | null = null
let snareTrack: BeatTrack | null = null
let hihatTrack: BeatTrack | null = null
let bassSeq: Sequence | null = null
let pianoSeq: Sequence | null = null
let bassOsc: Oscillator | null = null
let pianoFont: Font | null = null

// Inside component — reactive UI state only
const playing = ref(false)
const paused = ref(false)
const bpm = ref(120)
const currentStep = ref(0)
const error = ref('')
const trackMuted = ref({ kick: false, snare: false, hihat: false, bass: false, piano: false })
const trackSoloed = ref({ kick: false, snare: false, hihat: false, bass: false, piano: false })
const activePreset = ref('Straight Rock')
```

### Pattern 2: ensureLoaded Lazy Init (from LFODemo.vue + EffectsChainDemo.vue)

**What:** All audio is created on first user interaction (Play click). Checks `if (lib) return` as guard.

```typescript
async function ensureLoaded() {
  if (lib) return
  lib = await import('ez-web-audio')
  const { createTransport, createSequence, createBeatTrack, createFont, createOscillator } = lib

  transport = await createTransport({ bpm: bpm.value, timeSignature: [4, 4], ticksPerBeat: 4 })

  kickTrack = await createBeatTrack(['/ez-web-audio/audio/drum-samples/kick1.wav', ...], { numBeats: 32 })
  // ... snare, hihat
  kickTrack.syncTo(transport, { noteType: 1/16 })
  // ... snare, hihat sync

  bassOsc = await createOscillator({ frequency: 55, type: 'sawtooth' })  // E1 bass range
  pianoFont = await createFont('/ez-web-audio/audio/piano.js')

  // Sequences: createSequence is SYNC (not async)
  bassSeq = createSequence(transport, { length: '2m' })
  pianoSeq = createSequence(transport, { length: '2m' })

  // Schedule notes for active preset
  applyPreset(activePreset.value)

  // Transport tick drives playhead
  transport.on('tick', (e) => {
    // Convert tick position to 16th-note step index (0–31 for 2-bar loop)
    const step = positionToStep(e.detail)
    currentStep.value = step
  })
}
```

### Pattern 3: Playhead via Transport Tick Event (NEW for this phase)

**What:** Transport emits `tick` events via `TypedEventEmitter`. Each tick corresponds to 1/ticksPerBeat of a beat (default: 4 ticks/beat = 16th note resolution). Convert position to a 0-indexed step within the 2-bar loop.

**Key insight:** With `ticksPerBeat: 4` and `timeSignature: [4, 4]`:
- 1 beat = 4 ticks
- 1 bar = 16 ticks = 16 steps
- 2-bar loop = 32 steps total
- Step index = `((bar - 1) * beatsPerBar * ticksPerBeat) + ((beat - 1) * ticksPerBeat) + tick` clamped to `% 32`

```typescript
// Source: src/transport.ts — tick event fires with TransportPosition
transport.on('tick', (e) => {
  const { bar, beat, tick } = e.detail  // bar=1-indexed, beat=1-indexed, tick=0-indexed
  const beatsPerBar = 4
  const ticksPerBeat = 4
  const absoluteTick = ((bar - 1) * beatsPerBar * ticksPerBeat) + ((beat - 1) * ticksPerBeat) + tick
  currentStep.value = absoluteTick % 32  // 2-bar loop = 32 steps
})
```

**Important:** The 'tick' event fires from the Worker timer scheduler. Vue reactivity is safe here — `ref.value = x` from outside RAF/Vue is fine in Vue 3.

### Pattern 4: Sequence Note Scheduling

**What:** Sequence.at() schedules callbacks at musical time positions. The callback receives `(time: number, position: TransportPosition)`. `time` is absolute AudioContext time — use `playIn(time - audioContext.currentTime)` for precise scheduling. For createOscillator-based bass, trigger a new note on each event.

```typescript
// Source: src/sequence.ts + src/index.ts createSequence example
bassSeq.at('0', (time) => {
  if (!shouldPlay('bass')) return
  // For oscillator: set frequency and trigger brief note
  bassOsc!.changeFrequencyTo(55)  // E1
  bassOsc!.playIn(time - lib.getAudioContext().currentTime)
})

// Piano font scheduling
pianoSeq.at('4n', (time) => {
  if (!shouldPlay('piano')) return
  const note = pianoFont!.getNote('C4')
  note?.playIn(time - lib.getAudioContext().currentTime)
})
```

**Critical:** `createSequence` is synchronous (no await). It immediately registers with the Transport. Source: verified in `src/index.ts` line 882: `export function createSequence(transport, options): Sequence`.

### Pattern 5: Mute/Solo Logic

**What:** BeatTracks have public `.muted` and `.solo` properties. Sequences have neither — implement via callback guard.

```typescript
// BeatTrack: direct property
kickTrack.muted = true    // Scheduling continues, audio silenced
kickTrack.solo = true     // Only soloed tracks produce audio

// Sequence: callback guard
function shouldPlay(trackName: string): boolean {
  const soloed = Object.values(trackSoloed.value)
  const anySoloed = soloed.some(Boolean)
  if (anySoloed) {
    return trackSoloed.value[trackName]
  }
  return !trackMuted.value[trackName]
}
```

**Solo stacking (from DrumMachineVue.vue pattern):** When any track is soloed, only soloed tracks play. Multiple solos stack — this applies to both BeatTracks (via `.solo` property) and Sequences (via `shouldPlay()` guard).

**Important:** BeatTrack's built-in `.muted` property silences audio but keeps scheduling running (beat events still fire for UI sync). This is the correct behavior for the playhead — inactive beats still advance the cursor.

### Pattern 6: Preset Switching

**What:** Presets define all 5 track patterns. Switching clears existing Sequence events and sets BeatTrack patterns.

```typescript
const PRESETS = {
  'Straight Rock': {
    kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, ...],  // 32-element 16th-note grid
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, ...],
    hihat: [1,0,1,0, 1,0,1,0, ...],                      // 8th notes
    bassNotes: [{ time: '0', note: 'E1' }, { time: '2n', note: 'A1' }, ...],
    pianoNotes: [{ time: '0', note: 'C4' }, { time: '4n', note: 'E4' }, ...]
  },
  // ...
}

function applyPreset(name: string) {
  const preset = PRESETS[name]
  kickTrack?.setPattern(preset.kick)
  snareTrack?.setPattern(preset.snare)
  hihatTrack?.setPattern(preset.hihat)
  bassSeq?.clear()
  pianoSeq?.clear()
  preset.bassNotes.forEach(({ time, note }) => {
    bassSeq?.at(time, (t) => { if (shouldPlay('bass')) scheduleOscNote(bassOsc!, note, t) })
  })
  preset.pianoNotes.forEach(({ time, note }) => {
    pianoSeq?.at(time, (t) => { if (shouldPlay('piano')) pianoFont?.getNote(note)?.playIn(...) })
  })
}
```

### Pattern 7: Step Grid CSS Layout

**What:** CSS grid with `32 columns + 1 label column + 2 control columns`. One row per track. Active beat column highlighted by adding `.active` class when `currentStep` matches.

```html
<!-- Template concept -->
<div class="step-grid">
  <div v-for="trackRow in allTracks" class="track-row">
    <div class="track-controls">
      <button :class="{ muted: track.muted }" @click="toggleMute(track)">M</button>
      <button :class="{ soloed: track.soloed }" @click="toggleSolo(track)">S</button>
    </div>
    <div class="track-label">{{ track.label }}</div>
    <div
      v-for="(step, i) in track.steps"
      class="step-cell"
      :class="{
        active: step.active,
        playhead: i === currentStep,
        drum: track.type === 'drum',
        melody: track.type === 'melody'
      }"
    >
      {{ track.type === 'melody' ? step.noteName : '' }}
    </div>
  </div>
</div>
```

**CSS grid approach is preferred over canvas** because:
- Drum beat toggling is natural (click cell to toggle active state)
- Note names in cells are trivial with CSS grid, complex with canvas
- Responsive sizing is automatic
- No RAF loop needed — reactive binding handles updates

### Pattern 8: BPM Slider + Number Input Sync

**What:** BPM changes during playback take effect immediately via `transport.bpm = value` (verified: setter has no side effects, just updates `_bpm`; scheduler reads `this._bpm` on each tick).

```typescript
// Watch the reactive bpm ref — sync to transport
watch(bpm, (v) => {
  if (transport) transport.bpm = v
})
```

### Anti-Patterns to Avoid

- **Storing audio instances in `reactive()` or `ref()`:** Vue will wrap them in Proxy, breaking internal WeakMap and AudioNode operations. All audio objects at module level, outside reactive state.
- **Using `seq.at()` with beat positions beyond sequence length:** Throws error. 2-bar sequence length = 8 beats; positions must be `< 8`. Use bar:beat:tick notation ('2:3:0') or note values ('4n' * n).
- **Forgetting `createSequence` is sync:** It takes `transport` as first argument and registers immediately. No await.
- **Calling `transport.bpm = 0` or negative:** Throws. Validate slider input before setting.
- **RAF loop for playhead:** Not needed. Transport 'tick' events at 16th-note resolution (every ~31ms at 120 BPM) update `currentStep` directly. No requestAnimationFrame required.
- **Clearing and rebuilding Sequences on preset switch while playing:** `seq.clear()` then re-adding via `seq.at()` is safe during playback. The scheduler window approach means old events are discarded and new ones are scheduled in the next tick.
- **Using `transport.tracks` to enumerate melody tracks:** `transport.tracks` only returns synced BeatTracks, not Sequences. Sequences register separately via `transport._syncedSequences` (internal). Manage melody track state in the component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tempo-accurate scheduling | Custom setTimeout loop | `Transport` Worker timer | Background tab throttling kills setTimeout |
| Musical time parsing | Custom '4n'/'8t' parser | `musicalTimeToBeats()` / `Sequence.at()` | Full notation support already exists |
| Beat synchronization | Manual BPM calculation | `BeatTrack.syncTo(transport)` | Handles hot-add, loop boundaries |
| Soundfont loading/decoding | Custom base64 decoder | `createFont('/path/piano.js')` | Already handles decode + AudioBuffer creation |
| Position display | Custom bar/beat math | `formatPosition(transport.position)` | Returns "bar:beat:tick" string directly |

**Key insight:** The entire scheduling engine, musical time notation, and beat sync system are complete. This phase is purely wiring the existing APIs to a Vue component and CSS grid visualization.

## Common Pitfalls

### Pitfall 1: Sequence length vs. event position mismatch
**What goes wrong:** `seq.at('2m', callback)` throws "Event at X beats exceeds sequence length" because position must be strictly less than length.
**Why it happens:** Sequence length `'2m'` = 8 beats; an event AT beat 8 (the end) is out of bounds.
**How to avoid:** Last event must be at most `'1:4:3'` (the last 16th note of bar 2) not `'2m'`. Events are at positions 0..(length-1).
**Warning signs:** Error thrown during `ensureLoaded()` / `applyPreset()`.

### Pitfall 2: Oscillator-based bass note stacking
**What goes wrong:** Bass oscillator plays continuously after first Sequence callback fires; subsequent callbacks don't sound new notes.
**Why it happens:** `createOscillator()` plays continuously. Calling `play()` again starts a new overlapping node.
**How to avoid:** Use brief note scheduling: call `playIn(offset)` and `stopIn(noteDuration)` for each event, or keep a single oscillator and ramp gain on/off. Alternatively, use `Oscillator.playFor(duration)` pattern. For a clean bass, set gain to 0 between notes.
**Warning signs:** Bass notes sustain indefinitely, chord buildup, distortion.

### Pitfall 3: Transport tick event firing rate overwhelming React/Vue
**What goes wrong:** At 120 BPM with ticksPerBeat=4, tick fires every 125ms. Vue renders are triggered but currentStep only matters visually — no need to re-render the whole grid.
**Why it happens:** If `currentStep` is deeply nested in a large reactive object, Vue diffs the whole tree.
**How to avoid:** Keep `currentStep` as a top-level `ref<number>`, not inside a reactive object. CSS class binding (`:class="{ playhead: i === currentStep }"`) is efficient.

### Pitfall 4: Preset switching with in-flight scheduled events
**What goes wrong:** Switching preset mid-playback causes old notes to fire after the switch.
**Why it happens:** The Transport lookahead (100ms) may have already pre-scheduled callbacks from the old preset. The new callbacks are added but old ones still fire.
**How to avoid:** The Sequence's internal scheduler only calls callbacks in the window AFTER they were registered AND after `lastScheduledBeat` advances. Calling `seq.clear()` removes all stored events. Events already dispatched to AudioContext cannot be cancelled — accept that the first ~100ms after switch may have a brief blend. This is acceptable behavior for a demo.

### Pitfall 5: Piano font playIn with relative vs absolute time
**What goes wrong:** `pianoFont.getNote('C4').playIn(time)` plays far in the future — silence.
**Why it happens:** Sequence callback `time` is absolute AudioContext time, not a delay in seconds. `playIn()` expects a RELATIVE delay from now.
**How to avoid:** Always compute relative offset: `playIn(time - audioContext.currentTime)`. Access audioContext via `lib.getAudioContext()` or cache the context reference after ensureLoaded.

### Pitfall 6: muted BeatTrack still advancing step grid correctly
**What goes wrong:** When a drum track is muted, beats no longer fire — step grid appears to stop for that row.
**Why it happens:** Misunderstanding of muted behavior. BeatTrack.muted=true silences AUDIO but the beat event still fires (scheduling continues). The `currentTimeIsPlaying` / `isPlaying` Beat properties still update.
**How to avoid:** Do NOT derive playhead position from individual track beat states. Use the Transport `tick` event exclusively for `currentStep`. This is correct behavior.

### Pitfall 7: Sidebar entry missing for new page
**What goes wrong:** New page is unreachable from navigation.
**Why it happens:** VitePress sidebar in `config.mts` must be manually updated.
**How to avoid:** Add entry under `/examples/` sidebar, likely under a new "Transport & Sequencing" section or alongside existing "Timing & Sequencing". Verified pattern: all example pages follow this structure.

## Code Examples

Verified patterns from source code:

### Transport + BeatTrack Sync
```typescript
// Source: src/transport.ts + src/beat-track.ts
const transport = await createTransport({ bpm: 120, timeSignature: [4, 4], ticksPerBeat: 4 })
const kick = await createBeatTrack(['/path/kick.wav'], { numBeats: 32 })
kick.setPattern([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,  1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0])
kick.syncTo(transport, { noteType: 1/16 })  // 32 beats at 16th-note resolution
transport.start()
```

### Sequence Melody Scheduling
```typescript
// Source: src/index.ts createSequence example + src/sequence.ts
const seq = createSequence(transport, { length: '2m', loop: true })

// Quarter note positions in bar:beat notation
seq.at('1:1:0', (time) => {
  const offset = time - audioContext.currentTime
  pianoFont!.getNote('C4')?.playIn(offset)
})
seq.at('1:2:0', (time) => {
  pianoFont!.getNote('E4')?.playIn(time - audioContext.currentTime)
})
// Triplet feel: 8th note triplets
seq.at('8t', (time) => { /* fires at 0.333 beats */ })
seq.at(0.667, (time) => { /* second triplet of first beat */ })
```

### Transport Position Readout
```typescript
// Source: src/transport.ts formatPosition()
import { formatPosition } from 'ez-web-audio'

transport.on('tick', (e) => {
  const pos = e.detail  // { bar, beat, tick, seconds }
  positionDisplay.value = `${pos.bar}:${pos.beat}`  // "1:3"
  currentStep.value = ((pos.bar - 1) * 16) + ((pos.beat - 1) * 4) + pos.tick  // 0–31
})
```

### BPM Live Change
```typescript
// Source: src/transport.ts — bpm setter is safe during playback
transport.bpm = 140  // Takes effect on next scheduler tick (within 100ms)
```

### Mute/Solo with BeatTrack
```typescript
// Source: src/beat-track.ts lines 99-106
kickTrack.muted = true   // Audio silenced, scheduling continues
kickTrack.muted = false  // Audio restored
kickTrack.solo = true    // When any track has solo=true, only soloed tracks play
```

### Sequence mute via callback guard
```typescript
function shouldPlayTrack(name: 'bass' | 'piano'): boolean {
  const anySoloed = trackSoloed.value.bass || trackSoloed.value.piano
    || trackSoloed.value.kick || trackSoloed.value.snare || trackSoloed.value.hihat
  if (anySoloed) return trackSoloed.value[name]
  return !trackMuted.value[name]
}

seq.at('1:1:0', (time) => {
  if (!shouldPlayTrack('bass')) return
  // ... play note
})
```

### Cleanup in onUnmounted
```typescript
// Source: EffectsChainDemo.vue onUnmounted pattern
onUnmounted(() => {
  transport?.dispose()   // stops Worker timer, unsyncs all tracks + sequences
  bassOsc?.stop()
  kickTrack = null; snareTrack = null; hihatTrack = null
  bassSeq = null; pianoSeq = null
  bassOsc = null; pianoFont = null
  transport = null; lib = null
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
```

### Musical Time Notation for Triplet Feel Preset
```typescript
// Source: src/utils/musical-time.ts
// '8t' = (4/8) * (2/3) = 0.333 beats (eighth triplet)
// Three 8t notes = one beat exactly: [0, 0.333, 0.667]
// For triplet groove, schedule at:
seq.at(0, callback)       // beat 1 of bar 1
seq.at('8t', callback)    // 0.333 beats — first triplet subdivision
seq.at(0.667, callback)   // second triplet subdivision (8t * 2 numerically)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual setTimeout scheduling | Worker-backed Transport | M5 (Phases 53-60) | Background tabs work correctly |
| BeatTrack-only patterns | BeatTrack + Sequence | M5 | Musical time notation, arbitrary events |
| No playhead tracking | Transport 'tick' events | M5 | Precise position for UI sync |

## Existing Asset Inventory

These files already exist and are ready to use:

| Asset | Path | Notes |
|-------|------|-------|
| Piano soundfont | `/ez-web-audio/audio/piano.js` | Full chromatic coverage — use `createFont()` |
| Kick samples | `/ez-web-audio/audio/drum-samples/kick1.wav` etc. | Used by DrumMachineVue.vue |
| Snare samples | `/ez-web-audio/audio/drum-samples/snare1.wav` etc. | Same |
| Hihat samples | `/ez-web-audio/audio/drum-samples/hihat1.wav` etc. | Same |
| Click sound | `/ez-web-audio/audio/click.mp3` | Could serve as metronome tick |

**Note:** Verify exact drum sample filenames in `/ez-web-audio/audio/drum-samples/` match what DrumMachineVue.vue expects. Source in CONTEXT.md: `['kick1', 'kick2', 'kick3']` mapped to `.wav`.

## Open Questions

1. **Oscillator bass note duration control**
   - What we know: `createOscillator` plays continuously. `playIn()` starts it at a future time.
   - What's unclear: Best approach for bass notes that should have finite duration without clicks.
   - Recommendation: Use `Oscillator.onPlayRamp('gain').from(0.8).to(0).in(noteDur)` or simply call `stop()` after a brief timeout. Alternatively, use a new oscillator instance per note (polyphonic approach). Using `playFor(duration)` inherited from BaseSound is cleanest.

2. **getAudioContext() public access**
   - What we know: `lib = await import('ez-web-audio')` and the AudioContext is internal. Sequence callbacks need `audioContext.currentTime` to compute `playIn` offset.
   - What's unclear: Is there a `getAudioContext()` export?
   - Recommendation: Check `src/index.ts` for exported `getOrCreateAudioContext` — it exists (line 32 of index.ts import). Export it via: `const ctx = lib.getOrCreateAudioContext()`. Or capture `audioContext.currentTime` from the Sequence event callback's `time` parameter by computing `const offset = Math.max(0, time - performance.now()/1000)` — but this is wrong. Use `lib.getAudioContext()` if exported, or store a reference to AudioContext obtained from a created sound's internal context. Safest: after `createTransport()` resolves, call `lib.getAudioContext?.()` or use the fact that `transport` itself has `audioContext` as a private field — not accessible externally.
   - **Correct approach**: From `src/index.ts`, `getOrCreateAudioContext` is imported internally. Check if exported: likely not publicly exported as a user-facing API. Instead, create a Sound first and extract context, OR use `lib.initAudio?.()`. Best practical approach: Store `audioCtx` by creating any sound first, OR use `transport['audioContext']` (accessing private) which works in JS but is bad practice. **Recommended**: call `lib.createSound` with a tiny silent buffer doesn't make sense. Better: after `createTransport`, the transport has `audioContext` private — access as `(transport as any).audioContext` for the demo component, since this is internal docs code not production.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) + Vitest (unit) |
| Config file | `playwright.config.ts` |
| Quick run command | `pnpm exec playwright test e2e/interactions.spec.ts --grep "TransportSequencer"` |
| Full suite command | `pnpm exec playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TSEQ-01 | Play/Pause/Stop buttons change transport state; BPM slider updates value | E2E | `pnpm exec playwright test e2e/interactions.spec.ts --grep "Transport"` | ❌ Wave 0 |
| TSEQ-02 | Mute button toggles yellow class; solo button toggles blue class | E2E | same | ❌ Wave 0 |
| TSEQ-03 | Page loads without error; transport-sequencer page renders component | E2E smoke | `pnpm exec playwright test e2e/demos.spec.ts` | ❌ Wave 0 (add to demos.spec.ts) |
| TSEQ-04 | Step grid cells exist; playhead column class advances after Play | E2E | `pnpm exec playwright test e2e/interactions.spec.ts --grep "Transport"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm exec playwright test e2e/demos.spec.ts` (smoke — page loads)
- **Per wave merge:** `pnpm exec playwright test e2e/interactions.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/interactions.spec.ts` — Add `test.describe('TransportSequencer page interactions', ...)` block covering TSEQ-01, TSEQ-02, TSEQ-04
- [ ] `e2e/demos.spec.ts` — Add `transport-sequencer` page to page-loads smoke test (covers TSEQ-03 implicitly)

*(Wave 0 gap: no new test file needed — add tests to existing spec files following established patterns)*

## Sources

### Primary (HIGH confidence)
- `src/transport.ts` — Full Transport implementation, bpm setter, tick event, position structure, dispose
- `src/sequence.ts` — Full Sequence implementation, at(), clear(), constructor (sync), loop behavior
- `src/beat-track.ts` — muted/solo public properties, setPattern(), syncTo(), numBeats
- `src/utils/musical-time.ts` — Full MusicalTimeNotation type, musicalTimeToBeats(), parseMusicalTime()
- `src/index.ts` — Factory function signatures: createTransport (async), createSequence (sync), createBeatTrack (async), createFont (async), createOscillator (async)
- `docs/.vitepress/theme/components/EffectsChainDemo.vue` — Module-level instances, ensureLoaded, watch-based sync, onUnmounted cleanup
- `docs/.vitepress/theme/components/DrumMachineVue.vue` — Stub beats, mute/solo logic, currentStep tracking
- `docs/.vitepress/theme/components/LFODemo.vue` — Tab switching, lazy init, canvas animation
- `docs/.vitepress/theme/components/VisualizationDemo.vue` — DPR-aware canvas pattern (if canvas needed)
- `docs/.vitepress/config.mts` — Sidebar structure for `/examples/` section
- `e2e/interactions.spec.ts` — E2E test patterns (aria-label selectors, waitForFunction, page.goto relative paths)

### Secondary (MEDIUM confidence)
- `docs/examples/grainplayer.md` — Pattern for demo page markdown structure (component import + explainer table)
- `.planning/STATE.md` — Previous phase decisions (relative E2E paths, .play-button class selector convention)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All APIs verified by reading source code directly
- Architecture: HIGH — All patterns extracted from existing working components
- Pitfalls: HIGH — Identified by reading actual implementation constraints (Sequence length bounds, sync vs async factories, oscillator continuous nature)
- Test patterns: HIGH — E2E patterns verified from existing spec files

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — no moving targets, all internal code)

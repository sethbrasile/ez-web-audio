# Phase 71: Transport + Sequencer Demo - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive demo page showing Transport + Sequencer in action — BPM-synced transport controlling multiple tracks (drums via BeatTrack + melody via Sequence), mute/solo per track, visual step grid with playhead, and switchable pattern presets demonstrating different musical time notations. Pure documentation/UX work — no library code changes.

</domain>

<decisions>
## Implementation Decisions

### Track Composition
- 5 tracks total: 3 drums (kick, snare, hihat via BeatTrack synced to Transport) + 2 melody (bass synth via Sequence + piano sound font via Sequence)
- Bass synth track uses createOscillator() — low register, bass instrument character
- Piano track uses the piano sound font (existing Db5.mp3/Eb5.mp3 samples or createFont)
- All 5 tracks are mute/solo-able — unified mixer experience
- Drum tracks use BeatTrack.syncTo(transport), melody tracks use Sequence tied to Transport
- Lazy init on first Play click (ensureLoaded pattern), no load buttons

### Step Grid & Playhead
- Step grid visualization: grid of cells per track with the current beat column highlighted as it advances
- 16th-note resolution: 16 steps per bar
- 2-bar loop: 32 total steps
- Drum rows show filled/empty cells for active/inactive beats
- Melody rows show note names in cells (C4, E4, G4, etc.) where notes trigger — visually informative
- Melody row labels include duration info: "Synth (8th notes)", "Piano (quarter notes)"
- Playhead column highlight advances in sync with transport position

### Transport Controls Layout
- Top bar: Play/Pause/Stop buttons + bar:beat position counter (live "1:3" readout) + BPM slider with editable numeric input
- BPM slider has a number input beside it for precise BPM entry (type exact values like '132')
- Mute/Solo toggles on the left side of each track row in the step grid — contextual to the track they control
- M button turns yellow when muted, S button turns blue when soloed — standard DAW color convention
- Multiple solos stack (only soloed tracks play)

### Pattern Presets
- 3 whole-pattern presets that switch all 5 tracks simultaneously: "Straight Rock", "Funk Groove", "Triplet Feel"
- Each preset is a curated musical phrase showcasing different note durations and rhythmic feels
- Switching presets changes drum patterns AND melody sequences — cohesive musical arrangements
- Presets demonstrate the musical time notation variety: straight 8ths/quarters, syncopation, triplets (8t/4t)

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

</decisions>

<specifics>
## Specific Ideas

- Bass synth track must sound like a bass instrument — low register oscillator, not a lead synth
- The 3 presets serve as musical showcases of the Sequencer's time notation flexibility — straight feel vs funk vs triplet
- Step grid is the centerpiece — it shows patterns, playhead position, and mute/solo state all in one view
- Note names in melody cells make the musical content immediately readable — "C4" not just a filled box

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EffectsChainDemo.vue`: Module-level instances outside reactive state, `ensureLoaded()` pattern, watch-based parameter sync — direct pattern for Transport/Sequence instance management
- `LFODemo.vue`: Tab-like switching with seamless audio transition — reference for preset switching
- `VisualizationDemo.vue`: DPR-aware canvas, requestAnimationFrame loop — pattern if canvas-based grid is chosen
- `createTransport()` factory: async, returns Transport with `.start()/.stop()/.pause()/.resume()`, `.bpm` setter, `.position` getter
- `createSequence()` factory: sync, returns Sequence with `.at(time, callback)`, `.length`, `.loop`
- `BeatTrack.syncTo(transport, { noteType })`: syncs a BeatTrack to Transport, `.muted`/`.solo` properties
- `Transport.tracks`: read-only array of synced BeatTracks
- `parseMusicalTime()` / `MusicalTimeNotation`: standalone utility for '4n', '8t', '2m' notation
- Existing audio: `click.mp3`, `Db5.mp3`, `Eb5.mp3` in `/ez-web-audio/audio/`

### Established Patterns
- Lazy init: `if (!lib) { lib = await import('ez-web-audio') }` on first user interaction
- Ref-based state: `const playing = ref(false)`, `const loading = ref(false)`, `const error = ref('')`
- Cleanup: `onUnmounted()` stops audio, cancels animation frames, disposes resources
- Module-level audio instances (outside reactive state) created once in `ensureLoaded()`

### Integration Points
- New file: `docs/.vitepress/theme/components/TransportSequencerDemo.vue`
- New page: `docs/examples/transport-sequencer.md`
- Register in sidebar nav under appropriate section in `docs/.vitepress/config.mts`
- Follow existing component naming convention (PascalCase + "Demo" suffix)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 71-transport-sequencer-demo*
*Context gathered: 2026-03-19*

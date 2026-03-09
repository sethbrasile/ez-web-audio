# Phase 68: PolySynth Demo - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive demo page showing polyphonic voice allocation with a piano keyboard. Users play chords, observe voice count, trigger voice stealing across different strategies, and adjust ADSR envelopes. Pure documentation/UX work — no library code changes.

</domain>

<decisions>
## Implementation Decisions

### Voice Allocation Display
- Voice count badge with fill bar: "Voices: 3 / 8 [███░░░░░]"
- Right-aligned above the keyboard, in the controls area
- Brief text flash on voice steal events: "⚠ Voice stolen (oldest)" — fades after ~1 second
- Steal strategy dropdown placed next to the voice counter badge

### Steal Strategy Switching
- Dropdown selector next to voice counter: oldest / quietest / newest
- Changing strategy while voices are playing has no immediate effect — applies on next steal only
- User skipped discussing this area separately; strategy UI is covered by voice display decisions

### ADSR Controls
- Reuse SynthKeyboard.vue pattern: 4 individual sliders (Attack, Decay, Sustain, Release) + preset buttons (Piano, Pad, Pluck, Lead)
- Include waveform type selector (sine, triangle, sawtooth, square) alongside ADSR
- All controls positioned above the keyboard — top-to-bottom flow: configure → play
- ADSR and waveform changes apply only to NEW notes — already-playing voices are not affected

### Max Voices Configuration
- Adjustable slider: 1–8 voices, placed near voice counter and strategy dropdown
- 1 voice = monophonic mode (every new note steals), great for demonstrating steal behavior
- Reducing max voices below current active count immediately steals excess voices (per current strategy)
- Default: 4 voices (easy to trigger stealing with computer keyboard)

### Claude's Discretion
- Exact keyboard range (PianoKeyboard startNote/endNote)
- Controls section styling and spacing
- Fill bar visual design (colors, animation)
- Steal notification exact styling and fade timing
- Master gain/volume control (if needed)
- Error state handling
- Whether to include a volume warning (SynthKeyboard has one)

</decisions>

<specifics>
## Specific Ideas

- Monophonic mode (max voices = 1) as a teaching moment — every note steals, making the concept immediately obvious
- Voice counter + strategy dropdown + max voices slider grouped together as a "voice management" cluster, visually distinct from ADSR/waveform controls
- Presets serve as quick starting points: "Piano" for short notes that release fast, "Pad" for sustained chords that fill the voice pool

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PianoKeyboard.vue`: Standalone keyboard component with noteOn/noteOff events, computer keyboard mapping (A-L keys), multi-touch support — direct reuse
- `SynthKeyboard.vue`: ADSR presets (piano/pad/pluck/lead), waveform selector, envelope sliders — pattern to copy
- `createPolySynth()` factory in `src/index.ts` — the API being demoed
- `PolySynth.activeVoices` / `PolySynth.availableVoices` getters — feed the voice counter display
- `voicestolen` event on PolySynth — triggers the steal notification flash
- `frequencyMap` utility — note name to frequency lookup for keyboard → PolySynth.play()

### Established Patterns
- Lazy init: `if (!lib) { lib = await import('ez-web-audio') }` on first user interaction
- Ref-based state: `const playing = ref(false)`, `const loading = ref(false)`, `const error = ref('')`
- Cleanup: `onUnmounted()` stops audio, disposes resources
- PianoKeyboard integration: parent handles noteOn/noteOff, passes activeKeys Set for visual feedback

### Integration Points
- New file: `docs/.vitepress/theme/components/PolySynthDemo.vue`
- New page: `docs/examples/polysynth.md`
- Register in sidebar nav (docs config)
- Follow existing component naming convention (PascalCase + "Demo" suffix)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 68-polysynth-demo*
*Context gathered: 2026-03-09*

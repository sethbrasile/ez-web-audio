---
phase: 09-interactive-examples
plan: 02
subsystem: Interactive Examples
tags:
  - vue-components
  - piano-keyboard
  - synthesizer
  - adsr-envelope
  - polyphonic
dependency_graph:
  requires:
    - VitePress theme setup
    - ez-web-audio library
  provides:
    - PianoKeyboard.vue (shared component)
    - SynthKeyboard.vue (polyphonic synth)
    - synth-keyboard.md (example page)
  affects:
    - Future plans 03, 05 (will reuse PianoKeyboard)
tech_stack:
  added:
    - PianoKeyboard component (reusable UI)
  patterns:
    - Computer keyboard mapping (A-K keys)
    - Mouse drag across keys for playing
    - Touch event handling
    - Polyphonic oscillator management with Map
    - ADSR preset system
key_files:
  created:
    - docs/.vitepress/theme/components/PianoKeyboard.vue
    - docs/.vitepress/theme/components/SynthKeyboard.vue
    - docs/examples/synth-keyboard.md
  modified: []
decisions:
  - Use flat notation (Db, Eb) to match frequencyMap structure
  - Extract PianoKeyboard as shared component (reused by SoundfontPiano in Plan 05)
  - Use Set for activeKeys tracking (efficient add/delete operations)
  - Map for oscillator management (O(1) note lookup)
  - Prevent keyboard repeat with pressedKeys Set
  - Component-first page layout (demo before code)
metrics:
  tasks_completed: 2
  files_created: 3
  duration_minutes: 4
  commits: 2
  completed_date: 2026-02-14
---

# Phase 09 Plan 02: Piano Keyboard & Synth Keyboard Summary

Built the shared PianoKeyboard component and polyphonic SynthKeyboard with ADSR controls.

## What Was Built

### PianoKeyboard.vue - Reusable Piano UI Component
A pure UI component that renders a visual piano keyboard (C4-C5 octave) with multi-modal input:

**Input methods:**
- Mouse: click to play, drag across keys
- Touch: tap keys, supports multi-touch
- Computer keyboard: A-K keys (W, E, T, Y, U for sharps)

**Features:**
- Emits noteOn/noteOff events for parent components
- Visual feedback with active state styling
- No ez-web-audio dependency (pure UI)
- Black keys positioned absolutely over white keys
- Key repeat prevention for keyboard input

**Design decisions:**
- 40px white keys, 28px black keys
- VitePress CSS variables for theming
- Flat notation (Db instead of C#) to match frequencyMap
- Extracted as shared component for reuse by SoundfontPiano (Plan 05)

### SynthKeyboard.vue - Polyphonic Synthesizer
An interactive polyphonic synthesizer that creates oscillators on demand:

**Controls:**
- Waveform selector: sine, triangle, square, sawtooth
- Volume slider: 0-100%
- ADSR envelope sliders: attack (0-2s), decay (0-2s), sustain (0-1), release (0-3s)
- Preset buttons: Piano, Pad, Pluck, Lead

**Features:**
- Polyphonic playback (multiple notes simultaneously)
- Map-based oscillator management (O(1) note lookup)
- Dynamic import for SSR safety
- initAudio() on first interaction
- Cleanup on unmount (stops all oscillators)
- Real-time current note display

**ADSR Presets:**
- Piano: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.8 }
- Pad: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 }
- Pluck: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 }
- Lead: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 }

### synth-keyboard.md - Example Page
Component-first example page with:
- Interactive demo at top
- How It Works explanation
- ADSR envelope primer
- Code examples (oscillator creation, polyphonic playback)
- API reference
- Links to related content

## Deviations from Plan

None - plan executed exactly as written.

## Technical Highlights

**Polyphonic architecture:**
```typescript
const oscillators = new Map<string, any>()

function handleNoteOn(note: string) {
  const oscillator = await createOscillator({
    frequency: frequencyMap[note],
    type: waveType.value,
    envelope: envelope.value
  })
  oscillator.play()
  oscillators.set(note, oscillator)
}

function handleNoteOff(note: string) {
  const osc = oscillators.get(note)
  if (osc) {
    osc.stop()
    oscillators.delete(note)
  }
}
```

**Computer keyboard mapping with repeat prevention:**
```typescript
const pressedKeys = ref(new Set<string>())

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const note = keyboardMap[key]

  if (note && !pressedKeys.value.has(key)) {
    pressedKeys.value.add(key)
    emit('noteOn', note)
  }
}

function handleKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const note = keyboardMap[key]

  if (note && pressedKeys.value.has(key)) {
    pressedKeys.value.delete(key)
    emit('noteOff', note)
  }
}
```

## Verification Results

All verification criteria met:

- [x] PianoKeyboard.vue has no ez-web-audio imports (pure UI)
- [x] SynthKeyboard.vue uses dynamic import for ez-web-audio
- [x] SynthKeyboard.vue has onUnmounted cleanup
- [x] synth-keyboard.md has component-first layout
- [x] VitePress builds without errors (synth-keyboard page has no dead links)

## Performance Notes

- Map-based oscillator tracking: O(1) lookup/insert/delete
- Set-based activeKeys: O(1) add/delete/has operations
- Computer keyboard event listeners: registered once on mount, cleaned up on unmount
- No re-renders during keyboard input (events emitted directly)

## Usage Impact

**For users:**
- Priority 2 example (polyphonic synth with envelope control)
- Demonstrates ADSR envelope concepts visually
- Shows how to build polyphonic instruments

**For future plans:**
- PianoKeyboard.vue will be reused by SoundfontPiano (Plan 05)
- Establishes pattern for musical instrument UI components
- ADSR preset system can be expanded in future examples

## Self-Check: PASSED

**Created files verified:**
```bash
✓ FOUND: docs/.vitepress/theme/components/PianoKeyboard.vue
✓ FOUND: docs/.vitepress/theme/components/SynthKeyboard.vue
✓ FOUND: docs/examples/synth-keyboard.md
```

**Commits verified:**
```bash
✓ FOUND: 4d13531 (PianoKeyboard component)
✓ FOUND: 8635822 (SynthKeyboard component and page)
```

**Key links verified:**
```bash
✓ SynthKeyboard imports PianoKeyboard: import PianoKeyboard from './PianoKeyboard.vue'
✓ SynthKeyboard uses dynamic import: await import('ez-web-audio')
✓ synth-keyboard.md imports component: import SynthKeyboard from '../.vitepress/theme/components/SynthKeyboard.vue'
```

All claimed files exist and commits are in git history.

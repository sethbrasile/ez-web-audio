# Interactive Examples Plan

## Goal

Bring the ember-audio project's rich interactive examples to the ez-web-audio docs site, adapted for the modern API. The ember-audio demos were a key selling point — they let people *experience* the library before reading a line of code. We want the same effect here.

## Current State

### What exists today
- **3 example pages**: Basic Playback, Synthesis, Effects
- **3 Vue components**: `AudioDemo.vue` (sound playback), `OscillatorDemo.vue` (synth), `TrackDemo.vue` (music player)
- **3 placeholder entries** in examples/index.md (Drum Machine, Layered Sounds, Audio Sprites) — no pages or components
- **2 audio files** in docs/public/audio/: `click.mp3` (12KB), `short-music.mp3` (2.1MB)

### What ember-audio had
10 interactive demos across 5 sections: simple playback, MP3 player, sampled drum kit, soundfont piano, distortion routing, timing basics, step sequencer drum machine, polyphonic synth keyboard, XY pad, and synthesized drum kit.

## Audio Assets

### Already in the project (`src/app/public/`)
These need to be **copied to `docs/public/audio/`** for the docs site:

| Asset | Path | Size | License |
|-------|------|------|---------|
| kick1.wav | drum-samples/kick1.wav | 304K | Free personal/commercial (Prezja Productions) |
| kick2.wav | drum-samples/kick2.wav | 304K | " |
| kick3.wav | drum-samples/kick3.wav | 304K | " |
| snare1.wav | drum-samples/snare1.wav | 520K | " |
| snare2.wav | drum-samples/snare2.wav | 520K | " |
| snare3.wav | drum-samples/snare3.wav | 520K | " |
| hihat1.wav | drum-samples/hihat1.wav | 301K | Private use only (Erkan Dogantimur) |
| hihat2.wav | drum-samples/hihat2.wav | 205K | " |
| hihat3.wav | drum-samples/hihat3.wav | 192K | " |
| piano.js | piano.js | 1.4MB | MIDI.js Soundfonts (public domain) |
| Db5.mp3 | Db5.mp3 | 12K | Unknown |
| Eb5.mp3 | Eb5.mp3 | 10K | Unknown |
| barely-there.mp3 | barely-there.mp3 | 9.0MB | Unknown |
| do-wah-diddy.mp3 | do-wah-diddy.mp3 | 2.1MB | Unknown |

### License concern: hihat samples
The Erkan Dogantimur cymbal/hihat samples are **"free for private use only"** — commercial use requires permission. For open-source documentation demos this is likely fine, but we should note the attribution. If this is a concern, we can synthesize hi-hat sounds instead (the synth drum kit demo does this anyway).

### Assets still needed

| Asset | Purpose | How to get it |
|-------|---------|---------------|
| Audio sprite file | Audio Sprites demo | Combine existing samples (click + drum hits) into one file with a manifest |
| Loop tracks (2-3) | Layered Sounds demo | **Need to source** — royalty-free loops (~5-10 sec each: bass, melody, percussion). Alternatively, generate with oscillators in the demo itself. |

### Asset size budget
The docs site deploys to GitHub Pages. Current docs audio is ~2.1MB. Adding drum samples (+3.1MB), piano soundfont (+1.4MB), and music tracks would push total to ~15MB+.

**Recommendation**: Skip copying `barely-there.mp3` (9MB) to docs — `short-music.mp3` already covers the Track demo. Keep docs audio under 7MB total.

Planned docs/public/audio/ structure:
```
docs/public/audio/
├── click.mp3                    (existing, 12K)
├── short-music.mp3              (existing, 2.1MB)
├── piano.js                     (copy, 1.4MB)
├── Db5.mp3                      (copy, 12K)
├── Eb5.mp3                      (copy, 10K)
└── drum-samples/
    ├── kick1.wav                (copy, 304K)
    ├── kick2.wav                (copy, 304K)
    ├── kick3.wav                (copy, 304K)
    ├── snare1.wav               (copy, 520K)
    ├── snare2.wav               (copy, 520K)
    ├── snare3.wav               (copy, 520K)
    ├── hihat1.wav               (copy, 301K)
    ├── hihat2.wav               (copy, 205K)
    ├── hihat3.wav               (copy, 192K)
    └── LICENSE.txt              (attribution for both sample packs)
```

Total new audio: ~4.6MB. Grand total with existing: ~6.7MB.

---

## New Examples (10 total: 7 new pages, 3 upgraded)

### Navigation Structure

```
Examples
├── Overview                           (existing, rewrite)
├── Audio Files
│   └── Basic Playback                 (existing, keep as-is)
├── Sampling
│   ├── Sampled Drum Kit               (NEW)
│   └── Soundfont Piano                (NEW)
├── Synthesis
│   ├── Synth Keyboard                 (NEW — replaces current synthesis page)
│   ├── XY Pad                         (NEW)
│   └── Synth Drum Kit                 (NEW)
├── Timing & Sequencing
│   ├── Timing Basics                  (NEW)
│   └── Drum Machine                   (NEW)
└── Effects & Routing
    ├── Effects                        (existing, add interactive component)
    └── Audio Routing                  (NEW)
```

Removed from plan: Layered Sounds and Audio Sprites placeholders. These can be added later once we source loop audio / build the sprite file. No point blocking the main work on asset sourcing.

---

## Example Specifications

### 1. Drum Machine (Step Sequencer)
**File**: `docs/examples/drum-machine.md`
**Component**: `docs/.vitepress/theme/components/DrumMachine.vue`
**Priority**: 1 (most impressive, unique to this library)

**What it does**:
- 3 lanes (kick, snare, hihat) × 16 step grid
- Click cells to toggle beats on/off (active state)
- Play/Stop button starts/stops the sequence loop
- BPM slider (60–200, default 120)
- Visual playhead highlighting current beat column during playback
- Per-track volume sliders

**API demonstrated**:
- `createBeatTrack(urls, { numBeats: 16 })`
- `beat.active` toggle
- `beatTrack.playActiveBeats(bpm, noteType)`
- `beatTrack.stopAll()`

**Audio**: drum-samples/ (kick1-3, snare1-3, hihat1-3)

**Design notes**:
- Grid cells: colored by instrument (kick=blue, snare=orange, hihat=yellow)
- Active cells: filled, inactive: outlined/empty
- Playing cell: bright highlight overlay
- Mobile: horizontal scroll on the grid if needed, or reduce to 8 steps on small screens

---

### 2. Synth Keyboard (Polyphonic)
**File**: `docs/examples/synth-keyboard.md`
**Component**: `docs/.vitepress/theme/components/SynthKeyboard.vue`
**Priority**: 2 (upgrade of existing synthesis page)
**Replaces**: current `docs/examples/synthesis.md` content (keep URL, replace component)

**What it does**:
- Visual piano keyboard, 1 octave (C4–B4) with black keys
- Mouse down = play, mouse up = stop (polyphonic — hold multiple)
- Touch support for mobile
- Computer keyboard mapping: A=C4, W=C#4, S=D4, E=Eb4, D=E4, F=F4, T=F#4, G=G4, Y=Ab4, H=A4, U=Bb4, J=B4, K=C5
- Waveform selector dropdown (sine, square, sawtooth, triangle)
- ADSR sliders (attack, decay, sustain, release) with preset buttons (Piano, Pad, Pluck, Lead)
- Master volume slider
- Current note name display

**API demonstrated**:
- `createOscillator({ frequency, type, envelope })`
- `frequencyMap`
- `oscillator.play()` / `oscillator.stop()`
- `changeGainTo()`

**Design notes**:
- White keys: ~40px wide, ~150px tall
- Black keys: ~28px wide, ~95px tall, positioned between whites
- Active key state: slightly darker color + subtle press animation
- Keep existing OscillatorDemo below as "Simple Oscillator" section, or remove if redundant

---

### 3. XY Pad
**File**: `docs/examples/xy-pad.md`
**Component**: `docs/.vitepress/theme/components/XYPad.vue`
**Priority**: 3 (visually striking, demonstrates real-time control)

**What it does**:
- Canvas element, responsive (fills container width, square aspect ratio, max 400px)
- Click/touch and drag to control:
  - X-axis: frequency (100–2000 Hz, logarithmic scale)
  - Y-axis: gain (0–1, exponential curve for perceptual linearity)
- Crosshair follows cursor position
- Grid lines (subtle) for visual reference
- Axis labels ("Frequency →" on bottom, "↑ Gain" on left)
- Real-time value display: frequency (Hz), gain (%), and nearest note name
- Oscillator plays continuously while mouse/touch is down
- Waveform selector (sine, square, sawtooth, triangle)

**API demonstrated**:
- `createOscillator()`
- `oscillator.update('frequency').to(value).from('value')`
- `oscillator.update('gain').to(value).from('ratio')`
- Real-time parameter modulation

**Design notes**:
- Canvas background: dark (works in both light/dark theme)
- Crosshair: bright accent color
- Grid: very subtle lines at octave boundaries on X, 0.25 increments on Y
- Note name updates as frequency changes (use frequencyMap reverse lookup)

---

### 4. Synthesized Drum Kit
**File**: `docs/examples/synth-drum-kit.md`
**Component**: `docs/.vitepress/theme/components/SynthDrumKit.vue`
**Priority**: 4 (advanced synthesis, no audio files needed)

**What it does**:
- 3 large pads: Kick, Snare, Hi-Hat — all sounds created from synthesis
- Each pad synthesizes its sound on press:
  - **Kick**: Triangle oscillator, frequency ramp 150Hz→0.01Hz in 0.1s, gain ramp 1→0 in 0.1s
  - **Snare**: Layered — triangle osc (100→60Hz "meat") + filtered white noise (highpass 1000Hz "crack")
  - **Hi-Hat**: Multiple square oscillators at harmonic ratios × 40Hz fundamental, highpass 7000Hz + bandpass 10000Hz, quick envelope
- "Bass Drop" bonus button: 10-second linear frequency sweep from 100Hz→0.01Hz
- Component breakdown buttons for snare ("Meat" and "Crack" separately) for educational purposes

**API demonstrated**:
- `createOscillator()` with filter options
- `createWhiteNoise()`
- `createLayeredSound()`
- `onPlayRamp('gain').from(x).to(y).in(duration)`
- `onPlayRamp('frequency').from(x).to(y).in(duration)`
- `onPlaySet('gain').to(value).endingAt(time)`
- `createFilterEffect()` (highpass, bandpass)
- `addEffect()`

**Design notes**:
- Pads: large (120px+ square), visually distinct colors
- Press animation on tap
- Code snippets below each pad showing how that specific sound is built
- "How it works" expandable sections explaining the synthesis technique

---

### 5. Sampled Drum Kit
**File**: `docs/examples/sampled-drum-kit.md`
**Component**: `docs/.vitepress/theme/components/SampledDrumKit.vue`
**Priority**: 5

**What it does**:
- 3 pads: Kick, Snare, Hi-Hat
- Uses `createSampler()` with 3 variations each for round-robin
- Loading state (spinner/disabled) while samples load
- Visual press feedback
- Touch + mouse support
- Counter showing which sample variation just played (educational)

**API demonstrated**:
- `createSampler([url1, url2, url3])`
- `sampler.play()`
- Round-robin concept explanation

**Audio**: drum-samples/ (kick1-3.wav, snare1-3.wav, hihat1-3.wav)

---

### 6. Timing Basics
**File**: `docs/examples/timing.md`
**Component**: `docs/.vitepress/theme/components/TimingDemo.vue`
**Priority**: 6

**What it does**:
- Section 1: "Play Now" button → `sound.play()` (immediate)
- Section 2: "Play In 1 Second" button → `sound.playIn(1)` with visual countdown
- Section 3: "Play 3 Notes" button → schedules 3 notes at staggered times using `playAt()`
  - Shows a visual timeline with markers at 0s, 0.5s, 1.0s
  - Each note highlights on the timeline when it plays
- Section 4: "Schedule a Chord" → 3 oscillators play at exact same `audioContext.currentTime` for perfect sync
- Explanatory text between each section about Web Audio timing model

**API demonstrated**:
- `sound.play()`
- `sound.playIn(seconds)`
- `sound.playAt(audioContext.currentTime + offset)`
- `getAudioContext()` (to access currentTime)

**Audio**: click.mp3 (reuse existing), Db5.mp3, Eb5.mp3

---

### 7. Audio Routing / Distortion
**File**: `docs/examples/audio-routing.md`
**Component**: `docs/.vitepress/theme/components/DistortionDemo.vue`
**Priority**: 7

**What it does**:
- Play a looping oscillator or loaded sound
- "Toggle Distortion" button to add/remove WaveShaper effect
- Distortion amount slider (controls curve intensity)
- Bypass toggle (demonstrates effect.bypass)
- Wet/dry mix slider (demonstrates effect.mix)
- Visual signal chain diagram showing: Source → [Distortion] → Gain → Pan → Output

**API demonstrated**:
- `wrapEffect(ctx, waveShaperNode)`
- `sound.addEffect()` / `sound.removeEffect()`
- `effect.bypass`
- `effect.mix`
- `getAudioContext()` for creating native WaveShaper node

---

### 8. Soundfont Piano
**File**: `docs/examples/soundfont-piano.md`
**Component**: `docs/.vitepress/theme/components/SoundfontPiano.vue`
**Priority**: 8

**What it does**:
- Visual piano keyboard (1 octave, C4–B4 with sharps)
- Loads piano.js soundfont on first interaction
- Loading indicator while soundfont decodes (~1.4MB)
- Click/touch to play notes
- Computer keyboard input (same mapping as synth keyboard)
- Note name + octave display
- Comparison text: "This uses real piano samples vs the synthesized keyboard"

**API demonstrated**:
- `createFont(url)`
- `font.play('C4')` (or however Font exposes note playback)
- Font/SampledNote properties: letter, accidental, octave, frequency

**Audio**: piano.js (1.4MB soundfont)

**Design notes**:
- Same piano keyboard visual style as SynthKeyboard for consistency
- Extract shared piano keyboard rendering into a reusable `PianoKeyboard.vue` component used by both SynthKeyboard and SoundfontPiano

---

### 9. Effects Page Upgrade
**File**: `docs/examples/effects.md` (existing, add component)
**Component**: `docs/.vitepress/theme/components/FilterDemo.vue`
**Priority**: 9 (low effort, high value — page exists but has no interactive demo)

**What it does**:
- Load a sound or oscillator
- Filter type dropdown (lowpass, highpass, bandpass, notch, etc.)
- Frequency slider (20–20000 Hz, logarithmic)
- Q/Resonance slider (0.1–20)
- Gain slider (for shelf/peaking types, -24 to +24 dB)
- Bypass toggle
- Play/Stop button
- Real-time parameter changes while playing

**API demonstrated**:
- `createFilterEffect(ctx, type, { frequency, q, gain })`
- `sound.addEffect(filter)`
- Filter parameter mutation
- `sound.rewireEffects()`

---

## Shared Components

### PianoKeyboard.vue (extract & reuse)
Both SynthKeyboard and SoundfontPiano need a piano keyboard UI. Extract a shared component:

```
Props:
  - startNote: string (default 'C4')
  - endNote: string (default 'C5')
  - activeKeys: Set<string>  (currently pressed keys, for styling)

Events:
  - @noteOn(note: string)
  - @noteOff(note: string)

Features:
  - Renders white + black keys with proper layout
  - Handles mouse/touch events (mousedown, mouseup, mouseleave, touchstart, touchend)
  - Computer keyboard input (AWSEDFTGYHUJK mapping)
  - Visual press state
  - Responsive sizing
```

---

## Updated VitePress Config

```typescript
// docs/.vitepress/config.mts sidebar update
'/examples/': [
  {
    text: 'Examples',
    items: [
      { text: 'Overview', link: '/examples/' },
      { text: 'Basic Playback', link: '/examples/basic-playback' },
    ]
  },
  {
    text: 'Sampling',
    items: [
      { text: 'Sampled Drum Kit', link: '/examples/sampled-drum-kit' },
      { text: 'Soundfont Piano', link: '/examples/soundfont-piano' },
    ]
  },
  {
    text: 'Synthesis',
    items: [
      { text: 'Synth Keyboard', link: '/examples/synth-keyboard' },
      { text: 'XY Pad', link: '/examples/xy-pad' },
      { text: 'Synth Drum Kit', link: '/examples/synth-drum-kit' },
    ]
  },
  {
    text: 'Timing & Sequencing',
    items: [
      { text: 'Timing Basics', link: '/examples/timing' },
      { text: 'Drum Machine', link: '/examples/drum-machine' },
    ]
  },
  {
    text: 'Effects & Routing',
    items: [
      { text: 'Effects', link: '/examples/effects' },
      { text: 'Audio Routing', link: '/examples/audio-routing' },
    ]
  }
]
```

---

## Component Conventions

All Vue components must follow these patterns (established by existing components):

1. **Dynamic imports** for SSR safety:
   ```typescript
   const lib = await import('ez-web-audio')
   ```

2. **initAudio() on first user interaction** — never auto-initialize

3. **Cleanup in onUnmounted()**:
   ```typescript
   onUnmounted(() => {
     // stop all sounds, clear intervals/rafs
   })
   ```

4. **VitePress CSS variables** for theming:
   ```css
   color: var(--vp-c-text-1);
   background: var(--vp-c-bg-soft);
   border: 1px solid var(--vp-c-divider);
   ```

5. **Loading states** — show loading indicator during async init/fetch

6. **Error display** — catch and display errors in the UI, don't throw to console

7. **Base path awareness** — audio URLs must use VitePress `withBase()` or hardcode `/ez-web-audio/audio/...`

---

## Implementation Order

Build in priority order. Each example is independent so they can be built in parallel, but this order maximizes impact at each step:

| Phase | Example | New Files | Depends On |
|-------|---------|-----------|------------|
| 0 | Copy audio assets to docs/public/audio/ | Asset files + LICENSE.txt | Nothing |
| 1 | Drum Machine | DrumMachine.vue, drum-machine.md | Audio assets |
| 2 | Synth Keyboard | SynthKeyboard.vue, PianoKeyboard.vue, synth-keyboard.md | Nothing |
| 3 | XY Pad | XYPad.vue, xy-pad.md | Nothing |
| 4 | Synth Drum Kit | SynthDrumKit.vue, synth-drum-kit.md | Nothing |
| 5 | Sampled Drum Kit | SampledDrumKit.vue, sampled-drum-kit.md | Audio assets |
| 6 | Timing Basics | TimingDemo.vue, timing.md | Audio assets |
| 7 | Audio Routing | DistortionDemo.vue, audio-routing.md | Nothing |
| 8 | Soundfont Piano | SoundfontPiano.vue, soundfont-piano.md | Audio assets (piano.js) |
| 9 | Effects upgrade | FilterDemo.vue, update effects.md | Nothing |
| Final | Update config.mts sidebar, rewrite examples/index.md | Config changes | All above |

Phases 2, 3, 4, 7 need zero audio assets and can start immediately.
Phase 0 is a simple file copy.

---

## Future (out of scope for now)

- **Layered Sounds demo** — needs loop audio assets (source or create later)
- **Audio Sprites demo** — needs combined sprite file + manifest (create from existing samples later)
- **Visualizer/Analyzer demo** — waveform/frequency visualization using Analyzer API
- **Crossfade demo** — demonstrate the `crossfade()` utility between two tracks

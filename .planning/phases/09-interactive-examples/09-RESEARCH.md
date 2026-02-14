# Phase 09: Interactive Examples - Research

**Researched:** 2026-02-14
**Domain:** VitePress documentation site with Vue 3 interactive audio components
**Confidence:** HIGH

## Summary

Phase 9 adds 9 interactive audio examples to the VitePress documentation site, expanding from 3 existing examples to 12 total. The examples showcase the library's drum machine, synthesis, timing, effects, and soundfont capabilities through interactive Vue components.

The existing component patterns are well-established: dynamic imports for SSR safety, initAudio() on first interaction, cleanup in onUnmounted(), and VitePress CSS variables for theming. All key library APIs (BeatTrack, Font, Oscillator, effects) are documented with comprehensive examples and have event systems for UI synchronization.

The primary technical challenge is building complex interactive UIs (drum machine grid, piano keyboard, XY pad with canvas) while maintaining VitePress SSR compatibility and consistent theming across light/dark modes.

**Primary recommendation:** Build components in priority order starting with Drum Machine (most impressive), extract PianoKeyboard as shared component between SynthKeyboard and SoundfontPiano, use requestAnimationFrame for smooth visual feedback on BeatTrack beat events, and leverage existing component patterns for consistency.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VitePress | 1.6.4 | Static site generator | Already in use, Vue-powered SSG built on Vite |
| Vue | 3.x | Component framework | VitePress default, reactive UI with Composition API |
| ez-web-audio | current | Audio library | The library being documented |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.x | Type safety | Already configured for .vue components |

### No Additional Dependencies Needed
The phase requires **zero new npm packages**. All functionality can be built with:
- Vue 3 Composition API (ref, computed, watch, onMounted, onUnmounted)
- Native Web APIs (Canvas, requestAnimationFrame, MouseEvent, TouchEvent)
- ez-web-audio library (the product being documented)

**Installation:**
No additional packages needed. Existing setup is sufficient.

## Architecture Patterns

### Recommended Project Structure
```
docs/.vitepress/theme/components/
├── AudioDemo.vue               (existing - simple sound playback)
├── OscillatorDemo.vue          (existing - simple synth controls)
├── TrackDemo.vue               (existing - music player with seek)
├── PianoKeyboard.vue           (NEW - shared piano UI component)
├── DrumMachine.vue             (NEW - step sequencer grid)
├── SynthKeyboard.vue           (NEW - polyphonic synth with ADSR)
├── XYPad.vue                   (NEW - canvas-based XY controller)
├── SynthDrumKit.vue            (NEW - synthesized drum sounds)
├── SampledDrumKit.vue          (NEW - sampler with round-robin)
├── TimingDemo.vue              (NEW - scheduling examples)
├── DistortionDemo.vue          (NEW - audio routing with WaveShaper)
├── SoundfontPiano.vue          (NEW - Font API with piano keyboard)
└── FilterDemo.vue              (NEW - real-time filter control)
```

### Pattern 1: VitePress Vue Component Conventions (MANDATORY)
**What:** Established pattern from existing components for SSR-safe VitePress integration

**When to use:** ALL new Vue components in this phase

**Example:**
```typescript
// Source: docs/.vitepress/theme/components/AudioDemo.vue
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const loading = ref(false)
const error = ref('')
let sound: any = null

async function play() {
  try {
    error.value = ''
    loading.value = true

    // CRITICAL: Dynamic import for SSR compatibility
    const { initAudio, createSound } = await import('ez-web-audio')
    await initAudio()  // MUST be called on user interaction

    sound = await createSound('/ez-web-audio/audio/click.mp3')
    sound.play()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  } finally {
    loading.value = false
  }
}

// CRITICAL: Cleanup on unmount
onUnmounted(() => {
  if (sound) {
    try { sound.stop() } catch {}
  }
})
</script>

<style scoped>
/* Use VitePress CSS variables for theming */
.demo {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.button {
  background: var(--vp-c-brand);
  color: white;
}

.button:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}
</style>
```

**Key requirements:**
1. **Dynamic import**: `await import('ez-web-audio')` not static import (SSR fails otherwise)
2. **initAudio() on interaction**: Never auto-initialize, always wait for user click/touch
3. **Cleanup**: onUnmounted() must stop sounds, clear intervals/timers, cancel animation frames
4. **Error handling**: Catch and display errors in UI, don't throw to console
5. **Loading states**: Show loading indicator during async init/fetch
6. **Base path**: Audio URLs use `/ez-web-audio/audio/...` (VitePress base path)
7. **VitePress CSS vars**: Use `var(--vp-c-*)` for colors, borders, backgrounds

### Pattern 2: BeatTrack Event-Driven UI
**What:** BeatTrack emits 'beat' events during lookahead scheduling (~100ms before actual sound playback) for smooth visual synchronization

**When to use:** Drum Machine component, any UI that needs to highlight beats in sync with playback

**Example:**
```typescript
// Source: src/beat-track.ts lines 341-346
// BeatTrack emits 'beat' event at SCHEDULE time (lookahead), not play time
this.emit('beat', {
  time,           // audioContext.currentTime when beat will play
  beatIndex,      // 0-15 (or numBeats-1)
  active: beat.active,  // true if sound plays, false if rest
  source: this
})

// In Vue component:
const currentBeat = ref(-1)
let animationFrame: number | null = null

function setupBeatListener(beatTrack: BeatTrack) {
  beatTrack.on('beat', (e) => {
    currentBeat.value = e.detail.beatIndex

    // Schedule visual highlight to match audio playback
    const delay = (e.detail.time - ctx.currentTime) * 1000
    setTimeout(() => {
      // Add 'playing' class, then remove after beat duration
      setTimeout(() => currentBeat.value = -1, beatTrack.duration)
    }, delay)
  })
}
```

**Why this works:** The 100ms lookahead gives UI time to prepare animations without janky timing. Beat events fire reliably even if main thread is busy, because scheduling happens in audio thread.

### Pattern 3: Piano Keyboard as Reusable Component
**What:** Extract shared piano keyboard UI used by both SynthKeyboard and SoundfontPiano

**When to use:** Any time you need a visual piano keyboard with mouse/touch/keyboard input

**Example:**
```vue
<!-- PianoKeyboard.vue -->
<script setup lang="ts">
const props = defineProps<{
  startNote?: string  // default 'C4'
  endNote?: string    // default 'C5'
  activeKeys?: Set<string>  // currently pressed keys
}>()

const emit = defineEmits<{
  noteOn: [note: string]
  noteOff: [note: string]
}>()

// White keys: C, D, E, F, G, A, B
// Black keys: Db, Eb, Gb, Ab, Bb
// Keyboard mapping: A=C4, W=C#4, S=D4, E=Eb4, D=E4, F=F4...
</script>

<!-- Usage in SynthKeyboard.vue -->
<PianoKeyboard
  :activeKeys="pressedNotes"
  @note-on="playNote"
  @note-off="stopNote"
/>
```

**Why extract:** Same visual/interaction logic needed by SynthKeyboard and SoundfontPiano. Extracting to shared component ensures consistency and reduces duplication.

### Pattern 4: Canvas XY Pad with Mouse/Touch Tracking
**What:** Canvas-based XY controller for real-time parameter manipulation

**When to use:** XY Pad component for frequency/gain control

**Example:**
```typescript
// Source: Vue 3 canvas patterns
const canvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
let ctx: CanvasRenderingContext2D | null = null
let oscillator: any = null

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    drawGrid()
  }
})

function handleMouseDown(e: MouseEvent) {
  isPlaying.value = true
  updateFromPosition(e.offsetX, e.offsetY)
  playOscillator()
}

function handleMouseMove(e: MouseEvent) {
  if (!isPlaying.value) return
  updateFromPosition(e.offsetX, e.offsetY)
}

function handleMouseUp() {
  isPlaying.value = false
  if (oscillator) oscillator.stop()
}

function updateFromPosition(x: number, y: number) {
  if (!canvas.value) return

  // X-axis: frequency (100-2000 Hz, logarithmic)
  const width = canvas.value.width
  const ratio = x / width
  const frequency = 100 * Math.pow(20, ratio)  // log scale

  // Y-axis: gain (0-1, inverted)
  const height = canvas.value.height
  const gain = 1 - (y / height)  // inverted (top=1, bottom=0)

  // Update oscillator in real-time
  if (oscillator) {
    oscillator.update('frequency').to(frequency).from('value')
    oscillator.update('gain').to(gain).from('ratio')
  }

  drawCrosshair(x, y)
}
```

**Why canvas:** Canvas provides pixel-perfect control, easy custom rendering (grids, crosshairs), and smooth animation. Better than SVG for real-time interaction with custom visuals.

### Pattern 5: Real-Time Oscillator Parameter Updates
**What:** Oscillator.update() API for changing parameters while playing

**When to use:** XY Pad, synth controls that need to update parameters without restarting sound

**Example:**
```typescript
// Source: src/controllers/base-param-controller.ts lines 103-125
// Immediate update (takes effect instantly)
oscillator.update('frequency').to(440).from('ratio')  // 440 Hz
oscillator.update('gain').to(0.5).from('ratio')       // 50% volume
oscillator.update('gain').to(50).from('percent')      // 50% volume

// Supported methods: 'ratio', 'inverseRatio', 'percent'
// Supported types: 'frequency', 'gain', 'detune', 'pan'

// OscillatorDemo.vue restarts on param change (simple approach)
watch([frequency, gain, waveType], async () => {
  if (playing.value && oscillator) {
    stop()
    await play()
  }
})

// Better approach for XY Pad: update without restarting
function updateOscillator(freq: number, gainVal: number) {
  if (oscillator && playing.value) {
    oscillator.update('frequency').to(freq).from('ratio')
    oscillator.update('gain').to(gainVal).from('ratio')
  }
}
```

**Why update() instead of restart:** Restarting creates audible clicks. update() changes parameters smoothly while playing. Essential for XY pad continuous control.

### Anti-Patterns to Avoid

- **Static imports of ez-web-audio**: Breaks SSR. ALWAYS use `await import('ez-web-audio')`
- **Auto-initializing audio**: Browser autoplay policies require user interaction. Call initAudio() on click/touch
- **Forgetting cleanup**: Audio continues playing after component unmounts. ALWAYS cleanup in onUnmounted()
- **Hardcoded audio paths**: Use VitePress base path `/ez-web-audio/audio/...` not relative paths
- **Restarting oscillators for param changes**: Creates clicks. Use update() API instead
- **Ignoring SSR**: VitePress pre-renders to HTML. Canvas/audio code must handle missing browser APIs

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drum sequencer timing | setInterval-based beat loop | BeatTrack.playActiveBeats() | Web Audio timing is sample-accurate, setInterval drifts. BeatTrack uses lookahead scheduler for perfect timing |
| Round-robin sample playback | Manual array indexing + play() | createSampler() | Sampler handles cycling, prevents "machine gun" effect, simpler API |
| ADSR envelopes | Manual gain ramps | Envelope class with createOscillator({ envelope }) | Handles attack/decay/sustain/release scheduling, retriggering without clicks, exponential curves |
| Piano note frequency lookup | Manual frequency calculations | frequencyMap utility | Comprehensive 12-TET frequency map (C0-Eb8), handles flats/sharps |
| Soundfont loading | Manual base64 decoding | createFont(url) | Handles MIDI.js soundfont format, decodes base64 audio, creates SampledNote instances |
| Effect wet/dry mixing | Manual gain node routing | createFilterEffect(), wrapEffect() | Equal-power crossfade, bypass control, standard Effect interface |
| Audio scheduling | setTimeout with Date.now() | playIn(), playAt(), audioContext.currentTime | Web Audio clock is independent of main thread, no drift or stutter |

**Key insight:** The Web Audio API is deceptively complex. Timing drift, click-free parameter changes, equal-power crossfades, and ADSR envelope math all have subtle edge cases. ez-web-audio provides battle-tested implementations. Building custom solutions risks timing bugs and audio artifacts.

## Common Pitfalls

### Pitfall 1: VitePress SSR Breaking with Direct Imports
**What goes wrong:** `import { createSound } from 'ez-web-audio'` at top of component causes build failure with "window is not defined" or "AudioContext is not defined"

**Why it happens:** VitePress pre-renders components to HTML during build (SSR). Browser APIs like AudioContext don't exist in Node.js.

**How to avoid:**
```typescript
// WRONG - breaks SSR
import { createSound } from 'ez-web-audio'

// RIGHT - dynamic import
async function loadAudio() {
  const { createSound, initAudio } = await import('ez-web-audio')
  await initAudio()
  const sound = await createSound('/audio/click.mp3')
}
```

**Warning signs:** Build errors mentioning "window", "AudioContext", "navigator" during `npm run build`

### Pitfall 2: Canvas Operations Before onMounted
**What goes wrong:** Trying to get canvas context in setup() causes `null` reference errors

**Why it happens:** Template refs are not available until component is mounted. SSR also doesn't have DOM.

**How to avoid:**
```typescript
// WRONG
const canvas = ref<HTMLCanvasElement | null>(null)
const ctx = canvas.value?.getContext('2d')  // null in setup()

// RIGHT
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    drawGrid()
  }
})
```

**Warning signs:** Runtime errors "Cannot read property 'getContext' of null", canvas not rendering

### Pitfall 3: Not Cleaning Up requestAnimationFrame
**What goes wrong:** Animation frames continue running after component unmounts, causing memory leaks and errors when trying to update refs

**Why it happens:** requestAnimationFrame callbacks continue until explicitly cancelled

**How to avoid:**
```typescript
// WRONG - RAF continues after unmount
let animationFrame: number | null = null

function updatePosition() {
  // Update UI based on track position
  animationFrame = requestAnimationFrame(updatePosition)
}

// RIGHT - cancel on unmount
onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (track) track.stop()
})
```

**Warning signs:** Console errors after navigating away, browser memory usage increasing over time

### Pitfall 4: BeatTrack Beat Events Fire at Schedule Time, Not Play Time
**What goes wrong:** UI highlights beats ~100ms early if you assume beat event time matches audio playback time

**Why it happens:** BeatTrack uses lookahead scheduling. Beat events fire when the beat is SCHEDULED (100ms ahead), not when it PLAYS.

**How to avoid:**
```typescript
// WRONG - highlights 100ms too early
beatTrack.on('beat', (e) => {
  highlightBeat(e.detail.beatIndex)  // fires at schedule time
})

// RIGHT - calculate delay to match audio playback
beatTrack.on('beat', (e) => {
  const delay = (e.detail.time - ctx.currentTime) * 1000
  setTimeout(() => {
    highlightBeat(e.detail.beatIndex)
    setTimeout(() => unhighlightBeat(e.detail.beatIndex), beatTrack.duration)
  }, delay)
})
```

**Warning signs:** Visual beat indicators flash slightly before you hear the sound

### Pitfall 5: Font.play() Expects Note Identifier String, Not Frequency
**What goes wrong:** `font.play(440)` throws error "No note with identifier 440 found"

**Why it happens:** Font stores notes by identifier ('A4', 'C#5'), not frequency. Must use note names.

**How to avoid:**
```typescript
// WRONG
const freq = 440
font.play(freq)  // Error: No note with identifier 440 found

// RIGHT
font.play('A4')  // plays 440 Hz
font.play('C4')  // plays middle C

// Get note for advanced control
const note = font.getNote('A4')
if (note) {
  note.changeGainTo(0.5)
  note.play()
}
```

**Warning signs:** Runtime errors when calling font.play() with anything other than note name strings

### Pitfall 6: Oscillator Restart on Type Change Creates Audible Clicks
**What goes wrong:** Changing oscillator waveform type while playing causes noticeable click/pop

**Why it happens:** OscillatorNode.type cannot be changed after start(). Current OscillatorDemo.vue stops and restarts oscillator.

**How to avoid:**
```typescript
// ACCEPTABLE for simple demos (current pattern in OscillatorDemo.vue)
watch([frequency, gain, waveType], async () => {
  if (playing.value && oscillator) {
    stop()
    await play()
  }
})

// BETTER for production (use envelope or short fade)
watch(waveType, async () => {
  if (playing.value && oscillator) {
    // Fade out, change type, fade in
    oscillator.update('gain').to(0).from('ratio')
    setTimeout(async () => {
      stop()
      await play()
    }, 50)
  }
})
```

**Warning signs:** Audible click when switching waveform types in synth keyboard

## Code Examples

Verified patterns from library source code:

### BeatTrack Setup and Playback
```typescript
// Source: src/beat-track.ts example lines 34-51
import { createBeatTrack } from 'ez-web-audio'

const kick = await createBeatTrack(['kick.mp3'], { numBeats: 8 })

// Set a basic 4-on-the-floor pattern
kick.beats[0].active = true  // beat 1
kick.beats[2].active = true  // beat 3
kick.beats[4].active = true  // beat 5
kick.beats[6].active = true  // beat 7

kick.playActiveBeats(120, 1/4) // Play quarter notes at 120 BPM

// Listen for beat events (fires at schedule time, ~100ms before audio)
kick.on('beat', (e) => {
  console.log(`Beat ${e.detail.beatIndex}`)
  // e.detail.time: audioContext.currentTime when beat will play
  // e.detail.active: true if sound plays, false if rest
})
```

### Font (Soundfont) Loading and Playback
```typescript
// Source: src/font.ts example lines 11-24
import { createFont } from 'ez-web-audio'

const piano = await createFont('piano.js')

// Play notes by identifier
piano.play('C4')  // Middle C
piano.play('E4')  // E above middle C
piano.play('G4')  // G above middle C

// Get a specific note for advanced control
const note = piano.getNote('A4')
note?.changeGainTo(0.5)
note?.play()
```

### Oscillator with ADSR Envelope
```typescript
// Source: src/index.ts example lines 313-329
import { createOscillator } from 'ez-web-audio'

// Simple sine wave at 440Hz (A4)
const synth = await createOscillator({ frequency: 440, type: 'sine' })
synth.play()
setTimeout(() => synth.stop(), 500)

// With ADSR envelope for piano-like decay
const piano = await createOscillator({
  frequency: 440,
  type: 'triangle',
  envelope: {
    attack: 0.01,   // 10ms attack
    decay: 0.3,     // 300ms decay
    sustain: 0.4,   // sustain at 40% amplitude
    release: 0.5    // 500ms release
  }
})
piano.play()
```

### Sampler Round-Robin Playback
```typescript
// Source: src/index.ts example lines 282-295
import { createSampler } from 'ez-web-audio'

// Create a sampler with multiple gunshot variations
const gunshot = await createSampler([
  'shot1.mp3', 'shot2.mp3', 'shot3.mp3'
])

// Each play uses the next sound in rotation
gunshot.play() // shot1
gunshot.play() // shot2
gunshot.play() // shot3
gunshot.play() // shot1 (wraps around)
```

### White Noise + Filter for Synthesized Drums
```typescript
// Source: src/index.ts example lines 445-460
import { createWhiteNoise, createFilterEffect, getAudioContext } from 'ez-web-audio'

// Create white noise
const noise = await createWhiteNoise()

// Filter white noise to create wind-like sound
const lowpass = createFilterEffect(await getAudioContext(), 'lowpass', {
  frequency: 400
})
noise.addEffect(lowpass)
noise.play()
```

### LayeredSound for Complex Synthesis
```typescript
// Source: src/index.ts example lines 345-352
import { createLayeredSound, createOscillator, createSound } from 'ez-web-audio'

const bass = await createSound('bass.mp3')
const melody = await createSound('melody.mp3')
const synth = await createOscillator({ frequency: 440 })

const layered = await createLayeredSound([bass, melody, synth])
layered.play() // All layers start at exact same time
layered.setGain(0.5) // Affects all layers
layered.getLayer(2)?.changeGainTo(0.8) // Control individual layer
```

### Effect Routing with wrapEffect
```typescript
// Source: src/effects/effect-wrapper.ts example lines 161-172
import { wrapEffect, getAudioContext } from 'ez-web-audio'

// Wrap a WaveShaperNode
const ctx = await getAudioContext()
const distortion = ctx.createWaveShaper()
distortion.curve = makeDistortionCurve(400)
const wrapped = wrapEffect(ctx, distortion)

// Use standard Effect interface
wrapped.bypass = true  // Bypass the effect
wrapped.mix = 0.5      // 50% wet/dry blend

sound.addEffect(wrapped)
```

### Filter Effect with Real-Time Control
```typescript
// Source: src/effects/filter-effect.ts example lines 36-42
import { createFilterEffect, getAudioContext } from 'ez-web-audio'

const filter = createFilterEffect(await getAudioContext(), 'lowpass', {
  frequency: 800,
  q: 2
})

// Adjust parameters in real-time
filter.frequency = 1000  // Adjust cutoff
filter.q = 5             // Adjust resonance
filter.mix = 0.5         // 50% wet/dry
filter.bypass = true     // Bypass filter entirely
```

### Audio Scheduling with playIn/playAt
```typescript
// Source: Web Audio timing model
import { createSound, getAudioContext } from 'ez-web-audio'

const click = await createSound('click.mp3')
const ctx = await getAudioContext()

// Play immediately
click.play()

// Play in 1 second
click.playIn(1)

// Schedule 3 sounds at precise times
const now = ctx.currentTime
click.playAt(now + 0.0)
click.playAt(now + 0.5)
click.playAt(now + 1.0)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VuePress | VitePress | VitePress released 2020 | Faster builds with Vite, better dev experience, Vue 3 |
| Static code examples | Interactive Vue components | Phase 7 (2024) | Users can try library before reading docs |
| Options API | Composition API | Vue 3 (2020) | Better TypeScript support, more flexible component logic |
| Manual AudioParam scheduling | Envelope class | Current library | Clickless retriggering, automatic ADSR curves |
| setTimeout for beats | Web Audio lookahead scheduler | Current library (BeatTrack) | Sample-accurate timing, no drift |

**Deprecated/outdated:**
- VuePress 1.x: Replaced by VitePress for new projects
- Vue 2 Options API: Still works but Composition API preferred for new code
- Direct ez-web-audio imports in Vue: Must use dynamic imports for VitePress SSR

## Open Questions

1. **Canvas rendering in dark mode**
   - What we know: VitePress has dark mode toggle, CSS variables exist for colors
   - What's unclear: Best approach for canvas colors that work in both themes
   - Recommendation: Use dark background by default (looks good in both modes), or detect theme with `document.documentElement.classList.contains('dark')` and re-render

2. **Touch event handling for multi-touch piano keyboard**
   - What we know: Multiple touches should play multiple notes simultaneously
   - What's unclear: How to map touch events to specific piano keys reliably
   - Recommendation: Track touches by identifier, use `touch.target` to determine which key, test on mobile devices early

3. **Optimal beat duration for visual feedback**
   - What we know: BeatTrack has configurable `duration` property (default 100ms)
   - What's unclear: What duration feels best for step sequencer grid highlighting
   - Recommendation: Start with 100ms default, make it configurable in component, test different values

4. **XY Pad logarithmic frequency scaling formula**
   - What we know: Frequency should feel "musical" (equal steps = equal pitch intervals)
   - What's unclear: Exact formula for 100-2000 Hz range
   - Recommendation: Use `frequency = minFreq * Math.pow(maxFreq/minFreq, ratio)` where ratio is 0-1 from X position

## Sources

### Primary (HIGH confidence)
- `/Users/seth/Documents/GitHub/ez-audio/src/beat-track.ts` - BeatTrack implementation with event system and lookahead scheduler
- `/Users/seth/Documents/GitHub/ez-audio/src/font.ts` - Font class with note playback by identifier
- `/Users/seth/Documents/GitHub/ez-audio/src/index.ts` - Public API with all factory functions, examples in JSDoc
- `/Users/seth/Documents/GitHub/ez-audio/src/controllers/base-param-controller.ts` - update() fluent API implementation
- `/Users/seth/Documents/GitHub/ez-audio/src/effects/effect-wrapper.ts` - wrapEffect() implementation with wet/dry mixing
- `/Users/seth/Documents/GitHub/ez-audio/src/effects/filter-effect.ts` - FilterEffect implementation with real-time control
- `/Users/seth/Documents/GitHub/ez-audio/src/envelope.ts` - ADSR envelope with clickless retriggering
- `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/*.vue` - Existing component patterns (AudioDemo, OscillatorDemo, TrackDemo)
- `/Users/seth/Documents/GitHub/ez-audio/.planning/interactive-examples-plan.md` - Detailed specifications for all 9 examples

### Secondary (MEDIUM confidence)
- [Vue.js Mouse Tracker Example](https://www.geeksforgeeks.org/vue-js-mouse-tracker-example/) - Vue 3 mouse tracking patterns
- [How to listen to events on canvas shapes with Vue and Konva](https://konvajs.org/docs/vue/Events.html) - Canvas event handling in Vue
- [Create a mouse tracking eye using Vue 3, VueUse & CSS](https://pixelhop.io/writing/create-a-mouse-tracking-eye-using-vue-3-vueuse-and-css/) - Vue 3 reactive mouse tracking

### Tertiary (LOW confidence)
- None - all critical information verified from source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - VitePress/Vue 3 already in use, no new dependencies needed
- Architecture: HIGH - Existing components provide clear patterns, library APIs fully documented
- Component patterns: HIGH - 3 existing components demonstrate all required patterns
- Library APIs: HIGH - All APIs (BeatTrack, Font, Oscillator, effects) verified in source with examples
- Canvas/interaction: MEDIUM - Standard web APIs, patterns found in search results, need testing
- Pitfalls: HIGH - Identified from existing component implementations and library design

**Research date:** 2026-02-14
**Valid until:** 30 days (stable domain - VitePress/Vue/Web APIs don't change rapidly)

# Architecture Patterns

**Domain:** Interactive audio demo pages for M5 features (Effects Chain, LFO, PolySynth, Transport+Sequencer, GrainPlayer)
**Researched:** 2026-03-08
**Confidence:** HIGH (based on 22 existing Vue components and established patterns in the codebase)

## Recommended Architecture

All 5 new demo pages follow the identical architecture already established by 22 existing Vue SFC components. No new patterns, build tools, or infrastructure needed.

### Integration Model

```
docs/examples/{feature}.md          <-- Markdown page (frontmatter, prose, code samples)
  imports Vue component via <script setup>
docs/.vitepress/theme/components/   <-- Vue SFC with all demo logic
  uses dynamic import('ez-web-audio') on first interaction
docs/.vitepress/config.mts          <-- Sidebar nav entries added
e2e/interactions.spec.ts            <-- Playwright tests added
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `EffectsChainDemo.vue` | Toggle/stack effects (delay, reverb, compressor, EQ) on a sound source, adjust parameters per effect | ez-web-audio effects factories, `createSound`/`createOscillator` |
| `LFODemo.vue` | Tremolo/vibrato/filter-sweep with visual waveform, adjustable rate/depth/waveform | `createLFO`, `createOscillator`, `createFilterEffect` |
| `PolySynthDemo.vue` | Keyboard with voice allocation display, steal strategy switcher | `createPolySynth`, `PianoKeyboard.vue` (reuse) |
| `TransportSequencerDemo.vue` | BPM clock, transport controls, sequencer with musical time, mute/solo per track | `createTransport`, `createSequence`, `createBeatTrack` |
| `GrainPlayerDemo.vue` | Position/pitch/grain-size/jitter sliders, play/pause, waveform display | `createGrainPlayer`, `createSound` (for buffer source) |

### Data Flow (per component)

All components follow the same established flow:

```
User interaction (click/slider)
  --> ensureLoaded() / initIfNeeded()
    --> dynamic import('ez-web-audio')
    --> create audio objects (oscillator, sound, transport, etc.)
  --> Vue refs bound to UI controls
  --> watch() or event handlers update audio params in real-time
  --> onUnmounted() disposes audio objects
```

## Existing Patterns to Follow (verbatim from codebase)

### Pattern 1: Lazy Audio Init
**What:** Dynamic `import('ez-web-audio')` on first user interaction; no load buttons.
**Source:** Every existing component (FilterDemo, SynthKeyboard, DrumMachineVue, etc.)
**Example:**
```typescript
let lib: any = null

async function initIfNeeded() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
}

async function handlePlay() {
  await initIfNeeded()
  // use lib.createOscillator(), etc.
}
```

### Pattern 2: Vue Ref State Management
**What:** All UI-bound state uses `ref()` or `reactive()`. Audio objects stored as module-level `let` variables (not refs) since they are not rendered.
**Source:** All 22 existing components.
**Example:**
```typescript
const playing = ref(false)       // UI state --> ref
const error = ref('')            // UI state --> ref
let oscillator: Oscillator | null = null  // audio object --> module let
```

### Pattern 3: Cleanup via onUnmounted
**What:** Stop all audio, cancel animation frames, remove event listeners.
**Source:** SynthKeyboard, VisualizationDemo, DrumMachineVue.
**Example:**
```typescript
onUnmounted(() => {
  oscillator?.stop()
  oscillator = null
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
```

### Pattern 4: Error Boundary
**What:** try/catch in every async handler, error displayed via `error` ref.
**Source:** Universal across all components.
**Example:**
```typescript
catch (e) {
  error.value = e instanceof Error ? e.message : 'Failed to play'
}
```

### Pattern 5: LLM Content Exclusion
**What:** Wrap interactive Vue component in `<llm-exclude>` tags, provide text description in `<llm-only>` for llms.txt generation.
**Source:** Every example markdown page (effects.md, synthesis.md, etc.)

## Shared Component Reuse

### Existing Components to Reuse

| Component | Reused By | How |
|-----------|-----------|-----|
| `PianoKeyboard.vue` | **PolySynthDemo** | Emit `noteOn`/`noteOff` events, pass `activeKeys` prop. Already used by SynthKeyboard.vue. |

### Extractable Shared Patterns (NOT new components)

After reviewing all 22 components, there are recurring UI patterns but they are too tightly coupled to their specific audio context to extract as shared components. Each demo's slider/toggle/select markup is simple enough that extraction would add indirection without real savings. The codebase convention is self-contained SFCs, and introducing shared UI components for 5 new pages is not worth the abstraction cost.

**Do NOT extract:**
- Slider controls -- each demo has different ranges, labels, and update logic
- Play/Stop toggle buttons -- trivial markup, different state shapes
- Error display -- single `<div>` with `v-if`, not worth a component
- Canvas visualization -- only GrainPlayer and possibly LFO need canvas; different rendering logic

**Do reuse:**
- `PianoKeyboard.vue` for PolySynthDemo (established pattern from SynthKeyboard)
- VitePress CSS variables (`--vp-c-brand`, `--vp-c-bg-soft`, etc.) for consistent styling

## New Files Required

### Vue Components (5 new files)

| File | Lines (est.) | Key Library Imports |
|------|-------------|---------------------|
| `docs/.vitepress/theme/components/EffectsChainDemo.vue` | ~350 | createOscillator, createDelay, createReverb, createCompressor, createEQ |
| `docs/.vitepress/theme/components/LFODemo.vue` | ~300 | createLFO, createOscillator, createFilterEffect |
| `docs/.vitepress/theme/components/PolySynthDemo.vue` | ~250 | createPolySynth, PianoKeyboard.vue |
| `docs/.vitepress/theme/components/TransportSequencerDemo.vue` | ~400 | createTransport, createSequence, createBeatTrack, createSound |
| `docs/.vitepress/theme/components/GrainPlayerDemo.vue` | ~350 | createGrainPlayer, createSound |

### Markdown Pages (5 new files)

| File | Content |
|------|---------|
| `docs/examples/effects-chain.md` | Effects chain demo page with EffectsChainDemo.vue |
| `docs/examples/lfo.md` | LFO modulation demo page with LFODemo.vue |
| `docs/examples/poly-synth.md` | PolySynth demo page with PolySynthDemo.vue |
| `docs/examples/transport-sequencer.md` | Transport + Sequencer demo page with TransportSequencerDemo.vue |
| `docs/examples/grain-player.md` | GrainPlayer demo page with GrainPlayerDemo.vue |

### Modified Files

| File | Change |
|------|--------|
| `docs/.vitepress/config.mts` | Add 5 new sidebar entries under existing sections |
| `e2e/interactions.spec.ts` | Add interaction tests for each new demo page |
| `docs/examples/index.md` | Add links to new demo pages in the overview |

## Sidebar Integration

Add to the existing `'/examples/'` sidebar in `config.mts`:

```typescript
// Under 'Synthesis' section (existing):
{ text: 'PolySynth', link: '/examples/poly-synth' },

// Under 'Timing & Sequencing' section (existing):
{ text: 'Transport & Sequencer', link: '/examples/transport-sequencer' },

// Under 'Effects & Routing' section (existing):
{ text: 'Effects Chain', link: '/examples/effects-chain' },
{ text: 'LFO Modulation', link: '/examples/lfo' },

// Under 'Creative' section (existing):
{ text: 'Grain Player', link: '/examples/grain-player' },
```

## Component Design Details

### EffectsChainDemo.vue
- **Audio source:** Oscillator (sawtooth) or loaded audio file (toggle)
- **Effects slots:** 4 slots in chain, each a dropdown (delay/reverb/compressor/EQ/none)
- **Per-effect controls:** Bypass toggle, mix slider, effect-specific params (delay time, reverb decay, threshold, EQ bands)
- **Key API surface:** `createDelay()`, `createReverb()`, `createCompressor()`, `createEQ()`, `sound.addEffect()`, `effect.bypass`, `effect.mix`
- **Visual:** Chain diagram showing signal flow, active/bypassed state per slot

### LFODemo.vue
- **Targets:** 3 presets -- tremolo (LFO->gain), vibrato (LFO->frequency), filter sweep (LFO->filter.frequency)
- **Controls:** Rate (Hz), depth (0-1), waveform select (sine/square/saw/triangle/sample-and-hold)
- **Key API surface:** `createLFO()`, `lfo.connect(target, paramName, options)`, `lfo.start()`, `lfo.stop()`, `lfo.frequency`, `lfo.depth`
- **Visual:** Optional canvas showing LFO waveform shape (simple sine/square drawing, not audio data)

### PolySynthDemo.vue
- **Reuses:** `PianoKeyboard.vue` for note input (same pattern as SynthKeyboard.vue)
- **Controls:** Max voices (2-16 slider), steal strategy (lru/oldest-active/quietest radio), waveform, ADSR envelope
- **Voice display:** Shows active voice count, which voices are playing, steal events
- **Key API surface:** `createPolySynth()`, `polySynth.play({ frequency, gain })`, `polySynth.release(handle)`, `polySynth.releaseAll()`, voice events
- **Note:** PianoKeyboard emits `noteOn(note: string)` / `noteOff(note: string)`, accepts `:activeKeys` Set prop. Exact same integration as SynthKeyboard.vue.

### TransportSequencerDemo.vue
- **Most complex demo.** Combines Transport + BeatTrack sync + Sequence.
- **Controls:** BPM slider, play/pause/stop, position display (bar:beat:tick), mute/solo per track
- **Tracks:** 3 BeatTracks (kick/snare/hihat) synced to Transport, plus a Sequence scheduling melodic notes
- **Key API surface:** `createTransport()`, `transport.sync(beatTrack)`, `createSequence()`, `seq.at()`, `transport.play()`, `transport.bpm`
- **Note:** Overlaps conceptually with DrumMachineVue but adds Transport clock and Sequence. Should link to DrumMachine for comparison.
- **Audio assets:** Reuse existing `/audio/drum-samples/` from DrumMachine demos.

### GrainPlayerDemo.vue
- **Audio source:** Pre-loaded audio buffer (a pad or texture sound)
- **Controls:** Position (0-1), pitch (-24 to +24 semitones), grain size, overlap, jitter sliders
- **Key API surface:** `createGrainPlayer(buffer, options)`, `grainPlayer.play()`, `grainPlayer.position`, `grainPlayer.pitch`, `grainPlayer.grainSize`
- **Visual:** Waveform display showing current grain position on the buffer (canvas)
- **Audio asset needed:** A 3-5 second pad/texture WAV file at `/docs/public/audio/`

## Build Order (dependency-driven)

```
Phase 1: EffectsChainDemo    -- No dependencies on other new demos. Effects API
                                is well-understood (FilterDemo, DistortionDemo exist).
                                Establishes the "multi-effect" pattern for this milestone.

Phase 2: LFODemo             -- Independent. LFO connects to effects and oscillators,
                                both already demonstrated. Simpler state than remaining demos.

Phase 3: PolySynthDemo       -- Depends on PianoKeyboard.vue (exists). More complex than
                                LFO but self-contained. Tests voice allocation UI.

Phase 4: GrainPlayerDemo     -- Independent but needs an audio asset. Slightly novel
                                (no existing granular demo). Position on buffer requires
                                canvas drawing.

Phase 5: TransportSequencerDemo -- Most complex. Combines Transport, BeatTrack, Sequence.
                                   Benefits from having the other 4 demos done first to
                                   validate patterns. Should reference DrumMachine patterns.
```

**Rationale:** Effects Chain first because FilterDemo and DistortionDemo already prove the pattern, making it lowest-risk. Transport+Sequencer last because it orchestrates multiple subsystems (Transport, BeatTrack, Sequence) and is the most complex state management challenge.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Load Button
**What:** Adding a "Load Audio" or "Initialize" button that must be clicked before the demo is usable.
**Why bad:** Violates project constraint (CLAUDE.md). User's first meaningful interaction (Play, key press) must trigger init.
**Instead:** Use `initIfNeeded()` pattern in every interaction handler.

### Anti-Pattern 2: Typed Library Import at Module Level
**What:** `import { createOscillator } from 'ez-web-audio'` at top of `<script setup>`.
**Why bad:** Forces VitePress SSR to evaluate the library during build, which requires `AudioContext` (browser-only API).
**Instead:** Use `import type { ... }` for types, dynamic `await import('ez-web-audio')` for runtime.

### Anti-Pattern 3: Shared Audio State Across Components
**What:** Storing AudioContext or audio objects in a Pinia store or provide/inject.
**Why bad:** Each demo is a standalone page. Shared state creates cleanup nightmares and cross-page bugs.
**Instead:** Each component owns its audio objects, creates them on init, disposes on unmount.

### Anti-Pattern 4: Exposing Raw AudioParam Controls
**What:** Letting users directly set AudioParam values via sliders.
**Why bad:** Bypasses ez-web-audio's API, defeats the purpose of the demo.
**Instead:** Always use the library's API (`effect.mix`, `lfo.frequency`, `transport.bpm`).

## Audio Assets

| Demo | Needs Audio File | Notes |
|------|-----------------|-------|
| EffectsChainDemo | Optional (can use oscillator only) | Adding a short audio clip makes the effects more audible/interesting |
| LFODemo | No (oscillator-based) | |
| PolySynthDemo | No (oscillator-based) | |
| TransportSequencerDemo | Yes (drum samples) | Reuse existing `/audio/drum-samples/` from DrumMachine demos |
| GrainPlayerDemo | Yes (pad/texture) | Need a 3-5 second WAV/MP3 added to `/docs/public/audio/` |

## E2E Test Strategy

Follow the established pattern from `e2e/interactions.spec.ts`:

1. Navigate to page, wait for UI elements
2. Click primary interaction (Play button)
3. Verify DOM state changes (button text, control enable/disable, aria attributes)
4. Verify no `pageerror` events
5. No `waitForTimeout` -- all waits condition-based

Each demo gets 1-2 interaction tests verifying the primary flow works without errors.

## Sources

- All 22 existing Vue components in `docs/.vitepress/theme/components/` (direct codebase analysis)
- `docs/.vitepress/config.mts` sidebar structure (lines 135-196)
- `e2e/interactions.spec.ts` test patterns
- `src/lfo.ts`, `src/poly-synth.ts`, `src/transport.ts`, `src/sequence.ts`, `src/grain-player.ts` API surfaces
- `src/effects/index.ts` effect factory exports
- `CLAUDE.md` project constraints (no load buttons, lazy init)

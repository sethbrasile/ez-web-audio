# Phase 11: Drum Machine Example Pages - Research

**Researched:** 2026-02-15
**Domain:** VitePress documentation, Vue reactive patterns, vanilla TypeScript event handling, Web Audio timing
**Confidence:** HIGH

## Summary

Phase 11 creates two drum machine example pages to validate both UI sync approaches work correctly: Vue reactive properties (framework-specific) and event-based timing (framework-agnostic). The codebase already has a working Vue drum machine component (`DrumMachine.vue`) that demonstrates the reactive pattern successfully. This phase extends that foundation by creating dedicated example pages with clear code explanations and a vanilla TypeScript implementation using DOM manipulation.

The existing `BeatTrack` implementation uses `audioContextAwareTimeout` (RAF + `audioContext.currentTime`) for precise event timing, solving the core challenge of synchronizing visual feedback with audio playback. The Vue reactive pattern leverages `wrapWith: reactive()` to wrap Beat objects, making their auto-toggling properties (`currentTimeIsPlaying`, `isPlaying`) trigger Vue re-renders automatically. The vanilla TS pattern uses the `beat` event that fires at play time with the same timing precision.

**Primary recommendation:** Build on the existing DrumMachine.vue component as reference, create two parallel example pages (one Vue, one vanilla), both using the same drum samples and 16-step grid pattern. Focus research validates the timing mechanism works correctly and both patterns provide identical visual results.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VitePress | 1.6.4 | Documentation site | Already used, handles Vue components in markdown |
| Vue 3 | (VitePress dep) | Reactive drum machine example | Project uses Vue for interactive docs |
| TypeScript | 5.6.2 | Type-safe vanilla implementation | Project's primary language |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ez-web-audio | 0.1.0 (local) | BeatTrack, createBeatTrack, Beat | Core functionality being documented |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla TS + DOM | React/Solid examples | Vanilla TS proves timing works without framework overhead, simpler for copy-paste |
| Markdown pages | Standalone HTML demos | Markdown keeps examples in docs site, easier navigation |

**Installation:**
No new dependencies required. All libraries already installed in package.json.

## Architecture Patterns

### Recommended Project Structure
```
docs/examples/
├── drum-machine-vue.md          # Vue reactive pattern demo
├── drum-machine-vanilla.md      # Event-based pattern demo
└── drum-machine.md              # Existing overview page (update to link to both)

docs/.vitepress/theme/components/
├── DrumMachine.vue              # Existing Vue demo (reference)
└── DrumMachineVanilla.vue       # New: wrapper for vanilla TS demo
```

### Pattern 1: Vue Reactive Property Sync

**What:** Beat objects wrapped with Vue's `reactive()` have properties that auto-toggle and trigger re-renders.

**When to use:** Vue applications, Solid.js (with `createMutable()`), any framework with reactive proxies.

**Example:**
```typescript
// Source: Existing DrumMachine.vue component
const kick = await createBeatTrack(['kick1.wav'], {
  numBeats: 16,
  wrapWith: (beat) => reactive(beat)  // Vue's reactive wrapper
})

// Template binds directly to beat properties
<button
  v-for="(beat, i) in kick.beats"
  @click="beat.active = !beat.active"
  :class="{
    active: beat.active,
    current: beat.currentTimeIsPlaying  // Auto-updates on beat timing
  }"
/>
```

**Key insight:** The `wrapWith` option was added specifically to fix framework proxy compatibility issues (WeakMap → instance property refactor). Beat properties toggle automatically via `audioContextAwareTimeout` inside the Beat class.

### Pattern 2: Event-Based Visual Sync

**What:** BeatTrack emits `beat` events at play time using AudioContext-aware timing for DOM updates.

**When to use:** React, vanilla JS/TS, any framework without reactive proxies or when avoiding framework-specific patterns.

**Example:**
```typescript
// Source: BeatTrack implementation in src/beat-track.ts
kick.on('beat', (e) => {
  const { beatIndex, active } = e.detail

  // Update DOM directly
  document.querySelectorAll('.beat-cell').forEach((cell, i) => {
    cell.classList.toggle('current', i === beatIndex)
  })

  if (active) {
    // Flash the pad for active beats only
    cells[beatIndex].classList.add('flash')
  }
})
```

**Timing mechanism:**
```typescript
// From src/utils/timeout.ts
function scheduler(): void {
  const currentTime = now() // audioContext.currentTime * 1000

  // Call due tasks
  tasks.forEach((task) => {
    if (task.due <= currentTime)
      task.fn()
  })

  // Keep scheduler running via RAF
  if (tasks.length > 0) {
    window.requestAnimationFrame(scheduler)
  }
}
```

This produces frame-accurate timing tied to audio playback, not system timers.

### Pattern 3: Stub Beats for Immediate Rendering

**What:** Create dummy beat objects with the same shape as real Beats before audio initializes.

**When to use:** Any page with a drum machine grid to prevent layout shift and allow pattern editing before play.

**Example:**
```typescript
// Source: DrumMachine.vue lines 63-68
function makeBeats(name: string) {
  const activeSet = new Set(defaultPatterns[name] ?? [])
  return Array.from({ length: NUM_BEATS }, (_, i) =>
    reactive({ active: activeSet.has(i), currentTimeIsPlaying: false, isPlaying: false }))
}

// Later, swap in real beats seamlessly
track.beats.forEach((stub, i) => { bt.beats[i].active = stub.active })
track.beats = bt.beats // Template updates automatically
```

### Anti-Patterns to Avoid

- **setTimeout for visual sync:** Browser timers drift from audio timing. Always use events or reactive properties that are driven by `audioContextAwareTimeout`.
- **Calling initAudio() explicitly:** Phase 10 made initialization lazy. Factory functions handle it automatically. Only call explicitly if needed for user-triggered setup.
- **Module-level WeakMap for beat caching:** Breaks with framework proxies (Vue reactive, Solid signals). Use instance properties instead (already fixed in BeatTrack).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio-visual sync timing | Custom setTimeout/setInterval scheduler | audioContextAwareTimeout (already in codebase) | Browser timers drift; AudioContext.currentTime is frame-accurate |
| Reactive beat properties | Manual property toggling + setTimeout | Beat class auto-toggling properties | Beat class already handles timing, reset, and property updates |
| Round-robin sample playback | Custom rotation logic | BeatTrack with multiple URLs | Sampler parent class handles round-robin automatically |
| Drum machine grid UI | Custom grid renderer | 16-step grid pattern from DrumMachine.vue | Existing component proves pattern works |

**Key insight:** The hard timing work is done. The Beat class handles `currentTimeIsPlaying`/`isPlaying` auto-toggle, BeatTrack handles event firing with correct timing, and `audioContextAwareTimeout` prevents drift. This phase validates these mechanisms work in both reactive and imperative UI patterns.

## Common Pitfalls

### Pitfall 1: Visual/Audio Desync Under Load
**What goes wrong:** Playhead indicator drifts from audio over time (2+ minutes of playback).
**Why it happens:** Browser timers (setTimeout/setInterval) are not tied to audio clock. Tab backgrounding, CPU load, garbage collection can delay callbacks.
**How to avoid:** Use `audioContextAwareTimeout` which uses `requestAnimationFrame` + `audioContext.currentTime` for scheduling. BeatTrack already uses this internally.
**Warning signs:** Noticeable lag between sound and visual highlight after 30+ seconds of playback.

### Pitfall 2: markRaw Workaround (Vue)
**What goes wrong:** Wrapping Beat objects in Vue's `markRaw()` to prevent reactivity issues.
**Why it happens:** Old assumption that Beat objects don't work with reactive proxies due to WeakMap caching.
**How to avoid:** This was fixed in the WeakMap → instance property refactor. Use `wrapWith: reactive()` directly, no `markRaw()` needed.
**Warning signs:** Code comments mentioning "proxy issues" or "markRaw to prevent Vue errors."

### Pitfall 3: Event Listener Cleanup on Stop
**What goes wrong:** Event listeners remain attached after component unmounts, causing memory leaks.
**Why it happens:** `.on()` adds listeners but unmounting doesn't auto-cleanup.
**How to avoid:** Store listener references and call `.off(type, listener)` in `onUnmounted()` (Vue) or cleanup function (vanilla).
**Warning signs:** DevTools shows increasing event listener count after mounting/unmounting demo components.

### Pitfall 4: Logarithmic vs Linear BPM Slider
**What goes wrong:** BPM slider feels unresponsive at low values, too sensitive at high values.
**Why it happens:** Linear slider mapping to linear BPM range (60-200) feels unnatural.
**How to avoid:** Use linear slider for BPM — tempo perception is roughly linear in musical contexts (unlike frequency). DrumMachine.vue uses simple `v-model.number="bpm"` with min/max, which works well.
**Warning signs:** User complaints about slider sensitivity.

### Pitfall 5: Per-Track Mute/Solo Implementation Complexity
**What goes wrong:** Adding mute/solo requires complex state management and cross-track coordination.
**Why it happens:** Mute affects one track, solo affects all other tracks, and both need consistent behavior during playback.
**How to avoid:**
- Mute: Simple gain toggle on that track (`.changeGainTo(0)` / `.changeGainTo(originalGain)`)
- Solo: Track which track is soloed, mute all others, unmute when solo deactivated
- Only one track can be soloed at a time (or support multi-solo by tracking Set)
**Warning signs:** State inconsistencies when rapidly toggling mute/solo during playback.

## Code Examples

Verified patterns from official sources:

### Creating BeatTrack with Round-Robin Samples
```typescript
// Source: src/index.ts createBeatTrack factory + DrumMachine.vue
const kick = await createBeatTrack([
  '/audio/drum-samples/kick1.wav',
  '/audio/drum-samples/kick2.wav',
  '/audio/drum-samples/kick3.wav',
], {
  numBeats: 16,
  wrapWith: beat => reactive(beat) // Vue only, omit for vanilla
})

// Each beat.play() cycles through samples automatically
```

### Vue Template Binding to Beat Properties
```vue
<!-- Source: DrumMachine.vue template -->
<button
  v-for="(beat, i) in track.beats"
  :key="i"
  @click="beat.active = !beat.active"
  :class="[
    'beat-cell',
    {
      'active': beat.active,
      'current': beat.currentTimeIsPlaying && playing,
      [`track-${track.name.toLowerCase()}`]: beat.active
    }
  ]"
>
  <span class="beat-number">{{ i + 1 }}</span>
</button>
```

### Event-Based Playhead Update (Vanilla)
```typescript
// Pattern for vanilla TS implementation
const cells = Array.from(document.querySelectorAll('.beat-cell'))

kick.on('beat', (e) => {
  const { beatIndex, active, time } = e.detail

  // Clear all current highlights
  cells.forEach(c => c.classList.remove('current'))

  // Highlight current beat
  cells[beatIndex].classList.add('current')

  // Flash only if beat is active (playing sound)
  if (active) {
    cells[beatIndex].classList.add('flash')
    setTimeout(() => cells[beatIndex].classList.remove('flash'), 100)
  }
})
```

### BPM Slider (Linear Mapping)
```vue
<!-- Source: DrumMachine.vue BPM control -->
<label>
  BPM: {{ bpm }}
  <input
    type="range"
    v-model.number="bpm"
    min="60"
    max="200"
    step="1"
  />
</label>

<script setup>
import { watch } from 'vue'

const bpm = ref(120)

watch(bpm, (val) => {
  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack?.setTempo(val))
  }
})
</script>
```

### Cleanup Pattern (Vue)
```typescript
// Source: DrumMachine.vue onUnmounted
import { onUnmounted } from 'vue'

onUnmounted(() => {
  tracks.value.forEach((t) => {
    try {
      t.beatTrack?.stop()
    }
    catch {}
  })
})
```

### Vanilla TS Cleanup Pattern
```typescript
// Pattern for vanilla implementation
let beatTracks: BeatTrack[] = []
function beatHandler(e: CustomEvent) { /* ... */ }

function init() {
  beatTracks.forEach((track) => {
    track.on('beat', beatHandler)
  })
}

function cleanup() {
  beatTracks.forEach((track) => {
    track.off('beat', beatHandler)
    track.stop()
  })
  beatTracks = []
}

// Call cleanup when navigating away or component unmounts
window.addEventListener('beforeunload', cleanup)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Module-level WeakMap for beat caching | Private instance property `_beats` | Phase 10 / Recent | Fixes Vue reactive() and Solid signal compatibility |
| Explicit `initAudio()` calls | Lazy initialization in factory functions | Phase 10 | Simplifies API, removes boilerplate from demos |
| Beat event fires at schedule time | Beat event fires at play time using `audioContextAwareTimeout` | Phase 4/9 refinement | Eliminates visual/audio desync, no setTimeout compensation needed |

**Deprecated/outdated:**
- `markRaw()` workaround for Beat objects — No longer needed after WeakMap removal
- Manual `initAudio()` in every example — Now optional, handled automatically

## Open Questions

1. **Mute/Solo UI Pattern**
   - What we know: Mute is simple (gain toggle), solo requires cross-track coordination
   - What's unclear: Should solo be exclusive (only one track) or multi-solo (Set of soloed tracks)?
   - Recommendation: Start with exclusive solo (simpler, most common in DAWs), can enhance to multi-solo in future if needed

2. **Vanilla TS Demo Wrapper**
   - What we know: VitePress pages can embed Vue components; vanilla TS needs DOM mount point
   - What's unclear: Best pattern for vanilla TS in VitePress (Vue wrapper component vs raw HTML in markdown)
   - Recommendation: Create `DrumMachineVanilla.vue` wrapper that sets up DOM container and imports vanilla TS module, allows same component registration pattern as other demos

3. **Visual Playhead Duration**
   - What we know: `beat.duration` defaults to 100ms, controls how long `currentTimeIsPlaying` stays true
   - What's unclear: Is 100ms optimal for 16th notes at 120-200 BPM? (120 BPM = 125ms per 16th note, 200 BPM = 75ms)
   - Recommendation: Test at 200 BPM (worst case). If visual flash is too short, make duration configurable per BeatTrack

4. **Code Example Positioning**
   - What we know: Both pages need clear code snippets showing the pattern
   - What's unclear: Should code examples be inline in markdown or in collapsible sections?
   - Recommendation: Full working code in collapsible `<details>` sections after the interactive demo, key snippets inline with explanations

## Sources

### Primary (HIGH confidence)
- `/Users/seth/Documents/GitHub/ez-audio/src/beat-track.ts` - BeatTrack implementation, event firing, scheduler
- `/Users/seth/Documents/GitHub/ez-audio/src/beat.ts` - Beat class auto-toggling properties
- `/Users/seth/Documents/GitHub/ez-audio/src/utils/timeout.ts` - audioContextAwareTimeout implementation
- `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/theme/components/DrumMachine.vue` - Working Vue reactive demo
- `/Users/seth/Documents/GitHub/ez-audio/docs/examples/drum-machine.md` - Existing overview page structure
- `/Users/seth/Documents/GitHub/ez-audio/.planning/ROADMAP.md` - Phase goals and success criteria
- CLAUDE.md - Project instructions, WeakMap fix context

### Secondary (MEDIUM confidence)
- VitePress documentation - Vue component integration in markdown (verified by existing demo components)
- Web Audio API specification - AudioContext.currentTime accuracy (industry standard)

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions locked in package.json
- Architecture: HIGH - Existing DrumMachine.vue proves pattern works, audioContextAwareTimeout verified in codebase
- Pitfalls: HIGH - Timing pitfalls documented in prior phase research, WeakMap issue resolved and documented in CLAUDE.md

**Research date:** 2026-02-15
**Valid until:** 2026-03-17 (30 days - stable codebase, no external dependencies changing)

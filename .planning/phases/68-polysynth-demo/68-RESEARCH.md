# Phase 68: PolySynth Demo - Research

**Researched:** 2026-03-09
**Domain:** Vue demo component for PolySynth voice allocation
**Confidence:** HIGH

## Summary

This phase builds an interactive demo page for the existing `PolySynth` class. The demo reuses `PianoKeyboard.vue` for note input and copies the ADSR/waveform pattern from `SynthKeyboard.vue`, adding voice management UI (voice counter, steal strategy selector, max voices slider). No library code changes needed.

The critical design constraint is that `PolySynth.maxVoices` and `PolySynth.stealStrategy` are **both immutable** after construction (`private readonly`). Changing either requires disposing the current instance and creating a new one. The demo must handle this recreation seamlessly -- stopping all active voices, disposing, and recreating with new options.

**Primary recommendation:** Structure the demo with a `recreateSynth()` function that watches maxVoices and stealStrategy refs, disposing and recreating the PolySynth on change. All other parameters (ADSR, waveform, gain) apply to new notes without requiring recreation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Voice count badge with fill bar: "Voices: 3 / 8 [fill bar]" -- right-aligned above keyboard
- Brief text flash on voice steal events: fades after ~1 second
- Steal strategy dropdown next to voice counter badge
- Reuse SynthKeyboard.vue pattern for ADSR: 4 sliders + preset buttons (Piano, Pad, Pluck, Lead)
- Include waveform type selector alongside ADSR
- All controls above keyboard: top-to-bottom flow (configure -> play)
- ADSR and waveform changes apply only to NEW notes
- Max voices slider: 1-8 voices, near voice counter and strategy dropdown
- Reducing max voices below current active count immediately steals excess voices
- Default: 4 voices
- Changing strategy while voices are playing has no immediate effect -- applies on next steal only

### Claude's Discretion
- Exact keyboard range (PianoKeyboard startNote/endNote)
- Controls section styling and spacing
- Fill bar visual design (colors, animation)
- Steal notification exact styling and fade timing
- Master gain/volume control (if needed)
- Error state handling
- Whether to include a volume warning

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POLY-01 | User can play polyphonic notes via keyboard UI (reuses PianoKeyboard.vue) | PianoKeyboard emits noteOn/noteOff; PolySynth.play() accepts frequency; frequencyMap converts note names |
| POLY-02 | User can see active voice count and max voices displayed | PolySynth.activeVoices getter; needs polling via requestAnimationFrame since no event on voice count change |
| POLY-03 | User can switch between steal strategies live | Strategies are `lru`/`oldest-active`/`quietest` (NOT "oldest/newest" as discussed); requires PolySynth recreation since stealStrategy is readonly |
| POLY-04 | User can adjust ADSR envelope parameters for synth voices | Copy SynthKeyboard.vue ADSR pattern; envelope passed to createPolySynth options; changes require recreation or apply to next createPolySynth call |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | (existing) | Component framework | VitePress docs site uses Vue |
| ez-web-audio | (local) | Audio library being demoed | This IS the library |
| PianoKeyboard.vue | (existing) | Piano keyboard UI | Already built, emits noteOn/noteOff |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| VitePress | (existing) | Docs site framework | Page routing, markdown integration |

No new dependencies needed.

## Architecture Patterns

### File Structure
```
docs/
  examples/
    polysynth.md                     # Demo page with code example
  .vitepress/
    theme/components/
      PolySynthDemo.vue              # Main demo component
    config.mts                       # Add sidebar entry
e2e/
  interactions.spec.ts               # Add polysynth test cases
```

### Pattern 1: PolySynth Recreation on Immutable Param Change

**What:** `maxVoices` and `stealStrategy` are `private readonly` on PolySynth. Changing either requires `dispose()` + `createPolySynth()`.

**When to use:** When user changes max voices slider or steal strategy dropdown.

**Example:**
```typescript
// Source: src/poly-synth.ts lines 216-217, 236-237
// private readonly _maxVoices: number
// private readonly _stealStrategy: StealStrategy

const maxVoices = ref(4)
const stealStrategy = ref<StealStrategy>('lru')
let synth: PolySynth | null = null

async function recreateSynth() {
  if (!lib) return
  // Stop and dispose old synth
  if (synth) {
    synth.stopAll()
    synth.dispose()
    synth = null
    activeNotes.value.clear()
    voiceHandles.clear()
  }
  // Create new synth with current settings
  synth = await lib.createPolySynth({
    maxVoices: maxVoices.value,
    stealStrategy: stealStrategy.value,
    type: waveType.value,
    envelope: { ...envelope.value },
  })
  synth.changeGainTo(masterGain.value)
  // Re-register voicestolen listener
  synth.on('voicestolen', handleVoiceStolen)
}

watch([maxVoices, stealStrategy], () => {
  if (synth) recreateSynth()
})
```

### Pattern 2: Voice Handle Tracking

**What:** Track VoiceHandle per note for noteOff → handle.stop() mapping.

**Example:**
```typescript
// Source: src/poly-synth.ts play() returns VoiceHandle
const voiceHandles = new Map<string, VoiceHandle>()

async function handleNoteOn(note: string) {
  await ensureLoaded()
  if (!synth) await recreateSynth()

  const frequency = lib.frequencyMap[note]
  if (!frequency) return

  // Old handle for same note auto-invalidated by PolySynth retrigger
  const handle = synth.play({ frequency })
  voiceHandles.set(note, handle)
  activeNotes.value.add(note)
}

function handleNoteOff(note: string) {
  const handle = voiceHandles.get(note)
  if (handle?.active) {
    handle.stop()
  }
  voiceHandles.delete(note)
  activeNotes.value.delete(note)
}
```

### Pattern 3: Voice Count Polling via requestAnimationFrame

**What:** PolySynth has no event for activeVoices changing. Poll via rAF for smooth UI updates.

**Example:**
```typescript
const voiceCount = ref(0)
let rafId: number | null = null

function pollVoiceCount() {
  if (synth) {
    voiceCount.value = synth.activeVoices
  }
  rafId = requestAnimationFrame(pollVoiceCount)
}

// Start polling on mount, stop on unmount
onMounted(() => { rafId = requestAnimationFrame(pollVoiceCount) })
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId) })
```

### Pattern 4: Steal Strategy Label Mapping

**What:** Map internal API values to user-friendly labels. The CONTEXT.md mentions "oldest/quietest/newest" but the actual API has `lru`/`oldest-active`/`quietest`. There is NO "newest" strategy.

**Example:**
```typescript
// Source: src/poly-synth.ts line 18
// export type StealStrategy = 'lru' | 'oldest-active' | 'quietest'
const strategyOptions = [
  { value: 'lru', label: 'Oldest (LRU)' },
  { value: 'oldest-active', label: 'Oldest Active' },
  { value: 'quietest', label: 'Quietest' },
] as const
```

### Pattern 5: Voice Stolen Notification

**What:** Flash a notification when a voice is stolen, auto-fade after ~1s.

**Example:**
```typescript
const stealMessage = ref('')
let stealTimeout: ReturnType<typeof setTimeout> | null = null

function handleVoiceStolen(event: CustomEvent) {
  const { stolenFrequency, newFrequency } = event.detail
  stealMessage.value = `Voice stolen (${stealStrategy.value})`
  if (stealTimeout) clearTimeout(stealTimeout)
  stealTimeout = setTimeout(() => { stealMessage.value = '' }, 1200)
}
```

### Pattern 6: Max Voices Reduction Below Active Count

**What:** When user lowers max voices below current active count, the demo must recreate the synth (which calls stopAll via dispose), effectively stealing all excess voices.

**Implementation:** The `recreateSynth()` watch handler already covers this -- disposing stops all voices, and the new synth has the lower maxVoices limit.

### Anti-Patterns to Avoid
- **Creating individual Oscillators instead of using PolySynth:** SynthKeyboard.vue creates oscillators directly. The PolySynth demo MUST use `createPolySynth()` to show the library's polyphony features.
- **Trying to mutate maxVoices/stealStrategy:** Both are readonly. Always recreate.
- **Forgetting to dispose old synth:** Memory leak. Always call `synth.dispose()` before creating new instance.
- **Using note names directly with PolySynth.play():** PolySynth takes `{ frequency: number }`, not note names. Must use `frequencyMap` to convert.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Piano keyboard UI | Custom key layout | PianoKeyboard.vue | Already handles mouse, touch, computer keyboard input |
| Note-to-frequency mapping | Manual frequency calculation | `frequencyMap` from ez-web-audio | Complete chromatic map already exists |
| Voice pool management | Manual oscillator tracking | `createPolySynth()` | That's literally what this demo is showing |
| ADSR preset values | New presets | Copy from SynthKeyboard.vue | Proven values: piano/pad/pluck/lead |

## Common Pitfalls

### Pitfall 1: Stale VoiceHandles After Recreation
**What goes wrong:** User is holding keys when synth is recreated (strategy/maxVoices change). Old handles become stale but noteOff still tries to stop them.
**Why it happens:** VoiceHandle._invalidate() is called on dispose, but the voiceHandles Map still references them.
**How to avoid:** Clear the voiceHandles Map and activeNotes Set during recreation. The no-op behavior of stale handles (stop() silently returns) provides safety.
**Warning signs:** Notes "stick" after changing strategy.

### Pitfall 2: No "newest" Steal Strategy
**What goes wrong:** CONTEXT.md discussion mentions "oldest/quietest/newest" but the library only has `lru`/`oldest-active`/`quietest`.
**Why it happens:** Terminology mismatch between user discussion and actual API.
**How to avoid:** Use actual `StealStrategy` type values. Map to descriptive labels in the UI dropdown.
**Warning signs:** TypeScript error on invalid strategy string.

### Pitfall 3: Voice Count Display Lag
**What goes wrong:** Voice count display doesn't update instantly because there's no event for voice count changes.
**Why it happens:** PolySynth emits `voicestolen` but not `voicestarted` or `voicestopped`.
**How to avoid:** Poll `synth.activeVoices` via requestAnimationFrame for smooth updates. Alternatively, increment/decrement a local counter in noteOn/noteOff handlers (but this can drift from actual state).
**Warning signs:** Counter shows wrong number after rapid play/stop.

### Pitfall 4: ADSR Changes Requiring Recreation
**What goes wrong:** User changes ADSR and expects currently playing notes to change envelope.
**Why it happens:** Envelope is set at PolySynth creation time in the voice factory.
**How to avoid:** Per CONTEXT.md decision: "ADSR and waveform changes apply only to NEW notes." However, since envelope is baked into the voice factory at creation, changing ADSR actually requires synth recreation to affect new notes. Watch ADSR/waveform refs and recreate.
**Warning signs:** ADSR slider changes have no effect on new notes.

### Pitfall 5: Lazy Init Must Handle First noteOn
**What goes wrong:** User clicks a key but no sound plays because synth hasn't been created yet.
**Why it happens:** Following `ensureLoaded()` pattern but forgetting to create synth.
**How to avoid:** `handleNoteOn` should call `ensureLoaded()` then `if (!synth) await recreateSynth()`.
**Warning signs:** First click produces no sound.

## Code Examples

### Complete PolySynth Integration Pattern
```typescript
// Source: src/poly-synth.ts, src/index.ts
import type { PolySynth, StealStrategy, VoiceHandle } from 'ez-web-audio'

let lib: typeof import('ez-web-audio') | null = null
let synth: PolySynth | null = null

async function ensureLoaded() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
}

async function createSynth() {
  await ensureLoaded()
  synth = await lib!.createPolySynth({
    maxVoices: maxVoices.value,
    stealStrategy: stealStrategy.value,
    type: waveType.value,
    envelope: { ...envelope.value },
  })
  synth.changeGainTo(0.3)
  synth.on('voicestolen', handleVoiceStolen)
}
```

### Sidebar Config Entry
```typescript
// docs/.vitepress/config.mts — add to Synthesis section or new Polyphony section
{ text: 'PolySynth', link: '/examples/polysynth' }
```

### Markdown Page Pattern
```markdown
---
title: Polyphonic Synth
description: Interactive demo of polyphonic voice allocation with steal strategies
---

# Polyphonic Synth

<script setup>
import PolySynthDemo from '../.vitepress/theme/components/PolySynthDemo.vue'
</script>

<PolySynthDemo />

## How It Works
...

### Code Example
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual oscillator tracking (SynthKeyboard.vue) | PolySynth with voice pool | M5 (Phase 53-60) | Automatic voice allocation, stealing, shared bus |

**Key API facts (verified from source):**
- `StealStrategy = 'lru' | 'oldest-active' | 'quietest'` (no "newest")
- `maxVoices` and `stealStrategy` are both readonly after construction
- `VoiceHandle.stop()` is async, returns Promise<void>
- `VoiceHandle.active` getter indicates if handle is still valid
- `voicestolen` event detail: `{ stolenFrequency, newFrequency, time, source }`
- `PolySynth.activeVoices` getter returns current count
- `PolySynth.dispose()` is idempotent

## Open Questions

1. **ADSR/waveform changes and recreation timing**
   - What we know: Envelope is baked into voice factory at construction. Changing it requires recreation.
   - What's unclear: Should we recreate on every slider change (expensive, stops all notes) or batch changes?
   - Recommendation: Recreate only when user releases slider (debounce ~300ms) or on next noteOn. Simplest: recreate on next noteOn if envelope/waveform changed since last creation (dirty flag pattern).

2. **Voice count polling frequency**
   - What we know: rAF polls at 60fps. PolySynth has no voice count change event.
   - What's unclear: Is 60fps polling wasteful for a simple counter?
   - Recommendation: Use rAF -- the overhead is negligible for a single property read, and it ensures the fill bar animates smoothly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (Chromium only) |
| Config file | `playwright.config.ts` |
| Quick run command | `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth"` |
| Full suite command | `pnpm exec playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLY-01 | Piano keys clickable, no JS errors | E2E smoke | `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth.*keyboard"` | Wave 0 |
| POLY-02 | Voice counter visible on page | E2E smoke | `pnpm exec playwright test e2e/interactions.spec.ts --grep "voice count"` | Wave 0 |
| POLY-03 | Strategy dropdown changes value | E2E interaction | `pnpm exec playwright test e2e/interactions.spec.ts --grep "steal strategy"` | Wave 0 |
| POLY-04 | ADSR sliders present and interactive | E2E interaction | `pnpm exec playwright test e2e/interactions.spec.ts --grep "ADSR"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm exec playwright test e2e/interactions.spec.ts --grep "PolySynth"`
- **Per wave merge:** `pnpm exec playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add `PolySynth` test describe block in `e2e/interactions.spec.ts`
- [ ] Add page load smoke test in `e2e/demos.spec.ts` for polysynth page

## Sources

### Primary (HIGH confidence)
- `src/poly-synth.ts` - PolySynth class, StealStrategy type, VoiceHandle, readonly constraints
- `src/index.ts` - createPolySynth factory function signature
- `src/events/event-types.ts` - VoiceStolenEventDetail shape
- `docs/.vitepress/theme/components/PianoKeyboard.vue` - Reusable keyboard component API
- `docs/.vitepress/theme/components/SynthKeyboard.vue` - ADSR/waveform pattern to copy
- `docs/.vitepress/theme/components/LFODemo.vue` - Phase 67 demo pattern reference
- `e2e/interactions.spec.ts` - E2E test patterns for demo pages

### Secondary (MEDIUM confidence)
- `docs/.vitepress/config.mts` - Sidebar configuration structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components exist in codebase, no new dependencies
- Architecture: HIGH - patterns verified directly from source code, readonly constraints confirmed
- Pitfalls: HIGH - derived from actual API analysis (readonly fields, strategy naming mismatch)

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no library changes planned for M7)

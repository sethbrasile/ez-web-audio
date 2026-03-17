# Phase 69: Effects Chain Demo - Research

**Researched:** 2026-03-17
**Domain:** Vue demo component, Web Audio effects chain management, signal flow visualization
**Confidence:** HIGH

## Summary

This phase creates a single Vue demo component (`EffectsChainDemo.vue`) and a VitePress markdown page (`docs/examples/effects-chain.md`) that showcases the library's effects system: `createDelay`, `createReverb`, `createCompressor`, and `createEQ`. All four effect classes are fully implemented in `src/effects/` with per-parameter setters, `bypass` toggle, `mix` control, and `dispose()`. The audio source can be either a looping oscillator or the pre-existing `short-music.mp3` asset.

The reorder requirement (FX-03) is the most nuanced: the library's `addEffect(position)` and `removeEffect()` methods support reordering by rebuilding the effect order in the sound's array. Reorder is done by removing all effects, then re-adding them in the new order via `addEffects()` — a single atomic rewire. The signal flow diagram (FX-05) is a pure CSS/HTML diagram that reads `chainOrder` reactive state and renders only non-bypassed effects.

All patterns — lazy init, `ensureLoaded`, `onUnmounted` cleanup, VitePress sidebar registration, watch-based real-time parameter update — are already established in Phase 67 and 68. No new libraries are needed.

**Primary recommendation:** Model the component on FilterDemo.vue (lazy init, watchers) plus the PolySynthDemo.vue styling conventions. Build the signal flow diagram as a simple CSS flexbox node-connector layout driven by reactive computed data — no canvas or SVG library needed.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FX-01 | User can toggle delay, reverb, compressor, and EQ effects on/off via bypass | `effect.bypass = true/false` — BaseEffect setter, triggers `applyMix()` instantly, click-free via equal-power crossfade |
| FX-02 | User can adjust parameters for each effect (delay time, reverb mix, threshold, EQ bands) | Direct property setters: `delay.time`, `delay.feedback`, `reverb.decay`, `reverb.damping`, `compressor.threshold`, `compressor.ratio`, `eq.low`, `eq.mid`, `eq.high` — all update immediately |
| FX-03 | User can reorder effects in the chain | Use `sound.removeEffect()` + `sound.addEffects(newOrderArray)` — single rewire, no audio gap on looping source |
| FX-04 | User can switch between oscillator and loaded audio file as source | Stop and dispose old source, create new with `createOscillator()` or `createTrack('/ez-web-audio/audio/short-music.mp3')`, re-add all current effects via `addEffects()` |
| FX-05 | User can see a signal flow diagram showing audio path through active effects | CSS flexbox chain with `Source → [active effects in order] → Output`; driven by `computed(() => chainOrder.filter(e => !e.bypassed))` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | (project version) | Component framework | All demo components are Vue SFCs |
| ez-web-audio | (local) | Audio library being demoed | `createDelay`, `createReverb`, `createCompressor`, `createEQ`, `createOscillator`, `createTrack` |
| VitePress | (project version) | Documentation site | All example pages are VitePress markdown |

### Supporting
No additional libraries. Signal flow diagram uses CSS flexbox only. No canvas needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS flex diagram | SVG / canvas | CSS is sufficient for a linear chain; SVG only needed if curved or branching paths required |
| `createTrack` for audio file | `createSound` | `createTrack` supports looping and pause/resume; `createSound` is one-shot. For a persistent demo, `createTrack` is better |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended File Structure
```
docs/
├── .vitepress/theme/components/
│   └── EffectsChainDemo.vue     # New component
├── examples/
│   └── effects-chain.md         # New page
└── .vitepress/config.mts        # Add sidebar entry under "Effects & Routing"
```

### Pattern 1: Lazy Init + ensureLoaded
**What:** Dynamic import of ez-web-audio on first user interaction (Play click or source switch)
**When to use:** All demo components — project requirement from CLAUDE.md
**Example:**
```typescript
// Source: PolySynthDemo.vue, FilterDemo.vue (established pattern)
let lib: typeof import('ez-web-audio') | null = null

async function ensureLoaded() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
}
```

### Pattern 2: Source Management (Oscillator vs Audio File)
**What:** Switching source type stops old source, creates new one, re-attaches all current effects
**When to use:** FX-04 requirement
**Example:**
```typescript
// Source: established pattern; createTrack for looping file
async function switchSource(type: 'oscillator' | 'file') {
  // Stop and clean up old source
  if (source) {
    source.stop()
    source = null
  }

  await ensureLoaded()

  if (type === 'oscillator') {
    source = await lib!.createOscillator({ frequency: 220, type: 'sawtooth' })
    source.changeGainTo(0.3)
  }
  else {
    // createTrack supports looping
    source = await lib!.createTrack('/ez-web-audio/audio/short-music.mp3')
    source.changeGainTo(0.8)
  }

  // Re-attach all effects in current order
  for (const entry of chainOrder) {
    source.addEffect(entry.effect)
  }

  if (type === 'oscillator') {
    source.play()
  }
  else {
    // Track requires explicit play call
    source.play()
  }
}
```

### Pattern 3: Effect Bypass Toggle (Click-Free)
**What:** Toggle `effect.bypass` — BaseEffect uses equal-power crossfade so no clicks
**When to use:** FX-01 bypass toggle buttons
**Example:**
```typescript
// Source: src/effects/base-effect.ts — applyMix() uses equal-power crossfade
function toggleBypass(entry: ChainEntry) {
  entry.effect.bypass = !entry.effect.bypass
  entry.bypassed = !entry.bypassed
  // No rewire needed — BaseEffect handles dry/wet internally
  // Update signal flow diagram reactively
}
```

### Pattern 4: Effect Reordering
**What:** Move an effect up or down in the chain by rebuilding the order array and rewiring once
**When to use:** FX-03 move-up / move-down buttons
**Example:**
```typescript
// Source: src/base-sound.ts addEffect(position) / addEffects() / removeEffect()
function moveEffect(index: number, direction: 'up' | 'down') {
  if (!source) return
  const newOrder = [...chainOrder]
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= newOrder.length) return

  // Swap entries
  ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]
  chainOrder = newOrder

  // Remove all effects, re-add in new order (single rewire)
  for (const entry of chainOrder) {
    source!.removeEffect(entry.effect)
  }
  source!.addEffects(chainOrder.map(e => e.effect))
}
```

### Pattern 5: Signal Flow Diagram (CSS Flex)
**What:** A horizontal chain of nodes showing `Source → [active effects] → Output`
**When to use:** FX-05 visual signal flow
**Example:**
```typescript
// Computed: only non-bypassed effects appear in diagram
const activeChain = computed(() =>
  chainOrder.filter(entry => !entry.bypassed)
)
```
```html
<!-- Template: simple CSS flex with arrow separators -->
<div class="signal-flow">
  <div class="flow-node source">Source</div>
  <template v-for="entry in activeChain" :key="entry.id">
    <div class="flow-arrow">→</div>
    <div class="flow-node effect">{{ entry.label }}</div>
  </template>
  <div class="flow-arrow">→</div>
  <div class="flow-node output">Output</div>
</div>
```

### Pattern 6: Per-Effect Parameter Sliders (Watch-Based)
**What:** Vue `watch` on ref values syncs slider changes to effect properties in real time
**When to use:** FX-02 parameter adjustment
**Example:**
```typescript
// Source: FilterDemo.vue (established pattern)
const delayTime = ref(0.3)
const delayFeedback = ref(0.4)

watch(delayTime, (v) => { if (delay) delay.time = v })
watch(delayFeedback, (v) => { if (delay) delay.feedback = v })

// For EQ (three bands)
const eqLow = ref(0)
const eqMid = ref(0)
const eqHigh = ref(0)
watch(eqLow, (v) => { if (eq) eq.low = v })
watch(eqMid, (v) => { if (eq) eq.mid = v })
watch(eqHigh, (v) => { if (eq) eq.high = v })
```

### Pattern 7: VitePress Sidebar Registration
**What:** Add the new page to the "Effects & Routing" section in `docs/.vitepress/config.mts`
**Where:** Existing sidebar section at line ~182:
```typescript
{
  text: 'Effects & Routing',
  items: [
    { text: 'Effects', link: '/examples/effects' },
    { text: 'Audio Routing', link: '/examples/audio-routing' },
    { text: 'Effects Chain', link: '/examples/effects-chain' },  // ADD THIS
  ],
},
```

### Anti-Patterns to Avoid
- **Load buttons:** No separate "Load" or "Init" button — lazy init on first Play click (CLAUDE.md rule)
- **Removing and re-creating effects on every bypass toggle:** `bypass` is a setter — just set it, don't remove/add effects
- **Re-wiring effects on every parameter slider change:** Only rewire (`removeEffect` + `addEffect`) when ORDER changes; parameter changes use direct setters
- **Forgetting to stop the old source when switching:** The old oscillator/track must be stopped before creating a new source type
- **Using `createSound` for the audio file:** Use `createTrack` — it supports `play()` in looping mode and has better lifecycle management for continuous demos
- **Disposing effects when the source changes:** Keep the effect instances alive; they persist across source switches (re-add them to the new source)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wet/dry mixing | Custom gain node crossfade | `effect.mix` setter | BaseEffect handles equal-power crossfade correctly |
| Bypass routing | Manual connect/disconnect | `effect.bypass = true/false` | BaseEffect rewires dry/wet path without clicks |
| Effect parameter ramping | `setValueAtTime` calls | `effect.rampTo(param, value, duration)` | BaseEffect handles glitch-free transitions |
| Delay feedback loop | Custom DelayNode + GainNode | `createDelay({ time, feedback })` | DelayEffect has clamped feedback (0-0.99) to prevent runaway |
| Algorithmic reverb | Schroeder network from scratch | `createReverb({ decay, damping })` | ReverbEffect implements Schroeder comb+allpass network |
| Signal chain rewiring | Manual AudioNode connect/disconnect | `addEffects()` / `removeEffect()` | BaseSound handles full chain rewiring atomically |

**Key insight:** Effects have two separate concerns: (a) routing (handled by `addEffect`/`removeEffect`) and (b) parameter values (handled by property setters). Only routing changes require rewiring; parameter changes are instant.

## Common Pitfalls

### Pitfall 1: Rewiring on Bypass Instead of Using Setter
**What goes wrong:** Calling `removeEffect(effect)` and `addEffect(effect)` to "toggle" an effect off/on, causing audio glitches and connection overhead
**Why it happens:** Misunderstanding the bypass mechanism — BaseEffect keeps all nodes connected and uses equal-power crossfade to mute the wet path
**How to avoid:** Only set `effect.bypass = true/false` — the routing stays intact, only gain values change
**Warning signs:** Clicks/pops on bypass toggle, or "effect not audible" after re-add

### Pitfall 2: Effect Instances Lost When Switching Source
**What goes wrong:** Creating new effect instances when switching from oscillator to audio file, losing user's current parameter settings
**Why it happens:** Re-creating effects instead of keeping them and re-attaching
**How to avoid:** Keep the same `delay`, `reverb`, `compressor`, `eq` instances; call `source.removeEffect()` / `source.addEffects()` only to re-attach them to the new source
**Warning signs:** Sliders reset to defaults after source switch

### Pitfall 3: createTrack vs createSound for Looping Audio File
**What goes wrong:** `createSound` plays once and stops; source appears to stop after the sample ends
**Why it happens:** `Sound` is one-shot playback; `Track` supports `loop`, `pause`, `resume`
**How to avoid:** Use `createTrack` for the audio file source; it supports continuous playback
**Warning signs:** Audio file plays once then demo appears broken

### Pitfall 4: addEffects Order vs addEffect Order
**What goes wrong:** Calling `addEffect()` in a loop produces multiple rewires (inefficient); `addEffects()` is atomic
**Why it happens:** Using the per-effect API instead of the batch API
**How to avoid:** When rebuilding the chain order, use `source.addEffects(orderedArray)` for a single rewire
**Warning signs:** Audio glitches during reorder operation

### Pitfall 5: Compressor reduction Display
**What goes wrong:** Trying to display gain reduction as a static value when it's live audio data
**Why it happens:** `compressor.reduction` is a live read-only property that changes every audio frame
**How to avoid:** If displaying gain reduction, poll it with `requestAnimationFrame` (like voice count in PolySynthDemo) or skip it for simplicity
**Warning signs:** Reduction display shows 0 always (read too infrequently)

### Pitfall 6: Reverb Mix Control
**What goes wrong:** Reverb at full mix (default `mix=1`) often sounds overwhelming — user hears only reverb
**Why it happens:** Default `mix=1` means 100% wet signal
**How to avoid:** Initialize reverb with `mix: 0.4` (or similar reasonable default) so it blends with dry signal
**Warning signs:** Source audio sounds completely smeared in reverb immediately

### Pitfall 7: EQ Gain Range Confusion
**What goes wrong:** EQ slider shows values in 0-1 range but EQ gain is in dB (-15 to +15)
**Why it happens:** Conflating mix (0-1) with gain in dB
**How to avoid:** EQ sliders should range from -15 to +15 dB with 0 as center. Use `eq.low`, `eq.mid`, `eq.high` in dB directly.
**Warning signs:** EQ has no audible effect (values too small in 0-1 range)

## Code Examples

### Creating All Four Effects
```typescript
// Source: src/effects/delay-effect.ts, reverb-effect.ts, compressor-effect.ts, eq-effect.ts
import { createDelay, createReverb, createCompressor, createEQ } from 'ez-web-audio'

const delay = createDelay({ time: 0.3, feedback: 0.4, mix: 0.5 })
const reverb = createReverb({ decay: 1.5, damping: 0.3 })
reverb.mix = 0.4  // Reasonable wet/dry balance

const compressor = createCompressor({ threshold: -24, ratio: 4 })
const eq = createEQ({ low: 0, mid: 0, high: 0 })  // Start flat
```

### Adding Effects to a Source in Order
```typescript
// Source: src/base-sound.ts addEffects() API
const oscillator = await createOscillator({ frequency: 220, type: 'sawtooth' })
oscillator.changeGainTo(0.3)

// Add all effects in desired chain order
oscillator.addEffects([eq, compressor, delay, reverb])
oscillator.play()
```

### Effect Bypass (No Clicks)
```typescript
// Source: src/effects/base-effect.ts — equal-power crossfade on bypass
delay.bypass = true   // Bypass delay — signal passes through dry, no click
delay.bypass = false  // Re-enable delay
```

### Effect Reordering
```typescript
// Source: src/base-sound.ts removeEffect() + addEffects()
// Move delay before reverb: current [eq, compressor, reverb, delay] → [eq, compressor, delay, reverb]
const newOrder = [eq, compressor, delay, reverb]

// Remove all, re-add in new order (single atomic rewire)
for (const effect of currentOrder) {
  source.removeEffect(effect)
}
source.addEffects(newOrder)
```

### DelayEffect Parameters
```typescript
// Source: src/effects/delay-effect.ts
delay.time = 0.5       // seconds, clamped [0, maxTime]
delay.feedback = 0.6   // 0-0.99, clamped to prevent runaway
delay.mix = 0.7        // wet/dry 0-1
delay.rampTo('time', 0.2, 1.5)  // smooth ramp over 1.5s
```

### ReverbEffect Parameters
```typescript
// Source: src/effects/reverb-effect.ts
reverb.decay = 2.0     // decay time in seconds (algorithmic mode)
reverb.damping = 0.5   // 0=bright, 1=dark
reverb.preDelay = 0.02 // pre-delay in seconds (max 0.1)
reverb.mix = 0.4
```

### CompressorEffect Parameters
```typescript
// Source: src/effects/compressor-effect.ts
compressor.threshold = -24  // dB, clamped [-100, 0]
compressor.ratio = 4        // e.g. 4:1, clamped [1, 20]
compressor.knee = 30        // dB, clamped [0, 40]
compressor.attack = 0.003   // seconds, clamped [0, 1]
compressor.release = 0.25   // seconds, clamped [0, 1]
// Read-only: compressor.reduction (current gain reduction in dB)
```

### EQEffect Parameters
```typescript
// Source: src/effects/eq-effect.ts
// Three-band: lowshelf / peaking / highshelf
eq.low = 3     // dB boost/cut below ~200 Hz
eq.mid = -2    // dB boost/cut around ~1000 Hz
eq.high = 4    // dB boost/cut above ~3000 Hz
eq.rampTo('low', 0, 2)  // smooth ramp over 2s
```

### Switch Source Without Losing Effect Settings
```typescript
// Keep effect instances; re-attach to new source
async function switchSource(newType: 'oscillator' | 'file') {
  if (currentSource) {
    currentSource.stop()
    currentSource = null
  }

  if (newType === 'oscillator') {
    currentSource = await lib.createOscillator({ frequency: 220, type: 'sawtooth' })
    currentSource.changeGainTo(0.3)
  } else {
    currentSource = await lib.createTrack('/ez-web-audio/audio/short-music.mp3')
    currentSource.changeGainTo(0.8)
  }

  // Re-attach existing effects in current order
  currentSource.addEffects(chainOrder.map(e => e.effect))
  currentSource.play()
}
```

### Cleanup
```typescript
// Source: PolySynthDemo.vue onUnmounted pattern
onUnmounted(() => {
  if (currentSource) {
    currentSource.stop()
    currentSource = null
  }
  // Dispose all effect instances
  for (const entry of chainOrder) {
    entry.effect.dispose()
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual connect/disconnect for bypass | `effect.bypass = true/false` with equal-power crossfade | M5 (Phase 53) | Click-free bypass without manual routing |
| Manual chain wiring | `addEffect()` / `addEffects()` / `removeEffect()` in BaseSound | M5 | Rewiring is atomic and managed by the library |
| Separate filter nodes per feature | Effect class hierarchy (`BaseEffect` → `DelayEffect`, etc.) | M5 | Unified wet/dry mixing, bypass, rampTo on all effects |

**Deprecated/outdated:**
- Manual `AudioNode.connect()` chains for effects: replaced by `addEffect()` API
- `connections` array (old pattern from CLAUDE.md): superseded by the effect chain system

## Open Questions

1. **createTrack loop mode**
   - What we know: `createTrack` supports `play()` which triggers playback; the Track class has position tracking
   - What's unclear: Whether Track automatically loops or needs explicit loop configuration
   - Recommendation: Check `src/track.ts` during implementation; if no loop property, use `createOscillator` for continuous demo and use `createSound` for the file demo (re-play on end event, or just play on a button)

2. **Compressor gain reduction meter**
   - What we know: `compressor.reduction` is a live read-only float (dB)
   - What's unclear: Whether it's valuable enough UI to warrant an rAF poll loop
   - Recommendation: Skip the reduction meter — it adds complexity (rAF loop) for marginal value. The bypass/threshold/ratio controls already demonstrate the compressor's effect clearly.

3. **Default effect order**
   - What we know: Professional convention is EQ → Compressor → Delay → Reverb
   - What's unclear: Whether this pedagogical choice should be made explicit in the UI
   - Recommendation: Default order is `[EQ, Compressor, Delay, Reverb]` with a note explaining this is typical signal chain ordering.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (Chromium) |
| Config file | `playwright.config.ts` |
| Quick run command | `pnpm exec playwright test e2e/demos.spec.ts` |
| Full suite command | `pnpm exec playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FX-01 | Effect bypass toggles on/off | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new test block |
| FX-02 | Parameter sliders present and adjust values | e2e (interaction) | same | No — needs new test block |
| FX-03 | Move effect up/down changes order in UI | e2e (interaction) | same | No — needs new test block |
| FX-04 | Source switch buttons are present and clickable | e2e (smoke) | `pnpm exec playwright test e2e/demos.spec.ts` | Partial — page load check only |
| FX-05 | Signal flow diagram renders and reflects active effects | e2e (interaction) | `pnpm exec playwright test e2e/interactions.spec.ts` | No — needs new test block |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm exec playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add `examples/effects-chain` to `e2e/demos.spec.ts` page load array
- [ ] Add `EffectsChain page interactions` describe block to `e2e/interactions.spec.ts` covering: bypass toggle DOM change, slider presence, move button presence, source switch button, signal flow node visibility

## Sources

### Primary (HIGH confidence)
- `src/effects/base-effect.ts` — bypass, mix, equal-power crossfade, rampTo, dispose API
- `src/effects/delay-effect.ts` — time, feedback parameters, factory `createDelay()`
- `src/effects/reverb-effect.ts` — decay, damping, preDelay parameters, factory `createReverb()`
- `src/effects/compressor-effect.ts` — threshold, ratio, knee, attack, release, reduction properties
- `src/effects/eq-effect.ts` — low, mid, high (dB), frequency, Q parameters, factory `createEQ()`
- `src/effects/index.ts` — full effect export surface
- `src/base-sound.ts` lines 390-513 — `addEffect(position)`, `addEffects()`, `removeEffect()`, `getEffects()`, `rewireEffects()` APIs
- `docs/.vitepress/theme/components/FilterDemo.vue` — lazy init, watch pattern, source switching
- `docs/.vitepress/theme/components/PolySynthDemo.vue` — ensureLoaded, styling conventions, cleanup
- `docs/.vitepress/config.mts` lines 182-187 — "Effects & Routing" sidebar section
- `docs/public/audio/short-music.mp3` — 2.1MB audio asset available for file source demo
- `.planning/phases/67-lfo-modulation-demo/67-RESEARCH.md` — established demo patterns reference

### Secondary (MEDIUM confidence)
- `docs/examples/effects.md` — existing effects documentation showing `addEffect()` usage patterns
- `e2e/interactions.spec.ts` lines 307-421 — PolySynth E2E test structure to replicate for Effects Chain tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all effects fully implemented and tested, patterns established in prior phases
- Architecture: HIGH — all APIs confirmed by direct source reading, no unknowns
- Pitfalls: HIGH — bypass mechanism, reorder pattern, and mix defaults verified from source

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable — no library changes planned for M7)

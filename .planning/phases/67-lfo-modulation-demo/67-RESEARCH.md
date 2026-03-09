# Phase 67: LFO Modulation Demo - Research

**Researched:** 2026-03-09
**Domain:** Vue demo component, canvas animation, Web Audio LFO API
**Confidence:** HIGH

## Summary

This phase creates a single Vue demo component (`LFODemo.vue`) and a VitePress markdown page (`docs/examples/lfo-modulation.md`) that showcases the library's `createLFO()` API with three modulation types: tremolo (gain), vibrato (frequency), and filter sweep (filter cutoff). All patterns needed are already established in 22 existing demo components -- no new libraries or techniques required.

The LFO class (`src/lfo.ts`) has a clean API: `createLFO({ frequency, depth, type })`, `.connect(target, paramName, options)`, `.start()`, `.stop()`, `.dispose()`. Property setters for `frequency`, `depth`, and `type` update immediately while running. For filter sweep, a `FilterEffect` is added to the oscillator via `addEffect()`, and the LFO connects to the filter effect's `'frequency'` param. The canvas visualization draws the LFO waveform shape mathematically (not from analyser data), since the LFO oscillates at sub-audio rates (0.1-20 Hz) that an AnalyserNode cannot meaningfully display.

**Primary recommendation:** Follow the FilterDemo.vue pattern for lazy init + parameter watchers, the VisualizationDemo.vue pattern for DPR-aware canvas with requestAnimationFrame, and draw the LFO waveform mathematically based on current type/rate/depth settings.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tabbed layout with three tabs: Tremolo, Vibrato, Filter Sweep
- One shared Play/Stop button -- oscillator runs continuously, tabs switch what the LFO modulates
- Switching tabs while playing seamlessly transitions the modulation (disconnect old target, connect new target -- no audio interruption)
- Filter Sweep tab auto-creates a lowpass filter on the oscillator -- no separate filter controls exposed
- Lazy init on first Play click (dynamic import + AudioContext), no load buttons
- Canvas shows LFO wave shape only (not the modulated output)
- Scrolling waveform animation (oscilloscope-style, left-to-right)
- Different accent color per tab
- Shared controls across all tabs -- one set of rate/depth/waveform applies to active tab
- Rate slider: 0.1-20 Hz, logarithmic scale
- Depth slider: 0-100% uniform across all tabs
- Waveform type: toggle buttons with visual wave shape icons (sine, square, sawtooth, triangle, sample-and-hold)
- Single oscillator (sawtooth, ~200-440 Hz) -- no carrier waveform selector
- 2-3 named preset buttons that set rate/depth/waveform and switch to appropriate tab

### Claude's Discretion
- Canvas overlay labels (current rate/depth values) -- decide what looks cleanest
- Exact preset names and parameter values
- Oscillator frequency choice within 200-440 Hz range
- Tab visual styling and accent colors
- Canvas height and aspect ratio
- Error state handling

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LFO-01 | User can hear LFO tremolo (gain modulation) on an oscillator | `createLFO({ frequency, depth, type: 'sine' }).connect(oscillator, 'gain')` -- depth uses 'ratio' depthUnit by default for gain |
| LFO-02 | User can hear LFO vibrato (frequency modulation) on an oscillator | `lfo.connect(oscillator, 'frequency')` -- depth uses 'cents' depthUnit by default for frequency |
| LFO-03 | User can hear LFO filter sweep (cutoff modulation) on a filtered oscillator | `createFilterEffect('lowpass', { frequency: 1000 })` added via `oscillator.addEffect(filter)`, then `lfo.connect(filter, 'frequency', { depthUnit: 'absolute' })` |
| LFO-04 | User can see real-time canvas visualization of the LFO waveform | Mathematical waveform drawing on canvas using requestAnimationFrame; not AnalyserNode-based |
| LFO-05 | User can adjust LFO rate and depth per modulation target | LFO `.frequency` and `.depth` setters update immediately while running |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | (project version) | Component framework | All demo components are Vue SFCs |
| ez-web-audio | (local) | Audio library being demoed | `createLFO`, `createOscillator`, `createFilterEffect` |
| VitePress | (project version) | Documentation site | All example pages are VitePress markdown |

### Supporting
No additional libraries needed. Canvas 2D API is native browser.

## Architecture Patterns

### File Structure
```
docs/
├── .vitepress/theme/components/
│   └── LFODemo.vue          # New component
├── examples/
│   └── lfo-modulation.md    # New page
└── .vitepress/config.mts    # Sidebar registration
```

### Pattern 1: Lazy Init on First Interaction
**What:** Dynamic import of ez-web-audio on first Play click, no load buttons
**When to use:** All demo components (project convention)
**Example:**
```typescript
// Source: FilterDemo.vue, OscillatorDemo.vue (established pattern)
let lib: any = null

async function play() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
  oscillator = await lib.createOscillator({ frequency: 330, type: 'sawtooth' })
  // ...
}
```

### Pattern 2: DPR-Aware Canvas Setup
**What:** Device pixel ratio scaling for sharp canvas rendering
**When to use:** Any canvas-based visualization
**Example:**
```typescript
// Source: VisualizationDemo.vue (established pattern)
function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement!
  const logicalWidth = container.clientWidth
  const logicalHeight = 150 // or desired height
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  canvas.dataset.logicalWidth = String(logicalWidth)
  canvas.dataset.logicalHeight = String(logicalHeight)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
}
```

### Pattern 3: LFO Tab Switching (Seamless Modulation Transition)
**What:** Disconnect LFO from old target param, connect to new target param, no audio interruption
**When to use:** Tab switch while playing
**Example:**
```typescript
// Based on LFO API in src/lfo.ts
function switchModulation(newTab: 'tremolo' | 'vibrato' | 'filter') {
  // Disconnect from current target
  lfo.disconnect()

  // Connect to new target
  switch (newTab) {
    case 'tremolo':
      lfo.connect(oscillator, 'gain')
      break
    case 'vibrato':
      lfo.connect(oscillator, 'frequency')
      break
    case 'filter':
      // Ensure filter is attached
      if (!filterAttached) {
        oscillator.addEffect(filter)
        filterAttached = true
      }
      lfo.connect(filter, 'frequency', { depthUnit: 'absolute' })
      break
  }
}
```

### Pattern 4: Mathematical LFO Waveform Drawing
**What:** Draw LFO waveform on canvas using math, not AnalyserNode data
**Why:** LFO operates at 0.1-20 Hz (sub-audio), too slow for meaningful AnalyserNode display. Drawing mathematically gives precise, clean waveform visualization.
**Example:**
```typescript
function drawLFOWaveform(ctx: CanvasRenderingContext2D, width: number, height: number,
  type: string, phase: number, color: string) {
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()

  const centerY = height / 2
  const amplitude = height * 0.4

  for (let x = 0; x < width; x++) {
    const t = (x / width) * Math.PI * 2 * 3 + phase // 3 visible cycles
    let y: number
    switch (type) {
      case 'sine': y = Math.sin(t); break
      case 'square': y = Math.sign(Math.sin(t)); break
      case 'sawtooth': y = 2 * ((t / (2 * Math.PI)) % 1) - 1; break
      case 'triangle': y = 2 * Math.abs(2 * ((t / (2 * Math.PI)) % 1) - 1) - 1; break
      case 'sample-and-hold': /* stepped random */ break
    }
    const py = centerY - y * amplitude
    x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py)
  }
  ctx.stroke()
}
```

### Pattern 5: Logarithmic Slider Mapping
**What:** Map a 0-100 slider to a logarithmic frequency range (0.1-20 Hz)
**Example:**
```typescript
// Source: FilterDemo.vue logarithmic mapping pattern
const rateSlider = ref(50) // 0-100

const rate = computed(() => {
  // Map 0-100 to 0.1-20 Hz logarithmically
  return 0.1 * (200 ** (rateSlider.value / 100))
})
```

### Pattern 6: Sidebar Registration
**What:** Add LFO demo to the examples sidebar in VitePress config
**Where:** `docs/.vitepress/config.mts`, in the `'/examples/'` sidebar under a new or existing section
**Example:** Add `{ text: 'LFO Modulation', link: '/examples/lfo-modulation' }` to a "Modulation" or "Synthesis" section.

### Anti-Patterns to Avoid
- **Load buttons:** Never add a separate "Load" or "Init" button -- lazy init on first Play
- **AnalyserNode for LFO visualization:** LFO runs at 0.1-20 Hz, far below AnalyserNode's useful range -- use mathematical drawing
- **Recreating oscillator on tab switch:** The oscillator must keep playing -- only the LFO connection changes
- **Separate LFO instances per tab:** Use one LFO, disconnect/reconnect on tab switch
- **Forgetting filter lifecycle:** The lowpass filter for Filter Sweep must be added to the oscillator's effect chain and kept attached (or managed carefully) across tab switches

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LFO modulation | Custom gain/frequency scheduling | `createLFO()` API | Library handles depth calculation, S&H, lifecycle |
| Filter on oscillator | BiquadFilterNode manually | `createFilterEffect('lowpass')` + `addEffect()` | Library handles connection chain |
| Audio param updates | `setValueAtTime` calls | LFO `.frequency` and `.depth` setters | Setters update running nodes automatically |

## Common Pitfalls

### Pitfall 1: Filter Sweep Depth Unit
**What goes wrong:** Using default depthUnit ('ratio') for filter frequency produces wrong modulation range
**Why it happens:** Filter frequency default is e.g. 1000 Hz; ratio of 0.5 would swing 500 Hz, but what you want is a fixed Hz range
**How to avoid:** Use `{ depthUnit: 'absolute' }` for filter sweep, with depth representing Hz range (e.g., depth=800 sweeps +/- 800 Hz around cutoff)
**Warning signs:** Filter sweep sounds too subtle or too extreme

### Pitfall 2: Canvas DPR on Resize
**What goes wrong:** Canvas appears blurry or incorrectly scaled after window resize
**Why it happens:** Canvas dimensions not recalculated on resize
**How to avoid:** Add resize event listener that calls setupCanvas, same as VisualizationDemo.vue
**Warning signs:** Blurry canvas text/lines on high-DPI displays

### Pitfall 3: LFO Not Restarting After Stop
**What goes wrong:** LFO doesn't produce sound after stop + play cycle
**Why it happens:** Web Audio OscillatorNodes are single-use; LFO internally handles this via `_restart()`, but the LFO must be `.start()`ed again
**How to avoid:** Call `lfo.start()` after `lfo.stop()` when restarting playback. The LFO class handles node recreation internally.

### Pitfall 4: Animation Frame Leak
**What goes wrong:** Canvas keeps animating after component unmount
**Why it happens:** `cancelAnimationFrame` not called in `onUnmounted`
**How to avoid:** Store animationFrameId, cancel in both stop() and onUnmounted()

### Pitfall 5: Oscillator Waveform Type Change
**What goes wrong:** Trying to change `oscillator.type` while playing fails silently or causes glitch
**Why it happens:** Web Audio OscillatorNode.type cannot change after start on some browsers
**How to avoid:** The carrier oscillator waveform is fixed (sawtooth) -- this is not user-controllable, only the LFO waveform type changes (which the LFO class handles internally)

### Pitfall 6: Filter Not Attached Before LFO Connect
**What goes wrong:** LFO connects to filter's frequency param before filter is in the audio chain, producing no audible effect
**Why it happens:** Filter must be in the oscillator's effect chain for the modulation to be heard
**How to avoid:** Call `oscillator.addEffect(filter)` before `lfo.connect(filter, 'frequency', ...)`

## Code Examples

### Full LFO Setup Pattern (Tremolo)
```typescript
// Source: src/lfo.ts API + src/index.ts createLFO docstring
import { createLFO, createOscillator } from 'ez-web-audio'

const oscillator = await createOscillator({ frequency: 330, type: 'sawtooth' })
oscillator.changeGainTo(0.3)

const lfo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })
lfo.connect(oscillator, 'gain') // depth 0.3 = 30% gain wobble
lfo.start()
oscillator.play()
```

### Filter Sweep Setup
```typescript
import { createLFO, createOscillator, createFilterEffect } from 'ez-web-audio'

const oscillator = await createOscillator({ frequency: 330, type: 'sawtooth' })
oscillator.changeGainTo(0.3)

const filter = createFilterEffect('lowpass', { frequency: 1000, q: 2 })
oscillator.addEffect(filter)

const lfo = createLFO({ frequency: 2, depth: 800, type: 'sine' })
lfo.connect(filter, 'frequency', { depthUnit: 'absolute' }) // sweeps 200-1800 Hz
lfo.start()
oscillator.play()
```

### Real-Time Parameter Update
```typescript
// LFO setters update immediately while running
lfo.frequency = newRate   // Hz
lfo.depth = newDepth      // unit depends on connection
lfo.type = 'square'       // waveform change, LFO handles node recreation
```

### Cleanup Pattern
```typescript
// Source: VisualizationDemo.vue, FilterDemo.vue (established pattern)
onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  if (lfo) lfo.dispose()
  if (oscillator) {
    oscillator.stop()
    oscillator = null
  }
  window.removeEventListener('resize', setupCanvas)
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual OscillatorNode + GainNode for LFO | `createLFO()` factory | M5 (Phase 53-60) | Clean API with depth unit handling, S&H support |
| Inline filter nodes | `createFilterEffect()` + `addEffect()` | M5 | Effect chain management built-in |

## Open Questions

1. **Sample-and-hold visualization**
   - What we know: S&H produces stepped random values, not a repeatable waveform shape
   - What's unclear: How to draw a meaningful "preview" since actual S&H is random each cycle
   - Recommendation: Draw a representative stepped pattern (random but seeded/fixed for display), label it as "random steps"

2. **Filter Sweep depth calibration**
   - What we know: `depthUnit: 'absolute'` uses raw Hz for depth; filter starts at e.g. 1000 Hz
   - What's unclear: Best depth range for 0-100% slider mapping to sound musical
   - Recommendation: Map 0-100% to 0-2000 Hz depth range (with filter centered at ~1500 Hz, this sweeps nicely without going negative)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (Chromium) |
| Config file | `playwright.config.ts` |
| Quick run command | `pnpm exec playwright test e2e/demos.spec.ts` |
| Full suite command | `pnpm exec playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LFO-01 | Tremolo audible on play | e2e (smoke) | `pnpm exec playwright test e2e/demos.spec.ts` | Partial (demos.spec.ts tests page loads, needs LFO page added) |
| LFO-02 | Vibrato audible on play | e2e (smoke) | same | Partial |
| LFO-03 | Filter sweep audible | e2e (smoke) | same | Partial |
| LFO-04 | Canvas visualization renders | e2e | `pnpm exec playwright test e2e/interactions.spec.ts` | No -- needs new test |
| LFO-05 | Rate/depth sliders update audio | e2e | same | No -- needs new test |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm exec playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add LFO modulation page to `e2e/demos.spec.ts` page load test list
- [ ] Add LFO-specific interaction tests to `e2e/interactions.spec.ts` (play button, tab switching, slider adjustment)

## Sources

### Primary (HIGH confidence)
- `src/lfo.ts` -- Full LFO class implementation, API surface, depth calculation logic
- `src/index.ts` -- `createLFO()` factory with usage examples in docstrings
- `src/effects/filter-effect.ts` -- `getAudioParam('frequency')` confirms LFO can connect to filter frequency
- `src/effects/base-effect.ts` -- `getParam()` public API for LFO connection to effects
- `docs/.vitepress/theme/components/VisualizationDemo.vue` -- Canvas DPR pattern, animation loop
- `docs/.vitepress/theme/components/FilterDemo.vue` -- Logarithmic slider, lazy init, parameter watchers
- `docs/.vitepress/theme/components/OscillatorDemo.vue` -- Oscillator creation, waveform toggle
- `docs/.vitepress/config.mts` -- Sidebar structure for example pages

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all patterns already established in 22 existing components
- Architecture: HIGH -- direct extension of existing demo patterns, no new infrastructure
- Pitfalls: HIGH -- LFO API fully inspected, depth unit behavior verified from source code

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no library changes planned)

# Phase 70: GrainPlayer Demo - Research

**Researched:** 2026-03-18
**Domain:** Vue demo component, canvas waveform interaction, granular synthesis UX
**Confidence:** HIGH

## Summary

This phase creates a single Vue demo component (`GrainPlayerDemo.vue`) and a VitePress markdown page (`docs/examples/grainplayer.md`) that showcases the library's `createGrainPlayer()` API. The key UX differentiator is pitch/speed independence and a waveform canvas that doubles as an interactive scrub surface with a jitter zone overlay.

All patterns needed are already established in the project: DPR-aware canvas (VisualizationDemo.vue), click/drag interaction on canvas (XYPad.vue), logarithmic slider mapping (FilterDemo.vue), lazy init (LFODemo.vue/FilterDemo.vue), and watch-based parameter sync (EffectsChainDemo.vue). The GrainPlayer API is fully implemented and stable (`src/grain-player.ts`). No new libraries are required.

The main new challenge compared to previous M7 demos is: (1) drawing a static source-buffer waveform rather than a live analyzer feed, (2) making the canvas an interactive drag surface for position, and (3) rendering the jitter zone overlay alongside the position indicator. These all use native Canvas 2D API techniques already demonstrated in the codebase.

**Primary recommendation:** Combine the XYPad.vue interaction model (mousedown/mousemove/touchstart/touchmove on canvas with `touch-action: none`) with the VisualizationDemo.vue DPR setup, using a static waveform drawn once at load time from the AudioBuffer's channel data, and a thin animation loop (requestAnimationFrame) that redraws only the overlay indicators.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Bundle a CC0/public domain audio clip — NOT short-music.mp3
- Claude selects content type (speech, instrument, texture) and duration based on what best demonstrates pitch/speed independence and grain texture variation
- Target: short enough for quick loading, long enough for meaningful position exploration
- File upload is out of scope (REQUIREMENTS.md)
- Click/drag directly on the waveform canvas to set grain position — "point at where you want to hear"
- Live scrub: position updates continuously during drag (real-time grain repositioning while playing)
- No separate position slider — the waveform IS the position control
- Jitter visualized as a translucent shaded zone around the position indicator, widening as jitter increases

### Claude's Discretion
- Waveform canvas visualization style (static full-buffer waveform with overlaid indicators)
- Control layout and parameter grouping for pitch, speed, grain size, overlap, jitter
- Canvas height, aspect ratio, colors, DPR handling
- Whether to include presets (curated starting configurations)
- Position indicator styling (dot, line, etc.)
- Error state handling
- Grain size and overlap default values

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRAIN-01 | User can independently control pitch without changing playback speed | `grainPlayer.pitch = semitones` (sets `_playbackRateValue` via `2^(semitones/12)` for each grain; does NOT advance buffer position faster — position advancement is driven by the hop-size scheduling loop, not playbackRate directly). Slider range: -24 to +24 semitones. |
| GRAIN-02 | User can independently control playback speed without changing pitch | GrainPlayer does NOT have a separate `playbackRate` that affects how fast it scans the buffer independently of pitch. Speed in granular synthesis means how fast `position` advances over time. This requires the demo to auto-advance `grainPlayer.position` using `requestAnimationFrame` at a rate controlled by a "speed" slider — the library does not auto-advance position. See Architecture Patterns section for the implementation approach. |
| GRAIN-03 | User can adjust grain size for texture variation | `grainPlayer.grainSize = seconds` (range: 0.01–0.5s); overlap should be exposed too (range: 0–(grainSize-0.001)); jitter is the CONTEXT-specified parameter (range: 0–1). All update in real-time on next grain. |
| GRAIN-04 | User can see source waveform with grain position overlay on canvas | Static waveform drawn from `AudioBuffer.getChannelData(0)`, position indicator line drawn via requestAnimationFrame, jitter zone as translucent rect around indicator. Canvas doubles as drag surface. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | (project version) | Component framework | All demo components are Vue SFCs |
| ez-web-audio | (local) | Audio library being demoed | `createSound`, `createGrainPlayer` |
| VitePress | (project version) | Documentation site | All example pages are VitePress markdown |

### Supporting
No additional libraries. Canvas 2D API and requestAnimationFrame are native browser.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static buffer waveform | Analyzer real-time waveform | Static is correct here — we want to show the SOURCE audio, not the output |
| RAF overlay redraw | Full canvas redraw every frame | Full redraw is simpler and fast enough for a single canvas |

**Installation:** No new packages needed.

## Architecture Patterns

### File Structure
```
docs/
├── .vitepress/theme/components/
│   └── GrainPlayerDemo.vue          # New component
├── .vitepress/config.mts            # Add nav entry
└── examples/
    └── grainplayer.md               # New page

docs/public/audio/
└── [cc0-sample].mp3                 # New CC0 audio asset
```

### Pattern 1: Lazy Init (established pattern)
**What:** Delay `import('ez-web-audio')` until first user interaction (Play click)
**When to use:** All M7 demos use this — mandatory for AudioContext browser requirement
```typescript
// Source: FilterDemo.vue, LFODemo.vue, EffectsChainDemo.vue
let lib: any = null
let grainPlayer: GrainPlayer | null = null

async function ensureLoaded() {
  if (lib) return
  lib = await import('ez-web-audio')
}

async function playSound() {
  if (loading.value) return
  try {
    loading.value = true
    error.value = ''
    await ensureLoaded()
    const sound = await lib.createSound('/ez-web-audio/audio/[sample].mp3')
    grainPlayer = await lib.createGrainPlayer(sound.audioBuffer, {
      grainSize: 0.1,
      overlap: 0.05,
      jitter: 0,
      loop: true,
    })
    grainPlayer.play()
    playing.value = true
    drawStaticWaveform(sound.audioBuffer)
    startOverlayLoop()
  } finally {
    loading.value = false
  }
}
```

### Pattern 2: DPR-Aware Canvas (established pattern)
**What:** Scale canvas for retina displays, store logical dims in dataset
**When to use:** All canvas components in the project use this
```typescript
// Source: VisualizationDemo.vue
function setupCanvas() {
  if (!waveformCanvas.value) return
  const dpr = window.devicePixelRatio || 1
  const container = waveformCanvas.value.parentElement
  if (!container) return
  const logicalWidth = container.clientWidth
  const logicalHeight = 160
  waveformCanvas.value.width = logicalWidth * dpr
  waveformCanvas.value.height = logicalHeight * dpr
  waveformCanvas.value.dataset.logicalWidth = String(logicalWidth)
  waveformCanvas.value.dataset.logicalHeight = String(logicalHeight)
  const ctx = waveformCanvas.value.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}
```

### Pattern 3: Static Waveform from AudioBuffer
**What:** Draw the full source buffer as a waveform once, then redraw overlays in RAF loop
**When to use:** Any demo showing a source waveform for scrubbing (new pattern, no prior example)

```typescript
function drawStaticWaveform(buffer: AudioBuffer) {
  const canvas = waveformCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight
  const data = buffer.getChannelData(0)   // use channel 0
  const step = Math.ceil(data.length / width)

  ctx.fillStyle = bgColor()
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#4ecdc4'
  ctx.lineWidth = 1
  ctx.beginPath()

  for (let x = 0; x < width; x++) {
    // Min/max reduction for each pixel column
    let min = 1, max = -1
    for (let s = 0; s < step; s++) {
      const sample = data[x * step + s] ?? 0
      if (sample < min) min = sample
      if (sample > max) max = sample
    }
    const yMin = ((min + 1) / 2) * height
    const yMax = ((max + 1) / 2) * height
    if (x === 0) ctx.moveTo(x, yMin)
    ctx.lineTo(x, yMin)
    ctx.lineTo(x, yMax)
  }
  ctx.stroke()
  // Cache the waveform as ImageData for fast overlay redraws
  waveformImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
}
```

### Pattern 4: Overlay Animation Loop with Cached Background
**What:** Cache the static waveform as ImageData, then putImageData + draw overlays each frame
**When to use:** When overlay (position line, jitter zone) needs to update at 60fps without redrawing the waveform

```typescript
let waveformImageData: ImageData | null = null
let animFrameId: number | null = null

function drawOverlay() {
  const canvas = waveformCanvas.value
  if (!canvas || !waveformImageData) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight

  // Restore cached waveform
  ctx.putImageData(waveformImageData, 0, 0)

  const posX = position.value * width

  // Jitter zone (translucent shaded region)
  if (jitter.value > 0) {
    const jitterWidth = jitter.value * width
    ctx.fillStyle = 'rgba(78, 205, 196, 0.15)'
    ctx.fillRect(posX - jitterWidth, 0, jitterWidth * 2, height)
  }

  // Position line
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(posX, 0)
  ctx.lineTo(posX, height)
  ctx.stroke()

  // Position dot
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(posX, height / 2, 5, 0, Math.PI * 2)
  ctx.fill()
}

function startOverlayLoop() {
  const loop = () => {
    drawOverlay()
    animFrameId = requestAnimationFrame(loop)
  }
  animFrameId = requestAnimationFrame(loop)
}
```

### Pattern 5: Canvas Drag Interaction (from XYPad.vue)
**What:** mousedown starts interaction, mousemove updates while pressed, mouseup on document stops
**When to use:** Canvas interaction — same pattern as XYPad.vue
```typescript
// Source: XYPad.vue
const isDragging = ref(false)

function getPositionFromEvent(e: MouseEvent | Touch): number {
  const canvas = waveformCanvas.value
  if (!canvas) return 0
  const rect = canvas.getBoundingClientRect()
  const x = ('clientX' in e ? e.clientX : e.clientX) - rect.left
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  return Math.max(0, Math.min(1, x / width))
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  updatePosition(getPositionFromEvent(e))
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  updatePosition(getPositionFromEvent(e))
}

function handleMouseUp() {
  isDragging.value = false
}

function updatePosition(value: number) {
  position.value = value
  if (grainPlayer) grainPlayer.position = value
}

// In onMounted: document.addEventListener('mouseup', handleMouseUp)
// In onUnmounted: document.removeEventListener('mouseup', handleMouseUp)
// Touch: same pattern with e.touches[0], preventDefault to block scroll
```

### Pattern 6: Auto-Advancing Position for "Speed" (GRAIN-02 key insight)
**What:** GrainPlayer does not auto-advance position. The demo loop advances it at a speed-controlled rate.
**Why:** The library's `playbackRate` setter affects pitch (semitones conversion), not scan speed. True "speed without pitch change" in granular synthesis is achieved by advancing the read position in the RAF loop.
**Implementation:**

```typescript
// Speed: 0 = frozen, 0.5 = half speed, 1 = normal, 2 = double speed
const speed = ref(1)
let lastFrameTime = 0

function startOverlayLoop() {
  const loop = (timestamp: number) => {
    if (lastFrameTime > 0 && grainPlayer && playing.value && !isDragging.value) {
      const dt = (timestamp - lastFrameTime) / 1000  // seconds
      const bufferDuration = grainPlayer.audioContext.sampleRate
        ? audioBufferDuration  // store on load
        : 5
      // advance position proportional to speed
      const advance = (dt * speed.value) / bufferDuration
      // ... but position is 0-1, so:
      // position advances by (dt * speed.value * normalSpeedFactor)
      // normalSpeedFactor = 1 / buffer.duration means position 0→1 in buffer.duration seconds at speed=1
      position.value = (position.value + dt * speed.value / bufferDurationSeconds) % 1
      if (grainPlayer) grainPlayer.position = position.value
    }
    lastFrameTime = timestamp
    drawOverlay()
    animFrameId = requestAnimationFrame(loop)
  }
  animFrameId = requestAnimationFrame(loop)
}
```

**Speed slider:** Range 0–3x (linear), default 1. Display: "0.5x", "1.0x", "2.0x". Dragging canvas position pauses auto-advance while dragging (`isDragging` guard).

### Pattern 7: Watch-based Parameter Sync (from EffectsChainDemo.vue)
```typescript
// Source: EffectsChainDemo.vue
watch(pitch, (v) => { if (grainPlayer) grainPlayer.pitch = v })
watch(grainSize, (v) => { if (grainPlayer) grainPlayer.grainSize = v })
watch(overlap, (v) => { if (grainPlayer) grainPlayer.overlap = v })
watch(jitter, (v) => { if (grainPlayer) grainPlayer.jitter = v })
```

### Pattern 8: Cleanup on Unmount
```typescript
onUnmounted(() => {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
  if (grainPlayer) { grainPlayer.stop(); grainPlayer.dispose() }
  document.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', setupCanvas)
})
```

### Control Layout Recommendation (Claude's Discretion)
Three sections below the waveform canvas:
1. **Playback row**: Play/Stop button, Speed slider (0–3x), loop toggle checkbox
2. **Pitch row**: Pitch slider (-24 to +24 semitones), readout in semitones + note name (e.g., "+7 st (G)")
3. **Grain row**: Grain Size slider (0.01–0.5s), Overlap slider (0–grainSize), Jitter slider (0–1)

Optional preset buttons: "Smooth Pad" (large grains, low jitter), "Choppy" (small grains, high jitter), "Scatter" (medium grains, high jitter).

### Anti-Patterns to Avoid
- **Using `grainPlayer.playbackRate` for the "speed" control:** The `playbackRate` setter converts back to semitones and updates `_pitch` — it is fundamentally a pitch control, not a speed-without-pitch control. Using it for the "speed" control would violate GRAIN-01/GRAIN-02 independence.
- **Trying to use Analyzer for the waveform:** The GrainPlayer output is granular — AnalyserNode would show the output signal, not the source waveform. Draw from `AudioBuffer.getChannelData(0)` instead.
- **Redrawing full waveform every RAF frame:** Expensive. Cache as ImageData and use `putImageData`.
- **Blocking canvas touch events without `e.preventDefault()`:** Mobile will scroll the page. Add `touch-action: none` in CSS and call `e.preventDefault()` in touch handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio loading | Custom fetch + decode | `createSound(url)` from ez-web-audio | Handles init, decode, format |
| Grain playback | Custom BufferSource scheduler | `createGrainPlayer(buffer, opts)` | WorkerTimer scheduler, Hann envelope, overlap compensation all built-in |
| Parameter scheduling | setValueAtTime calls | Direct property setters (`grainPlayer.pitch = v`) | Setters handle clamping and internal conversion |
| DPR canvas setup | Custom pixel math | Established pattern from VisualizationDemo.vue | Tested, handles resize |

## Common Pitfalls

### Pitfall 1: `sound.audioBuffer` is Private in TypeScript
**What goes wrong:** TypeScript type checking will flag `sound.audioBuffer` since it's declared `private` in `Sound` class.
**Why it happens:** `src/sound.ts` line 87: `AudioContext, private audioBuffer: AudioBuffer`. However, the docs and CONTEXT.md both describe using this pattern, and it works at runtime (private is a TS compile-time constraint only).
**How to avoid:** Either ignore the TS error with `// @ts-ignore`, or use `(sound as any).audioBuffer`, or load the buffer via `fetch` + `audioContext.decodeAudioData` as an alternative. Check if there's a `getBuffer()` or public accessor before using the workaround.
**Warning signs:** TS error "Property 'audioBuffer' is private and only accessible within class 'Sound'."

### Pitfall 2: Speed-Without-Pitch via Position Advance
**What goes wrong:** Developer uses `grainPlayer.playbackRate` for the speed slider — this changes pitch.
**Why it happens:** Intuitive misunderstanding; `playbackRate` sounds like "speed". But in GrainPlayer, playbackRate controls grain-level pitch via `2^(semitones/12)`.
**How to avoid:** Speed = RAF loop advancing `grainPlayer.position` at controlled rate. Pitch = `grainPlayer.pitch` setter only.

### Pitfall 3: Canvas Resize Invalidates ImageData Cache
**What goes wrong:** After window resize, `setupCanvas()` recreates the canvas context, but `waveformImageData` still holds the old pixel dimensions — `putImageData` draws at wrong size.
**How to avoid:** In the resize handler, after calling `setupCanvas()`, call `drawStaticWaveform(cachedBuffer)` again to regenerate `waveformImageData`. Store the buffer reference (`audioBuffer`) at module level for this.

### Pitfall 4: Drag Conflicts with Auto-Advance
**What goes wrong:** While user drags position, the RAF loop also auto-advances position, causing a fight between user input and loop.
**How to avoid:** Guard the auto-advance with `if (!isDragging.value)`. Position only advances from RAF when not dragging.

### Pitfall 5: GrainPlayer Requires `play()` Before Position Changes Are Heard
**What goes wrong:** User drags waveform canvas before clicking Play — `grainPlayer.position` updates but no audio.
**How to avoid:** This is correct behavior. Consider starting playback automatically on first canvas drag if not already playing (first-interaction UX), or make the Play button the gate.

### Pitfall 6: Audio Asset Path in VitePress
**What goes wrong:** Using relative paths like `./audio/sample.mp3` fails when the base URL is `/ez-web-audio/`.
**How to avoid:** Use absolute path `/ez-web-audio/audio/[sample].mp3` in `createSound()` call. This is the established pattern (Phase 67 learned: use relative paths NOT absolute for E2E, but for `createSound` use the public base path).
**Reference:** Phase 67 decision — E2E tests use relative paths (`'examples/lfo-modulation'` not `/ez-web-audio/examples/lfo-modulation`), but audio asset URLs in `createSound()` use the base-rooted path.

### Pitfall 7: Overlap Must Be Less Than Grain Size
**What goes wrong:** Slider allows overlap >= grainSize → `getHopSize()` returns < 0.001 → infinite loop in scheduler.
**How to avoid:** The GrainPlayer setter clamps overlap to `grainSize - 0.001`. But the UI overlap slider max should be dynamically set to `grainSize - 0.001` using `:max="grainSize - 0.001"` on the slider. Alternatively, show overlap as a percentage of grain size.

## Code Examples

### Creating and Playing a GrainPlayer

```typescript
// Source: src/index.ts createGrainPlayer JSDoc + grain-player.ts
import { createSound, createGrainPlayer } from 'ez-web-audio'

const sound = await createSound('/ez-web-audio/audio/sample.mp3')
const grainPlayer = await createGrainPlayer(sound.audioBuffer, {
  grainSize: 0.1,
  overlap: 0.05,
  jitter: 0,
  loop: true,
})
grainPlayer.play()

// Pitch (semitones, does NOT change scan speed)
grainPlayer.pitch = 7    // up a fifth
grainPlayer.pitch = -12  // down an octave
grainPlayer.pitch = 0    // original pitch

// Position (normalized 0-1)
grainPlayer.position = 0.5  // jump to middle

// Grain parameters (all real-time, take effect on next grain)
grainPlayer.grainSize = 0.2
grainPlayer.overlap = 0.05
grainPlayer.jitter = 0.2
```

### Drawing Source Buffer Waveform

```typescript
// No prior example in codebase — new pattern
function drawWaveformFromBuffer(canvas: HTMLCanvasElement, buffer: AudioBuffer): ImageData {
  const ctx = canvas.getContext('2d')!
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight
  const data = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / width))

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#4ecdc4'
  ctx.lineWidth = 1
  ctx.beginPath()

  for (let x = 0; x < width; x++) {
    let min = 1.0, max = -1.0
    const base = x * step
    for (let s = 0; s < step && (base + s) < data.length; s++) {
      const v = data[base + s]
      if (v < min) min = v
      if (v > max) max = v
    }
    const yLow = ((min + 1) / 2) * height
    const yHigh = ((max + 1) / 2) * height
    ctx.moveTo(x + 0.5, yLow)
    ctx.lineTo(x + 0.5, yHigh)
  }
  ctx.stroke()
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
```

### Sidebar Nav Entry

```typescript
// Source: docs/.vitepress/config.mts — add to existing 'Synthesis' or new 'Granular' section
{
  text: 'Granular',
  items: [
    { text: 'GrainPlayer', link: '/examples/grainplayer' },
  ],
}
```

### E2E Test Pattern (from interactions.spec.ts)

```typescript
test.describe('GrainPlayer page interactions', () => {
  test('Play/Stop toggles button text', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('examples/grainplayer')
    await page.waitForSelector('.play-button', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    expect(await page.locator('.play-button').textContent()).toContain('Play')
    await page.locator('.play-button').click()
    await page.waitForFunction(
      () => document.querySelector('.play-button')?.textContent?.trim() === 'Stop',
      { timeout: 10000 },
    )
    expect(await page.locator('.play-button').textContent()).toContain('Stop')
    expect(errors).toHaveLength(0)
  })
  // ... waveform canvas visible, sliders interactive, canvas clickable
})
```

## Audio Asset Recommendation

For best demonstration of pitch/speed independence and grain texture:

**Recommended content type:** A single sustained instrument note (e.g., a cello or flute note) or a spoken vowel sound (3–6 seconds). These work best because:
- Pitch changes are immediately audible on a steady tone
- Speed changes are obvious (same pitch but faster/slower)
- Grain texture (smooth vs choppy) is very clear on a sustained sound
- Position scrubbing on a single note is more intuitive than on a complex music clip

**Duration target:** 3–6 seconds. Long enough to scrub meaningfully; short enough to load quickly (< 200KB at 128kbps MP3).

**Source suggestions:** Freesound.org CC0 samples, or a synthesized pad from Web Audio API captured as a file. An 440Hz sustained cello/violin note at 44100Hz stereo for 4 seconds is ideal.

**File placement:** `docs/public/audio/[sample].mp3`
**URL in code:** `/ez-web-audio/audio/[sample].mp3`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (E2E, Chromium only) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| Quick run command | `pnpm test` (unit only) |
| Full suite command | `pnpm test && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRAIN-01 | Pitch slider changes pitch independently | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ Wave 0 |
| GRAIN-02 | Speed slider changes speed independently | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ Wave 0 |
| GRAIN-03 | Grain size slider present and interactive | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ Wave 0 |
| GRAIN-04 | Waveform canvas visible; position indicator renders | E2E smoke | `npx playwright test --grep "GrainPlayer"` | ❌ Wave 0 |

Note: Actual audio output quality (pitch vs speed independence) is inherently a manual listening test. E2E tests verify UI behavior: button toggle, slider presence, canvas visibility, canvas click interaction, zero JS errors.

### Sampling Rate
- **Per task commit:** `pnpm test` (unit suite, no E2E)
- **Per wave merge:** `pnpm test && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/interactions.spec.ts` — add GrainPlayer describe block (4 tests matching GRAIN-01 through GRAIN-04 UI behaviors)
- [ ] `docs/public/audio/[sample].mp3` — CC0 audio asset must exist before tests can pass

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual buffer scheduling | GrainPlayer with WorkerTimer | Phase 58 | No hand-rolled grain scheduling needed |
| Separate pitch/rate controls | `.pitch` (semitones) is the only exposed control for pitch | Phase 58 | Demo must implement speed-as-position-advance pattern |

## Open Questions

1. **`sound.audioBuffer` TypeScript access**
   - What we know: It's declared `private` in Sound class; docs and CONTEXT.md both use it; it works at runtime
   - What's unclear: Whether there's a public accessor added later, or if `@ts-ignore` / `(sound as any).audioBuffer` is the accepted pattern
   - Recommendation: Check `src/sound.ts` `get audioBuffer()` accessor during implementation — if missing, use `(sound as any).audioBuffer` per established docs pattern. The planner should include a verification step.

2. **CC0 audio asset selection**
   - What we know: Must be CC0, not short-music.mp3, 3–6s, monophonic sustained sound preferred
   - What's unclear: Specific file name and source
   - Recommendation: Planner should include a task to source/verify a CC0 sample and commit it to `docs/public/audio/`. A synthesized sustained tone (generated programmatically) is an acceptable fallback if no CC0 asset is found quickly.

3. **Speed implementation UX detail**
   - What we know: Speed must auto-advance position in RAF loop; range 0–3x; dragging pauses auto-advance
   - What's unclear: Whether speed=0 means "frozen" or is out of range; whether the speed slider should show BPM-like units
   - Recommendation: Include 0 in speed range as "freeze at position" (useful for granular freeze effect). Show as multiplier (0.0x–3.0x). This doubles as an additional interesting demo interaction.

## Sources

### Primary (HIGH confidence)
- `src/grain-player.ts` — full GrainPlayer API, property setters, scheduling logic (verified by direct read)
- `src/index.ts` lines 690–731 — `createGrainPlayer` factory signatures (verified by direct read)
- `docs/.vitepress/theme/components/VisualizationDemo.vue` — DPR canvas setup pattern (verified by direct read)
- `docs/.vitepress/theme/components/XYPad.vue` — canvas drag interaction pattern (verified by direct read)
- `docs/.vitepress/theme/components/LFODemo.vue` — lazy init + ensureLoaded pattern (verified by direct read)
- `docs/.vitepress/theme/components/EffectsChainDemo.vue` — watch-based parameter sync (verified by direct read)
- `docs/.vitepress/theme/components/FilterDemo.vue` — logarithmic slider mapping (verified by direct read)
- `e2e/interactions.spec.ts` — E2E test pattern for demo pages (verified by direct read)
- `docs/.vitepress/config.mts` — sidebar nav structure (verified by direct read)

### Secondary (MEDIUM confidence)
- `docs/examples/lfo-modulation.md`, `effects-chain.md` — page structure template
- `.planning/phases/67-lfo-modulation-demo/67-RESEARCH.md` — M7 demo research precedent

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed by direct codebase inspection
- Architecture (static waveform): HIGH — AudioBuffer.getChannelData is standard Web Audio API, pattern is sound
- Architecture (speed as position advance): HIGH — GrainPlayer source confirms no independent scan-speed; RAF approach is the correct implementation
- Pitfalls: HIGH — derived from source code inspection (private audioBuffer, overlap clamping) and established project decisions (asset paths, canvas DPR)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase)

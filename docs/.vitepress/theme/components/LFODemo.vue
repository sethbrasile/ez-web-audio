<script setup lang="ts">
import type { FilterEffect } from 'ez-web-audio'
import { useCleanup, useLFO, useOscillator } from '@ez-web-audio/vue'
import { createFilterEffect } from 'ez-web-audio'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import VolumeWarning from './kit/VolumeWarning.vue'
import WaveformSelector from './kit/WaveformSelector.vue'

type TabType = 'tremolo' | 'vibrato' | 'filter'

// Mode caption shown under the tab bar. Mode differentiation used to be
// carried by a hardcoded per-tab hex color (also used for the waveform
// stroke); the canvas now always draws with the single --ewa-accent token,
// so the caption text is what tells the modes apart visually.
const MODE_CAPTIONS: Record<TabType, string> = {
  tremolo: 'Tremolo · amplitude',
  vibrato: 'Vibrato · pitch',
  filter: 'Filter Sweep · frequency',
}

const playing = ref(false)
const loading = ref(false)
const error = ref('')
const activeTab = ref<TabType>('tremolo')
const rateSlider = ref(40) // 0-100
const depthSlider = ref(50) // 0-100
const waveformType = ref<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine')

const cleanup = useCleanup()
const { instance: oscillator, load: loadOsc, reset: resetOsc } = useOscillator()
const { instance: lfo, load: loadLfo, reset: resetLfo } = useLFO()
let filter: FilterEffect | null = null
let filterAttached = false
let animationFrameId: number | null = null
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationPhase = 0
let lastFrameTime = 0
let themeObserver: MutationObserver | null = null

// Logarithmic rate mapping: 0-100 -> ~0.1-20 Hz
// Midpoint (50) -> ~3.2 Hz, which falls squarely in the tremolo/vibrato range
const rate = computed(() => {
  return 0.1 * (100 ** (rateSlider.value / 100))
})

// Depth: 0-100 -> 0-1.0
const depth = computed(() => {
  return depthSlider.value / 100
})

const modeCaption = computed(() => MODE_CAPTIONS[activeTab.value])

function computeDepthForTab(): number {
  const d = depth.value
  switch (activeTab.value) {
    case 'tremolo':
      return d * 0.9 // max 90% gain wobble — audible, amp-style swing
    case 'vibrato':
      return d * 50 // max 50 cents (half semitone) — musically expressive range
    case 'filter':
      // Base frequency 2000 Hz, max sweep 1500 Hz — never goes below 500 Hz
      return d * 1500
  }
}

function depthUnitForTab(): 'ratio' | 'cents' | 'absolute' {
  switch (activeTab.value) {
    case 'tremolo':
      return 'ratio'
    case 'vibrato':
      return 'cents'
    case 'filter':
      return 'absolute'
  }
}

// Human-readable depth label with contextual units per tab
const depthDisplayLabel = computed(() => {
  const d = depthSlider.value
  switch (activeTab.value) {
    case 'tremolo':
      return `${Math.round(d * 0.9)}% gain`
    case 'vibrato':
      return `${Math.round(d * 0.5)} cents`
    case 'filter':
      return `${Math.round(d * 15)} Hz`
    default:
      return ''
  }
})

// ParameterSlider format callbacks. Both sliders keep their existing 0-100
// raw domain (see rate/depth computeds above) — these just translate that
// raw value into the same display text the pre-kit markup rendered, with no
// change to the underlying log-mapped rate math or per-mode depth math.
function formatRate(v: number): string {
  return `${(0.1 * (100 ** (v / 100))).toFixed(1)} Hz`
}

function formatDepth(_v: number): string {
  return depthDisplayLabel.value
}

function onWaveformSelect(wave: string) {
  waveformType.value = wave as typeof waveformType.value
}

function connectLFOToTab() {
  if (!lfo.value || !oscillator.value)
    return

  lfo.value.disconnect()

  switch (activeTab.value) {
    case 'tremolo':
      lfo.value.connect(oscillator.value, 'gain', { depth: computeDepthForTab(), depthUnit: 'ratio' })
      break
    case 'vibrato':
      lfo.value.connect(oscillator.value, 'frequency', { depth: computeDepthForTab(), depthUnit: 'cents' })
      break
    case 'filter':
      if (filter && !filterAttached) {
        oscillator.value.addEffect(filter)
        filterAttached = true
      }
      if (filter) {
        lfo.value.connect(filter, 'frequency', { depth: computeDepthForTab(), depthUnit: 'absolute' })
      }
      break
  }
}

async function togglePlayback() {
  if (playing.value) {
    stopSound()
  }
  else {
    await playSound()
  }
}

async function playSound() {
  if (loading.value)
    return

  try {
    loading.value = true
    error.value = ''

    // Create oscillator at A4 (440 Hz) — standard musical reference
    const osc = cleanup.register(await loadOsc({ frequency: 440, type: 'sawtooth' }))
    osc.update('gain').to(0.7).as('ratio')

    // Create filter for filter sweep tab — bandpass gives wah-pedal character
    filter = createFilterEffect('bandpass', { frequency: 2000, q: 6 })
    filterAttached = false

    // Create LFO
    const l = cleanup.register(await loadLfo({
      frequency: rate.value,
      depth: computeDepthForTab(),
      type: waveformType.value,
    }))

    // Connect based on active tab
    connectLFOToTab()

    // Start LFO and play oscillator
    l.start()
    osc.play()
    playing.value = true

    // Start visualization
    lastFrameTime = performance.now()
    animationPhase = 0
    startAnimation()
  }
  catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to play audio'
  }
  finally {
    loading.value = false
  }
}

function stopSound() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (lfo.value) {
    lfo.value.stop()
    lfo.value.dispose()
  }
  resetLfo()

  oscillator.value?.stop()
  resetOsc()

  filter = null
  filterAttached = false
  playing.value = false
}

function applyPreset(preset: { tab: TabType, rate: number, depth: number, waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' }) {
  activeTab.value = preset.tab
  rateSlider.value = preset.rate
  depthSlider.value = preset.depth
  waveformType.value = preset.waveform
}

const presets = [
  // rate=52 -> ~1.7 Hz: clearly perceptible slow tremolo
  { name: 'Slow Tremolo', tab: 'tremolo' as TabType, rate: 52, depth: 70, waveform: 'sine' as const },
  // rate=75 -> ~5.6 Hz: sits in the classical vibrato 5-7 Hz range
  { name: 'Fast Vibrato', tab: 'vibrato' as TabType, rate: 75, depth: 45, waveform: 'sine' as const },
  // Wah Pedal: bandpass filter sweep — resonant mid-peak character
  { name: 'Wah Pedal', tab: 'filter' as TabType, rate: 35, depth: 55, waveform: 'triangle' as const },
]

// Watch parameters and update LFO in real-time
watch(activeTab, () => {
  if (playing.value && lfo.value) {
    lfo.value.depth = computeDepthForTab()
    connectLFOToTab()
  }
})

watch(rate, (newRate) => {
  if (lfo.value && playing.value) {
    lfo.value.frequency = newRate
  }
})

watch(depth, () => {
  if (lfo.value && playing.value) {
    // Reconnect to recalculate depth for current tab
    connectLFOToTab()
  }
})

watch(waveformType, (newType) => {
  if (lfo.value && playing.value) {
    lfo.value.type = newType
  }
})

// Canvas visualization

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas)
    return

  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement!
  const logicalWidth = container.clientWidth
  const logicalHeight = 120

  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  canvas.style.height = `${logicalHeight}px`
  canvas.dataset.logicalWidth = String(logicalWidth)
  canvas.dataset.logicalHeight = String(logicalHeight)
}

function computeWaveformY(t: number, type: string): number {
  switch (type) {
    case 'sine':
      return Math.sin(t)
    case 'square':
      return Math.sign(Math.sin(t))
    case 'sawtooth':
      return 2 * ((t / (2 * Math.PI)) % 1) - 1
    case 'triangle':
      return 2 * Math.abs(2 * ((t / (2 * Math.PI)) % 1) - 1) - 1
    default:
      return Math.sin(t)
  }
}

// Shared waveform drawing logic — used by both static and animated paths.
// Colors are read from --ewa-* tokens via getComputedStyle at draw time (not
// hardcoded hex) so the canvas tracks light/dark theme automatically.
function drawWaveformToCanvas(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  phase: number,
  alpha: number,
) {
  const dpr = window.devicePixelRatio || 1
  const style = getComputedStyle(document.documentElement)
  const accentColor = style.getPropertyValue('--ewa-accent').trim() || '#4a9eff'
  const gridColor = style.getPropertyValue('--ewa-line-2').trim() || 'rgba(128, 128, 128, 0.2)'
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const amplitude = logicalHeight * 0.35 * depth.value
  const centerY = logicalHeight / 2

  // Apply DPR scaling consistently with setTransform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, logicalWidth, logicalHeight)

  // Center line
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(logicalWidth, centerY)
  ctx.stroke()
  ctx.setLineDash([])

  // Waveform — accent stroke with a soft glow (no glow under reduced motion)
  ctx.save()
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 3.5
  ctx.globalAlpha = alpha
  ctx.shadowColor = accentColor
  ctx.shadowBlur = reducedMotion ? 0 : 10
  ctx.beginPath()

  const visibleCycles = 3
  for (let x = 0; x < logicalWidth; x++) {
    const t = (x / logicalWidth) * Math.PI * 2 * visibleCycles + phase
    const y = computeWaveformY(t, waveformType.value)
    const py = centerY - y * amplitude

    if (x === 0) {
      ctx.moveTo(x, py)
    }
    else {
      ctx.lineTo(x, py)
    }
  }
  ctx.stroke()
  ctx.restore()
  ctx.globalAlpha = 1
}

function drawLoop(timestamp: number) {
  const canvas = canvasRef.value
  if (!canvas)
    return

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const logicalWidth = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const logicalHeight = Number(canvas.dataset.logicalHeight) || 120

  // Advance phase based on elapsed time and rate
  const elapsed = (timestamp - lastFrameTime) / 1000
  lastFrameTime = timestamp
  animationPhase += rate.value * elapsed * Math.PI * 2

  drawWaveformToCanvas(ctx, logicalWidth, logicalHeight, animationPhase, 1)

  animationFrameId = requestAnimationFrame(drawLoop)
}

function startAnimation() {
  setupCanvas()
  animationFrameId = requestAnimationFrame(drawLoop)
}

function handleResize() {
  setupCanvas()
  if (!playing.value) {
    drawStaticWaveform()
  }
}

// Draw static (dimmed) waveform when not playing
function drawStaticWaveform() {
  const canvas = canvasRef.value
  if (!canvas || playing.value)
    return

  setupCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const logicalWidth = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const logicalHeight = Number(canvas.dataset.logicalHeight) || 120

  drawWaveformToCanvas(ctx, logicalWidth, logicalHeight, 0, 0.5)
}

// Redraw static waveform when parameters change while not playing
watch([waveformType, depthSlider, activeTab], () => {
  if (!playing.value) {
    drawStaticWaveform()
  }
})

// Set up resize listener and draw initial static waveform
onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Use nextTick to ensure layout is complete before reading canvas dimensions
  nextTick(() => {
    drawStaticWaveform()
  })

  // Canvas colors are read from --ewa-* tokens at draw time. While playing,
  // the rAF loop (drawLoop) repaints every frame and naturally picks up a
  // theme flip. While idle, only drawStaticWaveform() runs on mount/resize/
  // param-change — nothing repaints on a theme change alone, so watch
  // <html class> and redraw the static frame.
  themeObserver = new MutationObserver(() => {
    if (!playing.value) {
      drawStaticWaveform()
    }
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  window.removeEventListener('resize', handleResize)
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <DemoFrame
    class="lfo-demo"
    :error="error"
    takeaway="One LFO, three musical effects, seen and heard at once."
  >
    <VolumeWarning>
      <strong>Note:</strong> Audio sources can be loud. Start with low volume.
    </VolumeWarning>

    <!--
      Mode tabs stay as the demo's own buttons (not kit PresetSelector) —
      e2e/interactions.spec.ts asserts on `.tab-button` and toggling of the
      `.active` class directly, so the class contract is preserved.
    -->
    <div class="mode-row">
      <div class="tab-bar">
        <button
          v-for="tab in (['tremolo', 'vibrato', 'filter'] as TabType[])"
          :key="tab"
          class="tab-button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab === 'filter' ? 'Filter Sweep' : tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>

      <!--
        `class="play-button"` merges (Vue attr fallthrough) onto PlayButton's
        root <button>, alongside its own `ewa-play-btn play-btn` classes, so
        the e2e `.play-button` selector keeps matching.
      -->
      <PlayButton class="play-button" :playing="playing" :loading="loading" @click="togglePlayback" />
    </div>

    <p class="mode-caption">
      {{ modeCaption }}
    </p>

    <div class="canvas-container">
      <canvas ref="canvasRef" class="waveform-canvas" />
    </div>

    <div class="presets-row">
      <span class="presets-label">Presets:</span>
      <div class="preset-chips">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-chip"
          @click="applyPreset(preset)"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <div class="sliders">
      <ParameterSlider
        id="lfo-rate"
        v-model="rateSlider"
        label="Rate"
        :min="0"
        :max="100"
        :format="formatRate"
      />

      <ParameterSlider
        id="lfo-depth"
        v-model="depthSlider"
        label="Depth"
        :min="0"
        :max="100"
        :format="formatDepth"
      />
    </div>

    <WaveformSelector
      :model-value="waveformType"
      small
      @update:model-value="onWaveformSelect"
    />
  </DemoFrame>
</template>

<style scoped>
.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
}

.tab-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ewa-text-2);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--vp-font-family-base);
  transition: background 0.15s, color 0.15s;
}

.tab-button:hover:not(.active) {
  color: var(--ewa-text);
  background: var(--ewa-accent-soft);
}

.tab-button.active {
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
  box-shadow: var(--ewa-shadow);
}

.tab-button:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.mode-caption {
  margin: 12px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: var(--ewa-text-2);
}

.canvas-container {
  margin: 12px 0 20px;
}

.waveform-canvas {
  width: 100%;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  display: block;
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.presets-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text-2);
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--vp-font-family-base);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-chip:hover {
  background: var(--ewa-accent-soft);
  color: var(--ewa-accent-ink);
  border-color: var(--ewa-accent);
}

.preset-chip:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.sliders {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 20px;
}

.sliders > * {
  flex: 1;
  min-width: 200px;
}

@media (max-width: 640px) {
  .mode-row {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-bar {
    justify-content: space-between;
  }

  .tab-button {
    flex: 1;
    text-align: center;
  }
}
</style>

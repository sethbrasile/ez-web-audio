<script setup lang="ts">
import type { FilterEffect } from 'ez-web-audio'
import { useCleanup, useLFO, useOscillator } from '@ez-web-audio/vue'
import { createFilterEffect } from 'ez-web-audio'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

type TabType = 'tremolo' | 'vibrato' | 'filter'

const TAB_COLORS: Record<TabType, string> = {
  tremolo: '#4ecdc4',
  vibrato: '#ff6b6b',
  filter: '#ffd93d',
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

// Logarithmic rate mapping: 0-100 -> ~0.1-20 Hz
// Midpoint (50) -> ~3.2 Hz, which falls squarely in the tremolo/vibrato range
const rate = computed(() => {
  return 0.1 * (100 ** (rateSlider.value / 100))
})

// Depth: 0-100 -> 0-1.0
const depth = computed(() => {
  return depthSlider.value / 100
})

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

// Shared waveform drawing logic — used by both static and animated paths
function drawWaveformToCanvas(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  phase: number,
  alpha: number,
) {
  const dpr = window.devicePixelRatio || 1
  const accentColor = TAB_COLORS[activeTab.value]
  const amplitude = logicalHeight * 0.35 * depth.value
  const centerY = logicalHeight / 2

  // Apply DPR scaling consistently with setTransform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, logicalWidth, logicalHeight)

  // Center line
  ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(logicalWidth, centerY)
  ctx.stroke()
  ctx.setLineDash([])

  // Waveform
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 2.5
  ctx.globalAlpha = alpha
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
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="lfo-demo">
    <div class="warning">
      <strong>Note:</strong> Audio sources can be loud. Start with low volume.
    </div>

    <!-- Presets -->
    <div class="control-group">
      <div class="row preset-row">
        <label>Presets:</label>
        <div class="button-group preset-group">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="preset-button"
            @click="applyPreset(preset)"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Play button — prominent position above tab bar -->
    <div class="play-row">
      <button
        class="play-button"
        :disabled="loading"
        @click="togglePlayback"
      >
        {{ loading ? 'Loading...' : playing ? 'Stop' : 'Play' }}
      </button>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        v-for="tab in (['tremolo', 'vibrato', 'filter'] as TabType[])"
        :key="tab"
        class="tab-button"
        :class="{ active: activeTab === tab }"
        :style="activeTab === tab ? { borderBottomColor: TAB_COLORS[tab], color: TAB_COLORS[tab] } : {}"
        @click="activeTab = tab"
      >
        {{ tab === 'filter' ? 'Filter Sweep' : tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>

    <!-- Canvas visualization -->
    <div class="canvas-container">
      <canvas ref="canvasRef" class="waveform-canvas" />
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="control-group">
        <div class="row">
          <label for="lfo-rate">Rate:</label>
          <input
            id="lfo-rate"
            v-model.number="rateSlider"
            type="range"
            min="0"
            max="100"
            :aria-label="`LFO rate: ${rate.toFixed(1)} Hz`"
          >
          <span class="value">{{ rate.toFixed(1) }} Hz</span>
        </div>

        <div class="row">
          <label for="lfo-depth">Depth:</label>
          <input
            id="lfo-depth"
            v-model.number="depthSlider"
            type="range"
            min="0"
            max="100"
            :aria-label="`LFO depth: ${depthDisplayLabel}`"
          >
          <span class="value">{{ depthDisplayLabel }}</span>
        </div>

        <div class="row">
          <label>Waveform:</label>
          <div class="button-group waveform-group">
            <button
              v-for="wf in (['sine', 'square', 'sawtooth', 'triangle'] as const)"
              :key="wf"
              :class="{ active: waveformType === wf }"
              :aria-label="`Waveform: ${wf}`"
              @click="waveformType = wf"
            >
              <svg width="24" height="12" viewBox="0 0 24 12" class="waveform-icon">
                <path
                  v-if="wf === 'sine'"
                  d="M0,6 C4,0 8,0 12,6 C16,12 20,12 24,6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  v-else-if="wf === 'square'"
                  d="M0,10 L0,2 L6,2 L6,10 L12,10 L12,2 L18,2 L18,10 L24,10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  v-else-if="wf === 'sawtooth'"
                  d="M0,10 L8,2 L8,10 L16,2 L16,10 L24,2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  v-else-if="wf === 'triangle'"
                  d="M0,10 L6,2 L12,10 L18,2 L24,10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
              <span class="waveform-label">{{ wf }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.lfo-demo {
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  margin: 1.5rem 0;
}

.warning {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-warning-soft);
  border-left: 3px solid var(--vp-c-warning);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.warning strong {
  color: var(--vp-c-warning);
}

.play-row {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tab-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--vp-c-text-1);
}

.tab-button.active {
  font-weight: 600;
}

.tab-button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: -2px;
}

.canvas-container {
  margin-bottom: 1rem;
}

.waveform-canvas {
  width: 100%;
  border-radius: 8px;
  background: var(--vp-c-bg);
  display: block;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preset-row {
  margin-bottom: 0.5rem;
}

label {
  min-width: 100px;
  font-weight: 500;
  font-size: 0.9em;
}

input[type="range"] {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.value {
  min-width: 80px;
  font-family: monospace;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.preset-group {
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  font-weight: 600;
}

.preset-button {
  font-size: 0.85em;
  padding: 0.35rem 0.75rem;
}

.waveform-group button {
  padding: 0.4rem 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 64px;
}

.waveform-icon {
  display: block;
}

.waveform-label {
  font-size: 0.75em;
  text-transform: capitalize;
  line-height: 1;
}

.play-button {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-weight: 600;
  min-width: 80px;
}

.play-button:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  padding: 0.5rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-radius: 4px;
  font-size: 0.9em;
}

@media (max-width: 640px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }

  label {
    min-width: auto;
  }

  input[type="range"] {
    width: 100%;
    max-width: 100%;
  }

  .button-group {
    width: 100%;
  }

  .button-group button {
    flex: 1;
  }

  .tab-bar {
    flex-wrap: wrap;
  }
}
</style>

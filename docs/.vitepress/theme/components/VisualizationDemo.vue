<script setup lang="ts">
import { useAnalyzer, useCleanup, useOscillator } from '@ez-web-audio/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import PresetSelector from './kit/PresetSelector.vue'
import WaveformSelector from './kit/WaveformSelector.vue'

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

const error = ref('')
const loading = ref(false)
const isPlaying = ref(false)

// Audio parameters
const waveType = ref<OscillatorType>('sine')
const frequency = ref(440)
const fftSize = ref(1024)
const fftSizeOptions = ['256', '512', '1024', '2048']

// Canvas refs
const frequencyCanvas = ref<HTMLCanvasElement | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)

// Audio instances
const cleanup = useCleanup()
const { instance: oscillator, load: loadOsc, reset: resetOsc } = useOscillator()
const { instance: analyzer, load: loadAnalyzer, reset: resetAnalyzer } = useAnalyzer()
let animationFrameId: number | null = null

onMounted(() => {
  setupCanvases()
  window.addEventListener('resize', setupCanvases)
})

function setupCanvases() {
  const dpr = window.devicePixelRatio || 1

  if (frequencyCanvas.value) {
    const container = frequencyCanvas.value.parentElement
    if (container) {
      const logicalWidth = container.clientWidth
      const logicalHeight = 200
      frequencyCanvas.value.width = logicalWidth * dpr
      frequencyCanvas.value.height = logicalHeight * dpr
      // Store logical dimensions for drawing functions
      frequencyCanvas.value.dataset.logicalWidth = String(logicalWidth)
      frequencyCanvas.value.dataset.logicalHeight = String(logicalHeight)
      const ctx = frequencyCanvas.value.getContext('2d')
      if (ctx)
        ctx.scale(dpr, dpr)
    }
  }

  if (waveformCanvas.value) {
    const container = waveformCanvas.value.parentElement
    if (container) {
      const logicalWidth = container.clientWidth
      const logicalHeight = 200
      waveformCanvas.value.width = logicalWidth * dpr
      waveformCanvas.value.height = logicalHeight * dpr
      // Store logical dimensions for drawing functions
      waveformCanvas.value.dataset.logicalWidth = String(logicalWidth)
      waveformCanvas.value.dataset.logicalHeight = String(logicalHeight)
      const ctx = waveformCanvas.value.getContext('2d')
      if (ctx)
        ctx.scale(dpr, dpr)
    }
  }
}

async function togglePlayback() {
  try {
    error.value = ''

    if (isPlaying.value) {
      stopVisualization()
    }
    else {
      await startVisualization()
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to control playback'
    console.error('Playback error:', e)
  }
}

async function startVisualization() {
  loading.value = true

  try {
    // Create oscillator
    const osc = cleanup.register(await loadOsc({
      frequency: frequency.value,
      type: waveType.value,
    }))
    osc.changeGainTo(0.3)

    // Create analyzer
    const an = cleanup.register(await loadAnalyzer({ fftSize: fftSize.value }))

    // Connect oscillator to analyzer
    osc.setAnalyzer(an)

    // Start oscillator
    osc.play()

    // Start visualization loop
    isPlaying.value = true
    animate()
  }
  finally {
    loading.value = false
  }
}

function stopVisualization() {
  if (oscillator.value) {
    oscillator.value.stop()
    resetOsc()
  }

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  resetAnalyzer()
  isPlaying.value = false

  // Clear canvases
  clearCanvas(frequencyCanvas.value)
  clearCanvas(waveformCanvas.value)
}

function animate() {
  if (!isPlaying.value || !analyzer.value)
    return

  drawFrequencySpectrum()
  drawWaveform()

  animationFrameId = requestAnimationFrame(animate)
}

// Colors are read from --ewa-* tokens via getComputedStyle at draw time (not
// hardcoded hex) so the canvases track light/dark theme automatically. This
// runs every rAF frame while playing, so a theme flip mid-playback is picked
// up on the very next frame.
function drawFrequencySpectrum() {
  if (!analyzer.value || !frequencyCanvas.value)
    return

  const canvas = frequencyCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const frequencyData = analyzer.value.getFrequencyData()
  const width = Number(canvas.dataset.logicalWidth) || canvas.width
  const height = Number(canvas.dataset.logicalHeight) || canvas.height
  const barWidth = width / frequencyData.length

  const style = getComputedStyle(document.documentElement)
  const wellColor = style.getPropertyValue('--ewa-well').trim() || '#1e1e1e'
  const accentColor = style.getPropertyValue('--ewa-accent').trim() || '#0e9268'

  // Clear canvas
  ctx.fillStyle = wellColor
  ctx.fillRect(0, 0, width, height)

  // Draw bars — single accent hue; opacity tracks amplitude for depth
  ctx.fillStyle = accentColor
  for (let i = 0; i < frequencyData.length; i++) {
    const amplitude = frequencyData[i] / 255
    const barHeight = amplitude * height
    const x = i * barWidth
    const y = height - barHeight

    ctx.globalAlpha = 0.35 + amplitude * 0.65
    ctx.fillRect(x, y, barWidth - 1, barHeight)
  }
  ctx.globalAlpha = 1
}

function drawWaveform() {
  if (!analyzer.value || !waveformCanvas.value)
    return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const waveformData = analyzer.value.getTimeDomainData()
  const width = Number(canvas.dataset.logicalWidth) || canvas.width
  const height = Number(canvas.dataset.logicalHeight) || canvas.height

  const style = getComputedStyle(document.documentElement)
  const wellColor = style.getPropertyValue('--ewa-well').trim() || '#1e1e1e'
  const accentColor = style.getPropertyValue('--ewa-accent').trim() || '#0e9268'

  // Clear canvas
  ctx.fillStyle = wellColor
  ctx.fillRect(0, 0, width, height)

  // Draw waveform line
  ctx.lineWidth = 2
  ctx.strokeStyle = accentColor
  ctx.beginPath()

  const sliceWidth = width / waveformData.length
  let x = 0

  for (let i = 0; i < waveformData.length; i++) {
    const v = waveformData[i] / 128.0 // Normalize to 0-2
    const y = (v * height) / 2

    if (i === 0) {
      ctx.moveTo(x, y)
    }
    else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.stroke()
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas)
    return
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const width = Number(canvas.dataset.logicalWidth) || canvas.width
  const height = Number(canvas.dataset.logicalHeight) || canvas.height
  const wellColor = getComputedStyle(document.documentElement).getPropertyValue('--ewa-well').trim() || '#1e1e1e'
  ctx.fillStyle = wellColor
  ctx.fillRect(0, 0, width, height)
}

function updateWaveform() {
  if (!isPlaying.value || !oscillator.value)
    return

  // Stop and recreate oscillator with new waveform
  const wasPlaying = isPlaying.value
  stopVisualization()

  if (wasPlaying) {
    startVisualization()
  }
}

function updateFrequency() {
  if (!isPlaying.value || !oscillator.value)
    return

  oscillator.value.update('frequency').to(frequency.value).as('ratio')
}

function updateFFTSize() {
  if (!isPlaying.value)
    return

  // Restart with new FFT size
  const wasPlaying = isPlaying.value
  stopVisualization()

  if (wasPlaying) {
    startVisualization()
  }
}

// Kit controls emit the new value directly rather than exposing the native
// input/select event — these thin wrappers write the ref (what v-model used
// to do) and then call the same update* function the old inline
// `@input`/`@change` handlers called, in the same order.
function onWaveTypeSelect(wave: string) {
  waveType.value = wave as OscillatorType
  updateWaveform()
}

function onFrequencyInput(v: number) {
  frequency.value = v
  updateFrequency()
}

function onFftSizeSelect(v: string) {
  fftSize.value = Number(v)
  updateFFTSize()
}

function formatFrequency(v: number): string {
  return `${Math.round(v)} Hz`
}

onUnmounted(() => {
  stopVisualization()
  window.removeEventListener('resize', setupCanvases)
})
</script>

<template>
  <DemoFrame
    class="visualization-demo"
    :error="error"
    takeaway="Analyzer data is one call away."
  >
    <div class="control-row">
      <PlayButton
        :playing="isPlaying"
        :loading="loading"
        :aria-label="isPlaying ? 'Stop visualization' : 'Start visualization'"
        @click="togglePlayback"
      />

      <WaveformSelector
        :model-value="waveType"
        small
        @update:model-value="onWaveTypeSelect"
      />
    </div>

    <div class="control-row control-row--params">
      <ParameterSlider
        class="frequency-slider"
        label="Frequency"
        :model-value="frequency"
        :min="100"
        :max="2000"
        :step="10"
        :format="formatFrequency"
        @update:model-value="onFrequencyInput"
      />

      <div class="fft-size-control">
        <span class="fft-size-label">FFT Size</span>
        <PresetSelector
          label="FFT Size"
          :options="fftSizeOptions"
          :model-value="String(fftSize)"
          @update:model-value="onFftSizeSelect"
        />
      </div>
    </div>

    <div class="visualizations">
      <div class="viz-container">
        <h3>Frequency Spectrum</h3>
        <canvas ref="frequencyCanvas" class="viz-canvas" role="img" aria-label="Frequency spectrum visualization showing audio frequency distribution as a bar graph" />
        <p class="viz-info">
          Shows frequency distribution (FFT analysis)
        </p>
      </div>

      <div class="viz-container">
        <h3>Waveform</h3>
        <canvas ref="waveformCanvas" class="viz-canvas" role="img" aria-label="Waveform visualization showing audio signal oscillation pattern" />
        <p class="viz-info">
          Shows time-domain waveform
        </p>
      </div>
    </div>
  </DemoFrame>
</template>

<style scoped>
.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.control-row--params {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ewa-line);
}

.frequency-slider {
  flex: 1;
  min-width: 200px;
}

.fft-size-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fft-size-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text-2);
}

.visualizations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.viz-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.viz-container h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--ewa-text);
}

.viz-canvas {
  width: 100%;
  height: 200px;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  display: block;
}

.viz-info {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ewa-text-2);
  font-style: italic;
}

@media (max-width: 768px) {
  .visualizations {
    grid-template-columns: 1fr;
  }
}
</style>

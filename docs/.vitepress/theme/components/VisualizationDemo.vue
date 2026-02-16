<template>
  <div class="visualization-demo">
    <div v-if="error" class="error">{{ error }}</div>

    <div class="controls-section">
      <div class="control-row">
        <button
          @click="togglePlayback"
          class="play-btn"
          :class="{ active: isPlaying }"
        >
          {{ isPlaying ? 'Stop' : 'Play' }}
        </button>

        <label>
          Waveform:
          <select v-model="waveType" @change="updateWaveform">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </label>

        <label>
          Frequency: {{ frequency }} Hz
          <input
            type="range"
            v-model.number="frequency"
            min="100"
            max="2000"
            step="10"
            @input="updateFrequency"
          />
        </label>

        <label>
          FFT Size:
          <select v-model.number="fftSize" @change="updateFFTSize">
            <option :value="256">256</option>
            <option :value="512">512</option>
            <option :value="1024">1024</option>
            <option :value="2048">2048</option>
          </select>
        </label>
      </div>
    </div>

    <div class="visualizations">
      <div class="viz-container">
        <h3>Frequency Spectrum</h3>
        <canvas ref="frequencyCanvas" class="viz-canvas"></canvas>
        <p class="viz-info">Shows frequency distribution (FFT analysis)</p>
      </div>

      <div class="viz-container">
        <h3>Waveform</h3>
        <canvas ref="waveformCanvas" class="viz-canvas"></canvas>
        <p class="viz-info">Shows time-domain waveform</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Initializing audio...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

const error = ref('')
const loading = ref(false)
const isPlaying = ref(false)

// Audio parameters
const waveType = ref<OscillatorType>('sine')
const frequency = ref(440)
const fftSize = ref(1024)

// Canvas refs
const frequencyCanvas = ref<HTMLCanvasElement | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)

// Audio instances
let oscillator: any = null
let analyzer: any = null
let animationFrameId: number | null = null

onMounted(() => {
  setupCanvases()
  window.addEventListener('resize', setupCanvases)
})

function setupCanvases() {
  if (frequencyCanvas.value) {
    const container = frequencyCanvas.value.parentElement
    if (container) {
      frequencyCanvas.value.width = container.clientWidth
      frequencyCanvas.value.height = 200
    }
  }

  if (waveformCanvas.value) {
    const container = waveformCanvas.value.parentElement
    if (container) {
      waveformCanvas.value.width = container.clientWidth
      waveformCanvas.value.height = 200
    }
  }
}

async function togglePlayback() {
  try {
    error.value = ''

    if (isPlaying.value) {
      stopVisualization()
    } else {
      await startVisualization()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to control playback'
    console.error('Playback error:', e)
  }
}

async function startVisualization() {
  loading.value = true

  try {
    const { createOscillator, createAnalyzer } = await import('ez-web-audio')

    // Create oscillator
    oscillator = await createOscillator({
      frequency: frequency.value,
      type: waveType.value
    })
    oscillator.changeGainTo(0.3)

    // Create analyzer
    analyzer = createAnalyzer({ fftSize: fftSize.value })

    // Connect oscillator to analyzer
    oscillator.setAnalyzer(analyzer)

    // Start oscillator
    oscillator.play()

    // Start visualization loop
    isPlaying.value = true
    animate()
  } finally {
    loading.value = false
  }
}

function stopVisualization() {
  if (oscillator) {
    oscillator.stop()
    oscillator = null
  }

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  analyzer = null
  isPlaying.value = false

  // Clear canvases
  clearCanvas(frequencyCanvas.value)
  clearCanvas(waveformCanvas.value)
}

function animate() {
  if (!isPlaying.value || !analyzer) return

  drawFrequencySpectrum()
  drawWaveform()

  animationFrameId = requestAnimationFrame(animate)
}

function drawFrequencySpectrum() {
  if (!analyzer || !frequencyCanvas.value) return

  const canvas = frequencyCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const frequencyData = analyzer.getFrequencyData()
  const width = canvas.width
  const height = canvas.height
  const barWidth = width / frequencyData.length

  // Clear canvas
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--vp-c-bg').trim() || '#1e1e1e'
  ctx.fillRect(0, 0, width, height)

  // Draw bars
  for (let i = 0; i < frequencyData.length; i++) {
    const barHeight = (frequencyData[i] / 255) * height
    const x = i * barWidth
    const y = height - barHeight

    // Color based on frequency (low = blue, high = red)
    const hue = (i / frequencyData.length) * 240
    ctx.fillStyle = `hsl(${240 - hue}, 70%, 50%)`
    ctx.fillRect(x, y, barWidth - 1, barHeight)
  }
}

function drawWaveform() {
  if (!analyzer || !waveformCanvas.value) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const waveformData = analyzer.getTimeDomainData()
  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--vp-c-bg').trim() || '#1e1e1e'
  ctx.fillRect(0, 0, width, height)

  // Draw waveform line
  ctx.lineWidth = 2
  ctx.strokeStyle = '#3dd68c'
  ctx.beginPath()

  const sliceWidth = width / waveformData.length
  let x = 0

  for (let i = 0; i < waveformData.length; i++) {
    const v = waveformData[i] / 128.0 // Normalize to 0-2
    const y = (v * height) / 2

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.stroke()
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--vp-c-bg').trim() || '#1e1e1e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function updateWaveform() {
  if (!isPlaying.value || !oscillator) return

  // Stop and recreate oscillator with new waveform
  const wasPlaying = isPlaying.value
  stopVisualization()

  if (wasPlaying) {
    startVisualization()
  }
}

function updateFrequency() {
  if (!isPlaying.value || !oscillator) return

  oscillator.update('frequency').to(frequency.value).from('number')
}

function updateFFTSize() {
  if (!isPlaying.value) return

  // Restart with new FFT size
  const wasPlaying = isPlaying.value
  stopVisualization()

  if (wasPlaying) {
    startVisualization()
  }
}

onUnmounted(() => {
  stopVisualization()
  window.removeEventListener('resize', setupCanvases)
})
</script>

<style scoped>
.visualization-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.error {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger);
  border-radius: 6px;
  font-size: 0.9rem;
}

.controls-section {
  margin-bottom: 1.5rem;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
}

.control-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.control-row select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.control-row input[type="range"] {
  width: 150px;
}

.play-btn {
  padding: 0.75rem 2rem;
  border-radius: 6px;
  border: 2px solid var(--vp-c-brand);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover {
  background: var(--vp-c-brand-light);
}

.play-btn.active {
  background: var(--vp-c-brand);
  color: white;
}

.visualizations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.viz-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.viz-container h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.viz-canvas {
  width: 100%;
  height: 200px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.viz-info {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.loading {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .visualizations {
    grid-template-columns: 1fr;
  }
}
</style>

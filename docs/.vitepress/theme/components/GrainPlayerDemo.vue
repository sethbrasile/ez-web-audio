<template>
  <div class="grain-player-demo">
    <!-- Error banner -->
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Waveform canvas — interaction AND visualization surface -->
    <div class="canvas-container">
      <canvas
        ref="waveformCanvas"
        class="waveform-canvas"
        :class="{ dragging: isDragging, loaded: waveformLoaded }"
        style="touch-action: none; cursor: crosshair;"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
      />
      <div v-if="!waveformLoaded" class="canvas-placeholder">
        <span>Click Play to load waveform</span>
      </div>
    </div>

    <!-- Playback row -->
    <div class="controls-row playback-row">
      <button
        class="play-button"
        :aria-label="playing ? 'Stop' : 'Play'"
        :disabled="loading"
        @click="togglePlay"
      >{{ loading ? 'Loading...' : playing ? 'Stop' : 'Play' }}</button>

      <label class="control-group">
        <span>Speed</span>
        <input type="range" min="0" max="3" step="0.05" v-model.number="speed" />
        <span class="readout">{{ speed.toFixed(2) }}x</span>
      </label>

      <label class="control-group loop-toggle">
        <input type="checkbox" v-model="loop" @change="onLoopChange" />
        <span>Loop</span>
      </label>
    </div>

    <!-- Pitch row -->
    <div class="controls-row pitch-row">
      <label class="control-group wide">
        <span>Pitch</span>
        <input type="range" min="-24" max="24" step="1" v-model.number="pitch" aria-label="Pitch in semitones" />
        <span class="readout">{{ pitch > 0 ? '+' : '' }}{{ pitch }} st</span>
      </label>
    </div>

    <!-- Grain row -->
    <div class="controls-row grain-row">
      <label class="control-group">
        <span>Grain Size</span>
        <input type="range" min="0.01" max="0.5" step="0.01" v-model.number="grainSize" aria-label="Grain size" />
        <span class="readout">{{ (grainSize * 1000).toFixed(0) }}ms</span>
      </label>

      <label class="control-group">
        <span>Overlap</span>
        <input type="range" min="0" :max="grainSize - 0.001" step="0.001" v-model.number="overlap" aria-label="Grain overlap" />
        <span class="readout">{{ (overlap * 1000).toFixed(0) }}ms</span>
      </label>

      <label class="control-group">
        <span>Jitter</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="jitter" aria-label="Grain jitter" />
        <span class="readout">{{ (jitter * 100).toFixed(0) }}%</span>
      </label>
    </div>

    <!-- Preset buttons -->
    <div class="presets-row">
      <span class="presets-label">Presets:</span>
      <button @click="applyPreset('smooth')">Smooth Pad</button>
      <button @click="applyPreset('choppy')">Choppy</button>
      <button @click="applyPreset('scatter')">Scatter</button>
      <button @click="applyPreset('freeze')">Freeze</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

// Module-level audio state (outside reactive — created once)
let lib: any = null
let grainPlayer: any = null
let cachedBuffer: AudioBuffer | null = null
let waveformImageData: ImageData | null = null
let animFrameId: number | null = null
let lastFrameTime = 0
let bufferDurationSeconds = 4

// Reactive UI state
const playing = ref(false)
const loading = ref(false)
const error = ref('')
const waveformLoaded = ref(false)
const isDragging = ref(false)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)

// Parameters (synced to grainPlayer via watch)
const position = ref(0)
const pitch = ref(0)           // semitones
const speed = ref(1)           // 0–3x multiplier
const grainSize = ref(0.1)     // seconds
const overlap = ref(0.05)      // seconds
const jitter = ref(0)          // 0–1
const loop = ref(true)

// Parameter watches
watch(pitch, (v) => { if (grainPlayer) grainPlayer.pitch = v })
watch(grainSize, (v) => {
  if (grainPlayer) grainPlayer.grainSize = v
  // Clamp overlap if needed
  if (overlap.value >= v) overlap.value = Math.max(0, v - 0.001)
})
watch(overlap, (v) => { if (grainPlayer) grainPlayer.overlap = v })
watch(jitter, (v) => { if (grainPlayer) grainPlayer.jitter = v })

// Lazy init
async function ensureLoaded() {
  if (lib) return
  lib = await import('ez-web-audio')
  const sound = await lib.createSound('/ez-web-audio/audio/grain-sample.mp3')
  cachedBuffer = (sound as any).audioBuffer as AudioBuffer
  bufferDurationSeconds = cachedBuffer.duration
  grainPlayer = await lib.createGrainPlayer(cachedBuffer, {
    grainSize: grainSize.value,
    overlap: overlap.value,
    jitter: jitter.value,
    loop: loop.value,
  })
  grainPlayer.pitch = pitch.value
  // Apply initial position
  grainPlayer.position = position.value
  setupCanvas()
  drawStaticWaveform()
  waveformLoaded.value = true
}

async function togglePlay() {
  if (loading.value) return
  try {
    loading.value = true
    error.value = ''
    await ensureLoaded()
    if (playing.value) {
      grainPlayer.stop()
      playing.value = false
      stopOverlayLoop()
    } else {
      grainPlayer.play()
      playing.value = true
      startOverlayLoop()
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Audio error'
  }
  finally {
    loading.value = false
  }
}

function onLoopChange() {
  if (grainPlayer) grainPlayer.loop = loop.value
}

// Canvas setup (DPR-aware, matches VisualizationDemo.vue pattern)
function setupCanvas() {
  const canvas = waveformCanvas.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement
  if (!container) return
  const logicalWidth = container.clientWidth
  const logicalHeight = 160
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  canvas.dataset.logicalWidth = String(logicalWidth)
  canvas.dataset.logicalHeight = String(logicalHeight)
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

// Static waveform from AudioBuffer channel data
function drawStaticWaveform() {
  const canvas = waveformCanvas.value
  if (!canvas || !cachedBuffer) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight
  const data = cachedBuffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / width))

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#4ecdc4'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < width; x++) {
    let min = 1.0
    let max = -1.0
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
  // Cache as ImageData for overlay redraws
  waveformImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// Overlay: position line + jitter zone, redrawn each RAF frame
function drawOverlay() {
  const canvas = waveformCanvas.value
  if (!canvas || !waveformImageData) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight

  ctx.putImageData(waveformImageData, 0, 0)
  const posX = position.value * width

  // Jitter zone (translucent shaded region around position)
  if (jitter.value > 0) {
    const jitterPx = jitter.value * width * 0.5
    ctx.fillStyle = 'rgba(78, 205, 196, 0.15)'
    ctx.fillRect(posX - jitterPx, 0, jitterPx * 2, height)
  }

  // Position line
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(posX, 0)
  ctx.lineTo(posX, height)
  ctx.stroke()

  // Position dot at vertical center
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(posX, height / 2, 5, 0, Math.PI * 2)
  ctx.fill()
}

// RAF loop: auto-advance position by speed + redraw overlay
function startOverlayLoop() {
  lastFrameTime = 0
  const rafLoop = (timestamp: number) => {
    if (playing.value && lastFrameTime > 0 && !isDragging.value && grainPlayer) {
      const dt = (timestamp - lastFrameTime) / 1000
      const advance = (dt * speed.value) / bufferDurationSeconds
      position.value = (position.value + advance) % 1
      grainPlayer.position = position.value
    }
    lastFrameTime = timestamp
    drawOverlay()
    animFrameId = requestAnimationFrame(rafLoop)
  }
  animFrameId = requestAnimationFrame(rafLoop)
}

function stopOverlayLoop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
}

// Canvas drag interaction (position control)
function getPositionFromEvent(clientX: number): number {
  const canvas = waveformCanvas.value
  if (!canvas) return 0
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  return Math.max(0, Math.min(1, x / width))
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  const newPos = getPositionFromEvent(e.clientX)
  position.value = newPos
  if (grainPlayer) grainPlayer.position = newPos
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const newPos = getPositionFromEvent(e.clientX)
  position.value = newPos
  if (grainPlayer) grainPlayer.position = newPos
}

function handleMouseUp() {
  isDragging.value = false
}

function handleTouchStart(e: TouchEvent) {
  isDragging.value = true
  const newPos = getPositionFromEvent(e.touches[0].clientX)
  position.value = newPos
  if (grainPlayer) grainPlayer.position = newPos
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  const newPos = getPositionFromEvent(e.touches[0].clientX)
  position.value = newPos
  if (grainPlayer) grainPlayer.position = newPos
}

// Resize: re-setup canvas and redraw cached waveform
function handleResize() {
  setupCanvas()
  if (cachedBuffer) drawStaticWaveform()
}

// Preset configurations
function applyPreset(name: string) {
  const presets: Record<string, { grainSize: number; overlap: number; jitter: number; speed: number; pitch: number }> = {
    smooth: { grainSize: 0.25, overlap: 0.12, jitter: 0.02, speed: 1, pitch: 0 },
    choppy: { grainSize: 0.02, overlap: 0.005, jitter: 0.1, speed: 1, pitch: 0 },
    scatter: { grainSize: 0.08, overlap: 0.02, jitter: 0.8, speed: 0.5, pitch: 0 },
    freeze: { grainSize: 0.15, overlap: 0.07, jitter: 0.15, speed: 0, pitch: 0 },
  }
  const p = presets[name]
  if (!p) return
  grainSize.value = p.grainSize
  overlap.value = p.overlap
  jitter.value = p.jitter
  speed.value = p.speed
  pitch.value = p.pitch
}

onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopOverlayLoop()
  if (grainPlayer) {
    grainPlayer.stop()
    grainPlayer.dispose()
  }
  document.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.grain-player-demo {
  max-width: 800px;
  margin: auto;
  padding: 1rem;
}

.canvas-container {
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
}

.waveform-canvas {
  display: block;
  width: 100%;
  height: 160px;
  border-radius: 4px;
  background: #1a1a2e;
  cursor: crosshair;
  user-select: none;
}

.waveform-canvas.dragging {
  cursor: grabbing;
}

.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  pointer-events: none;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-group.wide {
  flex: 1;
}

.control-group span:first-child {
  white-space: nowrap;
  min-width: 5ch;
}

.control-group input[type='range'] {
  flex: 1;
  min-width: 80px;
}

.loop-toggle {
  gap: 0.35rem;
  cursor: pointer;
}

.play-button {
  padding: 0.5rem 1.5rem;
  background: #4ecdc4;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
}

.play-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.play-button:hover:not(:disabled) {
  background: #3bb8b0;
}

.readout {
  font-variant-numeric: tabular-nums;
  min-width: 4ch;
  text-align: right;
  white-space: nowrap;
  font-size: 0.9em;
  color: #888;
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.presets-label {
  font-size: 0.9em;
  color: #888;
}

.presets-row button {
  padding: 0.3rem 0.75rem;
  background: transparent;
  border: 1px solid #4ecdc4;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #4ecdc4;
}

.presets-row button:hover {
  background: rgba(78, 205, 196, 0.1);
}

.error-banner {
  background: #ff6b6b;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
</style>

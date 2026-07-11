<script setup lang="ts">
import { useCleanup, useGrainPlayer, useSound } from '@ez-web-audio/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import PresetSelector from './kit/PresetSelector.vue'

// Module-level preset constant — allocated once, not per call
const PRESETS: Record<string, { grainSize: number, overlap: number, jitter: number, speed: number, pitch: number, position?: number }> = {
  // smooth ("Pad"): long grains (300ms) + deep overlap (240ms, ~5 grains stacked at
  // once) build a sustained wash instead of a single voice. jitter sprays grain
  // start points +/-12% of the buffer so the texture keeps evolving instead of
  // sounding static. speed 0.1 (near-frozen, matches freeze) keeps position from
  // sweeping through the sample's natural attack/decay — that sweep at speed 1 was
  // the bug: it replayed the piano note's decay instead of sustaining it (gate-2 ez-audio-7fk).
  // position anchors the spray in the sample's sustain region — starting at 0 would
  // hover on the piano hammer attack and still read as "piano", not "pad".
  // No per-grain pitch/detune spread here — GrainPlayer's public API only exposes a
  // single global pitch/playbackRate shared by every grain, not per-grain randomization.
  smooth: { grainSize: 0.3, overlap: 0.24, jitter: 0.12, speed: 0.1, pitch: 0, position: 0.35 },
  // choppy: 40ms grains ensure tonal material completes a full cycle above ~25 Hz (M25)
  choppy: { grainSize: 0.04, overlap: 0.005, jitter: 0.1, speed: 1, pitch: 0 },
  scatter: { grainSize: 0.08, overlap: 0.02, jitter: 0.8, speed: 0.5, pitch: 0 },
  // freeze: near-zero jitter and overlap close to grain size for stable freeze texture (M24)
  freeze: { grainSize: 0.15, overlap: 0.14, jitter: 0.02, speed: 0.1, pitch: 0 },
}

const PRESET_NAMES = [
  { id: 'smooth', label: 'Smooth Pad' },
  { id: 'choppy', label: 'Choppy' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'freeze', label: 'Freeze' },
]

// Kit PresetSelector option shape — derived once from the frozen PRESET_NAMES above.
const PRESET_OPTIONS = PRESET_NAMES.map(({ id, label }) => ({ value: id, label }))

// Composable-managed audio state
const cleanup = useCleanup()
const { instance: sound, load: loadSound } = useSound()
const { instance: grainPlayer, load: loadGrain } = useGrainPlayer()

// Module-level audio state (outside reactive — created once)
let cachedBuffer: AudioBuffer | null = null
let waveformImageData: ImageData | null = null
let animFrameId: number | null = null
let lastFrameTime = 0
let bufferDurationSeconds = 4
let themeObserver: MutationObserver | null = null

// Reactive UI state
const playing = ref(false)
const loading = ref(false)
const error = ref('')
const waveformLoaded = ref(false)
const isDragging = ref(false)
const overlapClamped = ref(false)
const activePreset = ref<string | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)

// Parameters (synced to grainPlayer via watch)
const position = ref(0)
const pitch = ref(0) // semitones
const speed = ref(1) // 0.1–3x multiplier
const grainSize = ref(0.1) // seconds
const overlap = ref(0.05) // seconds
const jitter = ref(0) // 0–1
const loop = ref(true)

// PresetSelector's v-model is typed as a generic string; this narrows it back
// to `string | null` and routes writes through applyPreset (which does more
// than assign — it also sets grainSize/overlap/jitter/speed/pitch/position)
// without changing any playback logic.
const activePresetModel = computed<string>({
  get: () => activePreset.value ?? '',
  set: (v) => { applyPreset(v) },
})

// Value readouts for ParameterSlider — same formatting as the original raw
// <input type="range"> readouts, just handed to the kit component instead.
function formatSpeed(v: number) {
  return `${v.toFixed(2)}x`
}
function formatPitch(v: number) {
  return `${v > 0 ? '+' : ''}${v} semitones`
}
function formatMs(v: number) {
  return `${(v * 1000).toFixed(0)}ms`
}
function formatPercent(v: number) {
  return `${(v * 100).toFixed(0)}%`
}

// Parameter watches
watch(pitch, (v) => {
  if (grainPlayer.value)
    grainPlayer.value.pitch = v
})
watch(grainSize, (v) => {
  if (grainPlayer.value)
    grainPlayer.value.grainSize = v
  // Clamp overlap if needed — show feedback to user (M14)
  if (overlap.value >= v) {
    overlap.value = Math.max(0, v - 0.001)
    overlapClamped.value = true
    setTimeout(() => { overlapClamped.value = false }, 2000)
  }
})
watch(overlap, (v) => {
  if (grainPlayer.value)
    grainPlayer.value.overlap = v
})
watch(jitter, (v) => {
  if (grainPlayer.value)
    grainPlayer.value.jitter = v
})

// Lazy init
async function ensureLoaded() {
  if (grainPlayer.value)
    return
  const s = cleanup.register(await loadSound('/ez-web-audio/audio/grain-sample.mp3'))
  cachedBuffer = s.audioBuffer
  bufferDurationSeconds = cachedBuffer.duration
  const gp = cleanup.register(await loadGrain(cachedBuffer, {
    grainSize: grainSize.value,
    overlap: overlap.value,
    jitter: jitter.value,
    loop: loop.value,
  }))
  gp.pitch = pitch.value
  // Apply initial position
  gp.position = position.value
  setupCanvas()
  drawWaveform()
  waveformLoaded.value = true
}

async function togglePlay() {
  if (loading.value)
    return
  try {
    loading.value = true
    error.value = ''
    await ensureLoaded()
    if (playing.value) {
      grainPlayer.value?.stop()
      playing.value = false
      stopOverlayLoop()
    }
    else {
      grainPlayer.value?.play()
      playing.value = true
      startOverlayLoop()
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Audio error'
  }
  finally {
    loading.value = false
  }
}

function onLoopChange() {
  if (grainPlayer.value)
    grainPlayer.value.loop = loop.value
}

// Canvas setup (DPR-aware, matches VisualizationDemo.vue pattern)
function setupCanvas() {
  const canvas = waveformCanvas.value
  if (!canvas)
    return
  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement
  if (!container)
    return
  const logicalWidth = container.clientWidth
  const logicalHeight = 160
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  canvas.dataset.logicalWidth = String(logicalWidth)
  canvas.dataset.logicalHeight = String(logicalHeight)
  const ctx = canvas.getContext('2d')
  if (ctx)
    ctx.scale(dpr, dpr)
}

// Resolve --ewa-* design tokens for canvas drawing, read at draw time so
// light/dark theme switches are picked up automatically (see themeObserver
// below for the case where nothing else would trigger a redraw).
function resolveCanvasColors() {
  const style = getComputedStyle(document.documentElement)
  const bg = style.getPropertyValue('--ewa-well').trim() || '#1a1a2e'
  const stroke = style.getPropertyValue('--ewa-accent').trim() || '#0e9268'
  const position = style.getPropertyValue('--ewa-lead').trim() || '#2f9fd6'
  return { bg, stroke, position }
}

// Unified waveform drawing — renders waveform from AudioBuffer (M29)
// Pass withOverlay=true to skip caching and immediately draw position/jitter on top.
// Pass withOverlay=false (default) to cache the result as ImageData for fast overlay redraws.
function drawWaveform(withOverlay = false) {
  const canvas = waveformCanvas.value
  if (!canvas || !cachedBuffer)
    return
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight
  const data = cachedBuffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / width))
  const colors = resolveCanvasColors()

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < width; x++) {
    let min = 1.0
    let max = -1.0
    const base = x * step
    for (let s = 0; s < step && (base + s) < data.length; s++) {
      const v = data[base + s]
      if (v < min)
        min = v
      if (v > max)
        max = v
    }
    const yLow = ((min + 1) / 2) * height
    const yHigh = ((max + 1) / 2) * height
    ctx.moveTo(x + 0.5, yLow)
    ctx.lineTo(x + 0.5, yHigh)
  }
  ctx.stroke()

  if (withOverlay) {
    drawOverlayOnCtx(ctx, width, height, colors)
  }
  else {
    // Cache as ImageData for overlay redraws
    waveformImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
}

// Draws position line and jitter zone onto an already-prepared canvas context
function drawOverlayOnCtx(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: ReturnType<typeof resolveCanvasColors>,
) {
  const posX = position.value * width

  // Jitter zone (translucent shaded region around position) — same --ewa-lead
  // hue as the position marker, at reduced alpha instead of a hardcoded rgba()
  // so it tracks light/dark theme without needing to parse the token's format.
  if (jitter.value > 0) {
    const jitterPx = jitter.value * width * 0.5
    ctx.globalAlpha = 0.15
    ctx.fillStyle = colors.position
    ctx.fillRect(posX - jitterPx, 0, jitterPx * 2, height)
    ctx.globalAlpha = 1
  }

  // Position line
  ctx.strokeStyle = colors.position
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(posX, 0)
  ctx.lineTo(posX, height)
  ctx.stroke()

  // Position dot at vertical center
  ctx.fillStyle = colors.position
  ctx.beginPath()
  ctx.arc(posX, height / 2, 5, 0, Math.PI * 2)
  ctx.fill()
}

// Overlay: restore cached waveform then draw position/jitter on top
function drawOverlay() {
  const canvas = waveformCanvas.value
  if (!canvas || !waveformImageData)
    return
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  const height = Number(canvas.dataset.logicalHeight) || canvas.clientHeight
  const colors = resolveCanvasColors()

  ctx.putImageData(waveformImageData, 0, 0)
  drawOverlayOnCtx(ctx, width, height, colors)
}

// RAF loop: auto-advance position by speed + redraw overlay
function startOverlayLoop() {
  lastFrameTime = 0
  const rafLoop = (timestamp: number) => {
    if (playing.value && lastFrameTime > 0 && !isDragging.value && grainPlayer.value) {
      const dt = (timestamp - lastFrameTime) / 1000
      const advance = (dt * speed.value) / bufferDurationSeconds
      position.value = (position.value + advance) % 1
      grainPlayer.value.position = position.value
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
  if (!canvas)
    return 0
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const width = Number(canvas.dataset.logicalWidth) || canvas.clientWidth
  return Math.max(0, Math.min(1, x / width))
}

function applyPointerPosition(newPos: number) {
  position.value = newPos
  if (grainPlayer.value)
    grainPlayer.value.position = newPos
  // The RAF overlay loop only runs while playing — redraw here so the
  // playhead follows clicks/drags while stopped too (next play starts there)
  if (!playing.value)
    drawOverlay()
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  applyPointerPosition(getPositionFromEvent(e.clientX))
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value)
    return
  applyPointerPosition(getPositionFromEvent(e.clientX))
}

function handleMouseUp() {
  isDragging.value = false
}

function handleTouchStart(e: TouchEvent) {
  isDragging.value = true
  applyPointerPosition(getPositionFromEvent(e.touches[0].clientX))
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value)
    return
  applyPointerPosition(getPositionFromEvent(e.touches[0].clientX))
}

// H1: touchend/touchcancel handlers — prevent isDragging from staying stuck on mobile
function handleTouchEnd() {
  isDragging.value = false
}

// Resize: re-setup canvas and redraw cached waveform
function handleResize() {
  setupCanvas()
  if (cachedBuffer)
    drawWaveform()
}

// Apply a named preset and track which is active (M15)
function applyPreset(name: string) {
  const p = PRESETS[name]
  if (!p)
    return
  activePreset.value = name
  grainSize.value = p.grainSize
  overlap.value = p.overlap
  jitter.value = p.jitter
  speed.value = p.speed
  pitch.value = p.pitch
  // Presets may anchor the read position (e.g. Pad hovers in the sustain
  // region); presets without one keep the user's current position.
  if (p.position !== undefined) {
    position.value = p.position
    if (grainPlayer.value)
      grainPlayer.value.position = p.position
  }
}

onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  // H1: register touch-end/cancel on document so drag always releases even if
  // finger lifts outside the canvas element
  document.addEventListener('touchend', handleTouchEnd)
  document.addEventListener('touchcancel', handleTouchEnd)
  window.addEventListener('resize', handleResize)

  // Canvas colors are read from --ewa-* tokens at draw time, but the rAF
  // overlay loop only runs while playing — nothing repaints when the user
  // flips light/dark theme while idle. Watch <html class> and redraw the
  // cached waveform + overlay so the canvas doesn't get stuck showing the
  // previous theme (same pattern as XYPad.vue).
  themeObserver = new MutationObserver(() => {
    if (waveformLoaded.value) {
      drawWaveform()
      drawOverlay()
    }
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  stopOverlayLoop()
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('touchcancel', handleTouchEnd)
  window.removeEventListener('resize', handleResize)
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <DemoFrame
    class="grain-player-demo"
    :error="error"
    takeaway="Granular synthesis — pitch and speed are independent."
  >
    <!-- Waveform canvas — interaction AND visualization surface -->
    <div class="canvas-container">
      <canvas
        ref="waveformCanvas"
        class="waveform-canvas"
        :class="{ dragging: isDragging, loaded: waveformLoaded }"
        :style="{ cursor: waveformLoaded ? (isDragging ? 'grabbing' : 'crosshair') : 'default', touchAction: 'none' }"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
      />
      <div v-if="!waveformLoaded" class="canvas-placeholder">
        <span>Click Play to load waveform</span>
      </div>
    </div>

    <div class="controls">
      <!-- Playback row -->
      <div class="playback-row">
        <PlayButton
          class="play-button"
          :playing="playing"
          :loading="loading"
          loading-label="Loading..."
          @click="togglePlay"
        />

        <ParameterSlider
          v-model="speed"
          class="speed-slider"
          label="Speed"
          :min="0.1"
          :max="3"
          :step="0.05"
          :format="formatSpeed"
        />

        <label class="loop-toggle">
          <input v-model="loop" type="checkbox" @change="onLoopChange">
          <span>Loop</span>
        </label>
      </div>

      <!-- Pitch -->
      <ParameterSlider
        v-model="pitch"
        label="Pitch in semitones"
        :min="-24"
        :max="24"
        :step="1"
        center
        :format="formatPitch"
      />

      <!-- Grain parameters -->
      <div class="grain-row">
        <ParameterSlider
          v-model="grainSize"
          label="Grain size"
          :min="0.01"
          :max="0.5"
          :step="0.01"
          :format="formatMs"
        />

        <ParameterSlider
          v-model="overlap"
          label="Grain overlap"
          :min="0"
          :max="grainSize - 0.001"
          :step="0.001"
          :format="formatMs"
        />

        <ParameterSlider
          v-model="jitter"
          label="Grain jitter"
          :min="0"
          :max="1"
          :step="0.01"
          :format="formatPercent"
        />
      </div>

      <!-- Presets -->
      <div class="presets-row">
        <PresetSelector
          v-model="activePresetModel"
          label="Presets"
          :options="PRESET_OPTIONS"
        />
      </div>
    </div>

    <template v-if="overlapClamped" #status>
      <span class="status-hint" role="status" aria-live="polite">Overlap clamped to grain size max</span>
    </template>
  </DemoFrame>
</template>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  margin-bottom: 1.25rem;
}

.waveform-canvas {
  display: block;
  width: 100%;
  height: 160px;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  /* Background matches the JS fill color read from --ewa-well at draw time,
     so there's no flash-of-wrong-color before the first paint. */
  background: var(--ewa-well);
  user-select: none;
}

.waveform-canvas:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ewa-text-3);
  pointer-events: none;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.playback-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.speed-slider {
  flex: 1;
  min-width: 160px;
}

.loop-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--ewa-text-2);
  cursor: pointer;
  white-space: nowrap;
}

.loop-toggle input[type='checkbox'] {
  accent-color: var(--ewa-accent);
  width: 16px;
  height: 16px;
}

.grain-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

.grain-row > * {
  flex: 1;
  min-width: 160px;
}

.presets-row {
  display: flex;
  align-items: center;
}

.status-hint {
  font-size: 0.85rem;
  color: var(--ewa-warn);
}

@media (max-width: 640px) {
  .playback-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

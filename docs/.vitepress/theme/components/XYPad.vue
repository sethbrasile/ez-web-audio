<script setup lang="ts">
import { useCleanup, useOscillator } from '@ez-web-audio/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const waveType = ref<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine')
const currentFreq = ref(440)
const currentGain = ref(0.5)
const currentNote = ref('A4')
const error = ref('')

// Keyboard-controlled position (start near center of logical canvas ~400px)
const kbX = ref(200)
const kbY = ref(200)

// Track held arrow keys to stop oscillator when all released
const heldKeys = new Set<string>()
const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

let ctx: CanvasRenderingContext2D | null = null

const cleanup = useCleanup()
const { instance: oscillator, load: loadOsc, reset: resetOsc } = useOscillator()

// Note mapping for frequency to note name
const notes = [
  { name: 'C', freq: 16.35 },
  { name: 'C#', freq: 17.32 },
  { name: 'D', freq: 18.35 },
  { name: 'D#', freq: 19.45 },
  { name: 'E', freq: 20.60 },
  { name: 'F', freq: 21.83 },
  { name: 'F#', freq: 23.12 },
  { name: 'G', freq: 24.50 },
  { name: 'G#', freq: 25.96 },
  { name: 'A', freq: 27.50 },
  { name: 'A#', freq: 29.14 },
  { name: 'B', freq: 30.87 },
]

function frequencyToNote(freq: number): string {
  // Find the closest note
  const a4 = 440
  const semitones = 12 * Math.log2(freq / a4)
  const noteIndex = Math.round(semitones + 9) % 12
  const octave = Math.floor((Math.round(semitones + 9) + 48) / 12)
  return `${notes[noteIndex < 0 ? noteIndex + 12 : noteIndex].name}${octave}`
}

function drawGrid(x?: number, y?: number) {
  if (!ctx || !canvas.value)
    return

  const width = Number(canvas.value.dataset.logicalWidth) || canvas.value.clientWidth
  const height = Number(canvas.value.dataset.logicalHeight) || canvas.value.clientHeight

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  // Draw subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1

  // Vertical grid lines at octave boundaries (100, 200, 400, 800, 1600 Hz)
  const frequencies = [100, 200, 400, 800, 1600]
  frequencies.forEach((freq) => {
    if (freq <= 2000) {
      const ratio = Math.log(freq / 100) / Math.log(20)
      const xPos = ratio * width
      ctx.beginPath()
      ctx.moveTo(xPos, 0)
      ctx.lineTo(xPos, height)
      ctx.stroke()
    }
  })

  // Horizontal grid lines at 0.25 increments
  for (let i = 0; i <= 4; i++) {
    const yPos = (i / 4) * height
    ctx.beginPath()
    ctx.moveTo(0, yPos)
    ctx.lineTo(width, yPos)
    ctx.stroke()
  }

  // Draw axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '12px sans-serif'

  // X-axis label
  ctx.textAlign = 'center'
  ctx.fillText('Frequency -->', width / 2, height - 5)

  // Y-axis label (rotated)
  ctx.save()
  ctx.translate(10, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText('Gain', 0, 0)
  ctx.restore()

  // Draw crosshair if position provided
  if (x !== undefined && y !== undefined) {
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth = 2

    // Horizontal line
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()

    // Vertical line
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()

    // Circle at intersection
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function updateFromPosition(x: number, y: number) {
  if (!canvas.value)
    return

  const width = Number(canvas.value.dataset.logicalWidth) || canvas.value.clientWidth
  const height = Number(canvas.value.dataset.logicalHeight) || canvas.value.clientHeight

  // X-axis: frequency (100-2000 Hz, logarithmic)
  const ratio = x / width
  const frequency = 100 * 20 ** ratio

  // Y-axis: gain (0-1, inverted - top is high, bottom is low)
  const gain = 1 - (y / height)

  // Update display values
  currentFreq.value = frequency
  currentGain.value = Math.max(0, Math.min(1, gain))
  currentNote.value = frequencyToNote(frequency)

  // Update oscillator if playing. Pointer moves arrive ~60Hz; instant
  // update('gain') sets step the param and click (gate-2 ez-audio-aub), so
  // both params glide over a few ms instead (same hand-rolled ramp pattern
  // as the Ambient demo — changeGainTo-has-no-ramp gap logged in
  // M8-QUESTIONS).
  if (oscillator.value && isPlaying.value) {
    try {
      const osc = oscillator.value
      const now = osc.audioContext.currentTime
      const RAMP_SEC = 0.03

      const freqParam = osc.audioSourceNode.frequency
      freqParam.cancelScheduledValues(now)
      freqParam.setValueAtTime(freqParam.value, now)
      freqParam.linearRampToValueAtTime(frequency, now + RAMP_SEC)

      const gainParam = osc.getGainNode().gain
      gainParam.cancelScheduledValues(now)
      gainParam.setValueAtTime(gainParam.value, now)
      gainParam.linearRampToValueAtTime(currentGain.value, now + RAMP_SEC)
    }
    catch (e) {
      console.error('Error updating oscillator:', e)
    }
  }

  // Redraw with crosshair
  drawGrid(x, y)
}

async function startPlaying(x: number, y: number) {
  try {
    error.value = ''

    // Create new oscillator
    const osc = cleanup.register(await loadOsc({
      frequency: currentFreq.value,
      type: waveType.value,
    }))
    osc.changeGainTo(currentGain.value)
    osc.play()
    isPlaying.value = true

    updateFromPosition(x, y)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start oscillator'
    console.error('Error starting oscillator:', e)
  }
}

function stopPlaying() {
  if (oscillator.value) {
    try {
      oscillator.value.stop()
    }
    catch (e) {
      console.error('Error stopping oscillator:', e)
    }
    resetOsc()
  }
  isPlaying.value = false
  drawGrid() // Redraw without crosshair
}

function handleMouseDown(e: MouseEvent) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect)
    return

  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  startPlaying(x, y)
}

function handleMouseMove(e: MouseEvent) {
  if (!isPlaying.value)
    return

  const rect = canvas.value?.getBoundingClientRect()
  if (!rect)
    return

  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  updateFromPosition(x, y)
}

function handleMouseUp() {
  stopPlaying()
}

function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect || e.touches.length === 0)
    return

  const touch = e.touches[0]
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  startPlaying(x, y)
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!isPlaying.value)
    return

  const rect = canvas.value?.getBoundingClientRect()
  if (!rect || e.touches.length === 0)
    return

  const touch = e.touches[0]
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  updateFromPosition(x, y)
}

function handleTouchEnd(e: TouchEvent) {
  e.preventDefault()
  stopPlaying()
}

async function handleKeyDown(e: KeyboardEvent) {
  const step = e.shiftKey ? 20 : 5
  if (!canvas.value)
    return

  const logicalWidth = Number(canvas.value.dataset.logicalWidth) || canvas.value.clientWidth
  const logicalHeight = Number(canvas.value.dataset.logicalHeight) || canvas.value.clientHeight

  let x = kbX.value
  let y = kbY.value

  switch (e.key) {
    case 'ArrowRight':
      x = Math.min(logicalWidth, x + step)
      break
    case 'ArrowLeft':
      x = Math.max(0, x - step)
      break
    case 'ArrowUp':
      y = Math.max(0, y - step) // Up = lower y = higher gain
      break
    case 'ArrowDown':
      y = Math.min(logicalHeight, y + step)
      break
    case ' ':
    case 'Escape':
      stopPlaying()
      return
    default:
      return // Don't prevent default for non-arrow keys
  }

  e.preventDefault() // Prevent page scroll

  heldKeys.add(e.key)
  kbX.value = x
  kbY.value = y

  // Start oscillator if not already playing
  if (!isPlaying.value) {
    await startPlaying(x, y)
  }
  else {
    updateFromPosition(x, y)
  }
}

function handleKeyUp(e: KeyboardEvent) {
  heldKeys.delete(e.key)
  if (arrowKeys.includes(e.key) && !arrowKeys.some(k => heldKeys.has(k))) {
    stopPlaying()
  }
}

onMounted(() => {
  if (canvas.value) {
    // Set canvas size with HiDPI support
    const size = Math.min(400, canvas.value.clientWidth)
    const dpr = window.devicePixelRatio || 1
    canvas.value.width = size * dpr
    canvas.value.height = size * dpr
    canvas.value.dataset.logicalWidth = String(size)
    canvas.value.dataset.logicalHeight = String(size)

    ctx = canvas.value.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
    drawGrid()
  }
  // Catch mouseup anywhere on the page so dragging outside canvas still stops playback
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="xy-pad-demo">
    <div class="volume-warning">
      <strong>Volume Warning:</strong> Oscillators can be loud. Start with low system volume.
    </div>

    <div class="canvas-container">
      <canvas
        ref="canvas"
        aria-label="XY Pad - Use arrow keys or click and drag to control frequency (horizontal) and gain (vertical). Hold Shift for larger steps. Space or Escape to stop."
        role="application"
        tabindex="0"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @keydown="handleKeyDown"
        @keyup="handleKeyUp"
        @blur="stopPlaying"
      />
      <div class="keyboard-hint">
        Press and drag to play. X-axis controls frequency (100-2000 Hz), Y-axis controls volume.
      </div>
    </div>

    <div class="controls">
      <label>
        Waveform:
        <select v-model="waveType" :disabled="isPlaying">
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="sawtooth">Sawtooth</option>
          <option value="triangle">Triangle</option>
        </select>
      </label>
    </div>

    <div class="display">
      <div class="value-display">
        <span class="label">Frequency:</span>
        <span class="value">{{ currentFreq.toFixed(0) }} Hz</span>
      </div>
      <div class="value-display">
        <span class="label">Gain:</span>
        <span class="value">{{ (currentGain * 100).toFixed(0) }}%</span>
      </div>
      <div class="value-display">
        <span class="label">Note:</span>
        <span class="value note">{{ currentNote }}</span>
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
.xy-pad-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.volume-warning {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-warning-soft);
  border: 1px solid var(--vp-c-warning);
  border-radius: 4px;
  color: var(--vp-c-warning-text);
  font-size: 0.85rem;
}

.keyboard-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

.canvas-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  aspect-ratio: 1;
}

canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  border: 2px solid var(--vp-c-divider);
  border-radius: 4px;
  touch-action: none;
}

canvas:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.controls {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.controls select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.display {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.value-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.value-display .label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value-display .value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-brand);
}

.value-display .value.note {
  font-size: 1.5rem;
  min-width: 3rem;
  text-align: center;
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger);
  border-radius: 4px;
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}
</style>

<script setup lang="ts">
import { useCleanup, useOscillator } from '@ez-web-audio/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import KeyboardHintChip from './kit/KeyboardHintChip.vue'
import PlayButton from './kit/PlayButton.vue'
import SegmentDisplay from './kit/SegmentDisplay.vue'
import VolumeWarning from './kit/VolumeWarning.vue'
import WaveformSelector from './kit/WaveformSelector.vue'

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

// Last crosshair position drawn, so a theme-change redraw (see MutationObserver
// below) can reproduce the same frame instead of losing the crosshair/puck.
let lastDrawX: number | undefined
let lastDrawY: number | undefined
let themeObserver: MutationObserver | null = null

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

// Draws the grid + (optional) crosshair/puck using EWA design tokens, read at
// draw time so light/dark theme switches are picked up automatically (see
// themeObserver below for the case where nothing else would trigger a redraw).
function drawGrid(x?: number, y?: number) {
  if (!ctx || !canvas.value)
    return

  lastDrawX = x
  lastDrawY = y

  const width = Number(canvas.value.dataset.logicalWidth) || canvas.value.clientWidth
  const height = Number(canvas.value.dataset.logicalHeight) || canvas.value.clientHeight

  const style = getComputedStyle(document.documentElement)
  const well = style.getPropertyValue('--ewa-well').trim() || '#1a1a2e'
  const gridLine = style.getPropertyValue('--ewa-line-2').trim() || 'rgba(255,255,255,0.1)'
  const accent = style.getPropertyValue('--ewa-accent').trim() || '#4a9eff'
  const bg = style.getPropertyValue('--ewa-bg').trim() || '#000'

  // Clear canvas
  ctx.fillStyle = well
  ctx.fillRect(0, 0, width, height)

  // Draw subtle grid lines
  ctx.strokeStyle = gridLine
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1

  // Vertical grid lines at octave boundaries (100, 200, 400, 800, 1600 Hz)
  const frequencies = [100, 200, 400, 800, 1600]
  frequencies.forEach((freq) => {
    if (freq <= 2000) {
      const ratio = Math.log(freq / 100) / Math.log(20)
      const xPos = ratio * width
      ctx!.beginPath()
      ctx!.moveTo(xPos, 0)
      ctx!.lineTo(xPos, height)
      ctx!.stroke()
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

  ctx.globalAlpha = 1

  // Draw crosshair + accent puck if position provided
  if (x !== undefined && y !== undefined) {
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 2

    // Horizontal + vertical crosshair lines through the puck position
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Accent puck at the intersection
    ctx.save()
    ctx.shadowColor = accent
    ctx.shadowBlur = 14
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 3
    ctx.strokeStyle = bg
    ctx.stroke()
    ctx.restore()
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

// PlayButton affordance — reuses the same start/stop path as the keyboard
// interaction (last known kbX/kbY position). Pointer-drag and arrow-key
// interaction below are unchanged.
function togglePlay() {
  if (isPlaying.value) {
    stopPlaying()
  }
  else {
    startPlaying(kbX.value, kbY.value)
  }
}

function onWaveformSelect(wave: string) {
  waveType.value = wave as typeof waveType.value
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

  // Canvas colors are read from --ewa-* tokens at draw time, but drawGrid()
  // only runs on pointer/keyboard events — nothing repaints when the user
  // flips light/dark theme while idle. Watch <html class> and replay the
  // last frame so the pad doesn't get stuck showing the previous theme.
  themeObserver = new MutationObserver(() => drawGrid(lastDrawX, lastDrawY))
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleMouseUp)
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <DemoFrame
    class="xy-pad-demo"
    :error="error"
    takeaway="Expressive continuous control, theremin-style. X = frequency, Y = gain."
  >
    <VolumeWarning>
      <strong>Volume warning.</strong> Oscillators can be loud — start with low system volume.
    </VolumeWarning>

    <div class="xy-pad-layout">
      <div class="pad-col">
        <canvas
          ref="canvas"
          class="xy-canvas"
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
        <KeyboardHintChip>
          <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> move the point
        </KeyboardHintChip>
      </div>

      <div class="side-col">
        <PlayButton :playing="isPlaying" label="Play" playing-label="Stop" @click="togglePlay" />

        <div class="readouts">
          <SegmentDisplay :value="`${currentFreq.toFixed(0)} Hz`" caption="frequency" />
          <SegmentDisplay :value="`${(currentGain * 100).toFixed(0)} %`" caption="gain" />
          <SegmentDisplay :value="currentNote" caption="note" />
        </div>

        <WaveformSelector
          :model-value="waveType"
          small
          :disabled="isPlaying"
          @update:model-value="onWaveformSelect"
        />
      </div>
    </div>
  </DemoFrame>
</template>

<style scoped>
.xy-pad-layout {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.pad-col {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.xy-canvas {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  display: block;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  border-radius: 10px;
  cursor: crosshair;
  touch-action: none;
}

.xy-canvas:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.side-col {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 150px;
}

.readouts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.readouts :deep(.ewa-segment) {
  width: 100%;
}
</style>

<template>
  <div class="piano-keyboard">
    <div class="keyboard-hint">
      Use keys A-K to play (W, E, T, Y, U for sharps)
    </div>
    <div class="keys-container">
      <div
        v-for="key in keys"
        :key="key.note"
        :class="['key', key.type, { active: activeKeys?.has(key.note) }]"
        :style="key.style"
        @mousedown="handleMouseDown(key.note)"
        @mouseup="handleMouseUp(key.note)"
        @mouseleave="handleMouseLeave(key.note)"
        @mouseenter="handleMouseEnter(key.note)"
        @touchstart.prevent="handleTouchStart($event, key.note)"
        @touchend.prevent="handleTouchEnd(key.note)"
      >
        <span class="key-label">{{ key.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  startNote?: string
  endNote?: string
  activeKeys?: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  startNote: 'C4',
  endNote: 'C5'
})

const emit = defineEmits<{
  noteOn: [note: string]
  noteOff: [note: string]
}>()

// Keyboard mapping for computer keyboard input
const keyboardMap: Record<string, string> = {
  'a': 'C4',
  'w': 'Db4',
  's': 'D4',
  'e': 'Eb4',
  'd': 'E4',
  'f': 'F4',
  't': 'Gb4',
  'g': 'G4',
  'y': 'Ab4',
  'h': 'A4',
  'u': 'Bb4',
  'j': 'B4',
  'k': 'C5'
}

// Track which keys are currently pressed to prevent key repeat
const pressedKeys = ref(new Set<string>())
const mouseDown = ref(false)

// Generate all notes from C4 to C5
const allNotes = [
  { note: 'C4', type: 'white', label: 'C' },
  { note: 'Db4', type: 'black', label: 'C#' },
  { note: 'D4', type: 'white', label: 'D' },
  { note: 'Eb4', type: 'black', label: 'D#' },
  { note: 'E4', type: 'white', label: 'E' },
  { note: 'F4', type: 'white', label: 'F' },
  { note: 'Gb4', type: 'black', label: 'F#' },
  { note: 'G4', type: 'white', label: 'G' },
  { note: 'Ab4', type: 'black', label: 'G#' },
  { note: 'A4', type: 'white', label: 'A' },
  { note: 'Bb4', type: 'black', label: 'A#' },
  { note: 'B4', type: 'white', label: 'B' },
  { note: 'C5', type: 'white', label: 'C' }
]

// Calculate white key positions for black key positioning
const keys = computed(() => {
  let whiteKeyIndex = 0
  const whiteKeyWidth = 40

  return allNotes.map((noteData) => {
    if (noteData.type === 'white') {
      const style = {
        left: `${whiteKeyIndex * whiteKeyWidth}px`
      }
      whiteKeyIndex++
      return { ...noteData, style }
    } else {
      // Black keys are positioned between white keys
      const style = {
        left: `${whiteKeyIndex * whiteKeyWidth - 14}px`
      }
      return { ...noteData, style }
    }
  })
})

function handleMouseDown(note: string) {
  mouseDown.value = true
  emit('noteOn', note)
}

function handleMouseUp(note: string) {
  mouseDown.value = false
  emit('noteOff', note)
}

function handleMouseLeave(note: string) {
  if (mouseDown.value) {
    emit('noteOff', note)
  }
}

function handleMouseEnter(note: string) {
  if (mouseDown.value) {
    emit('noteOn', note)
  }
}

function handleTouchStart(event: TouchEvent, note: string) {
  emit('noteOn', note)
}

function handleTouchEnd(note: string) {
  emit('noteOff', note)
}

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const note = keyboardMap[key]

  if (note && !pressedKeys.value.has(key)) {
    pressedKeys.value.add(key)
    emit('noteOn', note)
  }
}

function handleKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const note = keyboardMap[key]

  if (note && pressedKeys.value.has(key)) {
    pressedKeys.value.delete(key)
    emit('noteOff', note)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.piano-keyboard {
  user-select: none;
}

.keyboard-hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
  text-align: center;
}

.keys-container {
  position: relative;
  height: 150px;
  width: 320px;
  margin: 0 auto;
}

.key {
  position: absolute;
  cursor: pointer;
  transition: all 0.05s;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  box-sizing: border-box;
  border: 1px solid var(--vp-c-divider);
}

.key.white {
  width: 40px;
  height: 150px;
  background: var(--vp-c-bg);
  z-index: 1;
  border-radius: 0 0 4px 4px;
}

.key.white:hover {
  background: var(--vp-c-bg-soft);
}

.key.white.active {
  background: var(--vp-c-brand-light);
  transform: translateY(2px);
}

.key.black {
  width: 28px;
  height: 95px;
  background: var(--vp-c-text-1);
  z-index: 2;
  border-radius: 0 0 3px 3px;
}

.key.black .key-label {
  color: var(--vp-c-bg);
}

.key.black:hover {
  background: var(--vp-c-text-2);
}

.key.black.active {
  background: var(--vp-c-brand);
  transform: translateY(2px);
}

.key-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
</style>

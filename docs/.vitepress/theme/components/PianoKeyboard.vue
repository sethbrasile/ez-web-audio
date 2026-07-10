<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import KeyboardHintChip from './kit/KeyboardHintChip.vue'

interface Props {
  activeKeys?: Set<string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  noteOn: [note: string]
  noteOff: [note: string]
}>()

// Keyboard mapping for computer keyboard input
// Displayed as a visual map in the hint section (L25)
const keyboardMap: Record<string, string> = {
  a: 'C4',
  w: 'Db4',
  s: 'D4',
  e: 'Eb4',
  d: 'E4',
  f: 'F4',
  t: 'Gb4',
  g: 'G4',
  y: 'Ab4',
  h: 'A4',
  u: 'Bb4',
  j: 'B4',
  k: 'C5',
}

// Track which keys are currently pressed to prevent key repeat
const pressedKeys = ref(new Set<string>())
const mouseDown = ref(false)

// Multi-touch: track each active touch by identifier (M1)
const activeTouches = ref(new Map<number, string>())

// Roving tabindex: track which key currently owns tabindex=0 (M7)
const focusedKeyIndex = ref(0)

// Generate all notes from C4 to C5, including the high C5 (L7)
// Black key labels use flat notation matching library note names (L6)
const allNotes = [
  { note: 'C4', type: 'white', label: 'C', shortcut: 'A' },
  { note: 'Db4', type: 'black', label: 'D♭', shortcut: 'W' },
  { note: 'D4', type: 'white', label: 'D', shortcut: 'S' },
  { note: 'Eb4', type: 'black', label: 'E♭', shortcut: 'E' },
  { note: 'E4', type: 'white', label: 'E', shortcut: 'D' },
  { note: 'F4', type: 'white', label: 'F', shortcut: 'F' },
  { note: 'Gb4', type: 'black', label: 'G♭', shortcut: 'T' },
  { note: 'G4', type: 'white', label: 'G', shortcut: 'G' },
  { note: 'Ab4', type: 'black', label: 'A♭', shortcut: 'Y' },
  { note: 'A4', type: 'white', label: 'A', shortcut: 'H' },
  { note: 'Bb4', type: 'black', label: 'B♭', shortcut: 'U' },
  { note: 'B4', type: 'white', label: 'B', shortcut: 'J' },
  { note: 'C5', type: 'white', label: 'C5', shortcut: 'K' },
]

// Calculate white key positions for black key positioning
const keys = computed(() => {
  let whiteKeyIndex = 0
  const whiteKeyWidth = 40

  return allNotes.map((noteData) => {
    if (noteData.type === 'white') {
      const style = {
        left: `${whiteKeyIndex * whiteKeyWidth}px`,
      }
      whiteKeyIndex++
      return { ...noteData, style }
    }
    else {
      // Black keys are positioned between white keys
      const style = {
        left: `${whiteKeyIndex * whiteKeyWidth - 14}px`,
      }
      return { ...noteData, style }
    }
  })
})

// Helper: return true when focus is inside an input/textarea so we don't
// fire notes while the user is typing in VitePress search or other fields (H13)
function isInputFocused(): boolean {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || (el instanceof HTMLElement && el.isContentEditable)
  )
}

// --- Mouse handlers ---

// Track the last key the mouse entered (used by L26 global mouseup handler)
const lastMouseNote = ref<string | null>(null)

function handleMouseDown(note: string) {
  mouseDown.value = true
  emit('noteOn', note)
}

// L26: global mouseup catches release when cursor has drifted off a key
function handleGlobalMouseUp() {
  if (mouseDown.value) {
    mouseDown.value = false
    // Emit noteOff for the note the mouse was last over. This covers the edge
    // case where the user drags off the keyboard while holding a note and
    // releases the button outside the component.
    if (lastMouseNote.value) {
      emit('noteOff', lastMouseNote.value)
      lastMouseNote.value = null
    }
  }
}

function handleMouseLeave(note: string) {
  if (mouseDown.value) {
    emit('noteOff', note)
    lastMouseNote.value = null
  }
}

function handleMouseEnter(note: string) {
  if (mouseDown.value) {
    lastMouseNote.value = note
    emit('noteOn', note)
  }
}

function handleMouseUp(note: string) {
  if (mouseDown.value) {
    mouseDown.value = false
    lastMouseNote.value = null
    emit('noteOff', note)
  }
}

// --- Touch handlers (multi-touch, M1) ---

function handleTouchStart(event: TouchEvent) {
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i]
    const note = noteFromPoint(touch.clientX, touch.clientY)
    if (note) {
      activeTouches.value.set(touch.identifier, note)
      emit('noteOn', note)
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i]
    const newNote = noteFromPoint(touch.clientX, touch.clientY)
    const prevNote = activeTouches.value.get(touch.identifier) ?? null

    if (newNote !== prevNote) {
      if (prevNote) {
        emit('noteOff', prevNote)
      }
      if (newNote) {
        activeTouches.value.set(touch.identifier, newNote)
        emit('noteOn', newNote)
      }
      else {
        activeTouches.value.delete(touch.identifier)
      }
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i]
    const note = activeTouches.value.get(touch.identifier)
    if (note) {
      emit('noteOff', note)
      activeTouches.value.delete(touch.identifier)
    }
  }
}

function noteFromPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  if (!el)
    return null
  const keyEl = el.closest('.key') as HTMLElement | null
  if (!keyEl)
    return null
  const ariaLabel = keyEl.getAttribute('aria-label') || ''
  const noteMatch = ariaLabel.match(/Play (.+)/)
  return noteMatch ? noteMatch[1] : null
}

// --- Keyboard-element handlers (M8: Space/Enter activate keys) ---

// Template ref for the keys container (used by roving tabindex focus helper)
const keysContainerRef = ref<HTMLElement | null>(null)

// Focus a key element by its index in allNotes (M7)
function focusKeyByIndex(index: number) {
  if (!keysContainerRef.value)
    return
  const keyEls = keysContainerRef.value.querySelectorAll<HTMLElement>('.key')
  keyEls[index]?.focus()
}

function handleKeyElementKeydown(event: KeyboardEvent, note: string, index: number) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    if (!pressedKeys.value.has(`__elem_${note}`)) {
      pressedKeys.value.add(`__elem_${note}`)
      emit('noteOn', note)
    }
  }
  // Roving tabindex: arrow key navigation (M7)
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusedKeyIndex.value = (index + 1) % allNotes.length
    focusKeyByIndex(focusedKeyIndex.value)
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusedKeyIndex.value = (index - 1 + allNotes.length) % allNotes.length
    focusKeyByIndex(focusedKeyIndex.value)
  }
}

function handleKeyElementKeyup(event: KeyboardEvent, note: string) {
  if (event.key === ' ' || event.key === 'Enter') {
    pressedKeys.value.delete(`__elem_${note}`)
    emit('noteOff', note)
  }
}

// --- Global window keyboard handlers ---

function handleKeyDown(event: KeyboardEvent) {
  if (isInputFocused())
    return
  const key = event.key.toLowerCase()
  const note = keyboardMap[key]

  if (note && !pressedKeys.value.has(key)) {
    pressedKeys.value.add(key)
    emit('noteOn', note)
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (isInputFocused())
    return
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
  window.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
})
</script>

<template>
  <div class="piano-keyboard">
    <!-- Keys (M7: roving tabindex — only focused key is tab-reachable; arrows navigate) -->
    <div
      ref="keysContainerRef"
      class="keys-container"
      aria-label="Piano keyboard"
      role="group"
      aria-describedby="keyboard-shortcut-hint"
    >
      <div
        v-for="(key, index) in keys"
        :key="key.note"
        class="key" :class="[key.type, { active: activeKeys?.has(key.note) }]"
        :style="key.style"
        role="button"
        :aria-label="`Play ${key.note}`"
        :aria-pressed="activeKeys?.has(key.note)"
        :tabindex="index === focusedKeyIndex ? 0 : -1"
        @mousedown.prevent="handleMouseDown(key.note)"
        @mouseup="handleMouseUp(key.note)"
        @mouseleave="handleMouseLeave(key.note)"
        @mouseenter="handleMouseEnter(key.note)"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="handleTouchEnd"
        @keydown="handleKeyElementKeydown($event, key.note, index)"
        @keyup="handleKeyElementKeyup($event, key.note)"
        @focus="focusedKeyIndex = index"
      >
        <span class="key-label">{{ key.shortcut }}</span>
      </div>
    </div>

    <!-- Keyboard shortcut hint chip (below keys, mirrors the shortcut letters printed on the keys) -->
    <div
      id="keyboard-shortcut-hint"
      class="keyboard-hint"
      role="note"
      aria-label="Keyboard shortcuts: Use keys A through K to play notes. W, E, T, Y, U for flats."
    >
      <KeyboardHintChip>
        <kbd>A</kbd>–<kbd>K</kbd> trigger notes · black keys <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd>
      </KeyboardHintChip>
    </div>
  </div>
</template>

<style scoped>
.piano-keyboard {
  user-select: none;
}

.keyboard-hint {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.keys-container {
  position: relative;
  height: 150px;
  width: 320px; /* 8 white keys × 40px (C4-C5 inclusive = 8 white keys) */
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
  border: 1px solid var(--ewa-line-2);
}

.key:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: -2px;
  z-index: 3;
}

.key.white {
  width: 40px;
  height: 150px;
  background: var(--ewa-bg);
  z-index: 1;
  border-radius: 0 0 5px 5px;
  min-width: 40px;
  touch-action: none;
}

.key.white:hover {
  background: var(--ewa-panel);
}

.key.white.active {
  background: var(--ewa-accent-soft);
  transform: translateY(2px);
}

.key.black {
  width: 28px;
  height: 95px;
  background: var(--ewa-text);
  z-index: 2;
  border-radius: 0 0 4px 4px;
  min-width: 28px;
  touch-action: none;
}

.key.black .key-label {
  color: var(--ewa-bg);
  font-size: 9px;
}

.key.black:hover {
  filter: brightness(0.92);
}

.key.black.active {
  background: var(--ewa-accent);
  transform: translateY(2px);
}

.key.black.active .key-label {
  color: var(--ewa-on-accent);
}

.key-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--ewa-text-3);
}
</style>

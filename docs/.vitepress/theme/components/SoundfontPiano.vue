<template>
  <div class="soundfont-piano">
    <div v-if="error" class="error">{{ error }}</div>

    <div class="piano-container">
      <div class="current-note">
        {{ loading ? loadProgress : (currentNote || 'Click a key to play') }}
      </div>

      <PianoKeyboard
        :activeKeys="activeNotes"
        @noteOn="playNote"
        @noteOff="stopNote"
      />

      <div class="info-text">
        Compare with <a href="/ez-web-audio/examples/synth-keyboard">Synth Keyboard</a> which uses oscillators instead of samples
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import PianoKeyboard from './PianoKeyboard.vue'

const loading = ref(false)
const initialized = ref(false)
const error = ref('')
const activeNotes = ref(new Set<string>())
const currentNote = ref('')
const loadProgress = ref('')

let font: any = null
let lib: any = null

async function initFont() {
  if (initialized.value) return

  try {
    loading.value = true
    loadProgress.value = 'Loading piano soundfont (1.4MB)...'
    error.value = ''

    // Dynamic import for SSR compatibility
    lib = await import('ez-web-audio')
    await lib.initAudio()

    // Load the piano soundfont
    font = await lib.createFont('/ez-web-audio/audio/piano.js')

    initialized.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load piano soundfont'
  } finally {
    loading.value = false
  }
}

async function playNote(note: string) {
  // Initialize on first interaction
  if (!initialized.value) {
    await initFont()
    if (!initialized.value) return
  }

  try {
    // Font.play() expects note identifier string (e.g., 'C4', 'Db4')
    // PianoKeyboard emits note names using flat notation (Db, Eb, Gb, Ab, Bb)
    // which matches the library's frequencyMap structure
    font.play(note)

    // Update visual state
    activeNotes.value.add(note)
    currentNote.value = note
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play note'
  }
}

function stopNote(note: string) {
  // For sampled notes, they naturally decay - no explicit stop needed
  // But we update activeNotes set for visual feedback
  activeNotes.value.delete(note)

  // Clear current note display if this was the last note
  if (activeNotes.value.size === 0) {
    currentNote.value = ''
  }
}

onUnmounted(() => {
  // Cleanup
  try {
    if (font) {
      // Font doesn't have a global stop method, individual notes decay naturally
      font = null
    }
  } catch (e) {
    // Ignore cleanup errors
  }
})
</script>

<style scoped>
.soundfont-piano {
  padding: 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.error {
  color: var(--vp-c-danger);
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: var(--vp-c-danger-soft);
  border-radius: 4px;
}

.piano-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.current-note {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-brand);
  min-height: 2rem;
  display: flex;
  align-items: center;
}

.info-text {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.info-text a {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}
</style>

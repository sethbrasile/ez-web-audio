<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import PianoKeyboard from './PianoKeyboard.vue'

const initialized = ref(false)
const loading = ref(false)
const error = ref('')
const activeNotes = ref(new Set<string>())

let font: any = null
let lib: any = null

async function initFont() {
  if (initialized.value)
    return

  loading.value = true
  try {
    error.value = ''

    // Dynamic import for SSR compatibility
    lib = await import('ez-web-audio')

    // Load the piano soundfont
    font = await lib.createFont('/ez-web-audio/audio/piano.js')

    initialized.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load piano soundfont'
  }
  finally {
    loading.value = false
  }
}

async function playNote(note: string) {
  // Initialize on first interaction
  if (!initialized.value) {
    await initFont()
    if (!initialized.value)
      return
  }

  try {
    // Font.play() expects note identifier string (e.g., 'C4', 'Db4')
    // PianoKeyboard emits note names using flat notation (Db, Eb, Gb, Ab, Bb)
    // which matches the library's frequencyMap structure
    font.play(note)

    activeNotes.value.add(note)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play note'
  }
}

function stopNote(note: string) {
  // For sampled notes, they naturally decay - no explicit stop needed
  // But we update activeNotes set for visual feedback
  activeNotes.value.delete(note)
}

onUnmounted(() => {
  // Cleanup
  try {
    if (font) {
      // Font doesn't have a global stop method, individual notes decay naturally
      font = null
    }
  }
  catch (e) {
    // Ignore cleanup errors
  }
})
</script>

<template>
  <div class="soundfont-piano">
    <div class="piano-container">
      <PianoKeyboard
        :active-keys="activeNotes"
        :disabled="loading"
        @note-on="playNote"
        @note-off="stopNote"
      />

      <div class="info-text">
        Compare with <a href="/ez-web-audio/examples/synth-keyboard">Synth Keyboard</a> which uses oscillators instead of samples
      </div>
    </div>

    <div class="status-bar">
      <div v-if="loading" class="loading">
        Loading piano soundfont...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.soundfont-piano {
  padding: 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.loading {
  padding: 0.5rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.error {
  color: var(--vp-c-danger);
  padding: 0.5rem;
  background: var(--vp-c-danger-soft);
  border-radius: 4px;
}

.piano-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
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

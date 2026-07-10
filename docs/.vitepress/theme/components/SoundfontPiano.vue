<script setup lang="ts">
import { useFont } from '@ez-web-audio/vue'
import { onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import PianoKeyboard from './PianoKeyboard.vue'

const initialized = ref(false)
const loading = ref(false)
const error = ref('')
const activeNotes = ref(new Set<string>())

const { instance: font, load: loadFont } = useFont()

async function initFont() {
  if (initialized.value)
    return

  loading.value = true
  try {
    error.value = ''

    // Load the piano soundfont
    await loadFont('/ez-web-audio/audio/piano.js')

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
    font.value?.play(note)

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
    if (font.value) {
      // Stop any currently playing notes before disposing
      for (const note of font.value.notes) {
        if (note.isPlaying) {
          try {
            note.stop()
          }
          catch {}
        }
      }
    }
    activeNotes.value.clear()
  }
  catch (e) {
    // Ignore cleanup errors
  }
})
</script>

<template>
  <DemoFrame class="soundfont-piano" :error="error" takeaway="Real instrument sounds from a soundfont file.">
    <div class="piano-container">
      <div v-if="loading" class="loading-shimmer">
        <div class="ewa-shimmer-bar" aria-hidden="true" />
        <p class="loading-text">
          Loading soundfont (1.4 MB)…
        </p>
      </div>

      <PianoKeyboard
        :active-keys="activeNotes"
        :disabled="loading"
        @note-on="playNote"
        @note-off="stopNote"
      />

      <p class="info-text">
        Compare with <a href="/ez-web-audio/examples/synth-keyboard">Synth Keyboard</a> which uses oscillators instead of samples
      </p>
    </div>
  </DemoFrame>
</template>

<style scoped>
.piano-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-shimmer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ewa-shimmer-bar {
  width: 100%;
  max-width: 480px;
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--ewa-well) 25%, var(--ewa-panel) 50%, var(--ewa-well) 75%);
  background-size: 200% 100%;
  animation: ewa-shimmer 1.2s linear infinite;
}

@keyframes ewa-shimmer {
  to {
    background-position: -200% 0;
  }
}

.loading-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ewa-text-2);
}

.info-text {
  text-align: center;
  color: var(--ewa-text-2);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.info-text a {
  color: var(--ewa-accent);
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}
</style>

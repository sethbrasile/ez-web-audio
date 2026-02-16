<template>
  <div class="audio-demo">
    <div class="controls">
      <button @click="play" :disabled="loading" class="play-btn">
        {{ loading ? 'Loading...' : 'Play Sound' }}
      </button>
      <div class="sliders">
        <label for="audio-volume">
          Volume: {{ Math.round(gain * 100) }}%
          <input
            id="audio-volume"
            type="range"
            v-model.number="gain"
            min="0"
            max="1"
            step="0.1"
            :aria-label="`Volume: ${Math.round(gain * 100)}%`"
          />
        </label>
        <label for="audio-pan">
          Pan: {{ pan < 0 ? 'L' : pan > 0 ? 'R' : 'C' }} {{ Math.abs(Math.round(pan * 100)) }}
          <input
            id="audio-pan"
            type="range"
            v-model.number="pan"
            min="-1"
            max="1"
            step="0.1"
            :aria-label="`Pan: ${pan < 0 ? 'Left' : pan > 0 ? 'Right' : 'Center'} ${Math.abs(Math.round(pan * 100))}`"
          />
        </label>
      </div>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  url?: string
}>()

const loading = ref(false)
const error = ref('')
const gain = ref(1)
const pan = ref(0)

let sound: any = null
let lib: any = null

async function ensureInit() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
  if (!sound) {
    const audioUrl = props.url || '/ez-web-audio/audio/click.mp3'
    sound = await lib.createSound(audioUrl)
  }
}

async function play() {
  if (loading.value) return

  try {
    error.value = ''
    loading.value = true

    await ensureInit()
    sound.changeGainTo(gain.value)
    sound.changePanTo(pan.value)
    sound.play()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  } finally {
    loading.value = false
  }
}

watch(gain, (val) => {
  if (sound) sound.changeGainTo(val)
})

watch(pan, (val) => {
  if (sound) sound.changePanTo(val)
})

onUnmounted(() => {
  if (sound) {
    try { sound.stop() } catch {}
  }
})
</script>

<style scoped>
.audio-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.play-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.play-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.play-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sliders label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.sliders input[type="range"] {
  width: 120px;
}

.error {
  color: var(--vp-c-danger);
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>

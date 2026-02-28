<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const status = ref('Click Init to start')

const soundPlaying = ref([false, false, false])

const soundLabels = ['Kick', 'Snare', 'Hi-Hat']
const soundUrls = [
  '/ez-web-audio/audio/drum-samples/kick1.wav',
  '/ez-web-audio/audio/drum-samples/snare1.wav',
  '/ez-web-audio/audio/drum-samples/hihat1.wav',
]

let sounds: any[] = []
let lib: any = null

async function initialize() {
  if (loaded.value || loading.value)
    return

  try {
    loading.value = true
    error.value = ''
    status.value = 'Loading sounds...'

    if (!lib) {
      lib = await import('ez-web-audio')
    }

    await lib.initAudio()

    sounds = await Promise.all(
      soundUrls.map(url => lib.createSound(url)),
    )

    loaded.value = true
    status.value = 'Ready'
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load sounds'
    status.value = 'Click Init to start'
  }
  finally {
    loading.value = false
  }
}

async function playTogether() {
  if (!lib || sounds.length === 0)
    return

  try {
    error.value = ''
    status.value = 'Playing...'
    soundPlaying.value = [true, true, true]

    await lib.playTogether(sounds)

    setTimeout(() => {
      soundPlaying.value = [false, false, false]
      status.value = 'Ready'
    }, 1200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    status.value = 'Ready'
  }
}

async function playSequentially() {
  if (!lib || sounds.length === 0)
    return

  try {
    error.value = ''
    status.value = 'Playing sequentially...'

    for (let i = 0; i < sounds.length; i++) {
      soundPlaying.value[i] = true
      await sounds[i].play()
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    setTimeout(() => {
      soundPlaying.value = [false, false, false]
      status.value = 'Ready'
    }, 1200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    soundPlaying.value = [false, false, false]
    status.value = 'Ready'
  }
}

async function playSound(index: number) {
  if (!sounds[index])
    return

  try {
    error.value = ''
    soundPlaying.value[index] = true
    await sounds[index].play()

    setTimeout(() => {
      soundPlaying.value[index] = false
    }, 800)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    soundPlaying.value[index] = false
  }
}

onUnmounted(() => {
  sounds.forEach((s) => {
    try { s.stop?.() }
    catch {}
  })
})
</script>

<template>
  <div class="play-together-demo">
    <div v-if="!loaded" class="init-section">
      <button :disabled="loading" class="init-btn" @click="initialize">
        {{ loading ? 'Loading sounds...' : 'Init Audio' }}
      </button>
      <p class="hint">
        Loads kick, snare, and hi-hat for synchronized playback comparison
      </p>
    </div>

    <div v-else class="controls">
      <div class="main-controls">
        <button class="together-btn" @click="playTogether">
          Play Together
        </button>
        <button class="sequential-btn" @click="playSequentially">
          Play Sequentially
        </button>
      </div>

      <div class="sounds">
        <div
          v-for="(label, i) in soundLabels"
          :key="label"
          class="sound-row"
          :class="{ playing: soundPlaying[i] }"
        >
          <button class="sound-btn" @click="playSound(i)">
            {{ label }}
          </button>
          <div class="sound-indicator">
            {{ soundPlaying[i] ? 'Playing' : 'Ready' }}
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-text">
        {{ status }}
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.play-together-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.init-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.sounds {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sound-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: border-color 0.2s;
}

.sound-row.playing {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.sound-indicator {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  min-width: 60px;
}

.sound-row.playing .sound-indicator {
  color: var(--vp-c-brand);
  font-weight: 600;
}

.init-btn,
.together-btn,
.sequential-btn,
.sound-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.init-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-size: 1rem;
  padding: 0.75rem 2rem;
}

.init-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.init-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.together-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-weight: 600;
}

.together-btn:hover {
  background: var(--vp-c-brand-dark);
}

.sequential-btn:hover,
.sound-btn:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.status-text {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}
</style>

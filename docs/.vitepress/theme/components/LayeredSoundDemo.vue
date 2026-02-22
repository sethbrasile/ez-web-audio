<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const isPlaying = ref(false)

const masterGain = ref(0.8)
const layerGains = ref([1.0, 0.8, 0.7])
const layerPlaying = ref([false, false, false])

const layerLabels = ['Kick', 'Snare', 'Hi-Hat']
const layerUrls = [
  '/ez-web-audio/audio/drum-samples/kick1.wav',
  '/ez-web-audio/audio/drum-samples/snare1.wav',
  '/ez-web-audio/audio/drum-samples/hihat1.wav',
]

let layered: any = null
let sounds: any[] = []
let lib: any = null

async function initialize() {
  if (loaded.value || loading.value)
    return

  try {
    loading.value = true
    error.value = ''

    if (!lib) {
      lib = await import('ez-web-audio')
    }

    // Load each sound individually
    sounds = await Promise.all(
      layerUrls.map(url => lib.createSound(url)),
    )

    // Create layered sound from all three
    layered = await lib.createLayeredSound(sounds)

    loaded.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load sounds'
  }
  finally {
    loading.value = false
  }
}

async function playAll() {
  if (!layered)
    return

  try {
    error.value = ''
    layered.setGain(masterGain.value)
    await layered.play()
    isPlaying.value = true
    layerPlaying.value = [true, true, true]

    // Sounds are one-shot, so mark as not playing after a moment
    setTimeout(() => {
      isPlaying.value = false
      layerPlaying.value = [false, false, false]
    }, 1500)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function stopAll() {
  if (!layered)
    return

  try {
    await layered.stop()
  }
  catch {}
  isPlaying.value = false
  layerPlaying.value = [false, false, false]
}

async function playLayer(index: number) {
  if (!sounds[index])
    return

  try {
    sounds[index].changeGainTo(layerGains.value[index])
    await sounds[index].play()
    layerPlaying.value[index] = true

    setTimeout(() => {
      layerPlaying.value[index] = false
    }, 1000)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Layer playback error'
  }
}

function updateMasterGain(val: number) {
  masterGain.value = val
  if (layered) {
    layered.setGain(val)
  }
}

function updateLayerGain(index: number, val: number) {
  layerGains.value[index] = val
  if (sounds[index]) {
    sounds[index].changeGainTo(val)
  }
}

onUnmounted(() => {
  if (layered) {
    try { layered.stop() }
    catch {}
  }
})
</script>

<template>
  <div class="layered-demo">
    <div v-if="!loaded" class="init-section">
      <button :disabled="loading" class="init-btn" @click="initialize">
        {{ loading ? 'Loading sounds...' : 'Load Layered Sounds' }}
      </button>
      <p class="hint">
        Loads kick, snare, and hi-hat samples as synchronized layers
      </p>
    </div>

    <div v-else class="controls">
      <div class="master-controls">
        <button
          class="play-all-btn"
          :disabled="loading"
          @click="playAll"
        >
          Play All Together
        </button>
        <button class="stop-btn" @click="stopAll">
          Stop
        </button>
        <label class="gain-label">
          Master: {{ Math.round(masterGain * 100) }}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="masterGain"
            :aria-label="`Master gain: ${Math.round(masterGain * 100)}%`"
            @input="updateMasterGain(+($event.target as HTMLInputElement).value)"
          >
        </label>
      </div>

      <div class="layers">
        <div
          v-for="(label, i) in layerLabels"
          :key="label"
          class="layer-row"
          :class="{ playing: layerPlaying[i] }"
        >
          <button class="layer-btn" @click="playLayer(i)">
            {{ label }}
          </button>
          <div class="layer-indicator">
            {{ layerPlaying[i] ? 'Playing' : 'Ready' }}
          </div>
          <label class="gain-label">
            {{ Math.round(layerGains[i] * 100) }}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="layerGains[i]"
              :aria-label="`${label} gain: ${Math.round(layerGains[i] * 100)}%`"
              @input="updateLayerGain(i, +($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="isPlaying" class="playing-indicator">
        All layers playing in sync
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.layered-demo {
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

.master-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.gain-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.gain-label input[type="range"] {
  width: 100px;
}

.layers {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  flex-wrap: wrap;
  transition: border-color 0.2s;
}

.layer-row.playing {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.layer-indicator {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  min-width: 60px;
}

.layer-row.playing .layer-indicator {
  color: var(--vp-c-brand);
  font-weight: 600;
}

.init-btn,
.play-all-btn,
.stop-btn,
.layer-btn {
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

.play-all-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-weight: 600;
}

.play-all-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.play-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stop-btn:hover,
.layer-btn:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.playing-indicator {
  font-size: 0.85rem;
  color: var(--vp-c-brand);
  font-weight: 500;
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}
</style>

<script setup lang="ts">
import type { Sound } from 'ez-web-audio'
import { useCleanup, useEnsureLoaded, useLayeredSound } from '@ez-web-audio/vue'
import { createSound } from 'ez-web-audio'
import { computed, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import TriggerPad from './kit/TriggerPad.vue'

const isPlaying = ref(false)

const masterGain = ref(0.8)
const layerGains = ref([1.0, 0.8, 0.7])
const layerPlaying = ref([false, false, false])

const layerLabels = ['Kick', 'Snare', 'Hi-Hat']
const layerColors = ['var(--ewa-kick)', 'var(--ewa-snare)', 'var(--ewa-hat)']
const layerUrls = [
  '/ez-web-audio/audio/drum-samples/kick1.wav',
  '/ez-web-audio/audio/drum-samples/snare1.wav',
  '/ez-web-audio/audio/drum-samples/hihat1.wav',
]

const cleanup = useCleanup()
const { instance: layered, load: loadLayered } = useLayeredSound()
let sounds: Sound[] = []

// UI-reset timeouts, captured so onUnmounted can clear them (they only
// touch reactive refs, but a fired one after unmount is still wasted work).
let allPlayingTimeout: ReturnType<typeof setTimeout> | null = null
const layerPlayingTimeouts: Array<ReturnType<typeof setTimeout> | null> = [null, null, null]

const { loading, error, ensureLoaded } = useEnsureLoaded(async () => {
  // Load each sound individually
  sounds = (await Promise.all(
    layerUrls.map(url => createSound(url)),
  )).map(s => cleanup.register(s))

  // Create layered sound from all three
  cleanup.register(await loadLayered(sounds))
}, 'Failed to load sounds')

const statusText = computed(() => {
  if (loading.value)
    return 'Loading sounds...'
  if (isPlaying.value)
    return 'All layers playing in sync'
  return 'Ready'
})

function formatPercent(v: number) {
  return `${Math.round(v * 100)}%`
}

async function playAll() {
  if (!(await ensureLoaded()))
    return

  try {
    error.value = ''
    layered.value!.setGain(masterGain.value)
    await layered.value!.play()
    isPlaying.value = true
    layerPlaying.value = [true, true, true]

    // Sounds are one-shot, so mark as not playing after a moment
    if (allPlayingTimeout)
      clearTimeout(allPlayingTimeout)
    allPlayingTimeout = setTimeout(() => {
      isPlaying.value = false
      layerPlaying.value = [false, false, false]
      allPlayingTimeout = null
    }, 1500)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function stopAll() {
  if (!layered.value)
    return

  try {
    await layered.value.stop()
  }
  catch {}
  isPlaying.value = false
  layerPlaying.value = [false, false, false]
}

async function playLayer(index: number) {
  if (!(await ensureLoaded()))
    return
  if (!sounds[index])
    return

  try {
    sounds[index].changeGainTo(layerGains.value[index])
    await sounds[index].play()
    layerPlaying.value[index] = true

    const existing = layerPlayingTimeouts[index]
    if (existing)
      clearTimeout(existing)
    layerPlayingTimeouts[index] = setTimeout(() => {
      layerPlaying.value[index] = false
      layerPlayingTimeouts[index] = null
    }, 1000)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Layer playback error'
  }
}

function updateMasterGain(val: number) {
  masterGain.value = val
  if (layered.value) {
    layered.value.setGain(val)
  }
}

function updateLayerGain(index: number, val: number) {
  layerGains.value[index] = val
  if (sounds[index]) {
    sounds[index].changeGainTo(val)
  }
}

onUnmounted(() => {
  if (allPlayingTimeout)
    clearTimeout(allPlayingTimeout)
  layerPlayingTimeouts.forEach((t) => {
    if (t)
      clearTimeout(t)
  })
})
</script>

<template>
  <DemoFrame class="layered-demo" :error="error" takeaway="Stacked sounds, one play call.">
    <div class="controls">
      <div class="main-controls">
        <PlayButton
          label="Play All Together"
          loading-label="Loading..."
          :loading="loading"
          @click="playAll"
        />
        <button type="button" class="stop-btn" @click="stopAll">
          Stop
        </button>
        <ParameterSlider
          class="master-slider"
          label="Master"
          :model-value="masterGain"
          :min="0"
          :max="1"
          :step="0.05"
          :format="formatPercent"
          @update:model-value="updateMasterGain"
        />
      </div>

      <div class="layers">
        <div
          v-for="(label, i) in layerLabels"
          :key="label"
          class="layer-row"
          :class="{ playing: layerPlaying[i] }"
        >
          <TriggerPad
            :label="label"
            :color="layerColors[i]"
            :disabled="loading"
            :active="layerPlaying[i]"
            @trigger="playLayer(i)"
          />
          <ParameterSlider
            :label="`${label} Gain`"
            :model-value="layerGains[i]"
            :min="0"
            :max="1"
            :step="0.05"
            :format="formatPercent"
            @update:model-value="(v) => updateLayerGain(i, v)"
          />
        </div>
      </div>
    </div>

    <template #status>
      <p class="status-text">
        {{ statusText }}
      </p>
    </template>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.master-slider {
  width: 200px;
}

.stop-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  font-weight: 600;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}

.stop-btn:hover {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.stop-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}

.layers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-bg);
  flex-wrap: wrap;
  transition: border-color 0.2s;
}

.layer-row.playing {
  border-color: var(--ewa-accent);
}

.layer-row > :deep(.ewa-slider) {
  flex: 1;
  min-width: 160px;
}

.status-text {
  font-size: 0.85rem;
  color: var(--ewa-text-2);
  margin: 0;
}

@media (max-width: 480px) {
  .master-slider {
    width: 100%;
  }
}
</style>

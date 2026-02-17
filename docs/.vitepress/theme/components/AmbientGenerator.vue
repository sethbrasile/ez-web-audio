<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const error = ref('')
const loading = ref(false)
const isPlaying = ref(false)

// Master controls
const masterVolume = ref(0.5)

// Layer states
const droneEnabled = ref(true)
const textureEnabled = ref(true)
const shimmerEnabled = ref(true)

// Layer parameters
const droneFrequency = ref(80)
const textureFilterCutoff = ref(800)
const shimmerFrequency = ref(600)

// Sound instances
let droneOscillator: any = null
let textureNoise: any = null
let textureFilter: any = null
let shimmerOscillator: any = null

async function togglePlayback() {
  try {
    error.value = ''

    if (isPlaying.value) {
      stopAll()
    }
    else {
      await startAll()
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to control playback'
    console.error('Playback error:', e)
  }
}

async function startAll() {
  loading.value = true

  try {
    const { createOscillator, createWhiteNoise, createFilterEffect } = await import('ez-web-audio')

    // Create drone layer - low-frequency sine wave with slow envelope
    droneOscillator = await createOscillator({
      frequency: droneFrequency.value,
      type: 'sine',
      envelope: {
        attack: 1.0,
        decay: 0.5,
        sustain: 0.8,
        release: 2.0,
      },
    })
    droneOscillator.changeGainTo(droneEnabled.value ? 0.4 : 0)

    // Create texture layer - white noise through lowpass filter
    textureNoise = await createWhiteNoise()
    textureFilter = createFilterEffect('lowpass', {
      frequency: textureFilterCutoff.value,
      q: 1.0,
    })
    textureNoise.addEffect(textureFilter)
    textureNoise.changeGainTo(textureEnabled.value ? 0.15 : 0)

    // Create shimmer layer - high-frequency triangle wave
    shimmerOscillator = await createOscillator({
      frequency: shimmerFrequency.value,
      type: 'triangle',
      envelope: {
        attack: 1.5,
        decay: 0.3,
        sustain: 0.9,
        release: 2.5,
      },
    })
    shimmerOscillator.changeGainTo(shimmerEnabled.value ? 0.08 : 0)

    // Start all layers
    droneOscillator.play()
    textureNoise.play()
    shimmerOscillator.play()

    isPlaying.value = true
  }
  finally {
    loading.value = false
  }
}

function stopAll() {
  try {
    if (droneOscillator) {
      droneOscillator.stop()
      droneOscillator = null
    }
    if (textureNoise) {
      textureNoise.stop()
      textureNoise = null
    }
    if (shimmerOscillator) {
      shimmerOscillator.stop()
      shimmerOscillator = null
    }
  }
  catch (e) {
    console.error('Error stopping sounds:', e)
  }

  isPlaying.value = false
}

function updateMasterVolume() {
  if (!isPlaying.value)
    return

  if (droneOscillator && droneEnabled.value) {
    droneOscillator.changeGainTo(0.4 * masterVolume.value)
  }
  if (textureNoise && textureEnabled.value) {
    textureNoise.changeGainTo(0.15 * masterVolume.value)
  }
  if (shimmerOscillator && shimmerEnabled.value) {
    shimmerOscillator.changeGainTo(0.08 * masterVolume.value)
  }
}

function toggleDrone() {
  if (!isPlaying.value)
    return

  if (droneOscillator) {
    droneOscillator.changeGainTo(droneEnabled.value ? 0.4 * masterVolume.value : 0)
  }
}

function toggleTexture() {
  if (!isPlaying.value)
    return

  if (textureNoise) {
    textureNoise.changeGainTo(textureEnabled.value ? 0.15 * masterVolume.value : 0)
  }
}

function toggleShimmer() {
  if (!isPlaying.value)
    return

  if (shimmerOscillator) {
    shimmerOscillator.changeGainTo(shimmerEnabled.value ? 0.08 * masterVolume.value : 0)
  }
}

function updateDroneFrequency() {
  if (!isPlaying.value || !droneOscillator)
    return

  droneOscillator.update('frequency').to(droneFrequency.value).as('ratio')
}

function updateTextureFilter() {
  if (!isPlaying.value || !textureFilter)
    return

  textureFilter.frequency = textureFilterCutoff.value
}

function updateShimmerFrequency() {
  if (!isPlaying.value || !shimmerOscillator)
    return

  shimmerOscillator.update('frequency').to(shimmerFrequency.value).as('ratio')
}

onUnmounted(() => {
  stopAll()
})
</script>

<template>
  <div class="ambient-generator">
    <div class="controls-section">
      <div class="control-header">
        <button
          class="play-btn"
          :class="{ active: isPlaying }"
          @click="togglePlayback"
        >
          {{ isPlaying ? 'Stop' : 'Start' }}
        </button>

        <label class="master-volume">
          Master Volume: {{ Math.round(masterVolume * 100) }}%
          <input
            v-model.number="masterVolume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            @input="updateMasterVolume"
          >
        </label>
      </div>

      <div class="layers">
        <div class="layer" :class="{ disabled: !droneEnabled }">
          <div class="layer-header">
            <label class="layer-toggle">
              <input v-model="droneEnabled" type="checkbox" @change="toggleDrone">
              <span class="layer-name">Drone</span>
            </label>
            <span class="layer-desc">Low-frequency sine wave</span>
          </div>
          <label class="layer-control">
            Frequency: {{ droneFrequency }} Hz
            <input
              v-model.number="droneFrequency"
              type="range"
              min="60"
              max="120"
              step="1"
              :disabled="!droneEnabled"
              @input="updateDroneFrequency"
            >
          </label>
        </div>

        <div class="layer" :class="{ disabled: !textureEnabled }">
          <div class="layer-header">
            <label class="layer-toggle">
              <input v-model="textureEnabled" type="checkbox" @change="toggleTexture">
              <span class="layer-name">Texture</span>
            </label>
            <span class="layer-desc">Filtered white noise</span>
          </div>
          <label class="layer-control">
            Filter Cutoff: {{ textureFilterCutoff }} Hz
            <input
              v-model.number="textureFilterCutoff"
              type="range"
              min="200"
              max="4000"
              step="50"
              :disabled="!textureEnabled"
              @input="updateTextureFilter"
            >
          </label>
        </div>

        <div class="layer" :class="{ disabled: !shimmerEnabled }">
          <div class="layer-header">
            <label class="layer-toggle">
              <input v-model="shimmerEnabled" type="checkbox" @change="toggleShimmer">
              <span class="layer-name">Shimmer</span>
            </label>
            <span class="layer-desc">High-frequency overtones</span>
          </div>
          <label class="layer-control">
            Frequency: {{ shimmerFrequency }} Hz
            <input
              v-model.number="shimmerFrequency"
              type="range"
              min="400"
              max="800"
              step="10"
              :disabled="!shimmerEnabled"
              @input="updateShimmerFrequency"
            >
          </label>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="loading" class="loading">
        Initializing audio...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.ambient-generator {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger);
  border-radius: 6px;
  font-size: 0.9rem;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.play-btn {
  padding: 0.75rem 2rem;
  border-radius: 6px;
  border: 2px solid var(--vp-c-brand);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover {
  background: var(--vp-c-brand-light);
}

.play-btn.active {
  background: var(--vp-c-brand);
  color: white;
}

.master-volume {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  flex: 1;
  min-width: 200px;
}

.master-volume input[type="range"] {
  width: 100%;
}

.layers {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.layer {
  padding: 1rem;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: opacity 0.2s;
}

.layer.disabled {
  opacity: 0.5;
}

.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.layer-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
}

.layer-toggle input[type="checkbox"] {
  cursor: pointer;
}

.layer-name {
  font-size: 1rem;
  color: var(--vp-c-brand);
}

.layer-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.layer-control {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.layer-control input[type="range"] {
  width: 100%;
}

.layer-control input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>

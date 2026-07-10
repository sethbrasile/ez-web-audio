<script setup lang="ts">
import type { FilterEffect } from 'ez-web-audio'
import { useCleanup, useOscillator, useWhiteNoise } from '@ez-web-audio/vue'
import { createFilterEffect } from 'ez-web-audio'
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

// Per-layer gain staging. Kept low so the three simultaneous layers sum
// without clipping the demo master bus (phase 75 loudness target: peak ≤ 0.985;
// the bus limiter is a safety net, not part of the sound).
const DRONE_GAIN = 0.25
const TEXTURE_GAIN = 0.08
const SHIMMER_GAIN = 0.05

// Uniform swell time for all three layers (so they fade in together, not
// staggered) and a short fade for click-free toggles / volume moves.
const SWELL_SEC = 0.6
const TOGGLE_FADE_SEC = 0.12

// Sound instances
const cleanup = useCleanup()
const { instance: droneOscillator, load: loadDrone, reset: resetDrone } = useOscillator()
const { instance: shimmerOscillator, load: loadShimmer, reset: resetShimmer } = useOscillator()
const { instance: textureNoise, load: loadTexture, reset: resetTexture } = useWhiteNoise()
let textureFilter: FilterEffect | null = null

// Smoothly ramp a layer's gain (no instant jump = no click). Used for toggles
// and the master-volume slider while the layer keeps playing.
function fadeGainTo(inst: { getGainNode: () => GainNode } | null, target: number, seconds = TOGGLE_FADE_SEC): void {
  if (!inst)
    return
  const gain = inst.getGainNode().gain
  const now = inst.getGainNode().context.currentTime
  gain.cancelScheduledValues(now)
  gain.setValueAtTime(gain.value, now)
  gain.linearRampToValueAtTime(target, now + seconds)
}

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
    // All three layers swell in from 0 over the SAME short time (SWELL_SEC) so
    // they start together — a uniform gain ramp, NOT the ADSR envelope (whose
    // attack ramps to full scale 1.0 regardless of changeGainTo and would clip
    // when the layers sum, phase 75). Targets include masterVolume so the
    // initial level matches the slider.
    const mv = masterVolume.value

    // Drone - low-frequency sine wave.
    const drone = cleanup.register(await loadDrone({
      frequency: droneFrequency.value,
      type: 'sine',
    }))
    drone.onPlayRamp('gain', 'linear').from(0).to(droneEnabled.value ? DRONE_GAIN * mv : 0).in(SWELL_SEC)

    // Texture - white noise through a lowpass filter.
    const texture = cleanup.register(await loadTexture())
    textureFilter = createFilterEffect('lowpass', {
      frequency: textureFilterCutoff.value,
      q: 1.0,
    })
    texture.addEffect(textureFilter)
    texture.onPlayRamp('gain', 'linear').from(0).to(textureEnabled.value ? TEXTURE_GAIN * mv : 0).in(SWELL_SEC)

    // Shimmer - high-frequency triangle wave.
    const shimmer = cleanup.register(await loadShimmer({
      frequency: shimmerFrequency.value,
      type: 'triangle',
    }))
    shimmer.onPlayRamp('gain', 'linear').from(0).to(shimmerEnabled.value ? SHIMMER_GAIN * mv : 0).in(SWELL_SEC)

    // Start all layers (they swell in together)
    drone.play()
    texture.play()
    shimmer.play()

    isPlaying.value = true
  }
  finally {
    loading.value = false
  }
}

function stopAll() {
  try {
    if (droneOscillator.value) {
      droneOscillator.value.stop()
      resetDrone()
    }
    if (textureNoise.value) {
      textureNoise.value.stop()
      resetTexture()
    }
    if (shimmerOscillator.value) {
      shimmerOscillator.value.stop()
      resetShimmer()
    }
    textureFilter = null
  }
  catch (e) {
    console.error('Error stopping sounds:', e)
  }

  isPlaying.value = false
}

function updateMasterVolume() {
  if (!isPlaying.value)
    return

  if (droneOscillator.value && droneEnabled.value)
    fadeGainTo(droneOscillator.value, DRONE_GAIN * masterVolume.value)
  if (textureNoise.value && textureEnabled.value)
    fadeGainTo(textureNoise.value, TEXTURE_GAIN * masterVolume.value)
  if (shimmerOscillator.value && shimmerEnabled.value)
    fadeGainTo(shimmerOscillator.value, SHIMMER_GAIN * masterVolume.value)
}

function toggleDrone() {
  if (!isPlaying.value)
    return
  fadeGainTo(droneOscillator.value, droneEnabled.value ? DRONE_GAIN * masterVolume.value : 0)
}

function toggleTexture() {
  if (!isPlaying.value)
    return
  fadeGainTo(textureNoise.value, textureEnabled.value ? TEXTURE_GAIN * masterVolume.value : 0)
}

function toggleShimmer() {
  if (!isPlaying.value)
    return
  fadeGainTo(shimmerOscillator.value, shimmerEnabled.value ? SHIMMER_GAIN * masterVolume.value : 0)
}

function updateDroneFrequency() {
  if (!isPlaying.value || !droneOscillator.value)
    return

  droneOscillator.value.update('frequency').to(droneFrequency.value).as('ratio')
}

function updateTextureFilter() {
  if (!isPlaying.value || !textureFilter)
    return

  textureFilter.frequency = textureFilterCutoff.value
}

function updateShimmerFrequency() {
  if (!isPlaying.value || !shimmerOscillator.value)
    return

  shimmerOscillator.value.update('frequency').to(shimmerFrequency.value).as('ratio')
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
          :aria-label="isPlaying ? 'Stop ambient playback' : 'Start ambient playback'"
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
            aria-label="Master volume"
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
              aria-label="Drone frequency"
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
              aria-label="Texture filter cutoff"
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
              aria-label="Shimmer frequency"
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

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
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

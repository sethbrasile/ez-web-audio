<script setup lang="ts">
import type { FilterEffect, LFO, VoiceHandle } from 'ez-web-audio'
import { useCleanup, usePolySynth, useWhiteNoise } from '@ez-web-audio/vue'
import { createFilterEffect, createLFO, createReverb } from 'ez-web-audio'
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
const droneFrequency = ref(65) // pad root (~C2)
const textureFilterCutoff = ref(800)
const shimmerFrequency = ref(523) // ~C5

// ── Sound design (gate-2 redesign, from ambient-synthesis research) ─────────
// Pad: a detuned oscillator stack voiced as root / root+6¢ / fifth / octave /
//      twelfth through a gentle lowpass + long reverb. The ±6¢ pairs beat
//      slowly (sub-Hz), and a very slow LFO breathes the filter cutoff —
//      "slow and subtle movement" is the core of ambient sound design.
// Texture: lowpassed white noise whose cutoff breathes on its own slow LFO.
// Shimmer: two quiet detuned sines a fifth apart, heavy reverb, slow tremolo.
//
// Voicing intervals (× root): open fifth + octave + twelfth — no third, so
// the stack stays consonant everywhere on the root slider.
const PAD_VOICES: { ratio: number, gain: number }[] = [
  { ratio: 1, gain: 0.3 },
  { ratio: 2 ** (6 / 1200), gain: 0.3 }, // root +6 cents — slow beating
  { ratio: 1.5, gain: 0.22 }, // fifth
  { ratio: 2 * 2 ** (-5 / 1200), gain: 0.16 }, // octave −5 cents
  { ratio: 3, gain: 0.1 }, // twelfth (air)
]
const SHIMMER_VOICES: { ratio: number, gain: number }[] = [
  { ratio: 1, gain: 0.5 },
  { ratio: 1.5 * 2 ** (7 / 1200), gain: 0.35 }, // fifth +7 cents
]

// Per-layer master gain staging — three layers must sum below the demo
// master-bus clip point (phase 75 loudness target: peak ≤ 0.985).
const PAD_GAIN = 0.55
const TEXTURE_GAIN = 0.05
const SHIMMER_GAIN = 0.1

// Uniform swell time for all three layers (so they fade in together, not
// staggered) and a short fade for click-free toggles / volume moves.
const SWELL_SEC = 1.2
const TOGGLE_FADE_SEC = 0.12

// Sound instances
const cleanup = useCleanup()
const { instance: padSynth, load: loadPadSynth, reset: resetPadSynth } = usePolySynth()
const { instance: shimmerSynth, load: loadShimmerSynth, reset: resetShimmerSynth } = usePolySynth()
const { instance: textureNoise, load: loadTexture, reset: resetTexture } = useWhiteNoise()
let textureFilter: FilterEffect | null = null
let padFilter: FilterEffect | null = null
let padVoiceHandles: VoiceHandle[] = []
let shimmerVoiceHandles: VoiceHandle[] = []
let lfos: LFO[] = []
let stopFadeTimeout: ReturnType<typeof setTimeout> | null = null

// Smoothly ramp a layer's gain (no instant jump = no click). Used for the
// initial swell, toggles, and the master-volume slider.
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
    if (stopFadeTimeout) {
      clearTimeout(stopFadeTimeout)
      stopFadeTimeout = null
    }
    const mv = masterVolume.value

    // ── Pad — detuned chord stack -> lowpass -> long reverb ────────────────
    // Voice ADSR is avoided on purpose: the envelope attack ramps to absolute
    // 1.0 regardless of voice gain (phase-75 library friction), so the swell
    // is a master-gain ramp instead.
    const pad = cleanup.register(await loadPadSynth({ maxVoices: 8, type: 'triangle' }))
    padFilter = createFilterEffect('lowpass', { frequency: 900, q: 0.6 })
    pad.addEffect(padFilter)
    pad.addEffect(createReverb({ decay: 5, preDelay: 0.03, wet: 0.45 }))
    pad.changeGainTo(0)
    padVoiceHandles = PAD_VOICES.map(v =>
      pad.play({ frequency: droneFrequency.value * v.ratio, gain: v.gain }),
    )

    // ── Texture — white noise through a breathing lowpass ──────────────────
    const texture = cleanup.register(await loadTexture())
    textureFilter = createFilterEffect('lowpass', {
      frequency: textureFilterCutoff.value,
      q: 1.0,
    })
    texture.addEffect(textureFilter)
    texture.changeGainTo(0)
    void texture.play()

    // ── Shimmer — quiet detuned high sines, heavy reverb, slow tremolo ─────
    const shimmer = cleanup.register(await loadShimmerSynth({ maxVoices: 4, type: 'sine' }))
    shimmer.addEffect(createReverb({ decay: 6, preDelay: 0.02, wet: 0.6 }))
    shimmer.changeGainTo(0)
    shimmerVoiceHandles = SHIMMER_VOICES.map(v =>
      shimmer.play({ frequency: shimmerFrequency.value * v.ratio, gain: v.gain }),
    )

    // ── Slow modulation — different sub-0.2Hz rates so movement never loops ─
    const padFilterLFO = createLFO({ frequency: 0.05, depth: 0.35, type: 'sine' })
    padFilterLFO.connect(padFilter, 'frequency').start()
    const textureLFO = createLFO({ frequency: 0.08, depth: 0.4, type: 'sine' })
    textureLFO.connect(textureFilter, 'frequency').start()
    const shimmerTremolo = createLFO({ frequency: 0.13, depth: 0.35, type: 'sine' })
    shimmerTremolo.connect(shimmer, 'gain').start()
    lfos = [padFilterLFO, textureLFO, shimmerTremolo]

    // All three layers swell in together over the same time
    fadeGainTo(pad, droneEnabled.value ? PAD_GAIN * mv : 0, SWELL_SEC)
    fadeGainTo(texture, textureEnabled.value ? TEXTURE_GAIN * mv : 0, SWELL_SEC)
    fadeGainTo(shimmer, shimmerEnabled.value ? SHIMMER_GAIN * mv : 0, SWELL_SEC)

    isPlaying.value = true
  }
  finally {
    loading.value = false
  }
}

function stopAll() {
  try {
    // Fade everything out briefly, then tear down — an instant stopAll()
    // would cut the reverb tails with a click
    fadeGainTo(padSynth.value, 0, TOGGLE_FADE_SEC)
    fadeGainTo(textureNoise.value, 0, TOGGLE_FADE_SEC)
    fadeGainTo(shimmerSynth.value, 0, TOGGLE_FADE_SEC)

    const pad = padSynth.value
    const texture = textureNoise.value
    const shimmer = shimmerSynth.value

    stopFadeTimeout = setTimeout(() => {
      stopFadeTimeout = null
      for (const lfo of lfos) {
        lfo.dispose()
      }
      lfos = []
      pad?.stopAll()
      pad?.dispose()
      void texture?.stop()
      shimmer?.stopAll()
      shimmer?.dispose()
    }, TOGGLE_FADE_SEC * 1000 + 80)

    padVoiceHandles = []
    shimmerVoiceHandles = []
    textureFilter = null
    padFilter = null
    resetPadSynth()
    resetTexture()
    resetShimmerSynth()
  }
  catch (e) {
    console.error('Error stopping sounds:', e)
  }

  isPlaying.value = false
}

function updateMasterVolume() {
  if (!isPlaying.value)
    return

  if (padSynth.value && droneEnabled.value)
    fadeGainTo(padSynth.value, PAD_GAIN * masterVolume.value)
  if (textureNoise.value && textureEnabled.value)
    fadeGainTo(textureNoise.value, TEXTURE_GAIN * masterVolume.value)
  if (shimmerSynth.value && shimmerEnabled.value)
    fadeGainTo(shimmerSynth.value, SHIMMER_GAIN * masterVolume.value)
}

function toggleDrone() {
  if (!isPlaying.value)
    return
  fadeGainTo(padSynth.value, droneEnabled.value ? PAD_GAIN * masterVolume.value : 0)
}

function toggleTexture() {
  if (!isPlaying.value)
    return
  fadeGainTo(textureNoise.value, textureEnabled.value ? TEXTURE_GAIN * masterVolume.value : 0)
}

function toggleShimmer() {
  if (!isPlaying.value)
    return
  fadeGainTo(shimmerSynth.value, shimmerEnabled.value ? SHIMMER_GAIN * masterVolume.value : 0)
}

function updateDroneFrequency() {
  if (!isPlaying.value)
    return
  // Re-tune every pad voice live, preserving the voicing ratios
  padVoiceHandles.forEach((handle, i) => {
    handle.update('frequency').to(droneFrequency.value * PAD_VOICES[i].ratio).as('ratio')
  })
}

function updateTextureFilter() {
  if (!isPlaying.value || !textureFilter)
    return

  textureFilter.frequency = textureFilterCutoff.value
}

function updateShimmerFrequency() {
  if (!isPlaying.value)
    return
  shimmerVoiceHandles.forEach((handle, i) => {
    handle.update('frequency').to(shimmerFrequency.value * SHIMMER_VOICES[i].ratio).as('ratio')
  })
}

onUnmounted(() => {
  stopAll()
  if (stopFadeTimeout) {
    clearTimeout(stopFadeTimeout)
    stopFadeTimeout = null
  }
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
              <span class="layer-name">Pad</span>
            </label>
            <span class="layer-desc">Detuned chord stack — root, fifth, octave</span>
          </div>
          <label class="layer-control">
            Root: {{ droneFrequency }} Hz
            <input
              v-model.number="droneFrequency"
              type="range"
              min="55"
              max="110"
              step="1"
              aria-label="Pad root frequency"
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
            <span class="layer-desc">White noise through a slowly breathing filter</span>
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
            <span class="layer-desc">Airy detuned highs in long reverb</span>
          </div>
          <label class="layer-control">
            Frequency: {{ shimmerFrequency }} Hz
            <input
              v-model.number="shimmerFrequency"
              type="range"
              min="400"
              max="800"
              step="1"
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

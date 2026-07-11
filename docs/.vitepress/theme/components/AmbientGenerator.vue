<script setup lang="ts">
import type { FilterEffect, LFO, VoiceHandle } from 'ez-web-audio'
import { useCleanup, usePolySynth, useWhiteNoise } from '@ez-web-audio/vue'
import { createFilterEffect, createLFO, createReverb } from 'ez-web-audio'
import { onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import VolumeWarning from './kit/VolumeWarning.vue'

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

// ParameterSlider emits the new value on 'update:model-value' rather than
// exposing the native input event — these thin wrappers write the ref (what
// v-model used to do) and then call the same update*/toggle* function the
// old inline `@input`/`@change` handlers called, in the same order.
function onMasterVolumeInput(v: number) {
  masterVolume.value = v
  updateMasterVolume()
}

function onDroneFrequencyInput(v: number) {
  droneFrequency.value = v
  updateDroneFrequency()
}

function onTextureFilterInput(v: number) {
  textureFilterCutoff.value = v
  updateTextureFilter()
}

function onShimmerFrequencyInput(v: number) {
  shimmerFrequency.value = v
  updateShimmerFrequency()
}

// Presentation-only formatters for the ParameterSlider value readouts.
function formatMasterVolume(v: number): string {
  return `${Math.round(v * 100)}%`
}

function formatHz(v: number): string {
  return `${Math.round(v)} Hz`
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
  <DemoFrame
    class="ambient-generator"
    :error="error"
    takeaway="The library composes, not just plays."
  >
    <VolumeWarning>
      <strong>Headphone check.</strong> This demo layers three continuous sound sources — start with your volume low.
    </VolumeWarning>

    <!--
      Generative bloom — pure-CSS visual driven entirely by the existing
      `isPlaying` ref (no new script state). Rings are `.ewa-bloom-ring` so
      the global `[class*='ewa-']` reduced-motion rule in custom.css kills
      the breathing animation for users who ask for it.
    -->
    <div class="bloom-well" :class="{ 'bloom-well--active': isPlaying }" aria-hidden="true">
      <span class="ewa-bloom-ring ewa-bloom-ring--1" />
      <span class="ewa-bloom-ring ewa-bloom-ring--2" />
      <span class="ewa-bloom-ring ewa-bloom-ring--3" />
      <span class="ewa-bloom-dot" />
    </div>

    <div class="control-header">
      <PlayButton
        label="Start"
        playing-label="Stop"
        :playing="isPlaying"
        :loading="loading"
        :aria-label="isPlaying ? 'Stop ambient playback' : 'Start ambient playback'"
        @click="togglePlayback"
      />

      <ParameterSlider
        class="master-volume"
        label="Master Volume"
        :model-value="masterVolume"
        :min="0"
        :max="1"
        :step="0.01"
        :format="formatMasterVolume"
        @update:model-value="onMasterVolumeInput"
      />
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
        <ParameterSlider
          label="Root"
          :model-value="droneFrequency"
          :min="55"
          :max="110"
          :step="1"
          :disabled="!droneEnabled"
          :format="formatHz"
          @update:model-value="onDroneFrequencyInput"
        />
      </div>

      <div class="layer" :class="{ disabled: !textureEnabled }">
        <div class="layer-header">
          <label class="layer-toggle">
            <input v-model="textureEnabled" type="checkbox" @change="toggleTexture">
            <span class="layer-name">Texture</span>
          </label>
          <span class="layer-desc">White noise through a slowly breathing filter</span>
        </div>
        <ParameterSlider
          label="Filter Cutoff"
          :model-value="textureFilterCutoff"
          :min="200"
          :max="4000"
          :step="50"
          :disabled="!textureEnabled"
          :format="formatHz"
          @update:model-value="onTextureFilterInput"
        />
      </div>

      <div class="layer" :class="{ disabled: !shimmerEnabled }">
        <div class="layer-header">
          <label class="layer-toggle">
            <input v-model="shimmerEnabled" type="checkbox" @change="toggleShimmer">
            <span class="layer-name">Shimmer</span>
          </label>
          <span class="layer-desc">Airy detuned highs in long reverb</span>
        </div>
        <ParameterSlider
          label="Frequency"
          :model-value="shimmerFrequency"
          :min="400"
          :max="800"
          :step="1"
          :disabled="!shimmerEnabled"
          :format="formatHz"
          @update:model-value="onShimmerFrequencyInput"
        />
      </div>
    </div>

    <template v-if="loading" #status>
      <p class="loading">
        Initializing audio...
      </p>
    </template>
  </DemoFrame>
</template>

<style scoped>
.control-header {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  margin-top: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ewa-line);
}

.master-volume {
  flex: 1;
  min-width: 200px;
}

/* ── Generative bloom ──────────────────────────────────────────────────── */
.bloom-well {
  position: relative;
  height: 90px;
  margin: 16px 0 4px;
  border-radius: 8px;
  background: var(--ewa-well);
  overflow: hidden;
}

.ewa-bloom-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  border: 1.5px solid var(--ewa-accent);
  opacity: 0;
  transform: translate(-50%, -50%) scale(1);
  transition: opacity 0.6s ease;
}

.ewa-bloom-ring--1 {
  width: 40px;
  height: 40px;
}

.ewa-bloom-ring--2 {
  width: 64px;
  height: 64px;
}

.ewa-bloom-ring--3 {
  width: 88px;
  height: 88px;
}

.ewa-bloom-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ewa-accent);
  box-shadow: 0 0 14px var(--ewa-accent);
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.6s ease;
}

.bloom-well--active .ewa-bloom-ring--1 {
  opacity: 0.30;
  animation: ewa-bloom-breathe 4s ease-in-out infinite alternate;
}

.bloom-well--active .ewa-bloom-ring--2 {
  opacity: 0.23;
  animation: ewa-bloom-breathe 4s ease-in-out infinite alternate;
  animation-delay: 0.6s;
}

.bloom-well--active .ewa-bloom-ring--3 {
  opacity: 0.16;
  animation: ewa-bloom-breathe 4s ease-in-out infinite alternate;
  animation-delay: 1.2s;
}

.bloom-well--active .ewa-bloom-dot {
  opacity: 1;
}

@keyframes ewa-bloom-breathe {
  from {
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    transform: translate(-50%, -50%) scale(1.15);
  }
}

/* ── Layers ────────────────────────────────────────────────────────────── */
.layers {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.layer {
  padding: 16px;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  transition: opacity 0.2s;
}

.layer.disabled {
  opacity: 0.55;
}

.layer-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.layer-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.layer-toggle input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--ewa-accent);
  cursor: pointer;
}

.layer-name {
  font-size: 0.95rem;
  color: var(--ewa-text);
}

.layer-desc {
  font-size: 0.85rem;
  color: var(--ewa-text-2);
  font-style: italic;
}

.loading {
  margin: 0;
  text-align: center;
  color: var(--ewa-text-2);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .control-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

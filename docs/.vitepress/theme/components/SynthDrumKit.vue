<script setup lang="ts">
import type { LayeredSound, Oscillator, Sound } from 'ez-web-audio'
import { createFilterEffect, createLayeredSound, createOscillator, createWhiteNoise } from 'ez-web-audio'
import { onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import TriggerPad from './kit/TriggerPad.vue'
import VolumeWarning from './kit/VolumeWarning.vue'

const initialized = ref(false)
const loading = ref(false)
const error = ref('')
const lastPlayed = ref('')

let activeOscillators: Array<Oscillator | Sound | LayeredSound> = []

async function initIfNeeded() {
  if (!initialized.value) {
    loading.value = true
    try {
      // initAudio happens implicitly on first createX() call
      initialized.value = true
    }
    finally {
      loading.value = false
    }
  }
}

function flashPad(padName: string) {
  lastPlayed.value = padName
  setTimeout(() => {
    lastPlayed.value = ''
  }, 200)
}

async function playKick() {
  try {
    error.value = ''
    await initIfNeeded()
    flashPad('kick')

    const osc = await createOscillator({
      frequency: 150,
      type: 'triangle',
    })

    // Frequency sweep: 150Hz down to near 0
    osc.onPlayRamp('frequency').from(150).to(0.01).in(0.1)
    // Gain envelope (use linear to allow ramping to 0)
    osc.onPlayRamp('gain', 'linear').from(1).to(0).in(0.1)
    activeOscillators.push(osc)
    osc.play()

    // Stop after sound completes
    setTimeout(() => {
      try {
        osc.stop()
        const idx = activeOscillators.indexOf(osc)
        if (idx > -1)
          activeOscillators.splice(idx, 1)
      }
      catch {}
    }, 200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play kick'
    console.warn('Kick error:', e)
  }
}

async function createSnareMeat() {
  const osc = await createOscillator({
    frequency: 100,
    type: 'sine',
  })

  osc.onPlayRamp('frequency').from(100).to(60).in(0.1)
  osc.onPlayRamp('gain').from(1).to(0.01).in(0.1)
  return osc
}

async function createSnareCrack() {
  const noise = await createWhiteNoise()

  // Apply highpass filter for the "crack"
  const highpass = createFilterEffect('highpass', {
    frequency: 1000,
    q: 1,
  })

  noise.addEffect(highpass)
  noise.onPlayRamp('gain').from(1).to(0.001).in(0.1)
  return noise
}

async function playSnareMeat() {
  if (!initialized.value)
    await initIfNeeded()
  const osc = await createSnareMeat()
  activeOscillators.push(osc)
  osc.playFor(0.1)
  setTimeout(() => {
    const idx = activeOscillators.indexOf(osc)
    if (idx > -1)
      activeOscillators.splice(idx, 1)
  }, 200)
}

async function playSnareCrack() {
  if (!initialized.value)
    await initIfNeeded()
  const noise = await createSnareCrack()
  activeOscillators.push(noise)
  noise.playFor(0.1)
  setTimeout(() => {
    const idx = activeOscillators.indexOf(noise)
    if (idx > -1)
      activeOscillators.splice(idx, 1)
  }, 200)
}

async function playSnare() {
  try {
    error.value = ''
    await initIfNeeded()
    flashPad('snare')

    // Use LayeredSound to synchronize both layers to the same AudioContext timestamp
    const meat = await createSnareMeat()
    const crack = await createSnareCrack()
    const snare = await createLayeredSound([meat, crack])
    activeOscillators.push(snare)
    snare.playFor(0.1)

    setTimeout(() => {
      const idx = activeOscillators.indexOf(snare)
      if (idx > -1)
        activeOscillators.splice(idx, 1)
    }, 200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play snare'
    console.warn('Snare error:', e)
  }
}

async function playHiHat() {
  try {
    error.value = ''
    await initIfNeeded()
    flashPad('hihat')

    // Create multiple square oscillators at harmonic ratios
    // Using metallic ratios for that characteristic hi-hat sound
    const fundamentalFreq = 40
    const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]

    const oscillators = await Promise.all(
      ratios.map(async (ratio) => {
        const osc = await createOscillator({
          frequency: fundamentalFreq * ratio,
          type: 'square',
        })

        // Highpass + bandpass filters for metallic character
        const highpass = createFilterEffect('highpass', {
          frequency: 7000,
          q: 1,
        })
        const bandpass = createFilterEffect('bandpass', {
          frequency: 10000,
          q: 1,
        })

        osc.addEffects([highpass, bandpass])

        // ADSR-style envelope matching ember-audio original
        osc.onPlayRamp('gain').from(0.00001).to(1).in(0.02)
        osc.onPlaySet('gain').to(0.3).endingAt(0.03)
        osc.onPlaySet('gain').to(0.00001).endingAt(0.3)
        return osc
      }),
    )

    // Use LayeredSound for synchronized playback
    const hihat = await createLayeredSound(oscillators)
    activeOscillators.push(hihat)
    hihat.playFor(0.1)

    setTimeout(() => {
      const idx = activeOscillators.indexOf(hihat)
      if (idx > -1)
        activeOscillators.splice(idx, 1)
    }, 400)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play hi-hat'
    console.warn('Hi-hat error:', e)
  }
}

async function playBassDrop() {
  try {
    error.value = ''
    await initIfNeeded()

    const osc = await createOscillator({
      frequency: 100,
      type: 'sine',
    })

    // Linear frequency sweep (steady pitch drop) and exponential gain decay.
    // The original ember-audio demo ran this drop for 10s — verified against
    // tests/dummy/app/controllers/synthesis/drum-kit.js — which drones far too
    // long for a demo hit; 4s reads as a full drop without overstaying.
    const DROP_SEC = 4
    osc.onPlayRamp('frequency', 'linear').from(100).to(0.01).in(DROP_SEC)
    osc.onPlayRamp('gain').from(1).to(0.01).in(DROP_SEC)
    activeOscillators.push(osc)
    osc.playFor(DROP_SEC)

    // Clean up reference after sound completes
    setTimeout(() => {
      const idx = activeOscillators.indexOf(osc)
      if (idx > -1)
        activeOscillators.splice(idx, 1)
    }, DROP_SEC * 1000 + 100)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play bass drop'
    console.warn('Bass drop error:', e)
  }
}

onUnmounted(() => {
  // Stop all active oscillators
  activeOscillators.forEach((osc) => {
    try {
      osc.stop()
    }
    catch {}
  })
  activeOscillators = []
})
</script>

<template>
  <DemoFrame class="synth-drum-kit" :error="error" takeaway="Drums from pure synthesis — layered sounds.">
    <VolumeWarning />

    <div class="pad-group">
      <span class="pad-group__label">Drum Pads</span>
      <div class="pads-container">
        <TriggerPad
          label="KICK"
          color="var(--ewa-kick)"
          :disabled="loading"
          :active="lastPlayed === 'kick'"
          aria-label="Play kick drum"
          @trigger="playKick"
        />
        <TriggerPad
          label="SNARE"
          color="var(--ewa-snare)"
          :disabled="loading"
          :active="lastPlayed === 'snare'"
          aria-label="Play snare drum"
          @trigger="playSnare"
        />
        <TriggerPad
          label="HI-HAT"
          color="var(--ewa-hat)"
          :disabled="loading"
          :active="lastPlayed === 'hihat'"
          aria-label="Play hi-hat"
          @trigger="playHiHat"
        />
      </div>
    </div>

    <TriggerPad
      class="bass-drop-pad"
      label="BASS DROP"
      color="var(--ewa-bass)"
      :disabled="loading"
      aria-label="Play bass drop effect"
      @trigger="playBassDrop"
    />

    <div class="pad-group breakdown-group">
      <span class="pad-group__label">Snare Breakdown</span>
      <div class="breakdown-buttons">
        <TriggerPad
          label="Meat Only"
          sublabel="Tone"
          color="var(--ewa-snare)"
          :disabled="loading"
          aria-label="Play snare meat layer only"
          @trigger="playSnareMeat"
        />
        <TriggerPad
          label="Crack Only"
          sublabel="Noise"
          color="var(--ewa-snare)"
          :disabled="loading"
          aria-label="Play snare crack layer only"
          @trigger="playSnareCrack"
        />
        <TriggerPad
          label="Full Snare"
          sublabel="Both"
          color="var(--ewa-snare)"
          :disabled="loading"
          aria-label="Play full snare (both layers)"
          @trigger="playSnare"
        />
      </div>
    </div>

    <template #status>
      <p v-if="loading" class="loading-text">
        Loading synth...
      </p>
    </template>
  </DemoFrame>
</template>

<style scoped>
.pad-group {
  margin-bottom: 20px;
}

.pad-group__label {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ewa-text-3);
  margin-bottom: 10px;
}

.pads-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.pads-container :deep(.ewa-trigger-pad) {
  min-height: 96px;
  font-size: 16px;
  letter-spacing: 0.04em;
}

.bass-drop-pad {
  width: 100%;
  min-height: 60px;
  margin-bottom: 20px;
  font-size: 15px;
  letter-spacing: 0.08em;
}

.breakdown-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.breakdown-buttons :deep(.ewa-trigger-pad) {
  flex: 1;
  min-width: 100px;
}

.loading-text {
  margin: 0;
  text-align: center;
  color: var(--ewa-text-2);
  font-style: italic;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .pads-container {
    grid-template-columns: 1fr;
  }

  .breakdown-buttons {
    flex-direction: column;
  }
}
</style>

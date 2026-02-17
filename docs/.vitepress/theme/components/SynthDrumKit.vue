<template>
  <div class="synth-drum-kit">
    <div class="pads-container">
      <button
        class="drum-pad kick"
        :class="{ playing: lastPlayed === 'kick' }"
        :disabled="loading"
        @mousedown="playKick"
        @touchstart.prevent="playKick"
        aria-label="Play kick drum"
      >
        KICK
      </button>
      <button
        class="drum-pad snare"
        :class="{ playing: lastPlayed === 'snare' }"
        :disabled="loading"
        @mousedown="playSnare"
        @touchstart.prevent="playSnare"
        aria-label="Play snare drum"
      >
        SNARE
      </button>
      <button
        class="drum-pad hihat"
        :class="{ playing: lastPlayed === 'hihat' }"
        :disabled="loading"
        @mousedown="playHiHat"
        @touchstart.prevent="playHiHat"
        aria-label="Play hi-hat"
      >
        HI-HAT
      </button>
    </div>

    <button
      class="bass-drop-btn"
      :disabled="loading"
      @click="playBassDrop"
      aria-label="Play bass drop effect"
    >
      BASS DROP
    </button>

    <div class="breakdown-section">
      <h4>Snare Breakdown</h4>
      <div class="breakdown-buttons">
        <button @click="playSnareMeat" class="breakdown-btn" :disabled="loading" aria-label="Play snare meat layer only">
          Meat Only
        </button>
        <button @click="playSnareCrack" class="breakdown-btn" :disabled="loading" aria-label="Play snare crack layer only">
          Crack Only
        </button>
        <button @click="playSnare" class="breakdown-btn" :disabled="loading" aria-label="Play full snare (both layers)">
          Full Snare
        </button>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="loading" class="loading">Loading synth...</div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const initialized = ref(false)
const loading = ref(false)
const error = ref('')
const lastPlayed = ref('')

let lib: any = null
let activeOscillators: any[] = []

async function initIfNeeded() {
  if (!lib) {
    loading.value = true
    try {
      lib = await import('ez-web-audio')
      initialized.value = true
    } finally {
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

    const osc = await lib.createOscillator({
      frequency: 150,
      type: 'triangle'
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
        if (idx > -1) activeOscillators.splice(idx, 1)
      } catch {}
    }, 200)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play kick'
    console.warn('Kick error:', e)
  }
}

async function createSnareMeat() {
  const osc = await lib.createOscillator({
    frequency: 100,
    type: 'sine'
  })

  osc.onPlayRamp('frequency').from(100).to(60).in(0.1)
  osc.onPlayRamp('gain').from(1).to(0.01).in(0.1)
  return osc
}

async function createSnareCrack() {
  const ctx = await lib.getAudioContext()
  const noise = await lib.createWhiteNoise()

  // Apply highpass filter for the "crack"
  const highpass = lib.createFilterEffect(ctx, 'highpass', {
    frequency: 1000,
    q: 1
  })

  noise.addEffect(highpass)
  noise.onPlayRamp('gain').from(1).to(0.001).in(0.1)
  return noise
}

async function playSnareMeat() {
  if (!lib) await initIfNeeded()
  const osc = await createSnareMeat()
  activeOscillators.push(osc)
  osc.playFor(0.1)
  setTimeout(() => {
    const idx = activeOscillators.indexOf(osc)
    if (idx > -1) activeOscillators.splice(idx, 1)
  }, 200)
}

async function playSnareCrack() {
  if (!lib) await initIfNeeded()
  const noise = await createSnareCrack()
  activeOscillators.push(noise)
  noise.playFor(0.1)
  setTimeout(() => {
    const idx = activeOscillators.indexOf(noise)
    if (idx > -1) activeOscillators.splice(idx, 1)
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
    const snare = await lib.createLayeredSound([meat, crack])
    activeOscillators.push(snare)
    snare.playFor(0.1)

    setTimeout(() => {
      const idx = activeOscillators.indexOf(snare)
      if (idx > -1) activeOscillators.splice(idx, 1)
    }, 200)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play snare'
    console.warn('Snare error:', e)
  }
}

async function playHiHat() {
  try {
    error.value = ''
    await initIfNeeded()
    flashPad('hihat')

    const ctx = await lib.getAudioContext()

    // Create multiple square oscillators at harmonic ratios
    // Using metallic ratios for that characteristic hi-hat sound
    const fundamentalFreq = 40
    const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]

    const oscillators = await Promise.all(
      ratios.map(async ratio => {
        const osc = await lib.createOscillator({
          frequency: fundamentalFreq * ratio,
          type: 'square'
        })

        // Highpass + bandpass filters for metallic character
        const highpass = lib.createFilterEffect(ctx, 'highpass', {
          frequency: 7000,
          q: 1
        })
        const bandpass = lib.createFilterEffect(ctx, 'bandpass', {
          frequency: 10000,
          q: 1
        })

        osc.addEffect(highpass)
        osc.addEffect(bandpass)

        // ADSR-style envelope matching ember-audio original
        osc.onPlayRamp('gain').from(0.00001).to(1).in(0.02)
        osc.onPlaySet('gain').to(0.3).endingAt(0.03)
        osc.onPlaySet('gain').to(0.00001).endingAt(0.3)
        return osc
      })
    )

    // Use LayeredSound for synchronized playback
    const hihat = await lib.createLayeredSound(oscillators)
    activeOscillators.push(hihat)
    hihat.playFor(0.1)

    setTimeout(() => {
      const idx = activeOscillators.indexOf(hihat)
      if (idx > -1) activeOscillators.splice(idx, 1)
    }, 400)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play hi-hat'
    console.warn('Hi-hat error:', e)
  }
}

async function playBassDrop() {
  try {
    error.value = ''
    await initIfNeeded()

    const osc = await lib.createOscillator({
      frequency: 100,
      type: 'sine'
    })

    // Linear frequency sweep (steady pitch drop) and exponential gain decay
    osc.onPlayRamp('frequency', 'linear').from(100).to(0.01).in(10)
    osc.onPlayRamp('gain').from(1).to(0.01).in(10)
    activeOscillators.push(osc)
    osc.playFor(10)

    // Clean up reference after sound completes
    setTimeout(() => {
      const idx = activeOscillators.indexOf(osc)
      if (idx > -1) activeOscillators.splice(idx, 1)
    }, 10100)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play bass drop'
    console.warn('Bass drop error:', e)
  }
}

onUnmounted(() => {
  // Stop all active oscillators
  activeOscillators.forEach(osc => {
    try {
      osc.stop()
    } catch {}
  })
  activeOscillators = []
})
</script>

<style scoped>
.synth-drum-kit {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.loading {
  padding: 1rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.pads-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.drum-pad {
  min-width: 120px;
  height: 120px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.1s ease;
  color: white;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.drum-pad:active:not(:disabled) {
  transform: scale(0.95);
}

.drum-pad:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drum-pad.playing {
  transform: scale(0.95);
  filter: brightness(1.3);
}

.drum-pad.kick {
  background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
}

.drum-pad.kick:hover:not(:active) {
  background: linear-gradient(135deg, #5aafff 0%, #4589cd 100%);
}

.drum-pad.snare {
  background: linear-gradient(135deg, #ff7b4a 0%, #d65a2e 100%);
}

.drum-pad.snare:hover:not(:active) {
  background: linear-gradient(135deg, #ff8b5a 0%, #e66a3e 100%);
}

.drum-pad.hihat {
  background: linear-gradient(135deg, #ffd54f 0%, #d6a82e 100%);
}

.drum-pad.hihat:hover:not(:active) {
  background: linear-gradient(135deg, #ffe55f 0%, #e6b83e 100%);
}

.bass-drop-btn {
  width: 100%;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 2px solid var(--vp-c-brand);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-brand);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bass-drop-btn:hover {
  background: var(--vp-c-brand);
  color: white;
}

.bass-drop-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.bass-drop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.breakdown-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.breakdown-section h4 {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
}

.breakdown-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.breakdown-btn {
  flex: 1;
  min-width: 100px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.breakdown-btn:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand);
}

.breakdown-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.breakdown-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger);
  border-radius: 4px;
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .pads-container {
    grid-template-columns: 1fr;
  }

  .drum-pad {
    min-width: 100%;
  }

  .breakdown-buttons {
    flex-direction: column;
  }

  .breakdown-btn {
    width: 100%;
  }
}
</style>

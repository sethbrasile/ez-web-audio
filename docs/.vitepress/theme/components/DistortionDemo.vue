<script setup lang="ts">
import type { EffectWrapper } from 'ez-web-audio'
import { useAudioContext, useCleanup, useOscillator } from '@ez-web-audio/vue'
import { wrapEffect } from 'ez-web-audio'
import { ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import VolumeWarning from './kit/VolumeWarning.vue'

const error = ref('')
const playing = ref(false)
const distortionEnabled = ref(false)
const distortionAmount = ref(400)
const wetDryMix = ref(0.7)
const bypassed = ref(false)

const cleanup = useCleanup()
const { getContext } = useAudioContext()
const { instance: oscillator, load: loadOsc, reset: resetOsc } = useOscillator()
let effect: EffectWrapper | null = null

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

async function togglePlayback() {
  try {
    error.value = ''

    if (playing.value) {
      // Stop
      oscillator.value?.stop()
      resetOsc()
      effect = null
      playing.value = false
      distortionEnabled.value = false
    }
    else {
      // Play
      const osc = cleanup.register(await loadOsc({
        frequency: 200,
        type: 'sine',
      }))
      osc.changeGainTo(0.3)
      osc.play()
      playing.value = true
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to toggle playback'
  }
}

async function toggleDistortion() {
  if (!oscillator.value)
    return

  try {
    error.value = ''
    const ctx = await getContext()

    if (distortionEnabled.value) {
      // Remove effect
      if (effect)
        oscillator.value.removeEffect(effect)
      effect = null
      distortionEnabled.value = false
    }
    else {
      // Create and add WaveShaper effect
      const distNode = ctx.createWaveShaper()
      distNode.curve = makeDistortionCurve(distortionAmount.value)
      distNode.oversample = '4x'

      effect = wrapEffect(distNode)
      effect.mix = wetDryMix.value
      oscillator.value.addEffect(effect)
      distortionEnabled.value = true
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to toggle distortion'
  }
}

function updateDistortionCurve() {
  if (!effect)
    return

  try {
    error.value = ''
    // Update the WaveShaper curve
    const newCurve = makeDistortionCurve(distortionAmount.value)

    // Access the underlying distortion node via the public .effect accessor on EffectWrapper.
    // effect.effect returns the original WaveShaperNode passed to wrapEffect().
    if (effect.effect && effect.effect.curve !== undefined) {
      effect.effect.curve = newCurve
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update curve'
  }
}

function updateMix() {
  if (!effect)
    return
  effect.mix = wetDryMix.value
}

function updateBypass() {
  if (!effect)
    return
  effect.bypass = bypassed.value
}

function formatAmount(v: number) {
  return String(Math.round(v))
}

function formatMix(v: number) {
  return `${Math.round(v * 100)}%`
}

// Recompute the WaveShaper curve / mix reactively as the sliders move
// (mirrors the previous @input-on-native-range wiring, now driven by
// ParameterSlider's v-model).
watch(distortionAmount, updateDistortionCurve)
watch(wetDryMix, updateMix)
</script>

<template>
  <DemoFrame class="distortion-demo" :error="error" takeaway="Effects wrap and route automatically.">
    <VolumeWarning />

    <!-- Signal Chain Visualization -->
    <div class="signal-chain" role="img" aria-label="Signal chain: Oscillator → Distortion → Gain → Pan → Destination">
      <div class="chain-node">
        <div class="node-label">
          Source
        </div>
        <div class="node-box source">
          Oscillator
        </div>
      </div>
      <div class="chain-arrow">
        →
      </div>
      <div class="chain-node">
        <div class="node-label">
          Effect
        </div>
        <div class="node-box effect" :class="{ active: distortionEnabled, bypassed }">
          Distortion
        </div>
      </div>
      <div class="chain-arrow">
        →
      </div>
      <div class="chain-node">
        <div class="node-label">
          Control
        </div>
        <div class="node-box">
          Gain
        </div>
      </div>
      <div class="chain-arrow">
        →
      </div>
      <div class="chain-node">
        <div class="node-label">
          Control
        </div>
        <div class="node-box">
          Pan
        </div>
      </div>
      <div class="chain-arrow">
        →
      </div>
      <div class="chain-node">
        <div class="node-label">
          Output
        </div>
        <div class="node-box output">
          Destination
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="row row-top">
        <PlayButton
          class="play-button"
          :playing="playing"
          label="Play Oscillator"
          playing-label="Stop Oscillator"
          @click="togglePlayback"
        />
        <button
          type="button"
          class="distortion-toggle-btn"
          :class="{ active: distortionEnabled }"
          :disabled="!playing"
          @click="toggleDistortion"
        >
          {{ distortionEnabled ? 'Remove Distortion' : 'Add Distortion' }}
        </button>
      </div>

      <div v-if="distortionEnabled" class="effect-controls">
        <ParameterSlider
          id="distortion-amount"
          v-model="distortionAmount"
          label="Distortion Amount"
          :min="50"
          :max="1000"
          :step="50"
          :format="formatAmount"
        />

        <ParameterSlider
          id="wet-dry-mix"
          v-model="wetDryMix"
          label="Wet/Dry Mix"
          :min="0"
          :max="1"
          :step="0.1"
          :format="formatMix"
        />

        <label class="bypass-row">
          <input v-model="bypassed" type="checkbox" @change="updateBypass">
          Bypass Effect
        </label>
      </div>
    </div>

    <p class="hint">
      <strong>Tip:</strong> Try different distortion amounts and mix levels. The bypass toggle lets you A/B compare the processed vs unprocessed signal.
    </p>
  </DemoFrame>
</template>

<style scoped>
/* Signal Chain */
.signal-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1.25rem;
  background: var(--ewa-well);
  border-radius: 8px;
  margin-bottom: 20px;
}

.chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.node-label {
  font-size: 0.7rem;
  color: var(--ewa-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-box {
  padding: 0.65rem 1rem;
  border-radius: 8px;
  border: 1.5px solid var(--ewa-line-2);
  background: var(--ewa-panel);
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text);
  min-width: 80px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.node-box.source,
.node-box.output {
  border-color: var(--ewa-accent);
  color: var(--ewa-accent-ink);
}

.node-box.effect.active {
  border-color: var(--ewa-accent);
  background: var(--ewa-accent-soft);
  color: var(--ewa-accent-ink);
  box-shadow: 0 0 0 3px var(--ewa-accent-soft);
}

.node-box.effect.bypassed {
  opacity: 0.5;
  border-style: dashed;
}

.chain-arrow {
  font-size: 1.25rem;
  color: var(--ewa-text-3);
  font-weight: 300;
}

/* Controls */
.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.distortion-toggle-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1.5px solid var(--ewa-accent);
  background: transparent;
  color: var(--ewa-accent-ink);
  font-weight: 600;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}

.distortion-toggle-btn:hover:not(:disabled) {
  background: var(--ewa-accent-soft);
}

.distortion-toggle-btn.active {
  background: var(--ewa-accent);
  border-color: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

.distortion-toggle-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  border-color: var(--ewa-line);
  color: var(--ewa-text-3);
}

.distortion-toggle-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.effect-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  background: var(--ewa-well);
  border-radius: 8px;
}

.bypass-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--ewa-text-2);
  cursor: pointer;
}

.bypass-row input[type='checkbox'] {
  accent-color: var(--ewa-accent);
  width: 16px;
  height: 16px;
}

/* Hint */
.hint {
  margin: 0;
  padding: 0.75rem;
  background: var(--ewa-well);
  border-left: 3px solid var(--ewa-accent);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--ewa-text-2);
}

.hint strong {
  color: var(--ewa-accent-ink);
}

@media (max-width: 640px) {
  .row-top {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

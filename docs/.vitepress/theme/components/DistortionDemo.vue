<template>
  <div class="distortion-demo">
    <div v-if="error" class="error">{{ error }}</div>

    <!-- Signal Chain Visualization -->
    <div class="signal-chain">
      <div class="chain-node">
        <div class="node-label">Source</div>
        <div class="node-box source">Oscillator</div>
      </div>
      <div class="chain-arrow">→</div>
      <div class="chain-node">
        <div class="node-label">Effect</div>
        <div class="node-box effect" :class="{ active: distortionEnabled, bypassed }">
          Distortion
        </div>
      </div>
      <div class="chain-arrow">→</div>
      <div class="chain-node">
        <div class="node-label">Control</div>
        <div class="node-box">Gain</div>
      </div>
      <div class="chain-arrow">→</div>
      <div class="chain-node">
        <div class="node-label">Control</div>
        <div class="node-box">Pan</div>
      </div>
      <div class="chain-arrow">→</div>
      <div class="chain-node">
        <div class="node-label">Output</div>
        <div class="node-box output">Destination</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="button-group">
        <button @click="togglePlayback" class="demo-btn" :class="{ active: playing }">
          {{ playing ? 'Stop' : 'Play' }} Oscillator
        </button>
        <button
          @click="toggleDistortion"
          :disabled="!playing"
          class="demo-btn"
          :class="{ active: distortionEnabled }"
        >
          {{ distortionEnabled ? 'Remove' : 'Add' }} Distortion
        </button>
      </div>

      <div v-if="distortionEnabled" class="effect-controls">
        <label class="slider-control">
          <span class="control-label">Distortion Amount:</span>
          <input
            type="range"
            v-model.number="distortionAmount"
            min="50"
            max="1000"
            step="50"
            @input="updateDistortionCurve"
          />
          <span class="control-value">{{ distortionAmount }}</span>
        </label>

        <label class="slider-control">
          <span class="control-label">Wet/Dry Mix:</span>
          <input
            type="range"
            v-model.number="wetDryMix"
            min="0"
            max="1"
            step="0.1"
            @input="updateMix"
          />
          <span class="control-value">{{ Math.round(wetDryMix * 100) }}%</span>
        </label>

        <label class="checkbox-control">
          <input type="checkbox" v-model="bypassed" @change="updateBypass" />
          <span>Bypass Effect</span>
        </label>
      </div>
    </div>

    <div class="hint">
      <strong>Tip:</strong> Try different distortion amounts and mix levels. The bypass toggle lets you A/B compare the processed vs unprocessed signal.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const error = ref('')
const playing = ref(false)
const distortionEnabled = ref(false)
const distortionAmount = ref(400)
const wetDryMix = ref(0.7)
const bypassed = ref(false)

let lib: any = null
let oscillator: any = null
let effect: any = null

async function initIfNeeded() {
  if (!lib) {
    lib = await import('ez-web-audio')
    await lib.initAudio()
  }
}

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
      if (oscillator) {
        oscillator.stop()
        oscillator = null
      }
      if (effect) {
        effect = null
      }
      playing.value = false
      distortionEnabled.value = false
    } else {
      // Play
      await initIfNeeded()
      oscillator = await lib.createOscillator({
        frequency: 200,
        type: 'sawtooth'
      })
      oscillator.changeGainTo(0.3)
      oscillator.play()
      playing.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to toggle playback'
  }
}

async function toggleDistortion() {
  if (!oscillator) return

  try {
    error.value = ''
    await initIfNeeded()
    const ctx = await lib.getAudioContext()

    if (distortionEnabled.value) {
      // Remove effect
      oscillator.removeEffect(effect)
      effect = null
      distortionEnabled.value = false
    } else {
      // Create and add WaveShaper effect
      const distNode = ctx.createWaveShaper()
      distNode.curve = makeDistortionCurve(distortionAmount.value)
      distNode.oversample = '4x'

      effect = lib.wrapEffect(ctx, distNode)
      effect.mix = wetDryMix.value
      oscillator.addEffect(effect)
      distortionEnabled.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to toggle distortion'
  }
}

function updateDistortionCurve() {
  if (!effect || !lib) return

  try {
    // Update the WaveShaper curve
    const ctx = lib.getAudioContext()
    const newCurve = makeDistortionCurve(distortionAmount.value)

    // Access the underlying distortion node
    // wrapEffect returns { input, output, bypass, mix, node }
    if (effect.input && effect.input.curve !== undefined) {
      effect.input.curve = newCurve
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update curve'
  }
}

function updateMix() {
  if (!effect) return
  effect.mix = wetDryMix.value
}

function updateBypass() {
  if (!effect) return
  effect.bypass = bypassed.value
}

onUnmounted(() => {
  if (oscillator) {
    try { oscillator.stop() } catch {}
  }
})
</script>

<style scoped>
.distortion-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

/* Signal Chain */
.signal-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.node-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-box {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  min-width: 80px;
  text-align: center;
  transition: all 0.3s;
}

.node-box.source {
  border-color: var(--vp-c-brand-light);
  color: var(--vp-c-brand);
}

.node-box.output {
  border-color: var(--vp-c-brand-light);
  color: var(--vp-c-brand);
}

.node-box.effect.active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  box-shadow: 0 0 10px var(--vp-c-brand-soft);
}

.node-box.effect.bypassed {
  opacity: 0.4;
  border-style: dashed;
}

.chain-arrow {
  font-size: 1.5rem;
  color: var(--vp-c-text-3);
  font-weight: 300;
}

/* Controls */
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.demo-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: 2px solid var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover:not(:disabled) {
  background: var(--vp-c-brand);
  color: white;
}

.demo-btn.active {
  background: var(--vp-c-brand);
  color: white;
}

.demo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.effect-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
}

.control-label {
  min-width: 150px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.slider-control input[type="range"] {
  flex: 1;
  min-width: 120px;
}

.control-value {
  min-width: 50px;
  text-align: right;
  font-weight: 600;
  color: var(--vp-c-brand);
}

.checkbox-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.checkbox-control input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Hint */
.hint {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--vp-c-bg);
  border-left: 3px solid var(--vp-c-brand);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.hint strong {
  color: var(--vp-c-brand);
}

.error {
  color: var(--vp-c-danger);
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  border-radius: 6px;
  font-size: 0.9rem;
}
</style>

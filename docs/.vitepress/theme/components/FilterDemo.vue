<template>
  <div class="filter-demo">
    <div v-if="error" class="error">{{ error }}</div>

    <div class="controls">
      <div class="control-group">
        <div class="row">
          <label>Source Type:</label>
          <div class="button-group">
            <button
              :class="{ active: sourceType === 'oscillator' }"
              @click="sourceType = 'oscillator'"
              :disabled="playing"
            >
              Oscillator
            </button>
            <button
              :class="{ active: sourceType === 'noise' }"
              @click="sourceType = 'noise'"
              :disabled="playing"
            >
              White Noise
            </button>
          </div>
          <button
            class="play-button"
            @click="togglePlayback"
            :disabled="loading"
          >
            {{ playing ? 'Stop' : 'Play' }}
          </button>
        </div>
      </div>

      <div class="control-group">
        <div class="row">
          <label for="filter-type">Filter Type:</label>
          <select id="filter-type" v-model="filterType" :disabled="!playing">
            <option value="lowpass">Lowpass</option>
            <option value="highpass">Highpass</option>
            <option value="bandpass">Bandpass</option>
            <option value="notch">Notch</option>
            <option value="lowshelf">Low Shelf</option>
            <option value="highshelf">High Shelf</option>
            <option value="peaking">Peaking</option>
            <option value="allpass">Allpass</option>
          </select>
        </div>

        <div class="row">
          <label for="frequency">Frequency:</label>
          <input
            id="frequency"
            type="range"
            min="0"
            max="100"
            v-model.number="frequencySlider"
            :disabled="!playing"
          />
          <span class="value">{{ Math.round(frequency) }} Hz</span>
        </div>

        <div class="row">
          <label for="q">Resonance (Q):</label>
          <input
            id="q"
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            v-model.number="q"
            :disabled="!playing"
          />
          <span class="value">{{ q.toFixed(1) }}</span>
        </div>

        <div v-if="showGainControl" class="row">
          <label for="filter-gain">Gain:</label>
          <input
            id="filter-gain"
            type="range"
            min="-24"
            max="24"
            step="0.5"
            v-model.number="filterGain"
            :disabled="!playing"
          />
          <span class="value">{{ filterGain > 0 ? '+' : '' }}{{ filterGain.toFixed(1) }} dB</span>
        </div>

        <div class="row">
          <label>
            <input type="checkbox" v-model="bypassed" :disabled="!playing" />
            Bypass filter
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const initialized = ref(false)
const playing = ref(false)
const loading = ref(false)
const error = ref('')

const filterType = ref<BiquadFilterType>('lowpass')
const frequencySlider = ref(50) // 0-100 for logarithmic mapping
const q = ref(1)
const filterGain = ref(0)
const bypassed = ref(false)
const sourceType = ref<'oscillator' | 'noise'>('oscillator')

let lib: any = null
let source: any = null
let filter: any = null

// Logarithmic frequency mapping: 20 Hz to 20,000 Hz
const frequency = computed(() => {
  return 20 * Math.pow(1000, frequencySlider.value / 100)
})

// Show gain control only for shelf and peaking filters
const showGainControl = computed(() => {
  return ['lowshelf', 'highshelf', 'peaking'].includes(filterType.value)
})

async function togglePlayback() {
  if (playing.value) {
    stopSound()
  } else {
    await playSound()
  }
}

async function playSound() {
  if (loading.value) return

  try {
    loading.value = true
    error.value = ''

    // Dynamically import library
    if (!lib) {
      lib = await import('ez-web-audio')
      await lib.initAudio()
      initialized.value = true
    }

    const ctx = await lib.getAudioContext()

    // Create source based on selected type
    if (sourceType.value === 'oscillator') {
      source = lib.createOscillator(200, 'sawtooth')
      source.update('gain').to(0.3).from('ratio')
    } else {
      // White noise using buffer with random values
      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
      source = lib.createSound(noiseBuffer)
      source.update('gain').to(0.15).from('ratio')
      source.loop = true
    }

    // Create filter
    filter = lib.createFilterEffect(ctx, filterType.value, {
      frequency: frequency.value,
      q: q.value,
      gain: filterGain.value
    })

    // Add filter to source
    source.addEffect(filter)

    // Play source
    source.play()
    playing.value = true
  } catch (err: any) {
    error.value = err.message || 'Failed to play audio'
    console.error('FilterDemo error:', err)
  } finally {
    loading.value = false
  }
}

function stopSound() {
  if (source) {
    source.stop()
    source = null
    filter = null
  }
  playing.value = false
}

// Watch filter parameters and update in real-time
watch(filterType, async (newType) => {
  if (!playing.value || !filter || !source) return

  try {
    const ctx = await lib.getAudioContext()

    // Remove old filter
    source.removeEffect(filter)

    // Create new filter with new type
    filter = lib.createFilterEffect(ctx, newType, {
      frequency: frequency.value,
      q: q.value,
      gain: filterGain.value
    })
    filter.bypass = bypassed.value

    // Add new filter
    source.addEffect(filter)
    source.rewireEffects()
  } catch (err) {
    console.error('Error changing filter type:', err)
  }
})

watch(frequency, (newFreq) => {
  if (filter) {
    filter.frequency = newFreq
  }
})

watch(q, (newQ) => {
  if (filter) {
    filter.q = newQ
  }
})

watch(filterGain, (newGain) => {
  if (filter) {
    filter.gain = newGain
  }
})

watch(bypassed, (newBypassed) => {
  if (filter && source) {
    filter.bypass = newBypassed
    source.rewireEffects()
  }
})

onUnmounted(() => {
  stopSound()
})
</script>

<style scoped>
.filter-demo {
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  margin: 1.5rem 0;
}

.error {
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-radius: 4px;
  font-size: 0.9em;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

label {
  min-width: 140px;
  font-weight: 500;
  font-size: 0.9em;
}

select {
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9em;
  min-width: 140px;
}

input[type="range"] {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

input[type="checkbox"] {
  min-width: auto;
  margin-right: 0.5rem;
}

.value {
  min-width: 80px;
  font-family: monospace;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  font-weight: 600;
}

.play-button {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-weight: 600;
  min-width: 80px;
}

.play-button:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

@media (max-width: 640px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }

  label {
    min-width: auto;
  }

  input[type="range"] {
    width: 100%;
    max-width: 100%;
  }

  .button-group {
    width: 100%;
  }

  .button-group button {
    flex: 1;
  }
}
</style>

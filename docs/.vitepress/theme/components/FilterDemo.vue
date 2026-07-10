<script setup lang="ts">
import type { FilterEffect, Oscillator, Sound } from 'ez-web-audio'
import { useCleanup } from '@ez-web-audio/vue'
import { createFilterEffect, createOscillator, createWhiteNoise } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import Knob from './kit/Knob.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import PresetSelector from './kit/PresetSelector.vue'
import VolumeWarning from './kit/VolumeWarning.vue'

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

const cleanup = useCleanup()

let source: Sound | Oscillator | null = null
let filter: FilterEffect | null = null

// Logarithmic frequency mapping: 20 Hz to 20,000 Hz
const frequency = computed(() => {
  return 20 * 1000 ** (frequencySlider.value / 100)
})

// Show gain control only for shelf and peaking filters
const showGainControl = computed(() => {
  return ['lowshelf', 'highshelf', 'peaking'].includes(filterType.value)
})

const sourceOptions = [
  { label: 'Oscillator', value: 'oscillator' },
  { label: 'White Noise', value: 'noise' },
]

// PresetSelector's v-model is typed as a generic string; this narrows it
// back to the union type without changing any playback logic.
const sourceModel = computed<string>({
  get: () => sourceType.value,
  set: (v) => { sourceType.value = v as typeof sourceType.value },
})

async function togglePlayback() {
  if (playing.value) {
    stopSound()
  }
  else {
    await playSound()
  }
}

async function playSound() {
  if (loading.value)
    return

  try {
    loading.value = true
    error.value = ''
    initialized.value = true

    // Create source based on selected type
    if (sourceType.value === 'oscillator') {
      source = cleanup.register(await createOscillator({ frequency: 200, type: 'sawtooth' }))
      source.update('gain').to(0.3).as('ratio')
    }
    else {
      // White noise
      source = cleanup.register(await createWhiteNoise())
      source.changeGainTo(0.15)
    }

    // Create filter
    filter = createFilterEffect(filterType.value, {
      frequency: frequency.value,
      q: q.value,
      gain: filterGain.value,
    })

    // Add filter to source
    source.addEffect(filter)

    // Play source
    source.play()
    playing.value = true
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to play audio'
  }
  finally {
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
  if (!playing.value || !filter || !source)
    return

  try {
    // Remove old filter
    source.removeEffect(filter)

    // Create new filter with new type
    filter = createFilterEffect(newType, {
      frequency: frequency.value,
      q: q.value,
      gain: filterGain.value,
    })
    filter.bypass = bypassed.value

    // Add new filter
    source.addEffect(filter)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error changing filter type'
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
  if (filter) {
    filter.bypass = newBypassed
  }
})

onUnmounted(() => {
  stopSound()
})

function formatCutoff(v: number) {
  return `${Math.round(20 * 1000 ** (v / 100))} Hz`
}

function formatQ(v: number) {
  return v.toFixed(1)
}

function formatFilterGain(v: number) {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`
}
</script>

<template>
  <DemoFrame class="filter-demo" :error="error" takeaway="Synthesizers are oscillators plus filters.">
    <VolumeWarning />

    <div class="controls">
      <div class="row row-top">
        <PresetSelector
          v-model="sourceModel"
          label="Source Type"
          :options="sourceOptions"
          :disabled="playing"
        />

        <PlayButton class="play-button" :playing="playing" :loading="loading" @click="togglePlayback" />
      </div>

      <div class="row">
        <label for="filter-type" class="filter-type-label">Filter Type</label>
        <select id="filter-type" v-model="filterType" class="filter-type-select" :disabled="!playing">
          <option value="lowpass">
            Lowpass
          </option>
          <option value="highpass">
            Highpass
          </option>
          <option value="bandpass">
            Bandpass
          </option>
          <option value="notch">
            Notch
          </option>
          <option value="lowshelf">
            Low Shelf
          </option>
          <option value="highshelf">
            High Shelf
          </option>
          <option value="peaking">
            Peaking
          </option>
          <option value="allpass">
            Allpass
          </option>
        </select>
      </div>

      <div class="sliders">
        <ParameterSlider
          id="frequency"
          v-model="frequencySlider"
          label="Cutoff Frequency"
          :min="0"
          :max="100"
          :format="formatCutoff"
          :disabled="!playing"
        />

        <Knob
          v-model="q"
          label="Resonance (Q)"
          :min="0.1"
          :max="20"
          :step="0.1"
          :format="formatQ"
          :disabled="!playing"
          :size="72"
        />

        <ParameterSlider
          v-if="showGainControl"
          id="filter-gain"
          v-model="filterGain"
          label="Gain"
          :min="-24"
          :max="24"
          :step="0.5"
          :format="formatFilterGain"
          :disabled="!playing"
        />
      </div>

      <label class="bypass-row" :class="{ 'bypass-row--disabled': !playing }">
        <input v-model="bypassed" type="checkbox" :disabled="!playing">
        Bypass filter
      </label>
    </div>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.row-top {
  justify-content: space-between;
}

.filter-type-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text-2);
}

.filter-type-select {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text);
  font-size: 0.9em;
  min-width: 160px;
}

.filter-type-select:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.filter-type-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sliders {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

.sliders > * {
  flex: 1;
  min-width: 200px;
}

.bypass-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--ewa-text-2);
  cursor: pointer;
}

.bypass-row--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bypass-row input[type='checkbox'] {
  accent-color: var(--ewa-accent);
  width: 16px;
  height: 16px;
}

@media (max-width: 640px) {
  .row-top {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

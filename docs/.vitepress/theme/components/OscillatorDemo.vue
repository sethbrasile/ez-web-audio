<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

const loading = ref(false)
const playing = ref(false)
const error = ref('')
const waveType = ref<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine')
const frequency = ref(440)
const gain = ref(0.3)

let oscillator: any = null

const noteName = computed(() => {
  // Simple frequency to note approximation
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const a4 = 440
  const semitones = 12 * Math.log2(frequency.value / a4)
  const noteIndex = Math.round(semitones + 9) % 12 // A is index 9
  const octave = Math.floor((Math.round(semitones + 9) + 48) / 12)
  return `${notes[noteIndex < 0 ? noteIndex + 12 : noteIndex]}${octave}`
})

async function toggle() {
  if (playing.value) {
    stop()
  }
  else {
    await play()
  }
}

async function play() {
  try {
    error.value = ''
    loading.value = true

    const { createOscillator } = await import('ez-web-audio')

    oscillator = await createOscillator({
      frequency: frequency.value,
      type: waveType.value,
    })
    oscillator.changeGainTo(gain.value)
    oscillator.play()
    playing.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play oscillator'
  }
  finally {
    loading.value = false
  }
}

function stop() {
  if (oscillator) {
    try { oscillator.stop() }
    catch {}
    oscillator = null
  }
  playing.value = false
}

// Update oscillator parameters while playing
// Frequency and gain update in real-time without audio gaps
watch(frequency, (v) => {
  if (playing.value && oscillator)
    oscillator.update('frequency').to(v).as('ratio')
})
watch(gain, (v) => {
  if (playing.value && oscillator)
    oscillator.changeGainTo(v)
})
// waveType requires stop/recreate — Web Audio API OscillatorNode.type cannot change after start
watch(waveType, async () => {
  if (playing.value) {
    stop()
    await play()
  }
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="oscillator-demo">
    <div class="warning">
      <strong>Note:</strong> Oscillators can be loud. Start with low volume.
    </div>

    <div class="controls">
      <button :class="{ active: playing }" :disabled="loading" class="play-btn" @click="toggle">
        {{ loading ? 'Loading...' : (playing ? 'Stop' : 'Play') }}
      </button>

      <div class="params">
        <label for="waveform-select">
          Waveform:
          <select id="waveform-select" v-model="waveType" :disabled="loading">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </label>

        <label for="frequency-slider">
          Frequency: {{ frequency }}Hz
          <input
            id="frequency-slider"
            v-model.number="frequency"
            type="range"
            min="100"
            max="1000"
            step="10"
            :aria-label="`Frequency: ${frequency} Hz`"
          >
        </label>

        <label for="volume-slider">
          Volume: {{ Math.round(gain * 100) }}%
          <input
            id="volume-slider"
            v-model.number="gain"
            type="range"
            min="0"
            max="1"
            step="0.1"
            :aria-label="`Volume: ${Math.round(gain * 100)}%`"
          >
        </label>
      </div>
    </div>

    <div class="note-display">
      {{ noteName }}
    </div>

    <slot />

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.oscillator-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.play-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 80px;
}

.play-btn:hover {
  background: var(--vp-c-brand-dark);
}

.play-btn.active {
  background: var(--vp-c-danger);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.params {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.params label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.params select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.params input[type="range"] {
  width: 150px;
}

.note-display {
  margin-top: 1rem;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--vp-c-brand);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}

.warning {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-warning-soft);
  border-left: 3px solid var(--vp-c-warning);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.warning strong {
  color: var(--vp-c-warning);
}
</style>

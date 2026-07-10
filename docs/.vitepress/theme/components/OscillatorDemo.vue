<script setup lang="ts">
import { useCleanup, useOscillator } from '@ez-web-audio/vue'
import { computed, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import VolumeWarning from './kit/VolumeWarning.vue'
import WaveformSelector from './kit/WaveformSelector.vue'

const loading = ref(false)
const playing = ref(false)
const error = ref('')
const waveType = ref<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine')
const frequency = ref(440)
const gain = ref(0.3)

const cleanup = useCleanup()
const { instance: oscillator, load: loadOsc, reset: resetOsc } = useOscillator()

// WaveformSelector's v-model is typed as a generic string; this narrows it
// back to the union type without changing any playback logic.
const waveformModel = computed<string>({
  get: () => waveType.value,
  set: (v) => { waveType.value = v as typeof waveType.value },
})

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

    const osc = cleanup.register(await loadOsc({
      frequency: frequency.value,
      type: waveType.value,
    }))
    osc.changeGainTo(gain.value)
    osc.play()
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
  if (oscillator.value) {
    try { oscillator.value.stop() }
    catch {}
    resetOsc()
  }
  playing.value = false
}

// Update oscillator parameters while playing
// Frequency and gain update in real-time without audio gaps
watch(frequency, (v) => {
  if (playing.value && oscillator.value)
    oscillator.value.update('frequency').to(v).as('ratio')
})
watch(gain, (v) => {
  if (playing.value && oscillator.value)
    oscillator.value.changeGainTo(v)
})
// waveType requires stop/recreate — Web Audio API OscillatorNode.type cannot change after start
watch(waveType, async () => {
  if (playing.value) {
    stop()
    await play()
  }
})

function formatHz(v: number) {
  return `${Math.round(v)} Hz`
}

function formatGain(v: number) {
  return `${Math.round(v * 100)}%`
}
</script>

<template>
  <DemoFrame class="oscillator-demo" :error="error" takeaway="An oscillator is a synthesizer's raw voice.">
    <VolumeWarning />

    <div class="controls">
      <PlayButton :playing="playing" :loading="loading" @click="toggle" />

      <div class="params">
        <WaveformSelector v-model="waveformModel" :disabled="loading" />

        <ParameterSlider
          id="frequency-slider"
          v-model="frequency"
          label="Frequency"
          :min="100"
          :max="1000"
          :step="10"
          :format="formatHz"
          :disabled="loading"
        />

        <ParameterSlider
          id="volume-slider"
          v-model="gain"
          label="Volume"
          :min="0"
          :max="1"
          :step="0.1"
          :format="formatGain"
          :disabled="loading"
        />
      </div>
    </div>

    <div class="note-display">
      {{ noteName }}
    </div>

    <slot />
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

.params {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  flex: 1;
}

.params > * {
  flex: 1;
  min-width: 180px;
}

.note-display {
  margin-top: 16px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ewa-accent-ink);
}
</style>

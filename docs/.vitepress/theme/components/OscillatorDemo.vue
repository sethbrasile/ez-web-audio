<template>
  <div class="oscillator-demo">
    <div class="controls">
      <button @click="toggle" :class="{ active: playing }" class="play-btn">
        {{ playing ? 'Stop' : 'Play' }}
      </button>

      <div class="params">
        <label>
          Waveform:
          <select v-model="waveType">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </label>

        <label>
          Frequency: {{ frequency }}Hz
          <input type="range" v-model.number="frequency" min="100" max="1000" step="10" />
        </label>

        <label>
          Volume: {{ Math.round(gain * 100) }}%
          <input type="range" v-model.number="gain" min="0" max="1" step="0.1" />
        </label>
      </div>
    </div>

    <div class="note-display">
      {{ noteName }}
    </div>

    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const playing = ref(false)
const waveType = ref<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine')
const frequency = ref(440)
const gain = ref(0.5)

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
  } else {
    await play()
  }
}

async function play() {
  try {
    const { createOscillator } = await import('ez-web-audio')

    oscillator = await createOscillator({
      frequency: frequency.value,
      type: waveType.value
    })
    oscillator.changeGainTo(gain.value)
    oscillator.play()
    playing.value = true
  } catch (e) {
    console.error('Failed to play oscillator:', e)
  }
}

function stop() {
  if (oscillator) {
    try { oscillator.stop() } catch {}
    oscillator = null
  }
  playing.value = false
}

// Update oscillator parameters while playing
watch([frequency, gain, waveType], async () => {
  if (playing.value && oscillator) {
    stop()
    await play()
  }
})

onUnmounted(() => {
  stop()
})
</script>

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
</style>

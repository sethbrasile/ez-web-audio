<script setup lang="ts">
import type { Oscillator } from 'ez-web-audio'
import { onUnmounted, ref } from 'vue'
import PianoKeyboard from './PianoKeyboard.vue'

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

interface EnvelopeConfig {
  attack: number
  decay: number
  sustain: number
  release: number
}

const waveType = ref<OscillatorType>('triangle')
const envelope = ref<EnvelopeConfig>({
  attack: 0.01,
  decay: 0.3,
  sustain: 0.4,
  release: 0.5,
})
const masterGain = ref(0.3)
const activeNotes = ref(new Set<string>())
const error = ref('')

// Track active oscillators by note name
const oscillators = new Map<string, Oscillator>()

// ADSR presets
const presets: Record<string, EnvelopeConfig> = {
  piano: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.8 },
  pad: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 },
  pluck: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  lead: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 },
}

function applyPreset(presetName: string) {
  const preset = presets[presetName]
  if (preset) {
    envelope.value = { ...preset }
  }
}

async function handleNoteOn(note: string) {
  try {
    error.value = ''

    // Import frequencyMap and createOscillator
    const { createOscillator, frequencyMap } = await import('ez-web-audio')

    // Get frequency for the note
    const frequency = frequencyMap[note as keyof typeof frequencyMap]
    if (!frequency) {
      console.warn(`No frequency found for note: ${note}`)
      return
    }

    // Stop existing oscillator for this note if playing
    if (oscillators.has(note)) {
      const existing = oscillators.get(note)
      try { existing.stop() }
      catch {}
      oscillators.delete(note)
    }

    // Create and start new oscillator
    const oscillator = await createOscillator({
      frequency,
      type: waveType.value,
      envelope: { ...envelope.value },
    })

    oscillator.changeGainTo(masterGain.value)
    oscillator.play()

    oscillators.set(note, oscillator)
    activeNotes.value.add(note)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play note'
    console.error('Error playing note:', e)
  }
}

function handleNoteOff(note: string) {
  const oscillator = oscillators.get(note)
  if (oscillator) {
    // Remove from active UI immediately so key appears released
    activeNotes.value.delete(note)
    // Remove from map immediately so re-pressing the key creates a fresh oscillator
    oscillators.delete(note)
    try {
      // stop() respects the ADSR release phase — the release tail plays fully
      // even though we've already removed the oscillator from the map
      oscillator.stop()
    }
    catch (e) {
      console.error('Error stopping oscillator:', e)
    }
  }
  else {
    activeNotes.value.delete(note)
  }
}

onUnmounted(() => {
  // Stop all active oscillators
  for (const oscillator of oscillators.values()) {
    try { oscillator.stop() }
    catch {}
  }
  oscillators.clear()
  activeNotes.value.clear()
})
</script>

<template>
  <div class="synth-keyboard">
    <div class="volume-warning">
      <strong>Volume Warning:</strong> Oscillators can be loud. Start with low system volume.
    </div>

    <div class="controls-section">
      <div class="control-row">
        <label>
          Waveform:
          <select v-model="waveType">
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
          </select>
        </label>

        <label>
          Volume: {{ Math.round(masterGain * 100) }}%
          <input v-model.number="masterGain" type="range" min="0" max="1" step="0.01" aria-label="Master volume">
        </label>
      </div>

      <div class="preset-row">
        <span class="preset-label">ADSR Presets:</span>
        <button class="preset-btn" aria-label="Apply piano preset" @click="applyPreset('piano')">
          Piano
        </button>
        <button class="preset-btn" aria-label="Apply pad preset" @click="applyPreset('pad')">
          Pad
        </button>
        <button class="preset-btn" aria-label="Apply pluck preset" @click="applyPreset('pluck')">
          Pluck
        </button>
        <button class="preset-btn" aria-label="Apply lead preset" @click="applyPreset('lead')">
          Lead
        </button>
      </div>

      <div class="adsr-row">
        <label>
          Attack: {{ envelope.attack.toFixed(2) }}s
          <input v-model.number="envelope.attack" type="range" min="0" max="2" step="0.01">
        </label>

        <label>
          Decay: {{ envelope.decay.toFixed(2) }}s
          <input v-model.number="envelope.decay" type="range" min="0" max="2" step="0.01">
        </label>

        <label>
          Sustain: {{ envelope.sustain.toFixed(2) }}
          <input v-model.number="envelope.sustain" type="range" min="0" max="1" step="0.01">
        </label>

        <label>
          Release: {{ envelope.release.toFixed(2) }}s
          <input v-model.number="envelope.release" type="range" min="0" max="3" step="0.01">
        </label>
      </div>
    </div>

    <PianoKeyboard
      :active-keys="activeNotes"
      @note-on="handleNoteOn"
      @note-off="handleNoteOff"
    />

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.synth-keyboard {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger);
  border-radius: 6px;
  font-size: 0.9rem;
}

.volume-warning {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-warning-soft);
  border: 1px solid var(--vp-c-warning);
  border-radius: 4px;
  color: var(--vp-c-warning-text);
  font-size: 0.85rem;
}

.controls-section {
  margin-bottom: 1.5rem;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.control-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.control-row select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.control-row input[type="range"] {
  width: 150px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.preset-label {
  font-size: 0.9rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

.preset-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.preset-btn:active {
  transform: translateY(1px);
}

.adsr-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.adsr-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.adsr-row input[type="range"] {
  width: 100%;
}
</style>

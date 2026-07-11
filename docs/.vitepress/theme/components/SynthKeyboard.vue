<script setup lang="ts">
import type { Oscillator } from 'ez-web-audio'
import { createOscillator, frequencyMap } from 'ez-web-audio'
import { computed, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PresetSelector from './kit/PresetSelector.vue'
import VolumeWarning from './kit/VolumeWarning.vue'
import WaveformSelector from './kit/WaveformSelector.vue'
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

const presetOptions = [
  { label: 'Piano', value: 'piano' },
  { label: 'Pad', value: 'pad' },
  { label: 'Pluck', value: 'pluck' },
  { label: 'Lead', value: 'lead' },
]

// Presentational only — tracks which preset button reads as selected. Does
// not feed back into audio; applyPreset() below is unchanged from before.
const selectedPreset = ref('')

function applyPreset(presetName: string) {
  const preset = presets[presetName]
  if (preset) {
    envelope.value = { ...preset }
  }
}

function selectPreset(presetName: string) {
  selectedPreset.value = presetName
  applyPreset(presetName)
}

async function handleNoteOn(note: string) {
  try {
    error.value = ''

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

function formatSeconds(v: number) {
  return `${v.toFixed(2)}s`
}

function formatRatio(v: number) {
  return v.toFixed(2)
}

function formatGain(v: number) {
  return `${Math.round(v * 100)}%`
}

// --- ADSR mini-curve — pure presentational SVG path derived from envelope
// state above. Attack/decay/release each get a proportional slot of the
// drawable width (scaled by their own slider range); sustain gets a fixed
// "hold" plateau since it has no duration, just a level.
const CURVE_PAD_X = 6
const CURVE_BASE_Y = 56
const CURVE_PEAK_Y = 8
const CURVE_DRAW_W = 220 - CURVE_PAD_X * 2
const ATTACK_SLOT = CURVE_DRAW_W * 0.22
const DECAY_SLOT = CURVE_DRAW_W * 0.18
const HOLD_SLOT = CURVE_DRAW_W * 0.24
const RELEASE_SLOT = CURVE_DRAW_W * 0.36
const ATTACK_MAX = 2
const DECAY_MAX = 2
const RELEASE_MAX = 3

const envelopeCurve = computed(() => {
  const { attack, decay, sustain, release } = envelope.value
  const x0 = CURVE_PAD_X
  const x1 = x0 + ATTACK_SLOT * Math.min(1, attack / ATTACK_MAX)
  const x2 = x1 + DECAY_SLOT * Math.min(1, decay / DECAY_MAX)
  const x3 = x2 + HOLD_SLOT
  const x4 = x3 + RELEASE_SLOT * Math.min(1, release / RELEASE_MAX)
  const sustainY = CURVE_BASE_Y - sustain * (CURVE_BASE_Y - CURVE_PEAK_Y)

  const line = `M ${x0} ${CURVE_BASE_Y} L ${x1} ${CURVE_PEAK_Y} L ${x2} ${sustainY} L ${x3} ${sustainY} L ${x4} ${CURVE_BASE_Y}`
  const area = `${line} L ${x0} ${CURVE_BASE_Y} Z`
  return { line, area }
})
</script>

<template>
  <DemoFrame class="synth-keyboard" :error="error" takeaway="ADSR envelopes shape a note's character.">
    <VolumeWarning>
      <strong>Volume Warning:</strong> Oscillators can be loud. Start with low system volume.
    </VolumeWarning>

    <div class="controls-section">
      <div class="control-row">
        <WaveformSelector v-model="waveType" />
        <ParameterSlider
          id="synth-keyboard-volume"
          v-model="masterGain"
          label="Volume"
          :min="0"
          :max="1"
          :step="0.01"
          :format="formatGain"
        />
      </div>

      <PresetSelector
        label="ADSR Presets"
        :model-value="selectedPreset"
        :options="presetOptions"
        @update:model-value="selectPreset"
      />

      <div class="envelope-section">
        <div class="adsr-row">
          <ParameterSlider
            id="synth-keyboard-attack"
            v-model="envelope.attack"
            label="Attack"
            :min="0"
            :max="2"
            :step="0.01"
            :format="formatSeconds"
          />
          <ParameterSlider
            id="synth-keyboard-decay"
            v-model="envelope.decay"
            label="Decay"
            :min="0"
            :max="2"
            :step="0.01"
            :format="formatSeconds"
          />
          <ParameterSlider
            id="synth-keyboard-sustain"
            v-model="envelope.sustain"
            label="Sustain"
            :min="0"
            :max="1"
            :step="0.01"
            :format="formatRatio"
          />
          <ParameterSlider
            id="synth-keyboard-release"
            v-model="envelope.release"
            label="Release"
            :min="0"
            :max="3"
            :step="0.01"
            :format="formatSeconds"
          />
        </div>

        <svg class="adsr-curve" width="220" height="64" viewBox="0 0 220 64" aria-hidden="true">
          <line class="adsr-curve__baseline" x1="6" y1="56" x2="214" y2="56" />
          <path class="adsr-curve__area" :d="envelopeCurve.area" />
          <path class="adsr-curve__line" :d="envelopeCurve.line" />
        </svg>
      </div>
    </div>

    <PianoKeyboard
      :active-keys="activeNotes"
      @note-on="handleNoteOn"
      @note-off="handleNoteOff"
    />
  </DemoFrame>
</template>

<style scoped>
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.control-row :deep(.ewa-slider) {
  min-width: 200px;
  flex: 1;
}

.envelope-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}

.adsr-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  flex: 1;
  min-width: 260px;
}

.adsr-curve {
  flex-shrink: 0;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  border-radius: 8px;
  padding: 4px;
}

.adsr-curve__baseline {
  stroke: var(--ewa-line-2);
  stroke-width: 1;
}

.adsr-curve__area {
  fill: var(--ewa-accent-soft);
  stroke: none;
}

.adsr-curve__line {
  fill: none;
  stroke: var(--ewa-accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 480px) {
  .adsr-row {
    grid-template-columns: 1fr;
  }

  .adsr-curve {
    width: 100%;
  }
}
</style>

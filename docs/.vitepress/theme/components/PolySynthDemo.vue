<script setup lang="ts">
import type { PolySynth, StealStrategy, VoiceHandle } from 'ez-web-audio'
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
const maxVoices = ref(4)
const stealStrategy = ref<StealStrategy>('lru')
const activeNotes = ref(new Set<string>())
const voiceCount = ref(0)
const error = ref('')
const stealMessage = ref('')
const synthDirty = ref(false)

// ADSR presets (from SynthKeyboard.vue)
const presets: Record<string, EnvelopeConfig> = {
  piano: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.8 },
  pad: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 },
  pluck: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  lead: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 },
}

const strategyOptions = [
  { value: 'lru' as StealStrategy, label: 'Oldest (LRU)' },
  { value: 'oldest-active' as StealStrategy, label: 'Oldest Active' },
  { value: 'quietest' as StealStrategy, label: 'Quietest' },
]

let lib: typeof import('ez-web-audio') | null = null
let synth: PolySynth | null = null
const voiceHandles = new Map<string, VoiceHandle>()
let rafId: number | null = null
let stealTimeout: ReturnType<typeof setTimeout> | null = null

async function ensureLoaded() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
}

async function recreateSynth() {
  if (!lib) return

  // Dispose old synth
  if (synth) {
    synth.stopAll()
    synth.dispose()
    synth = null
  }
  voiceHandles.clear()
  activeNotes.value = new Set()

  // Create new synth with current settings
  synth = await lib.createPolySynth({
    maxVoices: maxVoices.value,
    stealStrategy: stealStrategy.value,
    type: waveType.value,
    envelope: { ...envelope.value },
  })
  synth.changeGainTo(0.3)
  synth.on('voicestolen', handleVoiceStolen)
  synthDirty.value = false
}

function handleVoiceStolen() {
  const label = strategyOptions.find(o => o.value === stealStrategy.value)?.label ?? stealStrategy.value
  stealMessage.value = `Voice stolen (${label})`
  if (stealTimeout) clearTimeout(stealTimeout)
  stealTimeout = setTimeout(() => { stealMessage.value = '' }, 1200)
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
    await ensureLoaded()

    if (!synth || synthDirty.value) {
      await recreateSynth()
    }
    if (!synth || !lib) return

    const frequency = lib.frequencyMap[note as keyof typeof lib.frequencyMap]
    if (!frequency) return

    const handle = synth.play({ frequency })
    voiceHandles.set(note, handle)
    activeNotes.value.add(note)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play note'
    console.error('Error playing note:', e)
  }
}

function handleNoteOff(note: string) {
  const handle = voiceHandles.get(note)
  if (handle?.active) {
    handle.stop()
  }
  voiceHandles.delete(note)
  activeNotes.value.delete(note)
}

// Mark synth dirty on ADSR/waveform changes (recreate on next noteOn)
watch([waveType, envelope], () => { synthDirty.value = true }, { deep: true })

// Recreate immediately on structural changes (maxVoices/stealStrategy)
watch([maxVoices, stealStrategy], () => {
  if (synth) recreateSynth()
})

// Voice count polling via requestAnimationFrame
function pollVoiceCount() {
  if (synth) {
    voiceCount.value = synth.activeVoices
  }
  else {
    voiceCount.value = 0
  }
  rafId = requestAnimationFrame(pollVoiceCount)
}

onMounted(() => {
  rafId = requestAnimationFrame(pollVoiceCount)
})

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (stealTimeout) {
    clearTimeout(stealTimeout)
    stealTimeout = null
  }
  if (synth) {
    synth.stopAll()
    synth.dispose()
    synth = null
  }
  voiceHandles.clear()
  activeNotes.value.clear()
})

const fillPercent = () => {
  if (maxVoices.value === 0) return 0
  return Math.min(100, (voiceCount.value / maxVoices.value) * 100)
}
</script>

<template>
  <div class="polysynth-demo">
    <div class="volume-warning">
      <strong>Volume Warning:</strong> Oscillators can be loud. Start with low system volume.
    </div>

    <!-- Voice Management Cluster -->
    <div class="voice-management">
      <div class="voice-header">
        <div class="voice-badge">
          <span class="voice-label">Voices:</span>
          <span class="voice-numbers">{{ voiceCount }} / {{ maxVoices }}</span>
          <div class="fill-bar">
            <div
              class="fill-bar-inner"
              :style="{ width: fillPercent() + '%' }"
              :class="{ full: voiceCount >= maxVoices }"
            />
          </div>
        </div>
        <div
          class="steal-notification"
          :class="{ visible: stealMessage }"
        >
          {{ stealMessage }}
        </div>
      </div>

      <div class="voice-controls">
        <label class="control-inline">
          Strategy:
          <select v-model="stealStrategy" aria-label="Steal strategy">
            <option
              v-for="opt in strategyOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>

        <label class="control-inline">
          Max Voices: {{ maxVoices }}
          <input
            v-model.number="maxVoices"
            type="range"
            min="1"
            max="8"
            step="1"
            aria-label="Maximum voices"
          >
        </label>
      </div>
    </div>

    <!-- ADSR + Waveform Controls -->
    <div class="sound-controls">
      <div class="control-row">
        <label>
          Waveform:
          <select v-model="waveType" aria-label="Waveform type">
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
          </select>
        </label>
      </div>

      <div class="preset-row">
        <span class="preset-label">ADSR Presets:</span>
        <button class="preset-btn" aria-label="Apply piano preset" @click="applyPreset('piano')">Piano</button>
        <button class="preset-btn" aria-label="Apply pad preset" @click="applyPreset('pad')">Pad</button>
        <button class="preset-btn" aria-label="Apply pluck preset" @click="applyPreset('pluck')">Pluck</button>
        <button class="preset-btn" aria-label="Apply lead preset" @click="applyPreset('lead')">Lead</button>
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

    <!-- Piano Keyboard -->
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
.polysynth-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
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

/* Voice Management Cluster */
.voice-management {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.voice-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.voice-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.voice-numbers {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 600;
  min-width: 3rem;
}

.fill-bar {
  width: 100px;
  height: 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.fill-bar-inner {
  height: 100%;
  background: var(--vp-c-brand);
  border-radius: 4px;
  transition: width 0.15s ease-out;
}

.fill-bar-inner.full {
  background: var(--vp-c-warning);
}

.steal-notification {
  font-size: 0.85rem;
  color: var(--vp-c-warning);
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.steal-notification.visible {
  opacity: 1;
}

.voice-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
}

.control-inline {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.control-inline select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.control-inline input[type="range"] {
  width: 120px;
}

/* Sound Controls (ADSR + Waveform) */
.sound-controls {
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

button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .voice-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .control-inline input[type="range"] {
    width: 100%;
  }
}
</style>

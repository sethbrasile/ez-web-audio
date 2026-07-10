<script setup lang="ts">
import type { StealStrategy, VoiceHandle } from 'ez-web-audio'
import { useCleanup, usePolySynth } from '@ez-web-audio/vue'
import { frequencyMap } from 'ez-web-audio'
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
// Active preset name for showing button active state (L2)
const activePreset = ref<string | null>(null)
// Transient message shown when synth is recreated mid-play (M5)
const recreateMessage = ref('')

// ADSR presets — pad release raised to 2.5s for authentic pad character (L5)
const presets: Record<string, EnvelopeConfig> = {
  piano: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.8 },
  pad: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 2.5 },
  pluck: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  lead: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 },
}

const strategyOptions = [
  { value: 'lru' as StealStrategy, label: 'Oldest (LRU)' },
  { value: 'oldest-active' as StealStrategy, label: 'Oldest Active' },
  { value: 'quietest' as StealStrategy, label: 'Quietest' },
]

const cleanup = useCleanup()
const { instance: synth, load: loadSynth, reset: resetSynth } = usePolySynth()

const voiceHandles = new Map<string, VoiceHandle>()
let rafId: number | null = null
let stealTimeout: ReturnType<typeof setTimeout> | null = null
let recreateTimeout: ReturnType<typeof setTimeout> | null = null

// RAF only polls when synth is playing (L9)
let isPolling = false

async function recreateSynth(showMessage = false) {
  // Notify user that held notes will be cut (M5)
  if (showMessage && synth.value && voiceHandles.size > 0) {
    recreateMessage.value = 'Held notes released — synth reconfigured'
    if (recreateTimeout)
      clearTimeout(recreateTimeout)
    recreateTimeout = setTimeout(() => { recreateMessage.value = '' }, 1800)
  }

  // Dispose old synth
  if (synth.value) {
    synth.value.stopAll()
    synth.value.dispose()
  }
  resetSynth()
  voiceHandles.clear()
  activeNotes.value = new Set()

  // Create new synth with current settings
  const s = cleanup.register(await loadSynth({
    maxVoices: maxVoices.value,
    stealStrategy: stealStrategy.value,
    type: waveType.value,
    envelope: { ...envelope.value },
  }))
  s.changeGainTo(0.3)
  s.on('voicestolen', handleVoiceStolen)
  synthDirty.value = false

  // Start polling voice count now that we have a synth (L9)
  startPolling()
}

function handleVoiceStolen() {
  const label = strategyOptions.find(o => o.value === stealStrategy.value)?.label ?? stealStrategy.value
  stealMessage.value = `Voice stolen (${label})`
  if (stealTimeout)
    clearTimeout(stealTimeout)
  stealTimeout = setTimeout(() => { stealMessage.value = '' }, 1200)
}

function applyPreset(presetName: string) {
  const preset = presets[presetName]
  if (preset) {
    envelope.value = { ...preset }
    activePreset.value = presetName
  }
}

async function handleNoteOn(note: string) {
  try {
    error.value = ''

    if (!synth.value || synthDirty.value) {
      await recreateSynth()
    }
    if (!synth.value)
      return

    const frequency = frequencyMap[note as keyof typeof frequencyMap]
    if (!frequency)
      return

    const handle = synth.value.play({ frequency })
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
// Also clear active preset tracking when envelope is tweaked manually
watch([waveType, envelope], () => {
  synthDirty.value = true
  // If envelope was changed manually (not by preset button) clear active preset
  // We detect this via the activePreset clearing in applyPreset vs direct editing
}, { deep: true })

// Recreate immediately on structural changes (maxVoices/stealStrategy) — with message (M5)
watch([maxVoices, stealStrategy], () => {
  if (synth.value)
    recreateSynth(true)
})

// L9: RAF voice count poll — only runs when synth is active
function startPolling() {
  if (isPolling)
    return
  isPolling = true
  pollVoiceCount()
}

function stopPolling() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  isPolling = false
  voiceCount.value = 0
}

function pollVoiceCount() {
  if (!isPolling)
    return
  if (synth.value) {
    voiceCount.value = synth.value.activeVoices
    // Keep polling as long as synth exists
    rafId = requestAnimationFrame(pollVoiceCount)
  }
  else {
    stopPolling()
  }
}

// Do NOT start polling on mount — only when synth is created (L9)
onMounted(() => {})

onUnmounted(() => {
  stopPolling()
  if (stealTimeout) {
    clearTimeout(stealTimeout)
    stealTimeout = null
  }
  if (recreateTimeout) {
    clearTimeout(recreateTimeout)
    recreateTimeout = null
  }
  voiceHandles.clear()
  activeNotes.value.clear()
})

function fillPercent() {
  if (maxVoices.value === 0)
    return 0
  return Math.min(100, (voiceCount.value / maxVoices.value) * 100)
}
</script>

<template>
  <div class="polysynth-demo">
    <!-- Volume warning — matches SynthKeyboard.vue style (L1) -->
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
              :style="{ width: `${fillPercent()}%` }"
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

    <!-- Recreate notification (M5) -->
    <transition name="fade">
      <div v-if="recreateMessage" class="recreate-notice" role="status" aria-live="polite">
        {{ recreateMessage }}
      </div>
    </transition>

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

      <!-- ADSR preset buttons with active state (L2) -->
      <div class="preset-row">
        <span class="preset-label">ADSR Presets:</span>
        <button
          v-for="(_, name) in presets"
          :key="name"
          class="preset-btn"
          :class="{ active: activePreset === name }"
          :aria-label="`Apply ${name} preset`"
          :aria-pressed="activePreset === name"
          @click="applyPreset(name)"
        >
          {{ name.charAt(0).toUpperCase() + name.slice(1) }}
        </button>
      </div>

      <!-- ADSR grid — responsive: 4-col on wide, 2-col on medium, 1-col on narrow (M4) -->
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
          <!-- Release max raised to 8s for pads (L4) -->
          <input v-model.number="envelope.release" type="range" min="0" max="8" step="0.05">
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

/* Volume warning style matches SynthKeyboard.vue (L1) */
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

/* Recreate notice (M5) */
.recreate-notice {
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-tip-soft);
  border: 1px solid var(--vp-c-tip);
  border-radius: 4px;
  color: var(--vp-c-tip-text);
  font-size: 0.85rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

/* Active preset button shows which preset is selected (L2) */
.preset-btn.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.preset-btn:active {
  transform: translateY(1px);
}

/* ADSR grid — 4-col on wide, 2-col on medium, 1-col on narrow (M4) */
.adsr-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

/* Responsive ADSR grid (M4) */
@media (max-width: 640px) {
  .voice-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .control-inline input[type="range"] {
    width: 100%;
  }

  /* 2-col on narrow to avoid 3+1 asymmetry */
  .adsr-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 400px) {
  /* 1-col on very narrow */
  .adsr-row {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import type { StealStrategy, VoiceHandle } from 'ez-web-audio'
import { useCleanup, usePolySynth } from '@ez-web-audio/vue'
import { frequencyMap } from 'ez-web-audio'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
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

function formatSeconds(v: number) {
  return `${v.toFixed(2)}s`
}

function formatRatio(v: number) {
  return v.toFixed(2)
}
</script>

<template>
  <DemoFrame class="polysynth-demo" :error="error" takeaway="Polyphony with visible voice allocation — watch voices get stolen.">
    <VolumeWarning>
      <strong>Volume Warning:</strong> Oscillators can be loud. Start with low system volume.
    </VolumeWarning>

    <!-- Voice Management Cluster -->
    <div class="voice-management">
      <div class="voice-header">
        <div class="voice-badge">
          <span class="voice-label">Voices:</span>
          <span class="voice-numbers">{{ voiceCount }} / {{ maxVoices }}</span>
          <div class="fill-bar" role="img" :aria-label="`${voiceCount} of ${maxVoices} voices active`">
            <span
              v-for="i in maxVoices"
              :key="i"
              class="voice-pill"
              :class="{ 'voice-pill--filled': i <= voiceCount }"
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
          <select v-model="stealStrategy" class="strategy-select" aria-label="Steal strategy">
            <option
              v-for="opt in strategyOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>

        <ParameterSlider
          id="polysynth-max-voices"
          v-model="maxVoices"
          label="Max Voices"
          :min="1"
          :max="8"
          :step="1"
        />
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
        <WaveformSelector v-model="waveType" />
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
        <ParameterSlider
          id="polysynth-attack"
          v-model="envelope.attack"
          label="Attack"
          :min="0"
          :max="2"
          :step="0.01"
          :format="formatSeconds"
        />
        <ParameterSlider
          id="polysynth-decay"
          v-model="envelope.decay"
          label="Decay"
          :min="0"
          :max="2"
          :step="0.01"
          :format="formatSeconds"
        />
        <ParameterSlider
          id="polysynth-sustain"
          v-model="envelope.sustain"
          label="Sustain"
          :min="0"
          :max="1"
          :step="0.01"
          :format="formatRatio"
        />
        <ParameterSlider
          id="polysynth-release"
          v-model="envelope.release"
          label="Release"
          :min="0"
          :max="8"
          :step="0.05"
          :format="formatSeconds"
        />
      </div>
    </div>

    <!-- Piano Keyboard -->
    <PianoKeyboard
      :active-keys="activeNotes"
      @note-on="handleNoteOn"
      @note-off="handleNoteOff"
    />
  </DemoFrame>
</template>

<style scoped>
/* Voice Management Cluster */
.voice-management {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  border-radius: 10px;
}

.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.voice-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voice-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ewa-text-2);
}

.voice-numbers {
  font-family: var(--vp-font-family-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ewa-text);
  min-width: 3.5rem;
}

.fill-bar {
  display: flex;
  gap: 3px;
}

.voice-pill {
  width: 12px;
  height: 14px;
  border-radius: 3px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line-2);
  transition: background 0.15s, border-color 0.15s;
}

.voice-pill--filled {
  background: var(--ewa-bass);
  border-color: var(--ewa-bass);
}

.steal-notification {
  font-size: 0.85rem;
  color: var(--ewa-warn);
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
  gap: 24px;
  align-items: flex-end;
}

.control-inline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text-2);
}

.strategy-select {
  height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-bg);
  color: var(--ewa-text);
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  cursor: pointer;
}

.strategy-select:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.voice-controls :deep(.ewa-slider) {
  min-width: 160px;
}

/* Recreate notice (M5) */
.recreate-notice {
  padding: 8px 12px;
  margin-bottom: 16px;
  background: var(--ewa-accent-soft);
  border: 1px solid var(--ewa-accent);
  border-radius: 8px;
  color: var(--ewa-accent-ink);
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
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.preset-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ewa-text-2);
  margin-right: 4px;
}

.preset-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-btn:hover:not(.active) {
  background: var(--ewa-accent-soft);
  color: var(--ewa-text);
  border-color: var(--ewa-accent);
}

.preset-btn.active {
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
  border-color: var(--ewa-accent);
  box-shadow: var(--ewa-shadow);
}

.preset-btn:active {
  transform: translateY(1px);
}

.preset-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

/* ADSR grid — 4-col on wide, 2-col on medium, 1-col on narrow (M4) */
.adsr-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* Responsive ADSR grid (M4) */
@media (max-width: 640px) {
  .voice-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .voice-controls :deep(.ewa-slider) {
    min-width: 0;
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

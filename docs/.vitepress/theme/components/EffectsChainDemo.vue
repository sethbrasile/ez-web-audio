<script setup lang="ts">
import type { CompressorEffect, DelayEffect, EQEffect, Oscillator, ReverbEffect, Track } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'

interface ChainEntry {
  id: string
  label: string
  effect: DelayEffect | ReverbEffect | CompressorEffect | EQEffect
  bypassed: boolean
}

const sourceType = ref<'oscillator' | 'file'>('oscillator')
const isPlaying = ref(false)
const error = ref('')

// Per-effect parameter refs
const delayTime = ref(0.3)
const delayFeedback = ref(0.4)
const delayMix = ref(0.5)
const reverbDecay = ref(1.5)
const reverbDamping = ref(0.3)
const reverbMix = ref(0.4)
const compThreshold = ref(-24)
const compRatio = ref(4)
const eqLow = ref(0)
const eqMid = ref(0)
const eqHigh = ref(0)

// Module-level effect instances (outside reactive state — created once in ensureLoaded)
let lib: any = null
let delay: DelayEffect | null = null
let reverb: ReverbEffect | null = null
let compressor: CompressorEffect | null = null
let eq: EQEffect | null = null
let currentSource: Oscillator | Track | null = null

// Default order: EQ → Compressor → Delay → Reverb (typical professional signal chain)
const chainOrder = ref<ChainEntry[]>([
  { id: 'eq', label: 'EQ', effect: null as any, bypassed: false },
  { id: 'compressor', label: 'Compressor', effect: null as any, bypassed: false },
  { id: 'delay', label: 'Delay', effect: null as any, bypassed: false },
  { id: 'reverb', label: 'Reverb', effect: null as any, bypassed: false },
])

// Active (non-bypassed) chain for signal flow diagram
const activeChain = computed(() => chainOrder.value.filter(e => !e.bypassed))

// Watch-based parameter sync (established pattern from FilterDemo.vue)
watch(delayTime, (v) => {
  if (delay)
    delay.time = v
})
watch(delayFeedback, (v) => {
  if (delay)
    delay.feedback = v
})
watch(delayMix, (v) => {
  if (delay)
    delay.mix = v
})
watch(reverbDecay, (v) => {
  if (reverb)
    reverb.decay = v
})
watch(reverbDamping, (v) => {
  if (reverb)
    reverb.damping = v
})
watch(reverbMix, (v) => {
  if (reverb)
    reverb.mix = v
})
watch(compThreshold, (v) => {
  if (compressor)
    compressor.threshold = v
})
watch(compRatio, (v) => {
  if (compressor)
    compressor.ratio = v
})
watch(eqLow, (v) => {
  if (eq)
    eq.low = v
})
watch(eqMid, (v) => {
  if (eq)
    eq.mid = v
})
watch(eqHigh, (v) => {
  if (eq)
    eq.high = v
})

async function ensureLoaded() {
  if (lib)
    return
  lib = await import('ez-web-audio')
  const { createDelay, createReverb, createCompressor, createEQ } = lib
  delay = createDelay({ time: 0.3, feedback: 0.4, mix: 0.5 })
  reverb = createReverb({ decay: 1.5, damping: 0.3 })
  reverb.mix = 0.4
  compressor = createCompressor({ threshold: -24, ratio: 4 })
  eq = createEQ({ low: 0, mid: 0, high: 0 })

  // Populate effect references into chainOrder
  const effectMap: Record<string, any> = {
    eq,
    compressor,
    delay,
    reverb,
  }
  chainOrder.value = chainOrder.value.map(entry => ({
    ...entry,
    effect: effectMap[entry.id],
  }))
}

async function togglePlay() {
  try {
    error.value = ''
    if (isPlaying.value) {
      if (currentSource) {
        currentSource.stop()
        currentSource = null
      }
      isPlaying.value = false
    }
    else {
      await ensureLoaded()
      if (!lib)
        return

      if (sourceType.value === 'oscillator') {
        currentSource = await lib.createOscillator({ frequency: 220, type: 'sawtooth' })
        currentSource!.changeGainTo(0.3)
      }
      else {
        currentSource = await lib.createTrack('/ez-web-audio/audio/short-music.mp3')
        currentSource!.changeGainTo(0.8)
        // Set loop if supported
        if ('loop' in currentSource!) {
          (currentSource as any).loop = true
        }
      }

      currentSource!.addEffects(chainOrder.value.map(e => e.effect))
      currentSource!.play()
      isPlaying.value = true
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Audio error'
    isPlaying.value = false
  }
}

async function switchSource(type: 'oscillator' | 'file') {
  if (type === sourceType.value)
    return

  const wasPlaying = isPlaying.value

  // Stop and null currentSource
  if (currentSource) {
    currentSource.stop()
    currentSource = null
    isPlaying.value = false
  }

  sourceType.value = type

  if (wasPlaying) {
    try {
      error.value = ''
      await ensureLoaded()
      if (!lib)
        return

      if (type === 'oscillator') {
        currentSource = await lib.createOscillator({ frequency: 220, type: 'sawtooth' })
        currentSource!.changeGainTo(0.3)
      }
      else {
        currentSource = await lib.createTrack('/ez-web-audio/audio/short-music.mp3')
        currentSource!.changeGainTo(0.8)
        if ('loop' in currentSource!) {
          (currentSource as any).loop = true
        }
      }

      // Re-attach existing effects — effects persist across source switches
      currentSource!.addEffects(chainOrder.value.map(e => e.effect))
      currentSource!.play()
      isPlaying.value = true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Audio error'
    }
  }
}

function toggleBypass(entry: ChainEntry) {
  if (entry.effect)
    entry.effect.bypass = !entry.effect.bypass
  entry.bypassed = !entry.bypassed
}

function moveEffect(index: number, direction: 'up' | 'down') {
  if (!currentSource)
    return
  const newOrder = [...chainOrder.value]
  const swapIdx = direction === 'up' ? index - 1 : index + 1
  if (swapIdx < 0 || swapIdx >= newOrder.length)
    return
  const tmp = newOrder[index]
  newOrder[index] = newOrder[swapIdx]
  newOrder[swapIdx] = tmp
  chainOrder.value = newOrder
  // Remove all then re-add in new order (single atomic rewire)
  for (const entry of chainOrder.value) {
    currentSource.removeEffect(entry.effect)
  }
  currentSource.addEffects(chainOrder.value.map(e => e.effect))
}

onUnmounted(() => {
  if (currentSource) {
    currentSource.stop()
    currentSource = null
  }
  if (delay)
    delay.dispose()
  if (reverb)
    reverb.dispose()
  if (compressor)
    compressor.dispose()
  if (eq)
    eq.dispose()
})
</script>

<template>
  <div class="effects-chain-demo">
    <div class="volume-warning">
      <strong>Volume Warning:</strong> Audio sources can be loud. Start with low system volume.
    </div>

    <!-- Source selector and Play/Stop -->
    <div class="top-controls">
      <div class="source-selector">
        <span class="label">Source:</span>
        <button
          :class="{ active: sourceType === 'oscillator' }"
          aria-label="Source: oscillator"
          @click="switchSource('oscillator')"
        >
          Oscillator
        </button>
        <button
          :class="{ active: sourceType === 'file' }"
          aria-label="Source: file"
          @click="switchSource('file')"
        >
          Audio File
        </button>
      </div>
      <button
        class="play-button"
        :aria-label="isPlaying ? 'Stop' : 'Play'"
        @click="togglePlay"
      >
        {{ isPlaying ? 'Stop' : 'Play' }}
      </button>
    </div>

    <!-- Signal flow diagram -->
    <div class="signal-flow" aria-label="Signal flow diagram">
      <div class="flow-node source">
        {{ sourceType === 'oscillator' ? 'Oscillator' : 'Audio File' }}
      </div>
      <template v-for="entry in activeChain" :key="entry.id">
        <div class="flow-arrow">
          →
        </div>
        <div class="flow-node effect">
          {{ entry.label }}
        </div>
      </template>
      <div class="flow-arrow">
        →
      </div>
      <div class="flow-node output">
        Output
      </div>
    </div>

    <!-- Effect chain -->
    <div class="effect-chain">
      <div
        v-for="(entry, index) in chainOrder"
        :key="entry.id"
        class="effect-card"
        :class="{ bypassed: entry.bypassed }"
        :aria-label="`Effect: ${entry.label}`"
      >
        <div class="effect-header">
          <span class="effect-label">{{ entry.label }}</span>
          <div class="effect-actions">
            <button
              class="bypass-btn"
              :aria-label="`Toggle ${entry.label}`"
              :aria-pressed="!entry.bypassed"
              :class="{ active: !entry.bypassed }"
              @click="toggleBypass(entry)"
            >
              {{ entry.bypassed ? 'Bypassed' : 'Active' }}
            </button>
            <button
              class="move-btn"
              :aria-label="`Move ${entry.label} up`"
              :disabled="index === 0"
              @click="moveEffect(index, 'up')"
            >
              ↑
            </button>
            <button
              class="move-btn"
              :aria-label="`Move ${entry.label} down`"
              :disabled="index === chainOrder.length - 1"
              @click="moveEffect(index, 'down')"
            >
              ↓
            </button>
          </div>
        </div>

        <!-- Collapsible parameters (visible when not bypassed) -->
        <div v-if="!entry.bypassed" class="effect-params">
          <!-- Delay parameters -->
          <template v-if="entry.id === 'delay'">
            <div class="param-row">
              <label>Time (s)</label>
              <input
                v-model.number="delayTime"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :aria-label="`Delay time: ${delayTime.toFixed(2)}s`"
              >
              <span class="param-value">{{ delayTime.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <label>Feedback</label>
              <input
                v-model.number="delayFeedback"
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                :aria-label="`Delay feedback: ${delayFeedback.toFixed(2)}`"
              >
              <span class="param-value">{{ delayFeedback.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <label>Mix</label>
              <input
                v-model.number="delayMix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :aria-label="`Delay mix: ${delayMix.toFixed(2)}`"
              >
              <span class="param-value">{{ delayMix.toFixed(2) }}</span>
            </div>
          </template>

          <!-- Reverb parameters -->
          <template v-if="entry.id === 'reverb'">
            <div class="param-row">
              <label>Decay (s)</label>
              <input
                v-model.number="reverbDecay"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                :aria-label="`Reverb decay: ${reverbDecay.toFixed(1)}s`"
              >
              <span class="param-value">{{ reverbDecay.toFixed(1) }}</span>
            </div>
            <div class="param-row">
              <label>Damping</label>
              <input
                v-model.number="reverbDamping"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :aria-label="`Reverb damping: ${reverbDamping.toFixed(2)}`"
              >
              <span class="param-value">{{ reverbDamping.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <label>Mix</label>
              <input
                v-model.number="reverbMix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :aria-label="`Reverb mix: ${reverbMix.toFixed(2)}`"
              >
              <span class="param-value">{{ reverbMix.toFixed(2) }}</span>
            </div>
          </template>

          <!-- Compressor parameters -->
          <template v-if="entry.id === 'compressor'">
            <div class="param-row">
              <label>Threshold (dB)</label>
              <input
                v-model.number="compThreshold"
                type="range"
                min="-60"
                max="0"
                step="1"
                :aria-label="`Compressor threshold: ${compThreshold}dB`"
              >
              <span class="param-value">{{ compThreshold }} dB</span>
            </div>
            <div class="param-row">
              <label>Ratio</label>
              <input
                v-model.number="compRatio"
                type="range"
                min="1"
                max="20"
                step="0.5"
                :aria-label="`Compressor ratio: ${compRatio.toFixed(1)}:1`"
              >
              <span class="param-value">{{ compRatio.toFixed(1) }}:1</span>
            </div>
          </template>

          <!-- EQ parameters -->
          <template v-if="entry.id === 'eq'">
            <div class="param-row">
              <label>Low (dB)</label>
              <input
                v-model.number="eqLow"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :aria-label="`EQ low: ${eqLow > 0 ? '+' : ''}${eqLow.toFixed(1)}dB`"
              >
              <span class="param-value">{{ eqLow > 0 ? '+' : '' }}{{ eqLow.toFixed(1) }}</span>
            </div>
            <div class="param-row">
              <label>Mid (dB)</label>
              <input
                v-model.number="eqMid"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :aria-label="`EQ mid: ${eqMid > 0 ? '+' : ''}${eqMid.toFixed(1)}dB`"
              >
              <span class="param-value">{{ eqMid > 0 ? '+' : '' }}{{ eqMid.toFixed(1) }}</span>
            </div>
            <div class="param-row">
              <label>High (dB)</label>
              <input
                v-model.number="eqHigh"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :aria-label="`EQ high: ${eqHigh > 0 ? '+' : ''}${eqHigh.toFixed(1)}dB`"
              >
              <span class="param-value">{{ eqHigh > 0 ? '+' : '' }}{{ eqHigh.toFixed(1) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.effects-chain-demo {
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

.top-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.source-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.source-selector .label {
  font-weight: 600;
  font-size: 0.9rem;
  margin-right: 0.25rem;
}

/* Signal flow diagram */
.signal-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.85rem;
  min-height: 2.5rem;
}

.flow-node {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}

.flow-node.source {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border: 1px solid var(--vp-c-brand);
}

.flow-node.effect {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.flow-node.output {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
  border: 1px solid var(--vp-c-green-1);
}

.flow-arrow {
  color: var(--vp-c-text-3);
  font-size: 1rem;
}

/* Effect chain */
.effect-chain {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.effect-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  transition: opacity 0.2s;
}

.effect-card.bypassed {
  opacity: 0.5;
}

.effect-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.effect-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.effect-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.effect-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.param-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.param-row label {
  min-width: 110px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.param-row input[type="range"] {
  flex: 1;
  min-width: 120px;
  max-width: 300px;
}

.param-value {
  min-width: 55px;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-align: right;
}

/* Buttons */
button {
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.4;
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
  padding: 0.5rem 1.25rem;
}

.play-button:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.bypass-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
}

.bypass-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.move-btn {
  padding: 0.3rem 0.5rem;
  font-size: 0.9rem;
  line-height: 1;
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

@media (max-width: 640px) {
  .top-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .param-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .param-row label {
    min-width: auto;
  }

  .param-row input[type="range"] {
    width: 100%;
    max-width: 100%;
  }

  .param-value {
    text-align: left;
  }
}
</style>

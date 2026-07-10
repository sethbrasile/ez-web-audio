<script setup lang="ts">
import type { CompressorEffect, DelayEffect, Effect, EQEffect, Oscillator, ReverbEffect, Track } from 'ez-web-audio'
import { createCompressor, createDelay, createEQ, createOscillator, createReverb, createTrack } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────

type EffectId = 'delay' | 'reverb' | 'compressor' | 'eq'
type SourceType = 'oscillator' | 'file'

interface EffectSlot {
  id: EffectId
  label: string
  bypassed: boolean
  // delay params
  delayTime: number
  delayFeedback: number
  delayMix: number
  // reverb params
  reverbDecay: number
  reverbDamping: number
  reverbMix: number
  // compressor params
  compThreshold: number
  compRatio: number
  compKnee: number
  compAttack: number
  compRelease: number
  // eq params
  eqLow: number
  eqMid: number
  eqHigh: number
}

// ── State ─────────────────────────────────────────────────────────────────────

const initialized = ref(false)
const playing = ref(false)
const loading = ref(false)
const error = ref('')
const warningDismissed = ref(false)
const statusMessage = ref('Click Play to start')

// Which source feeds the chain — oscillator (synth) or a looping audio file
const sourceType = ref<SourceType>('oscillator')

// Chain order — list of effect IDs in signal-flow order
// Default: EQ → Compressor → Delay → Reverb (typical professional signal chain)
const chainOrder = ref<EffectId[]>(['eq', 'compressor', 'delay', 'reverb'])

// Per-effect UI state (single reactive object per effect avoids many separate watchers)
const slots = ref<Record<EffectId, EffectSlot>>({
  delay: {
    id: 'delay',
    label: 'Delay',
    bypassed: false,
    delayTime: 0.2,
    delayFeedback: 0.25,
    delayMix: 0.3,
    // unused fields (typed for uniform shape)
    reverbDecay: 0,
    reverbDamping: 0,
    reverbMix: 0,
    compThreshold: 0,
    compRatio: 0,
    compKnee: 0,
    compAttack: 0,
    compRelease: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
  },
  reverb: {
    id: 'reverb',
    label: 'Reverb',
    bypassed: false,
    reverbDecay: 1.5,
    reverbDamping: 0.3,
    reverbMix: 0.35,
    // unused fields
    delayTime: 0,
    delayFeedback: 0,
    delayMix: 0,
    compThreshold: 0,
    compRatio: 0,
    compKnee: 0,
    compAttack: 0,
    compRelease: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
  },
  compressor: {
    id: 'compressor',
    label: 'Compressor',
    bypassed: false,
    compThreshold: -24,
    compRatio: 4,
    compKnee: 30,
    compAttack: 0.003,
    compRelease: 0.25,
    // unused fields
    delayTime: 0,
    delayFeedback: 0,
    delayMix: 0,
    reverbDecay: 0,
    reverbDamping: 0,
    reverbMix: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
  },
  eq: {
    id: 'eq',
    label: 'EQ',
    bypassed: false,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    // unused fields
    delayTime: 0,
    delayFeedback: 0,
    delayMix: 0,
    reverbDecay: 0,
    reverbDamping: 0,
    reverbMix: 0,
    compThreshold: 0,
    compRatio: 0,
    compKnee: 0,
    compAttack: 0,
    compRelease: 0,
  },
})

// ── Audio objects ──────────────────────────────────────────────────────────────

let source: Oscillator | Track | null = null
// Typed effect references, keyed by EffectId
const effectRefs: Partial<Record<EffectId, Effect>> = {}
// Narrow type for effect disposal — Effect doesn't declare dispose(), but every
// concrete effect class (delay/reverb/compressor/eq) implements it via BaseEffect.
interface Disposable {
  dispose?: () => void
}

// ── Computed ───────────────────────────────────────────────────────────────────

// Ordered list of slot objects in current chain order
const orderedSlots = computed<EffectSlot[]>(() =>
  chainOrder.value.map(id => slots.value[id]),
)

// Transport label describes the active source
const transportLabel = computed(() =>
  sourceType.value === 'oscillator'
    ? 'Sawtooth oscillator at 220 Hz through the effect chain below'
    : 'Looping audio file through the effect chain below',
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function setStatus(msg: string) {
  statusMessage.value = msg
}

function getEffect(id: EffectId): Effect | undefined {
  return effectRefs[id]
}

function applySlotToEffect(id: EffectId): void {
  const slot = slots.value[id]
  const effect = getEffect(id)
  if (!effect)
    return

  effect.bypass = slot.bypassed

  if (id === 'delay') {
    const delay = effect as DelayEffect
    delay.time = slot.delayTime
    delay.feedback = slot.delayFeedback
    delay.mix = slot.delayMix
  }
  else if (id === 'reverb') {
    const reverb = effect as ReverbEffect
    reverb.decay = slot.reverbDecay
    reverb.damping = slot.reverbDamping
    reverb.mix = slot.reverbMix
  }
  else if (id === 'compressor') {
    const comp = effect as CompressorEffect
    comp.threshold = slot.compThreshold
    comp.ratio = slot.compRatio
    comp.knee = slot.compKnee
    comp.attack = slot.compAttack
    comp.release = slot.compRelease
  }
  else if (id === 'eq') {
    const eq = effect as EQEffect
    eq.low = slot.eqLow
    eq.mid = slot.eqMid
    eq.high = slot.eqHigh
  }
}

// ── Audio control ──────────────────────────────────────────────────────────────

async function togglePlayback(): Promise<void> {
  if (playing.value) {
    stopAudio()
  }
  else {
    await startAudio()
  }
}

async function startAudio(): Promise<void> {
  if (loading.value)
    return

  try {
    loading.value = true
    error.value = ''
    setStatus('Initializing...')

    initialized.value = true

    if (sourceType.value === 'oscillator') {
      // Oscillator gain kept modest (M23: avoid saturating compressor)
      source = await createOscillator({ frequency: 220, type: 'sawtooth' })
      source.update('gain').to(0.15).as('ratio')
    }
    else {
      source = await createTrack('/ez-web-audio/audio/short-music.mp3')
      source.update('gain').to(0.8).as('ratio')
      source.loop = true
    }

    // Create effects in chain order and register them
    for (const id of chainOrder.value) {
      const slot = slots.value[id]
      let effect: Effect

      if (id === 'delay') {
        effect = createDelay({
          time: slot.delayTime,
          feedback: slot.delayFeedback,
          mix: slot.delayMix,
        })
      }
      else if (id === 'reverb') {
        effect = createReverb({
          decay: slot.reverbDecay,
          damping: slot.reverbDamping,
          mix: slot.reverbMix,
        })
      }
      else if (id === 'compressor') {
        effect = createCompressor({
          threshold: slot.compThreshold,
          ratio: slot.compRatio,
          knee: slot.compKnee,
          attack: slot.compAttack,
          release: slot.compRelease,
        })
      }
      else {
        effect = createEQ({
          low: slot.eqLow,
          mid: slot.eqMid,
          high: slot.eqHigh,
        })
      }

      effect.bypass = slot.bypassed
      effectRefs[id] = effect
      source.addEffect(effect)
    }

    source.play()
    playing.value = true
    setStatus('Playing — adjust parameters to hear changes')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start audio'
    setStatus('Error starting audio')
    stopAudio()
  }
  finally {
    loading.value = false
  }
}

function stopAudio(): void {
  if (source) {
    try {
      source.stop()
    }
    catch { /* already stopped */ }
    // C2: Dispose to disconnect internal AudioNode subgraphs
    source.dispose?.()
    source = null
  }

  // Dispose effect nodes
  for (const id of Object.keys(effectRefs) as EffectId[]) {
    const effect = effectRefs[id]
    try {
      (effect as Disposable | undefined)?.dispose?.()
    }
    catch { /* already disposed */ }
    delete effectRefs[id]
  }

  playing.value = false
  setStatus('Stopped — click Play to restart')
}

// ── Source switching ───────────────────────────────────────────────────────────

// Switch between oscillator and file source. If currently playing, restart
// with the new source (stop + null old source, then create + play the new one).
async function switchSource(type: SourceType): Promise<void> {
  if (type === sourceType.value)
    return

  const wasPlaying = playing.value
  sourceType.value = type

  if (wasPlaying) {
    stopAudio()
    await startAudio()
  }
}

// ── Reorder ────────────────────────────────────────────────────────────────────

// H14: Reorder only works when audio is initialized (restart required to hear change)
function moveEffect(index: number, direction: -1 | 1): void {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= chainOrder.value.length)
    return

  const order = [...chainOrder.value]
  const [item] = order.splice(index, 1)
  order.splice(newIndex, 0, item)
  chainOrder.value = order

  // If playing, restart to apply the new chain order
  if (playing.value) {
    stopAudio()
    startAudio()
    setStatus('Chain reordered — restarting to apply new signal flow')
  }
  else {
    setStatus('Chain reordered — click Play to hear the new signal flow')
  }
}

// ── Watchers (consolidated — M28) ─────────────────────────────────────────────

// Single deep watcher per effect ID applies all param changes at once
watch(
  () => ({ ...slots.value.delay }),
  () => {
    if (playing.value)
      applySlotToEffect('delay')
  },
  { deep: true },
)

watch(
  () => ({ ...slots.value.reverb }),
  () => {
    if (playing.value)
      applySlotToEffect('reverb')
  },
  { deep: true },
)

watch(
  () => ({ ...slots.value.compressor }),
  () => {
    if (playing.value)
      applySlotToEffect('compressor')
  },
  { deep: true },
)

watch(
  () => ({ ...slots.value.eq }),
  () => {
    if (playing.value)
      applySlotToEffect('eq')
  },
  { deep: true },
)

// ── Lifecycle ──────────────────────────────────────────────────────────────────

onUnmounted(() => {
  stopAudio()
})
</script>

<template>
  <div class="effects-chain-demo">
    <!-- Volume warning (L27: dismissible) -->
    <div v-if="!warningDismissed" class="warning" role="alert">
      <span><strong>Note:</strong> This demo uses a synthesizer oscillator which can be loud. Start with your volume low.</span>
      <button class="warning-dismiss" aria-label="Dismiss warning" @click="warningDismissed = true">
        ✕
      </button>
    </div>

    <!-- Transport row -->
    <div class="transport-row">
      <div class="source-selector">
        <span class="source-selector-label">Source:</span>
        <button
          class="ec-btn source-btn"
          :class="{ active: sourceType === 'oscillator' }"
          aria-label="Source: oscillator"
          @click="switchSource('oscillator')"
        >
          Oscillator
        </button>
        <button
          class="ec-btn source-btn"
          :class="{ active: sourceType === 'file' }"
          aria-label="Source: file"
          @click="switchSource('file')"
        >
          Audio File
        </button>
      </div>
      <button
        class="ec-btn play-btn"
        :class="{ active: playing }"
        :disabled="loading"
        @click="togglePlayback"
      >
        {{ loading ? 'Starting…' : playing ? 'Stop' : 'Play' }}
      </button>
      <span class="transport-label">{{ transportLabel }}</span>
    </div>

    <!--
      Signal flow diagram — L28: Order matters!
      Effects process left-to-right (or top-to-bottom on mobile).
      The compressor works best LAST because it tames the output of all prior effects.
      Try reordering to hear how the same effects produce different results in different positions.
    -->
    <div class="signal-flow" aria-label="Signal flow diagram">
      <div class="flow-node source">
        <span class="flow-label">Source</span>
        <span class="flow-box">{{ sourceType === 'oscillator' ? 'Oscillator' : 'Audio File' }}</span>
      </div>

      <template v-for="(slot, idx) in orderedSlots" :key="slot.id">
        <div class="flow-arrow" aria-hidden="true">
          →
        </div>
        <div class="flow-node effect-node" :class="{ bypassed: slot.bypassed, active: playing && !slot.bypassed }">
          <span class="flow-label">Effect {{ idx + 1 }}</span>
          <span class="flow-box">{{ slot.label }}</span>
        </div>
      </template>

      <div class="flow-arrow" aria-hidden="true">
        →
      </div>
      <div class="flow-node output">
        <span class="flow-label">Output</span>
        <span class="flow-box">Speakers</span>
      </div>
    </div>

    <!-- Effect cards -->
    <div class="effects-grid">
      <div
        v-for="(slot, idx) in orderedSlots"
        :key="slot.id"
        class="effect-card"
        :class="{ bypassed: slot.bypassed }"
      >
        <!-- Card header -->
        <div class="card-header">
          <span class="card-title">{{ slot.label }}</span>

          <div class="card-actions">
            <!-- M12: Arrows for reorder affordance; H14: disabled before init -->
            <button
              class="ec-btn icon-btn"
              :disabled="idx === 0"
              :aria-label="`Move ${slot.label} earlier in chain`"
              :title="`Move ${slot.label} earlier`"
              @click="moveEffect(idx, -1)"
            >
              ←
            </button>
            <button
              class="ec-btn icon-btn"
              :disabled="idx === orderedSlots.length - 1"
              :aria-label="`Move ${slot.label} later in chain`"
              :title="`Move ${slot.label} later`"
              @click="moveEffect(idx, 1)"
            >
              →
            </button>

            <!-- M9: Clear bypass labeling — shows current state and what clicking will do -->
            <button
              class="ec-btn bypass-btn"
              :class="{ 'bypass-active': slot.bypassed }"
              :aria-pressed="slot.bypassed"
              :aria-label="`${slot.bypassed ? 'Bypassed — click to enable' : 'Active — click to bypass'} ${slot.label}`"
              @click="slot.bypassed = !slot.bypassed"
            >
              {{ slot.bypassed ? 'Bypassed' : 'Active' }}
            </button>
          </div>
        </div>

        <!-- M11: Parameters always visible; dimmed when bypassed -->
        <div class="card-params" :class="{ dimmed: slot.bypassed }">
          <!-- Delay parameters -->
          <template v-if="slot.id === 'delay'">
            <label class="param-row">
              <span class="param-label">Time</span>
              <input
                v-model.number="slot.delayTime"
                type="range"
                min="0.05"
                max="1.0"
                step="0.01"
                :disabled="!playing"
                :aria-label="`Delay time: ${slot.delayTime.toFixed(2)}s`"
              >
              <span class="param-value">{{ slot.delayTime.toFixed(2) }}s</span>
            </label>
            <label class="param-row">
              <span class="param-label">Feedback</span>
              <input
                v-model.number="slot.delayFeedback"
                type="range"
                min="0"
                max="0.9"
                step="0.01"
                :disabled="!playing"
                :aria-label="`Delay feedback: ${Math.round(slot.delayFeedback * 100)}%`"
              >
              <span class="param-value">{{ Math.round(slot.delayFeedback * 100) }}%</span>
            </label>
            <label class="param-row">
              <span class="param-label">Mix</span>
              <input
                v-model.number="slot.delayMix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :disabled="!playing"
                :aria-label="`Delay mix: ${Math.round(slot.delayMix * 100)}%`"
              >
              <span class="param-value">{{ Math.round(slot.delayMix * 100) }}%</span>
            </label>
          </template>

          <!-- Reverb parameters -->
          <template v-else-if="slot.id === 'reverb'">
            <label class="param-row">
              <span class="param-label">Decay</span>
              <input
                v-model.number="slot.reverbDecay"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                :disabled="!playing"
                :aria-label="`Reverb decay: ${slot.reverbDecay.toFixed(1)}s`"
              >
              <span class="param-value">{{ slot.reverbDecay.toFixed(1) }}s</span>
            </label>
            <label class="param-row">
              <span class="param-label">Damping</span>
              <input
                v-model.number="slot.reverbDamping"
                type="range"
                min="0"
                max="1"
                step="0.05"
                :disabled="!playing"
                :aria-label="`Reverb damping: ${Math.round(slot.reverbDamping * 100)}%`"
              >
              <span class="param-value">{{ Math.round(slot.reverbDamping * 100) }}%</span>
            </label>
            <label class="param-row">
              <span class="param-label">Mix</span>
              <input
                v-model.number="slot.reverbMix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :disabled="!playing"
                :aria-label="`Reverb mix: ${Math.round(slot.reverbMix * 100)}%`"
              >
              <span class="param-value">{{ Math.round(slot.reverbMix * 100) }}%</span>
            </label>
          </template>

          <!-- Compressor parameters (M22: includes attack + release) -->
          <template v-else-if="slot.id === 'compressor'">
            <label class="param-row">
              <span class="param-label">Threshold</span>
              <input
                v-model.number="slot.compThreshold"
                type="range"
                min="-60"
                max="0"
                step="1"
                :disabled="!playing"
                :aria-label="`Compressor threshold: ${slot.compThreshold}dB`"
              >
              <span class="param-value">{{ slot.compThreshold }}dB</span>
            </label>
            <label class="param-row">
              <span class="param-label">Ratio</span>
              <input
                v-model.number="slot.compRatio"
                type="range"
                min="1"
                max="20"
                step="0.5"
                :disabled="!playing"
                :aria-label="`Compressor ratio: ${slot.compRatio.toFixed(1)}:1`"
              >
              <span class="param-value">{{ slot.compRatio.toFixed(1) }}:1</span>
            </label>
            <label class="param-row">
              <span class="param-label">Knee</span>
              <input
                v-model.number="slot.compKnee"
                type="range"
                min="0"
                max="40"
                step="1"
                :disabled="!playing"
                :aria-label="`Compressor knee: ${slot.compKnee}dB`"
              >
              <span class="param-value">{{ slot.compKnee }}dB</span>
            </label>
            <label class="param-row">
              <span class="param-label">Attack</span>
              <input
                v-model.number="slot.compAttack"
                type="range"
                min="0"
                max="1"
                step="0.001"
                :disabled="!playing"
                :aria-label="`Compressor attack: ${(slot.compAttack * 1000).toFixed(0)}ms`"
              >
              <span class="param-value">{{ (slot.compAttack * 1000).toFixed(0) }}ms</span>
            </label>
            <label class="param-row">
              <span class="param-label">Release</span>
              <input
                v-model.number="slot.compRelease"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :disabled="!playing"
                :aria-label="`Compressor release: ${(slot.compRelease * 1000).toFixed(0)}ms`"
              >
              <span class="param-value">{{ (slot.compRelease * 1000).toFixed(0) }}ms</span>
            </label>
          </template>

          <!-- EQ parameters (three-band: low, mid, high) -->
          <template v-else-if="slot.id === 'eq'">
            <label class="param-row">
              <span class="param-label">Low</span>
              <input
                v-model.number="slot.eqLow"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :disabled="!playing"
                :aria-label="`EQ low: ${slot.eqLow > 0 ? '+' : ''}${slot.eqLow.toFixed(1)}dB`"
              >
              <span class="param-value">{{ slot.eqLow > 0 ? '+' : '' }}{{ slot.eqLow.toFixed(1) }}dB</span>
            </label>
            <label class="param-row">
              <span class="param-label">Mid</span>
              <input
                v-model.number="slot.eqMid"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :disabled="!playing"
                :aria-label="`EQ mid: ${slot.eqMid > 0 ? '+' : ''}${slot.eqMid.toFixed(1)}dB`"
              >
              <span class="param-value">{{ slot.eqMid > 0 ? '+' : '' }}{{ slot.eqMid.toFixed(1) }}dB</span>
            </label>
            <label class="param-row">
              <span class="param-label">High</span>
              <input
                v-model.number="slot.eqHigh"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                :disabled="!playing"
                :aria-label="`EQ high: ${slot.eqHigh > 0 ? '+' : ''}${slot.eqHigh.toFixed(1)}dB`"
              >
              <span class="param-value">{{ slot.eqHigh > 0 ? '+' : '' }}{{ slot.eqHigh.toFixed(1) }}dB</span>
            </label>
          </template>
        </div>
      </div>
    </div>

    <!-- Status bar (L19: always shows something useful) -->
    <div class="status-bar" role="status" aria-live="polite">
      <span v-if="error" class="status-error">{{ error }}</span>
      <span v-else class="status-idle">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────────── */
.effects-chain-demo {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  margin: 1.5rem 0;
}

/* ── Warning (dismissible) ───────────────────────────────────────────────────── */
.warning {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-warning-soft);
  border-left: 3px solid var(--vp-c-warning);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.warning strong {
  color: var(--vp-c-warning);
}

.warning-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-3);
  font-size: 1rem;
  line-height: 1;
  padding: 0 0.25rem;
}

.warning-dismiss:hover {
  color: var(--vp-c-text-1);
}

/* ── Transport ───────────────────────────────────────────────────────────────── */
.transport-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.transport-label {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  flex: 1;
}

/* ── Source selector ─────────────────────────────────────────────────────────── */
.source-selector {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.source-selector-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-right: 0.15rem;
}

.source-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* ── Signal flow diagram (M10: responsive) ───────────────────────────────────── */
.signal-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  overflow-x: auto;
}

.flow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.flow-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.flow-box {
  padding: 0.4rem 0.75rem;
  border-radius: 5px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  min-width: 72px;
  text-align: center;
  transition: all 0.25s;
}

.flow-node.source .flow-box,
.flow-node.output .flow-box {
  border-color: var(--vp-c-brand-light);
  color: var(--vp-c-brand);
}

.flow-node.effect-node.active .flow-box {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.flow-node.effect-node.bypassed .flow-box {
  opacity: 0.45;
  border-style: dashed;
}

.flow-arrow {
  font-size: 1.1rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

/* ── Effect cards grid ───────────────────────────────────────────────────────── */
.effects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.effect-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border: 2px solid var(--vp-c-divider);
  transition: border-color 0.2s, opacity 0.2s;
}

.effect-card.bypassed {
  border-style: dashed;
  opacity: 0.8;
}

/* ── Card header ─────────────────────────────────────────────────────────────── */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* ── Param rows ──────────────────────────────────────────────────────────────── */
.card-params {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

/* M11: Show params dimmed when bypassed — do NOT hide them */
.card-params.dimmed {
  opacity: 0.4;
  pointer-events: none;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.param-label {
  min-width: 80px;
  color: var(--vp-c-text-2);
  font-weight: 500;
  flex-shrink: 0;
}

.param-row input[type="range"] {
  flex: 1;
  min-width: 80px;
  accent-color: var(--vp-c-brand);
}

.param-value {
  min-width: 52px;
  text-align: right;
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

/* ── Buttons — scoped selectors (L18) ───────────────────────────────────────── */
.ec-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.2;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.ec-btn:hover:not(:disabled) {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.ec-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.ec-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Play button */
.play-btn {
  padding: 0.5rem 1.25rem;
  background: var(--vp-c-brand);
  color: #fff;
  border-color: var(--vp-c-brand);
  font-weight: 700;
  min-width: 80px;
}

.play-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
  border-color: var(--vp-c-brand-dark);
  color: #fff;
}

.play-btn.active {
  background: var(--vp-c-danger);
  border-color: var(--vp-c-danger);
}

/* M12: Icon reorder buttons */
.icon-btn {
  padding: 0.3rem 0.5rem;
  font-size: 1rem;
  min-width: 32px;
}

/* M9: Bypass toggle — clear state indication */
.bypass-btn {
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.bypass-btn.bypass-active {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-3);
}

/* ── Status bar ──────────────────────────────────────────────────────────────── */
.status-bar {
  min-height: 1.5rem;
  font-size: 0.85rem;
}

.status-idle {
  color: var(--vp-c-text-3);
}

.status-error {
  padding: 0.4rem 0.75rem;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-radius: 4px;
  display: block;
}

/* ── Responsive adjustments ──────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .effects-chain-demo {
    padding: 1rem;
  }

  /* M10: Signal flow scrolls horizontally on narrow screens */
  .signal-flow {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.5rem;
  }

  .effects-grid {
    grid-template-columns: 1fr;
  }

  .transport-label {
    display: none;
  }
}
</style>

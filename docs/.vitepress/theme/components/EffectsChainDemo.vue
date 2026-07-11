<script setup lang="ts">
import type { CompressorEffect, DelayEffect, Effect, EQEffect, Oscillator, ReverbEffect, Track } from 'ez-web-audio'
import { createCompressor, createDelay, createEQ, createOscillator, createReverb, createTrack } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import VolumeWarning from './kit/VolumeWarning.vue'

// ── Types ─────────────────────────────────────────────────────────────────────

type EffectId = 'delay' | 'reverb' | 'compressor' | 'eq'
type SourceType = 'pattern' | 'oscillator' | 'file'

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
const statusMessage = ref('Click Play to start')

// Which source feeds the chain — a plucked synth pattern (default), a held
// oscillator drone, or a looping audio file.
//
// gate-2 (ez-audio-5w9): the drone used to be the default source, but a
// continuous tone gives delay nothing to echo, the compressor nothing to
// squash, and EQ/reverb nothing percussive to shape — the whole point of
// this demo. A retriggered pattern has real transients, so it's the
// default now; the drone remains selectable for comparison.
const sourceType = ref<SourceType>('pattern')

// Pattern source: a short A-minor-7 arpeggio (A3, C4, E4, G4) retriggered
// on an eighth-note grid at 120 BPM (250ms/note). Each hit is a single
// Oscillator instance retriggered via update('frequency') + play() — the
// documented step-sequencing idiom (setup() re-applies the persisted
// frequency to a fresh OscillatorNode on every play(), so no raw node
// manipulation is needed).
//
// Pluck shape uses onPlaySet('gain') (attack ramp up, decay ramp back to 0)
// rather than the `envelope` constructor option: Envelope.applyTo() always
// ramps to an absolute peak of 1.0 regardless of the oscillator's configured
// gain (library gap — see final report), which blew through the demo's
// safety limiter once the delay/reverb tails started stacking. onPlaySet
// writes the raw gain value we choose, so PATTERN_PEAK_GAIN is the true
// ceiling.
const PATTERN_NOTES = [220.00, 261.63, 329.63, 392.00]
const PATTERN_STEP_MS = 250
const PATTERN_PEAK_GAIN = 0.09
// Per-step accents (strong / weak / medium / weak): the level variation is
// what gives the compressor real dynamics to squash — a uniform-velocity
// pattern would leave it with nothing to do.
const PATTERN_ACCENTS = [1, 0.55, 0.8, 0.55]
const PATTERN_ATTACK = 0.003
const PATTERN_DECAY = 0.15
let patternStep = 0
let patternIntervalId: ReturnType<typeof setInterval> | null = null
// Guards against setInterval jitter under CPU load (e.g. many demos'
// AudioContexts running in the same page during the E2E suite): if two
// ticks land close together, retriggering twice stacks two attacks' worth
// of delay/reverb energy and can push the shared safety limiter past its
// ceiling. Refuse a retrigger inside the previous note's attack+decay.
let lastPatternTriggerAt = 0

// Retrigger the pattern oscillator on a new pitch with a clean pluck
// envelope. Schedules are consumed on each play() (per onPlaySet's
// contract), so this must be called before every note, not just the first.
function triggerPatternNote(osc: Oscillator, frequency: number, accent = 1): void {
  const now = performance.now()
  if (now - lastPatternTriggerAt < (PATTERN_ATTACK + PATTERN_DECAY) * 1000)
    return
  lastPatternTriggerAt = now

  osc.update('frequency').to(frequency).as('ratio')
  osc.onPlaySet('gain').to(0).at(0)
  osc.onPlaySet('gain').to(PATTERN_PEAK_GAIN * accent).endingAt(PATTERN_ATTACK, 'linear')
  osc.onPlaySet('gain').to(0).endingAt(PATTERN_ATTACK + PATTERN_DECAY, 'linear')
  osc.play()
}

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

// ── Design tokens ──────────────────────────────────────────────────────────────

// Per-effect identity color (EWA sound palette), used as an accent on the
// effect card's left edge and the matching signal-flow node border.
const EFFECT_COLOR: Record<EffectId, string> = {
  delay: 'var(--ewa-lead)',
  reverb: 'var(--ewa-clap)',
  compressor: 'var(--ewa-snare)',
  eq: 'var(--ewa-bass)',
}

// ── Computed ───────────────────────────────────────────────────────────────────

// Ordered list of slot objects in current chain order
const orderedSlots = computed<EffectSlot[]>(() =>
  chainOrder.value.map(id => slots.value[id]),
)

// Transport label describes the active source
const transportLabel = computed(() => {
  if (sourceType.value === 'pattern')
    return 'Plucked synth arpeggio at 120 BPM through the effect chain below'
  if (sourceType.value === 'oscillator')
    return 'Sawtooth oscillator at 220 Hz through the effect chain below'
  return 'Looping audio file through the effect chain below'
})

// Short label for the source node in the signal-flow diagram
const sourceLabel = computed(() => {
  if (sourceType.value === 'pattern')
    return 'Pattern'
  if (sourceType.value === 'oscillator')
    return 'Oscillator'
  return 'Audio File'
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function setStatus(msg: string) {
  statusMessage.value = msg
}

function getEffect(id: EffectId): Effect | undefined {
  return effectRefs[id]
}

// Border/text color for an effect node in the signal-flow diagram — its
// slot color when active, muted line color when bypassed.
function flowNodeStyle(slot: EffectSlot): Record<string, string> {
  if (slot.bypassed)
    return {}
  return { borderColor: EFFECT_COLOR[slot.id], color: 'var(--ewa-text)' }
}

function formatSeconds2(v: number): string {
  return `${v.toFixed(2)}s`
}

function formatSeconds1(v: number): string {
  return `${v.toFixed(1)}s`
}

function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`
}

function formatDb(v: number): string {
  return `${v}dB`
}

function formatRatio(v: number): string {
  return `${v.toFixed(1)}:1`
}

function formatMs(v: number): string {
  return `${(v * 1000).toFixed(0)}ms`
}

function formatSignedDb(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`
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

    if (sourceType.value === 'pattern') {
      // Plucked lead: sawtooth for bright harmonic content (good EQ material),
      // tamed with a lowpass so it isn't harsh. The onPlaySet gain schedule
      // (see triggerPatternNote) shapes a sharp pluck — clean transient for
      // the delay to echo and the compressor to squash — that decays fully
      // to silence well before the next 250ms step.
      source = await createOscillator({
        frequency: PATTERN_NOTES[0],
        type: 'sawtooth',
        lowpass: { frequency: 3000, q: 1 },
      })
    }
    else if (sourceType.value === 'oscillator') {
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

    if (sourceType.value === 'pattern') {
      // Fire the first note immediately, then retrigger on an eighth-note
      // interval. Each hit re-schedules its own gain envelope (onPlaySet
      // schedules are consumed after each play() — see triggerPatternNote).
      patternStep = 0
      triggerPatternNote(source as Oscillator, PATTERN_NOTES[0], PATTERN_ACCENTS[0])
      patternStep = 1
      patternIntervalId = setInterval(() => {
        if (!source || sourceType.value !== 'pattern')
          return
        const step = patternStep % PATTERN_NOTES.length
        triggerPatternNote(source as Oscillator, PATTERN_NOTES[step], PATTERN_ACCENTS[step % PATTERN_ACCENTS.length])
        patternStep++
      }, PATTERN_STEP_MS)
    }
    else {
      source.play()
    }

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
  if (patternIntervalId !== null) {
    clearInterval(patternIntervalId)
    patternIntervalId = null
  }

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

// Switch between pattern, oscillator, and file source. If currently playing,
// restart with the new source (stop + null old source, then create + play the new one).
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
  <DemoFrame class="effects-chain-demo" :error="error" takeaway="Build, reorder, and hear an effects chain.">
    <VolumeWarning />

    <!-- Transport row -->
    <div class="transport-row">
      <div class="source-selector" role="group" aria-label="Source">
        <span class="source-selector-label">Source:</span>
        <button
          class="source-btn"
          :class="{ active: sourceType === 'pattern' }"
          aria-label="Source: pattern"
          @click="switchSource('pattern')"
        >
          Pattern
        </button>
        <button
          class="source-btn"
          :class="{ active: sourceType === 'oscillator' }"
          aria-label="Source: oscillator"
          @click="switchSource('oscillator')"
        >
          Oscillator
        </button>
        <button
          class="source-btn"
          :class="{ active: sourceType === 'file' }"
          aria-label="Source: file"
          @click="switchSource('file')"
        >
          Audio File
        </button>
      </div>

      <PlayButton
        class="play-button"
        :playing="playing"
        :loading="loading"
        loading-label="Starting…"
        @click="togglePlayback"
      />

      <span class="transport-label">{{ transportLabel }}</span>
    </div>

    <!--
      Signal flow diagram — L28: Order matters!
      Effects process left-to-right (or top-to-bottom on mobile).
      The compressor works best LAST because it tames the output of all prior effects.
      Try reordering to hear how the same effects produce different results in different positions.
    -->
    <div class="signal-flow" role="img" aria-label="Signal flow diagram">
      <div class="flow-node source">
        <span class="flow-label">Source</span>
        <span class="flow-box">{{ sourceLabel }}</span>
      </div>

      <template v-for="(slot, idx) in orderedSlots" :key="slot.id">
        <div class="flow-arrow" aria-hidden="true">
          →
        </div>
        <div class="flow-node effect-node" :class="{ bypassed: slot.bypassed, active: playing && !slot.bypassed }">
          <span class="flow-label">Effect {{ idx + 1 }}</span>
          <span class="flow-box" :style="flowNodeStyle(slot)">{{ slot.label }}</span>
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
        :style="slot.bypassed ? {} : { borderLeftColor: EFFECT_COLOR[slot.id] }"
      >
        <!-- Card header -->
        <div class="card-header">
          <span class="card-title">{{ slot.label }}</span>

          <div class="card-actions">
            <!-- M12: Arrows for reorder affordance; H14: disabled before init -->
            <button
              class="icon-btn"
              :disabled="idx === 0"
              :aria-label="`Move ${slot.label} earlier in chain`"
              :title="`Move ${slot.label} earlier`"
              @click="moveEffect(idx, -1)"
            >
              ▲
            </button>
            <button
              class="icon-btn"
              :disabled="idx === orderedSlots.length - 1"
              :aria-label="`Move ${slot.label} later in chain`"
              :title="`Move ${slot.label} later`"
              @click="moveEffect(idx, 1)"
            >
              ▼
            </button>

            <!-- M9: Clear bypass labeling — shows current state and what clicking will do -->
            <button
              class="bypass-btn"
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
            <ParameterSlider
              v-model="slot.delayTime"
              label="Time"
              :min="0.05"
              :max="1.0"
              :step="0.01"
              :format="formatSeconds2"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.delayFeedback"
              label="Feedback"
              :min="0"
              :max="0.9"
              :step="0.01"
              :format="formatPercent"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.delayMix"
              label="Mix"
              :min="0"
              :max="1"
              :step="0.01"
              :format="formatPercent"
              :disabled="!playing"
            />
          </template>

          <!-- Reverb parameters -->
          <template v-else-if="slot.id === 'reverb'">
            <ParameterSlider
              v-model="slot.reverbDecay"
              label="Decay"
              :min="0.1"
              :max="5"
              :step="0.1"
              :format="formatSeconds1"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.reverbDamping"
              label="Damping"
              :min="0"
              :max="1"
              :step="0.05"
              :format="formatPercent"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.reverbMix"
              label="Mix"
              :min="0"
              :max="1"
              :step="0.01"
              :format="formatPercent"
              :disabled="!playing"
            />
          </template>

          <!-- Compressor parameters (M22: includes attack + release) -->
          <template v-else-if="slot.id === 'compressor'">
            <ParameterSlider
              v-model="slot.compThreshold"
              label="Threshold"
              :min="-60"
              :max="0"
              :step="1"
              :format="formatDb"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.compRatio"
              label="Ratio"
              :min="1"
              :max="20"
              :step="0.5"
              :format="formatRatio"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.compKnee"
              label="Knee"
              :min="0"
              :max="40"
              :step="1"
              :format="formatDb"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.compAttack"
              label="Attack"
              :min="0"
              :max="1"
              :step="0.001"
              :format="formatMs"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.compRelease"
              label="Release"
              :min="0"
              :max="1"
              :step="0.01"
              :format="formatMs"
              :disabled="!playing"
            />
          </template>

          <!-- EQ parameters (three-band: low, mid, high) -->
          <template v-else-if="slot.id === 'eq'">
            <ParameterSlider
              v-model="slot.eqLow"
              label="Low"
              :min="-15"
              :max="15"
              :step="0.5"
              :format="formatSignedDb"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.eqMid"
              label="Mid"
              :min="-15"
              :max="15"
              :step="0.5"
              :format="formatSignedDb"
              :disabled="!playing"
            />
            <ParameterSlider
              v-model="slot.eqHigh"
              label="High"
              :min="-15"
              :max="15"
              :step="0.5"
              :format="formatSignedDb"
              :disabled="!playing"
            />
          </template>
        </div>
      </div>
    </div>

    <template #status>
      <span v-if="!error" class="status-idle" role="status" aria-live="polite">{{ statusMessage }}</span>
    </template>
  </DemoFrame>
</template>

<style scoped>
/* ── Transport ───────────────────────────────────────────────────────────────── */
.transport-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.transport-label {
  font-size: 0.875rem;
  color: var(--ewa-text-2);
  flex: 1;
}

/* ── Source selector (segmented control, token-restyled — E2E aria-label
     coupling on individual option buttons rules out kit PresetSelector) ──── */
.source-selector {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
}

.source-selector-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ewa-text-2);
  padding: 0 6px 0 4px;
}

.source-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--ewa-text-2);
  font-weight: 600;
  font-size: 13px;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.source-btn:hover:not(:disabled):not(.active) {
  background: var(--ewa-accent-soft);
  color: var(--ewa-text);
}

.source-btn.active {
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
  box-shadow: var(--ewa-shadow);
}

.source-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

/* ── Signal flow diagram (M10: responsive) ───────────────────────────────────── */
.signal-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 1rem;
  background: var(--ewa-well);
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  overflow-x: auto;
  margin-bottom: 1.25rem;
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
  color: var(--ewa-text-3);
}

.flow-box {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1.5px solid var(--ewa-line-2);
  background: var(--ewa-panel);
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ewa-text);
  min-width: 72px;
  text-align: center;
  transition: border-color 0.25s, color 0.25s, opacity 0.25s;
}

.flow-node.source .flow-box,
.flow-node.output .flow-box {
  border-color: var(--ewa-line);
  color: var(--ewa-text-2);
}

.flow-node.source .flow-box {
  border-color: var(--ewa-accent);
  background: var(--ewa-accent-soft);
  color: var(--ewa-accent-ink);
}

.flow-node.effect-node.bypassed .flow-box {
  opacity: 0.55;
  border-style: dashed;
  border-color: var(--ewa-line-2);
  color: var(--ewa-text-3);
}

.flow-arrow {
  font-size: 1.1rem;
  color: var(--ewa-text-3);
  flex-shrink: 0;
}

/* ── Effect cards grid ───────────────────────────────────────────────────────── */
.effects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.effect-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--ewa-bg);
  border-radius: 12px;
  border: 1px solid var(--ewa-line);
  border-left-width: 3px;
  transition: border-color 0.2s, opacity 0.2s;
}

.effect-card.bypassed {
  border: 1px dashed var(--ewa-line-2);
  opacity: 0.6;
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
  color: var(--ewa-text);
}

.effect-card.bypassed .card-title {
  color: var(--ewa-text-3);
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
  gap: 0.75rem;
  transition: opacity 0.2s;
}

/* M11: Show params dimmed when bypassed — do NOT hide them */
.card-params.dimmed {
  opacity: 0.4;
  pointer-events: none;
}

/* ── Icon reorder buttons (M12) — ≥44px hit area ─────────────────────────────── */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.icon-btn:hover:not(:disabled) {
  border-color: var(--ewa-accent);
  color: var(--ewa-accent);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* M9: Bypass toggle — chip style, clear state indication */
.bypass-btn {
  height: 44px;
  padding: 0 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  background: var(--ewa-accent-soft);
  border: 1px solid var(--ewa-accent);
  color: var(--ewa-accent-ink);
}

.bypass-btn.bypass-active {
  background: transparent;
  border-color: var(--ewa-line-2);
  color: var(--ewa-text-3);
}

.bypass-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

/* ── Status ──────────────────────────────────────────────────────────────────── */
.status-idle {
  color: var(--ewa-text-3);
  font-size: 0.85rem;
}

/* ── Responsive adjustments ──────────────────────────────────────────────────── */
@media (max-width: 640px) {
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

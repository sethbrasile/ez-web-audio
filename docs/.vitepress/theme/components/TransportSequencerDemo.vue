<script setup lang="ts">
import type { Oscillator } from 'ez-web-audio'
import type { TransportPreset, VoiceSpec } from './transport-sequencer-presets'
import { useAudioContext, useBeatTrack, useCleanup, useSequence, useTransport } from '@ez-web-audio/vue'
import { createOscillator } from 'ez-web-audio'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import Knob from './kit/Knob.vue'
import PlayButton from './kit/PlayButton.vue'
import SegmentDisplay from './kit/SegmentDisplay.vue'
import { ACCENT, NORMAL, TRANSPORT_PRESETS } from './transport-sequencer-presets'

// Audio state — composable-managed, single instance per component lifetime.
// Created once in ensureLoaded(); disposed automatically by useCleanup() on unmount.
const cleanup = useCleanup()
const { getContext } = useAudioContext()
const { instance: transport, load: loadTransport } = useTransport()
const { instance: kickTrack, load: loadKick } = useBeatTrack()
const { instance: snareTrack, load: loadSnare } = useBeatTrack()
const { instance: hihatTrack, load: loadHihat } = useBeatTrack()
const { instance: bassSeq, load: loadBassSeq } = useSequence()
const { instance: leadSeq, load: loadLeadSeq } = useSequence()
let audioContext: AudioContext | null = null

// Per-note melodic oscillators (ephemeral-churn escape hatch — see composables.ts).
// Each scheduled note owns its Oscillator so overlapping/adjacent notes never
// fight over one instance; recreated on preset change, disposed manually.
// Bass: one Oscillator per NoteEvent. Lead: one Oscillator per chord tone,
// grouped by ChordEvent so a chord's notes trigger together.
let bassNoteOscs: Oscillator[] = []
let leadNoteOscs: Oscillator[][] = []

type DrumKey = 'kick' | 'snare' | 'hihat'
type TrackKey = DrumKey | 'bass' | 'lead'

interface CellDisplay { active: boolean, accent: boolean, text: string | null }

// Reactive UI state
const playing = ref(false)
const paused = ref(false)
const bpm = ref(TRANSPORT_PRESETS[0].bpm)
const swing = ref(TRANSPORT_PRESETS[0].swing * 100)
const currentStep = ref(-1)
const positionDisplay = ref('1:1')
const error = ref('')
const activePresetName = ref(TRANSPORT_PRESETS[0].name)
const trackState = ref({
  kick: { muted: false, soloed: false },
  snare: { muted: false, soloed: false },
  hihat: { muted: false, soloed: false },
  bass: { muted: false, soloed: false },
  lead: { muted: false, soloed: false },
})

// Local editable mirror of the drum patterns — seeded from the active preset,
// mutated by cell clicks, and pushed to the BeatTracks via setPattern().
const drumSteps = reactive<Record<DrumKey, number[]>>({
  kick: [...TRANSPORT_PRESETS[0].kick.steps],
  snare: [...TRANSPORT_PRESETS[0].snare.steps],
  hihat: [...TRANSPORT_PRESETS[0].hihat.steps],
})

const activePreset = computed<TransportPreset>(() =>
  TRANSPORT_PRESETS.find(p => p.name === activePresetName.value) ?? TRANSPORT_PRESETS[0],
)

// Map a beat position (0-indexed, 0..7.75) onto its 16th-note step (0-31).
function beatToStep(beatValue: number): number {
  return Math.min(31, Math.max(0, Math.round(beatValue * 4)))
}

// Per-track cell state for the grid. Drum lanes reflect the editable
// drumSteps mirror; melody lanes are read-only, derived straight from the
// active preset's note/chord data.
const gridCells = computed<Record<TrackKey, CellDisplay[]>>(() => {
  const kick = drumSteps.kick.map(v => ({ active: v > 0, accent: v === ACCENT, text: null }))
  const snare = drumSteps.snare.map(v => ({ active: v > 0, accent: v === ACCENT, text: null }))
  const hihat = drumSteps.hihat.map(v => ({ active: v > 0, accent: v === ACCENT, text: null }))

  const bass: CellDisplay[] = Array.from({ length: 32 }, () => ({ active: false, accent: false, text: null }))
  for (const note of activePreset.value.bass.notes)
    bass[beatToStep(note.time)] = { active: true, accent: false, text: note.note }

  const lead: CellDisplay[] = Array.from({ length: 32 }, () => ({ active: false, accent: false, text: null }))
  for (const chord of activePreset.value.lead.notes)
    lead[beatToStep(chord.time)] = { active: true, accent: false, text: chord.label }

  return { kick, snare, hihat, bass, lead }
})

function isDrumKey(key: string): key is DrumKey {
  return key === 'kick' || key === 'snare' || key === 'hihat'
}

// Cycle a step's velocity: rest -> normal -> accent -> rest.
function cycleStep(v: number): number {
  if (v <= 0)
    return NORMAL
  if (v < ACCENT)
    return ACCENT
  return 0
}

function drumTrackInstance(key: DrumKey) {
  if (key === 'kick')
    return kickTrack.value
  if (key === 'snare')
    return snareTrack.value
  return hihatTrack.value
}

// Cell click cycles the visual pattern immediately; audio is only updated
// if the library has been initialized (guarded — matches the no-load-button
// lazy-init pattern used everywhere else in this demo).
function clickStep(key: string, index: number) {
  if (!isDrumKey(key))
    return
  drumSteps[key][index] = cycleStep(drumSteps[key][index])
  if (!transport.value)
    return
  drumTrackInstance(key)?.setPattern(drumSteps[key])
}

function cellAriaLabel(track: { key: TrackKey, label: string, isDrum: boolean }, i: number): string {
  const cell = gridCells.value[track.key]?.[i - 1]
  if (!cell)
    return `${track.label} step ${i}`
  if (track.isDrum) {
    const state = cell.accent ? ' (accent)' : cell.active ? ' (active)' : ''
    return `${track.label} step ${i}${state}`
  }
  return `${track.label} step ${i}${cell.text ? ` (${cell.text})` : ''}`
}

// Check if any track is soloed
function anySoloed(): boolean {
  const ts = trackState.value
  return ts.kick.soloed || ts.snare.soloed || ts.hihat.soloed || ts.bass.soloed || ts.lead.soloed
}

// Mute/solo guard for melody tracks
function shouldPlay(name: 'bass' | 'lead'): boolean {
  const ts = trackState.value
  if (anySoloed())
    return ts[name].soloed
  return !ts[name].muted
}

// Apply mute/solo to drum BeatTracks based on current state
function syncDrumMuteSolo() {
  if (!kickTrack.value || !snareTrack.value || !hihatTrack.value)
    return

  const ts = trackState.value
  const hasSolo = anySoloed()

  kickTrack.value.muted = hasSolo ? !ts.kick.soloed : ts.kick.muted
  snareTrack.value.muted = hasSolo ? !ts.snare.soloed : ts.snare.muted
  hihatTrack.value.muted = hasSolo ? !ts.hihat.soloed : ts.hihat.muted
}

function toggleMute(track: keyof typeof trackState.value) {
  trackState.value[track].muted = !trackState.value[track].muted
  syncDrumMuteSolo()
}

function toggleSolo(track: keyof typeof trackState.value) {
  trackState.value[track].soloed = !trackState.value[track].soloed
  syncDrumMuteSolo()
}

// Silence all melodic oscillators. stop() also cancels a lookahead-scheduled
// play that hasn't started yet (core guarantees this), so no note slips
// through after the transport stops.
function stopVoiceOscs() {
  for (const osc of bassNoteOscs) void osc.stop()
  for (const chordOscs of leadNoteOscs) {
    for (const osc of chordOscs) void osc.stop()
  }
}

function disposeVoiceOscs() {
  stopVoiceOscs()
  for (const osc of bassNoteOscs) osc.dispose()
  for (const chordOscs of leadNoteOscs) {
    for (const osc of chordOscs) osc.dispose()
  }
  bassNoteOscs = []
  leadNoteOscs = []
}

async function buildVoiceOscillators(ctx: AudioContext, voice: VoiceSpec, notes: string[]): Promise<Oscillator[]> {
  return Promise.all(notes.map(note =>
    createOscillator(ctx, { note, type: voice.type, gain: voice.gain, envelope: voice.envelope }),
  ))
}

// Apply preset — update patterns and re-schedule melody.
// Visual state (drum mirror, swing, bpm display) updates unconditionally.
// Audio-side calls are guarded: if audio not yet initialized, only visual
// state updates. The preset is re-applied after ensureLoaded() completes.
async function applyPreset(preset: TransportPreset) {
  activePresetName.value = preset.name
  bpm.value = preset.bpm
  swing.value = preset.swing * 100
  drumSteps.kick = [...preset.kick.steps]
  drumSteps.snare = [...preset.snare.steps]
  drumSteps.hihat = [...preset.hihat.steps]

  if (!transport.value || !audioContext)
    return

  transport.value.bpm = preset.bpm
  transport.value.swing = preset.swing

  kickTrack.value?.setPattern(drumSteps.kick)
  snareTrack.value?.setPattern(drumSteps.snare)
  hihatTrack.value?.setPattern(drumSteps.hihat)

  bassSeq.value?.clear()
  leadSeq.value?.clear()

  disposeVoiceOscs()
  const ctx = audioContext
  bassNoteOscs = await buildVoiceOscillators(ctx, preset.bass.voice, preset.bass.notes.map(n => n.note))
  leadNoteOscs = await Promise.all(
    preset.lead.notes.map(chord => buildVoiceOscillators(ctx, preset.lead.voice, chord.notes)),
  )

  preset.bass.notes.forEach((noteEvt, i) => {
    bassSeq.value?.at(noteEvt.time, (t: number) => {
      if (!shouldPlay('bass'))
        return
      const osc = bassNoteOscs[i]
      if (!osc || !audioContext)
        return
      osc.playIn(Math.max(0, t - audioContext.currentTime))
    })
  })

  preset.lead.notes.forEach((chord, i) => {
    leadSeq.value?.at(chord.time, (t: number) => {
      if (!shouldPlay('lead'))
        return
      if (!audioContext)
        return
      const oscs = leadNoteOscs[i]
      if (!oscs)
        return
      const offset = Math.max(0, t - audioContext.currentTime)
      for (const osc of oscs) osc.playIn(offset)
    })
  })
}

// Lazy-load all audio resources on first play
async function ensureLoaded() {
  if (transport.value)
    return

  const tp = cleanup.register(await loadTransport({ bpm: bpm.value, timeSignature: [4, 4], ticksPerBeat: 12 }))
  tp.loop = true
  tp.loopEnd = '2m'
  audioContext = await getContext()

  // Create drum BeatTracks
  const kickUrls = [
    '/ez-web-audio/audio/drum-samples/kick1.wav',
    '/ez-web-audio/audio/drum-samples/kick2.wav',
    '/ez-web-audio/audio/drum-samples/kick3.wav',
  ]
  const snareUrls = [
    '/ez-web-audio/audio/drum-samples/snare1.wav',
    '/ez-web-audio/audio/drum-samples/snare2.wav',
    '/ez-web-audio/audio/drum-samples/snare3.wav',
  ]
  const hihatUrls = [
    '/ez-web-audio/audio/drum-samples/hihat1.wav',
    '/ez-web-audio/audio/drum-samples/hihat2.wav',
    '/ez-web-audio/audio/drum-samples/hihat3.wav',
  ]

  const kt = cleanup.register(await loadKick(kickUrls, { numBeats: 32 }))
  const st = cleanup.register(await loadSnare(snareUrls, { numBeats: 32 }))
  const ht = cleanup.register(await loadHihat(hihatUrls, { numBeats: 32 }))
  // Headroom so drums + bass + lead don't clip the master bus.
  kt.gain = 0.7
  st.gain = 0.7
  ht.gain = 0.6

  // Sync to transport
  kt.syncTo(tp, { noteType: 1 / 16 })
  st.syncTo(tp, { noteType: 1 / 16 })
  ht.syncTo(tp, { noteType: 1 / 16 })

  // Bass/lead oscillators are created per-note in applyPreset() — see
  // bassNoteOscs / leadNoteOscs.

  // Create melody sequences
  cleanup.register(await loadBassSeq(tp, { length: '2m', loop: true }))
  cleanup.register(await loadLeadSeq(tp, { length: '2m', loop: true }))

  // Apply whatever preset was active when ensureLoaded was triggered
  // (may differ from the default if the user clicked a preset before Play)
  await applyPreset(activePreset.value)

  // Register tick handler to drive step grid playhead
  // ticksPerBeat:12 — scale tick to 16th-note step within beat (0-3)
  tp.on('tick', (e: CustomEvent<{ bar: number, beat: number, tick: number, seconds: number }>) => {
    const { bar, beat, tick } = e.detail
    // Convert tick (0-11 with ticksPerBeat:12) to 16th-note position (0-3)
    const sixteenthTick = Math.floor(tick * 4 / 12)
    const step = ((bar - 1) * 16) + ((beat - 1) * 4) + sixteenthTick
    currentStep.value = step % 32
    positionDisplay.value = `${bar}:${beat}`
  })
}

// BPM watch — update transport bpm immediately during playback
watch(bpm, (v) => {
  if (transport.value)
    transport.value.bpm = Math.max(40, Math.min(300, v))
})

// Swing watch — Knob emits 0-100; transport.swing wants 0-1
watch(swing, (v) => {
  if (transport.value)
    transport.value.swing = v / 100
})

// Transport controls
async function play() {
  try {
    error.value = ''
    await ensureLoaded()
    transport.value?.start()
    playing.value = true
    paused.value = false
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Audio error'
  }
}

function pause() {
  transport.value?.pause()
  // Cut sounding melody notes — a paused sequencer should go quiet, not
  // trail note tails into the silence
  stopVoiceOscs()
  paused.value = true
  currentStep.value = -1
}

function resume() {
  transport.value?.start()
  paused.value = false
}

function stop() {
  transport.value?.stop()
  // Transport.stop() halts the scheduler, but notes already sounding (or
  // lookahead-scheduled) must be silenced explicitly
  stopVoiceOscs()
  playing.value = false
  paused.value = false
  currentStep.value = -1
  positionDisplay.value = '1:1'
}

// Handle preset button click — visual update is immediate;
// audio is applied only if initialized (guarded inside applyPreset).
function selectPreset(preset: TransportPreset) {
  void applyPreset(preset)
}

// Cleanup on unmount is handled by useCleanup() for composable-managed
// instances; per-note melodic oscillators are disposed manually (ephemeral-
// churn escape hatch — useCleanup has no unregister)
onUnmounted(() => {
  disposeVoiceOscs()
})

// Track definitions for template iteration
const tracks: { key: TrackKey, label: string, isDrum: boolean }[] = [
  { key: 'kick', label: 'Kick', isDrum: true },
  { key: 'snare', label: 'Snare', isDrum: true },
  { key: 'hihat', label: 'Hi-hat', isDrum: true },
  { key: 'bass', label: 'Bass', isDrum: false },
  { key: 'lead', label: 'Lead', isDrum: false },
]
</script>

<template>
  <DemoFrame
    class="transport-sequencer-demo"
    :error="error"
    takeaway="A BPM-synced, editable timeline with musical time notation."
  >
    <!-- Transport controls bar -->
    <div class="transport-bar">
      <div class="transport-buttons">
        <!-- Single play/pause/resume control with fixed label states to prevent layout shift -->
        <PlayButton
          :playing="playing && !paused"
          :label="paused ? 'Resume' : 'Play'"
          playing-label="Pause"
          :aria-label="playing && !paused ? 'Pause' : paused ? 'Resume' : 'Play'"
          @click="playing && !paused ? pause() : paused ? resume() : play()"
        />
        <button
          class="stop-btn"
          aria-label="Stop"
          @click="stop()"
        >
          Stop
        </button>
      </div>

      <SegmentDisplay
        :value="positionDisplay"
        caption="Bar:Beat"
        aria-label="Transport position (bar:beat)"
      />

      <div class="bpm-controls">
        <span class="bpm-label">BPM</span>
        <input
          v-model.number="bpm"
          type="range"
          min="40"
          max="300"
          step="1"
          class="bpm-slider"
          :aria-label="`BPM: ${bpm}`"
        >
        <input
          v-model.number="bpm"
          type="number"
          min="40"
          max="300"
          class="bpm-number"
          :aria-label="`BPM value: ${bpm}`"
        >
      </div>

      <Knob
        v-model="swing"
        label="Swing"
        :min="0"
        :max="100"
        :step="1"
        :format="(v: number) => `${Math.round(v)}%`"
      />
    </div>

    <!-- Preset buttons -->
    <div class="preset-row">
      <span class="preset-label">Preset:</span>
      <button
        v-for="preset in TRANSPORT_PRESETS"
        :key="preset.name"
        class="preset-btn"
        :class="{ active: activePresetName === preset.name }"
        :aria-label="`Load preset: ${preset.name}`"
        :aria-pressed="activePresetName === preset.name"
        @click="selectPreset(preset)"
      >
        {{ preset.name }}
      </button>
    </div>

    <!-- Step grid — scrolls horizontally; track controls and labels are sticky -->
    <div class="step-grid-wrap" aria-label="Step sequencer grid">
      <p class="grid-read-only-note">
        Click drum cells to edit the pattern (rest → normal → accent → rest). Bass/Lead follow the preset.
      </p>

      <div class="step-grid">
        <!-- Beat markers header -->
        <div class="grid-header">
          <div class="header-controls-spacer sticky-col" />
          <div class="header-label-spacer sticky-label" />
          <div class="header-steps">
            <template v-for="bar in 2" :key="`bar-${bar}`">
              <div class="bar-group">
                <div class="bar-label">
                  Bar {{ bar }}
                </div>
                <div class="beat-markers">
                  <div
                    v-for="step in 16"
                    :key="`header-${(bar - 1) * 16 + step - 1}`"
                    class="step-header-cell"
                    :class="{ 'beat-start': (step - 1) % 4 === 0 }"
                  >
                    {{ (step - 1) % 4 === 0 ? Math.floor((step - 1) / 4) + 1 : '' }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Track rows -->
        <div
          v-for="track in tracks"
          :key="track.key"
          class="track-row"
          :class="{ muted: trackState[track.key].muted, soloed: trackState[track.key].soloed }"
        >
          <!-- Track controls (M/S buttons) — sticky left -->
          <div class="track-controls sticky-col">
            <button
              class="ms-btn mute-btn"
              :class="{ muted: trackState[track.key].muted }"
              :aria-label="`Mute ${track.label}`"
              :aria-pressed="trackState[track.key].muted"
              @click="toggleMute(track.key)"
            >
              M
            </button>
            <button
              class="ms-btn solo-btn"
              :class="{ soloed: trackState[track.key].soloed }"
              :aria-label="`Solo ${track.label}`"
              :aria-pressed="trackState[track.key].soloed"
              @click="toggleSolo(track.key)"
            >
              S
            </button>
          </div>

          <!-- Track label — sticky left after controls -->
          <div class="track-label sticky-label">
            {{ track.label }}
          </div>

          <!-- 32 step cells -->
          <div class="step-cells">
            <div
              v-for="i in 32"
              :key="`${track.key}-step-${i}`"
              class="step-cell"
              :class="{
                'active': gridCells[track.key]?.[i - 1]?.active,
                'accent': gridCells[track.key]?.[i - 1]?.accent,
                'playhead': (i - 1) === currentStep,
                'drum-cell': track.isDrum,
                'melody-cell': !track.isDrum,
                'bar-divider': (i - 1) === 16,
              }"
              :aria-label="cellAriaLabel(track, i)"
              @click="clickStep(track.key, i - 1)"
            >
              <span v-if="!track.isDrum && gridCells[track.key]?.[i - 1]?.text" class="note-name">
                {{ gridCells[track.key][i - 1].text }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DemoFrame>
</template>

<style scoped>
/* Transport bar */
.transport-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.transport-buttons {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.stop-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--vp-font-family-base);
  transition: border-color 0.18s, color 0.18s;
}

.stop-btn:hover {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.bpm-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bpm-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ewa-text-2);
}

.bpm-slider {
  width: 120px;
  accent-color: var(--ewa-accent);
}

.bpm-number {
  width: 56px;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--ewa-line);
  border-radius: 4px;
  background: var(--ewa-well);
  color: var(--ewa-text);
  font-size: 0.85rem;
  text-align: center;
}

/* Preset row */
.preset-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.preset-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ewa-text-2);
}

.preset-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 7px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-btn:hover {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.preset-btn.active {
  background: var(--ewa-accent);
  border-color: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

/* Read-only note */
.grid-read-only-note {
  font-size: 0.75rem;
  color: var(--ewa-text-3);
  margin: 0 0 0.5rem;
  font-style: italic;
}

/* Step grid wrapper — fluid by default; horizontal scroll only kicks in
   below the grid's minimum usable width */
.step-grid-wrap {
  overflow-x: auto;
}

/* Step grid — fills the available width; cells flex to fit */
.step-grid {
  width: 100%;
  min-width: 560px;
}

/* Grid header row */
.grid-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

/* Sticky columns — controls and label stick to left during horizontal scroll */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--ewa-panel);
}

.sticky-label {
  position: sticky;
  left: 60px; /* width of sticky-col (52px) + gap (8px) */
  z-index: 2;
  background: var(--ewa-panel);
}

.header-controls-spacer {
  width: 60px;
  flex-shrink: 0;
}

.header-label-spacer {
  min-width: 84px;
  flex-shrink: 0;
}

.header-steps {
  display: flex;
  gap: 0;
  flex: 1;
  min-width: 0;
}

.bar-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.bar-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ewa-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
  padding-left: 2px;
}

.beat-markers {
  display: flex;
  gap: 0;
}

.step-header-cell {
  flex: 1 1 0;
  min-width: 13px;
  height: 16px;
  font-size: 0.68rem;
  color: var(--ewa-text-3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
}

.step-header-cell.beat-start {
  color: var(--ewa-text-2);
  font-weight: 600;
  border-left: 1px solid var(--ewa-line);
}

/* Track rows */
.track-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}

.track-row.muted {
  opacity: 0.4;
}

/* Track controls (M/S buttons) — sticky left */
.track-controls {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 60px;
  flex-shrink: 0;
  padding-right: 8px;
}

.ms-btn {
  /* Minimum 36px height for comfortable touch targets */
  padding: 6px 8px;
  border-radius: 3px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.15s;
  line-height: 1.4;
  min-height: 28px;
}

.ms-btn:hover {
  border-color: var(--ewa-accent);
}

.mute-btn.muted {
  background: var(--ewa-warn-soft);
  border-color: var(--ewa-warn);
  color: var(--ewa-warn);
}

.solo-btn.soloed {
  background: var(--ewa-accent-soft);
  border-color: var(--ewa-accent);
  color: var(--ewa-accent);
}

/* Track label — sticky left after controls */
.track-label {
  min-width: 84px;
  font-size: 0.74rem;
  color: var(--ewa-text-2);
  font-weight: 500;
  text-align: right;
  padding-right: 8px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Step cells */
.step-cells {
  display: flex;
  gap: 0;
  position: relative;
  flex: 1;
  min-width: 0;
}

.step-cell {
  flex: 1 1 0;
  min-width: 13px;
  height: 28px;
  border: 1px solid var(--ewa-line);
  border-right: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-family: var(--vp-font-family-mono);
  cursor: default;
  transition: background 0.1s;
  background: var(--ewa-bg);
  position: relative;
}

.step-cell:last-child {
  border-right: 1px solid var(--ewa-line);
}

/* Bar divider — left border on step 17 (index 16) */
.step-cell.bar-divider {
  border-left: 2px solid var(--ewa-accent);
}

/* Drum cells are editable — pointer cursor signals clickability */
.step-cell.drum-cell {
  cursor: pointer;
}

/* Normal-velocity active cells — softer fill than accent */
.step-cell.drum-cell.active {
  background: color-mix(in srgb, var(--ewa-accent) 55%, var(--ewa-bg));
  color: transparent;
}

/* Accent cells — full-strength fill, visually stronger than normal */
.step-cell.drum-cell.active.accent {
  background: var(--ewa-accent);
}

.step-cell.melody-cell.active {
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

/* Playhead — accent-warn outline column indicator */
.step-cell.playhead {
  outline: 2px solid var(--ewa-warn);
  outline-offset: -2px;
  z-index: 1;
}

.note-name {
  font-size: 0.52rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
}

/* Buttons focus */
button:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .transport-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .track-label {
    min-width: 72px;
  }

  .header-label-spacer {
    min-width: 72px;
  }

  .sticky-label {
    left: 60px;
  }

  .bpm-slider {
    width: 90px;
  }
}

@media (max-width: 480px) {
  .track-label {
    min-width: 64px;
    font-size: 0.68rem;
  }

  .header-label-spacer {
    min-width: 64px;
  }
}
</style>

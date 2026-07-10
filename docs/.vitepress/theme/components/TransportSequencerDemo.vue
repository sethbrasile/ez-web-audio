<script setup lang="ts">
import type { Oscillator } from 'ez-web-audio'
import { useAudioContext, useBeatTrack, useCleanup, useFont, useSequence, useTransport } from '@ez-web-audio/vue'
import { createOscillator } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'

// Audio state — composable-managed, single instance per component lifetime.
// Created once in ensureLoaded(); disposed automatically by useCleanup() on unmount.
const cleanup = useCleanup()
const { getContext } = useAudioContext()
const { instance: transport, load: loadTransport } = useTransport()
const { instance: kickTrack, load: loadKick } = useBeatTrack()
const { instance: snareTrack, load: loadSnare } = useBeatTrack()
const { instance: hihatTrack, load: loadHihat } = useBeatTrack()
const { instance: pianoFont, load: loadPianoFont } = useFont()
const { instance: bassSeq, load: loadBassSeq } = useSequence()
const { instance: pianoSeq, load: loadPianoSeq } = useSequence()
let audioContext: AudioContext | null = null

// Per-note bass oscillators (ephemeral-churn escape hatch — see composables.ts).
// Each scheduled bass note owns its Oscillator so overlapping/adjacent notes
// never fight over one instance; recreated on preset change, disposed manually.
let bassNoteOscs: Oscillator[] = []
// Piano note identifiers the active preset uses — so stop() can silence them.
let usedPianoNotes: string[] = []

// Reactive UI state
const playing = ref(false)
const paused = ref(false)
const bpm = ref(120)
const currentStep = ref(-1)
const positionDisplay = ref('1:1')
const error = ref('')
const activePreset = ref('Straight Rock')
const trackState = ref({
  kick: { muted: false, soloed: false },
  snare: { muted: false, soloed: false },
  hihat: { muted: false, soloed: false },
  bass: { muted: false, soloed: false },
  piano: { muted: false, soloed: false },
})

// Preset data — 32-step patterns (16th-note grid, 2 bars).
// Times are numeric beats (0-indexed, 0..7.75) so they map exactly onto the
// grid and stay BPM-independent. Each preset is written in one key so drums,
// bass, and piano actually work together (gate-2 musical redesign):
//   Straight Rock  — E minor: root-motion bass, Em/G piano stabs on offbeats
//   Funk Groove    — A minor: syncopated octave bass, Am7 stabs
//   Triplet Feel   — E minor shuffle: swung walk-up bass, swung Em stabs
interface Preset {
  kick: number[]
  snare: number[]
  hihat: number[]
  /** Bass notes: beat position, frequency (Hz), gate time (seconds). */
  bassNotes: { time: number, freq: number, duration: number }[]
  /** Piano stabs: beat position, chord tones, display label for the grid. */
  pianoNotes: { time: number, notes: string[], label: string }[]
}

const PRESETS: Record<string, Preset> = {
  'Straight Rock': {
    // Kick on 1 & 3 with an and-of-2 pickup in bar 2; snare backbeat; 8th hats
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    // Em: root E2 anchoring beats, G2/A2 passing tones, D2 walkdown into the loop
    bassNotes: [
      { time: 0, freq: 82.41, duration: 0.45 }, // E2
      { time: 1.5, freq: 82.41, duration: 0.2 }, // E2 (and-of-2 push)
      { time: 2, freq: 98, duration: 0.45 }, // G2
      { time: 3, freq: 110, duration: 0.45 }, // A2
      { time: 4, freq: 82.41, duration: 0.45 }, // E2
      { time: 5.5, freq: 82.41, duration: 0.2 }, // E2
      { time: 6, freq: 98, duration: 0.45 }, // G2
      { time: 7, freq: 73.42, duration: 0.4 }, // D2 (walk back to E)
    ],
    // Em stabs on the and-of-2 / and-of-4; G major turn at the loop end
    pianoNotes: [
      { time: 1.5, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 3.5, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 5.5, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 7.5, notes: ['G4', 'B4', 'D5'], label: 'G' },
    ],
  },
  'Funk Groove': {
    // Syncopated kick, backbeat snare with a ghost, 16th hats with gaps
    kick: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    // Am octave funk: A1 root with 16th pushes, A2 octave pop, pentatonic
    // walk-up (C-D-E) in bar 2 resolving back to A1
    bassNotes: [
      { time: 0, freq: 55, duration: 0.2 }, // A1
      { time: 0.75, freq: 55, duration: 0.15 }, // A1 (16th push)
      { time: 1.25, freq: 110, duration: 0.15 }, // A2 (octave pop)
      { time: 2.5, freq: 49, duration: 0.2 }, // G1
      { time: 3, freq: 55, duration: 0.3 }, // A1
      { time: 4, freq: 55, duration: 0.2 }, // A1
      { time: 4.75, freq: 65.41, duration: 0.15 }, // C2
      { time: 5, freq: 73.42, duration: 0.2 }, // D2
      { time: 5.75, freq: 82.41, duration: 0.15 }, // E2
      { time: 6.5, freq: 49, duration: 0.2 }, // G1
      { time: 7, freq: 55, duration: 0.4 }, // A1
    ],
    // Am7 stabs on offbeats — classic funk comping placement
    pianoNotes: [
      { time: 1.5, notes: ['A3', 'C4', 'E4', 'G4'], label: 'Am7' },
      { time: 3.75, notes: ['A3', 'C4', 'E4', 'G4'], label: 'Am7' },
      { time: 5.5, notes: ['A3', 'C4', 'E4', 'G4'], label: 'Am7' },
      { time: 7.5, notes: ['A3', 'C4', 'E4', 'G4'], label: 'Am7' },
    ],
  },
  'Triplet Feel': {
    // Shuffle approximated on the 16th grid: swung positions at x.75
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    hihat: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    // Em shuffle walk: swung pickups (x.75) between chord tones
    bassNotes: [
      { time: 0, freq: 82.41, duration: 0.35 }, // E2
      { time: 0.75, freq: 98, duration: 0.2 }, // G2 (swung pickup)
      { time: 1, freq: 110, duration: 0.35 }, // A2
      { time: 2, freq: 123.47, duration: 0.35 }, // B2
      { time: 2.75, freq: 110, duration: 0.2 }, // A2
      { time: 3, freq: 98, duration: 0.35 }, // G2
      { time: 4, freq: 82.41, duration: 0.35 }, // E2
      { time: 4.75, freq: 98, duration: 0.2 }, // G2
      { time: 5, freq: 110, duration: 0.35 }, // A2
      { time: 6, freq: 123.47, duration: 0.35 }, // B2
      { time: 6.75, freq: 110, duration: 0.2 }, // A2
      { time: 7, freq: 98, duration: 0.35 }, // G2 (resolves to E on loop)
    ],
    // Em stabs on swung offbeats
    pianoNotes: [
      { time: 1.75, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 3.75, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 5.75, notes: ['E4', 'G4', 'B4'], label: 'Em' },
      { time: 7.75, notes: ['E4', 'G4', 'B4'], label: 'Em' },
    ],
  },
}

// Compute step cells per track for the grid display
// Each track gets a map: stepIndex (0-31) -> { active: boolean, noteName: string | null }
const stepCells = computed(() => {
  const preset = PRESETS[activePreset.value]
  const result: Record<string, { active: boolean, noteName: string | null }[]> = {}

  // Drum tracks — direct from pattern array
  for (const drumName of ['kick', 'snare', 'hihat'] as const) {
    result[drumName] = preset[drumName].map(v => ({ active: v === 1, noteName: null }))
  }

  // Melody tracks — map beat positions to 16th-note steps
  // (beat values are 0-indexed; 2 bars = 8 beats = 32 steps)
  function beatToStep(beatValue: number): number {
    return Math.round(beatValue * 4) % 32
  }

  // Bass cells
  const bassCells: { active: boolean, noteName: string | null }[] = Array.from({ length: 32 }, () => ({
    active: false,
    noteName: null,
  }))
  for (const note of preset.bassNotes) {
    const step = beatToStep(note.time)
    if (step >= 0 && step < 32) {
      bassCells[step] = { active: true, noteName: freqToNoteName(note.freq) }
    }
  }
  result.bass = bassCells

  // Piano cells — one cell per chord stab, labelled with the chord name
  const pianoCells: { active: boolean, noteName: string | null }[] = Array.from({ length: 32 }, () => ({
    active: false,
    noteName: null,
  }))
  for (const chord of preset.pianoNotes) {
    const step = beatToStep(chord.time)
    if (step >= 0 && step < 32) {
      pianoCells[step] = { active: true, noteName: chord.label }
    }
  }
  result.piano = pianoCells

  return result
})

// Helper to convert frequency to a note name for display
function freqToNoteName(freq?: number): string {
  if (!freq)
    return ''
  const noteNames: Record<number, string> = {
    41.2: 'E1',
    49: 'G1',
    55: 'A1',
    65.41: 'C2',
    73.42: 'D2',
    82.41: 'E2',
    98: 'G2',
    110: 'A2',
    123.47: 'B2',
  }
  // Find closest match
  let closestNote = ''
  let closestDiff = Infinity
  for (const [f, name] of Object.entries(noteNames)) {
    const diff = Math.abs(Number(f) - freq)
    if (diff < closestDiff) {
      closestDiff = diff
      closestNote = name
    }
  }
  return closestNote
}

// Check if any track is soloed
function anySoloed(): boolean {
  const ts = trackState.value
  return ts.kick.soloed || ts.snare.soloed || ts.hihat.soloed || ts.bass.soloed || ts.piano.soloed
}

// Mute/solo guard for melody tracks
function shouldPlay(name: 'bass' | 'piano'): boolean {
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

  // For drums, use BeatTrack.muted and BeatTrack.solo
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

// Silence all bass oscillators. stop() also cancels a lookahead-scheduled
// play that hasn't started yet (core guarantees this), so no note slips
// through after the transport stops.
function stopBassNotes() {
  for (const osc of bassNoteOscs) {
    void osc.stop()
  }
}

// Silence the piano notes the active preset uses (Font caches one
// SampledNote instance per identifier, so stopping by name works).
function stopPianoNotes() {
  if (!pianoFont.value)
    return
  for (const id of usedPianoNotes) {
    void pianoFont.value.getNote(id)?.stop()
  }
}

function disposeBassNotes() {
  stopBassNotes()
  for (const osc of bassNoteOscs) {
    osc.dispose()
  }
  bassNoteOscs = []
}

// Apply preset — update patterns and re-schedule melody
// Audio-side calls are guarded: if audio not yet initialized, only visual state updates.
// The preset is re-applied after ensureLoaded() completes.
async function applyPreset(name: string) {
  activePreset.value = name

  // Guard: only apply audio-side if library is initialized
  if (!transport.value || !audioContext)
    return

  const preset = PRESETS[name]

  // Update drum patterns
  kickTrack.value?.setPattern(preset.kick)
  snareTrack.value?.setPattern(preset.snare)
  hihatTrack.value?.setPattern(preset.hihat)

  // Re-schedule melody sequences
  bassSeq.value?.clear()
  pianoSeq.value?.clear()

  // One Oscillator per bass note: adjacent/overlapping notes never fight over
  // a shared instance (the old single-oscillator approach orphaned nodes and
  // left bass notes hanging). Triangle for a round bass tone; gain 0.5 is the
  // level lever (phase-75 note: a lowpass on a triangle this low is inaudible).
  disposeBassNotes()
  const ctx = audioContext
  bassNoteOscs = await Promise.all(preset.bassNotes.map(noteEvt =>
    createOscillator(ctx, { frequency: noteEvt.freq, type: 'triangle', gain: 0.5 }),
  ))

  preset.bassNotes.forEach((noteEvt, i) => {
    bassSeq.value?.at(noteEvt.time, (t: number) => {
      if (!shouldPlay('bass'))
        return
      const osc = bassNoteOscs[i]
      if (!osc || !audioContext)
        return
      const offset = Math.max(0, t - audioContext.currentTime)
      osc.playIn(offset)
      // Gate the note off with a short sample-accurate gain fade at its exact
      // end time — background-tab safe (no JS timers on the audio path) and
      // click-free. The node keeps running silently; the next play() replaces
      // it (setup neutralizes the old node) and stop() kills it outright.
      const stopT = t + noteEvt.duration
      const level = osc.volume
      const gain = osc.getGainNode().gain
      gain.setValueAtTime(level, stopT - 0.02)
      gain.linearRampToValueAtTime(0, stopT)
    })
  })

  usedPianoNotes = [...new Set(preset.pianoNotes.flatMap(c => c.notes))]
  for (const chord of preset.pianoNotes) {
    pianoSeq.value?.at(chord.time, (t: number) => {
      if (!shouldPlay('piano'))
        return
      if (!pianoFont.value || !audioContext)
        return
      const offset = Math.max(0, t - audioContext.currentTime)
      for (const noteName of chord.notes) {
        pianoFont.value.getNote(noteName)?.playIn(offset)
      }
    })
  }
}

// Lazy-load all audio resources on first play
async function ensureLoaded() {
  if (transport.value)
    return

  const tp = cleanup.register(await loadTransport({ bpm: bpm.value, timeSignature: [4, 4], ticksPerBeat: 12 }))
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
  // Headroom so drums + bass + piano don't clip the master bus (phase 75).
  kt.gain = 0.7
  st.gain = 0.7
  ht.gain = 0.6

  // Sync to transport
  kt.syncTo(tp, { noteType: 1 / 16 })
  st.syncTo(tp, { noteType: 1 / 16 })
  ht.syncTo(tp, { noteType: 1 / 16 })

  // Bass oscillators are created per-note in applyPreset() — see bassNoteOscs.

  // Create piano soundfont
  cleanup.register(await loadPianoFont('/ez-web-audio/audio/piano.js'))

  // Create melody sequences
  cleanup.register(await loadBassSeq(tp, { length: '2m', loop: true }))
  cleanup.register(await loadPianoSeq(tp, { length: '2m', loop: true }))

  // Apply whatever preset was active when ensureLoaded was triggered
  // (may differ from 'Straight Rock' if user clicked a preset before Play)
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
  // trail 4-second piano tails into the silence
  stopBassNotes()
  stopPianoNotes()
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
  stopBassNotes()
  stopPianoNotes()
  playing.value = false
  paused.value = false
  currentStep.value = -1
  positionDisplay.value = '1:1'
}

// Handle preset button click — visual update is immediate;
// audio is applied only if initialized (guarded inside applyPreset).
function selectPreset(name: string) {
  void applyPreset(name)
}

// Cleanup on unmount is handled by useCleanup() for composable-managed
// instances; per-note bass oscillators are disposed manually (ephemeral-churn
// escape hatch — useCleanup has no unregister)
onUnmounted(() => {
  disposeBassNotes()
})

// Track definitions for template iteration
const tracks = [
  { key: 'kick' as const, label: 'Kick', isDrum: true },
  { key: 'snare' as const, label: 'Snare', isDrum: true },
  { key: 'hihat' as const, label: 'Hi-hat', isDrum: true },
  { key: 'bass' as const, label: 'Bass', isDrum: false },
  { key: 'piano' as const, label: 'Piano', isDrum: false },
]

const presetNames = ['Straight Rock', 'Funk Groove', 'Triplet Feel']
</script>

<template>
  <div class="transport-sequencer-demo">
    <!-- Error display -->
    <div v-if="error" class="error-bar">
      {{ error }}
    </div>

    <!-- Transport controls bar -->
    <div class="transport-bar">
      <div class="transport-buttons">
        <!-- Single play/pause/resume button with fixed width to prevent layout shift -->
        <button
          class="transport-btn play-btn"
          :aria-label="playing && !paused ? 'Pause' : paused ? 'Resume' : 'Play'"
          @click="playing && !paused ? pause() : paused ? resume() : play()"
        >
          {{ playing && !paused ? 'Pause' : paused ? 'Resume' : 'Play' }}
        </button>
        <button
          class="transport-btn stop-btn"
          aria-label="Stop"
          @click="stop()"
        >
          Stop
        </button>
      </div>

      <div class="position-wrap">
        <span class="position-label">Bar:Beat</span>
        <div class="position-display" aria-label="Transport position (bar:beat)">
          {{ positionDisplay }}
        </div>
      </div>

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
    </div>

    <!-- Preset buttons -->
    <div class="preset-row">
      <span class="preset-label">Preset:</span>
      <button
        v-for="name in presetNames"
        :key="name"
        class="preset-btn"
        :class="{ active: activePreset === name }"
        :aria-label="`Load preset: ${name}`"
        :aria-pressed="activePreset === name"
        @click="selectPreset(name)"
      >
        {{ name }}
      </button>
    </div>

    <!-- Step grid — scrolls horizontally; track controls and labels are sticky -->
    <div class="step-grid-wrap" aria-label="Step sequencer grid (read-only — use presets to change patterns)">
      <p class="grid-read-only-note">
        Patterns are preset-driven. Press Play and switch presets to hear the difference.
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
                'active': stepCells[track.key]?.[i - 1]?.active,
                'playhead': (i - 1) === currentStep,
                'drum-cell': track.isDrum,
                'melody-cell': !track.isDrum,
                'bar-divider': (i - 1) === 16,
              }"
              :aria-label="`${track.label} step ${i}${stepCells[track.key]?.[i - 1]?.active ? ' (active)' : ''}`"
            >
              <span v-if="!track.isDrum && stepCells[track.key]?.[i - 1]?.noteName" class="note-name">
                {{ stepCells[track.key][i - 1].noteName }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transport-sequencer-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.25rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
  font-family: sans-serif;
}

/* Error bar */
.error-bar {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger);
  border-radius: 4px;
  color: var(--vp-c-danger);
  font-size: 0.85rem;
}

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
}

.transport-btn {
  padding: 0.45rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.15s;
  /* Fixed min-width prevents layout shift when text changes Play/Pause/Resume */
  min-width: 72px;
  text-align: center;
}

.transport-btn:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

.play-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.play-btn:hover {
  background: var(--vp-c-brand-dark);
}

.stop-btn {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

/* Position display */
.position-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.position-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.position-display {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.3rem 0.75rem;
  min-width: 60px;
  text-align: center;
}

.bpm-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bpm-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.bpm-slider {
  width: 120px;
}

.bpm-number {
  width: 56px;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
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
  color: var(--vp-c-text-2);
}

.preset-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s;
}

.preset-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.preset-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  font-weight: 600;
}

/* Read-only note */
.grid-read-only-note {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin: 0 0 0.5rem;
  font-style: italic;
}

/* Step grid wrapper — fluid by default; horizontal scroll only kicks in
   below the grid's minimum usable width (gate-2 jui: grid used fixed-width
   cells and always overflowed the content column) */
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
  background: var(--vp-c-bg-soft);
}

.sticky-label {
  position: sticky;
  left: 60px; /* width of sticky-col (52px) + gap (8px) */
  z-index: 2;
  background: var(--vp-c-bg-soft);
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
  color: var(--vp-c-text-2);
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
  color: var(--vp-c-text-3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
}

.step-header-cell.beat-start {
  color: var(--vp-c-text-2);
  font-weight: 600;
  border-left: 1px solid var(--vp-c-divider);
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
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.15s;
  line-height: 1.4;
  min-height: 28px;
}

.ms-btn:hover {
  border-color: var(--vp-c-brand);
}

.mute-btn.muted {
  background: var(--vp-c-yellow-soft, #fef3c7);
  border-color: var(--vp-c-yellow, #f59e0b);
  color: var(--vp-c-yellow-darker, #78350f);
}

.solo-btn.soloed {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* Track label — sticky left after controls */
.track-label {
  min-width: 84px;
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
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
  border: 1px solid var(--vp-c-divider);
  border-right: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-family: monospace;
  cursor: default;
  transition: background 0.1s;
  background: var(--vp-c-bg);
  position: relative;
}

.step-cell:last-child {
  border-right: 1px solid var(--vp-c-divider);
}

/* Bar divider — left border on step 17 (index 16) */
.step-cell.bar-divider {
  border-left: 2px solid var(--vp-c-brand);
}

/* Drum cells */
.step-cell.drum-cell.active {
  background: #555;
  color: transparent;
}

/* Melody cells */
.step-cell.melody-cell.active {
  background: #3a5a8a;
  color: #fff;
}

/* Playhead — yellow background column indicator */
.step-cell.playhead {
  outline: 2px solid #f90;
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
  outline: 2px solid var(--vp-c-brand);
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

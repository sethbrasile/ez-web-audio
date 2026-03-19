<script setup lang="ts">
import type { BeatTrack, Font, Oscillator, Sequence, Transport } from 'ez-web-audio'
import { computed, onUnmounted, ref, watch } from 'vue'

// Module-level audio state (outside reactive state — created once in ensureLoaded)
let lib: any = null
let transport: Transport | null = null
let kickTrack: BeatTrack | null = null
let snareTrack: BeatTrack | null = null
let hihatTrack: BeatTrack | null = null
let bassSeq: Sequence | null = null
let pianoSeq: Sequence | null = null
let bassOsc: Oscillator | null = null
let pianoFont: Font | null = null
let audioContext: AudioContext | null = null

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

// Preset data — 32-step patterns (16th-note grid, 2 bars)
interface NoteEvent {
  time: string | number
  freq?: number
  note?: string
  duration?: number
}

interface Preset {
  kick: number[]
  snare: number[]
  hihat: number[]
  bassNotes: { time: string | number; freq: number; duration: number }[]
  pianoNotes: { time: string | number; note: string }[]
}

const PRESETS: Record<string, Preset> = {
  'Straight Rock': {
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bassNotes: [
      { time: 0, freq: 82.4, duration: 0.4 }, // E2
      { time: '2n', freq: 110, duration: 0.4 }, // A2
      { time: '1m', freq: 98, duration: 0.4 }, // G2
      { time: '1m+2n', freq: 73.4, duration: 0.4 }, // D2
    ],
    pianoNotes: [
      { time: '1:1:0', note: 'C4' },
      { time: '1:2:0', note: 'E4' },
      { time: '1:3:0', note: 'G4' },
      { time: '1:4:0', note: 'E4' },
      { time: '2:1:0', note: 'C4' },
      { time: '2:2:0', note: 'D4' },
      { time: '2:3:0', note: 'G4' },
    ],
  },
  'Funk Groove': {
    kick: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    bassNotes: [
      { time: 0, freq: 55, duration: 0.2 }, // A1
      { time: 0.25, freq: 55, duration: 0.15 }, // A1 (16th note later)
      { time: '1:3:0', freq: 73.4, duration: 0.3 }, // D2
      { time: '2:1:2', freq: 49, duration: 0.2 }, // G1
      { time: '2:3:0', freq: 55, duration: 0.3 }, // A1
    ],
    pianoNotes: [
      { time: '1:1:0', note: 'A3' },
      { time: '1:2:2', note: 'C4' },
      { time: '1:3:0', note: 'E4' },
      { time: '1:4:0', note: 'G4' },
      { time: '2:1:0', note: 'A3' },
      { time: '2:3:0', note: 'C4' },
    ],
  },
  'Triplet Feel': {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bassNotes: [
      { time: 0, freq: 41.2, duration: 0.3 }, // E1
      { time: 1 / 3, freq: 49, duration: 0.3 }, // G1
      { time: 2 / 3, freq: 55, duration: 0.3 }, // A1
      { time: 4, freq: 41.2, duration: 0.3 }, // E1
      { time: 4 + 1 / 3, freq: 49, duration: 0.3 }, // G1
    ],
    pianoNotes: [
      { time: 0, note: 'C4' },
      { time: 4 / 3, note: 'E4' },
      { time: 8 / 3, note: 'G4' },
      { time: 4, note: 'C4' },
      { time: 4 + 4 / 3, note: 'E4' },
      { time: 4 + 8 / 3, note: 'G4' },
    ],
  },
}

// Compute step cells per track for the grid display
// Each track gets a map: stepIndex (0-31) -> { active: boolean, noteName: string | null }
const stepCells = computed(() => {
  const preset = PRESETS[activePreset.value]
  const result: Record<string, { active: boolean; noteName: string | null }[]> = {}

  // Drum tracks — direct from pattern array
  for (const drumName of ['kick', 'snare', 'hihat'] as const) {
    result[drumName] = preset[drumName].map(v => ({ active: v === 1, noteName: null }))
  }

  // Melody tracks — map time positions to 16th-note steps
  // BPM-independent: at 120bpm, 1 beat = 0.5s, 1 bar = 2s, 2 bars = 4s
  // 16th note step = beat / 4, but we work in beat units (0-7 for 2 bars at 4/4)
  function beatToStep(beatValue: number): number {
    // beatValue is in beats (0-indexed). 2 bars = 8 beats = 32 steps
    return Math.round(beatValue * 4) % 32
  }

  // Bass cells
  const bassCells: { active: boolean; noteName: string | null }[] = Array.from({ length: 32 }, () => ({
    active: false,
    noteName: null,
  }))
  // We can only map numeric beat values here (string musical time notation not parseable client-side easily)
  for (const note of preset.bassNotes) {
    if (typeof note.time === 'number') {
      const step = beatToStep(note.time)
      if (step >= 0 && step < 32) {
        bassCells[step] = { active: true, noteName: freqToNoteName(note.freq) }
      }
    }
    // For string times, map known patterns
    else if (note.time === '2n') {
      bassCells[8] = { active: true, noteName: freqToNoteName(note.freq) } // beat 2 = step 8
    }
    else if (note.time === '1m') {
      bassCells[16] = { active: true, noteName: freqToNoteName(note.freq) } // bar 2 = step 16
    }
    else if (note.time === '1m+2n') {
      bassCells[24] = { active: true, noteName: freqToNoteName(note.freq) } // bar 2 beat 3 = step 24
    }
    else if (typeof note.time === 'string' && note.time.includes(':')) {
      // Parse "bar:beat:tick" format
      const parts = note.time.split(':')
      const bar = Number.parseInt(parts[0]) - 1
      const beat = Number.parseInt(parts[1]) - 1
      const tick = parts[2] ? Number.parseInt(parts[2]) : 0
      const step = bar * 16 + beat * 4 + tick
      if (step >= 0 && step < 32) {
        bassCells[step] = { active: true, noteName: freqToNoteName(note.freq) }
      }
    }
  }
  result.bass = bassCells

  // Piano cells
  const pianoCells: { active: boolean; noteName: string | null }[] = Array.from({ length: 32 }, () => ({
    active: false,
    noteName: null,
  }))
  for (const note of preset.pianoNotes) {
    if (typeof note.time === 'number') {
      const step = beatToStep(note.time)
      if (step >= 0 && step < 32) {
        pianoCells[step] = { active: true, noteName: note.note }
      }
    }
    else if (typeof note.time === 'string' && note.time.includes(':')) {
      const parts = note.time.split(':')
      const bar = Number.parseInt(parts[0]) - 1
      const beat = Number.parseInt(parts[1]) - 1
      const tick = parts[2] ? Number.parseInt(parts[2]) : 0
      const step = bar * 16 + beat * 4 + tick
      if (step >= 0 && step < 32) {
        pianoCells[step] = { active: true, noteName: note.note }
      }
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
    41.2: 'E1', 49: 'G1', 55: 'A1', 73.4: 'D2', 82.4: 'E2', 98: 'G2', 110: 'A2',
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
  if (!kickTrack || !snareTrack || !hihatTrack)
    return

  const ts = trackState.value
  const hasSolo = anySoloed()

  // For drums, use BeatTrack.muted and BeatTrack.solo
  kickTrack.muted = hasSolo ? !ts.kick.soloed : ts.kick.muted
  snareTrack.muted = hasSolo ? !ts.snare.soloed : ts.snare.muted
  hihatTrack.muted = hasSolo ? !ts.hihat.soloed : ts.hihat.muted
}

function toggleMute(track: keyof typeof trackState.value) {
  trackState.value[track].muted = !trackState.value[track].muted
  syncDrumMuteSolo()
}

function toggleSolo(track: keyof typeof trackState.value) {
  trackState.value[track].soloed = !trackState.value[track].soloed
  syncDrumMuteSolo()
}

// Apply preset — update patterns and re-schedule melody
function applyPreset(name: string) {
  activePreset.value = name
  const preset = PRESETS[name]

  // Update drum patterns
  kickTrack?.setPattern(preset.kick)
  snareTrack?.setPattern(preset.snare)
  hihatTrack?.setPattern(preset.hihat)

  // Re-schedule melody sequences
  bassSeq?.clear()
  pianoSeq?.clear()

  for (const noteEvt of preset.bassNotes) {
    bassSeq?.at(noteEvt.time, (t: number) => {
      if (!shouldPlay('bass'))
        return
      if (!bassOsc || !audioContext)
        return
      const offset = Math.max(0, t - audioContext.currentTime)
      bassOsc.frequency = noteEvt.freq
      bassOsc.playFor(noteEvt.duration)
    })
  }

  for (const noteEvt of preset.pianoNotes) {
    pianoSeq?.at(noteEvt.time, (t: number) => {
      if (!shouldPlay('piano'))
        return
      if (!pianoFont || !audioContext)
        return
      pianoFont.getNote(noteEvt.note)?.playIn(Math.max(0, t - audioContext.currentTime))
    })
  }
}

// Lazy-load all audio resources on first play
async function ensureLoaded() {
  if (lib)
    return

  lib = await import('ez-web-audio')
  const { createTransport, createSequence, createBeatTrack, createFont, createOscillator } = lib

  transport = await createTransport({ bpm: bpm.value, timeSignature: [4, 4], ticksPerBeat: 4 })
  audioContext = (transport as any).audioContext as AudioContext

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

  kickTrack = await createBeatTrack(kickUrls, { numBeats: 32 })
  snareTrack = await createBeatTrack(snareUrls, { numBeats: 32 })
  hihatTrack = await createBeatTrack(hihatUrls, { numBeats: 32 })

  // Apply initial preset patterns
  kickTrack.setPattern(PRESETS['Straight Rock'].kick)
  snareTrack.setPattern(PRESETS['Straight Rock'].snare)
  hihatTrack.setPattern(PRESETS['Straight Rock'].hihat)

  // Sync to transport
  kickTrack.syncTo(transport, { noteType: 1 / 16 })
  snareTrack.syncTo(transport, { noteType: 1 / 16 })
  hihatTrack.syncTo(transport, { noteType: 1 / 16 })

  // Create bass oscillator (sawtooth, E1 ≈ 41.2 Hz)
  bassOsc = await createOscillator({ frequency: 41.2, type: 'sawtooth' })

  // Create piano soundfont
  pianoFont = await createFont('/ez-web-audio/audio/piano.js')

  // Create melody sequences (SYNC — no await)
  bassSeq = createSequence(transport, { length: '2m', loop: true })
  pianoSeq = createSequence(transport, { length: '2m', loop: true })

  // Schedule initial preset melody events
  applyPreset('Straight Rock')

  // Register tick handler to drive step grid playhead
  transport.on('tick', (e: CustomEvent<{ bar: number; beat: number; tick: number; seconds: number }>) => {
    const { bar, beat, tick } = e.detail
    const step = ((bar - 1) * 16) + ((beat - 1) * 4) + tick
    currentStep.value = step % 32
    positionDisplay.value = `${bar}:${beat}`
  })
}

// BPM watch — update transport bpm immediately during playback
watch(bpm, (v) => {
  if (transport)
    transport.bpm = Math.max(40, Math.min(300, v))
})

// Transport controls
async function play() {
  try {
    error.value = ''
    await ensureLoaded()
    transport?.start()
    playing.value = true
    paused.value = false
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Audio error'
  }
}

function pause() {
  transport?.pause()
  paused.value = true
  currentStep.value = -1
}

function resume() {
  transport?.resume()
  paused.value = false
}

function stop() {
  transport?.stop()
  playing.value = false
  paused.value = false
  currentStep.value = -1
  positionDisplay.value = '1:1'
}

// Handle preset button click
function selectPreset(name: string) {
  applyPreset(name)
}

// Cleanup on unmount
onUnmounted(() => {
  transport?.dispose()
  kickTrack = null
  snareTrack = null
  hihatTrack = null
  bassSeq = null
  pianoSeq = null
  bassOsc?.stop()
  bassOsc = null
  pianoFont = null
  transport = null
  lib = null
  audioContext = null
})

// Track definitions for template iteration
const tracks = [
  { key: 'kick' as const, label: 'Kick', isDrum: true },
  { key: 'snare' as const, label: 'Snare', isDrum: true },
  { key: 'hihat' as const, label: 'Hi-hat', isDrum: true },
  { key: 'bass' as const, label: 'Synth (8th notes)', isDrum: false },
  { key: 'piano' as const, label: 'Piano (quarter notes)', isDrum: false },
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
        <button
          v-if="!playing || paused"
          class="transport-btn play-btn"
          :aria-label="paused ? 'Resume' : 'Play'"
          @click="paused ? resume() : play()"
        >
          {{ paused ? 'Resume' : 'Play' }}
        </button>
        <button
          v-if="playing && !paused"
          class="transport-btn pause-btn"
          aria-label="Pause"
          @click="pause()"
        >
          Pause
        </button>
        <button
          class="transport-btn stop-btn"
          aria-label="Stop"
          @click="stop()"
        >
          Stop
        </button>
      </div>

      <div class="position-display" aria-label="Transport position">
        {{ positionDisplay }}
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

    <!-- Step grid -->
    <div class="step-grid" aria-label="Step sequencer grid">
      <!-- Beat markers header -->
      <div class="grid-header">
        <div class="header-controls-spacer" />
        <div class="header-label-spacer" />
        <div class="header-steps">
          <template v-for="bar in 2" :key="`bar-${bar}`">
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
        <!-- Track controls (M/S buttons) -->
        <div class="track-controls">
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

        <!-- Track label -->
        <div class="track-label">
          {{ track.label }}
        </div>

        <!-- 32 step cells -->
        <div class="step-cells">
          <div
            v-for="i in 32"
            :key="`${track.key}-step-${i}`"
            class="step-cell"
            :class="{
              active: stepCells[track.key]?.[i - 1]?.active,
              playhead: (i - 1) === currentStep,
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

.pause-btn {
  background: var(--vp-c-yellow-soft, #fef3c7);
  border-color: #f59e0b;
  color: #92400e;
}

.stop-btn {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
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

/* Step grid */
.step-grid {
  overflow-x: auto;
}

/* Grid header row */
.grid-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.header-controls-spacer {
  width: 52px;
  flex-shrink: 0;
}

.header-label-spacer {
  min-width: 150px;
  flex-shrink: 0;
}

.header-steps {
  display: flex;
  gap: 0;
}

.bar-label {
  font-size: 0.65rem;
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
  width: 24px;
  height: 16px;
  font-size: 0.6rem;
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

/* Track controls (M/S buttons) */
.track-controls {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 52px;
  flex-shrink: 0;
}

.ms-btn {
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.15s;
  line-height: 1.4;
}

.ms-btn:hover {
  border-color: var(--vp-c-brand);
}

.mute-btn.muted {
  background: #d4a017;
  border-color: #b8880f;
  color: white;
}

.solo-btn.soloed {
  background: #1a5a9a;
  border-color: #1a5a9a;
  color: white;
}

/* Track label */
.track-label {
  min-width: 150px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  font-weight: 500;
  text-align: right;
  padding-right: 8px;
  flex-shrink: 0;
}

/* Step cells */
.step-cells {
  display: flex;
  gap: 0;
}

.step-cell {
  width: 24px;
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

/* Playhead — yellow outline on current column */
.step-cell.playhead {
  outline: 2px solid #f90;
  outline-offset: -2px;
  z-index: 1;
}

.note-name {
  font-size: 0.55rem;
  font-weight: 600;
  white-space: nowrap;
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
    min-width: 100px;
  }

  .header-label-spacer {
    min-width: 100px;
  }

  .bpm-slider {
    width: 90px;
  }
}

@media (max-width: 480px) {
  .track-label {
    min-width: 80px;
    font-size: 0.7rem;
  }

  .header-label-spacer {
    min-width: 80px;
  }
}
</style>

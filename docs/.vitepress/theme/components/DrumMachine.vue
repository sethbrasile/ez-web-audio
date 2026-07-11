<script setup lang="ts">
import type { BeatTrack } from 'ez-web-audio'
import { useBeatTrack, useCleanup } from '@ez-web-audio/vue'
import { computed, reactive, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import StepGrid from './kit/StepGrid.vue'

const playing = ref(false)
const loading = ref(false)
const bpm = ref(120)
const error = ref('')

const NUM_BEATS = 16

// Default patterns
const defaultPatterns: Record<string, number[]> = {
  KICK: [0, 4, 8, 12],
  SNARE: [4, 12],
  HIHAT: [0, 2, 4, 6, 8, 10, 12, 14],
}

// Create immediate UI beats — same shape as real Beat objects
function makeBeats(name: string) {
  const activeSet = new Set(defaultPatterns[name] ?? [])
  return Array.from({ length: NUM_BEATS }, (_, i) =>
    reactive({ active: activeSet.has(i), currentTimeIsPlaying: false, isPlaying: false }))
}

const trackDefs = [
  { name: 'KICK', samples: ['kick1', 'kick2', 'kick3'], color: 'var(--ewa-kick)' },
  { name: 'SNARE', samples: ['snare1', 'snare2', 'snare3'], color: 'var(--ewa-snare)' },
  { name: 'HIHAT', samples: ['hihat1', 'hihat2', 'hihat3'], color: 'var(--ewa-hat)' },
]

// Tracks render immediately with stub beats
const tracks = ref(trackDefs.map(d => ({
  name: d.name,
  color: d.color,
  beats: makeBeats(d.name),
  beatTrack: null as BeatTrack | null,
})))

// StepGrid adapter — bridges the reactive Beat objects onto the shared grid component
const lanes = computed(() => tracks.value.map(t => ({
  name: t.name,
  color: t.color,
  cells: t.beats.map(b => b.active),
})))

const currentStep = computed(() => {
  for (const track of tracks.value) {
    const idx = track.beats.findIndex(b => b.currentTimeIsPlaying)
    if (idx !== -1)
      return idx
  }
  return -1
})

function onToggle(laneIndex: number, step: number) {
  tracks.value[laneIndex].beats[step].active = !tracks.value[laneIndex].beats[step].active
}

function formatBpm(v: number) {
  return `${v} BPM`
}

const cleanup = useCleanup()

// Composables must be called a fixed number of times during setup — one per
// track, index-aligned with trackDefs (KICK, SNARE, HIHAT).
const beatTrackComposables = [useBeatTrack(), useBeatTrack(), useBeatTrack()]

let initialized = false

async function init() {
  if (initialized)
    return
  try {
    for (let i = 0; i < tracks.value.length; i++) {
      const track = tracks.value[i]
      const def = trackDefs[i]
      const urls = def.samples.map(s => `/ez-web-audio/audio/drum-samples/${s}.wav`)
      const bt = cleanup.register(await beatTrackComposables[i].load(urls, { numBeats: NUM_BEATS }))
      // Headroom so 3 simultaneous hits don't clip the master bus (phase 75).
      bt.gain = 0.7

      // Transfer pattern from stubs to real beats
      track.beats.forEach((stub, j) => { bt.beats[j].active = stub.active })

      // Swap in real beats — template updates seamlessly
      track.beats = bt.beats
      track.beatTrack = bt
    }

    initialized = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to initialize'
  }
}

async function togglePlay() {
  if (!initialized) {
    loading.value = true
    await init()
    loading.value = false
  }
  if (!initialized)
    return

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack.stop())
    playing.value = false
  }
  else {
    tracks.value.forEach(t => t.beatTrack.playActiveBeats(bpm.value, 1 / 16))
    playing.value = true
  }
}

watch(bpm, (val) => {
  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack?.setTempo(val))
  }
})
</script>

<template>
  <DemoFrame class="drum-machine" :error="error" takeaway="Build a beat in seconds — click cells, press play.">
    <div class="controls">
      <PlayButton :playing="playing" :loading="loading" @click="togglePlay" />

      <ParameterSlider
        id="drum-machine-bpm"
        v-model="bpm"
        label="BPM"
        :min="60"
        :max="200"
        :step="1"
        :format="formatBpm"
      />
    </div>

    <StepGrid
      :lanes="lanes"
      :current-step="currentStep"
      :playing="playing"
      :show-mutes="false"
      @toggle="onToggle"
    />
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  margin-bottom: 20px;
}

.controls .ewa-slider {
  flex: 1;
  min-width: 200px;
}
</style>

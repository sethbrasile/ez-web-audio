<script setup lang="ts">
import type { BeatTrack } from 'ez-web-audio'
import { useBeatTrack, useCleanup } from '@ez-web-audio/vue'
import { computed, reactive, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import StepGrid from './kit/StepGrid.vue'

const playing = ref(false)
const bpm = ref(120)
const error = ref('')
const soloedTrack = ref<string | null>(null)

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
  muted: false,
  activeStates: new Map<number, boolean>(), // Store active states when muted
})))

const cleanup = useCleanup()
const beatTrackComposables = [useBeatTrack(), useBeatTrack(), useBeatTrack()]

let initialized = false

// StepGrid adapter — bridges the reactive Beat objects onto the shared grid component
const lanes = computed(() => tracks.value.map(t => ({
  name: t.name,
  color: t.color,
  muted: t.muted,
  cells: t.beats.map(b => b.active),
})))

const gridCurrentStep = computed(() => {
  for (const track of tracks.value) {
    const idx = track.beats.findIndex(b => b.currentTimeIsPlaying)
    if (idx !== -1)
      return idx
  }
  return -1
})

// Step counter badge — kept as its own computed (distinct from the -1-based
// gridCurrentStep above) so the displayed text is unchanged from before.
const stepCounter = computed(() => {
  if (!initialized || !playing.value)
    return 0

  for (const track of tracks.value) {
    for (let i = 0; i < track.beats.length; i++) {
      if (track.beats[i].currentTimeIsPlaying) {
        return i
      }
    }
  }
  return 0
})

function onToggle(laneIndex: number, step: number) {
  tracks.value[laneIndex].beats[step].active = !tracks.value[laneIndex].beats[step].active
}

function formatBpm(v: number) {
  return `${v} BPM`
}

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

function toggleMute(track: any) {
  if (soloedTrack.value && soloedTrack.value !== track.name) {
    // Can't mute a non-soloed track when solo is active
    return
  }

  track.muted = !track.muted

  if (track.muted) {
    // Store current active states
    track.activeStates.clear()
    track.beats.forEach((beat: any, i: number) => {
      if (beat.active) {
        track.activeStates.set(i, true)
        beat.active = false
      }
    })
  }
  else {
    // Restore active states
    track.activeStates.forEach((active: boolean, i: number) => {
      if (active) {
        track.beats[i].active = true
      }
    })
    track.activeStates.clear()
  }
}

function toggleSolo(track: any) {
  if (soloedTrack.value === track.name) {
    // Un-solo: restore all tracks
    soloedTrack.value = null
    tracks.value.forEach((t) => {
      if (t.muted) {
        // Restore active states
        t.activeStates.forEach((active: boolean, i: number) => {
          if (active) {
            t.beats[i].active = true
          }
        })
        t.activeStates.clear()
        t.muted = false
      }
    })
  }
  else {
    // Solo this track: mute all others
    soloedTrack.value = track.name
    tracks.value.forEach((t) => {
      if (t.name !== track.name && !t.muted) {
        // Mute other tracks
        t.activeStates.clear()
        t.beats.forEach((beat: any, i: number) => {
          if (beat.active) {
            t.activeStates.set(i, true)
            beat.active = false
          }
        })
        t.muted = true
      }
    })
  }
}

async function togglePlay() {
  if (!initialized)
    await init()
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
  if (playing.value && initialized) {
    tracks.value.forEach(t => t.beatTrack.setTempo(val))
  }
})
</script>

<template>
  <DemoFrame class="drum-machine-vue" :error="error" takeaway="The same machine, built with the Vue composables.">
    <div class="controls">
      <PlayButton :playing="playing" :aria-label="playing ? 'Stop playback' : 'Start playback'" @click="togglePlay" />

      <ParameterSlider
        id="drum-machine-vue-bpm"
        v-model="bpm"
        label="BPM"
        :min="60"
        :max="200"
        :step="1"
        :format="formatBpm"
      />

      <span class="step-counter">Step: {{ stepCounter + 1 }}/16</span>
    </div>

    <div class="track-controls">
      <div v-for="track in tracks" :key="track.name" class="track-control-group">
        <span class="track-control-name" :style="{ '--lane-color': track.color }">{{ track.name }}</span>
        <button
          type="button"
          class="mute-btn"
          :class="{ active: track.muted }"
          :aria-pressed="track.muted"
          :aria-label="`Mute ${track.name} track`"
          title="Mute track"
          @click="toggleMute(track)"
        >
          M
        </button>
        <button
          type="button"
          class="solo-btn"
          :class="{ active: soloedTrack === track.name }"
          :aria-pressed="soloedTrack === track.name"
          :aria-label="`Solo ${track.name} track`"
          title="Solo track"
          @click="toggleSolo(track)"
        >
          S
        </button>
      </div>
    </div>

    <StepGrid
      :lanes="lanes"
      :current-step="gridCurrentStep"
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
  margin-bottom: 16px;
}

.controls .ewa-slider {
  flex: 1;
  min-width: 200px;
}

.step-counter {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ewa-text-2);
  padding: 8px 12px;
  background: var(--ewa-well);
  border-radius: 8px;
}

.track-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.track-control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-control-name {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lane-color, var(--ewa-accent));
}

.mute-btn,
.solo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--ewa-line-2);
  background: transparent;
  color: var(--ewa-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.mute-btn:hover,
.solo-btn:hover {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.mute-btn.active {
  background: var(--ewa-danger);
  border-color: var(--ewa-danger);
  color: #fff;
}

.solo-btn.active {
  background: var(--ewa-accent);
  border-color: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

.mute-btn:focus-visible,
.solo-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}
</style>

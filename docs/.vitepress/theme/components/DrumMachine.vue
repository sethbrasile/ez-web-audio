<script setup lang="ts">
import type { BeatTrack } from 'ez-web-audio'
import { useBeatTrack, useCleanup } from '@ez-web-audio/vue'
import { reactive, ref, watch } from 'vue'

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
  { name: 'KICK', samples: ['kick1', 'kick2', 'kick3'] },
  { name: 'SNARE', samples: ['snare1', 'snare2', 'snare3'] },
  { name: 'HIHAT', samples: ['hihat1', 'hihat2', 'hihat3'] },
]

// Tracks render immediately with stub beats
const tracks = ref(trackDefs.map(d => ({
  name: d.name,
  beats: makeBeats(d.name),
  beatTrack: null as BeatTrack | null,
})))

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
  <div class="drum-machine">
    <div class="controls">
      <button class="play-btn" :disabled="loading" @click="togglePlay">
        {{ loading ? 'Loading...' : (playing ? 'Stop' : 'Play') }}
      </button>

      <div class="bpm-control">
        <label>
          BPM: {{ bpm }}
          <input v-model.number="bpm" type="range" min="60" max="200" step="1">
        </label>
      </div>
    </div>

    <div class="sequencer">
      <div v-for="track in tracks" :key="track.name" class="track-row">
        <div class="track-header">
          <span class="track-name">{{ track.name }}</span>
        </div>

        <div class="beat-grid">
          <button
            v-for="(beat, i) in track.beats"
            :key="i"
            class="beat-cell" :class="[
              {
                active: beat.active,
                current: beat.currentTimeIsPlaying && playing,
                [`track-${track.name.toLowerCase()}`]: beat.active,
              },
            ]"
            :aria-label="`Toggle ${track.name} beat ${i + 1}`"
            :aria-pressed="beat.active"
            @click="beat.active = !beat.active"
          >
            <span class="beat-number">{{ i + 1 }}</span>
            <span v-if="beat.active" class="beat-active-indicator" aria-hidden="true">&#9679;</span>
          </button>
        </div>
      </div>
    </div>

    <div class="scroll-hint">
      Swipe to see all beats &rarr;
    </div>

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.drum-machine {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.play-btn {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  background: var(--vp-c-brand);
  color: white;
}

.play-btn:hover {
  background: var(--vp-c-brand-dark);
}

.play-btn:active {
  transform: translateY(1px);
}

.bpm-control label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
}

.bpm-control input {
  width: 150px;
}

.sequencer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.track-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.track-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.track-name {
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 60px;
  color: var(--vp-c-text-1);
}

.beat-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
}

.beat-cell {
  aspect-ratio: 1;
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}

.beat-cell:hover {
  border-color: var(--vp-c-brand);
  transform: scale(1.05);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.beat-cell.active {
  border-width: 2px;
}

.beat-cell.active.track-kick {
  background: #4a9eff;
  border-color: #3a7edf;
  color: white;
}

.beat-cell.active.track-snare {
  background: #ff7b4a;
  border-color: #df5b2a;
  color: white;
}

.beat-cell.active.track-hihat {
  background: #ffd54f;
  border-color: #dfb52f;
  color: #333;
}

.beat-cell.current {
  box-shadow: 0 0 12px 4px currentColor;
  animation: pulse 0.3s ease-out;
}

.beat-cell.current.track-kick {
  box-shadow: 0 0 12px 4px #4a9eff;
}

.beat-cell.current.track-snare {
  box-shadow: 0 0 12px 4px #ff7b4a;
}

.beat-cell.current.track-hihat {
  box-shadow: 0 0 12px 4px #ffd54f;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.beat-number {
  opacity: 0.5;
  font-weight: 500;
}

.beat-active-indicator {
  font-size: 0.5rem;
  display: block;
  line-height: 1;
  margin-top: 1px;
}

.play-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.scroll-hint {
  display: none;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: right;
  margin-top: 0.25rem;
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .beat-grid {
    gap: 2px;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }
  .beat-cell {
    min-width: 28px;
    min-height: 28px;
  }
  .track-header {
    flex-wrap: wrap;
  }
  .scroll-hint {
    display: block;
  }
}

@media (max-width: 480px) {
  .beat-cell {
    min-width: 24px;
    min-height: 24px;
    font-size: 0.55rem;
  }
}
</style>

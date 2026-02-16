<template>
  <div class="drum-machine-vue">
    <div class="controls">
      <button @click="togglePlay" class="play-btn" :aria-label="playing ? 'Stop playback' : 'Start playback'">
        {{ playing ? 'Stop' : 'Play' }}
      </button>

      <div class="bpm-control">
        <label>
          BPM: {{ bpm }}
          <input type="range" v-model.number="bpm" min="60" max="200" step="1" aria-label="Tempo in beats per minute" />
        </label>
      </div>

      <div class="step-counter">
        Step: {{ currentStep + 1 }}/16
      </div>
    </div>

    <div class="sequencer">
      <div
        v-for="track in tracks"
        :key="track.name"
        class="track-row"
        :class="{ 'muted': track.muted, 'soloed': soloedTrack === track.name }"
      >
        <div class="track-header">
          <span class="track-name">{{ track.name }}</span>
          <div class="track-controls">
            <button
              @click="toggleMute(track)"
              class="mute-btn"
              :class="{ 'active': track.muted }"
              title="Mute track"
            >
              M
            </button>
            <button
              @click="toggleSolo(track)"
              class="solo-btn"
              :class="{ 'active': soloedTrack === track.name }"
              title="Solo track"
            >
              S
            </button>
          </div>
        </div>

        <div class="beat-grid">
          <button
            v-for="(beat, i) in track.beats"
            :key="i"
            @click="beat.active = !beat.active"
            :class="[
              'beat-cell',
              {
                'active': beat.active,
                'current': beat.currentTimeIsPlaying && playing,
                [`track-${track.name.toLowerCase()}`]: beat.active
              }
            ]"
            :aria-label="`${track.name} step ${i + 1}${beat.active ? ' (active)' : ' (inactive)'}`"
            :aria-pressed="beat.active"
          >
            <span class="beat-number">{{ i + 1 }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onUnmounted, computed } from 'vue'

const playing = ref(false)
const bpm = ref(120)
const error = ref('')
const soloedTrack = ref<string | null>(null)

const NUM_BEATS = 16

// Default patterns
const defaultPatterns: Record<string, number[]> = {
  KICK:  [0, 4, 8, 12],
  SNARE: [4, 12],
  HIHAT: [0, 2, 4, 6, 8, 10, 12, 14],
}

// Create immediate UI beats — same shape as real Beat objects
function makeBeats(name: string) {
  const activeSet = new Set(defaultPatterns[name] ?? [])
  return Array.from({ length: NUM_BEATS }, (_, i) =>
    reactive({ active: activeSet.has(i), currentTimeIsPlaying: false, isPlaying: false })
  )
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
  beatTrack: null as any,
  muted: false,
  activeStates: new Map<number, boolean>(), // Store active states when muted
})))

let initialized = false

// Compute current step from beat states
const currentStep = computed(() => {
  if (!initialized || !playing.value) return 0

  for (const track of tracks.value) {
    for (let i = 0; i < track.beats.length; i++) {
      if (track.beats[i].currentTimeIsPlaying) {
        return i
      }
    }
  }
  return 0
})

async function init() {
  if (initialized) return
  try {
    const { createBeatTrack } = await import('ez-web-audio')

    const opts = { numBeats: NUM_BEATS, wrapWith: (beat: any) => reactive(beat) }

    for (const track of tracks.value) {
      const def = trackDefs.find(d => d.name === track.name)!
      const urls = def.samples.map(s => `/ez-web-audio/audio/drum-samples/${s}.wav`)
      const bt = await createBeatTrack(urls, opts)

      // Transfer pattern from stubs to real beats
      track.beats.forEach((stub, i) => { bt.beats[i].active = stub.active })

      // Swap in real beats — template updates seamlessly
      track.beats = bt.beats
      track.beatTrack = bt
    }

    initialized = true
  } catch (e) {
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
  } else {
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
    tracks.value.forEach(t => {
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
  } else {
    // Solo this track: mute all others
    soloedTrack.value = track.name
    tracks.value.forEach(t => {
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
  if (!initialized) await init()
  if (!initialized) return

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack.stop())
    playing.value = false
  } else {
    tracks.value.forEach(t => t.beatTrack.playBeats(bpm.value, 1/16))
    playing.value = true
  }
}

watch(bpm, (val) => {
  if (playing.value && initialized) {
    // BPM changes require restart
    tracks.value.forEach(t => t.beatTrack.stop())
    setTimeout(() => {
      tracks.value.forEach(t => t.beatTrack.playBeats(val, 1/16))
    }, 50)
  }
})

onUnmounted(() => {
  tracks.value.forEach(t => { try { t.beatTrack?.stop() } catch {} })
})
</script>

<style scoped>
.drum-machine-vue {
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

.step-counter {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
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
  transition: opacity 0.2s;
}

.track-row.muted {
  opacity: 0.4;
}

.track-row.soloed {
  border: 2px solid var(--vp-c-brand);
  border-radius: 6px;
  padding: 0.5rem;
  margin: -0.5rem;
}

.track-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
}

.track-name {
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 60px;
  color: var(--vp-c-text-1);
}

.track-controls {
  display: flex;
  gap: 0.5rem;
}

.mute-btn,
.solo-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
  color: var(--vp-c-text-2);
}

.mute-btn:hover,
.solo-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.mute-btn.active {
  background: #ff4444;
  border-color: #ff4444;
  color: white;
}

.solo-btn.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: white;
}

.beat-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
}

.beat-cell {
  aspect-ratio: 1;
  min-width: 28px;
  min-height: 28px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
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

.error {
  color: var(--vp-c-danger);
  margin-top: 1rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .beat-grid {
    gap: 2px;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  .beat-cell {
    min-width: 24px;
    min-height: 24px;
  }
  .track-header {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .beat-cell {
    min-width: 20px;
    min-height: 20px;
    font-size: 0.55rem;
  }
}
</style>

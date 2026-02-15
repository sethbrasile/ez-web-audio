<template>
  <div ref="rootEl" class="drum-machine-vanilla">
    <div class="pattern-label">Event-Based</div>

    <div class="controls">
      <button @click="togglePlay" class="play-btn">
        {{ playing ? 'Stop' : 'Play' }}
      </button>

      <div class="bpm-control">
        <label>
          BPM: {{ bpm }}
          <input type="range" v-model.number="bpm" min="60" max="200" step="1" />
        </label>
      </div>
    </div>

    <div class="sequencer">
      <div v-for="track in tracks" :key="track.name" class="track-row">
        <div class="track-header">
          <span class="track-name">{{ track.name }}</span>
          <div class="track-controls">
            <button
              @click="toggleMute(track)"
              :class="['control-btn', { active: track.muted }]"
              title="Mute"
            >
              M
            </button>
            <button
              @click="toggleSolo(track)"
              :class="['control-btn', { active: track.solo }]"
              title="Solo"
            >
              S
            </button>
          </div>
        </div>

        <div class="beat-grid">
          <button
            v-for="(active, i) in track.activeStates"
            :key="i"
            @click="toggleBeat(track, i)"
            :data-track="track.name"
            :data-beat="i"
            :class="[
              'vanilla-beat-cell',
              {
                'active': active,
                [`track-${track.name.toLowerCase()}`]: active
              }
            ]"
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
import { ref, reactive, watch, onUnmounted } from 'vue'
import type { BeatTrack } from 'ez-web-audio'

const rootEl = ref<HTMLElement>()
const playing = ref(false)
const bpm = ref(120)
const error = ref('')

const NUM_BEATS = 16

// Default patterns
const defaultPatterns: Record<string, number[]> = {
  KICK:  [0, 4, 8, 12],
  SNARE: [4, 12],
  HIHAT: [0, 2, 4, 6, 8, 10, 12, 14],
}

interface TrackState {
  name: string
  samples: string[]
  beatTrack: BeatTrack | null
  activeStates: boolean[]
  muted: boolean
  solo: boolean
  savedStates: boolean[] | null
}

const trackDefs = [
  { name: 'KICK', samples: ['kick1', 'kick2', 'kick3'] },
  { name: 'SNARE', samples: ['snare1', 'snare2', 'snare3'] },
  { name: 'HIHAT', samples: ['hihat1', 'hihat2', 'hihat3'] },
]

// Initialize tracks with reactive state for pattern editing
const tracks = ref<TrackState[]>(trackDefs.map(d => ({
  name: d.name,
  samples: d.samples,
  beatTrack: null,
  activeStates: Array.from({ length: NUM_BEATS }, (_, i) =>
    (defaultPatterns[d.name] ?? []).includes(i)
  ),
  muted: false,
  solo: false,
  savedStates: null,
})))

let initialized = false
let beatHandler: ((e: CustomEvent) => void) | null = null

async function init() {
  if (initialized) return
  try {
    const { createBeatTrack } = await import('ez-web-audio')

    // Note: NO wrapWith option — we use event listeners for playhead sync
    const opts = { numBeats: NUM_BEATS }

    for (const track of tracks.value) {
      const urls = track.samples.map(s => `/ez-web-audio/audio/drum-samples/${s}.wav`)
      const bt = await createBeatTrack(urls, opts)

      // Transfer pattern from our reactive state to real beats
      track.activeStates.forEach((active, i) => { bt.beats[i].active = active })

      track.beatTrack = bt
    }

    // Set up event-based playhead sync (the core demo)
    // Listen to beat events on the first track (all tracks are synchronized)
    const kickTrack = tracks.value[0].beatTrack
    if (kickTrack) {
      beatHandler = (e: CustomEvent) => {
        const { beatIndex } = e.detail

        // Direct DOM manipulation for playhead — NOT Vue reactivity
        if (rootEl.value) {
          // Clear previous playhead
          rootEl.value.querySelectorAll('.vanilla-beat-cell.current').forEach(
            el => el.classList.remove('current')
          )

          // Highlight current step across all tracks
          rootEl.value.querySelectorAll(`.vanilla-beat-cell[data-beat="${beatIndex}"]`).forEach(
            el => el.classList.add('current')
          )
        }
      }

      kickTrack.on('beat', beatHandler)
    }

    initialized = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to initialize'
  }
}

function toggleBeat(track: TrackState, index: number) {
  // Update both reactive state (for UI) and Beat object (for audio)
  track.activeStates[index] = !track.activeStates[index]

  if (track.beatTrack) {
    track.beatTrack.beats[index].active = track.activeStates[index]
  }
}

async function togglePlay() {
  if (!initialized) await init()
  if (!initialized) return

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack?.stop())
    playing.value = false
  } else {
    tracks.value.forEach(t => t.beatTrack?.playBeats(bpm.value, 1/16))
    playing.value = true
  }
}

function toggleMute(track: TrackState) {
  track.muted = !track.muted

  if (!track.beatTrack) return

  if (track.muted) {
    // Save current states and deactivate all beats
    track.savedStates = track.activeStates.slice()
    track.activeStates.forEach((_, i) => {
      track.beatTrack!.beats[i].active = false
    })
  } else {
    // Restore saved states
    if (track.savedStates) {
      track.savedStates.forEach((active, i) => {
        track.beatTrack!.beats[i].active = active
        track.activeStates[i] = active
      })
      track.savedStates = null
    }
  }
}

function toggleSolo(track: TrackState) {
  track.solo = !track.solo

  const hasSolo = tracks.value.some(t => t.solo)

  tracks.value.forEach(t => {
    if (!t.beatTrack) return

    if (hasSolo) {
      // If any track is soloed, mute all non-solo tracks
      const shouldBeMuted = !t.solo

      if (shouldBeMuted && !t.savedStates) {
        t.savedStates = t.activeStates.slice()
        t.activeStates.forEach((_, i) => {
          t.beatTrack!.beats[i].active = false
        })
      } else if (!shouldBeMuted && t.savedStates) {
        t.savedStates.forEach((active, i) => {
          t.beatTrack!.beats[i].active = active
          t.activeStates[i] = active
        })
        t.savedStates = null
      }
    } else {
      // No solo — restore all tracks
      if (t.savedStates) {
        t.savedStates.forEach((active, i) => {
          t.beatTrack!.beats[i].active = active
          t.activeStates[i] = active
        })
        t.savedStates = null
      }
    }
  })
}

watch(bpm, (val) => {
  if (playing.value) {
    // BeatTrack doesn't support mid-playback tempo changes, so restart
    tracks.value.forEach(t => t.beatTrack?.stop())
    tracks.value.forEach(t => t.beatTrack?.playBeats(val, 1/16))
  }
})

onUnmounted(() => {
  // Clean up event listeners
  if (beatHandler && tracks.value[0]?.beatTrack) {
    tracks.value[0].beatTrack.off('beat', beatHandler)
  }

  tracks.value.forEach(t => {
    try {
      t.beatTrack?.stop()
    } catch {}
  })
})
</script>

<style scoped>
.drum-machine-vanilla {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.pattern-label {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.track-controls {
  display: flex;
  gap: 0.25rem;
}

.control-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--vp-c-text-2);
}

.control-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.control-btn.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: white;
}

.beat-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
}

.vanilla-beat-cell {
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

.vanilla-beat-cell:hover {
  border-color: var(--vp-c-brand);
  transform: scale(1.05);
}

.vanilla-beat-cell.active {
  border-width: 2px;
}

.vanilla-beat-cell.active.track-kick {
  background: #4a9eff;
  border-color: #3a7edf;
  color: white;
}

.vanilla-beat-cell.active.track-snare {
  background: #ff7b4a;
  border-color: #df5b2a;
  color: white;
}

.vanilla-beat-cell.active.track-hihat {
  background: #ffd54f;
  border-color: #dfb52f;
  color: #333;
}

.vanilla-beat-cell.current {
  box-shadow: 0 0 12px 4px currentColor;
  animation: pulse 0.3s ease-out;
}

.vanilla-beat-cell.current.track-kick {
  box-shadow: 0 0 12px 4px #4a9eff;
}

.vanilla-beat-cell.current.track-snare {
  box-shadow: 0 0 12px 4px #ff7b4a;
}

.vanilla-beat-cell.current.track-hihat {
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
  .vanilla-beat-cell {
    min-width: 24px;
    min-height: 24px;
  }
  .track-header {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .vanilla-beat-cell {
    min-width: 20px;
    min-height: 20px;
    font-size: 0.55rem;
  }
}
</style>

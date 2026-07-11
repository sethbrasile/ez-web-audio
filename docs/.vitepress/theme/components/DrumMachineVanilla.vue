<script setup lang="ts">
// INTENTIONALLY NOT refactored onto @ez-web-audio/vue composables (phase 73).
// This demo exists to showcase the vanilla-TypeScript event API: it uses the
// dynamic `import('ez-web-audio')` init pattern, drives its playhead via
// `beatTrack.on('beat', ...)` event listeners + direct DOM manipulation, and
// deliberately omits `wrapWith`/reactive. Routing it through the Vue composables
// would defeat its purpose. See .planning/phases/73-.../73-INVENTORY.md.
//
// For the same reason its step grid is NOT the shared kit/StepGrid.vue
// component (phase 78 restyle) — the playhead here is synced via direct DOM
// class manipulation rather than a reactive `currentStep` prop, which is the
// whole point of the demo. Only the visual language (tokens, 44px cells,
// lane colors) was adopted to match the other two drum-machine demos; the
// grid markup and event wiring are untouched.
import type { BeatTrack } from 'ez-web-audio'
import { onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'

const rootEl = ref<HTMLElement>()
const playing = ref(false)
const bpm = ref(120)
const error = ref('')

const NUM_BEATS = 16

// Default patterns
const defaultPatterns: Record<string, number[]> = {
  KICK: [0, 4, 8, 12],
  SNARE: [4, 12],
  HIHAT: [0, 2, 4, 6, 8, 10, 12, 14],
}

interface TrackState {
  name: string
  samples: string[]
  color: string
  beatTrack: BeatTrack | null
  activeStates: boolean[]
  muted: boolean
  solo: boolean
  savedStates: boolean[] | null
}

const trackDefs = [
  { name: 'KICK', samples: ['kick1', 'kick2', 'kick3'], color: 'var(--ewa-kick)' },
  { name: 'SNARE', samples: ['snare1', 'snare2', 'snare3'], color: 'var(--ewa-snare)' },
  { name: 'HIHAT', samples: ['hihat1', 'hihat2', 'hihat3'], color: 'var(--ewa-hat)' },
]

// Initialize tracks with reactive state for pattern editing
const tracks = ref<TrackState[]>(trackDefs.map(d => ({
  name: d.name,
  samples: d.samples,
  color: d.color,
  beatTrack: null,
  activeStates: Array.from({ length: NUM_BEATS }, (_, i) =>
    (defaultPatterns[d.name] ?? []).includes(i)),
  muted: false,
  solo: false,
  savedStates: null,
})))

let initialized = false
let beatHandler: ((e: CustomEvent) => void) | null = null

function formatBpm(v: number) {
  return `${v} BPM`
}

async function init() {
  if (initialized)
    return
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
            el => el.classList.remove('current'),
          )

          // Highlight current step across all tracks
          rootEl.value.querySelectorAll(`.vanilla-beat-cell[data-beat="${beatIndex}"]`).forEach(
            el => el.classList.add('current'),
          )
        }
      }

      kickTrack.on('beat', beatHandler)
    }

    initialized = true
  }
  catch (e) {
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
  if (!initialized)
    await init()
  if (!initialized)
    return

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack?.stop())
    playing.value = false

    // Clear playhead highlights from DOM (added via direct manipulation)
    if (rootEl.value) {
      rootEl.value.querySelectorAll('.vanilla-beat-cell.current').forEach(
        el => el.classList.remove('current'),
      )
    }
  }
  else {
    tracks.value.forEach(t => t.beatTrack?.playActiveBeats(bpm.value, 1 / 16))
    playing.value = true
  }
}

function toggleMute(track: TrackState) {
  track.muted = !track.muted

  if (!track.beatTrack)
    return

  if (track.muted) {
    // Save current states and deactivate all beats
    track.savedStates = track.activeStates.slice()
    track.activeStates.forEach((_, i) => {
      track.beatTrack!.beats[i].active = false
    })
  }
  else {
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

  tracks.value.forEach((t) => {
    if (!t.beatTrack)
      return

    if (hasSolo) {
      // If any track is soloed, mute all non-solo tracks
      const shouldBeMuted = !t.solo

      if (shouldBeMuted && !t.savedStates) {
        t.savedStates = t.activeStates.slice()
        t.activeStates.forEach((_, i) => {
          t.beatTrack!.beats[i].active = false
        })
      }
      else if (!shouldBeMuted && t.savedStates) {
        t.savedStates.forEach((active, i) => {
          t.beatTrack!.beats[i].active = active
          t.activeStates[i] = active
        })
        t.savedStates = null
      }
    }
    else {
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
    tracks.value.forEach(t => t.beatTrack?.playActiveBeats(val, 1 / 16))
  }
})

onUnmounted(() => {
  // Clean up event listeners
  if (beatHandler && tracks.value[0]?.beatTrack) {
    tracks.value[0].beatTrack.off('beat', beatHandler)
  }

  tracks.value.forEach((t) => {
    try {
      t.beatTrack?.stop()
    }
    catch {}
  })
})
</script>

<template>
  <DemoFrame class="drum-machine-vanilla" :error="error" takeaway="The same machine in plain JavaScript.">
    <div class="controls">
      <PlayButton :playing="playing" :aria-label="playing ? 'Stop playback' : 'Start playback'" @click="togglePlay" />

      <ParameterSlider
        id="drum-machine-vanilla-bpm"
        v-model="bpm"
        label="BPM"
        :min="60"
        :max="200"
        :step="1"
        :format="formatBpm"
      />

      <span class="pattern-label">Event-Based</span>
    </div>

    <div ref="rootEl" class="sequencer">
      <div class="track-row track-row--header" aria-hidden="true">
        <div class="track-header" />
        <div class="beat-grid">
          <span
            v-for="i in NUM_BEATS"
            :key="`head-${i - 1}`"
            class="step-header"
            :class="{ 'step-header--beat': (i - 1) % 4 === 0 }"
          >{{ (i - 1) % 4 === 0 ? (i - 1) / 4 + 1 : '·' }}</span>
        </div>
      </div>

      <div v-for="track in tracks" :key="track.name" class="track-row">
        <div class="track-header">
          <span class="track-name" :style="{ '--lane-color': track.color }">{{ track.name }}</span>
          <div class="track-controls">
            <button
              class="control-btn" :class="[{ active: track.muted }]"
              title="Mute"
              :aria-pressed="track.muted"
              :aria-label="`Mute ${track.name} track`"
              @click="toggleMute(track)"
            >
              M
            </button>
            <button
              class="control-btn" :class="[{ active: track.solo }]"
              title="Solo"
              :aria-pressed="track.solo"
              :aria-label="`Solo ${track.name} track`"
              @click="toggleSolo(track)"
            >
              S
            </button>
          </div>
        </div>

        <div class="beat-grid">
          <button
            v-for="(active, i) in track.activeStates"
            :key="i"
            :data-track="track.name"
            :data-beat="i"
            class="vanilla-beat-cell"
            :class="[
              {
                active,
              },
            ]"
            :style="{ '--lane-color': track.color }"
            :aria-label="`${track.name} step ${i + 1}${active ? ' (active)' : ' (inactive)'}`"
            :aria-pressed="active"
            @click="toggleBeat(track, i)"
          />
        </div>
      </div>
    </div>
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

.pattern-label {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--ewa-accent-soft);
  color: var(--ewa-accent-ink);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sequencer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-x: auto;
}

.track-row {
  display: grid;
  grid-template-columns: 84px 1fr;
  align-items: center;
  gap: 8px;
}

.track-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-row--header {
  margin-bottom: 2px;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 20px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-align: center;
  color: var(--ewa-text-3);
}

.step-header--beat {
  color: var(--ewa-text-2);
}

.track-name {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lane-color, var(--ewa-accent));
}

.track-controls {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.control-btn {
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

.control-btn:hover {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.control-btn.active {
  background: var(--ewa-accent);
  border-color: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

.control-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.beat-grid {
  display: grid;
  grid-template-columns: repeat(16, 44px);
  gap: 4px;
  width: max-content;
}

.vanilla-beat-cell {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  cursor: pointer;
  transition: transform 0.08s, box-shadow 0.12s, background 0.12s;
}

.vanilla-beat-cell.active {
  background: var(--lane-color, var(--ewa-accent));
  border-color: var(--lane-color, var(--ewa-accent));
}

.vanilla-beat-cell.current.active {
  box-shadow: 0 0 0 2px var(--ewa-bg), 0 0 14px 2px var(--lane-color, var(--ewa-accent));
  transform: scale(1.06);
}

.vanilla-beat-cell.current:not(.active) {
  box-shadow: inset 0 0 0 2px var(--ewa-accent-soft);
}

.vanilla-beat-cell:hover {
  border-color: var(--ewa-accent);
  transform: scale(1.05);
}

.vanilla-beat-cell:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .track-row {
    grid-template-columns: 1fr;
  }
}
</style>

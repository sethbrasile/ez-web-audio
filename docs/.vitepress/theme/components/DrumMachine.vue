<template>
  <div class="drum-machine">
    <div class="controls">
      <button @click="togglePlay" :disabled="loading" class="play-btn">
        {{ loading ? 'Loading...' : (playing ? 'Stop' : 'Play') }}
      </button>

      <div class="bpm-control">
        <label>
          BPM: {{ bpm }}
          <input
            type="range"
            v-model.number="bpm"
            min="60"
            max="200"
            step="1"
            :disabled="loading"
          />
        </label>
      </div>
    </div>

    <div class="sequencer">
      <div v-for="(trackData, trackIndex) in trackInfo" :key="trackIndex" class="track-row">
        <div class="track-header">
          <span class="track-name">{{ trackData.name }}</span>
          <div class="volume-control">
            <label>
              Vol: {{ Math.round(trackData.volume * 100) }}%
              <input
                type="range"
                v-model.number="trackData.volume"
                min="0"
                max="1"
                step="0.1"
                :disabled="!initialized"
              />
            </label>
          </div>
        </div>

        <div class="beat-grid">
          <button
            v-for="(active, beatIndex) in beats[trackIndex]"
            :key="beatIndex"
            @click="toggleBeat(trackIndex, beatIndex)"
            :class="[
              'beat-cell',
              {
                'active': active,
                'current': currentBeat === beatIndex && playing,
                [`track-${trackData.name.toLowerCase()}`]: active
              }
            ]"
            :disabled="!initialized && !loading"
          >
            <span class="beat-number">{{ beatIndex + 1 }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const loading = ref(false)
const initialized = ref(false)
const playing = ref(false)
const bpm = ref(120)
const currentBeat = ref(-1)
const error = ref('')

const trackInfo = ref([
  { name: 'KICK', volume: 1 },
  { name: 'SNARE', volume: 0.8 },
  { name: 'HIHAT', volume: 0.6 }
])

// 3 tracks x 16 beats
const beats = ref<boolean[][]>([
  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick: 1, 5, 9, 13 (four on the floor)
  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare: 5, 13 (backbeat)
  [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] // Hihat: eighth notes
])

let kickTrack: any = null
let snareTrack: any = null
let hihatTrack: any = null
let audioContext: any = null

async function initializeDrumMachine() {
  if (initialized.value) return

  try {
    error.value = ''
    loading.value = true

    // Dynamic import for SSR compatibility
    const { initAudio, createBeatTrack, getAudioContext } = await import('ez-web-audio')
    await initAudio()
    audioContext = await getAudioContext()

    // Create 3 BeatTrack instances with round-robin samples
    kickTrack = await createBeatTrack([
      '/ez-web-audio/audio/drum-samples/kick1.wav',
      '/ez-web-audio/audio/drum-samples/kick2.wav',
      '/ez-web-audio/audio/drum-samples/kick3.wav'
    ], { numBeats: 16 })

    snareTrack = await createBeatTrack([
      '/ez-web-audio/audio/drum-samples/snare1.wav',
      '/ez-web-audio/audio/drum-samples/snare2.wav',
      '/ez-web-audio/audio/drum-samples/snare3.wav'
    ], { numBeats: 16 })

    hihatTrack = await createBeatTrack([
      '/ez-web-audio/audio/drum-samples/hihat1.wav',
      '/ez-web-audio/audio/drum-samples/hihat2.wav',
      '/ez-web-audio/audio/drum-samples/hihat3.wav'
    ], { numBeats: 16 })

    // Sync beat state from refs to BeatTrack instances
    const tracks = [kickTrack, snareTrack, hihatTrack]
    tracks.forEach((track, trackIndex) => {
      beats.value[trackIndex].forEach((active, beatIndex) => {
        track.beats[beatIndex].active = active
      })
    })

    // Set up beat event listener for visual playhead (only need on one track since they're synced)
    kickTrack.on('beat', (e: any) => {
      // Calculate delay to sync visuals with audio playback
      // Beat events fire at schedule time (~100ms early)
      const delay = Math.max(0, (e.detail.time - audioContext.currentTime) * 1000)
      setTimeout(() => {
        currentBeat.value = e.detail.beatIndex
      }, delay)
    })

    // Set initial volumes
    kickTrack.changeGainTo(trackInfo.value[0].volume)
    snareTrack.changeGainTo(trackInfo.value[1].volume)
    hihatTrack.changeGainTo(trackInfo.value[2].volume)

    initialized.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to initialize drum machine'
  } finally {
    loading.value = false
  }
}

async function togglePlay() {
  if (!initialized.value) {
    await initializeDrumMachine()
    if (!initialized.value) return
  }

  if (playing.value) {
    // Stop
    kickTrack.stopAll()
    snareTrack.stopAll()
    hihatTrack.stopAll()
    playing.value = false
    currentBeat.value = -1
  } else {
    // Play
    kickTrack.playActiveBeats(bpm.value, 1/4)
    snareTrack.playActiveBeats(bpm.value, 1/4)
    hihatTrack.playActiveBeats(bpm.value, 1/4)
    playing.value = true
  }
}

function toggleBeat(trackIndex: number, beatIndex: number) {
  // Toggle in local state
  beats.value[trackIndex][beatIndex] = !beats.value[trackIndex][beatIndex]

  // Toggle in corresponding BeatTrack
  const tracks = [kickTrack, snareTrack, hihatTrack]
  if (tracks[trackIndex]) {
    tracks[trackIndex].beats[beatIndex].active = beats.value[trackIndex][beatIndex]
  }
}

// Watch BPM changes - need to restart playback with new tempo
watch(bpm, () => {
  if (playing.value && kickTrack && snareTrack && hihatTrack) {
    // BeatTrack doesn't support tempo change mid-playback, so stop and restart
    kickTrack.stopAll()
    snareTrack.stopAll()
    hihatTrack.stopAll()

    kickTrack.playActiveBeats(bpm.value, 1/4)
    snareTrack.playActiveBeats(bpm.value, 1/4)
    hihatTrack.playActiveBeats(bpm.value, 1/4)
  }
})

// Watch volume changes
watch(() => trackInfo.value[0].volume, (newVol) => {
  if (kickTrack) kickTrack.changeGainTo(newVol)
})
watch(() => trackInfo.value[1].volume, (newVol) => {
  if (snareTrack) snareTrack.changeGainTo(newVol)
})
watch(() => trackInfo.value[2].volume, (newVol) => {
  if (hihatTrack) hihatTrack.changeGainTo(newVol)
})

onUnmounted(() => {
  if (kickTrack) {
    try { kickTrack.stopAll() } catch {}
  }
  if (snareTrack) {
    try { snareTrack.stopAll() } catch {}
  }
  if (hihatTrack) {
    try { hihatTrack.stopAll() } catch {}
  }
})
</script>

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

.play-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.volume-control label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.volume-control input {
  width: 80px;
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

.beat-cell:hover:not(:disabled) {
  border-color: var(--vp-c-brand);
  transform: scale(1.05);
}

.beat-cell:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
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

/* Mobile responsive */
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

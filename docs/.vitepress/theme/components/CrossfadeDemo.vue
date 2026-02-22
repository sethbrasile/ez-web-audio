<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const activeTrack = ref<'A' | 'B' | null>(null)
const isCrossfading = ref(false)
const fadeDuration = ref(2)
const positionA = ref('0:00')
const positionB = ref('0:00')

let trackA: any = null
let trackB: any = null
let lib: any = null
let animFrame: number | null = null

async function initialize() {
  if (loaded.value || loading.value)
    return

  try {
    loading.value = true
    error.value = ''

    if (!lib) {
      lib = await import('ez-web-audio')
    }

    // Load the same file twice as two separate tracks for crossfade demo
    // In production, these would be different audio files
    const [a, b] = await Promise.all([
      lib.createTrack('/ez-web-audio/audio/short-music.mp3'),
      lib.createTrack('/ez-web-audio/audio/short-music.mp3'),
    ])

    trackA = a
    trackB = b

    trackA.on('stop', () => {
      if (activeTrack.value === 'A' && !isCrossfading.value) {
        activeTrack.value = null
      }
    })

    trackB.on('stop', () => {
      if (activeTrack.value === 'B' && !isCrossfading.value) {
        activeTrack.value = null
      }
    })

    loaded.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tracks'
  }
  finally {
    loading.value = false
  }
}

function updatePositions() {
  if (trackA && activeTrack.value === 'A') {
    positionA.value = trackA.position?.string ?? '0:00'
  }
  if (trackB && activeTrack.value === 'B') {
    positionB.value = trackB.position?.string ?? '0:00'
  }
  animFrame = requestAnimationFrame(updatePositions)
}

async function playTrackA() {
  if (!trackA || isCrossfading.value)
    return

  try {
    error.value = ''
    if (activeTrack.value === 'B') {
      // Stop B first
      try { await trackB.stop() }
      catch {}
    }
    await trackA.play()
    activeTrack.value = 'A'
    updatePositions()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function playTrackB() {
  if (!trackB || isCrossfading.value)
    return

  try {
    error.value = ''
    if (activeTrack.value === 'A') {
      // Stop A first
      try { await trackA.stop() }
      catch {}
    }
    await trackB.play()
    activeTrack.value = 'B'
    updatePositions()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function doCrossfade() {
  if (!trackA || !trackB || isCrossfading.value)
    return

  // Determine direction: if A is playing, fade A→B; else fade B→A
  const from = activeTrack.value === 'A' ? trackA : trackB
  const to = activeTrack.value === 'A' ? trackB : trackA
  const toLabel = activeTrack.value === 'A' ? 'B' : 'A'

  if (!from.isPlaying) {
    error.value = 'Start a track first, then crossfade'
    return
  }

  try {
    error.value = ''
    isCrossfading.value = true

    await lib.crossfade(from, to, fadeDuration.value)

    activeTrack.value = toLabel
    isCrossfading.value = false
  }
  catch (e) {
    isCrossfading.value = false
    error.value = e instanceof Error ? e.message : 'Crossfade error'
  }
}

async function stopAll() {
  if (animFrame) {
    cancelAnimationFrame(animFrame)
    animFrame = null
  }
  if (trackA) {
    try { await trackA.stop() }
    catch {}
  }
  if (trackB) {
    try { await trackB.stop() }
    catch {}
  }
  activeTrack.value = null
  isCrossfading.value = false
  positionA.value = '0:00'
  positionB.value = '0:00'
}

onUnmounted(async () => {
  if (animFrame)
    cancelAnimationFrame(animFrame)
  await stopAll()
})
</script>

<template>
  <div class="crossfade-demo">
    <div v-if="!loaded" class="init-section">
      <button :disabled="loading" class="init-btn" @click="initialize">
        {{ loading ? 'Loading tracks...' : 'Load Tracks' }}
      </button>
      <p class="hint">
        Loads two tracks for crossfade demonstration
      </p>
    </div>

    <div v-else class="controls">
      <div class="tracks">
        <div
          class="track-card"
          :class="{ active: activeTrack === 'A' }"
        >
          <div class="track-header">
            <span class="track-name">Track A</span>
            <span v-if="activeTrack === 'A'" class="now-playing">Playing</span>
          </div>
          <div class="track-position">
            {{ positionA }}
          </div>
          <button
            class="track-btn"
            :disabled="isCrossfading || activeTrack === 'A'"
            @click="playTrackA"
          >
            {{ activeTrack === 'A' ? 'Playing' : 'Play Track A' }}
          </button>
        </div>

        <div class="crossfade-center">
          <div class="fade-controls">
            <label class="duration-label">
              Fade: {{ fadeDuration }}s
              <input
                v-model.number="fadeDuration"
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                :disabled="isCrossfading"
                :aria-label="`Crossfade duration: ${fadeDuration} seconds`"
              >
            </label>
            <button
              class="crossfade-btn"
              :disabled="isCrossfading || activeTrack === null"
              @click="doCrossfade"
            >
              {{ isCrossfading ? 'Fading...' : (activeTrack === 'A' ? 'A → B' : activeTrack === 'B' ? 'B → A' : 'Crossfade') }}
            </button>
          </div>
        </div>

        <div
          class="track-card"
          :class="{ active: activeTrack === 'B' }"
        >
          <div class="track-header">
            <span class="track-name">Track B</span>
            <span v-if="activeTrack === 'B'" class="now-playing">Playing</span>
          </div>
          <div class="track-position">
            {{ positionB }}
          </div>
          <button
            class="track-btn"
            :disabled="isCrossfading || activeTrack === 'B'"
            @click="playTrackB"
          >
            {{ activeTrack === 'B' ? 'Playing' : 'Play Track B' }}
          </button>
        </div>
      </div>

      <div class="stop-row">
        <button class="stop-all-btn" :disabled="activeTrack === null && !isCrossfading" @click="stopAll">
          Stop All
        </button>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="isCrossfading" class="crossfading-indicator">
        Crossfading over {{ fadeDuration }}s...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.crossfade-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.init-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tracks {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.track-card {
  flex: 1;
  min-width: 140px;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.3s;
}

.track-card.active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-name {
  font-weight: 700;
  font-size: 1rem;
}

.now-playing {
  font-size: 0.75rem;
  color: var(--vp-c-brand);
  font-weight: 600;
  background: var(--vp-c-brand-soft);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.track-position {
  font-family: monospace;
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
}

.track-card.active .track-position {
  color: var(--vp-c-brand);
}

.crossfade-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 120px;
}

.fade-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.duration-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.duration-label input {
  width: 100px;
}

.stop-row {
  display: flex;
  justify-content: center;
}

.init-btn,
.track-btn,
.crossfade-btn,
.stop-all-btn {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.init-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-size: 1rem;
  padding: 0.75rem 2rem;
}

.init-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.crossfade-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  font-weight: 600;
  font-size: 0.9rem;
}

.crossfade-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.track-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-all-btn {
  background: var(--vp-c-bg-mute);
  min-width: 100px;
}

.stop-all-btn:hover:not(:disabled) {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-danger);
  color: var(--vp-c-danger);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.5rem;
}

.crossfading-indicator {
  font-size: 0.85rem;
  color: var(--vp-c-brand);
  font-weight: 500;
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .tracks {
    flex-direction: column;
  }

  .track-card {
    width: 100%;
  }

  .crossfade-center {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>

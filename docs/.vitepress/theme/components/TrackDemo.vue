<script setup lang="ts">
import { useCleanup, useTrack } from '@ez-web-audio/vue'
import { onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  url?: string
}>()

const loading = ref(false)
const loaded = ref(false)
const isPlaying = ref(false)
const error = ref('')
const gain = ref(1)
const seekPosition = ref(0)
const duration = ref(0)
const positionString = ref('0:00')
const durationString = ref('0:00')

const cleanup = useCleanup()
const { instance: track, load: loadTrack_ } = useTrack()

let animationFrame: number | null = null
let isSeeking = false

async function loadTrack() {
  if (loaded.value)
    return

  try {
    error.value = ''
    loading.value = true

    const audioUrl = props.url || '/ez-web-audio/audio/short-music.mp3'
    const t = cleanup.register(await loadTrack_(audioUrl))

    duration.value = t.duration.raw
    durationString.value = t.duration.string

    t.on('stop', () => {
      // Ignore stop events triggered by seek (seek does stop→play internally)
      if (isSeeking)
        return
      isPlaying.value = false
      seekPosition.value = 0
      positionString.value = '0:00'
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    })

    t.on('play', () => {
      isPlaying.value = true
      updatePosition()
    })

    loaded.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load track'
  }
  finally {
    loading.value = false
  }
}

function updatePosition() {
  if (track.value && isPlaying.value) {
    seekPosition.value = track.value.position.raw
    positionString.value = track.value.position.string
    animationFrame = requestAnimationFrame(updatePosition)
  }
}

async function playPause() {
  if (!loaded.value) {
    await loadTrack()
    if (!loaded.value)
      return
  }

  if (isPlaying.value) {
    track.value?.pause()
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
  else {
    track.value?.changeGainTo(gain.value)
    await track.value?.play()
    isPlaying.value = true
    updatePosition()
  }
}

function stop() {
  if (track.value) {
    try { track.value.stop() }
    catch {}
  }
  isPlaying.value = false
  seekPosition.value = 0
  positionString.value = '0:00'
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

async function seek() {
  if (track.value) {
    isSeeking = true
    await track.value.seek(seekPosition.value).as('seconds')
    isSeeking = false
    positionString.value = track.value.position.string
  }
}

watch(gain, (val) => {
  if (track.value)
    track.value.changeGainTo(val)
})

onUnmounted(() => {
  if (animationFrame)
    cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div class="track-demo">
    <div class="controls">
      <div class="transport">
        <button :disabled="loading" class="play-btn" @click="playPause">
          {{ loading ? 'Loading...' : (isPlaying ? 'Pause' : 'Play') }}
        </button>
        <button :disabled="!loaded" class="stop-btn" @click="stop">
          Stop
        </button>
      </div>

      <div class="time-display">
        <span class="current">{{ positionString }}</span>
        <span class="separator">/</span>
        <span class="total">{{ durationString }}</span>
      </div>

      <div class="seek-bar">
        <input
          id="track-seek"
          v-model.number="seekPosition"
          type="range"
          :max="duration"
          step="0.1"
          :disabled="!loaded"
          :aria-label="`Seek position: ${positionString}`"
          @input="seek"
        >
      </div>

      <div class="volume">
        <label for="track-volume">
          Vol: {{ Math.round(gain * 100) }}%
          <input
            id="track-volume"
            v-model.number="gain"
            type="range"
            min="0"
            max="1"
            step="0.1"
            :aria-label="`Volume: ${Math.round(gain * 100)}%`"
          >
        </label>
      </div>
    </div>

    <slot />

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-demo {
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
}

.transport {
  display: flex;
  gap: 0.5rem;
}

.play-btn, .stop-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.play-btn {
  background: var(--vp-c-brand);
  color: white;
}

.play-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.stop-btn {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.stop-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

input:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.time-display {
  font-family: monospace;
  font-size: 1rem;
}

.separator {
  margin: 0 0.25rem;
  color: var(--vp-c-text-3);
}

.seek-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 150px;
}

.seek-bar input {
  flex: 1;
}

.volume label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.volume input {
  width: 80px;
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}
</style>

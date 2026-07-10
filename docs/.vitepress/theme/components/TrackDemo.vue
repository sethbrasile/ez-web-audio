<script setup lang="ts">
import { useCleanup, useTrack } from '@ez-web-audio/vue'
import { onUnmounted, ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import SegmentDisplay from './kit/SegmentDisplay.vue'

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

function formatGain(v: number) {
  return `${Math.round(v * 100)}%`
}
</script>

<template>
  <DemoFrame class="track-demo" :error="error" takeaway="Tracks have position tracking and seeking built in.">
    <div class="controls">
      <div class="transport">
        <PlayButton
          :playing="isPlaying"
          :loading="loading"
          label="Play"
          playing-label="Pause"
          @click="playPause"
        />
        <button type="button" class="stop-btn" :disabled="!loaded" @click="stop">
          Stop
        </button>
      </div>

      <SegmentDisplay :value="`${positionString} / ${durationString}`" caption="position" />

      <div class="sliders">
        <ParameterSlider
          id="track-seek"
          v-model="seekPosition"
          label="Seek"
          :min="0"
          :max="duration"
          :step="0.1"
          :disabled="!loaded"
          :format="() => positionString"
          @update:model-value="seek"
        />

        <ParameterSlider
          id="track-volume"
          v-model="gain"
          label="Volume"
          :min="0"
          :max="1"
          :step="0.1"
          :format="formatGain"
        />
      </div>
    </div>

    <slot />
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.transport {
  display: flex;
  gap: 10px;
  align-items: center;
}

.sliders {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  flex: 1;
}

.sliders > * {
  flex: 1;
  min-width: 200px;
}

.stop-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  font-weight: 600;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}

.stop-btn:hover:not(:disabled) {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.stop-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stop-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}
</style>

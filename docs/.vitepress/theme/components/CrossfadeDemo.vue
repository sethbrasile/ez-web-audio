<script setup lang="ts">
import { useCleanup, useEnsureLoaded, useTrack } from '@ez-web-audio/vue'
import { crossfade } from 'ez-web-audio'
import { computed, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'
import TriggerPad from './kit/TriggerPad.vue'

const activeTrack = ref<'A' | 'B' | null>(null)
const isCrossfading = ref(false)
const fadeDuration = ref(2)
const positionA = ref('0:00')
const positionB = ref('0:00')

const cleanup = useCleanup()
const { instance: trackA, load: loadTrackA } = useTrack()
const { instance: trackB, load: loadTrackB } = useTrack()
let animFrame: number | null = null

// No continuous progress ref is exposed by `crossfade()` (it resolves a
// Promise after `duration` seconds with no per-frame callback), so the rail
// handle/tile opacity are driven by which track the ear is heading toward:
// during a fade that's the OPPOSITE of `activeTrack` (which only flips once
// the promise resolves). The CSS transition timed to `fadeDuration` then
// glides the visual across the same window as the audible fade.
const displayTrack = computed(() => {
  if (isCrossfading.value && activeTrack.value)
    return activeTrack.value === 'A' ? 'B' : 'A'
  return activeTrack.value
})

const handlePosition = computed(() => (displayTrack.value === 'B' ? 100 : 0))

function tileOpacity(track: 'A' | 'B') {
  if (displayTrack.value === null)
    return 1
  return track === displayTrack.value ? 1 : 0.35
}

const crossfadeLabel = computed(() => {
  if (isCrossfading.value)
    return 'Fading...'
  if (activeTrack.value === 'A')
    return 'A → B'
  if (activeTrack.value === 'B')
    return 'B → A'
  return 'Crossfade'
})

function formatSeconds(v: number) {
  return `${v.toFixed(1)}s`
}

function onFadeDurationInput(v: number) {
  fadeDuration.value = v
}

const { loading, error, ensureLoaded } = useEnsureLoaded(async () => {
  const [a, b] = await Promise.all([
    loadTrackA('/ez-web-audio/audio/short-music.mp3'),
    loadTrackB('/ez-web-audio/audio/short-music.mp3'),
  ])

  cleanup.register(a)
  cleanup.register(b)

  a.on('stop', () => {
    if (activeTrack.value === 'A' && !isCrossfading.value) {
      activeTrack.value = null
    }
  })

  b.on('stop', () => {
    if (activeTrack.value === 'B' && !isCrossfading.value) {
      activeTrack.value = null
    }
  })
}, 'Failed to load tracks')

function updatePositions() {
  if (trackA.value?.isPlaying) {
    positionA.value = trackA.value.position?.string ?? '0:00'
  }
  if (trackB.value?.isPlaying) {
    positionB.value = trackB.value.position?.string ?? '0:00'
  }
  animFrame = requestAnimationFrame(updatePositions)
}

async function playTrackA() {
  if (isCrossfading.value || !(await ensureLoaded()))
    return

  try {
    error.value = ''
    if (activeTrack.value === 'B') {
      // Stop B first
      try { await trackB.value?.stop() }
      catch {}
    }
    await trackA.value?.play()
    activeTrack.value = 'A'
    updatePositions()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function playTrackB() {
  if (isCrossfading.value || !(await ensureLoaded()))
    return

  try {
    error.value = ''
    if (activeTrack.value === 'A') {
      // Stop A first
      try { await trackA.value?.stop() }
      catch {}
    }
    await trackB.value?.play()
    activeTrack.value = 'B'
    updatePositions()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

async function doCrossfade() {
  if (!trackA.value || !trackB.value || isCrossfading.value)
    return

  // Determine direction: if A is playing, fade A→B; else fade B→A
  const from = activeTrack.value === 'A' ? trackA.value : trackB.value
  const to = activeTrack.value === 'A' ? trackB.value : trackA.value
  const toLabel = activeTrack.value === 'A' ? 'B' : 'A'

  if (!from.isPlaying) {
    error.value = 'Start a track first, then crossfade'
    return
  }

  try {
    error.value = ''
    isCrossfading.value = true

    await crossfade(from, to, fadeDuration.value, { afterFade: 'continue' })

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
  if (trackA.value) {
    try { await trackA.value.stop() }
    catch {}
  }
  if (trackB.value) {
    try { await trackB.value.stop() }
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
  <DemoFrame class="crossfade-demo" :error="error" takeaway="Smooth source-to-source transitions.">
    <div class="controls">
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
          <PlayButton
            label="Play Track A"
            playing-label="Playing"
            :playing="activeTrack === 'A'"
            :disabled="isCrossfading || activeTrack === 'A'"
            @click="playTrackA"
          />
        </div>

        <div class="crossfade-center">
          <ParameterSlider
            label="Fade Duration"
            :model-value="fadeDuration"
            :min="0.5"
            :max="5"
            :step="0.5"
            :format="formatSeconds"
            :disabled="isCrossfading"
            @update:model-value="onFadeDurationInput"
          />
          <TriggerPad
            :label="crossfadeLabel"
            :active="isCrossfading"
            :disabled="isCrossfading || activeTrack === null"
            @trigger="doCrossfade"
          />
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
          <PlayButton
            label="Play Track B"
            playing-label="Playing"
            :playing="activeTrack === 'B'"
            :disabled="isCrossfading || activeTrack === 'B'"
            @click="playTrackB"
          />
        </div>
      </div>

      <div class="crossfade-visual">
        <div class="track-tile track-tile--a" :style="{ opacity: tileOpacity('A') }">
          A
        </div>
        <div class="crossfade-rail">
          <div
            class="crossfade-handle"
            :style="{ left: `${handlePosition}%`, transitionDuration: `${fadeDuration}s` }"
          />
        </div>
        <div class="track-tile track-tile--b" :style="{ opacity: tileOpacity('B') }">
          B
        </div>
      </div>

      <div class="stop-row">
        <button class="stop-all-btn" :disabled="activeTrack === null && !isCrossfading" @click="stopAll">
          Stop All
        </button>
      </div>
    </div>

    <template #status>
      <p v-if="isCrossfading" class="crossfading-indicator">
        Crossfading over {{ fadeDuration }}s...
      </p>
    </template>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tracks {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.track-card {
  flex: 1;
  min-width: 140px;
  padding: 16px;
  border-radius: 10px;
  border: 2px solid var(--ewa-line);
  background: var(--ewa-bg);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.3s, background 0.3s;
}

.track-card.active {
  border-color: var(--ewa-accent);
  background: var(--ewa-accent-soft);
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--ewa-text);
}

.now-playing {
  font-size: 0.75rem;
  color: var(--ewa-accent-ink);
  font-weight: 600;
  background: var(--ewa-accent-soft);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.track-position {
  font-family: var(--vp-font-family-mono);
  font-size: 1.2rem;
  color: var(--ewa-text-2);
}

.track-card.active .track-position {
  color: var(--ewa-accent-ink);
}

.crossfade-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 160px;
}

.crossfade-center :deep(.ewa-slider) {
  width: 100%;
}

.crossfade-visual {
  display: flex;
  align-items: center;
  gap: 10px;
}

.track-tile {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transition: opacity 0.2s;
}

.track-tile--a {
  background: var(--ewa-lead);
}

.track-tile--b {
  background: var(--ewa-clap);
}

.crossfade-rail {
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ewa-lead), var(--ewa-clap));
}

.crossfade-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ewa-bg);
  border: 2px solid var(--ewa-accent);
  box-shadow: var(--ewa-shadow);
  transform: translate(-50%, -50%);
  transition-property: left;
  transition-timing-function: ease;
}

.stop-row {
  display: flex;
  justify-content: center;
}

.stop-all-btn {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  font-weight: 600;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.stop-all-btn:hover:not(:disabled) {
  background: var(--ewa-bg);
  border-color: var(--ewa-danger);
  color: var(--ewa-danger);
}

.stop-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-all-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}

.crossfading-indicator {
  font-size: 0.85rem;
  color: var(--ewa-accent-ink);
  font-weight: 500;
  margin: 0;
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

<script setup lang="ts">
import { useCleanup, useSound, useSprite } from '@ez-web-audio/vue'
import { computed, onUnmounted, ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import PlayButton from './kit/PlayButton.vue'
import TriggerPad from './kit/TriggerPad.vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const playing = ref<string | null>(null)
const playingFull = ref(false)

const cleanup = useCleanup()
const { instance: sprite, load: loadSprite } = useSprite()
const { instance: fullSound, load: loadFull } = useSound()
let playTimer: ReturnType<typeof setTimeout> | null = null
let fullTimer: ReturnType<typeof setTimeout> | null = null

// Playhead animation state
const playheadPosition = ref(0)
let playheadFrame: number | null = null
let playStartTime = 0

// Palette colors cycle kick/snare/hat/clap/bass/lead — one per sprite segment.
const segments = [
  { name: 'beep', label: 'Beep', start: 0.0, end: 0.47, color: 'var(--ewa-kick)' },
  { name: 'cannon', label: 'Cannon', start: 0.67, end: 2.704, color: 'var(--ewa-snare)' },
  { name: 'whoosh', label: 'Whoosh', start: 2.904, end: 3.966, color: 'var(--ewa-hat)' },
  { name: 'bling', label: 'Bling', start: 4.166, end: 6.49, color: 'var(--ewa-clap)' },
  { name: 'punch', label: 'Punch', start: 6.69, end: 7.484, color: 'var(--ewa-bass)' },
  { name: 'fanfare', label: 'Fanfare', start: 7.684, end: 11.316, color: 'var(--ewa-lead)' },
]

const totalDuration = 11.316

const manifest = {
  spritemap: {
    beep: { start: 0.0, end: 0.47, loop: false },
    cannon: { start: 0.67, end: 2.704, loop: false },
    whoosh: { start: 2.904, end: 3.966, loop: false },
    bling: { start: 4.166, end: 6.49, loop: false },
    punch: { start: 6.69, end: 7.484, loop: false },
    fanfare: { start: 7.684, end: 11.316, loop: false },
  },
}

const manifestJson = JSON.stringify(manifest, null, 2)

const statusText = computed(() => {
  if (loading.value)
    return 'Loading sounds...'
  if (playingFull.value)
    return 'Playing full file...'
  if (playing.value) {
    const seg = segments.find(s => s.name === playing.value)
    return `Playing: ${seg?.label ?? playing.value}`
  }
  return 'Ready'
})

async function ensureLoaded() {
  if (loaded.value)
    return true
  if (loading.value)
    return false

  try {
    loading.value = true
    error.value = ''

    cleanup.register(await loadSprite('/ez-web-audio/audio/sfx-sprite.mp3', manifest))
    cleanup.register(await loadFull('/ez-web-audio/audio/sfx-sprite.mp3'))

    loaded.value = true
    return true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load audio sprite'
    return false
  }
  finally {
    loading.value = false
  }
}

async function playSegment(name: string) {
  if (!(await ensureLoaded()))
    return

  try {
    if (playTimer) {
      clearTimeout(playTimer)
      playTimer = null
    }

    sprite.value?.play(name)
    playing.value = name

    const seg = segments.find(s => s.name === name)
    if (seg) {
      const duration = (seg.end - seg.start) * 1000
      playTimer = setTimeout(() => {
        if (playing.value === name) {
          playing.value = null
        }
        playTimer = null
      }, duration)
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

function startPlayhead() {
  playStartTime = performance.now()
  animatePlayhead()
}

function animatePlayhead() {
  const elapsed = (performance.now() - playStartTime) / 1000
  playheadPosition.value = (elapsed / totalDuration) * 100
  if (elapsed < totalDuration && playingFull.value) {
    playheadFrame = requestAnimationFrame(animatePlayhead)
  }
  else {
    playheadPosition.value = 0
    playingFull.value = false
  }
}

function stopPlayhead() {
  if (playheadFrame) {
    cancelAnimationFrame(playheadFrame)
    playheadFrame = null
  }
  playheadPosition.value = 0
}

async function toggleFullPlayback() {
  if (playingFull.value) {
    // Stop playback
    if (fullSound.value) {
      try { fullSound.value.stop() }
      catch {}
    }
    if (fullTimer) {
      clearTimeout(fullTimer)
      fullTimer = null
    }
    playingFull.value = false
    stopPlayhead()
    return
  }

  if (!(await ensureLoaded()))
    return

  try {
    if (fullTimer) {
      clearTimeout(fullTimer)
      fullTimer = null
    }

    fullSound.value?.play()
    playingFull.value = true
    startPlayhead()

    fullTimer = setTimeout(() => {
      playingFull.value = false
      stopPlayhead()
      fullTimer = null
    }, totalDuration * 1000)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

onUnmounted(() => {
  if (playTimer)
    clearTimeout(playTimer)
  if (fullTimer)
    clearTimeout(fullTimer)
  stopPlayhead()
})
</script>

<template>
  <DemoFrame class="sprite-demo" :error="error" takeaway="Many sounds, one file.">
    <div class="controls">
      <div class="full-play-row">
        <PlayButton
          label="Play Full File"
          playing-label="Stop"
          loading-label="Loading..."
          :playing="playingFull"
          :loading="loading"
          @click="toggleFullPlayback"
        />
        <span class="full-play-hint">Hear all 6 sounds played back-to-back from one file</span>
      </div>

      <div class="section-label">
        Segment Timeline
      </div>
      <div class="timeline-wrap">
        <div class="timeline-bar">
          <div
            v-for="seg in segments"
            :key="seg.name"
            class="timeline-slice"
            :class="{ active: playing === seg.name }"
            :style="{ 'flex': `${seg.end - seg.start} 1 0%`, '--slice-color': seg.color }"
            :title="`${seg.label}: ${seg.start}s - ${seg.end}s`"
          >
            <span class="slice-label">{{ seg.label }}</span>
          </div>
          <div
            v-if="playingFull"
            class="playhead"
            :style="{ left: `${playheadPosition}%` }"
          />
        </div>
      </div>

      <div class="section-label">
        Play Individual Sounds
      </div>
      <div class="pads">
        <TriggerPad
          v-for="seg in segments"
          :key="seg.name"
          :label="seg.label"
          :color="seg.color"
          :disabled="loading"
          :active="playing === seg.name"
          @trigger="playSegment(seg.name)"
        />
      </div>

      <div class="section-label">
        Spritemap (audiosprite format)
      </div>
      <div class="manifest-display">
        <pre><code>{{ manifestJson }}</code></pre>
      </div>
    </div>

    <template #status>
      <p class="status-text">
        {{ statusText }}
      </p>
    </template>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.full-play-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.full-play-hint {
  font-size: 0.85rem;
  color: var(--ewa-text-2);
}

.section-label {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--ewa-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: -6px;
}

.timeline-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-bar {
  position: relative;
  display: flex;
  height: 26px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--ewa-well);
  box-shadow: inset 0 0 0 1px var(--ewa-line);
}

.timeline-slice {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  background: color-mix(in srgb, var(--slice-color) 40%, transparent);
  cursor: default;
  transition: background 0.15s;
}

.timeline-slice.active {
  background: var(--slice-color);
}

.slice-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #fff;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.pads {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.manifest-display {
  background: var(--ewa-bg);
  border: 1px solid var(--ewa-line);
  border-radius: 6px;
  overflow-x: auto;
}

.manifest-display pre {
  margin: 0;
  padding: 1rem;
}

.manifest-display code {
  font-size: 0.8rem;
  color: var(--ewa-text);
}

.status-text {
  font-size: 0.85rem;
  color: var(--ewa-text-2);
  margin: 0;
}

@media (max-width: 640px) {
  .full-play-row {
    flex-direction: column;
    align-items: stretch;
  }

  .full-play-hint {
    text-align: center;
  }

  .timeline-bar {
    height: 22px;
  }

  .slice-label {
    font-size: 9px;
  }
}
</style>

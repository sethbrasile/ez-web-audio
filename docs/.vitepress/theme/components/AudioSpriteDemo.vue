<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const playing = ref<string | null>(null)
const playingFull = ref(false)

let sprite: any = null
let fullSound: any = null
let playTimer: ReturnType<typeof setTimeout> | null = null
let fullTimer: ReturnType<typeof setTimeout> | null = null

// Playhead animation state
const playheadPosition = ref(0)
let playheadFrame: number | null = null
let playStartTime = 0

const segments = [
  { name: 'beep', label: 'Beep', start: 0.0, end: 0.47, color: '#4CAF50' },
  { name: 'cannon', label: 'Cannon', start: 0.67, end: 2.704, color: '#F44336' },
  { name: 'whoosh', label: 'Whoosh', start: 2.904, end: 3.966, color: '#2196F3' },
  { name: 'bling', label: 'Bling', start: 4.166, end: 6.49, color: '#FF9800' },
  { name: 'punch', label: 'Punch', start: 6.69, end: 7.484, color: '#9C27B0' },
  { name: 'fanfare', label: 'Fanfare', start: 7.684, end: 11.316, color: '#00BCD4' },
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

async function ensureLoaded() {
  if (loaded.value)
    return true
  if (loading.value)
    return false

  try {
    loading.value = true
    error.value = ''

    const lib = await import('ez-web-audio')

    sprite = await lib.createSprite('/ez-web-audio/audio/sfx-sprite.mp3', manifest)
    fullSound = await lib.createSound('/ez-web-audio/audio/sfx-sprite.mp3')

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

    sprite.play(name)
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
    if (fullSound) {
      try { fullSound.stop() }
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

    fullSound.play()
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

function segmentLeft(seg: typeof segments[0]): string {
  return `${(seg.start / totalDuration) * 100}%`
}

function segmentWidth(seg: typeof segments[0]): string {
  return `${((seg.end - seg.start) / totalDuration) * 100}%`
}

onUnmounted(() => {
  if (playTimer)
    clearTimeout(playTimer)
  if (fullTimer)
    clearTimeout(fullTimer)
  stopPlayhead()
  if (sprite) {
    try { sprite.stopAll() }
    catch {}
    try { sprite.dispose() }
    catch {}
  }
  if (fullSound) {
    try { fullSound.stop() }
    catch {}
  }
})
</script>

<template>
  <div class="sprite-demo">
    <div class="controls">
      <div class="full-play-section">
        <button
          class="full-play-btn"
          :class="{ active: playingFull }"
          :disabled="loading"
          @click="toggleFullPlayback"
        >
          {{ loading ? 'Loading...' : playingFull ? 'Stop' : 'Play Full File' }}
        </button>
        <span class="full-play-hint">Hear all 6 sounds played back-to-back from one file</span>
      </div>

      <div class="section-label">
        Visual Timeline
      </div>
      <div class="timeline-container">
        <div class="timeline">
          <div
            v-for="seg in segments"
            :key="seg.name"
            class="timeline-segment"
            :class="{ active: playing === seg.name }"
            :style="{
              left: segmentLeft(seg),
              width: segmentWidth(seg),
              backgroundColor: seg.color,
            }"
            :title="`${seg.label}: ${seg.start}s - ${seg.end}s`"
            @click="playSegment(seg.name)"
          >
            <span class="segment-label">{{ seg.label }}</span>
          </div>
          <div
            v-if="playingFull"
            class="playhead"
            :style="{ left: `${playheadPosition}%` }"
          />
        </div>
        <div class="timeline-axis">
          <span>0s</span>
          <span>{{ (totalDuration / 2).toFixed(1) }}s</span>
          <span>{{ totalDuration.toFixed(1) }}s</span>
        </div>
      </div>

      <div class="section-label">
        Play Individual Sounds
      </div>
      <div class="sprite-buttons">
        <button
          v-for="seg in segments"
          :key="seg.name"
          class="sprite-btn"
          :class="{ active: playing === seg.name }"
          :style="{ '--seg-color': seg.color }"
          :disabled="loading"
          @click="playSegment(seg.name)"
        >
          {{ loading && !loaded ? 'Loading...' : seg.label }}
        </button>
      </div>

      <div class="section-label">
        Spritemap (audiosprite format)
      </div>
      <div class="manifest-display">
        <pre><code>{{ manifestJson }}</code></pre>
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.sprite-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.full-play-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.full-play-hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.section-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: -0.5rem;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.timeline {
  position: relative;
  height: 48px;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.timeline-segment {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.75;
  border-radius: 3px;
}

.timeline-segment:hover {
  opacity: 0.9;
  transform: scaleY(1.05);
}

.timeline-segment.active {
  opacity: 1;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
  transform: scaleY(1.1);
  z-index: 1;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: white;
  z-index: 2;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.segment-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.timeline-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  padding: 0 2px;
}

.sprite-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.full-play-btn,
.sprite-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.full-play-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.full-play-btn:hover:not(.active):not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.full-play-btn.active {
  background: var(--vp-c-brand-dark);
  box-shadow: 0 0 8px var(--vp-c-brand-dimm);
}

.full-play-btn:disabled,
.sprite-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sprite-btn:hover:not(.active):not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--seg-color, var(--vp-c-brand));
}

.sprite-btn.active {
  background: var(--seg-color, var(--vp-c-brand));
  color: white;
  border-color: var(--seg-color, var(--vp-c-brand));
  box-shadow: 0 0 8px color-mix(in srgb, var(--seg-color, var(--vp-c-brand)) 50%, transparent);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.manifest-display {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow-x: auto;
}

.manifest-display pre {
  margin: 0;
  padding: 1rem;
}

.manifest-display code {
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
  margin-top: 0.75rem;
}

@media (max-width: 640px) {
  .full-play-section {
    flex-direction: column;
    align-items: stretch;
  }

  .full-play-hint {
    text-align: center;
  }

  .timeline {
    height: 40px;
  }

  .segment-label {
    font-size: 0.6rem;
  }
}
</style>

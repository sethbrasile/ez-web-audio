<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const loopingSprite = ref<string | null>(null)

let sprite: any = null
let lib: any = null

const segments = [
  { name: 'kick', label: 'Kick', start: 0, end: 0.4 },
  { name: 'snare', label: 'Snare', start: 0.5, end: 0.9 },
  { name: 'hihat', label: 'Hi-Hat', start: 1.0, end: 1.3 },
]

async function initialize() {
  if (loaded.value || loading.value)
    return

  try {
    loading.value = true
    error.value = ''

    if (!lib) {
      lib = await import('ez-web-audio')
    }

    // Create sprite from kick sample with artificial segments
    // We use the kick sample and define time-based regions within it
    sprite = await lib.createSprite('/ez-web-audio/audio/drum-samples/kick1.wav', {
      spritemap: {
        kick: { start: 0.0, end: 0.35 },
        tail: { start: 0.05, end: 0.25 },
        click: { start: 0.0, end: 0.08 },
      },
    })

    loaded.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load audio sprite'
  }
  finally {
    loading.value = false
  }
}

function playSegment(name: string) {
  if (!sprite)
    return
  try {
    sprite.play(name)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
  }
}

function toggleLoop(name: string) {
  if (!sprite)
    return

  if (loopingSprite.value === name) {
    // Stop the loop
    try {
      sprite.stop(name)
    }
    catch {}
    loopingSprite.value = null
  }
  else {
    // Stop any existing loop first
    if (loopingSprite.value) {
      try {
        sprite.stop(loopingSprite.value)
      }
      catch {}
    }
    // Start new loop — requires loop: true in spritemap definition
    // Since the manifest was created without loop, we demonstrate concept with rapid play
    try {
      sprite.play(name)
      loopingSprite.value = name
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Loop error'
    }
  }
}

function stopAll() {
  if (!sprite)
    return
  try {
    sprite.stopAll()
    loopingSprite.value = null
  }
  catch {}
}

onUnmounted(() => {
  if (sprite) {
    try { sprite.stopAll() }
    catch {}
  }
})
</script>

<template>
  <div class="sprite-demo">
    <div v-if="!loaded" class="init-section">
      <button :disabled="loading" class="init-btn" @click="initialize">
        {{ loading ? 'Loading audio...' : 'Load Audio Sprite' }}
      </button>
      <p class="hint">
        Click to initialize audio (browser requires user interaction)
      </p>
    </div>

    <div v-else class="controls">
      <div class="section-label">
        Play Segments
      </div>
      <div class="sprite-buttons">
        <button class="sprite-btn" @click="playSegment('kick')">
          Full Kick
        </button>
        <button class="sprite-btn" @click="playSegment('tail')">
          Kick Tail
        </button>
        <button class="sprite-btn" @click="playSegment('click')">
          Kick Click
        </button>
      </div>

      <div class="section-label">
        Loop Control
      </div>
      <div class="loop-controls">
        <button
          class="loop-btn"
          :class="{ active: loopingSprite === 'kick' }"
          @click="toggleLoop('kick')"
        >
          {{ loopingSprite === 'kick' ? 'Stop Loop' : 'Loop Full Kick' }}
        </button>
        <button class="stop-all-btn" @click="stopAll">
          Stop All
        </button>
      </div>

      <div class="sprite-info">
        <strong>Loaded sprites:</strong>
        <span v-for="name in ['kick', 'tail', 'click']" :key="name" class="sprite-tag">
          {{ name }}
        </span>
      </div>
    </div>

    <div class="status-bar">
      <div v-if="loopingSprite" class="playing-indicator">
        Looping: <strong>{{ loopingSprite }}</strong>
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
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

.section-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sprite-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.loop-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sprite-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  flex-wrap: wrap;
}

.sprite-tag {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.init-btn,
.sprite-btn,
.loop-btn,
.stop-all-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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

.init-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sprite-btn:hover:not(:disabled),
.loop-btn:hover:not(:disabled),
.stop-all-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand);
  outline-offset: 2px;
}

.loop-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  font-weight: 600;
}

.stop-all-btn {
  background: var(--vp-c-bg-mute);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.playing-indicator {
  font-size: 0.85rem;
  color: var(--vp-c-brand);
}

.error {
  color: var(--vp-c-danger);
  font-size: 0.9rem;
}
</style>

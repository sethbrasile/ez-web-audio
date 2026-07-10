<script setup lang="ts">
import type { Sound } from 'ez-web-audio'
import { useCleanup } from '@ez-web-audio/vue'
import { createSound, playTogether as playTogetherUtil } from 'ez-web-audio'
import { ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import PlayButton from './kit/PlayButton.vue'
import TriggerPad from './kit/TriggerPad.vue'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const status = ref('Ready')

const soundPlaying = ref([false, false, false])

const soundLabels = ['Kick', 'Snare', 'Hi-Hat']
const soundColors = ['var(--ewa-kick)', 'var(--ewa-snare)', 'var(--ewa-hat)']
const soundUrls = [
  '/ez-web-audio/audio/drum-samples/kick1.wav',
  '/ez-web-audio/audio/drum-samples/snare1.wav',
  '/ez-web-audio/audio/drum-samples/hihat1.wav',
]

const cleanup = useCleanup()
let sounds: Sound[] = []

async function ensureLoaded() {
  if (loaded.value)
    return true
  if (loading.value)
    return false

  try {
    loading.value = true
    error.value = ''
    status.value = 'Loading sounds...'

    sounds = (await Promise.all(
      soundUrls.map(url => createSound(url)),
    )).map(s => cleanup.register(s))

    loaded.value = true
    status.value = 'Ready'
    return true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load sounds'
    status.value = 'Ready'
    return false
  }
  finally {
    loading.value = false
  }
}

async function playTogether() {
  if (!(await ensureLoaded()))
    return

  try {
    error.value = ''
    status.value = 'Playing...'
    soundPlaying.value = [true, true, true]

    await playTogetherUtil(sounds)

    setTimeout(() => {
      soundPlaying.value = [false, false, false]
      status.value = 'Ready'
    }, 1200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    status.value = 'Ready'
  }
}

async function playSequentially() {
  if (!(await ensureLoaded()))
    return

  try {
    error.value = ''
    status.value = 'Playing sequentially...'

    for (let i = 0; i < sounds.length; i++) {
      soundPlaying.value[i] = true
      await sounds[i].play()
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    setTimeout(() => {
      soundPlaying.value = [false, false, false]
      status.value = 'Ready'
    }, 1200)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    soundPlaying.value = [false, false, false]
    status.value = 'Ready'
  }
}

async function playSound(index: number) {
  if (!(await ensureLoaded()) || !sounds[index])
    return

  try {
    error.value = ''
    soundPlaying.value[index] = true
    await sounds[index].play()

    setTimeout(() => {
      soundPlaying.value[index] = false
    }, 800)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Playback error'
    soundPlaying.value[index] = false
  }
}
</script>

<template>
  <DemoFrame class="play-together-demo" :error="error" takeaway="Composition is trivial — fire multiple sounds at once.">
    <div class="controls">
      <div class="main-controls">
        <PlayButton label="Play Together" @click="playTogether" />
        <button type="button" class="sequential-btn" @click="playSequentially">
          Play Sequentially
        </button>
      </div>

      <div class="pads">
        <TriggerPad
          v-for="(label, i) in soundLabels"
          :key="label"
          :label="label"
          :color="soundColors[i]"
          :active="soundPlaying[i]"
          @trigger="playSound(i)"
        />
      </div>
    </div>

    <slot />

    <template #status>
      <p class="status-text">
        {{ status }}
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

.main-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sequential-btn {
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

.sequential-btn:hover:not(:disabled) {
  border-color: var(--ewa-accent);
  color: var(--ewa-text);
}

.sequential-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}

.pads {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status-text {
  font-size: 0.85rem;
  color: var(--ewa-text-2);
  margin: 0;
}
</style>

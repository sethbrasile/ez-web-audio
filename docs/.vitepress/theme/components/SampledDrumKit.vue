<script setup lang="ts">
import { useCleanup, useSampler } from '@ez-web-audio/vue'
import { ref } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import TriggerPad from './kit/TriggerPad.vue'

const loading = ref(false)
const initialized = ref(false)
const error = ref('')
const lastPlayed = ref('')
const playCount = ref({
  kick: 1,
  snare: 1,
  hihat: 1,
})

const cleanup = useCleanup()
const { instance: kickSampler, load: loadKick } = useSampler()
const { instance: snareSampler, load: loadSnare } = useSampler()
const { instance: hihatSampler, load: loadHihat } = useSampler()

const pads = [
  { name: 'kick', label: 'Kick', color: 'var(--ewa-kick)' },
  { name: 'snare', label: 'Snare', color: 'var(--ewa-snare)' },
  { name: 'hihat', label: 'Hi-hat', color: 'var(--ewa-hat)' },
]

async function initSamplers() {
  if (initialized.value)
    return

  try {
    loading.value = true
    error.value = ''

    // Create samplers with 3 variations each
    cleanup.register(await loadKick([
      '/ez-web-audio/audio/drum-samples/kick1.wav',
      '/ez-web-audio/audio/drum-samples/kick2.wav',
      '/ez-web-audio/audio/drum-samples/kick3.wav',
    ]))

    cleanup.register(await loadSnare([
      '/ez-web-audio/audio/drum-samples/snare1.wav',
      '/ez-web-audio/audio/drum-samples/snare2.wav',
      '/ez-web-audio/audio/drum-samples/snare3.wav',
    ]))

    cleanup.register(await loadHihat([
      '/ez-web-audio/audio/drum-samples/hihat1.wav',
      '/ez-web-audio/audio/drum-samples/hihat2.wav',
      '/ez-web-audio/audio/drum-samples/hihat3.wav',
    ]))

    initialized.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load drum samples'
  }
  finally {
    loading.value = false
  }
}

async function playPad(padName: string) {
  if (!initialized.value) {
    await initSamplers()
    if (!initialized.value)
      return
  }

  try {
    // Play the sampler and update counter
    if (padName === 'kick' && kickSampler.value) {
      kickSampler.value.play()
      playCount.value.kick = (playCount.value.kick % 3) + 1
    }
    else if (padName === 'snare' && snareSampler.value) {
      snareSampler.value.play()
      playCount.value.snare = (playCount.value.snare % 3) + 1
    }
    else if (padName === 'hihat' && hihatSampler.value) {
      hihatSampler.value.play()
      playCount.value.hihat = (playCount.value.hihat % 3) + 1
    }

    // Visual feedback
    lastPlayed.value = padName
    setTimeout(() => {
      if (lastPlayed.value === padName) {
        lastPlayed.value = ''
      }
    }, 100)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  }
}
</script>

<template>
  <DemoFrame class="sampled-drum-kit" :error="error" takeaway="Tap pads, hear samples instantly.">
    <div class="pads">
      <TriggerPad
        v-for="pad in pads"
        :key="pad.name"
        :label="pad.label"
        :sublabel="`Sample ${playCount[pad.name]}/3`"
        :color="pad.color"
        :disabled="loading"
        :active="lastPlayed === pad.name"
        @trigger="playPad(pad.name)"
      />
    </div>

    <p class="info-text">
      Each pad cycles through 3 sample variations (round-robin)
    </p>
  </DemoFrame>
</template>

<style scoped>
.pads {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.pads :deep(.ewa-trigger-pad) {
  min-width: 72px;
  min-height: 64px;
  padding: 0 8px;
}

.info-text {
  text-align: center;
  color: var(--ewa-text-2);
  font-size: 0.9rem;
  margin: 16px 0 0;
}
</style>

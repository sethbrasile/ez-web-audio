<script setup lang="ts">
import { useCleanup, useSound } from '@ez-web-audio/vue'
import { ref, watch } from 'vue'
import DemoFrame from './kit/DemoFrame.vue'
import ParameterSlider from './kit/ParameterSlider.vue'
import PlayButton from './kit/PlayButton.vue'

const props = defineProps<{
  url?: string
}>()

const loading = ref(false)
const error = ref('')
const gain = ref(1)
const pan = ref(0)

const cleanup = useCleanup()
const { instance: sound, load: loadSound } = useSound()

async function play() {
  if (loading.value)
    return

  try {
    error.value = ''
    loading.value = true

    const s = cleanup.register(await loadSound(props.url || '/ez-web-audio/audio/click.mp3'))
    s.changeGainTo(gain.value)
    s.changePanTo(pan.value)
    s.play()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  }
  finally {
    loading.value = false
  }
}

watch(gain, (val) => {
  if (sound.value)
    sound.value.changeGainTo(val)
})

watch(pan, (val) => {
  if (sound.value)
    sound.value.changePanTo(val)
})

function formatGain(v: number) {
  return `${Math.round(v * 100)}%`
}

function formatPan(v: number) {
  if (v < 0)
    return `L ${Math.abs(Math.round(v * 100))}`
  if (v > 0)
    return `R ${Math.round(v * 100)}`
  return 'C'
}
</script>

<template>
  <DemoFrame class="audio-demo" :error="error" takeaway="Playing a sound is one function call.">
    <div class="controls">
      <PlayButton :loading="loading" label="Play Sound" @click="play" />

      <div class="sliders">
        <ParameterSlider
          id="audio-volume"
          v-model="gain"
          label="Volume"
          :min="0"
          :max="1"
          :step="0.1"
          :format="formatGain"
        />
        <ParameterSlider
          id="audio-pan"
          v-model="pan"
          label="Pan"
          :min="-1"
          :max="1"
          :step="0.1"
          center
          :format="formatPan"
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
  gap: 24px;
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
</style>

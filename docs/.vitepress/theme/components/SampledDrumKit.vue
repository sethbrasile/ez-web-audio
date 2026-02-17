<template>
  <div class="sampled-drum-kit">
    <div class="drum-pads">
      <div
        v-for="pad in pads"
        :key="pad.name"
        :class="['drum-pad', pad.color, { pressed: lastPlayed === pad.name, disabled: loading }]"
        :role="loading ? undefined : 'button'"
        :tabindex="loading ? -1 : 0"
        :aria-label="`Play ${pad.label.toLowerCase()} drum`"
        :aria-disabled="loading"
        @mousedown="loading ? null : playPad(pad.name)"
        @touchstart.prevent="loading ? null : playPad(pad.name)"
        @keydown.enter="loading ? null : playPad(pad.name)"
        @keydown.space.prevent="loading ? null : playPad(pad.name)"
      >
        <div class="pad-label">{{ pad.label }}</div>
        <div class="sample-counter">Sample {{ playCount[pad.name] }}/3</div>
      </div>
    </div>

    <div class="info-text">
      Each pad cycles through 3 sample variations (round-robin)
    </div>

    <div class="status-bar">
      <div v-if="loading" class="loading">Loading drum samples...</div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const loading = ref(false)
const initialized = ref(false)
const error = ref('')
const lastPlayed = ref('')
const playCount = ref({
  kick: 1,
  snare: 1,
  hihat: 1
})

let kickSampler: any = null
let snareSampler: any = null
let hihatSampler: any = null
let lib: any = null

const pads = [
  { name: 'kick', label: 'KICK', color: 'blue' },
  { name: 'snare', label: 'SNARE', color: 'orange' },
  { name: 'hihat', label: 'HI-HAT', color: 'yellow' }
]

async function initSamplers() {
  if (initialized.value) return

  try {
    loading.value = true
    error.value = ''

    // Dynamic import for SSR compatibility
    lib = await import('ez-web-audio')

    // Create samplers with 3 variations each
    kickSampler = await lib.createSampler([
      '/ez-web-audio/audio/drum-samples/kick1.wav',
      '/ez-web-audio/audio/drum-samples/kick2.wav',
      '/ez-web-audio/audio/drum-samples/kick3.wav'
    ])

    snareSampler = await lib.createSampler([
      '/ez-web-audio/audio/drum-samples/snare1.wav',
      '/ez-web-audio/audio/drum-samples/snare2.wav',
      '/ez-web-audio/audio/drum-samples/snare3.wav'
    ])

    hihatSampler = await lib.createSampler([
      '/ez-web-audio/audio/drum-samples/hihat1.wav',
      '/ez-web-audio/audio/drum-samples/hihat2.wav',
      '/ez-web-audio/audio/drum-samples/hihat3.wav'
    ])

    initialized.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load drum samples'
  } finally {
    loading.value = false
  }
}

async function playPad(padName: string) {
  if (!initialized.value) {
    await initSamplers()
    if (!initialized.value) return
  }

  try {
    // Play the sampler and update counter
    if (padName === 'kick' && kickSampler) {
      kickSampler.play()
      playCount.value.kick = (playCount.value.kick % 3) + 1
    } else if (padName === 'snare' && snareSampler) {
      snareSampler.play()
      playCount.value.snare = (playCount.value.snare % 3) + 1
    } else if (padName === 'hihat' && hihatSampler) {
      hihatSampler.play()
      playCount.value.hihat = (playCount.value.hihat % 3) + 1
    }

    // Visual feedback
    lastPlayed.value = padName
    setTimeout(() => {
      if (lastPlayed.value === padName) {
        lastPlayed.value = ''
      }
    }, 100)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  }
}

onUnmounted(() => {
  // Cleanup samplers
  try {
    if (kickSampler) kickSampler.stop()
    if (snareSampler) snareSampler.stop()
    if (hihatSampler) hihatSampler.stop()
  } catch (e) {
    // Ignore cleanup errors
  }
})
</script>

<style scoped>
.sampled-drum-kit {
  padding: 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.loading {
  padding: 0.5rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.error {
  color: var(--vp-c-danger);
  padding: 0.5rem;
  background: var(--vp-c-danger-soft);
  border-radius: 4px;
}

.drum-pads {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.drum-pad {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
  border: 2px solid transparent;
  position: relative;
}

.drum-pad.blue {
  background: #3b82f6;
  color: white;
}

.drum-pad.blue:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.drum-pad.orange {
  background: #f97316;
  color: white;
}

.drum-pad.orange:hover {
  background: #ea580c;
  transform: translateY(-2px);
}

.drum-pad.yellow {
  background: #eab308;
  color: white;
}

.drum-pad.yellow:hover {
  background: #ca8a04;
  transform: translateY(-2px);
}

.drum-pad.pressed {
  transform: scale(0.95) !important;
}

.drum-pad.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.pad-label {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}

.sample-counter {
  font-size: 0.85rem;
  opacity: 0.9;
  font-weight: 500;
}

.info-text {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>

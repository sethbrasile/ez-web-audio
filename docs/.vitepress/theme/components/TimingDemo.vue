<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const error = ref('')
const countdownActive = ref(false)
const countdownValue = ref(1.0)
const timelineNotes = ref([false, false, false])
const sequencePlaying = ref(false)
const chordPlaying = ref(false)

let lib: any = null
let rafId: number | null = null
let timeouts: number[] = []
// clearTimeout from the audioContextAwareTimeout instance (set after first audio init)
let acClearTimeout: ((id: number) => void) | null = null

async function initIfNeeded() {
  if (!lib) {
    lib = await import('ez-web-audio')
  }
}

async function playNow() {
  try {
    error.value = ''
    await initIfNeeded()
    const sound = await lib.createSound('/ez-web-audio/audio/click.mp3')
    sound.play()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
  }
}

async function playDelayed() {
  try {
    error.value = ''
    await initIfNeeded()
    const sound = await lib.createSound('/ez-web-audio/audio/click.mp3')
    const ctx = await lib.getAudioContext()
    const startTime = ctx.currentTime
    const targetTime = startTime + 1

    sound.playIn(1)
    countdownActive.value = true
    countdownValue.value = 1.0

    function updateCountdown() {
      const remaining = targetTime - ctx.currentTime
      if (remaining <= 0) {
        countdownValue.value = 0
        countdownActive.value = false
        rafId = null
        return
      }
      countdownValue.value = remaining
      rafId = requestAnimationFrame(updateCountdown)
    }
    rafId = requestAnimationFrame(updateCountdown)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sound'
    countdownActive.value = false
  }
}

async function playSequence() {
  try {
    error.value = ''
    sequencePlaying.value = true
    await initIfNeeded()
    const ctx = await lib.getAudioContext()
    const now = ctx.currentTime

    const s1 = await lib.createSound('/ez-web-audio/audio/click.mp3')
    const s2 = await lib.createSound('/ez-web-audio/audio/Db5.mp3')
    const s3 = await lib.createSound('/ez-web-audio/audio/Eb5.mp3')

    s1.playAt(now + 0.0)
    s2.playAt(now + 0.5)
    s3.playAt(now + 1.0)

    // Use audioContext-aware setTimeout to keep visual sync with audio clock
    const { setTimeout: acSetTimeout, clearTimeout: acClearTimeoutFn } = lib.audioContextAwareTimeout(ctx)
    acClearTimeout = acClearTimeoutFn

    // Visual feedback synchronized to audio clock
    timelineNotes.value = [true, false, false]

    const t1 = acSetTimeout(() => {
      timelineNotes.value = [true, true, false]
    }, 500)
    timeouts.push(t1)

    const t2 = acSetTimeout(() => {
      timelineNotes.value = [true, true, true]
    }, 1000)
    timeouts.push(t2)

    const t3 = acSetTimeout(() => {
      timelineNotes.value = [false, false, false]
      sequencePlaying.value = false
    }, 1500)
    timeouts.push(t3)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play sequence'
    sequencePlaying.value = false
  }
}

async function playChord() {
  try {
    error.value = ''
    chordPlaying.value = true
    await initIfNeeded()
    const ctx = await lib.getAudioContext()
    const now = ctx.currentTime

    // C major chord (C4, E4, G4)
    const c = await lib.createOscillator({ frequency: 261.63, type: 'triangle' })
    const e = await lib.createOscillator({ frequency: 329.63, type: 'triangle' })
    const g = await lib.createOscillator({ frequency: 392.00, type: 'triangle' })

    const oscillators = [c, e, g]
    oscillators.forEach((osc) => {
      osc.changeGainTo(0.2)
      osc.playAt(now)
    })

    // Use audioContext-aware setTimeout to keep visual sync with audio clock
    const { setTimeout: acSetTimeout, clearTimeout: acClearTimeoutFn } = lib.audioContextAwareTimeout(ctx)
    acClearTimeout = acClearTimeoutFn

    const t = acSetTimeout(() => {
      oscillators.forEach((osc) => {
        try { osc.stop() }
        catch {}
      })
      chordPlaying.value = false
    }, 1000)
    timeouts.push(t)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play chord'
    chordPlaying.value = false
  }
}

onUnmounted(() => {
  // Cancel any active RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  // Clear all timeouts using the audioContext-aware clearTimeout when available
  const clearFn = acClearTimeout ?? clearTimeout
  timeouts.forEach(clearFn)
  timeouts = []
})
</script>

<template>
  <div class="timing-demo">
    <!-- Section 1: Play Now -->
    <section class="demo-section">
      <h3>1. Play Now</h3>
      <p>Immediate playback with <code>play()</code></p>
      <button class="demo-btn" @click="playNow">
        Play Click
      </button>
    </section>

    <hr class="section-divider">

    <!-- Section 2: Play In 1 Second -->
    <section class="demo-section">
      <h3>2. Play In 1 Second</h3>
      <p>Delayed playback with <code>playIn(seconds)</code></p>
      <button :disabled="countdownActive" class="demo-btn" @click="playDelayed">
        Play in 1 Second
      </button>
      <div v-if="countdownActive" class="countdown">
        <div class="countdown-timer">
          {{ countdownValue.toFixed(2) }}s
        </div>
        <div class="countdown-bar">
          <div class="countdown-progress" :style="{ width: `${countdownValue * 100}%` }" />
        </div>
      </div>
    </section>

    <hr class="section-divider">

    <!-- Section 3: Play 3 Notes -->
    <section class="demo-section">
      <h3>3. Schedule 3 Notes</h3>
      <p>Precise timing with <code>playAt(audioContext.currentTime + offset)</code></p>
      <button :disabled="sequencePlaying" class="demo-btn" @click="playSequence">
        Play Sequence
      </button>
      <div class="timeline">
        <div
          v-for="(active, i) in timelineNotes"
          :key="i"
          class="timeline-marker"
          :class="{ active }"
        >
          <div class="marker-circle" />
          <div class="marker-label">
            {{ i * 0.5 }}s
          </div>
        </div>
      </div>
    </section>

    <hr class="section-divider">

    <!-- Section 4: Play a Chord -->
    <section class="demo-section">
      <h3>4. Perfect Sync</h3>
      <p>Multiple sounds starting at exact same time with <code>playAt()</code></p>
      <button :disabled="chordPlaying" class="demo-btn" @click="playChord">
        Play C Major Chord
      </button>
      <div v-if="chordPlaying" class="chord-visual">
        <div class="note-indicator">
          C
        </div>
        <div class="note-indicator">
          E
        </div>
        <div class="note-indicator">
          G
        </div>
      </div>
    </section>

    <div class="status-bar">
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.timing-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--vp-c-bg-soft);
}

.demo-section {
  margin: 1rem 0;
}

.demo-section h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}

.demo-section p {
  margin: 0 0 1rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.demo-section p code {
  background: var(--vp-c-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.demo-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.demo-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.demo-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.section-divider {
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  margin: 1.5rem 0;
}

/* Countdown visual */
.countdown {
  margin-top: 1rem;
}

.countdown-timer {
  font-size: 2rem;
  font-weight: 700;
  color: var(--vp-c-brand);
  margin-bottom: 0.5rem;
}

.countdown-bar {
  width: 100%;
  height: 8px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  overflow: hidden;
}

.countdown-progress {
  height: 100%;
  background: var(--vp-c-brand);
  transition: width 0.05s linear;
}

/* Timeline visual */
.timeline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 1;
}

.marker-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.timeline-marker.active .marker-circle {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 10px var(--vp-c-brand);
}

.marker-label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
}

/* Chord visual */
.chord-visual {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: center;
}

.note-indicator {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--vp-c-brand);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.status-bar {
  min-height: 1.5rem;
  margin-top: 0.75rem;
}

.error {
  color: var(--vp-c-danger);
  padding: 0.75rem;
  background: var(--vp-c-danger-soft);
  border-radius: 6px;
  font-size: 0.9rem;
}
</style>

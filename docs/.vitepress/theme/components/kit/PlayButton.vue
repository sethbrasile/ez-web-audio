<script setup lang="ts">
withDefaults(defineProps<{
  playing?: boolean
  loading?: boolean
  disabled?: boolean
  label?: string
  playingLabel?: string
  loadingLabel?: string
}>(), {
  playing: false,
  loading: false,
  disabled: false,
  label: 'Play',
  playingLabel: 'Stop',
  loadingLabel: 'Loading…',
})

defineEmits<{
  click: [e: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="ewa-play-btn play-btn"
    :class="{ 'ewa-play-btn--playing': playing, 'ewa-play-btn--loading': loading }"
    :disabled="disabled || loading"
    :aria-pressed="playing"
    @click="$emit('click', $event)"
  >
    <span class="ewa-play-btn__icon" aria-hidden="true">
      <svg v-if="!playing" width="12" height="14" viewBox="0 0 12 14">
        <path d="M0 0 L12 7 L0 14 Z" fill="currentColor" />
      </svg>
      <svg v-else width="11" height="11" viewBox="0 0 11 11">
        <rect width="11" height="11" rx="2" fill="currentColor" />
      </svg>
    </span>
    <span v-if="playing" class="ewa-live-dot" aria-hidden="true" />
    <!-- Ghost layers reserve the widest label's width via ::before content so
         the button never resizes on state flips — pseudo-element text stays out
         of textContent (E2E reads it) and the accessibility tree. -->
    <span class="ewa-play-btn__label">
      <span class="ewa-play-btn__layer">{{ loading ? loadingLabel : (playing ? playingLabel : label) }}</span>
      <span class="ewa-play-btn__layer ewa-play-btn__ghost" aria-hidden="true" :data-label="label" />
      <span class="ewa-play-btn__layer ewa-play-btn__ghost" aria-hidden="true" :data-label="playingLabel" />
      <span class="ewa-play-btn__layer ewa-play-btn__ghost" aria-hidden="true" :data-label="loadingLabel" />
    </span>
  </button>
</template>

<style scoped>
.ewa-play-btn {
  position: relative;
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  transition: background 0.18s, transform 0.1s;
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
}

.ewa-play-btn__icon {
  width: 12px;
  height: 14px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ewa-play-btn__label {
  display: inline-grid;
}

.ewa-play-btn__layer {
  grid-area: 1 / 1;
  white-space: nowrap;
  text-align: center;
}

.ewa-play-btn__ghost {
  visibility: hidden;
}

.ewa-play-btn__ghost::before {
  content: attr(data-label);
}

.ewa-play-btn:hover:not(:disabled) {
  background: var(--ewa-accent-strong);
  transform: translateY(-1px);
}

.ewa-play-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.ewa-play-btn--playing {
  background: var(--ewa-danger);
  color: #fff;
}

.ewa-play-btn--playing:hover:not(:disabled) {
  background: var(--ewa-danger);
}

.ewa-play-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ewa-play-btn--loading:disabled {
  cursor: wait;
}

.ewa-play-btn:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}

.ewa-live-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: ewa-blink 1.2s infinite;
}
</style>

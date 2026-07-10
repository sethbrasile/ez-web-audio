<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  waves?: string[]
  small?: boolean
  label?: string
  disabled?: boolean
}>(), {
  waves: () => ['sine', 'square', 'sawtooth', 'triangle'],
  small: false,
  label: 'Waveform',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const WAVE_PATHS: Record<string, string> = {
  sine: 'M2 12 Q7 2 12 12 T22 12 T32 12 T38 12',
  square: 'M2 18 V6 H12 V18 H22 V6 H32 V18 H38',
  sawtooth: 'M2 18 L12 6 L12 18 L22 6 L22 18 L32 6 L32 18',
  triangle: 'M2 18 L7 6 L12 18 L17 6 L22 18 L27 6 L32 18 L37 6',
}

const waveOptions = computed(() => props.waves.map(wave => ({
  wave,
  path: WAVE_PATHS[wave],
})))

function select(wave: string) {
  if (props.disabled)
    return
  emit('update:modelValue', wave)
}

function onKeydown(e: KeyboardEvent, index: number) {
  if (props.disabled)
    return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')
    return

  e.preventDefault()
  const count = props.waves.length
  const nextIndex = e.key === 'ArrowRight'
    ? (index + 1) % count
    : (index - 1 + count) % count
  select(props.waves[nextIndex])

  const group = (e.currentTarget as HTMLElement).closest('.ewa-waveform-selector')
  const buttons = group?.querySelectorAll<HTMLButtonElement>('.ewa-waveform-selector__option')
  buttons?.[nextIndex]?.focus()
}
</script>

<template>
  <div
    class="ewa-waveform-selector"
    :class="{ 'ewa-waveform-selector--disabled': disabled, 'ewa-waveform-selector--small': small }"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="(option, index) in waveOptions"
      :key="option.wave"
      type="button"
      class="ewa-waveform-selector__option"
      :class="{ 'ewa-waveform-selector__option--selected': option.wave === modelValue }"
      role="radio"
      :aria-checked="option.wave === modelValue"
      :aria-label="option.wave"
      :tabindex="option.wave === modelValue ? 0 : -1"
      :disabled="disabled"
      @click="select(option.wave)"
      @keydown="onKeydown($event, index)"
    >
      <svg v-if="option.path" width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
        <path :d="option.path" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span v-else class="ewa-waveform-selector__fallback">{{ option.wave }}</span>
    </button>
  </div>
</template>

<style scoped>
.ewa-waveform-selector {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ewa-waveform-selector--disabled {
  opacity: 0.55;
}

.ewa-waveform-selector__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 44px;
  padding: 0;
  border-radius: 9px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  color: var(--ewa-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ewa-waveform-selector--small .ewa-waveform-selector__option {
  width: 42px;
  height: 44px;
}

.ewa-waveform-selector--small .ewa-waveform-selector__option svg {
  width: 32px;
  height: 18px;
}

.ewa-waveform-selector--disabled .ewa-waveform-selector__option {
  cursor: not-allowed;
}

.ewa-waveform-selector__option:hover:not(:disabled):not(.ewa-waveform-selector__option--selected) {
  color: var(--ewa-text);
}

.ewa-waveform-selector__option--selected {
  background: var(--ewa-accent-soft);
  border-color: var(--ewa-accent);
  color: var(--ewa-accent-ink);
}

.ewa-waveform-selector__option:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.ewa-waveform-selector__fallback {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  text-transform: uppercase;
}
</style>

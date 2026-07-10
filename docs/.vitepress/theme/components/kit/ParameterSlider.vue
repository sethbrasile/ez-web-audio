<script setup lang="ts">
import { computed } from 'vue'
import { nextId } from './id'

const props = withDefaults(defineProps<{
  label: string
  modelValue: number
  min?: number
  max?: number
  step?: number
  format?: (v: number) => string
  center?: boolean
  disabled?: boolean
  id?: string
}>(), {
  min: 0,
  max: 100,
  step: 1,
  format: (v: number) => String(Math.round(v)),
  center: false,
  disabled: false,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const generatedId = nextId('ewa-slider')
const sliderId = computed(() => props.id ?? generatedId)

const percent = computed(() => {
  const range = props.max - props.min
  if (range <= 0)
    return 0
  return ((props.modelValue - props.min) / range) * 100
})

const fillStyle = computed(() => {
  const pct = percent.value

  if (!props.center)
    return { left: '0%', width: `${pct}%` }

  if (pct < 50)
    return { left: `${pct}%`, right: '50%' }

  if (pct > 50)
    return { left: '50%', width: `${pct - 50}%` }

  return { left: 'calc(50% - 1px)', width: '2px' }
})

const thumbStyle = computed(() => ({ left: `${percent.value}%` }))

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).valueAsNumber
  const stepped = Math.round(raw / props.step) * props.step
  const clamped = Math.min(props.max, Math.max(props.min, stepped))
  const value = Number.isInteger(props.step) ? clamped : Number(clamped.toFixed(4))
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="ewa-slider" :class="{ 'ewa-slider--disabled': disabled }">
    <div class="ewa-slider__header">
      <label :for="sliderId" class="ewa-slider__label">{{ label }}</label>
      <span class="ewa-slider__value">{{ format(modelValue) }}</span>
    </div>

    <div class="ewa-slider__row">
      <input
        :id="sliderId"
        type="range"
        class="ewa-slider__input"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :aria-label="label"
        @input="onInput"
      >
      <div class="ewa-slider__track">
        <span v-if="center" class="ewa-slider__notch" />
        <span class="ewa-slider__fill" :style="fillStyle" />
      </div>
      <span class="ewa-slider__thumb" :style="thumbStyle" />
    </div>
  </div>
</template>

<style scoped>
.ewa-slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ewa-slider--disabled {
  opacity: 0.55;
}

.ewa-slider__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.ewa-slider__label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ewa-text-2);
}

.ewa-slider__value {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  color: var(--ewa-text);
}

.ewa-slider__row {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
}

.ewa-slider__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
  appearance: none;
}

.ewa-slider--disabled .ewa-slider__input {
  cursor: not-allowed;
}

.ewa-slider__track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--ewa-well);
  box-shadow: inset 0 0 0 1px var(--ewa-line);
}

.ewa-slider__notch {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 10px;
  background: var(--ewa-line-2);
  transform: translate(-50%, -50%);
}

.ewa-slider__fill {
  position: absolute;
  top: 0;
  height: 6px;
  border-radius: 999px;
  background: var(--ewa-accent);
}

.ewa-slider__thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ewa-bg);
  border: 2px solid var(--ewa-accent);
  box-shadow: var(--ewa-shadow);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: border-color 0.15s, transform 0.15s;
}

.ewa-slider:not(.ewa-slider--disabled) .ewa-slider__row:hover .ewa-slider__thumb {
  border-color: var(--ewa-accent-strong);
  transform: translate(-50%, -50%) scale(1.1);
}

.ewa-slider__input:focus-visible ~ .ewa-slider__thumb {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}
</style>

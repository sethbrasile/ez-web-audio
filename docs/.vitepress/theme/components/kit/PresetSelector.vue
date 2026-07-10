<script setup lang="ts">
import { computed } from 'vue'

interface PresetOption {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  options: (PresetOption | string)[]
  modelValue: string
  label?: string
  disabled?: boolean
}>(), {
  label: 'Preset',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const normalizedOptions = computed<PresetOption[]>(() =>
  props.options.map(option => typeof option === 'string' ? { label: option, value: option } : option),
)

function select(value: string) {
  if (props.disabled)
    return
  emit('update:modelValue', value)
}

function onKeydown(e: KeyboardEvent, index: number) {
  if (props.disabled)
    return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')
    return

  e.preventDefault()
  const count = normalizedOptions.value.length
  const nextIndex = e.key === 'ArrowRight'
    ? (index + 1) % count
    : (index - 1 + count) % count
  const next = normalizedOptions.value[nextIndex]
  select(next.value)

  const group = (e.currentTarget as HTMLElement).closest('.ewa-preset-selector')
  const buttons = group?.querySelectorAll<HTMLButtonElement>('.ewa-preset-selector__option')
  buttons?.[nextIndex]?.focus()
}
</script>

<template>
  <div
    class="ewa-preset-selector"
    :class="{ 'ewa-preset-selector--disabled': disabled }"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="(option, index) in normalizedOptions"
      :key="option.value"
      type="button"
      class="ewa-preset-selector__option"
      :class="{ 'ewa-preset-selector__option--selected': option.value === modelValue }"
      role="radio"
      :aria-checked="option.value === modelValue"
      :tabindex="option.value === modelValue ? 0 : -1"
      :disabled="disabled"
      @click="select(option.value)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.ewa-preset-selector {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
}

.ewa-preset-selector--disabled {
  opacity: 0.55;
}

.ewa-preset-selector__option {
  height: 36px;
  padding: 0 16px;
  border-radius: 7px;
  border: none;
  font-weight: 600;
  font-size: 13px;
  font-family: var(--vp-font-family-base);
  background: transparent;
  color: var(--ewa-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.ewa-preset-selector--disabled .ewa-preset-selector__option {
  cursor: not-allowed;
}

.ewa-preset-selector__option:hover:not(:disabled):not(.ewa-preset-selector__option--selected) {
  color: var(--ewa-text);
  background: var(--ewa-accent-soft);
}

.ewa-preset-selector__option--selected {
  background: var(--ewa-accent);
  color: var(--ewa-on-accent);
  box-shadow: var(--ewa-shadow);
}

.ewa-preset-selector__option:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}
</style>

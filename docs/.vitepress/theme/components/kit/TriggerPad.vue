<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  sublabel?: string
  color?: string
  disabled?: boolean
  active?: boolean
}>(), {
  sublabel: undefined,
  color: 'var(--ewa-accent)',
  disabled: false,
  active: false,
})

const emit = defineEmits<{
  trigger: []
}>()

const flashing = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | undefined

function fire() {
  emit('trigger')
  flashing.value = true
  if (flashTimeout)
    clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => {
    flashing.value = false
  }, 180)
}

function onPointerdown() {
  fire()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== ' ' && e.key !== 'Enter')
    return
  if (e.repeat)
    return
  e.preventDefault()
  fire()
}

onBeforeUnmount(() => {
  if (flashTimeout)
    clearTimeout(flashTimeout)
})
</script>

<template>
  <button
    type="button"
    class="ewa-trigger-pad"
    :class="{ 'ewa-trigger-pad--flashing': flashing || active }"
    :style="{ background: props.color }"
    :disabled="disabled"
    @pointerdown="onPointerdown"
    @keydown="onKeydown"
  >
    <span class="ewa-trigger-pad__label">{{ label }}</span>
    <span v-if="sublabel" class="ewa-trigger-pad__sublabel">{{ sublabel }}</span>
  </button>
</template>

<style scoped>
.ewa-trigger-pad {
  min-width: 64px;
  min-height: 56px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: var(--vp-font-family-base);
  font-weight: 600;
  font-size: 13px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transition: transform 0.06s, box-shadow 0.12s;
}

.ewa-trigger-pad:hover:not(:disabled) {
  filter: brightness(1.06);
}

.ewa-trigger-pad--flashing {
  transform: translateY(2px) scale(0.98);
  box-shadow: 0 0 0 2px var(--ewa-bg), 0 0 14px 2px v-bind('props.color');
}

.ewa-trigger-pad:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
}

.ewa-trigger-pad:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ewa-trigger-pad__sublabel {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  opacity: 0.85;
}
</style>

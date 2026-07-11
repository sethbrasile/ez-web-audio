<script setup lang="ts">
import { computed, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  modelValue: number
  min?: number
  max?: number
  step?: number
  format?: (v: number) => string
  disabled?: boolean
  size?: number
}>(), {
  min: 0,
  max: 100,
  step: 1,
  format: (v: number) => String(Math.round(v)),
  disabled: false,
  size: 64,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const START_ANGLE = -135
const END_ANGLE = 135
const STROKE_WIDTH = 6

const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - STROKE_WIDTH / 2 - 2)
const hitPadding = computed(() => Math.max(0, (44 - props.size) / 2))

function snap(v: number) {
  const stepped = Math.round(v / props.step) * props.step
  const clamped = Math.min(props.max, Math.max(props.min, stepped))
  return Number.isInteger(props.step) ? clamped : Number(clamped.toFixed(4))
}

function emitValue(v: number) {
  emit('update:modelValue', snap(v))
}

const valueAngle = computed(() => {
  const range = props.max - props.min
  const t = range <= 0 ? 0 : (props.modelValue - props.min) / range
  return START_ANGLE + t * (END_ANGLE - START_ANGLE)
})

function pointOnRing(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: center.value + r * Math.sin(rad),
    y: center.value - r * Math.cos(rad),
  }
}

function describeArc(startAngle: number, endAngle: number) {
  if (endAngle <= startAngle)
    return ''
  const start = pointOnRing(startAngle, radius.value)
  const end = pointOnRing(endAngle, radius.value)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${radius.value} ${radius.value} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

const trackPath = computed(() => describeArc(START_ANGLE, END_ANGLE))
const valuePath = computed(() => describeArc(START_ANGLE, valueAngle.value))

const indicatorInner = computed(() => pointOnRing(valueAngle.value, radius.value * 0.3))
const indicatorOuter = computed(() => pointOnRing(valueAngle.value, radius.value * 0.9))

let dragStartY = 0
let dragStartValue = 0
let dragging = false

function onPointerMove(e: PointerEvent) {
  if (!dragging)
    return
  const delta = ((dragStartY - e.clientY) * (props.max - props.min)) / 160
  emitValue(dragStartValue + delta)
}

function onPointerUp() {
  dragging = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled)
    return
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  dragging = true
  dragStartY = e.clientY
  dragStartValue = props.modelValue
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled)
    return

  let next: number | null = null

  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      next = props.modelValue + props.step
      break
    case 'ArrowDown':
    case 'ArrowLeft':
      next = props.modelValue - props.step
      break
    case 'Home':
      next = props.min
      break
    case 'End':
      next = props.max
      break
    case 'PageUp':
      next = props.modelValue + props.step * 10
      break
    case 'PageDown':
      next = props.modelValue - props.step * 10
      break
    default:
      return
  }

  e.preventDefault()
  emitValue(next)
}

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})
</script>

<template>
  <div class="ewa-knob" :class="{ 'ewa-knob--disabled': disabled }">
    <div
      class="ewa-knob__control"
      role="slider"
      :tabindex="disabled ? -1 : 0"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      :aria-valuetext="format(modelValue)"
      :aria-label="label"
      :aria-disabled="disabled"
      :style="{ padding: `${hitPadding}px` }"
      @pointerdown="onPointerDown"
      @keydown="onKeyDown"
    >
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <path class="ewa-knob__track" :d="trackPath" :stroke-width="STROKE_WIDTH" fill="none" stroke-linecap="round" />
        <path v-if="valuePath" class="ewa-knob__value" :d="valuePath" :stroke-width="STROKE_WIDTH" fill="none" stroke-linecap="round" />
        <line
          class="ewa-knob__indicator"
          :x1="indicatorInner.x"
          :y1="indicatorInner.y"
          :x2="indicatorOuter.x"
          :y2="indicatorOuter.y"
          stroke-linecap="round"
        />
        <text class="ewa-knob__text" :x="center" :y="center" text-anchor="middle" dominant-baseline="central">{{ format(modelValue) }}</text>
      </svg>
    </div>
    <div class="ewa-knob__label">
      {{ label }}
    </div>
  </div>
</template>

<style scoped>
.ewa-knob {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ewa-knob--disabled {
  opacity: 0.55;
}

.ewa-knob__control {
  display: inline-flex;
  box-sizing: content-box;
  border-radius: 50%;
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
}

.ewa-knob--disabled .ewa-knob__control {
  cursor: not-allowed;
}

.ewa-knob__control:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 3px;
  border-radius: 50%;
}

.ewa-knob__track {
  /* line-2 (not well): the well tone blends into panel backgrounds, making
     the knob's range invisible when the value arc is at minimum */
  stroke: var(--ewa-line-2);
}

.ewa-knob__value {
  stroke: var(--ewa-accent);
}

.ewa-knob__indicator {
  stroke: var(--ewa-text);
  stroke-width: 2;
}

.ewa-knob__text {
  fill: var(--ewa-text);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.ewa-knob__label {
  font-size: 0.8rem;
  color: var(--ewa-text-2);
  text-align: center;
}
</style>

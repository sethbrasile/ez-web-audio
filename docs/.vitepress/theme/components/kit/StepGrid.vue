<script setup lang="ts">
import { computed } from 'vue'

interface StepGridLane {
  name: string
  color?: string
  cells: boolean[]
  muted?: boolean
}

const props = withDefaults(defineProps<{
  lanes: StepGridLane[]
  currentStep?: number
  playing?: boolean
  readonly?: boolean
  showMutes?: boolean
  stepsPerBeat?: number
}>(), {
  currentStep: -1,
  playing: false,
  readonly: false,
  showMutes: true,
  stepsPerBeat: 4,
})

const emit = defineEmits<{
  toggle: [lane: number, step: number]
  mute: [lane: number]
}>()

const numSteps = computed(() => props.lanes[0]?.cells.length ?? 0)

const gridTemplateColumns = computed(() => `84px repeat(${numSteps.value}, 44px)`)

function stepHeaderLabel(index: number) {
  return index % props.stepsPerBeat === 0
    ? String(index / props.stepsPerBeat + 1)
    : '·'
}

function laneColor(lane: StepGridLane) {
  return lane.color ?? 'var(--ewa-accent)'
}

function toggle(laneIndex: number, stepIndex: number) {
  if (props.readonly)
    return
  emit('toggle', laneIndex, stepIndex)
}

function mute(laneIndex: number) {
  if (props.readonly)
    return
  emit('mute', laneIndex)
}

function isCurrentStep(stepIndex: number) {
  return props.playing && stepIndex === props.currentStep
}
</script>

<template>
  <div class="ewa-step-grid" :class="{ 'ewa-step-grid--readonly': readonly }">
    <div class="ewa-step-grid__scroll">
      <div class="ewa-step-grid__inner" :style="{ gridTemplateColumns }">
        <div class="ewa-step-grid__header-spacer" />
        <div
          v-for="stepIndex in numSteps"
          :key="`head-${stepIndex - 1}`"
          class="ewa-step-grid__step-header"
          :class="{ 'ewa-step-grid__step-header--beat': (stepIndex - 1) % stepsPerBeat === 0 }"
        >
          {{ stepHeaderLabel(stepIndex - 1) }}
        </div>

        <template v-for="(lane, laneIndex) in lanes" :key="lane.name">
          <div
            class="ewa-step-grid__label"
            :class="{ 'ewa-step-grid__label--muted': lane.muted }"
            :style="{ '--lane-color': laneColor(lane) }"
          >
            <span class="ewa-step-grid__label-name">{{ lane.name }}</span>
            <button
              v-if="showMutes && !readonly"
              type="button"
              class="ewa-step-grid__mute"
              :class="{ 'ewa-step-grid__mute--active': lane.muted }"
              :aria-pressed="!!lane.muted"
              :aria-label="`Mute ${lane.name}`"
              @click="mute(laneIndex)"
            >
              M
            </button>
          </div>

          <button
            v-for="(active, stepIndex) in lane.cells"
            :key="`${lane.name}-${stepIndex}`"
            type="button"
            class="ewa-step-grid__cell"
            :class="{
              'ewa-step-grid__cell--active': active,
              'ewa-step-grid__cell--muted': lane.muted,
              'ewa-step-grid__cell--current': isCurrentStep(stepIndex),
              'ewa-step-grid__cell--readonly': readonly,
            }"
            :style="{ '--lane-color': laneColor(lane) }"
            :disabled="readonly"
            :aria-disabled="readonly"
            :aria-pressed="active"
            :aria-label="`Toggle ${lane.name} step ${stepIndex + 1}`"
            @click="toggle(laneIndex, stepIndex)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ewa-step-grid__scroll {
  overflow-x: auto;
}

.ewa-step-grid__inner {
  display: grid;
  gap: 4px;
  width: max-content;
}

.ewa-step-grid__header-spacer {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--ewa-panel);
}

.ewa-step-grid__step-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-align: center;
  color: var(--ewa-text-3);
}

.ewa-step-grid__step-header--beat {
  color: var(--ewa-text-2);
}

.ewa-step-grid__label {
  position: sticky;
  left: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding-right: 6px;
  background: var(--ewa-panel);
}

.ewa-step-grid__label-name {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lane-color, var(--ewa-accent));
}

.ewa-step-grid__label--muted .ewa-step-grid__label-name {
  color: var(--ewa-text-3);
}

.ewa-step-grid__mute {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 44px;
  padding: 10px 0;
  margin: -10px 0;
  border-radius: 6px;
  border: 1px solid var(--ewa-line-2);
  background: transparent;
  color: var(--ewa-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ewa-step-grid__mute--active {
  background: var(--ewa-danger);
  border-color: var(--ewa-danger);
  color: #fff;
}

.ewa-step-grid__mute:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.ewa-step-grid__cell {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--ewa-line);
  background: var(--ewa-well);
  cursor: pointer;
  transition: transform 0.08s, box-shadow 0.12s, background 0.12s;
}

.ewa-step-grid__cell--active {
  background: var(--lane-color, var(--ewa-accent));
  border-color: var(--lane-color, var(--ewa-accent));
}

.ewa-step-grid__cell--active.ewa-step-grid__cell--muted {
  opacity: 0.35;
}

.ewa-step-grid__cell--current.ewa-step-grid__cell--active {
  box-shadow: 0 0 0 2px var(--ewa-bg), 0 0 14px 2px var(--lane-color, var(--ewa-accent));
  transform: scale(1.06);
}

.ewa-step-grid__cell--current:not(.ewa-step-grid__cell--active) {
  box-shadow: inset 0 0 0 2px var(--ewa-accent-soft);
}

.ewa-step-grid__cell:not(:disabled):hover {
  border-color: var(--ewa-accent);
  transform: scale(1.05);
}

.ewa-step-grid__cell:focus-visible {
  outline: 2px solid var(--ewa-accent);
  outline-offset: 2px;
}

.ewa-step-grid__cell--readonly {
  cursor: default;
  opacity: 1;
}

.ewa-step-grid__cell--readonly:hover {
  border-color: var(--ewa-line);
  transform: none;
}

.ewa-step-grid--readonly .ewa-step-grid__cell--active.ewa-step-grid__cell--muted {
  opacity: 0.35;
}
</style>

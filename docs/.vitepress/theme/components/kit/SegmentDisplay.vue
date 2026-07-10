<script setup lang="ts">
withDefaults(defineProps<{
  value: string
  caption?: string
  size?: 'md' | 'lg'
  timer?: boolean
}>(), {
  caption: undefined,
  size: 'md',
  timer: false,
})
</script>

<template>
  <div class="ewa-segment" :class="`ewa-segment--${size}`" aria-live="off" :role="timer ? 'timer' : undefined">
    <span class="ewa-segment__value">{{ value }}</span>
    <span v-if="caption" class="ewa-segment__caption">{{ caption }}</span>
  </div>
</template>

<style scoped>
.ewa-segment {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  background: var(--ewa-well);
  border: 1px solid var(--ewa-line);
  border-radius: 10px;
  padding: 10px 18px;
}

.ewa-segment__value {
  font-family: var(--vp-font-family-mono);
  font-weight: 500;
  color: var(--ewa-accent-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}

.ewa-segment--md .ewa-segment__value {
  font-size: 20px;
}

.ewa-segment--lg .ewa-segment__value {
  font-size: 28px;
}

.ewa-segment__caption {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ewa-text-3);
  margin-top: 4px;
}
</style>

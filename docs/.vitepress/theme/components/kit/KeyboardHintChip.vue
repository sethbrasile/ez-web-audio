<script setup lang="ts">
</script>

<template>
  <span class="ewa-kbd-hint">
    <slot />
  </span>
</template>

<style scoped>
.ewa-kbd-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--ewa-text-3);
}

.ewa-kbd-hint :deep(kbd) {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--ewa-bg);
  border: 1px solid var(--ewa-line-2);
  color: var(--ewa-text-2);
}
</style>

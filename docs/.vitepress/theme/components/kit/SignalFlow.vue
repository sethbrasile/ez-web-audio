<script setup lang="ts">
import { computed } from 'vue'

interface SignalFlowNode {
  label: string
  color?: string
  active?: boolean
}

const props = defineProps<{
  nodes: SignalFlowNode[]
}>()

const ariaLabel = computed(() => `Signal flow: ${props.nodes.map(node => node.label).join(' → ')}`)

function borderColor(node: SignalFlowNode): string {
  if (node.active)
    return 'var(--ewa-accent)'
  return node.color ?? 'var(--ewa-line-2)'
}
</script>

<template>
  <div class="ewa-signal-flow" role="img" :aria-label="ariaLabel">
    <template v-for="(node, index) in nodes" :key="index">
      <span
        class="ewa-signal-flow__node"
        :class="{ 'ewa-signal-flow__node--active': node.active }"
        :style="{ borderColor: borderColor(node) }"
      >
        {{ node.label }}
      </span>
      <span v-if="index < nodes.length - 1" class="ewa-signal-flow__connector" aria-hidden="true">→</span>
    </template>
  </div>
</template>

<style scoped>
.ewa-signal-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: thin;
}

.ewa-signal-flow__node {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--ewa-panel);
  border: 1.5px solid var(--ewa-line-2);
  color: var(--ewa-text);
}

.ewa-signal-flow__node--active {
  background: var(--ewa-accent-soft);
  border-color: var(--ewa-accent);
  color: var(--ewa-accent-ink);
}

.ewa-signal-flow__connector {
  flex-shrink: 0;
  color: var(--ewa-text-3);
}
</style>

<script setup lang="ts">
defineProps<{
  takeaway?: string
  error?: string
}>()
</script>

<template>
  <div class="ewa-demo-frame">
    <p v-if="takeaway" class="ewa-takeaway">
      {{ takeaway }}
    </p>

    <slot />

    <div v-if="error || $slots.status" class="ewa-status">
      <p v-if="error" class="ewa-error" role="alert">
        {{ error }}
      </p>
      <slot name="status" />
    </div>
  </div>
</template>

<style scoped>
.ewa-demo-frame {
  background: var(--ewa-panel);
  border: 1px solid var(--ewa-line);
  border-radius: 12px;
  padding: 20px;
  margin: 1rem 0;
}

@media (max-width: 480px) {
  .ewa-demo-frame {
    padding: 16px;
  }
}

.ewa-takeaway {
  color: var(--ewa-accent-ink);
  font-weight: 600;
  margin: 0 0 16px;
  padding-left: 10px;
  border-left: 3px solid var(--ewa-accent);
  border-radius: 3px;
}

.ewa-status {
  margin-top: 12px;
}

.ewa-error {
  color: var(--ewa-danger);
  font-size: 0.9rem;
  margin: 0;
}
</style>

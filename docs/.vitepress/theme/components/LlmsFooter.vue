<script setup lang="ts">
import { withBase } from 'vitepress'
</script>

<template>
  <div class="llms-footer">
    AI assistants: full documentation available at
    <a :href="withBase('/llms.txt')">/llms.txt</a> (index) and
    <a :href="withBase('/llms-full.txt')">/llms-full.txt</a>
    (__LLMS_FULL_SIZE__, complete).
  </div>
</template>

<style scoped>
.llms-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}

.llms-footer a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.llms-footer a:hover {
  text-decoration: underline;
}
</style>

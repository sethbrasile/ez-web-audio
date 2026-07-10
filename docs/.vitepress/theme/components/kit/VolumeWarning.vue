<template>
  <aside class="ewa-volume-warning" role="note">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M3 10a6 6 0 0 1 12 0" />
      <rect x="1.5" y="9.5" width="3" height="5" rx="1.2" />
      <rect x="13.5" y="9.5" width="3" height="5" rx="1.2" />
    </svg>
    <p class="ewa-volume-warning__body">
      <slot>
        <strong class="ewa-volume-warning__lead">Headphone check.</strong> This demo generates live sound. Start with your volume low — synthesized tones can be louder than they look.
      </slot>
    </p>
  </aside>
</template>

<style scoped>
.ewa-volume-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--ewa-warn-soft);
  border-left: 3px solid var(--ewa-warn-line);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.85rem;
}

.ewa-volume-warning svg {
  flex-shrink: 0;
  color: var(--ewa-warn);
  margin-top: 1px;
}

.ewa-volume-warning__body {
  margin: 0;
  color: var(--ewa-text-2);
}

.ewa-volume-warning__lead {
  color: var(--ewa-warn);
}
</style>

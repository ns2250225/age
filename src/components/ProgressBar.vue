<script setup lang="ts">
defineProps<{ value: number; label?: string }>()
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-label="label ?? '答题进度'"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(value * 100)"
  >
    <div class="progress__fill" :style="{ width: `${Math.max(4, value * 100)}%` }" />
  </div>
</template>

<style scoped>
.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transition: width 0.4s ease;
}
</style>

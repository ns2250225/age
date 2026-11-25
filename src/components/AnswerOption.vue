<script setup lang="ts">
defineProps<{
  text: string
  index: number
  selected: boolean
  disabled: boolean
}>()
defineEmits<{ choose: [] }>()

const MARKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
</script>

<template>
  <button
    type="button"
    class="option"
    :class="{ 'option--selected': selected, 'option--dim': disabled && !selected }"
    :disabled="disabled"
    @click="$emit('choose')"
  >
    <span class="option__mark">{{ MARKS[index] ?? '·' }}</span>
    <span class="option__text">{{ text }}</span>
  </button>
</template>

<style scoped>
.option {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-align: left;
  background: var(--card);
  border-radius: var(--radius-sm);
  box-shadow:
    inset 0 0 0 1.5px var(--line),
    0 2px 8px rgba(82, 111, 145, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

.option:disabled {
  opacity: 1;
  cursor: default;
}

.option:hover:not(:disabled) {
  box-shadow:
    inset 0 0 0 1.5px var(--primary),
    0 4px 12px rgba(82, 111, 145, 0.12);
}

.option:active:not(:disabled) {
  transform: scale(0.98);
}

.option__mark {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.option__text {
  font-size: 16px;
  line-height: 1.45;
}

/* 选中时的轻微缩放动画 */
.option--selected {
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 2px var(--primary);
  animation: pop 0.35s ease;
}

.option--selected .option__mark {
  background: var(--primary);
  color: #fff;
}

.option--dim {
  opacity: 0.45 !important;
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.035);
  }
  100% {
    transform: scale(1);
  }
}
</style>

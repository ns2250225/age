<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { playSound } from '@/utils/sound'

const store = useGameStore()

function toggle() {
  store.soundOn = !store.soundOn
  if (store.soundOn) playSound('select')
}
</script>

<template>
  <button
    class="sound"
    type="button"
    :aria-pressed="store.soundOn"
    :aria-label="store.soundOn ? '关闭声音' : '打开声音'"
    :title="store.soundOn ? '关闭声音' : '打开声音'"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <template v-if="store.soundOn">
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 6a8.5 8.5 0 0 1 0 12" />
      </template>
      <template v-else>
        <path d="M17 9.5l5 5M22 9.5l-5 5" />
      </template>
    </svg>
  </button>
</template>

<style scoped>
.sound {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  color: var(--primary);
  box-shadow: var(--shadow);
  flex: none;
}

.sound[aria-pressed='false'] {
  color: var(--text-2);
}
</style>

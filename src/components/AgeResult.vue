<script setup lang="ts">
import type { GameResult } from '@/types/result'

defineProps<{ result: GameResult }>()
</script>

<template>
  <section class="age card" :class="`age--${result.rating}`">
    <span class="age__badge">{{ result.ratingTitle }}</span>

    <div class="age__numbers">
      <div class="age__col">
        <span class="age__label">我的猜测</span>
        <span class="age__value">{{ result.guess }}<small>岁</small></span>
      </div>
      <div class="age__sep" aria-hidden="true" />
      <div class="age__col">
        <span class="age__label">你的真实年龄</span>
        <span v-if="result.actualAge !== null" class="age__value">{{ result.actualAge }}<small>岁</small></span>
        <span v-else class="age__value age__value--secret">保密</span>
      </div>
    </div>

    <p class="age__text">{{ result.ratingText }}</p>
    <p v-if="result.diff !== null && result.diff !== 0" class="muted">
      我把你猜{{ result.diff > 0 ? '大' : '小' }}了 {{ Math.abs(result.diff) }} 岁。
    </p>
  </section>
</template>

<style scoped>
.age {
  text-align: center;
  padding-top: 26px;
  border-top: 6px solid var(--primary);
}

.age--exact,
.age--close {
  border-top-color: var(--success);
}

.age--near {
  border-top-color: var(--accent);
}

.age__badge {
  display: inline-block;
  padding: 5px 18px;
  border-radius: 999px;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: var(--primary);
}

.age--exact .age__badge,
.age--close .age__badge {
  background: var(--success);
}

.age--near .age__badge {
  background: #c9944f;
}

.age__numbers {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 20px;
  margin: 20px 0 14px;
}

.age__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.age__sep {
  width: 1px;
  background: var(--line);
}

.age__label {
  font-size: 13px;
  color: var(--text-2);
}

.age__value {
  font-family: var(--font-serif);
  font-size: 54px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.age__value small {
  font-size: 18px;
  margin-left: 2px;
}

.age__value--secret {
  font-size: 30px;
  line-height: 62px;
  color: var(--text-2);
}

.age__text {
  font-size: 15px;
  margin-bottom: 4px;
}
</style>

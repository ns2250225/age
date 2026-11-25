<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '@/components/ProgressBar.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import SoundToggle from '@/components/SoundToggle.vue'
import { useGameStore } from '@/stores/game'
import { UNKNOWN_OPTION_ID } from '@/types/question'
import { playSound } from '@/utils/sound'

const store = useGameStore()
const router = useRouter()

/** 本题已选中的选项；非空期间所有选项锁定，防止重复提交 */
const picked = ref<string | null>(null)
let timer: number | undefined

function choose(optionId: string) {
  if (picked.value !== null || !store.currentQuestion) return
  picked.value = optionId
  playSound(optionId === UNKNOWN_OPTION_ID ? 'soft' : 'select')
  // 留出选中动画的时间，再自动进入下一题
  timer = window.setTimeout(() => {
    store.answer(optionId)
    picked.value = null
  }, 420)
}

function quit() {
  if (window.confirm('确定要退出吗？当前进度会保留，可以回到首页继续。')) router.push('/')
}

// 满足停止条件后进入最终猜测
watch(
  () => store.phase,
  (phase) => {
    if (phase === 'guessing') router.replace('/guess')
  },
  { immediate: true },
)

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <main class="page game">
    <header class="game__head">
      <button class="game__quit" type="button" aria-label="退出到首页" @click="quit">✕</button>
      <div class="game__status">
        <div class="game__row">
          <span class="game__name">记忆猜年龄</span>
          <span class="game__count">第 <strong>{{ store.questionNumber }}</strong> 题</span>
        </div>
        <ProgressBar :value="store.progress" />
      </div>
      <SoundToggle />
    </header>

    <div class="game__stage">
      <Transition name="fade" mode="out-in">
        <QuestionCard
          v-if="store.currentQuestion"
          :key="store.currentQuestion.id"
          :question="store.currentQuestion"
          :picked="picked"
          @choose="choose"
        />
        <div v-else-if="store.loadError" key="error" class="card game__loading" role="alert">
          <p>{{ store.loadError }}</p>
          <button class="btn btn--primary btn--small" type="button" @click="store.ensureLoaded()">重试</button>
        </div>
        <div v-else key="loading" class="card game__loading">
          <p class="muted">正在翻找你的记忆…</p>
        </div>
      </Transition>
    </div>

    <p class="muted game__tip">
      题数会根据你的回答变化，最少 {{ store.cfg.minQuestions }} 题，最多 {{ store.cfg.maxQuestions }} 题。
    </p>
  </main>
</template>

<style scoped>
.game__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.game__quit {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--text-2);
  font-size: 16px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.game__status {
  flex: 1;
  min-width: 0;
}

.game__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.game__name {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 15px;
}

.game__count {
  font-size: 13px;
  color: var(--text-2);
}

.game__count strong {
  font-size: 17px;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.game__stage {
  flex: 1;
}

.game__loading {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}

.game__tip {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
}
</style>

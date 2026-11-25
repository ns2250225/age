<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SoundToggle from '@/components/SoundToggle.vue'
import { useGameStore } from '@/stores/game'
import { playSound } from '@/utils/sound'

const store = useGameStore()
const router = useRouter()

type Stage = 'thinking' | 'reveal' | 'feedback'
const stage = ref<Stage>(store.phase === 'feedback' ? 'feedback' : 'thinking')
const guess = computed(() => store.guess ?? 0)
const birthYear = computed(() => new Date().getFullYear() - guess.value)

// 真实年龄输入：默认显示本次猜测年龄，范围 1～120
const ageInput = ref<number>(guess.value)
const clamp = (v: number) => Math.min(120, Math.max(1, Math.round(v) || 1))
const step = (d: number) => (ageInput.value = clamp(ageInput.value + d))

let timer: number | undefined
onMounted(() => {
  if (stage.value !== 'thinking') return
  timer = window.setTimeout(() => {
    stage.value = 'reveal'
    playSound('reveal')
  }, 1800)
})
onBeforeUnmount(() => window.clearTimeout(timer))

function confirm(correct: boolean) {
  store.confirmGuess(correct)
  if (correct) {
    playSound('success')
    router.replace('/result')
  } else {
    playSound('fail')
    ageInput.value = guess.value
    stage.value = 'feedback'
  }
}

function submit(provide: boolean) {
  store.submitActualAge(provide ? clamp(ageInput.value) : null)
  playSound('select')
  router.replace('/result')
}
</script>

<template>
  <main class="page guess">
    <div class="guess__top"><SoundToggle /></div>

    <Transition name="fade" mode="out-in">
      <!-- 分析中 -->
      <section v-if="stage === 'thinking'" key="thinking" class="guess__center" aria-live="polite">
        <div class="dots" aria-hidden="true"><span /><span /><span /></div>
        <h1 class="guess__lead">我已经了解了你的记忆！</h1>
        <p class="muted">正在把 {{ store.answers.length }} 条回答拼成一条时间线…</p>
      </section>

      <!-- 唯一一次正式猜测 -->
      <section v-else-if="stage === 'reveal'" key="reveal" class="guess__center">
        <p class="guess__pre">经过分析，我认为……</p>
        <div class="card guess__card">
          <p class="guess__say">你今年</p>
          <p class="guess__age">{{ guess }}<span>岁</span></p>
          <p class="guess__birth">你是不是 {{ birthYear }} 年出生的？</p>
        </div>
        <p class="muted guess__note">这是我唯一的一次猜测，仅供娱乐。</p>
        <div class="guess__actions">
          <button class="btn btn--success" type="button" @click="confirm(true)">猜对了！</button>
          <button class="btn btn--ghost" type="button" @click="confirm(false)">猜错了！</button>
        </div>
      </section>

      <!-- 真实年龄反馈（自愿） -->
      <section v-else key="feedback" class="guess__center">
        <h1 class="guess__lead">看来我猜错了！</h1>
        <p class="guess__desc">如果你愿意告诉我真实年龄，我可以帮助后续版本改进猜测效果。</p>

        <form class="card stepper" @submit.prevent="submit(true)">
          <label class="stepper__label" for="actual-age">你的真实年龄</label>
          <div class="stepper__row">
            <button class="stepper__btn" type="button" aria-label="减少年龄" :disabled="ageInput <= 1" @click="step(-1)">−</button>
            <div class="stepper__field">
              <input
                id="actual-age"
                v-model.number="ageInput"
                type="number"
                inputmode="numeric"
                min="1"
                max="120"
                @blur="ageInput = clamp(ageInput)"
              />
              <span>岁</span>
            </div>
            <button class="stepper__btn" type="button" aria-label="增加年龄" :disabled="ageInput >= 120" @click="step(1)">+</button>
          </div>
          <button class="btn btn--primary btn--block" type="submit">确认</button>
        </form>

        <button class="btn btn--plain btn--block guess__skip" type="button" @click="submit(false)">不提供，直接看结果</button>
        <p class="muted guess__note">
          完全自愿。真实年龄只保存在当前浏览器会话中，不会上传，也不会改变这次已经给出的猜测。
        </p>
      </section>
    </Transition>
  </main>
</template>

<style scoped>
.guess__top {
  display: flex;
  justify-content: flex-end;
}

.guess__center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;
  padding: 24px 0 40px;
}

.guess__lead {
  font-family: var(--font-serif);
  font-size: 28px;
  line-height: 1.35;
}

.guess__pre {
  font-size: 18px;
  color: var(--primary-dark);
}

.guess__desc {
  max-width: 380px;
  font-size: 15px;
  color: #555;
}

.guess__card {
  width: 100%;
  max-width: 360px;
  padding: 26px 20px;
  border-top: 6px solid var(--accent);
  animation: rise 0.6s ease both;
}

.guess__say {
  font-size: 18px;
}

.guess__age {
  font-family: var(--font-serif);
  font-size: 104px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.guess__age span {
  font-size: 30px;
  margin-left: 6px;
}

.guess__birth {
  margin-top: 4px;
  font-size: 16px;
  color: var(--text-2);
}

.guess__actions {
  width: 100%;
  max-width: 360px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.guess__note {
  font-size: 13px;
  max-width: 360px;
}

.guess__skip {
  max-width: 360px;
}

.stepper {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stepper__label {
  font-size: 14px;
  color: var(--text-2);
}

.stepper__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.stepper__btn {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  font-size: 26px;
  line-height: 1;
  color: var(--primary);
  background: var(--primary-soft);
}

.stepper__field {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--primary);
}

.stepper__field input {
  width: 110px;
  border: none;
  border-bottom: 2px solid var(--line);
  background: transparent;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 48px;
  font-weight: 700;
  color: var(--primary);
  padding: 0;
  appearance: textfield;
  -moz-appearance: textfield;
}

.stepper__field input::-webkit-outer-spin-button,
.stepper__field input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.stepper__field input:focus {
  outline: none;
  border-bottom-color: var(--primary);
}

.dots {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}

.dots span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  animation: bounce 1s ease-in-out infinite;
}

.dots span:nth-child(2) {
  background: var(--accent);
  animation-delay: 0.15s;
}

.dots span:nth-child(3) {
  background: var(--success);
  animation-delay: 0.3s;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

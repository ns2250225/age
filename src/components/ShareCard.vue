<script setup lang="ts">
import { computed } from 'vue'
import type { GameResult } from '@/types/result'

export type ShareTheme = 'paper' | 'night' | 'sunset'

const props = defineProps<{
  result: GameResult
  showActual: boolean
  showVerdict: boolean
  theme: ShareTheme
  qr: string
  url: string
}>()

const logoUrl = import.meta.env.BASE_URL + 'assets/logo/logo.svg'

const verdict = computed(() => {
  const r = props.result
  if (r.rating === 'exact') return '一岁不差，被猜中了！'
  if (r.rating === 'close') return '只差一点点，几乎猜中'
  if (r.rating === 'near') return '差一点就猜中了'
  return '没猜中，我的记忆太难懂'
})
const hit = computed(() => props.result.rating === 'exact' || props.result.rating === 'close')
const displayUrl = computed(() => props.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))
</script>

<template>
  <!-- 固定宽度、只用内联可截图的样式，保证导出的 PNG 不错位 -->
  <div class="share" :class="`share--${theme}`">
    <header class="share__head">
      <img :src="logoUrl" alt="" width="36" height="36" />
      <div>
        <div class="share__brand">记忆猜年龄</div>
        <div class="share__slogan">不问生日，只靠记忆</div>
      </div>
    </header>

    <div class="share__main">
      <div class="share__label">它靠我的记忆，猜我今年</div>
      <div class="share__age">{{ result.guess }}<span>岁</span></div>
      <div v-if="showVerdict" class="share__verdict" :class="{ 'share__verdict--hit': hit }">{{ verdict }}</div>
      <div v-if="showActual && result.actualAge !== null" class="share__actual">我的真实年龄：{{ result.actualAge }} 岁</div>
    </div>

    <div class="share__evidence">
      <div class="share__subtitle">出卖我的三段记忆</div>
      <ol>
        <li v-for="e in result.evidence" :key="e.questionId">{{ e.statement.replace(/^你/, '我') }}</li>
      </ol>
    </div>

    <footer class="share__foot">
      <div>
        <div class="share__cta">你也来试试，看它能不能猜中？</div>
        <div class="share__url">{{ displayUrl }}</div>
      </div>
      <img v-if="qr" class="share__qr" :src="qr" alt="游戏网址二维码" width="72" height="72" />
    </footer>
  </div>
</template>

<style scoped>
.share {
  --s-bg: #f7f5f0;
  --s-card: #ffffff;
  --s-text: #292929;
  --s-sub: #888888;
  --s-main: #526f91;
  --s-accent: #e7b77a;
  width: 340px;
  padding: 22px 20px 18px;
  background: var(--s-bg);
  color: var(--s-text);
  font-family: var(--font-sans);
  line-height: 1.5;
  text-align: left;
}

.share--night {
  --s-bg: #2c3a4d;
  --s-card: #384a61;
  --s-text: #f7f5f0;
  --s-sub: #b9c4d1;
  --s-main: #f1cf9f;
  --s-accent: #e7b77a;
}

.share--sunset {
  --s-bg: #fbeedc;
  --s-card: #fffaf2;
  --s-text: #4a3523;
  --s-sub: #a08467;
  --s-main: #b8683f;
  --s-accent: #e7b77a;
}

.share__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.share__head img {
  border-radius: 9px;
}

.share__brand {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}

.share__slogan {
  font-size: 11px;
  color: var(--s-sub);
}

.share__main {
  margin-top: 16px;
  padding: 18px 16px 16px;
  border-radius: 16px;
  background: var(--s-card);
  text-align: center;
}

.share__label {
  font-size: 13px;
  color: var(--s-sub);
}

.share__age {
  font-family: var(--font-serif);
  font-size: 72px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--s-main);
}

.share__age span {
  font-size: 22px;
  margin-left: 4px;
}

.share__verdict {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #8c8c8c;
}

.share__verdict--hit {
  background: #6a9b79;
}

.share__actual {
  margin-top: 8px;
  font-size: 13px;
  color: var(--s-sub);
}

.share__evidence {
  margin-top: 14px;
}

.share__subtitle {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  padding-left: 8px;
  border-left: 4px solid var(--s-accent);
  line-height: 1.2;
}

.share__evidence ol {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: ev;
}

.share__evidence li {
  counter-increment: ev;
  position: relative;
  padding: 5px 0 5px 26px;
  font-size: 13px;
}

.share__evidence li::before {
  content: counter(ev);
  position: absolute;
  left: 0;
  top: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: var(--s-main);
}

.share--night .share__evidence li::before {
  color: #2c3a4d;
}

.share__foot {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--s-sub);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.share__cta {
  font-size: 13px;
  font-weight: 600;
}

.share__url {
  margin-top: 2px;
  font-size: 11px;
  color: var(--s-sub);
  word-break: break-all;
}

.share__qr {
  flex: none;
  border-radius: 8px;
  background: #fff;
  padding: 3px;
}
</style>

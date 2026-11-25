<script setup lang="ts">
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const RULES = [
  { title: '不问年龄', text: '整个过程不会问你的生日或出生年份，我只问你记得什么、经历过什么。' },
  { title: '每题只选一个', text: '点击选项就会记录答案并自动进入下一题，不能修改，也不限时间。' },
  { title: '可以说“不知道”', text: '没印象就选“不知道 / 没印象”。它不会被当成任何年龄的证据，诚实回答不会让我猜偏。' },
  { title: '题目因人而异', text: '我会根据你前面的回答，挑选最能缩小年龄范围的下一题，所以每个人遇到的题目都不一样。' },
  { title: '只猜一次', text: `回答 ${store.cfg.minQuestions}～${store.cfg.maxQuestions} 道题后，我会进行唯一一次正式猜测，猜完不能反悔。` },
  { title: '告诉我对不对', text: '你可以告诉我猜对了还是猜错了。猜错时可以自愿告诉我真实年龄，也可以直接跳过。' },
  { title: '看看我的依据', text: '最后我会展示你的“记忆地层”和三条决定性证据，并可以生成图片分享给朋友。' },
]
</script>

<template>
  <main class="page">
    <header class="rules__head">
      <RouterLink class="rules__back" to="/" aria-label="返回首页">‹ 返回</RouterLink>
      <h1>游戏规则</h1>
    </header>

    <ol class="rules stack">
      <li v-for="(r, i) in RULES" :key="r.title" class="card rules__item">
        <span class="rules__num">{{ i + 1 }}</span>
        <div>
          <h2>{{ r.title }}</h2>
          <p>{{ r.text }}</p>
        </div>
      </li>
    </ol>

    <p class="muted rules__note">这是一个娱乐小游戏：猜测基于流行文化记忆的统计估计，并不具备真实的“测龄”能力。</p>

    <RouterLink class="btn btn--primary btn--block rules__cta" to="/">我知道了</RouterLink>
  </main>
</template>

<style scoped>
.rules__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.rules__head h1 {
  font-family: var(--font-serif);
  font-size: 26px;
}

.rules__back {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--primary);
  text-decoration: none;
  font-size: 16px;
}

.rules {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rules__item {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
}

.rules__num {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  background: var(--primary);
}

.rules__item h2 {
  font-size: 17px;
  margin-bottom: 2px;
}

.rules__item p {
  font-size: 15px;
  color: #555;
}

.rules__note {
  margin: 18px 0;
  text-align: center;
  font-size: 13px;
}

.rules__cta {
  text-decoration: none;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SoundToggle from '@/components/SoundToggle.vue'
import { routeForPhase } from '@/router'
import { useGameStore } from '@/stores/game'
import { playSound } from '@/utils/sound'

const store = useGameStore()
const router = useRouter()
const showPrivacy = ref(false)
const logoUrl = import.meta.env.BASE_URL + 'assets/logo/logo.svg'

function start() {
  if (!store.loaded) return
  playSound('select')
  store.start()
  router.push('/game')
}

function resume() {
  playSound('select')
  router.push(routeForPhase(store.phase))
}
</script>

<template>
  <main class="page home">
    <div class="home__top">
      <SoundToggle />
    </div>

    <div class="home__hero">
      <img class="home__logo" :src="logoUrl" alt="记忆猜年龄" width="96" height="96" />
      <p class="home__kicker">我能猜出你的年龄吗？</p>
      <h1 class="home__title">我知道你几岁！</h1>
      <p class="home__subtitle">不问生日，不问年龄，只靠你的记忆。</p>
      <p class="home__desc">
        从小时候流行的动画、游戏、音乐、校园生活，到互联网发展史，我会根据你的回答，慢慢猜出你的年龄。
      </p>
    </div>

    <div class="home__actions stack">
      <button v-if="store.canResume" class="btn btn--primary btn--block" type="button" @click="resume">
        {{ store.phase === 'result' ? '查看上次的结果' : '继续上次的测试' }}
      </button>
      <button
        class="btn btn--block"
        :class="store.canResume ? 'btn--ghost' : 'btn--primary'"
        type="button"
        :disabled="!store.loaded"
        @click="start"
      >
        {{ store.loaded ? (store.canResume ? '重新开始' : '开始测试') : store.loadError ? '题库加载失败' : '题库加载中…' }}
      </button>
      <RouterLink class="btn btn--ghost btn--block" to="/rules">游戏规则</RouterLink>
      <p v-if="store.loadError" class="home__error" role="alert">
        {{ store.loadError }}
        <button class="link" type="button" @click="store.ensureLoaded()">重试</button>
      </p>
    </div>

    <ul class="home__facts" aria-label="游戏特点">
      <li><strong>8～20</strong> 道题</li>
      <li>只猜 <strong>1</strong> 次</li>
      <li><strong>{{ store.loaded ? store.pool.length : '300+' }}</strong> 题题库</li>
    </ul>

    <section class="home__privacy">
      <button class="link" type="button" :aria-expanded="showPrivacy" @click="showPrivacy = !showPrivacy">
        隐私说明 {{ showPrivacy ? '▴' : '▾' }}
      </button>
      <div v-if="showPrivacy" class="card home__privacy-body">
        <ul>
          <li>无需注册登录，不收集姓名、手机号、生日等任何个人信息。</li>
          <li>所有计算都在你的浏览器里完成，答题记录不会上传到服务器。</li>
          <li>答题进度只保存在本机，方便中断后继续；点击“再玩一次”即会清除。</li>
          <li>真实年龄反馈完全自愿，只保存在当前浏览器会话中，关闭页面即消失。</li>
          <li>分享图片默认不展示你的真实年龄。</li>
        </ul>
      </div>
    </section>

    <footer class="home__footer muted">
      <span>仅供娱乐，猜测结果不代表真实的测龄能力。</span>
      <RouterLink class="link" to="/admin">题库管理</RouterLink>
    </footer>
  </main>
</template>

<style scoped>
.home {
  align-items: stretch;
}

.home__top {
  display: flex;
  justify-content: flex-end;
}

.home__hero {
  text-align: center;
  padding: 18px 4px 26px;
}

.home__logo {
  border-radius: 26px;
  box-shadow: var(--shadow);
  animation: float 4s ease-in-out infinite;
}

.home__kicker {
  margin-top: 18px;
  font-size: 14px;
  letter-spacing: 0.2em;
  color: var(--primary);
}

.home__title {
  margin-top: 6px;
  font-family: var(--font-serif);
  font-size: 38px;
  line-height: 1.25;
  font-weight: 700;
  text-wrap: balance;
}

.home__subtitle {
  margin-top: 10px;
  font-size: 17px;
  color: var(--primary-dark);
  font-weight: 600;
}

.home__desc {
  margin: 14px auto 0;
  max-width: 420px;
  font-size: 15px;
  color: var(--text-2);
  text-wrap: pretty;
}

.home__actions a {
  text-decoration: none;
}

.home__error {
  text-align: center;
  font-size: 14px;
  color: var(--danger);
}

.home__facts {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.home__facts li {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--card);
  box-shadow: inset 0 0 0 1px var(--line);
}

.home__facts strong {
  color: var(--primary);
  font-size: 15px;
}

.home__privacy {
  margin-top: 22px;
  text-align: center;
}

.home__privacy-body {
  margin-top: 10px;
  text-align: left;
  font-size: 14px;
  color: var(--text);
}

.home__privacy-body ul {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
}

.home__footer {
  margin-top: auto;
  padding-top: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-align: center;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (min-width: 768px) {
  .home__title {
    font-size: 46px;
  }
}
</style>

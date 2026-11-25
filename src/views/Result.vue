<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AgeChart from '@/components/AgeChart.vue'
import AgeResult from '@/components/AgeResult.vue'
import MemoryTimeline from '@/components/MemoryTimeline.vue'
import ShareCard, { type ShareTheme } from '@/components/ShareCard.vue'
import SoundToggle from '@/components/SoundToggle.vue'
import {
  canCopyImage,
  canSystemShare,
  copyImage,
  copyText,
  downloadBlob,
  gameUrl,
  makeQrDataUrl,
  renderPng,
  systemShare,
} from '@/services/share-service'
import { useGameStore } from '@/stores/game'
import { playSound } from '@/utils/sound'

const store = useGameStore()
const router = useRouter()
const result = computed(() => store.result)

// ---- 分享图片 ----
const THEMES: { id: ShareTheme; name: string }[] = [
  { id: 'paper', name: '纸张' },
  { id: 'night', name: '夜色' },
  { id: 'sunset', name: '暖阳' },
]
const theme = ref<ShareTheme>('paper')
// 默认不暴露真实年龄，由用户自行选择
const showActual = ref(false)
const showVerdict = ref(true)
const cardWrap = ref<HTMLElement | null>(null)
const qr = ref('')
const url = gameUrl()
const busy = ref(false)
const toast = ref('')
let toastTimer: number | undefined

const supportsCopyImage = canCopyImage()
const supportsShare = canSystemShare()

onMounted(async () => {
  try {
    qr.value = await makeQrDataUrl(url)
  } catch {
    qr.value = ''
  }
})

function notify(msg: string) {
  toast.value = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 2400)
}

async function withImage(action: (blob: Blob) => Promise<string | void>) {
  const node = cardWrap.value?.firstElementChild as HTMLElement | null
  if (!node || busy.value) return
  busy.value = true
  try {
    const msg = await action(await renderPng(node))
    if (msg) notify(msg)
  } catch (err) {
    notify(err instanceof Error && err.message ? `操作失败：${err.message}` : '操作失败，请重试')
  } finally {
    busy.value = false
  }
}

const shareText = computed(() =>
  result.value ? `「记忆猜年龄」靠我的童年记忆猜我 ${result.value.guess} 岁，你也来试试！` : '',
)

const save = () =>
  withImage(async (blob) => {
    downloadBlob(blob)
    return '图片已生成，请在下载内容中查看'
  })
const copyPng = () =>
  withImage(async (blob) => {
    await copyImage(blob)
    return '图片已复制到剪贴板'
  })
const share = () =>
  withImage(async (blob) => {
    await systemShare(blob, shareText.value)
  })

async function copyLink() {
  try {
    await copyText(url)
    notify('游戏链接已复制')
  } catch {
    notify('复制失败，请手动复制地址栏链接')
  }
}

function again() {
  playSound('select')
  store.start()
  router.replace('/game')
}

function home() {
  store.reset()
  router.replace('/')
}

const accuracy = computed(() => {
  const s = store.stats
  if (s.games === 0) return ''
  const parts = [`本机累计 ${s.games} 局，猜中 ${s.hits} 局`]
  if (s.withAge > 0) parts.push(`已知年龄的 ${s.withAge} 局平均误差 ${(s.absErrorSum / s.withAge).toFixed(1)} 岁`)
  return parts.join('；')
})
</script>

<template>
  <main class="page result">
    <header class="result__head">
      <h1>猜测结果</h1>
      <SoundToggle />
    </header>

    <div v-if="result" class="stack stack--lg">
      <!-- A. 年龄判定 -->
      <AgeResult :result="result" />

      <!-- C. 决定性证据 -->
      <section class="card">
        <h2 class="section-title">决定性证据</h2>
        <ol class="evidence">
          <li v-for="(e, i) in result.evidence" :key="e.questionId">
            <span class="evidence__num">{{ i + 1 }}</span>
            <div>
              <p class="evidence__statement">{{ e.statement }}</p>
              <p class="evidence__source">{{ e.question }} —— {{ e.answer }}</p>
            </div>
          </li>
        </ol>
        <p v-if="result.evidence.length === 0" class="muted">这次你几乎都选了“不知道”，我没有拿到可用的证据。</p>
      </section>

      <!-- B. 记忆的地层 -->
      <section class="card">
        <h2 class="section-title">记忆的地层</h2>
        <MemoryTimeline :strata="result.strata" />
      </section>

      <!-- D. 年龄判断说明 -->
      <section class="card">
        <h2 class="section-title">我是怎么猜的</h2>
        <div class="explain">
          <p v-for="(line, i) in result.explanation" :key="i">{{ line }}</p>
        </div>
        <AgeChart
          class="result__chart"
          :distribution="result.distribution"
          :min-age="store.cfg.minAge"
          :guess="result.guess"
          :actual-age="result.actualAge"
        />
        <p class="muted result__chart-note">
          柱子越高，表示我认为你是这个年龄的可能性越大（共 {{ result.answered }} 题，其中 {{ result.effective }} 条有效回答）。这是模型内部的相对把握，不等于真实准确率。
        </p>
      </section>

      <!-- 分享 -->
      <section class="card">
        <h2 class="section-title">分享结果</h2>

        <div ref="cardWrap" class="share-preview">
          <ShareCard :result="result" :show-actual="showActual" :show-verdict="showVerdict" :theme="theme" :qr="qr" :url="url" />
        </div>

        <div class="share-options">
          <div class="themes" role="radiogroup" aria-label="图片风格">
            <button
              v-for="t in THEMES"
              :key="t.id"
              type="button"
              role="radio"
              class="theme"
              :class="[`theme--${t.id}`, { 'theme--on': theme === t.id }]"
              :aria-checked="theme === t.id"
              @click="theme = t.id"
            >
              {{ t.name }}
            </button>
          </div>
          <label class="check">
            <input v-model="showVerdict" type="checkbox" />
            <span>在图片上展示是否猜中</span>
          </label>
          <label class="check" :class="{ 'check--disabled': result.actualAge === null }">
            <input v-model="showActual" type="checkbox" :disabled="result.actualAge === null" />
            <span>在图片上展示我的真实年龄</span>
          </label>
          <p v-if="result.actualAge === null" class="muted share-hint">你没有提供真实年龄，图片上不会出现它。</p>
          <p v-else-if="result.diff === 0 && showVerdict" class="muted share-hint">
            提示：既然猜中了，图片上的猜测年龄就等于你的真实年龄。介意的话可以取消“展示是否猜中”。
          </p>
        </div>

        <div class="share-actions">
          <button class="btn btn--primary btn--small" type="button" :disabled="busy" @click="save">
            {{ busy ? '生成中…' : '保存图片' }}
          </button>
          <button v-if="supportsCopyImage" class="btn btn--plain btn--small" type="button" :disabled="busy" @click="copyPng">复制图片</button>
          <button v-if="supportsShare" class="btn btn--plain btn--small" type="button" :disabled="busy" @click="share">分享给朋友</button>
          <button class="btn btn--plain btn--small" type="button" @click="copyLink">复制游戏链接</button>
        </div>
      </section>

      <div class="stack">
        <button class="btn btn--primary btn--block" type="button" @click="again">再玩一次</button>
        <button class="btn btn--ghost btn--block" type="button" @click="home">回到首页</button>
      </div>

      <p v-if="accuracy" class="muted result__stats">{{ accuracy }}</p>
    </div>

    <div v-else class="card result__loading">
      <p v-if="store.loadError" role="alert">{{ store.loadError }}</p>
      <p v-else class="muted">正在整理结果…</p>
      <button v-if="store.loadError" class="btn btn--primary btn--small" type="button" @click="store.ensureLoaded()">重试</button>
    </div>

    <Transition name="fade">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </Transition>
  </main>
</template>

<style scoped>
.result__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.result__head h1 {
  font-family: var(--font-serif);
  font-size: 26px;
}

.evidence {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.evidence li {
  display: flex;
  gap: 12px;
}

.evidence__num {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: var(--accent);
}

.evidence__statement {
  font-size: 16px;
  font-weight: 600;
}

.evidence__source {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.explain {
  display: grid;
  gap: 8px;
  font-size: 15px;
}

.result__chart {
  margin-top: 14px;
}

.result__chart-note {
  font-size: 12px;
  margin-top: 4px;
}

.share-preview {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  padding: 4px 0 8px;
}

.share-preview > :deep(.share) {
  flex: none;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
}

.share-options {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.themes {
  display: flex;
  gap: 8px;
}

.theme {
  flex: 1;
  min-height: 44px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  box-shadow: inset 0 0 0 1.5px var(--line);
}

.theme--paper {
  background: #f7f5f0;
  color: #292929;
}

.theme--night {
  background: #2c3a4d;
  color: #f7f5f0;
}

.theme--sunset {
  background: #fbeedc;
  color: #4a3523;
}

.theme--on {
  box-shadow:
    inset 0 0 0 2px var(--primary),
    0 0 0 2px var(--card),
    0 0 0 4px var(--primary);
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 15px;
  cursor: pointer;
}

.check input {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
}

.check--disabled {
  color: var(--text-2);
  cursor: not-allowed;
}

.share-hint {
  font-size: 13px;
  margin-top: -4px;
}

.share-actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.result__stats {
  text-align: center;
  font-size: 12px;
}

.result__loading {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  color: #fff;
  background: rgba(41, 41, 41, 0.92);
  z-index: 10;
}

.toast.fade-enter-from,
.toast.fade-leave-to {
  transform: translateX(-50%) translateY(8px);
}

@media (max-width: 400px) {
  .share-preview {
    justify-content: flex-start;
  }
}
</style>

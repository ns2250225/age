<script setup lang="ts">
import { computed, ref } from 'vue'
import { createLogPrior, toProbabilities } from '@/engine/bayesian'
import { expectedInformationGain } from '@/engine/information-gain'
import { compileQuestion } from '@/services/question-service'
import { useGameStore } from '@/stores/game'
import type { Question, QuestionType } from '@/types/question'
import { loadFeedback, resetStats } from '@/utils/statistics'

const store = useGameStore()

const TYPE_LABEL: Record<QuestionType, string> = {
  recognition: 'A 是否认识',
  experience: 'B 年代回忆',
  culture: 'C 流行文化',
  school: 'D 校园记忆',
  internet: 'E 互联网记忆',
  knowledge: 'F 知识判断',
}

const category = ref('全部')
const keyword = ref('')
const sortByGain = ref(true)

// 题库质量分析：在均匀先验下，每道题单独提问的预期信息增益（区分能力）
const analysed = computed(() => {
  const prior = toProbabilities(createLogPrior(store.cfg))
  const year = new Date().getFullYear()
  return store.bank.map((q: Question) => {
    const cq = compileQuestion(q, year, store.cfg)
    return { q, gain: expectedInformationGain(prior, cq, store.cfg.evidenceScale) }
  })
})

const categories = computed(() => {
  const map = new Map<string, { total: number; enabled: number; gain: number }>()
  for (const { q, gain } of analysed.value) {
    const c = map.get(q.category) ?? { total: 0, enabled: 0, gain: 0 }
    c.total++
    c.gain += gain
    if (!store.disabledIds.has(q.id)) c.enabled++
    map.set(q.category, c)
  }
  return [...map.entries()].map(([name, c]) => ({ name, ...c, avg: c.gain / c.total }))
})

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = analysed.value.filter(
    ({ q }) =>
      (category.value === '全部' || q.category === category.value) &&
      (!kw || q.question.toLowerCase().includes(kw) || q.id.includes(kw) || q.tags.some((t) => t.includes(kw))),
  )
  return sortByGain.value ? [...list].sort((a, b) => b.gain - a.gain) : list
})

const maxGain = computed(() => Math.max(0.001, ...analysed.value.map((r) => r.gain)))
const feedbackCount = ref(Object.values(loadFeedback()).reduce((a, b) => a + b, 0))

const stats = computed(() => store.stats)
const hitRate = computed(() => (stats.value.games ? `${Math.round((stats.value.hits / stats.value.games) * 100)}%` : '—'))
const meanError = computed(() => (stats.value.withAge ? `${(stats.value.absErrorSum / stats.value.withAge).toFixed(1)} 岁` : '—'))

function clearStats() {
  if (!window.confirm('确定清空本机的准确率统计吗？')) return
  resetStats()
  store.refreshStats()
}

function eraText(q: Question): string {
  if (!q.era) return '—'
  return q.era.start === q.era.end ? `${q.era.start}` : `${q.era.start}–${q.era.end}`
}
</script>

<template>
  <main class="page page--wide admin">
    <header class="admin__head">
      <RouterLink class="admin__back" to="/">‹ 返回首页</RouterLink>
      <h1>题库管理</h1>
    </header>
    <p class="muted admin__intro">
      纯前端的本机管理页：启用/停用状态与统计只保存在这台设备的浏览器里，不会影响其他用户。题目内容请修改
      <code>scripts/generate-questions.mjs</code> 后重新生成。
    </p>

    <p v-if="!store.loaded" class="card muted">{{ store.loadError || '题库加载中…' }}</p>

    <template v-else>
      <section class="card">
        <h2 class="section-title">本机猜测准确率</h2>
        <dl class="kpis">
          <div><dt>累计局数</dt><dd>{{ stats.games }}</dd></div>
          <div><dt>用户确认猜中</dt><dd>{{ hitRate }}</dd></div>
          <div><dt>平均误差</dt><dd>{{ meanError }}</dd></div>
          <div><dt>本次会话反馈</dt><dd>{{ feedbackCount }} 条</dd></div>
        </dl>
        <p v-if="stats.withAge" class="muted">
          已知年龄的 {{ stats.withAge }} 局：完全命中 {{ stats.tiers.exact }}、差 1～2 岁 {{ stats.tiers.close }}、差 3～5 岁
          {{ stats.tiers.near }}、差 5 岁以上 {{ stats.tiers.miss }}。
        </p>
        <button class="link" type="button" @click="clearStats">清空统计</button>
      </section>

      <section class="card">
        <h2 class="section-title">分类概览与区分能力</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>分类</th><th class="num">启用 / 总数</th><th class="num">平均信息增益（bit）</th></tr>
            </thead>
            <tbody>
              <tr v-for="c in categories" :key="c.name">
                <td>{{ c.name }}</td>
                <td class="num">{{ c.enabled }} / {{ c.total }}</td>
                <td class="num">{{ c.avg.toFixed(3) }}</td>
              </tr>
              <tr class="total">
                <td>合计</td>
                <td class="num">{{ store.pool.length }} / {{ store.bank.length }}</td>
                <td class="num">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted">信息增益按“均匀年龄先验下单独提问”估算，越高说明这道题越能区分年龄；接近 0 的题目几乎不会被选中。</p>
      </section>

      <section class="card">
        <h2 class="section-title">题目列表（{{ rows.length }}）</h2>
        <div class="filters">
          <select v-model="category" aria-label="按分类筛选">
            <option>全部</option>
            <option v-for="c in categories" :key="c.name">{{ c.name }}</option>
          </select>
          <input v-model="keyword" type="search" placeholder="搜索题目、ID 或标签" aria-label="搜索题目" />
          <label class="filters__check"><input v-model="sortByGain" type="checkbox" /> 按区分能力排序</label>
        </div>

        <ul class="qlist">
          <li v-for="{ q, gain } in rows" :key="q.id" :class="{ off: store.disabledIds.has(q.id) }">
            <div class="qlist__main">
              <p class="qlist__q">{{ q.emoji }} {{ q.question }}</p>
              <p class="qlist__meta">
                <code>{{ q.id }}</code> · {{ q.category }} · {{ TYPE_LABEL[q.type] }} · 流行 {{ eraText(q) }} · 权重 {{ q.weight }} · 难度
                {{ q.difficulty }}
              </p>
              <div class="gain" :title="`预期信息增益 ${gain.toFixed(3)} bit`">
                <span class="gain__bar"><span :style="{ width: `${(gain / maxGain) * 100}%` }" /></span>
                <span class="gain__num">{{ gain.toFixed(3) }}</span>
              </div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                :checked="!store.disabledIds.has(q.id)"
                :aria-label="`启用题目 ${q.id}`"
                @change="store.setQuestionEnabled(q.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ store.disabledIds.has(q.id) ? '停用' : '启用' }}</span>
            </label>
          </li>
        </ul>
        <p v-if="rows.length === 0" class="muted">没有符合条件的题目。</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin {
  gap: 16px;
}

.admin__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.admin__head h1 {
  font-family: var(--font-serif);
  font-size: 26px;
}

.admin__back {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--primary);
  text-decoration: none;
}

.admin__intro code,
.qlist__meta code {
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--primary-soft);
}

.kpis {
  margin: 0 0 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.kpis div {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.kpis dt {
  font-size: 12px;
  color: var(--text-2);
}

.kpis dd {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.table-wrap {
  overflow-x: auto;
  margin-bottom: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

th {
  font-size: 12px;
  color: var(--text-2);
  font-weight: 600;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.total td {
  font-weight: 700;
  border-bottom: none;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.filters select,
.filters input[type='search'] {
  min-height: 44px;
  padding: 0 12px;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--card);
  font: inherit;
  font-size: 15px;
  color: var(--text);
}

.filters input[type='search'] {
  flex: 1;
  min-width: 160px;
}

.filters__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  min-height: 44px;
}

.qlist {
  list-style: none;
  margin: 0;
  padding: 0;
}

.qlist li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.qlist li.off .qlist__main {
  opacity: 0.45;
}

.qlist__main {
  flex: 1;
  min-width: 0;
}

.qlist__q {
  font-size: 15px;
}

.qlist__meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-2);
}

.gain {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.gain__bar {
  flex: 1;
  max-width: 220px;
  height: 6px;
  border-radius: 999px;
  background: var(--primary-soft);
  overflow: hidden;
}

.gain__bar span {
  display: block;
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
}

.gain__num {
  font-size: 12px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.switch {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
}

.switch input {
  width: 20px;
  height: 20px;
  accent-color: var(--success);
}
</style>

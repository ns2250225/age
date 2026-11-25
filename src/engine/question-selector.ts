import type { CompiledQuestion } from '@/types/question'
import { entropy } from './bayesian'
import type { EngineConfig } from './config'
import { expectedInformationGain } from './information-gain'

export interface SelectorContext {
  probs: Float64Array
  /** 已提问的题目（按顺序） */
  history: CompiledQuestion[]
  /** 各分类中用户回答“不知道”的次数 */
  unknownByCategory: Record<string, number>
  rng?: () => number
}

export interface RankedQuestion {
  cq: CompiledQuestion
  gain: number
  score: number
}

// 这些标签只描述年代或题型，不代表“相似主题”
const GENERIC_TAG = /年代$|^多选$|^知识$/
/** Diversity(Q)：避免连续出现相似问题，并降低用户明显不了解的主题 */
function diversity(cq: CompiledQuestion, ctx: SelectorContext): number {
  const q = cq.question
  const h = ctx.history
  const last = h[h.length - 1]?.question
  const prev = h[h.length - 2]?.question
  let d = 1

  if (last?.category === q.category) d *= 0.35
  else if (prev?.category === q.category) d *= 0.7

  if (last) {
    const shared = q.tags.some((t) => !GENERIC_TAG.test(t) && last.tags.includes(t))
    if (shared) d *= 0.5
    if (prev && last.type === q.type && prev.type === q.type) d *= 0.8
  }

  // 同一主题标签整局最多出现两三次
  const specific = q.tags.filter((t) => !GENERIC_TAG.test(t))
  if (specific.length) {
    const used = h.filter((x) => x.question.tags.some((t) => specific.includes(t))).length
    d *= 1 / (1 + 0.6 * used)
  }

  const sameCategory = h.filter((x) => x.question.category === q.category).length
  d *= 1 / (1 + 0.15 * sameCategory)

  const unknowns = ctx.unknownByCategory[q.category] ?? 0
  if (unknowns >= 3) d *= 0.3
  else if (unknowns >= 2) d *= 0.5

  return d
}

/** Score(Q) = IG(Q) × Reliability(Q) × Diversity(Q)，按得分降序 */
export function rankQuestions(pool: CompiledQuestion[], ctx: SelectorContext, cfg: EngineConfig): RankedQuestion[] {
  const asked = new Set(ctx.history.map((x) => x.question.id))
  const h = entropy(ctx.probs)
  const ranked: RankedQuestion[] = []
  for (const cq of pool) {
    if (asked.has(cq.question.id)) continue
    const gain = expectedInformationGain(ctx.probs, cq, cfg.evidenceScale, h)
    // 与当前年龄区间无关的问题几乎没有信息量，直接排除
    if (gain < cfg.minInfoGain) continue
    const reliability = cq.question.reliability ?? 1
    ranked.push({ cq, gain, score: gain * reliability * diversity(cq, ctx) })
  }
  return ranked.sort((a, b) => b.score - a.score)
}

/** 从得分最高的几道题中按得分加权抽取一道；没有合格题目时返回 null */
export function selectNextQuestion(
  pool: CompiledQuestion[],
  ctx: SelectorContext,
  cfg: EngineConfig,
): CompiledQuestion | null {
  const ranked = rankQuestions(pool, ctx, cfg)
  if (ranked.length === 0) return null
  // 第一题多留一些随机性，让每局开场不同；之后只在前三名里选
  const k = ctx.history.length === 0 ? 8 : 3
  const top = ranked.slice(0, k).filter((r) => r.score >= ranked[0].score * 0.6)
  const rng = ctx.rng ?? Math.random
  let r = rng() * top.reduce((s, x) => s + x.score, 0)
  for (const item of top) {
    r -= item.score
    if (r <= 0) return item.cq
  }
  return top[0].cq
}

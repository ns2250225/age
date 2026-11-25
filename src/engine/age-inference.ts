import type { AnswerRecord } from '@/types/answer'
import type { CompiledQuestion } from '@/types/question'
import type { AgeSummary } from '@/types/result'
import { applyEvidence, createLogPrior, entropy, toProbabilities } from './bayesian'
import type { EngineConfig } from './config'

export interface Posterior {
  probs: Float64Array
  /** 有效回答数（不含“不知道”） */
  effective: number
}

/** 根据全部回答重放贝叶斯更新，得到当前年龄概率分布 */
export function computePosterior(
  byId: Map<string, CompiledQuestion>,
  answers: AnswerRecord[],
  cfg: EngineConfig,
): Posterior {
  const logPost = createLogPrior(cfg)
  let effective = 0
  for (const a of answers) {
    const cq = byId.get(a.questionId)
    if (!cq) continue
    const idx = cq.question.options.findIndex((o) => o.id === a.optionId)
    const L = idx >= 0 ? cq.likelihoods[idx] : null
    // “不知道 / 没印象”：既不增加也不减少任何年龄的概率
    if (!L) continue
    applyEvidence(logPost, L, cfg.evidenceScale * cq.strength)
    effective++
  }
  return { probs: toProbabilities(logPost), effective }
}

/** 汇总分布：最可能年龄、可信区间、熵、是否多峰 */
export function summarize(probs: Float64Array, cfg: EngineConfig): AgeSummary {
  const n = probs.length
  // 轻度平滑后取 argmax，避免相邻年龄的偶然抖动
  const smooth = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const l = probs[Math.max(0, i - 1)]
    const r = probs[Math.min(n - 1, i + 1)]
    smooth[i] = 0.25 * l + 0.5 * probs[i] + 0.25 * r
  }
  let best = 0
  let mean = 0
  for (let i = 0; i < n; i++) {
    if (smooth[i] > smooth[best]) best = i
    mean += probs[i] * (cfg.minAge + i)
  }

  // 中心可信区间
  const tail = (1 - cfg.credibleMass) / 2
  let acc = 0
  let lowIdx = 0
  let highIdx = n - 1
  for (let i = 0; i < n; i++) {
    acc += probs[i]
    if (acc >= tail) {
      lowIdx = i
      break
    }
  }
  acc = 0
  for (let i = n - 1; i >= 0; i--) {
    acc += probs[i]
    if (acc >= tail) {
      highIdx = i
      break
    }
  }

  // 多峰检测：与主峰相距 ≥ 8 岁、高度超过主峰一半的局部极大值
  const peaks: number[] = [cfg.minAge + best]
  for (let i = 0; i < n; i++) {
    if (Math.abs(i - best) < 8) continue
    const isLocalMax =
      smooth[i] >= smooth[Math.max(0, i - 1)] &&
      smooth[i] >= smooth[Math.min(n - 1, i + 1)] &&
      smooth[i] > 0.5 * smooth[best]
    if (isLocalMax && peaks.every((p) => Math.abs(p - (cfg.minAge + i)) >= 8)) peaks.push(cfg.minAge + i)
  }

  return {
    guess: cfg.minAge + best,
    maxProb: probs[best],
    mean,
    low: cfg.minAge + lowIdx,
    high: cfg.minAge + highIdx,
    entropy: entropy(probs),
    peaks,
    multimodal: peaks.length > 1,
  }
}

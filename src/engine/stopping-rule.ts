import type { AgeSummary } from '@/types/result'
import type { EngineConfig } from './config'

export type StopReason = 'max-questions' | 'confident' | 'concentrated' | 'no-questions' | ''

export interface StopDecision {
  stop: boolean
  reason: StopReason
}

/**
 * 停止条件（PRD 6.7）：
 * 1. 已达到最大问题数
 * 2. 已达到最少问题数且最大年龄概率达到阈值
 * 3. 年龄区间已经足够集中
 * 4. 没有足够质量的可用问题（由选题器返回 null 触发）
 */
export function shouldStop(
  summary: AgeSummary,
  asked: number,
  effective: number,
  hasCandidate: boolean,
  cfg: EngineConfig,
): StopDecision {
  if (asked >= cfg.maxQuestions) return { stop: true, reason: 'max-questions' }
  if (!hasCandidate) return { stop: true, reason: 'no-questions' }
  if (asked >= cfg.minQuestions && effective >= cfg.minEffectiveAnswers && !summary.multimodal) {
    if (summary.maxProb >= cfg.confidenceThreshold) return { stop: true, reason: 'confident' }
    if (summary.high - summary.low <= cfg.concentratedWidth) return { stop: true, reason: 'concentrated' }
  }
  return { stop: false, reason: '' }
}

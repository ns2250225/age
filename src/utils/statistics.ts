import type { AnswerRecord } from '@/types/answer'
import { UNKNOWN_OPTION_ID } from '@/types/question'
import type { Rating } from '@/types/result'
import { KEYS, loadJSON, removeKey, saveJSON } from './storage'

// ---------------------------------------------------------------------
// 本机准确率统计：只保存聚合计数，不保存任何一次的真实年龄或答题轨迹
// ---------------------------------------------------------------------

export interface LocalStats {
  games: number
  /** 用户确认“猜对了”的局数 */
  hits: number
  /** 提供了真实年龄的局数及其绝对误差之和 */
  withAge: number
  absErrorSum: number
  tiers: Record<Exclude<Rating, 'unknown'>, number>
}

const EMPTY_STATS: LocalStats = {
  games: 0,
  hits: 0,
  withAge: 0,
  absErrorSum: 0,
  tiers: { exact: 0, close: 0, near: 0, miss: 0 },
}

export function loadStats(): LocalStats {
  const s = loadJSON<LocalStats>(KEYS.stats, EMPTY_STATS)
  return { ...EMPTY_STATS, ...s, tiers: { ...EMPTY_STATS.tiers, ...s.tiers } }
}

export function recordGame(correct: boolean, diff: number | null): LocalStats {
  const s = loadStats()
  s.games++
  if (correct) s.hits++
  if (diff !== null) {
    s.withAge++
    s.absErrorSum += Math.abs(diff)
    s.tiers[ratingOf(diff) as Exclude<Rating, 'unknown'>]++
  }
  saveJSON(KEYS.stats, s)
  return s
}

export function resetStats(): void {
  removeKey(KEYS.stats)
}

export function ratingOf(diff: number | null): Rating {
  if (diff === null) return 'unknown'
  const d = Math.abs(diff)
  if (d === 0) return 'exact'
  if (d <= 2) return 'close'
  if (d <= 5) return 'near'
  return 'miss'
}

// ---------------------------------------------------------------------
// 数据学习（PRD 第七章）
// MVP 不做在线学习：反馈计数只保存在当前会话（sessionStorage），不上传、
// 不回写题库。这里提供与后续匿名统计 API 一致的数据形态和平滑公式。
// ---------------------------------------------------------------------

/** key: `${questionId}|${answerId}|${age}` -> count */
export type FeedbackCounts = Record<string, number>

export function recordFeedback(answers: AnswerRecord[], age: number): void {
  const counts = loadJSON<FeedbackCounts>(KEYS.feedback, {}, 'session')
  for (const a of answers) {
    if (a.optionId === UNKNOWN_OPTION_ID) continue
    const key = `${a.questionId}|${a.optionId}|${age}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  saveJSON(KEYS.feedback, counts, 'session')
}

export function loadFeedback(): FeedbackCounts {
  return loadJSON<FeedbackCounts>(KEYS.feedback, {}, 'session')
}

/**
 * 贝叶斯平滑：P(R|A=a) = (Count(R,a) + α) / (Count(a) + αK)
 * @param countRA 年龄 a 的用户选择答案 R 的次数
 * @param countA  年龄 a 的用户对该题的总回答数
 * @param k       答案数量
 */
export function smoothedLikelihood(countRA: number, countA: number, k: number, alpha = 1): number {
  return (countRA + alpha) / (countA + alpha * k)
}

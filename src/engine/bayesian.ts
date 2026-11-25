import type { AgeLikelihood } from '@/types/question'
import { ageCount, type EngineConfig } from './config'

/** 初始对数先验 log P(A=a) */
export function createLogPrior(cfg: EngineConfig): Float64Array {
  const n = ageCount(cfg)
  const out = new Float64Array(n)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const w = cfg.prior ? Math.max(cfg.prior(cfg.minAge + i), 1e-9) : 1
    out[i] = w
    sum += w
  }
  for (let i = 0; i < n; i++) out[i] = Math.log(out[i] / sum)
  return out
}

/** 在稀疏的出生年份锚点之间线性插值，范围外取端点值 */
export function interpolateLikelihood(map: AgeLikelihood, birthYear: number): number {
  const years = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
  if (years.length === 0) return 1
  if (birthYear <= years[0]) return map[String(years[0])]
  const last = years[years.length - 1]
  if (birthYear >= last) return map[String(last)]
  for (let i = 1; i < years.length; i++) {
    if (birthYear <= years[i]) {
      const y0 = years[i - 1]
      const y1 = years[i]
      const t = (birthYear - y0) / (y1 - y0)
      return map[String(y0)] * (1 - t) + map[String(y1)] * t
    }
  }
  return map[String(last)]
}

/** 把“出生年份 -> 概率”展开为“年龄索引 -> 概率” */
export function compileLikelihood(map: AgeLikelihood, currentYear: number, cfg: EngineConfig): Float64Array {
  const n = ageCount(cfg)
  const years = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
  const values = years.map((y) => map[String(y)])
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const birth = currentYear - (cfg.minAge + i)
    let v: number
    if (birth <= years[0]) v = values[0]
    else if (birth >= years[years.length - 1]) v = values[values.length - 1]
    else {
      let k = 1
      while (years[k] < birth) k++
      const t = (birth - years[k - 1]) / (years[k] - years[k - 1])
      v = values[k - 1] * (1 - t) + values[k] * t
    }
    out[i] = v
  }
  return out
}

/** 贝叶斯更新（对数域，避免连乘下溢）：logPost += scale · log P(R|A) */
export function applyEvidence(logPost: Float64Array, likelihood: Float64Array, scale: number): void {
  for (let i = 0; i < logPost.length; i++) logPost[i] += scale * Math.log(likelihood[i])
}

/** 对数后验 -> 归一化概率（log-sum-exp） */
export function toProbabilities(logPost: Float64Array): Float64Array {
  let max = -Infinity
  for (let i = 0; i < logPost.length; i++) if (logPost[i] > max) max = logPost[i]
  const out = new Float64Array(logPost.length)
  let sum = 0
  for (let i = 0; i < logPost.length; i++) {
    out[i] = Math.exp(logPost[i] - max)
    sum += out[i]
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum
  return out
}

/** 信息熵 H(A)，单位 bit */
export function entropy(p: ArrayLike<number>): number {
  let h = 0
  for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * Math.log2(p[i])
  return h
}

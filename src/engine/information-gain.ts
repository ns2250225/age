import type { CompiledQuestion } from '@/types/question'
import { entropy } from './bayesian'

/**
 * 预期信息增益 IG(Q) = H(A) − E[H(A|Q)]
 * 回答出现的概率用原始似然计算，后验用与实际更新一致的缩放似然计算。
 */
export function expectedInformationGain(
  probs: Float64Array,
  cq: CompiledQuestion,
  evidenceScale: number,
  currentEntropy = entropy(probs),
): number {
  const n = probs.length
  const scale = evidenceScale * cq.strength
  const post = new Float64Array(n)
  let expected = 0
  let answerMass = 0

  for (const L of cq.likelihoods) {
    if (!L) continue
    let pAnswer = 0
    let z = 0
    for (let i = 0; i < n; i++) {
      pAnswer += probs[i] * L[i]
      const v = probs[i] * Math.pow(L[i], scale)
      post[i] = v
      z += v
    }
    if (pAnswer <= 0 || z <= 0) continue
    let h = 0
    for (let i = 0; i < n; i++) {
      const q = post[i] / z
      if (q > 0) h -= q * Math.log2(q)
    }
    expected += pAnswer * h
    answerMass += pAnswer
  }
  if (answerMass <= 0) return 0
  return Math.max(0, currentEntropy - expected / answerMass)
}

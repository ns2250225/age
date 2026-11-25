import { compileLikelihood } from '@/engine/bayesian'
import { ENGINE_CONFIG, ageCount, type EngineConfig } from '@/engine/config'
import type { CompiledQuestion, Question } from '@/types/question'
import { KEYS, loadJSON, saveJSON } from '@/utils/storage'

const FILES = ['toys', 'games', 'anime', 'internet', 'music', 'school', 'life', 'events']

/** 加载随网页静态发布的 JSON 题库 */
export async function fetchQuestionBank(): Promise<Question[]> {
  const base = import.meta.env.BASE_URL
  const lists = await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`${base}questions/${name}.json`)
      if (!res.ok) throw new Error(`题库 ${name}.json 加载失败（${res.status}）`)
      return (await res.json()) as Question[]
    }),
  )
  const seen = new Set<string>()
  return lists.flat().filter((q) => {
    // 题目 ID 必须唯一；结构不完整的题目直接丢弃
    if (!q?.id || seen.has(q.id) || !Array.isArray(q.options)) return false
    seen.add(q.id)
    return q.options.filter((o) => o.age_likelihood).length >= 2
  })
}

/** 展开似然表，并保证每个年龄上各选项概率之和为 1、且不低于下限 */
export function compileQuestion(q: Question, currentYear: number, cfg: EngineConfig = ENGINE_CONFIG): CompiledQuestion {
  const n = ageCount(cfg)
  const likelihoods = q.options.map((o) => (o.age_likelihood ? compileLikelihood(o.age_likelihood, currentYear, cfg) : null))
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (const L of likelihoods) {
      if (!L) continue
      L[i] = Math.max(L[i], cfg.likelihoodFloor)
      sum += L[i]
    }
    for (const L of likelihoods) if (L) L[i] /= sum
  }
  return { question: q, likelihoods, strength: (q.weight ?? 1) * (q.reliability ?? 1) }
}

export function compileBank(questions: Question[], disabled: Set<string>, cfg: EngineConfig = ENGINE_CONFIG): CompiledQuestion[] {
  const year = new Date().getFullYear()
  return questions.filter((q) => q.enabled !== false && !disabled.has(q.id)).map((q) => compileQuestion(q, year, cfg))
}

// 题库管理页的启用/停用状态保存在本机
export function loadDisabledIds(): Set<string> {
  return new Set(loadJSON<string[]>(KEYS.disabled, []))
}

export function saveDisabledIds(ids: Set<string>): void {
  saveJSON(KEYS.disabled, [...ids])
}

/** 出生年份 -> 该年份出生的人选择此答案的概率（稀疏锚点，引擎内线性插值） */
export type AgeLikelihood = Record<string, number>

export type QuestionType =
  | 'recognition' // A 是否认识
  | 'experience' // B 年代回忆
  | 'culture' // C 流行文化
  | 'school' // D 校园记忆
  | 'internet' // E 互联网记忆
  | 'knowledge' // F 知识判断

export interface QuestionOption {
  id: string
  text: string
  /** null 表示“不知道 / 没印象”，不参与推断 */
  age_likelihood: AgeLikelihood | null
  /** 经历深度：3 亲身经历，2 有接触，1 听说过，0 不知道 */
  level?: number
  /** 用作“决定性证据”的陈述句 */
  statement?: string
  /** 多选题中该选项对应的事物与流行年份 */
  thing?: string
  era?: number
}

export interface Question {
  id: string
  category: string
  type: QuestionType
  question: string
  thing?: string
  emoji?: string
  image?: string
  options: QuestionOption[]
  era?: { start: number; end: number }
  difficulty: number
  weight: number
  reliability?: number
  tags: string[]
  enabled: boolean
}

/** 已按当前年份展开为“年龄索引 -> 概率”的题目 */
export interface CompiledQuestion {
  question: Question
  /** 与 question.options 一一对应；“不知道”为 null */
  likelihoods: (Float64Array | null)[]
  /** weight × reliability */
  strength: number
}

export const UNKNOWN_OPTION_ID = 'unknown'

export type Rating = 'exact' | 'close' | 'near' | 'miss' | 'unknown'

export interface EvidenceItem {
  questionId: string
  statement: string
  question: string
  answer: string
  score: number
}

export interface StratumItem {
  thing: string
  level: number
}

export interface Stratum {
  decade: number
  /** 这个年代对应用户的人生阶段 */
  phase: string
  items: StratumItem[]
  strength: number
}

export interface AgeSummary {
  guess: number
  maxProb: number
  mean: number
  /** 可信区间（默认 80%） */
  low: number
  high: number
  entropy: number
  peaks: number[]
  multimodal: boolean
}

export interface GameResult {
  guess: number
  birthYear: number
  actualAge: number | null
  diff: number | null
  rating: Rating
  ratingTitle: string
  ratingText: string
  strata: Stratum[]
  evidence: EvidenceItem[]
  explanation: string[]
  distribution: number[]
  low: number
  high: number
  maxProb: number
  answered: number
  effective: number
}

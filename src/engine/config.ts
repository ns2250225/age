export interface EngineConfig {
  minAge: number
  maxAge: number
  minQuestions: number
  maxQuestions: number
  defaultQuestions: number
  maxGuesses: number
  /** 最大年龄概率达到该值即可猜测（需用真实数据校准，不等于准确率） */
  confidenceThreshold: number
  minEffectiveAnswers: number
  /** 证据缩放：题目之间并不独立，<1 可抑制过度自信 */
  evidenceScale: number
  likelihoodFloor: number
  /** 可信区间的概率质量 */
  credibleMass: number
  /** 可信区间宽度（岁）不超过该值视为“足够集中” */
  concentratedWidth: number
  /** 预期信息增益低于该值（bit）的题目视为无价值 */
  minInfoGain: number
  /** 可选的人口年龄先验；缺省为均匀分布 */
  prior?: (age: number) => number
}

export const ENGINE_CONFIG: EngineConfig = {
  minAge: 10,
  maxAge: 80,
  minQuestions: 8,
  maxQuestions: 20,
  defaultQuestions: 12,
  maxGuesses: 1,
  confidenceThreshold: 0.35,
  minEffectiveAnswers: 6,
  evidenceScale: 0.75,
  likelihoodFloor: 0.03,
  credibleMass: 0.8,
  concentratedWidth: 6,
  minInfoGain: 0.004,
}

export const ageCount = (cfg: EngineConfig) => cfg.maxAge - cfg.minAge + 1

export interface AnswerRecord {
  questionId: string
  optionId: string
  at: number
}

export type GamePhase = 'idle' | 'playing' | 'guessing' | 'feedback' | 'result'

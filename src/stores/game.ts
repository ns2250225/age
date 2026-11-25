import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { computePosterior, summarize } from '@/engine/age-inference'
import { ENGINE_CONFIG } from '@/engine/config'
import { selectNextQuestion } from '@/engine/question-selector'
import { shouldStop, type StopReason } from '@/engine/stopping-rule'
import { compileBank, fetchQuestionBank, loadDisabledIds, saveDisabledIds } from '@/services/question-service'
import { buildResult } from '@/services/result-service'
import type { AnswerRecord, GamePhase } from '@/types/answer'
import { UNKNOWN_OPTION_ID, type CompiledQuestion, type Question } from '@/types/question'
import type { GameResult } from '@/types/result'
import { setSoundEnabled } from '@/utils/sound'
import { loadStats, recordFeedback, recordGame, type LocalStats } from '@/utils/statistics'
import { KEYS, loadJSON, removeKey, saveJSON } from '@/utils/storage'

interface SavedGame {
  phase: GamePhase
  answers: AnswerRecord[]
  currentId: string | null
  guess: number | null
  guessCorrect: boolean | null
  stopReason: StopReason
  recorded: boolean
}

export const useGameStore = defineStore('game', () => {
  const cfg = ENGINE_CONFIG

  // ---- 题库 ----
  const bank = shallowRef<Question[]>([])
  const pool = shallowRef<CompiledQuestion[]>([])
  const disabledIds = ref<Set<string>>(loadDisabledIds())
  const loaded = ref(false)
  const loadError = ref('')
  let loading: Promise<void> | null = null

  const byId = computed(() => new Map(pool.value.map((cq) => [cq.question.id, cq])))

  // ---- 对局状态（存 localStorage，支持中断恢复）----
  const saved = loadJSON<SavedGame | null>(KEYS.game, null)
  const phase = ref<GamePhase>(saved?.phase ?? 'idle')
  const answers = ref<AnswerRecord[]>(saved?.answers ?? [])
  const currentId = ref<string | null>(saved?.currentId ?? null)
  const guess = ref<number | null>(saved?.guess ?? null)
  const guessCorrect = ref<boolean | null>(saved?.guessCorrect ?? null)
  const stopReason = ref<StopReason>(saved?.stopReason ?? '')
  const recorded = ref(saved?.recorded ?? false)
  // 真实年龄只保存在当前浏览器会话，不落盘、不上传
  const actualAge = ref<number | null>(loadJSON<number | null>(KEYS.actualAge, null, 'session'))

  const soundOn = ref(loadJSON<boolean>(KEYS.sound, true))
  setSoundEnabled(soundOn.value)
  const stats = ref<LocalStats>(loadStats())

  watch([phase, answers, currentId, guess, guessCorrect, stopReason, recorded], () => {
    const data: SavedGame = {
      phase: phase.value,
      answers: answers.value,
      currentId: currentId.value,
      guess: guess.value,
      guessCorrect: guessCorrect.value,
      stopReason: stopReason.value,
      recorded: recorded.value,
    }
    saveJSON(KEYS.game, data)
  })
  watch(actualAge, (v) => (v === null ? removeKey(KEYS.actualAge, 'session') : saveJSON(KEYS.actualAge, v, 'session')))
  watch(soundOn, (v) => {
    saveJSON(KEYS.sound, v)
    setSoundEnabled(v)
  })

  // ---- 推断 ----
  const posterior = computed(() => computePosterior(byId.value, answers.value, cfg))
  const summary = computed(() => summarize(posterior.value.probs, cfg))
  const currentQuestion = computed(() => (currentId.value ? (byId.value.get(currentId.value)?.question ?? null) : null))
  const questionNumber = computed(() => answers.value.length + 1)
  /** 进度条：前 12 题按默认题数估算，之后按上限估算 */
  const progress = computed(() => {
    const n = answers.value.length
    const total = n < cfg.defaultQuestions ? cfg.defaultQuestions : cfg.maxQuestions
    return Math.min(1, n / total)
  })
  const canResume = computed(() => phase.value !== 'idle' && answers.value.length + (currentId.value ? 1 : 0) > 0)

  const result = computed<GameResult | null>(() => {
    if (guess.value === null || !loaded.value) return null
    return buildResult(
      byId.value,
      answers.value,
      posterior.value.probs,
      summary.value,
      posterior.value.effective,
      guess.value,
      guessCorrect.value === true,
      actualAge.value,
      cfg,
    )
  })

  function selectorContext() {
    const history = answers.value.map((a) => byId.value.get(a.questionId)).filter((x): x is CompiledQuestion => !!x)
    const unknownByCategory: Record<string, number> = {}
    for (const a of answers.value) {
      if (a.optionId !== UNKNOWN_OPTION_ID) continue
      const cat = byId.value.get(a.questionId)?.question.category
      if (cat) unknownByCategory[cat] = (unknownByCategory[cat] ?? 0) + 1
    }
    return { probs: posterior.value.probs, history, unknownByCategory }
  }

  /** 选下一题；满足停止条件时转入最终猜测 */
  function advance(): void {
    const next = selectNextQuestion(pool.value, selectorContext(), cfg)
    const decision = shouldStop(summary.value, answers.value.length, posterior.value.effective, next !== null, cfg)
    if (decision.stop || !next) {
      stopReason.value = decision.reason || 'no-questions'
      currentId.value = null
      // 正式猜测只进行一次：一旦写入就不再改变
      if (guess.value === null) guess.value = summary.value.guess
      phase.value = 'guessing'
      return
    }
    currentId.value = next.question.id
  }

  function rebuildPool(): void {
    pool.value = compileBank(bank.value, disabledIds.value, cfg)
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return
    loading ??= (async () => {
      try {
        loadError.value = ''
        bank.value = await fetchQuestionBank()
        rebuildPool()
        loaded.value = true
        // 恢复对局时，题目可能已被停用或题库已更新
        if (phase.value === 'playing' && (!currentId.value || !byId.value.has(currentId.value))) advance()
      } catch (err) {
        loadError.value = err instanceof Error ? err.message : '题库加载失败'
      } finally {
        loading = null
      }
    })()
    await loading
  }

  function clearGame(): void {
    answers.value = []
    currentId.value = null
    guess.value = null
    guessCorrect.value = null
    actualAge.value = null
    stopReason.value = ''
    recorded.value = false
  }

  function start(): void {
    clearGame()
    phase.value = 'playing'
    advance()
  }

  function reset(): void {
    clearGame()
    phase.value = 'idle'
  }

  /** 记录答案。每道题只能提交一次。 */
  function answer(optionId: string): void {
    const q = currentQuestion.value
    if (phase.value !== 'playing' || !q) return
    if (answers.value.some((a) => a.questionId === q.id)) return
    if (!q.options.some((o) => o.id === optionId)) return
    answers.value = [...answers.value, { questionId: q.id, optionId, at: Date.now() }]
    advance()
  }

  function finish(): void {
    phase.value = 'result'
    if (recorded.value || guess.value === null) return
    recorded.value = true
    const correct = guessCorrect.value === true
    const known = correct ? guess.value : actualAge.value
    stats.value = recordGame(correct, known === null ? null : guess.value - known)
    if (known !== null) recordFeedback(answers.value, known)
  }

  function confirmGuess(correct: boolean): void {
    if (phase.value !== 'guessing') return
    guessCorrect.value = correct
    if (correct) finish()
    else phase.value = 'feedback'
  }

  /** 真实年龄反馈（自愿）。不会改变已经给出的本次猜测。 */
  function submitActualAge(age: number | null): void {
    if (phase.value !== 'feedback') return
    actualAge.value = age === null ? null : Math.min(120, Math.max(1, Math.round(age)))
    finish()
  }

  function setQuestionEnabled(id: string, enabled: boolean): void {
    const next = new Set(disabledIds.value)
    if (enabled) next.delete(id)
    else next.add(id)
    disabledIds.value = next
    saveDisabledIds(next)
    rebuildPool()
  }

  function refreshStats(): void {
    stats.value = loadStats()
  }

  return {
    cfg,
    bank,
    pool,
    disabledIds,
    loaded,
    loadError,
    phase,
    answers,
    guess,
    guessCorrect,
    actualAge,
    stopReason,
    soundOn,
    stats,
    posterior,
    summary,
    currentQuestion,
    questionNumber,
    progress,
    canResume,
    result,
    ensureLoaded,
    start,
    reset,
    answer,
    confirmGuess,
    submitActualAge,
    setQuestionEnabled,
    refreshStats,
  }
})

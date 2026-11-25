import type { EngineConfig } from '@/engine/config'
import type { AnswerRecord } from '@/types/answer'
import type { CompiledQuestion, Question, QuestionOption } from '@/types/question'
import type { AgeSummary, EvidenceItem, GameResult, Rating, Stratum } from '@/types/result'
import { ratingOf } from '@/utils/statistics'

const RATING_COPY: Record<Rating, { title: string; text: string }> = {
  exact: { title: '完全命中！', text: '一岁不差，你的记忆把你“出卖”得明明白白。' },
  close: { title: '非常接近', text: '只差一两岁，同一代人的记忆实在太像了。' },
  near: { title: '差一点', text: '方向是对的，只是你的记忆比同龄人更“超前”或更“怀旧”一些。' },
  miss: { title: '猜错了', text: '你的记忆跨越了不止一个年代，把我彻底绕晕了。' },
  unknown: { title: '猜错了', text: '这次没猜中。你的记忆轨迹和我预想的不太一样。' },
}

interface Answered {
  cq: CompiledQuestion
  q: Question
  opt: QuestionOption
  L: Float64Array | null
}

function resolve(byId: Map<string, CompiledQuestion>, answers: AnswerRecord[]): Answered[] {
  const out: Answered[] = []
  for (const a of answers) {
    const cq = byId.get(a.questionId)
    if (!cq) continue
    const idx = cq.question.options.findIndex((o) => o.id === a.optionId)
    if (idx < 0) continue
    out.push({ cq, q: cq.question, opt: cq.question.options[idx], L: cq.likelihoods[idx] })
  }
  return out
}

/** 决定性证据：这条回答让“猜测年龄”相对于其他年龄多出多少支持（对数似然比） */
function buildEvidence(answered: Answered[], guessIdx: number): EvidenceItem[] {
  const scored: EvidenceItem[] = []
  for (const { cq, q, opt, L } of answered) {
    if (!L) continue
    let mean = 0
    for (let i = 0; i < L.length; i++) mean += L[i]
    mean /= L.length
    let score = Math.log(L[guessIdx] / mean) * cq.strength
    // 亲身经历比“没听说过”更适合作为展示给用户的依据
    if ((opt.level ?? 0) >= 2) score *= 1.3
    scored.push({
      questionId: q.id,
      statement: opt.statement ?? `${q.question} —— ${opt.text}`,
      question: q.question,
      answer: opt.text,
      score,
    })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 3)
}

function lifePhase(ageAtDecade: number): string {
  if (ageAtDecade < 0) return '出生之前'
  if (ageAtDecade < 7) return '幼年时光'
  if (ageAtDecade < 13) return '童年'
  if (ageAtDecade < 19) return '校园少年'
  if (ageAtDecade < 31) return '青年时代'
  return '成年以后'
}

/** 用户最可能在哪一年接触到这件事物 */
function encounterYear(q: Question, opt: QuestionOption, birthYear: number): number | null {
  if (opt.era) return opt.era
  if (!q.era) return null
  const { start, end } = q.era
  const lo = Math.max(start, birthYear + 4)
  const hi = Math.min(end, birthYear + 26)
  if ((opt.level ?? 0) >= 2 && lo <= hi) return Math.round((lo + hi) / 2)
  return Math.round((start + Math.min(end, start + 12)) / 2)
}

/** 记忆的地层：按年代汇总用户有记忆的事物（完全不知道的不计入） */
function buildStrata(answered: Answered[], birthYear: number): Stratum[] {
  const map = new Map<number, Stratum>()
  for (const { q, opt, L } of answered) {
    const level = opt.level ?? 0
    if (!L || level < 1 || q.type === 'knowledge') continue
    const year = encounterYear(q, opt, birthYear)
    const thing = opt.thing ?? q.thing
    if (year === null || !thing) continue
    const decade = Math.floor(year / 10) * 10
    let s = map.get(decade)
    if (!s) {
      s = { decade, phase: lifePhase(decade + 5 - birthYear), items: [], strength: 0 }
      map.set(decade, s)
    }
    s.items.push({ thing, level })
    s.strength += level === 3 ? 3 : level === 2 ? 2 : 0.5
  }
  const strata = [...map.values()].sort((a, b) => a.decade - b.decade)
  for (const s of strata) s.items.sort((a, b) => b.level - a.level)
  return strata
}

function buildExplanation(
  answered: Answered[],
  strata: Stratum[],
  summary: AgeSummary,
  effective: number,
  cfg: EngineConfig,
): string[] {
  const lines: string[] = []
  const lived = strata.filter((s) => s.items.some((i) => i.level >= 2)).sort((a, b) => b.strength - a.strength)

  if (lived.length > 0) {
    const top = lived[0]
    const things = top.items
      .filter((i) => i.level >= 2)
      .slice(0, 3)
      .map((i) => `「${i.thing}」`)
      .join('、')
    let line = `你对 ${top.decade} 年代的记忆最扎实，${things}都是你亲身接触过的东西`
    const second = lived[1]
    if (second) line += `；同时 ${second.decade} 年代也在你身上留下了痕迹`
    lines.push(line + '。')
  } else {
    lines.push('你亲身经历过的选项不多，我主要是靠“你不知道什么”来反推的。')
  }

  const unfamiliar = answered.filter((a) => a.L && (a.opt.level ?? 0) === 0 && a.q.era && a.q.thing)
  const anchor = lived[0]?.decade
  if (anchor !== undefined) {
    const older = unfamiliar.filter((a) => a.q.era!.end < anchor).map((a) => a.q.thing!)
    const newer = unfamiliar.filter((a) => a.q.era!.start > anchor + 10).map((a) => a.q.thing!)
    if (older.length) lines.push(`而像「${older[0]}」这样更早的事物，你已经没有印象了，说明你的年纪没有那么大。`)
    if (newer.length) lines.push(`对「${newer[0]}」这类更新的流行，你也不太熟，说明你的成长期在它之前。`)
  }

  lines.push(
    `这些记忆共同指向 ${summary.low}～${summary.high} 岁这个区间，其中 ${summary.guess} 岁的可能性最高，所以我最终猜你是 ${summary.guess} 岁。`,
  )

  if (effective < cfg.minEffectiveAnswers || summary.multimodal || summary.maxProb < 0.12) {
    lines.push('不过这次的线索不算充分，你的记忆指向了不止一个年代，我只能挑可能性最高的那个来猜。')
  }
  lines.push('这只是一次基于流行文化记忆的娱乐性猜测，并不代表任何真实的“测龄”能力。')
  return lines
}

export function buildResult(
  byId: Map<string, CompiledQuestion>,
  answers: AnswerRecord[],
  probs: Float64Array,
  summary: AgeSummary,
  effective: number,
  guess: number,
  guessCorrect: boolean,
  actualAge: number | null,
  cfg: EngineConfig,
): GameResult {
  const answered = resolve(byId, answers)
  const birthYear = new Date().getFullYear() - guess
  const strata = buildStrata(answered, birthYear)
  const known = guessCorrect ? guess : actualAge
  const diff = known === null ? null : guess - known
  const rating = ratingOf(diff)

  return {
    guess,
    birthYear,
    actualAge: known,
    diff,
    rating,
    ratingTitle: RATING_COPY[rating].title,
    ratingText: RATING_COPY[rating].text,
    strata,
    evidence: buildEvidence(answered, guess - cfg.minAge),
    explanation: buildExplanation(answered, strata, { ...summary, guess }, effective, cfg),
    distribution: Array.from(probs),
    low: summary.low,
    high: summary.high,
    maxProb: summary.maxProb,
    answered: answers.length,
    effective,
  }
}

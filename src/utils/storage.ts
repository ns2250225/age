// 本地存储封装：隐私模式或被禁用时静默降级，页面仍可正常运行。

type Kind = 'local' | 'session'

function store(kind: Kind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function loadJSON<T>(key: string, fallback: T, kind: Kind = 'local'): T {
  try {
    const raw = store(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown, kind: Kind = 'local'): void {
  try {
    store(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* 存储不可用时忽略 */
  }
}

export function removeKey(key: string, kind: Kind = 'local'): void {
  try {
    store(kind)?.removeItem(key)
  } catch {
    /* 忽略 */
  }
}

export const KEYS = {
  game: 'mag:game',
  sound: 'mag:sound',
  disabled: 'mag:disabled-questions',
  stats: 'mag:stats',
  /** 以下两项只存在于 sessionStorage，关闭页面即清除 */
  actualAge: 'mag:actual-age',
  feedback: 'mag:feedback-counts',
} as const

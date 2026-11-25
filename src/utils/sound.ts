// 用 Web Audio 合成的轻量音效，无需任何音频文件。

type SoundName = 'select' | 'soft' | 'reveal' | 'success' | 'fail'

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ctx = Ctor ? new Ctor() : null
  } catch {
    ctx = null
  }
  return ctx
}

function tone(freq: number, start: number, duration: number, volume = 0.08, type: OscillatorType = 'sine'): void {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ac.currentTime + start
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

const SOUNDS: Record<SoundName, () => void> = {
  select: () => {
    tone(660, 0, 0.09)
    tone(880, 0.07, 0.12)
  },
  soft: () => tone(440, 0, 0.1, 0.05),
  reveal: () => [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.11, 0.22, 0.07, 'triangle')),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 0.08, 'triangle')),
  fail: () => {
    tone(330, 0, 0.18, 0.07, 'triangle')
    tone(262, 0.16, 0.28, 0.07, 'triangle')
  },
}

export function playSound(name: SoundName): void {
  if (!enabled) return
  try {
    const ac = audio()
    if (ac?.state === 'suspended') void ac.resume()
    SOUNDS[name]()
  } catch {
    /* 音频不可用时忽略 */
  }
}

import { toBlob } from 'html-to-image'
import QRCode from 'qrcode'

const FILE_NAME = '记忆猜年龄.png'

/** 游戏入口网址（去掉路由 hash） */
export function gameUrl(): string {
  return window.location.origin + window.location.pathname
}

export async function makeQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#292929', light: '#FFFFFF' } })
}

/** 把分享卡片 DOM 渲染为 PNG */
export async function renderPng(node: HTMLElement): Promise<Blob> {
  // 等字体就绪再截图，避免文字错位
  await document.fonts?.ready
  const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, backgroundColor: '#F7F5F0' })
  if (!blob) throw new Error('图片生成失败')
  return blob
}

export function downloadBlob(blob: Blob, name = FILE_NAME): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const canCopyImage = (): boolean =>
  typeof ClipboardItem !== 'undefined' && !!navigator.clipboard && 'write' in navigator.clipboard

export async function copyImage(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export const canSystemShare = (): boolean => typeof navigator.share === 'function'

/** 调用系统分享；支持时附带图片，否则只分享文字和链接。用户取消时返回 false */
export async function systemShare(blob: Blob | null, text: string): Promise<boolean> {
  const data: ShareData = { title: '记忆猜年龄', text, url: gameUrl() }
  if (blob) {
    const file = new File([blob], FILE_NAME, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) data.files = [file]
  }
  try {
    await navigator.share(data)
    return true
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return false
    throw err
  }
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // 非安全上下文下的兜底方案
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  if (!ok) throw new Error('复制失败')
}

/** 通用展示格式化 */

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatDateCn(value: string): string {
  const parts = String(value || '').split('-')
  if (parts.length !== 3) return value
  return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`
}

export function truncate(text: string, max = 40): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

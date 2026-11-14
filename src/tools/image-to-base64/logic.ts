/**
 * 图片转 Base64 纯函数逻辑。
 * 不依赖 uni / wx / DOM / Canvas，全部为字符串处理，便于 Node 环境单测。
 */

/** 结果文本预览的最大长度 */
export const MAX_DATA_URI_PREVIEW = 200

/** 允许的最大 Base64 字符数：1MB 图片约 1.33MB 文本，留一定余量 */
export const MAX_BASE64_CHARS = 1024 * 1024 * 2

/** 拼接 data URI；base64 为空返回空字符串，mime 为空回退到 image/png */
export function buildDataUri(mimeType: string, base64: string): string {
  const mime = typeof mimeType === 'string' && mimeType.trim() ? mimeType.trim() : 'image/png'
  const data = typeof base64 === 'string' ? base64 : ''
  if (!data) return ''
  return `data:${mime};base64,${data}`
}

/** 按后缀推断 MIME，忽略大小写与查询串；无法识别时返回 fallback */
export function guessMimeType(path: string, fallback = 'image/png'): string {
  if (typeof path !== 'string' || !path) return fallback
  const clean = path.split(/[?#]/)[0].toLowerCase()
  if (/\.jpe?g$/.test(clean)) return 'image/jpeg'
  if (/\.png$/.test(clean)) return 'image/png'
  if (/\.gif$/.test(clean)) return 'image/gif'
  if (/\.webp$/.test(clean)) return 'image/webp'
  if (/\.bmp$/.test(clean)) return 'image/bmp'
  return fallback
}

export interface Base64Description {
  /** 文本字符数 */
  chars: number
  /** 去掉补位符后按 4/3 换算的估算字节数 */
  bytes: number
  /** 是否以 = 补位 */
  padded: boolean
  /** 截断后的预览文本 */
  preview: string
}

/** 描述 Base64 文本：字符数、估算字节数、是否带补位符、截断预览 */
export function describeBase64(base64: string): Base64Description {
  const text = typeof base64 === 'string' ? base64 : ''
  const chars = text.length
  const padded = /=+$/.test(text)
  const core = text.replace(/=+$/, '')
  const bytes = Math.floor((core.length * 3) / 4)
  const preview =
    text.length > MAX_DATA_URI_PREVIEW ? text.slice(0, MAX_DATA_URI_PREVIEW) + '…' : text
  return { chars, bytes, padded, preview }
}

/** 校验 Base64 文本长度，过长给出中文提示；正常返回 null */
export function validateBase64Length(base64: string): string | null {
  const text = typeof base64 === 'string' ? base64 : ''
  if (text.length > MAX_BASE64_CHARS) {
    return 'Base64 文本过长，请选择 1MB 以内的图片'
  }
  return null
}

/** 生成 CSS background-image 声明，转义引号与反斜杠、换行，避免注入 */
export function buildCssBackground(dataUri: string): string {
  const value = typeof dataUri === 'string' ? dataUri : ''
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
  return `background-image: url("${escaped}")`
}

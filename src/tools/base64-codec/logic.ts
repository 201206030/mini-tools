import type { CalcResult } from '@/types/common'
import { utf8Decode, utf8Encode } from '@/utils/utf8'

const TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 限制单次处理长度，避免小程序内存与渲染压力 */
export const MAX_BASE64_INPUT = 200000

/** 文本 → Base64（按 UTF-8 字节编码，中文与 Emoji 均可正确处理） */
export function base64Encode(text: string): CalcResult<string> {
  if (!text) return { ok: false, message: '请输入要编码的文本' }
  if (text.length > MAX_BASE64_INPUT) return { ok: false, message: '文本过长，请缩短后重试' }

  const bytes = utf8Encode(text)
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    result += TABLE[b0 >> 2]
    result += TABLE[((b0 & 0x03) << 4) | (b1 >> 4)]
    result += i + 1 < bytes.length ? TABLE[((b1 & 0x0f) << 2) | (b2 >> 6)] : '='
    result += i + 2 < bytes.length ? TABLE[b2 & 0x3f] : '='
  }
  return { ok: true, value: result }
}

/** Base64 → 文本；兼容 URL-safe 字符（- 与 _）以及首尾空白 */
export function base64Decode(text: string): CalcResult<string> {
  if (!text || !text.trim()) return { ok: false, message: '请输入要解码的 Base64 内容' }
  if (text.length > MAX_BASE64_INPUT) return { ok: false, message: '内容过长，请缩短后重试' }

  let normalized = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return { ok: false, message: '包含非 Base64 字符，请检查输入内容' }
  }

  // 允许粘贴不带补位符的 Base64：先补齐到 4 的倍数
  const paddingIndex = normalized.indexOf('=')
  if (paddingIndex === -1) {
    const remainder = normalized.length % 4
    if (remainder === 1) return { ok: false, message: 'Base64 长度不合法，内容可能不完整' }
    normalized += '='.repeat(remainder === 0 ? 0 : 4 - remainder)
  } else if (normalized.length % 4 !== 0) {
    return { ok: false, message: 'Base64 长度不是 4 的倍数，内容可能不完整' }
  }

  // 去掉末尾补位符后，最后一组不足 4 个字符时自然只解出 1 或 2 个字节
  const body = normalized.replace(/=+$/, '')
  const bytes: number[] = []
  for (let i = 0; i < body.length; i += 4) {
    const c0 = TABLE.indexOf(body[i])
    const c1 = i + 1 < body.length ? TABLE.indexOf(body[i + 1]) : -1
    const c2 = i + 2 < body.length ? TABLE.indexOf(body[i + 2]) : -1
    const c3 = i + 3 < body.length ? TABLE.indexOf(body[i + 3]) : -1
    if (c0 < 0 || c1 < 0) return { ok: false, message: 'Base64 内容不完整' }
    bytes.push(((c0 << 2) | (c1 >> 4)) & 0xff)
    if (c2 >= 0) bytes.push(((c1 << 4) | (c2 >> 2)) & 0xff)
    if (c3 >= 0) bytes.push(((c2 << 6) | c3) & 0xff)
  }

  const decoded = utf8Decode(bytes)
  if (decoded === null) {
    return { ok: false, message: '解码结果不是有效的 UTF-8 文本' }
  }
  return { ok: true, value: decoded }
}

export function convertBase64(text: string, direction: 'encode' | 'decode'): CalcResult<string> {
  return direction === 'encode' ? base64Encode(text) : base64Decode(text)
}

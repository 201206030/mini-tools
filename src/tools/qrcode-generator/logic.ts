import qrcode from 'qrcode-generator'
import type { CalcResult } from '@/types/common'

export type EccLevel = 'L' | 'M' | 'Q' | 'H'

export interface ContactCard {
  name: string
  phone: string
  email: string
}

/** 内容长度上限：超过后二维码会过于密集，难以被普通手机识别 */
export const MAX_QR_CHARS = 800

/**
 * 纯 JS UTF-8 编码。
 * 按码点遍历，合并高低代理项以正确处理中文与 Emoji；孤立代理项替换为 U+FFFD。
 * 供 qrcode-generator 的 qrcode.stringToBytes 使用（整串调用）。
 */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00)
        i += 1
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd
    if (code <= 0x7f) {
      bytes.push(code)
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return bytes
}

/** 生成前的内容校验；返回中文错误或 null */
export function validateQrContent(text: string): string | null {
  if (!text || !text.trim()) return '请输入要生成二维码的内容'
  if (Array.from(text).length > MAX_QR_CHARS) {
    return `内容超过 ${MAX_QR_CHARS} 个字符，生成的二维码会过于密集、难以识别，请精简后重试`
  }
  return null
}

/** 生成二维码点阵；qrcode(0, ecc) 自动选择版本，make() 超容量时返回中文错误 */
export function createQrMatrix(
  text: string,
  ecc: EccLevel = 'M'
): CalcResult<{ size: number; modules: boolean[][] }> {
  const error = validateQrContent(text)
  if (error) return { ok: false, message: error }
  try {
    qrcode.stringToBytes = utf8Bytes
    const qr = qrcode(0, ecc)
    qr.addData(text, 'Byte')
    qr.make()
    const size = qr.getModuleCount()
    const modules: boolean[][] = []
    for (let row = 0; row < size; row += 1) {
      const line: boolean[] = []
      for (let col = 0; col < size; col += 1) line.push(qr.isDark(row, col))
      modules.push(line)
    }
    return { ok: true, value: { size, modules } }
  } catch {
    return { ok: false, message: '内容过长，已超出二维码容量，请精简内容后重试' }
  }
}

/** MECARD 字段值转义，避免分号、逗号等破坏结构 */
function escapeMecard(value: string): string {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/([\\;,:])/g, '\\$1')
}

/** 名片校验：至少填写姓名或电话 */
export function validateContactCard(card: ContactCard): string | null {
  if (!card.name.trim() && !card.phone.trim()) return '请至少填写姓名或电话'
  return null
}

/** 生成标准 MECARD 文本 */
export function buildContactCard(card: ContactCard): string {
  const name = escapeMecard(card.name.trim())
  const phone = escapeMecard(card.phone.trim())
  const email = escapeMecard(card.email.trim())
  return `MECARD:N:${name};TEL:${phone};EMAIL:${email};;`
}

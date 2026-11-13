import type { CalcResult } from '@/types/common'
import { utf8Decode, utf8Encode } from '@/utils/utf8'

export const MAX_URL_INPUT = 200000

/** RFC 3986 中不需要编码的字符 */
function isUnreserved(byte: number): boolean {
  return (
    (byte >= 0x41 && byte <= 0x5a) ||
    (byte >= 0x61 && byte <= 0x7a) ||
    (byte >= 0x30 && byte <= 0x39) ||
    byte === 0x2d ||
    byte === 0x2e ||
    byte === 0x5f ||
    byte === 0x7e
  )
}

function toHex(byte: number): string {
  return `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
}

/** 按 UTF-8 逐字节百分号编码；空格可切换为表单格式的 + */
export function urlEncode(text: string, spaceAsPlus = false): CalcResult<string> {
  if (!text) return { ok: false, message: '请输入要编码的内容' }
  if (text.length > MAX_URL_INPUT) return { ok: false, message: '内容过长，请缩短后重试' }
  const bytes = utf8Encode(text)
  let result = ''
  for (const byte of bytes) {
    if (isUnreserved(byte)) {
      result += String.fromCharCode(byte)
    } else if (spaceAsPlus && byte === 0x20) {
      result += '+'
    } else {
      result += toHex(byte)
    }
  }
  return { ok: true, value: result }
}

/**
 * 百分号解码。混合输入也支持：未编码的中文会先转成 UTF-8 字节再统一解码，
 * 避免逐字符解码把多字节字符拆坏。
 */
export function urlDecode(text: string, plusAsSpace = true): CalcResult<string> {
  if (!text) return { ok: false, message: '请输入要解码的内容' }
  if (text.length > MAX_URL_INPUT) return { ok: false, message: '内容过长，请缩短后重试' }

  const bytes: number[] = []
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '%') {
      const hex = text.slice(i + 1, i + 3)
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        return { ok: false, message: `第 ${i + 1} 个字符附近的 % 编码不完整` }
      }
      bytes.push(parseInt(hex, 16))
      i += 2
    } else if (char === '+' && plusAsSpace) {
      bytes.push(0x20)
    } else {
      const code = char.charCodeAt(0)
      if (code < 0x80) {
        bytes.push(code)
      } else {
        let raw = char
        // 处理 Emoji 等代理对
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
          raw += text[i + 1]
          i += 1
        }
        bytes.push(...utf8Encode(raw))
      }
    }
  }

  const decoded = utf8Decode(bytes)
  if (decoded === null) return { ok: false, message: '解码结果不是有效的 UTF-8 文本' }
  return { ok: true, value: decoded }
}

export function convertUrl(
  text: string,
  direction: 'encode' | 'decode',
  spaceAsPlus = true
): CalcResult<string> {
  return direction === 'encode' ? urlEncode(text, spaceAsPlus) : urlDecode(text, spaceAsPlus)
}

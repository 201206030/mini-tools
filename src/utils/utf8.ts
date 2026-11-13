/**
 * UTF-8 字节与字符串互转。
 *
 * 微信小程序运行环境没有浏览器的 btoa / atob，TextEncoder 也不保证所有基础库可用，
 * 因此 Base64 与 URL 百分号编码共用这一份纯 TypeScript 实现，确保中文与 Emoji 正确。
 */

/** 字符串转 UTF-8 字节数组，正确处理代理对（Emoji 等增补平面字符） */
export function utf8Encode(text: string): number[] {
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

/** UTF-8 字节数组转字符串；遇到非法序列返回 null，由调用方给出中文提示 */
export function utf8Decode(bytes: number[]): string | null {
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const first = bytes[i]
    let code: number
    let length: number
    if (first <= 0x7f) {
      code = first
      length = 1
    } else if (first >= 0xc0 && first <= 0xdf) {
      code = first & 0x1f
      length = 2
    } else if (first >= 0xe0 && first <= 0xef) {
      code = first & 0x0f
      length = 3
    } else if (first >= 0xf0 && first <= 0xf7) {
      code = first & 0x07
      length = 4
    } else {
      return null
    }

    if (i + length > bytes.length) return null
    for (let j = 1; j < length; j += 1) {
      const next = bytes[i + j]
      if ((next & 0xc0) !== 0x80) return null
      code = (code << 6) | (next & 0x3f)
    }
    if ((length === 2 && code < 0x80) || (length === 3 && code < 0x800) || (length === 4 && code < 0x10000)) {
      return null
    }
    if ((code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) return null

    if (code > 0xffff) {
      const offset = code - 0x10000
      result += String.fromCharCode(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff))
    } else {
      result += String.fromCharCode(code)
    }
    i += length
  }
  return result
}

import type { CalcResult } from '@/types/common'
import { utf8Decode, utf8Encode } from '@/utils/utf8'

export type UnicodeFormat = 'u4' | 'uBrace' | 'uPlus' | 'html' | 'decimal' | 'utf8'

export interface UnicodeItem {
  char: string
  codePoint: number
  output: string
}

export interface UnicodeEncodeResult {
  items: UnicodeItem[]
  result: string
}

const FORMATS: UnicodeFormat[] = ['u4', 'uBrace', 'uPlus', 'html', 'decimal', 'utf8']

/** 码点 → 形如 U+4E2D / U+1F600 的文本（不足 4 位补零） */
export function codePointText(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
}

/** 单个字符的 UTF-8 字节十六进制，如 E4 B8 AD */
export function utf8BytesText(char: string): string {
  return utf8Encode(char)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

function hex4(n: number): string {
  return n.toString(16).toUpperCase().padStart(4, '0')
}

/** u4 格式：BMP 用 4 位，增补平面拆成代理对两条 \uXXXX */
function u4Text(cp: number): string {
  if (cp <= 0xffff) return `\\u${hex4(cp)}`
  const offset = cp - 0x10000
  const hi = 0xd800 + (offset >> 10)
  const lo = 0xdc00 + (offset & 0x3ff)
  return `\\u${hex4(hi)}\\u${hex4(lo)}`
}

function formatCodePoint(char: string, cp: number, format: UnicodeFormat): string {
  switch (format) {
    case 'u4':
      return u4Text(cp)
    case 'uBrace':
      return `\\u{${cp.toString(16).toUpperCase()}}`
    case 'uPlus':
      return codePointText(cp)
    case 'html':
      return `&#x${cp.toString(16).toUpperCase()};`
    case 'decimal':
      return String(cp)
    case 'utf8':
      return utf8BytesText(char)
    default:
      return ''
  }
}

/**
 * 编码方向：按 Unicode 码点（Array.from）逐个转成目标格式，用空格连接。
 * 正确处理中文、Emoji（代理对）与组合字符。
 */
export function convertUnicode(text: string, format: UnicodeFormat): CalcResult<UnicodeEncodeResult> {
  if (!FORMATS.includes(format)) return { ok: false, message: '不支持的输出格式' }
  const source = String(text == null ? '' : text)
  if (source.length === 0) return { ok: false, message: '请输入要转换的文本' }

  const items: UnicodeItem[] = Array.from(source).map((char) => {
    const codePoint = char.codePointAt(0) || 0
    return { char, codePoint, output: formatCodePoint(char, codePoint, format) }
  })
  return { ok: true, value: { items, result: items.map((item) => item.output).join(' ') } }
}

/** 码点 → 字符串；越界或孤立代理项返回 null */
function codePointToString(cp: number): string | null {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return null
  if (cp >= 0xd800 && cp <= 0xdfff) return null
  return String.fromCodePoint(cp)
}

interface EscapeMatch {
  next: number
  /** 解析出的码点；-1 表示非法代理项序列 */
  cp: number
}

/** 在当前位置尝试匹配一种显式转义 / 实体写法 */
function matchEscape(src: string, i: number): EscapeMatch | null {
  const rest = src.slice(i)

  // \u{XXXX}
  let m = /^\\u\{([0-9a-fA-F]{1,6})\}/.exec(rest)
  if (m) return { next: i + m[0].length, cp: parseInt(m[1], 16) }

  // \uXXXX（含代理对合并）
  m = /^\\u([0-9a-fA-F]{4})/.exec(rest)
  if (m) {
    const high = parseInt(m[1], 16)
    if (high >= 0xd800 && high <= 0xdbff) {
      const low = /^\\u([0-9a-fA-F]{4})/.exec(rest.slice(m[0].length))
      if (!low) return { next: i + m[0].length, cp: -1 }
      const lowVal = parseInt(low[1], 16)
      if (lowVal < 0xdc00 || lowVal > 0xdfff) return { next: i + m[0].length, cp: -1 }
      const cp = 0x10000 + ((high - 0xd800) << 10) + (lowVal - 0xdc00)
      return { next: i + m[0].length + low[0].length, cp }
    }
    if (high >= 0xdc00 && high <= 0xdfff) return { next: i + m[0].length, cp: -1 }
    return { next: i + m[0].length, cp: high }
  }

  // U+XXXX
  m = /^U\+([0-9a-fA-F]{1,6})/i.exec(rest)
  if (m) return { next: i + m[0].length, cp: parseInt(m[1], 16) }

  // &#xXXXX;
  m = /^&#x([0-9a-fA-F]{1,6});/i.exec(rest)
  if (m) return { next: i + m[0].length, cp: parseInt(m[1], 16) }

  // &#NNNNN;
  m = /^&#([0-9]+);/.exec(rest)
  if (m) return { next: i + m[0].length, cp: parseInt(m[1], 10) }

  return null
}

/** 是否为某种显式转义的起始字符，用于切分裸 token */
function isEscapeStart(src: string, j: number): boolean {
  const c = src.charAt(j)
  if (c === '\\' || c === '&') return true
  if ((c === 'U' || c === 'u') && src.charAt(j + 1) === '+') return true
  return false
}

type Piece = { type: 'cp'; value: string } | { type: 'bare'; value: string }

/**
 * 解码方向：解析 \uXXXX、\u{XXXX}、U+XXXX、&#xXXXX;、&#NNNNN;、
 * 纯十进制数字序列与空格分隔的 UTF-8 字节，可混排，还原为字符串。
 *
 * 裸 token 的判定：只要出现一个含 A~F 字母的双位十六进制字节（非 ASCII 的
 * UTF-8 前导字节必然是 C~F 开头），整段裸 token 按 UTF-8 字节流解码；
 * 否则按十进制码点解码。两种编码对纯 ASCII 字节存在天然歧义，
 * 含非 ASCII 的 UTF-8（中文 / Emoji）与多位十进制码点均可无歧义还原。
 */
export function decodeUnicode(text: string): CalcResult<string> {
  const source = String(text == null ? '' : text).trim()
  if (!source) return { ok: false, message: '请输入要解码的内容' }

  const pieces: Piece[] = []
  let i = 0
  while (i < source.length) {
    if (/\s/.test(source.charAt(i))) {
      i += 1
      continue
    }
    const esc = matchEscape(source, i)
    if (esc) {
      if (esc.cp < 0) return { ok: false, message: '包含无效的 Unicode 代理项序列' }
      const s = codePointToString(esc.cp)
      if (s === null) return { ok: false, message: '包含超出范围的 Unicode 码点' }
      pieces.push({ type: 'cp', value: s })
      i = esc.next
      continue
    }
    let j = i
    while (j < source.length && !/\s/.test(source.charAt(j)) && !isEscapeStart(source, j)) {
      j += 1
    }
    if (j === i) j = i + 1 // 无法识别的起始字符，交由后续校验报错
    pieces.push({ type: 'bare', value: source.slice(i, j) })
    i = j
  }

  const bareTokens = pieces.filter((p) => p.type === 'bare').map((p) => p.value)
  const utf8Mode = bareTokens.some(
    (t) => /^[0-9a-fA-F]{2}$/.test(t) && /[a-fA-F]/.test(t)
  )

  let result = ''
  if (utf8Mode) {
    let buffer: number[] = []
    const flush = (): string | null => {
      if (buffer.length === 0) return ''
      const decoded = utf8Decode(buffer)
      buffer = []
      return decoded
    }
    for (const piece of pieces) {
      if (piece.type === 'cp') {
        const part = flush()
        if (part === null) return { ok: false, message: 'UTF-8 字节序列不完整或非法' }
        result += part + piece.value
      } else {
        if (!/^[0-9a-fA-F]{2}$/.test(piece.value)) {
          return { ok: false, message: 'UTF-8 字节必须是两位十六进制数' }
        }
        buffer.push(parseInt(piece.value, 16))
      }
    }
    const tail = flush()
    if (tail === null) return { ok: false, message: 'UTF-8 字节序列不完整或非法' }
    result += tail
  } else {
    for (const piece of pieces) {
      if (piece.type === 'cp') {
        result += piece.value
        continue
      }
      if (!/^\d+$/.test(piece.value)) {
        return { ok: false, message: '无法识别的内容，请检查输入格式' }
      }
      const s = codePointToString(Number(piece.value))
      if (s === null) return { ok: false, message: '十进制码点超出 Unicode 范围' }
      result += s
    }
  }
  return { ok: true, value: result }
}

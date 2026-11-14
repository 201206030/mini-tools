import type { CalcResult } from '@/types/common'

/** 支持的最小 / 最大进制 */
export const MIN_BASE = 2
export const MAX_BASE = 36

/** 0~35 对应的数码字符；输出小写时整体转小写即可 */
export const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** 进制的中文名称 */
export function describeBase(base: number): string {
  switch (base) {
    case 2:
      return '二进制'
    case 8:
      return '八进制'
    case 10:
      return '十进制'
    case 16:
      return '十六进制'
    default:
      return `${base} 进制`
  }
}

function checkBase(base: number): string | null {
  if (!Number.isInteger(base) || base < MIN_BASE || base > MAX_BASE) {
    return `进制必须是 ${MIN_BASE} 到 ${MAX_BASE} 之间的整数`
  }
  return null
}

/** 单个字符 → 数值；非法字符返回 -1（同时兼容大小写字母） */
function charValue(ch: string): number {
  const code = ch.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48 // 0-9
  if (code >= 65 && code <= 90) return code - 55 // A-Z → 10-35
  if (code >= 97 && code <= 122) return code - 87 // a-z → 10-35
  return -1
}

interface ParsedNumber {
  negative: boolean
  /** 高位在前的逐位数值，每项均在 0 ~ base-1 之间 */
  digits: number[]
}

/**
 * 解析 base 进制整数字符串：允许一个前导负号，逐字符校验。
 * 全程按字符串处理，不依赖 Number / BigInt，可表示任意长度的整数。
 */
function parseNumber(value: string, base: number): CalcResult<ParsedNumber> {
  const baseError = checkBase(base)
  if (baseError) return { ok: false, message: baseError }

  const raw = String(value == null ? '' : value).trim()
  if (raw.length === 0) return { ok: false, message: '请输入要转换的数值' }

  let negative = false
  let body = raw
  if (body.charAt(0) === '-') {
    negative = true
    body = body.slice(1)
  }
  if (body.length === 0) return { ok: false, message: '只有负号，缺少数值' }

  const digits: number[] = []
  for (const ch of body) {
    const d = charValue(ch)
    if (d < 0 || d >= base) {
      return { ok: false, message: `字符「${ch}」不是${describeBase(base)}的有效数字` }
    }
    digits.push(d)
  }
  return { ok: true, value: { negative, digits } }
}

/**
 * 把数值字符串解析成逐位数值（高位在前），用于需要按位处理的场景。
 * 会忽略开头的负号，仅返回各位的数字值；越界、空输入等仍按中文错误返回。
 */
export function digitsOf(value: string, base: number): CalcResult<number[]> {
  const parsed = parseNumber(value, base)
  if (!parsed.ok) return { ok: false, message: parsed.message }
  return { ok: true, value: parsed.value.digits }
}

function stripLeadingZeros(digits: number[]): number[] {
  let start = 0
  while (start < digits.length - 1 && digits[start] === 0) start += 1
  return digits.slice(start)
}

/**
 * 字符串重复除法核心：把「fromBase 进制的逐位数值」按位做长除法，
 * 每轮除以 toBase 取余得到一个目标进制位，商继续参与下一轮，直到商为 0。
 * 中间值最大不超过 MAX_BASE * MAX_BASE，全程只用 Number 的小整数运算，
 * 因此既不会溢出，也不依赖 BigInt，可支持 40 位以上的超长整数。
 */
function convertDigits(digits: number[], fromBase: number, toBase: number): number[] {
  let work = stripLeadingZeros(digits)
  if (work.length === 1 && work[0] === 0) return [0]
  if (fromBase === toBase) return work

  const out: number[] = []
  while (work.length > 0) {
    let remainder = 0
    const quotient: number[] = []
    for (let i = 0; i < work.length; i += 1) {
      const value = remainder * fromBase + work[i]
      const q = Math.floor(value / toBase)
      remainder = value % toBase
      // 去掉商的高位前导零
      if (quotient.length > 0 || q !== 0) quotient.push(q)
    }
    out.push(remainder)
    work = quotient
  }
  out.reverse()
  return out
}

/** 任意 2~36 进制整数互转，支持可选负号、超长整数与大写 / 小写输出 */
export function convertBase(
  value: string,
  fromBase: number,
  toBase: number,
  uppercase = true
): CalcResult<string> {
  const toError = checkBase(toBase)
  if (toError) return { ok: false, message: toError }

  const parsed = parseNumber(value, fromBase)
  if (!parsed.ok) return { ok: false, message: parsed.message }

  const targetDigits = convertDigits(parsed.value.digits, fromBase, toBase)
  const table = uppercase ? DIGITS : DIGITS.toLowerCase()
  let text = targetDigits.map((d) => table.charAt(d)).join('')

  // -0 统一按 0 输出，不保留负号
  const isZero = targetDigits.length === 1 && targetDigits[0] === 0
  if (parsed.value.negative && !isZero) text = `-${text}`
  return { ok: true, value: text }
}

import type { CalcResult } from '@/types/common'

/** 从大到小的罗马数字基本块，减法规则（IV、IX 等）已包含在内 */
const BLOCKS: Array<[string, number]> = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90],
  ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
]

/** 1 - 3999 的整数转罗马数字 */
export function toRoman(input: number | string): CalcResult<string> {
  const raw = String(input).trim()
  if (!/^\d+$/.test(raw)) return { ok: false, message: '请输入 1 到 3999 之间的整数' }
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    return { ok: false, message: '罗马数字标准写法只支持 1 到 3999 的整数' }
  }
  let rest = value
  let result = ''
  for (const [symbol, amount] of BLOCKS) {
    while (rest >= amount) {
      result += symbol
      rest -= amount
    }
  }
  return { ok: true, value: result }
}

/** 罗马数字转整数，并校验是否为规范写法（IIII、VX 等会被拒绝） */
export function fromRoman(text: string): CalcResult<number> {
  const normalized = text.trim().toUpperCase()
  if (!normalized) return { ok: false, message: '请输入罗马数字' }
  if (!/^[IVXLCDM]+$/.test(normalized)) {
    return { ok: false, message: '只能包含 I、V、X、L、C、D、M 七个字母' }
  }

  let rest = normalized
  let value = 0
  for (const [symbol, amount] of BLOCKS) {
    while (rest.startsWith(symbol)) {
      value += amount
      rest = rest.slice(symbol.length)
    }
  }
  if (rest.length > 0 || value < 1 || value > 3999) {
    return { ok: false, message: '不是规范的罗马数字写法' }
  }

  // 反向生成一次，拒绝 IIII、VX、LC 等非标准简写
  const canonical = toRoman(value)
  if (!canonical.ok || canonical.value !== normalized) {
    return { ok: false, message: '不是规范的罗马数字写法，例如 4 应写作 IV' }
  }
  return { ok: true, value }
}

export function convertRoman(text: string, direction: 'toRoman' | 'toArabic'): CalcResult<string> {
  if (direction === 'toRoman') return toRoman(text)
  const result = fromRoman(text)
  return result.ok ? { ok: true, value: String(result.value) } : result
}

export const ROMAN_EXAMPLES: Array<{ arabic: string; roman: string }> = [
  { arabic: '1', roman: 'I' },
  { arabic: '4', roman: 'IV' },
  { arabic: '9', roman: 'IX' },
  { arabic: '49', roman: 'XLIX' },
  { arabic: '99', roman: 'XCIX' },
  { arabic: '2026', roman: 'MMXXVI' },
  { arabic: '3999', roman: 'MMMCMXCIX' }
]

import { describe, expect, it } from 'vitest'
import {
  ROMAN_EXAMPLES,
  convertRoman,
  fromRoman,
  toRoman
} from '@/tools/roman-numeral/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('罗马数字转换', () => {
  it('典型数字与边界值', () => {
    expect(must(toRoman(1))).toBe('I')
    expect(must(toRoman(4))).toBe('IV')
    expect(must(toRoman(9))).toBe('IX')
    expect(must(toRoman(49))).toBe('XLIX')
    expect(must(toRoman(2026))).toBe('MMXXVI')
    expect(must(toRoman(3999))).toBe('MMMCMXCIX')
    expect(toRoman(0).ok).toBe(false)
    expect(toRoman(4000).ok).toBe(false)
    expect(toRoman('12.5').ok).toBe(false)
    expect(toRoman('abc').ok).toBe(false)
  })

  it('拒绝非规范写法与非法字符', () => {
    expect(fromRoman('IIII').ok).toBe(false)
    expect(fromRoman('VX').ok).toBe(false)
    expect(fromRoman('LC').ok).toBe(false)
    expect(fromRoman('ABC').ok).toBe(false)
    expect(fromRoman('').ok).toBe(false)
    expect(must(fromRoman('mmxxvi'))).toBe(2026)
  })

  it('1 到 3999 全部可往返', () => {
    for (let value = 1; value <= 3999; value += 1) {
      expect(must(fromRoman(must(toRoman(value))))).toBe(value)
    }
  })

  it('双向转换入口与示例表一致', () => {
    expect(must(convertRoman('99', 'toRoman'))).toBe('XCIX')
    expect(must(convertRoman('XCIX', 'toArabic'))).toBe('99')
    expect(ROMAN_EXAMPLES.length).toBeGreaterThan(0)
    for (const item of ROMAN_EXAMPLES) {
      expect(must(toRoman(Number(item.arabic)))).toBe(item.roman)
    }
  })
})

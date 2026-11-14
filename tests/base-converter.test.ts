import { describe, expect, it } from 'vitest'
import {
  MAX_BASE,
  MIN_BASE,
  DIGITS,
  convertBase,
  describeBase,
  digitsOf
} from '@/tools/base-converter/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('进制转换 · 常量与进制名称', () => {
  it('常量与数码表正确', () => {
    expect(MIN_BASE).toBe(2)
    expect(MAX_BASE).toBe(36)
    expect(DIGITS).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  })

  it('describeBase 覆盖常用进制与通用进制', () => {
    expect(describeBase(2)).toBe('二进制')
    expect(describeBase(8)).toBe('八进制')
    expect(describeBase(10)).toBe('十进制')
    expect(describeBase(16)).toBe('十六进制')
    expect(describeBase(32)).toBe('32 进制')
    expect(describeBase(36)).toBe('36 进制')
  })
})

describe('进制转换 · 正常与边界值', () => {
  it('常见进制互转结果正确', () => {
    expect(must(convertBase('13', 10, 2))).toBe('1101')
    expect(must(convertBase('1101', 2, 10))).toBe('13')
    expect(must(convertBase('255', 10, 16))).toBe('FF')
    expect(must(convertBase('FF', 16, 10))).toBe('255')
    expect(must(convertBase('1010', 2, 8))).toBe('12')
    expect(must(convertBase('777', 8, 10))).toBe('511')
    expect(must(convertBase('Z', 36, 10))).toBe('35')
  })

  it('支持 0、前导零与 -0 归一化', () => {
    expect(must(convertBase('0', 10, 2))).toBe('0')
    expect(must(convertBase('0', 16, 36))).toBe('0')
    expect(must(convertBase('000255', 10, 10))).toBe('255')
    expect(must(convertBase('-0', 10, 16))).toBe('0')
  })

  it('处理负号与大小写输出、大小写字母输入', () => {
    expect(must(convertBase('-13', 10, 2))).toBe('-1101')
    expect(must(convertBase('-FF', 16, 10))).toBe('-255')
    expect(must(convertBase('255', 10, 16, false))).toBe('ff')
    expect(must(convertBase('ff', 16, 10))).toBe('255')
    expect(must(convertBase('fF', 16, 10))).toBe('255')
    expect(must(convertBase('z', 36, 10))).toBe('35')
  })

  it('源进制与目标进制相同及边界进制 2 / 36', () => {
    expect(must(convertBase('10110', 2, 2))).toBe('10110')
    expect(must(convertBase('1Z', 36, 36))).toBe('1Z')
    expect(must(convertBase('10', 10, 36))).toBe('A')
    expect(must(convertBase('A', 36, 10))).toBe('10')
    expect(must(convertBase('35', 36, 2))).toBe('1110001') // 3*36+5=113
  })

  it('超长整数不受数字精度限制（字符串重复除法）', () => {
    // 2^40 的二进制是 1 后面 40 个 0
    expect(must(convertBase('1099511627776', 10, 2))).toBe('1' + '0'.repeat(40))
    expect(must(convertBase('1099511627776', 10, 16))).toBe('10000000000')

    const huge = '1234567890123456789012345678901234567890' // 40 位十进制
    const asBinary = must(convertBase(huge, 10, 2))
    expect(asBinary.length).toBeGreaterThan(120)
    expect(must(convertBase(asBinary, 2, 10))).toBe(huge)
    const asHex = must(convertBase(huge, 10, 16))
    expect(must(convertBase(asHex, 16, 10))).toBe(huge)
    const asBase36 = must(convertBase(huge, 10, 36))
    expect(must(convertBase(asBase36, 36, 10))).toBe(huge)
  })
})

describe('进制转换 · 非法输入与中文报错', () => {
  it('空输入、只有负号、内部空白均报错', () => {
    expect(convertBase('', 10, 2).ok).toBe(false)
    expect(convertBase('   ', 10, 2).ok).toBe(false)
    expect(convertBase('-', 10, 2).ok).toBe(false)
    expect(convertBase('1 0', 10, 2).ok).toBe(false)
    expect(convertBase('--1', 10, 2).ok).toBe(false)
  })

  it('非法字符按源进制校验', () => {
    expect(convertBase('2', 2, 10).ok).toBe(false) // 二进制没有 2
    expect(convertBase('G', 16, 10).ok).toBe(false) // 十六进制没有 G(16)
    expect(convertBase('Z', 10, 2).ok).toBe(false) // 十进制没有字母
    expect(convertBase('中文', 10, 2).ok).toBe(false)
    expect(convertBase('12.5', 10, 2).ok).toBe(false)
  })

  it('进制越界、非整数、NaN 均报错', () => {
    expect(convertBase('10', 1, 2).ok).toBe(false)
    expect(convertBase('10', 37, 2).ok).toBe(false)
    expect(convertBase('10', 10, 0).ok).toBe(false)
    expect(convertBase('10', 10, 40).ok).toBe(false)
    expect(convertBase('10', 10.5, 2).ok).toBe(false)
    expect(convertBase('10', 10, Number.NaN).ok).toBe(false)
  })

  it('报错文案均为中文', () => {
    const cases = [convertBase('', 10, 2), convertBase('-', 10, 2), convertBase('2', 2, 10), convertBase('10', 1, 2)]
    cases.forEach((r) => {
      expect(r.ok).toBe(false)
      if (!r.ok) expect(/[\u4e00-\u9fa5]/.test(r.message)).toBe(true)
    })
  })
})

describe('进制转换 · digitsOf 逐位解析', () => {
  it('返回高位在前的逐位数值', () => {
    expect(must(digitsOf('1A', 16))).toEqual([1, 10])
    expect(must(digitsOf('101', 2))).toEqual([1, 0, 1])
    expect(must(digitsOf('0', 10))).toEqual([0])
    expect(must(digitsOf('-1z', 36))).toEqual([1, 35])
    expect(must(digitsOf('007', 10))).toEqual([0, 0, 7])
  })

  it('非法输入一致报错', () => {
    expect(digitsOf('', 10).ok).toBe(false)
    expect(digitsOf('-', 10).ok).toBe(false)
    expect(digitsOf('2', 2).ok).toBe(false)
    expect(digitsOf('1', 37).ok).toBe(false)
  })
})

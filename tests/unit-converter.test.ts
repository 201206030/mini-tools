import { describe, expect, it } from 'vitest'
import {
  UNIT_CATEGORIES,
  convert,
  describeConversion,
  getUnitOptions
} from '@/tools/unit-converter/logic'
import { formatNumber, toFiniteNumber, roundTo, formatMoney } from '@/utils/number'

const value = (result: { ok: boolean; value?: number }): number => {
  expect(result.ok).toBe(true)
  return result.value as number
}

describe('单位换算 · 六类单位与关键换算关系', () => {
  it('注册 6 个分类且选项完整', () => {
    expect(UNIT_CATEGORIES.map((item) => item.id)).toEqual([
      'length',
      'weight',
      'area',
      'volume',
      'temperature',
      'data'
    ])
    expect(getUnitOptions('weight')).toHaveLength(6)
    expect(getUnitOptions('area')).toHaveLength(5)
    expect(getUnitOptions('不存在')).toEqual([])
  })

  it('1 斤 = 500 克，1 两 = 50 克，斤与千克互换', () => {
    expect(value(convert('weight', 'jin', 'g', 1))).toBe(500)
    expect(value(convert('weight', 'jin', 'kg', 2))).toBe(1)
    expect(value(convert('weight', 'liang', 'g', 1))).toBe(50)
    expect(value(convert('weight', 'g', 'jin', 1500))).toBe(3)
    expect(value(convert('weight', 't', 'kg', 1))).toBe(1000)
  })

  it('1 亩 ≈ 666.6667 平方米（2000/3）', () => {
    expect(value(convert('area', 'mu', 'm2', 1))).toBeCloseTo(666.6667, 3)
    expect(value(convert('area', 'm2', 'mu', 2000 / 3))).toBeCloseTo(1, 10)
    expect(value(convert('area', 'ha', 'm2', 1))).toBe(10000)
    expect(value(convert('area', 'km2', 'ha', 1))).toBe(100)
  })

  it('长度、容量、数据单位换算准确', () => {
    expect(value(convert('length', 'in', 'cm', 1))).toBe(2.54)
    expect(value(convert('length', 'km', 'm', 1.5))).toBe(1500)
    expect(value(convert('length', 'ft', 'm', 1))).toBe(0.3048)
    expect(value(convert('volume', 'l', 'ml', 2))).toBe(2000)
    expect(value(convert('volume', 'm3', 'l', 1))).toBe(1000)
    expect(value(convert('data', 'kb', 'b', 1))).toBe(1024)
    expect(value(convert('data', 'mb', 'kb', 1))).toBe(1024)
    expect(value(convert('data', 'gb', 'mb', 2))).toBe(2048)
  })

  it('温度使用独立公式，可负可零下', () => {
    expect(value(convert('temperature', 'c', 'f', 0))).toBe(32)
    expect(value(convert('temperature', 'c', 'f', 100))).toBe(212)
    expect(value(convert('temperature', 'f', 'c', 32))).toBe(0)
    expect(value(convert('temperature', 'f', 'c', 212))).toBe(100)
    expect(value(convert('temperature', 'c', 'f', -40))).toBe(-40)
    expect(convert('temperature', 'f', 'c', -10).ok).toBe(true)
  })

  it('同单位换算直接返回原值', () => {
    expect(value(convert('weight', 'g', 'g', 3.25))).toBe(3.25)
  })
})

describe('单位换算 · 非法输入与边界', () => {
  it('拦截空值、NaN、Infinity 与非数值', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const result = convert('weight', 'g', 'kg', bad)
      expect(result.ok).toBe(false)
    }
    expect((convert as any)('weight', 'g', 'kg', 'abc').ok).toBe(false)
    expect((convert as any)('weight', 'g', 'kg', null).ok).toBe(false)
  })

  it('物理量不允许负数，温度允许负数', () => {
    expect(convert('length', 'm', 'cm', -1).ok).toBe(false)
    expect(convert('weight', 'kg', 'g', -0.001).ok).toBe(false)
    expect(convert('temperature', 'c', 'f', -30).ok).toBe(true)
  })

  it('拦截不存在的分类或单位', () => {
    expect(convert('nope', 'g', 'kg', 1).ok).toBe(false)
    expect(convert('weight', 'nope', 'kg', 1).ok).toBe(false)
    expect(convert('weight', 'g', 'nope', 1).ok).toBe(false)
  })

  it('极大数值与计算溢出给出中文提示', () => {
    const big = convert('length', 'km', 'mm', Number.MAX_VALUE)
    expect(big.ok).toBe(false)
    if (!big.ok) expect(big.message).toContain('超出')
  })

  it('中文说明包含斤、亩、1024 与温度公式', () => {
    const text = describeConversion('area', 'mu', 'm2')
    expect(text).toContain('1 斤 = 500 克')
    expect(text).toContain('1 亩 ≈ 666.6667 平方米')
    expect(text).toContain('1 KB = 1024 B')
    expect(text).toContain('9 / 5')
    expect(describeConversion('nope', '', '')).toContain('请选择换算分类与单位')
    expect(describeConversion('weight', 'jin', 'g')).toContain('1 斤 = 500 克')
  })
})

describe('数值工具', () => {
  it('toFiniteNumber 严格解析并过滤非法内容', () => {
    expect(toFiniteNumber(' 1,234.5 ')).toBe(1234.5)
    expect(toFiniteNumber('-3.5e2')).toBe(-350)
    expect(toFiniteNumber('')).toBeNull()
    expect(toFiniteNumber('abc')).toBeNull()
    expect(toFiniteNumber('12abc')).toBeNull()
    expect(toFiniteNumber(Infinity)).toBeNull()
    expect(toFiniteNumber(undefined)).toBeNull()
  })

  it('formatNumber / roundTo / formatMoney 展示合理', () => {
    expect(formatNumber(2000 / 3)).toBe('666.6666667')
    expect(formatNumber(0)).toBe('0')
    expect(roundTo(1.005)).toBe(1.01)
    expect(formatMoney(1234567.891)).toBe('1,234,567.89')
    expect(formatMoney(-1234.5)).toBe('-1,234.50')
  })
})

import { describe, expect, it } from 'vitest'
import {
  calculateFraction,
  decimalToFraction,
  describeFraction,
  fractionText,
  gcd,
  normalize,
  parseFraction
} from '@/tools/fraction-calculator/logic'
import type { CalcResult } from '@/types/common'
import type { Fraction, FractionResult } from '@/tools/fraction-calculator/logic'

function expectFraction(result: CalcResult<Fraction>, numerator: number, denominator: number) {
  if (!result.ok) throw new Error(result.message)
  expect(result.value).toEqual({ numerator, denominator })
}

function fractionOf(result: CalcResult<FractionResult>): Fraction {
  if (!result.ok) throw new Error(result.message)
  return result.value.fraction
}

describe('分数约分与解析', () => {
  it('最大公约数与最简分数', () => {
    expect(gcd(12, 18)).toBe(6)
    expectFraction(normalize(2, 4), 1, 2)
    expectFraction(normalize(3, -4), -3, 4)
    expectFraction(normalize(-6, -8), 3, 4)
    expect(normalize(1, 0).ok).toBe(false)
    expect(fractionText({ numerator: -3, denominator: 4 })).toBe('-3/4')
    expect(fractionText({ numerator: 2, denominator: 1 })).toBe('2')
  })

  it('支持分数、带分数、小数、整数与百分数', () => {
    expectFraction(parseFraction('3/4'), 3, 4)
    expectFraction(parseFraction('-2/4'), -1, 2)
    expectFraction(parseFraction('1 1/2'), 3, 2)
    expectFraction(parseFraction('0.75'), 3, 4)
    expectFraction(parseFraction('75%'), 3, 4)
    expectFraction(parseFraction('5'), 5, 1)
    expect(parseFraction('').ok).toBe(false)
    expect(parseFraction('abc').ok).toBe(false)
    expect(parseFraction('1/0').ok).toBe(false)
  })
})

describe('分数四则运算与展示', () => {
  it('加减乘除自动约分', () => {
    const half = parseFraction('1/2')
    const third = parseFraction('1/3')
    if (!half.ok || !third.ok) throw new Error('解析失败')
    expect(fractionOf(calculateFraction(half.value, third.value, '+'))).toEqual({ numerator: 5, denominator: 6 })
    expect(fractionOf(calculateFraction(half.value, third.value, '-'))).toEqual({ numerator: 1, denominator: 6 })
    expect(fractionOf(calculateFraction(half.value, third.value, '*'))).toEqual({ numerator: 1, denominator: 6 })
    expect(fractionOf(calculateFraction(half.value, third.value, '/'))).toEqual({ numerator: 3, denominator: 2 })
  })

  it('除数为 0 时给出中文提示', () => {
    const left = parseFraction('1/2')
    const zero = parseFraction('0')
    if (!left.ok || !zero.ok) throw new Error('解析失败')
    const result = calculateFraction(left.value, zero.value, '/')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('除数')
  })

  it('带分数、小数与百分数展示', () => {
    const info = describeFraction({ numerator: 7, denominator: 4 }, '7/4')
    expect(info.text).toBe('7/4')
    expect(info.mixed).toBe('1 又 3/4')
    expect(info.decimal).toBe('1.75')
    expect(info.percent).toBe('175%')
    expect(info.expression).toBe('7/4')
    expect(describeFraction({ numerator: 1, denominator: 2 }).mixed).toBe('—')
  })

  it('小数转分数（连分数逼近）', () => {
    expectFraction(decimalToFraction('0.75'), 3, 4)
    expectFraction(decimalToFraction('3.14'), 157, 50)
    expectFraction(decimalToFraction('0'), 0, 1)
    expect(decimalToFraction('abc').ok).toBe(false)
    expect(decimalToFraction('1e12').ok).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { CalcResult } from '@/types/common'
import {
  MAX_PRIME_CHECK,
  MAX_RANGE_SPAN,
  describePrime,
  factorize,
  isPrime,
  primesInRange
} from '@/tools/prime-number/logic'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('isPrime', () => {
  it('正确处理 0、1、2、3、负数与非整数', () => {
    expect(isPrime(0)).toBe(false)
    expect(isPrime(1)).toBe(false)
    expect(isPrime(2)).toBe(true)
    expect(isPrime(3)).toBe(true)
    expect(isPrime(-2)).toBe(false)
    expect(isPrime(-7)).toBe(false)
    expect(isPrime(2.5)).toBe(false)
    expect(isPrime(NaN)).toBe(false)
    expect(isPrime(Infinity)).toBe(false)
    expect(isPrime(-Infinity)).toBe(false)
  })

  it('已知质数返回 true、合数返回 false', () => {
    for (const prime of [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 97, 7919, 104729]) {
      expect(isPrime(prime)).toBe(true)
    }
    for (const composite of [4, 6, 8, 9, 25, 49, 91, 100, 104730]) {
      expect(isPrime(composite)).toBe(false)
    }
  })

  it('接近数值上限的大合数判定正确', () => {
    expect(isPrime(MAX_PRIME_CHECK)).toBe(false)
    expect(isPrime(999999999)).toBe(false)
  })
})

describe('primesInRange', () => {
  it('基本区间结果正确，且起止值自动排序', () => {
    const ascending = must(primesInRange(1, 10))
    expect(ascending).toEqual({ primes: [2, 3, 5, 7], truncated: false, total: 4 })
    expect(must(primesInRange(10, 1))).toEqual(ascending)
  })

  it('分段筛结果与试除法逐数校验一致', () => {
    for (const [start, end] of [[100, 200], [1000, 1100], [-10, 50], [999999980, MAX_PRIME_CHECK]]) {
      const result = must(primesInRange(start, end))
      const expected: number[] = []
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      for (let n = lo; n <= hi; n += 1) if (isPrime(n)) expected.push(n)
      expect(result.primes).toEqual(expected)
      expect(result.total).toBe(expected.length)
      expect(result.truncated).toBe(false)
    }
  })

  it('小于 2 的区间返回空结果', () => {
    expect(must(primesInRange(-10, 1))).toEqual({ primes: [], truncated: false, total: 0 })
    expect(must(primesInRange(24, 28))).toEqual({ primes: [], truncated: false, total: 0 })
  })

  it('结果超过 limit 时截断并给出真实 total', () => {
    const result = must(primesInRange(1, 100, 3))
    expect(result.total).toBe(25)
    expect(result.truncated).toBe(true)
    expect(result.primes).toEqual([2, 3, 5])
    expect(must(primesInRange(1, 100, 500)).truncated).toBe(false)
  })

  it('跨度上限与数值上限给出中文错误', () => {
    const span = primesInRange(1, 1 + MAX_RANGE_SPAN + 1)
    expect(span.ok).toBe(false)
    if (!span.ok) expect(span.message).toContain('跨度')
    expect(must(primesInRange(1, 1 + MAX_RANGE_SPAN)).total).toBeGreaterThan(0)
    const over = primesInRange(MAX_PRIME_CHECK - 5, MAX_PRIME_CHECK + 1)
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.message).toContain('10 亿')
  })

  it('非法起止值与非法 limit 给出中文错误', () => {
    for (const bad of [1.5, NaN, Infinity, -Infinity]) {
      expect(primesInRange(bad, 10).ok).toBe(false)
      expect(primesInRange(1, bad).ok).toBe(false)
    }
    expect(primesInRange(1, 10, 0).ok).toBe(false)
    expect(primesInRange(1, 10, -1).ok).toBe(false)
    expect(primesInRange(1, 10, 2.5).ok).toBe(false)
    expect(primesInRange(1, 10, NaN).ok).toBe(false)
  })
})

describe('factorize', () => {
  it('60 与 1024 的分解式可读且统一使用上标', () => {
    const sixty = must(factorize(60))
    expect(sixty.factors).toEqual([2, 2, 3, 5])
    expect(sixty.expression).toBe('60 = 2² × 3 × 5')
    expect(sixty.isPrime).toBe(false)
    const power = must(factorize(1024))
    expect(power.factors).toEqual(Array(10).fill(2))
    expect(power.expression).toBe('1024 = 2¹⁰')
  })

  it('质数本身的分解结果标记 isPrime', () => {
    for (const n of [2, 3, 13, 97, 104729]) {
      const result = must(factorize(n))
      expect(result.factors).toEqual([n])
      expect(result.expression).toBe(`${n} = ${n}`)
      expect(result.isPrime).toBe(true)
    }
  })

  it('上限数值 10 亿可正确分解', () => {
    const result = must(factorize(MAX_PRIME_CHECK))
    expect(result.factors).toHaveLength(18)
    expect(result.expression).toBe('1000000000 = 2⁹ × 5⁹')
    expect(result.isPrime).toBe(false)
  })

  it('0、1、负数、小数、越界给出中文错误', () => {
    for (const bad of [0, 1, -12, 2.5, NaN, Infinity]) {
      const result = factorize(bad)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0)
    }
    const over = factorize(MAX_PRIME_CHECK + 1)
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.message).toContain('10 亿')
  })
})

describe('describePrime', () => {
  it('中文描述覆盖质数、合数、1、0、负数与越界', () => {
    expect(describePrime(1)).toBe('1 不是质数，也不算合数')
    expect(describePrime(0)).toContain('不是质数')
    expect(describePrime(-5)).toContain('不是质数')
    expect(describePrime(97)).toContain('是质数')
    expect(describePrime(60)).toContain('不是质数')
    expect(describePrime(60)).toContain('最小质因数是 2')
    expect(describePrime(2.5)).toContain('整数')
    expect(describePrime(MAX_PRIME_CHECK + 1)).toContain('10 亿')
  })
})

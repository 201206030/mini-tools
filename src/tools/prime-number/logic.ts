import type { CalcResult } from '@/types/common'

/** 数值上限：10 亿 */
export const MAX_PRIME_CHECK = 1000000000
/** 区间查询的最大跨度（终点 - 起点） */
export const MAX_RANGE_SPAN = 10000

export interface PrimeRangeResult {
  /** 实际展示的质数列表，最多 limit 个 */
  primes: number[]
  /** 质数总数超过 limit 时为 true */
  truncated: boolean
  /** 区间内质数的真实总数（不受 limit 影响） */
  total: number
}

export interface FactorizeResult {
  /** 从小到大排列的质因数，含重复，例如 60 → [2, 2, 3, 5] */
  factors: number[]
  /** 可读的分解式，例如 60 = 2² × 3 × 5 */
  expression: string
  /** 原数值本身是否为质数 */
  isPrime: boolean
}

/**
 * 试除法判质数（6k±1 优化）。
 * 0、1、负数、非整数、NaN、Infinity 一律返回 false。
 */
export function isPrime(n: number): boolean {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2) return false
  if (n === 2 || n === 3) return true
  if (n % 2 === 0 || n % 3 === 0) return false
  const limit = Math.floor(Math.sqrt(n))
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false
  }
  return true
}

/** 普通埃氏筛，求 2..limit 内的质数，用作分段筛的基础质数 */
function simpleSieve(limit: number): number[] {
  const composite = new Uint8Array(limit + 1)
  const primes: number[] = []
  for (let i = 2; i <= limit; i += 1) {
    if (!composite[i]) {
      primes.push(i)
      if (i * i <= limit) {
        for (let j = i * i; j <= limit; j += i) composite[j] = 1
      }
    }
  }
  return primes
}

/**
 * 用分段埃氏筛求 [start, end] 内的质数。
 * 起止值自动排序；跨度超过 MAX_RANGE_SPAN 或终点超过 MAX_PRIME_CHECK 返回中文错误。
 * 结果超过 limit 时只展示前 limit 个，并用 total 给出真实总数。
 */
export function primesInRange(
  start: number,
  end: number,
  limit = 500
): CalcResult<PrimeRangeResult> {
  if (
    !Number.isFinite(start) || !Number.isInteger(start) ||
    !Number.isFinite(end) || !Number.isInteger(end)
  ) {
    return { ok: false, message: '区间起止数值需要是整数' }
  }
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
    return { ok: false, message: '结果展示上限需为正整数' }
  }

  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  if (hi - lo > MAX_RANGE_SPAN) {
    return { ok: false, message: `区间跨度不能超过 ${MAX_RANGE_SPAN}，请缩小范围` }
  }
  if (hi > MAX_PRIME_CHECK) {
    return { ok: false, message: `数值上限为 ${MAX_PRIME_CHECK}（10 亿），请减小数值` }
  }
  if (hi < 2) {
    return { ok: true, value: { primes: [], truncated: false, total: 0 } }
  }

  const size = hi - lo + 1
  const composite = new Uint8Array(size)
  const basePrimes = simpleSieve(Math.floor(Math.sqrt(hi)))
  for (const p of basePrimes) {
    // 区间内第一个需要标记的 p 的倍数，至少从 p*p 开始（更小的倍数已由更小的质数标记）
    const firstMultiple = Math.max(p * p, Math.ceil(lo / p) * p)
    for (let m = firstMultiple; m <= hi; m += p) composite[m - lo] = 1
  }

  const primes: number[] = []
  const from = Math.max(lo, 2)
  for (let i = from; i <= hi; i += 1) {
    if (!composite[i - lo]) primes.push(i)
  }
  const total = primes.length
  return {
    ok: true,
    value: { primes: primes.slice(0, limit), truncated: total > limit, total }
  }
}

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
}

/** 指数统一转为上标数字，例如 10 → ¹⁰ */
function toSuperscript(exponent: number): string {
  return String(exponent)
    .split('')
    .map((digit) => SUPERSCRIPTS[digit] ?? digit)
    .join('')
}

/** 质因数分解，expression 形如 60 = 2² × 3 × 5 */
export function factorize(n: number): CalcResult<FactorizeResult> {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2) {
    return { ok: false, message: '请输入大于等于 2 的整数' }
  }
  if (n > MAX_PRIME_CHECK) {
    return { ok: false, message: `数值上限为 ${MAX_PRIME_CHECK}（10 亿），请减小数值` }
  }

  const factors: number[] = []
  let rest = n
  while (rest % 2 === 0) {
    factors.push(2)
    rest = rest / 2
  }
  for (let p = 3; p * p <= rest; p += 2) {
    while (rest % p === 0) {
      factors.push(p)
      rest = rest / p
    }
  }
  if (rest > 1) factors.push(rest)

  const groups: Array<{ prime: number; exponent: number }> = []
  for (const prime of factors) {
    const last = groups[groups.length - 1]
    if (last && last.prime === prime) last.exponent += 1
    else groups.push({ prime, exponent: 1 })
  }
  const parts = groups.map((group) =>
    group.exponent === 1
      ? String(group.prime)
      : `${group.prime}${toSuperscript(group.exponent)}`
  )

  return {
    ok: true,
    value: {
      factors,
      expression: `${n} = ${parts.join(' × ')}`,
      isPrime: factors.length === 1
    }
  }
}

/** 用自然中文描述一个整数是否为质数，并处理 1、0、负数与越界情况 */
export function describePrime(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n)) return '请输入有效整数'
  if (n > MAX_PRIME_CHECK) {
    return `数值上限为 ${MAX_PRIME_CHECK}（10 亿），请减小数值`
  }
  if (n < 2) {
    if (n === 1) return '1 不是质数，也不算合数'
    return '0 和负数不是质数'
  }
  if (isPrime(n)) return `${n} 是质数，只能被 1 和它本身整除`
  const outcome = factorize(n)
  if (!outcome.ok) return '无法分解该数值'
  return `${n} 不是质数（合数），最小质因数是 ${outcome.value.factors[0]}`
}

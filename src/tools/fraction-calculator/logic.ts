import type { CalcResult } from '@/types/common'

/** 分数：分母恒为正，符号放在分子上 */
export interface Fraction {
  numerator: number
  denominator: number
}

export type FractionOp = '+' | '-' | '*' | '/'

export interface FractionResult {
  fraction: Fraction
  /** 最简分数文本，整数直接显示整数 */
  text: string
  /** 带分数写法，非带分数时为「—」 */
  mixed: string
  decimal: string
  percent: string
  expression: string
}

/** 分子/分母上限，防止连乘超出安全整数范围 */
const MAX_PART = Number.MAX_SAFE_INTEGER

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a))
  let y = Math.abs(Math.trunc(b))
  while (y !== 0) {
    const rest = x % y
    x = y
    y = rest
  }
  return x || 1
}

/** 约分并保证分母为正；分母为 0 或数值越界时给出中文提示 */
export function normalize(numerator: number, denominator: number): CalcResult<Fraction> {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return { ok: false, message: '请输入有效的数字' }
  }
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    return { ok: false, message: '数值过大或不是整数，请缩小分子分母' }
  }
  if (denominator === 0) {
    return { ok: false, message: '分母不能为 0' }
  }
  let n = numerator
  let d = denominator
  if (d < 0) {
    n = -n
    d = -d
  }
  const divisor = gcd(n, d)
  n = n / divisor
  d = d / divisor
  if (Math.abs(n) > MAX_PART || d > MAX_PART) {
    return { ok: false, message: '数值过大，请缩小分子分母后重试' }
  }
  return { ok: true, value: { numerator: n, denominator: d } }
}

/**
 * 解析输入，支持：
 *   普通分数 3/4、-3/4；带分数 1 1/2；小数 0.75、-2.5；整数 5；百分数 75%
 */
export function parseFraction(text: string): CalcResult<Fraction> {
  const raw = text.trim()
  if (!raw) return { ok: false, message: '请输入分数或小数' }

  const isPercent = raw.endsWith('%')
  const body = (isPercent ? raw.slice(0, -1) : raw).trim()
  if (!body) return { ok: false, message: '请输入分数或小数' }

  const mixed = /^(-?)(\d+)\s+(\d+)\/(\d+)$/.exec(body)
  if (mixed) {
    const sign = mixed[1] === '-' ? -1 : 1
    const whole = Number(mixed[2])
    const numerator = Number(mixed[3])
    const denominator = Number(mixed[4])
    return normalize(sign * (whole * denominator + numerator), denominator * (isPercent ? 100 : 1))
  }

  const simple = /^(-?)(\d+)\/(\d+)$/.exec(body)
  if (simple) {
    const sign = simple[1] === '-' ? -1 : 1
    return normalize(sign * Number(simple[2]), Number(simple[3]) * (isPercent ? 100 : 1))
  }

  const decimal = /^(-?)(\d+)(?:\.(\d+))?$/.exec(body)
  if (decimal) {
    const decimals = decimal[3] || ''
    if (decimals.length > 12) return { ok: false, message: '小数位数过多，最多支持 12 位' }
    const scale = Math.pow(10, decimals.length)
    const sign = decimal[1] === '-' ? -1 : 1
    const numerator = sign * (Number(decimal[2]) * scale + (decimals ? Number(decimals) : 0))
    return normalize(numerator, scale * (isPercent ? 100 : 1))
  }

  return { ok: false, message: '格式不正确，可输入 3/4、1 1/2、0.75 或 75%' }
}

/** 浮点结果格式化，避免 0.3333333333333333 这类长尾 */
function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(8)))
}

export function fractionText(fraction: Fraction): string {
  return fraction.denominator === 1 ? String(fraction.numerator) : `${fraction.numerator}/${fraction.denominator}`
}

/** 由分数生成界面所需的全部展示文本 */
export function describeFraction(fraction: Fraction, expression?: string): FractionResult {
  const { numerator, denominator } = fraction
  const value = numerator / denominator
  const whole = Math.trunc(numerator / denominator)
  const rest = Math.abs(numerator) % denominator
  const mixed =
    denominator !== 1 && Math.abs(numerator) >= denominator && rest !== 0
      ? `${whole} 又 ${rest}/${denominator}`
      : '—'
  return {
    fraction,
    text: fractionText(fraction),
    mixed,
    decimal: formatDecimal(value),
    percent: `${formatDecimal(value * 100)}%`,
    expression: expression || fractionText(fraction)
  }
}

export function calculateFraction(
  left: Fraction,
  right: Fraction,
  op: FractionOp
): CalcResult<FractionResult> {
  let numerator = 0
  let denominator = 1

  if (op === '+') {
    numerator = left.numerator * right.denominator + right.numerator * left.denominator
    denominator = left.denominator * right.denominator
  } else if (op === '-') {
    numerator = left.numerator * right.denominator - right.numerator * left.denominator
    denominator = left.denominator * right.denominator
  } else if (op === '*') {
    numerator = left.numerator * right.numerator
    denominator = left.denominator * right.denominator
  } else {
    if (right.numerator === 0) return { ok: false, message: '除数不能为 0' }
    numerator = left.numerator * right.denominator
    denominator = left.denominator * right.numerator
  }

  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    return { ok: false, message: '计算过程数值过大，请缩小分子分母' }
  }
  const reduced = normalize(numerator, denominator)
  if (!reduced.ok) return reduced
  const expression = `${fractionText(left)} ${op} ${fractionText(right)} = ${fractionText(reduced.value)}`
  return { ok: true, value: describeFraction(reduced.value, expression) }
}

/**
 * 小数转分数：用连分数展开找最佳有理逼近，分母默认不超过 10000。
 * 对 0.75、3.14、0.3333 这类输入都能给出可读结果。
 */
export function decimalToFraction(text: string, maxDenominator = 10000): CalcResult<Fraction> {
  const value = Number(text.trim())
  if (!Number.isFinite(value)) return { ok: false, message: '请输入有效的小数' }
  if (value === 0) return normalize(0, 1)
  if (Math.abs(value) >= 1e9) return { ok: false, message: '数值过大，请输入绝对值小于 10 亿的数' }

  const sign = value < 0 ? -1 : 1
  let x = Math.abs(value)
  let h0 = 0
  let k0 = 1
  let h1 = 1
  let k1 = 0
  let bestNumerator = sign
  let bestDenominator = 1
  let bestError = Infinity

  for (let i = 0; i < 32; i += 1) {
    const integerPart = Math.floor(x)
    const h2 = integerPart * h1 + h0
    const k2 = integerPart * k1 + k0
    if (k2 > maxDenominator || !Number.isSafeInteger(h2) || !Number.isSafeInteger(k2)) break
    h0 = h1
    k0 = k1
    h1 = h2
    k1 = k2
    const error = Math.abs(h1 / k1 - Math.abs(value))
    if (error < bestError) {
      bestError = error
      bestNumerator = sign * h1
      bestDenominator = k1
    }
    const rest = x - integerPart
    if (rest < 1e-12 || error < 1e-12) break
    x = 1 / rest
  }

  return normalize(bestNumerator, bestDenominator)
}

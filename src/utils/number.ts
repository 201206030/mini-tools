/** 数值解析与展示工具 */

/** 把任意输入转换为有限数值；空串、NaN、Infinity 均返回 null */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim().replace(/,/g, '')
  if (!text) return null
  // 只允许普通十进制数（含科学计数法）
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null
  const result = Number(text)
  return Number.isFinite(result) ? result : null
}

export function toInteger(value: unknown): number | null {
  const result = toFiniteNumber(value)
  return result === null ? null : Math.trunc(result)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 去掉浮点尾噪，保留合理有效位数；极端大小用科学计数法 */
export function formatNumber(value: number, significant = 10): string {
  if (!Number.isFinite(value)) return '超出可计算范围'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e16 || abs < 1e-6) return value.toExponential(4).replace('e+', 'e')
  const digits = clamp(Math.round(significant), 1, 15)
  const rounded = Number(value.toPrecision(digits))
  return String(rounded)
}

export function roundTo(value: number, digits = 2): number {
  const factor = Math.pow(10, digits)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function addThousandSeparators(value: string): string {
  const parts = value.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/** 金额格式化：默认两位小数并加千分位 */
export function formatMoney(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  const fixed = Math.abs(value).toFixed(digits)
  return (value < 0 ? '-' : '') + addThousandSeparators(fixed)
}

/** 大数运算的溢出防护 */
export function isSafeAmount(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= 1e12
}

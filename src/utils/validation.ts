import { toFiniteNumber, toInteger } from './number'

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === ''
}

export function parseRequiredNumber(value: unknown, label: string): { value?: number; error?: string } {
  if (isBlank(value)) return { error: `请填写${label}` }
  const parsed = toFiniteNumber(value)
  if (parsed === null) return { error: `${label}请输入有效数字` }
  return { value: parsed }
}

export function parseOptionalNumber(value: unknown, label: string, fallback = 0): { value: number; error?: string } {
  if (isBlank(value)) return { value: fallback }
  const parsed = toFiniteNumber(value)
  if (parsed === null) return { value: fallback, error: `${label}请输入有效数字` }
  return { value: parsed }
}

export function parseInteger(value: unknown, label: string): { value?: number; error?: string } {
  if (isBlank(value)) return { error: `请填写${label}` }
  const parsed = toInteger(value)
  if (parsed === null) return { error: `${label}请输入有效整数` }
  return { value: parsed }
}

/** 通用区间校验，返回中文错误文案 */
export function validateRange(value: number, min: number, max: number, label: string): string | null {
  if (!Number.isFinite(value)) return `${label}请输入有效数字`
  if (value < min) return `${label}不能小于 ${min}`
  if (value > max) return `${label}不能大于 ${max}`
  return null
}

export function validateIntegerRange(value: number, min: number, max: number, label: string): string | null {
  if (!Number.isInteger(value)) return `${label}必须是整数`
  return validateRange(value, min, max, label)
}

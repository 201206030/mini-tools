import { describe, expect, it } from 'vitest'
import { calcBmi, type BmiResult, type BmiStandard } from '@/tools/bmi-calculator/logic'

function ok(heightCm: number, weightKg: number, standard: BmiStandard): BmiResult {
  const result = calcBmi(heightCm, weightKg, standard)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('BMI 计算器 · 正常值与分类', () => {
  it('中国标准：BMI、正常区间、理想体重与无需增减', () => {
    const r = ok(170, 65, 'cn')
    expect(r.bmi).toBeCloseTo(22.5, 5)
    expect(r.category).toBe('正常')
    expect(r.standard).toBe('cn')
    expect(r.standardName).toBe('中国成人标准')
    expect(r.normalRange).toBe('18.5 ~ 23.9')
    expect(r.normalMin).toBe(18.5)
    expect(r.normalMax).toBe(23.9)
    expect(r.idealMinKg).toBeCloseTo(53.5, 5)
    expect(r.idealMaxKg).toBeCloseTo(69.1, 5)
    expect(r.adjustKg).toBe(0)
    expect(r.adjustText).toContain('体重在正常范围')
  })

  it('WHO 标准：正常区间与理想体重上限不同', () => {
    const r = ok(170, 65, 'who')
    expect(r.bmi).toBeCloseTo(22.5, 5)
    expect(r.category).toBe('正常')
    expect(r.standardName).toBe('WHO 国际标准')
    expect(r.normalRange).toBe('18.5 ~ 24.9')
    expect(r.idealMinKg).toBeCloseTo(53.5, 5)
    expect(r.idealMaxKg).toBeCloseTo(72, 5)
  })

  it('BMI 保留 1 位小数', () => {
    expect(ok(175, 70, 'cn').bmi).toBeCloseTo(22.9, 5)
  })

  it('中国标准四档分类边界', () => {
    expect(ok(100, 18, 'cn').category).toBe('偏瘦')
    expect(ok(100, 18.5, 'cn').category).toBe('正常')
    expect(ok(100, 23.9, 'cn').category).toBe('正常')
    expect(ok(100, 24, 'cn').category).toBe('超重')
    expect(ok(100, 27.9, 'cn').category).toBe('超重')
    expect(ok(100, 28, 'cn').category).toBe('肥胖')
  })

  it('WHO 标准四档分类边界', () => {
    expect(ok(100, 18.4, 'who').category).toBe('偏瘦')
    expect(ok(100, 18.5, 'who').category).toBe('正常')
    expect(ok(100, 24.9, 'who').category).toBe('正常')
    expect(ok(100, 25, 'who').category).toBe('超重')
    expect(ok(100, 29.9, 'who').category).toBe('超重')
    expect(ok(100, 30, 'who').category).toBe('肥胖')
  })

  it('超重给出减重建议，偏瘦给出增重建议', () => {
    const heavy = ok(100, 30, 'cn')
    expect(heavy.category).toBe('肥胖')
    expect(heavy.adjustKg).toBeCloseTo(-6.1, 5)
    expect(heavy.adjustText).toContain('减重')

    const thin = ok(100, 10, 'cn')
    expect(thin.category).toBe('偏瘦')
    expect(thin.adjustKg).toBeCloseTo(8.5, 5)
    expect(thin.adjustText).toContain('增重')
  })
})

describe('BMI 计算器 · 边界值与非法输入', () => {
  it('身高与体重范围边界可通过', () => {
    expect(ok(50, 2, 'cn').bmi).toBeCloseTo(8, 5)
    expect(ok(250, 400, 'cn').bmi).toBeCloseTo(64, 5)
    expect(ok(170, 2, 'who').bmi).toBeGreaterThan(0)
    expect(ok(170, 400, 'who').bmi).toBeGreaterThan(0)
  })

  it('拦截越界的身高与体重', () => {
    expect(calcBmi(49.9, 65, 'cn').ok).toBe(false)
    expect(calcBmi(250.1, 65, 'cn').ok).toBe(false)
    expect(calcBmi(170, 1.9, 'cn').ok).toBe(false)
    expect(calcBmi(170, 400.1, 'cn').ok).toBe(false)
  })

  it('拦截空值、非有限数字与非法字符串', () => {
    expect(calcBmi(NaN, 65, 'cn').ok).toBe(false)
    expect(calcBmi(Infinity, 65, 'cn').ok).toBe(false)
    expect(calcBmi(-Infinity, 65, 'cn').ok).toBe(false)
    expect(calcBmi(170, NaN, 'cn').ok).toBe(false)
    expect(calcBmi(170, Infinity, 'cn').ok).toBe(false)
    expect(calcBmi(null as any, 65, 'cn').ok).toBe(false)
    expect(calcBmi(undefined as any, 65, 'cn').ok).toBe(false)
    expect(calcBmi('' as any, 65, 'cn').ok).toBe(false)
    expect(calcBmi('   ' as any, 65, 'cn').ok).toBe(false)
    expect(calcBmi('abc' as any, 65, 'cn').ok).toBe(false)
    expect(calcBmi(170, '' as any, 'cn').ok).toBe(false)
  })

  it('拦截非法标准，并给出中文错误文案', () => {
    const invalid = calcBmi(170, 65, 'xx' as any)
    expect(invalid.ok).toBe(false)

    const error = calcBmi(0, 65, 'cn')
    expect(error.ok).toBe(false)
    if (!error.ok) expect(error.message.length).toBeGreaterThan(0)
  })
})

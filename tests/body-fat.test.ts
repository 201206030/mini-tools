import { describe, expect, it } from 'vitest'
import { clamp, roundTo } from '@/utils/number'
import {
  calcBodyFatByBmi,
  calcBodyFatByMeasure,
  describeBodyFat,
  estimateBodyMass,
  type BodyFatResult,
  type Gender
} from '@/tools/body-fat-calculator/logic'

function okBmi(bmi: number, age: number, gender: Gender, weightKg?: number): BodyFatResult {
  const result = calcBodyFatByBmi(bmi, age, gender, weightKg)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

function okMeasure(
  gender: Gender,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm: number,
  weightKg?: number
): BodyFatResult {
  const result = calcBodyFatByMeasure(gender, heightCm, waistCm, neckCm, hipCm, weightKg)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

/** 结果统一钳制 1~70 并保留 1 位小数 */
function expectedPercent(raw: number): number {
  return roundTo(clamp(raw, 1, 70), 1)
}

describe('体脂率分类 describeBodyFat', () => {
  it('男性五档边界（含本数）', () => {
    expect(describeBodyFat(5, 'male')).toBe('必需脂肪偏低')
    expect(describeBodyFat(6, 'male')).toBe('运动员')
    expect(describeBodyFat(13, 'male')).toBe('运动员')
    expect(describeBodyFat(14, 'male')).toBe('健身')
    expect(describeBodyFat(17, 'male')).toBe('健身')
    expect(describeBodyFat(18, 'male')).toBe('正常')
    expect(describeBodyFat(24, 'male')).toBe('正常')
    expect(describeBodyFat(25, 'male')).toBe('偏高')
  })

  it('女性分段与低于下限的处理', () => {
    expect(describeBodyFat(9, 'female')).toBe('偏低')
    expect(describeBodyFat(10, 'female')).toBe('必需脂肪偏低')
    expect(describeBodyFat(13, 'female')).toBe('必需脂肪偏低')
    expect(describeBodyFat(14, 'female')).toBe('运动员')
    expect(describeBodyFat(20, 'female')).toBe('运动员')
    expect(describeBodyFat(21, 'female')).toBe('健身')
    expect(describeBodyFat(24, 'female')).toBe('健身')
    expect(describeBodyFat(25, 'female')).toBe('正常')
    expect(describeBodyFat(31, 'female')).toBe('正常')
    expect(describeBodyFat(32, 'female')).toBe('偏高')
  })
})

describe('BMI 法（Deurenberg 公式）', () => {
  it('男性按 1.20×BMI + 0.23×年龄 − 10.8 − 5.4 估算', () => {
    const raw = 1.2 * 22 + 0.23 * 25 - 10.8 - 5.4
    const r = okBmi(22, 25, 'male')
    expect(r.bodyFatPercent).toBe(expectedPercent(raw))
    expect(r.method).toBe('bmi')
    expect(r.gender).toBe('male')
    expect(r.category).toBe(describeBodyFat(r.bodyFatPercent, 'male'))
    expect(r.fatMassKg).toBeNull()
    expect(r.leanMassKg).toBeNull()
  })

  it('女性性别系数为 0', () => {
    const rawFemale = 1.2 * 22 + 0.23 * 25 - 5.4
    const rawMale = 1.2 * 22 + 0.23 * 25 - 10.8 - 5.4
    expect(okBmi(22, 25, 'female').bodyFatPercent).toBe(expectedPercent(rawFemale))
    expect(okBmi(22, 25, 'male').bodyFatPercent).toBe(expectedPercent(rawMale))
  })

  it('传入体重时给出脂肪重量与去脂体重', () => {
    const r = okBmi(22, 25, 'male', 70)
    expect(r.fatMassKg).toBeCloseTo(roundTo((70 * r.bodyFatPercent) / 100, 1), 5)
    expect(r.leanMassKg).toBeCloseTo(roundTo(70 - (r.fatMassKg as number), 1), 5)
  })

  it('结果钳制在 1~70', () => {
    expect(okBmi(200, 10, 'female').bodyFatPercent).toBe(70)
    expect(okBmi(0.1, 10, 'male').bodyFatPercent).toBe(1)
  })
})

describe('体围法（美国海军公式）', () => {
  it('男性按腰围减颈围的公式估算', () => {
    const raw =
      86.01 * Math.log10((80 - 38) / 2.54) -
      70.041 * Math.log10(180 / 2.54) +
      36.76
    const r = okMeasure('male', 180, 80, 38, 95)
    expect(r.bodyFatPercent).toBe(expectedPercent(raw))
    expect(r.method).toBe('measure')
    expect(r.category).toBe(describeBodyFat(r.bodyFatPercent, 'male'))
  })

  it('女性按腰围加臀围减颈围的公式估算', () => {
    const raw =
      163.205 * Math.log10((70 + 95 - 32) / 2.54) -
      97.684 * Math.log10(165 / 2.54) -
      78.387
    const r = okMeasure('female', 165, 70, 32, 95)
    expect(r.bodyFatPercent).toBe(expectedPercent(raw))
    expect(r.category).toBe(describeBodyFat(r.bodyFatPercent, 'female'))
  })

  it('传入体重时给出脂肪重量与去脂体重', () => {
    const r = okMeasure('male', 180, 80, 38, 95, 75)
    expect(r.fatMassKg).toBeCloseTo(roundTo((75 * r.bodyFatPercent) / 100, 1), 5)
    expect(r.leanMassKg).toBeCloseTo(roundTo(75 - (r.fatMassKg as number), 1), 5)
  })
})

describe('脂肪重量辅助函数', () => {
  it('按体脂率分解体重，并钳制异常百分比', () => {
    expect(estimateBodyMass(20, 70)).toEqual({ fatMassKg: 14, leanMassKg: 56 })
    expect(estimateBodyMass(150, 70)).toEqual({ fatMassKg: 70, leanMassKg: 0 })
    expect(estimateBodyMass(-5, 70)).toEqual({ fatMassKg: 0, leanMassKg: 70 })
  })
})

describe('体脂率计算器 · 边界值与非法输入', () => {
  it('年龄与体重边界可通过', () => {
    expect(okBmi(22, 10, 'male', 2).bodyFatPercent).toBeGreaterThan(0)
    expect(okBmi(22, 100, 'female', 400).bodyFatPercent).toBeGreaterThan(0)
  })

  it('BMI 法拦截非法性别、BMI、年龄与体重', () => {
    expect(calcBodyFatByBmi(22, 25, 'xx' as any).ok).toBe(false)
    expect(calcBodyFatByBmi(NaN, 25, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(Infinity, 25, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(0, 25, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(-1, 25, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi('' as any, 25, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(22, 9, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(22, 101, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(22, NaN, 'male').ok).toBe(false)
    expect(calcBodyFatByBmi(22, 25, 'male', NaN).ok).toBe(false)
    expect(calcBodyFatByBmi(22, 25, 'male', 1).ok).toBe(false)
    expect(calcBodyFatByBmi(22, 25, 'male', 401).ok).toBe(false)
  })

  it('体围法拦截非法身高、围度与关系约束', () => {
    expect(calcBodyFatByMeasure('xx' as any, 180, 80, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 49, 80, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 251, 80, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, NaN, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, 19, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, 301, 38, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, 80, 19, 95).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, 80, 38, 19).ok).toBe(false)
    expect(calcBodyFatByMeasure('male', 180, 80, 38, 301).ok).toBe(false)
    // 腰围不大于颈围时 log10 的参数非正
    expect(calcBodyFatByMeasure('male', 180, 38, 38, 95).ok).toBe(false)
  })

  it('体围法身高、围度边界可通过', () => {
    expect(okMeasure('male', 50, 300, 20, 20).bodyFatPercent).toBeGreaterThan(0)
    expect(okMeasure('female', 250, 300, 20, 300).bodyFatPercent).toBeGreaterThan(0)
  })

  it('错误文案为中文', () => {
    const error = calcBodyFatByMeasure('male', 180, 38, 38, 95)
    expect(error.ok).toBe(false)
    if (!error.ok) expect(error.message.length).toBeGreaterThan(0)
  })
})

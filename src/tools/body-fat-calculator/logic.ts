import type { CalcResult } from '@/types/common'
import { clamp, roundTo, toFiniteNumber } from '@/utils/number'

export type Gender = 'male' | 'female'

export interface BodyFatResult {
  /** 体脂率百分数，保留 1 位小数 */
  bodyFatPercent: number
  /** 分类中文描述 */
  category: string
  /** 采用的估算方式 */
  method: 'bmi' | 'measure'
  /** 性别 */
  gender: Gender
  /** 脂肪重量估算，单位 kg；未提供体重时为 null */
  fatMassKg: number | null
  /** 去脂体重，单位 kg；未提供体重时为 null */
  leanMassKg: number | null
}

/** 空值、非有限数字与区间校验，返回中文错误 */
function readNumber(value: unknown, label: string, min: number, max: number): CalcResult<number> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, message: `请填写${label}` }
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { ok: false, message: `请填写${label}` }
  }
  const parsed = toFiniteNumber(value)
  if (parsed === null) return { ok: false, message: `${label}请输入有效数字` }
  if (parsed < min || parsed > max) {
    return { ok: false, message: `${label}应在 ${min} 到 ${max} 之间` }
  }
  return { ok: true, value: parsed }
}

function readPositive(value: unknown, label: string): CalcResult<number> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, message: `请填写${label}` }
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { ok: false, message: `请填写${label}` }
  }
  const parsed = toFiniteNumber(value)
  if (parsed === null) return { ok: false, message: `${label}请输入有效数字` }
  if (parsed <= 0) return { ok: false, message: `${label}必须大于 0` }
  return { ok: true, value: parsed }
}

/** 体重为可选参数：不传时不计算脂肪重量，传入时校验 2~400 kg */
function readWeight(value: unknown): CalcResult<number | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  const checked = readNumber(value, '体重', 2, 400)
  if (!checked.ok) return checked
  return { ok: true, value: checked.value }
}

/**
 * 体脂率分类描述。
 * 男：<6 必需脂肪偏低、6~13 运动员、14~17 健身、18~24 正常、>=25 偏高。
 * 女：10~13、14~20、21~24、25~31、>=32 五段依次对应上述五类；低于下限（<10）为偏低。
 */
export function describeBodyFat(value: number, gender: Gender): string {
  if (gender === 'male') {
    if (value < 6) return '必需脂肪偏低'
    if (value <= 13) return '运动员'
    if (value <= 17) return '健身'
    if (value <= 24) return '正常'
    return '偏高'
  }
  if (value < 10) return '偏低'
  if (value <= 13) return '必需脂肪偏低'
  if (value <= 20) return '运动员'
  if (value <= 24) return '健身'
  if (value <= 31) return '正常'
  return '偏高'
}

/** 由体脂率与体重估算脂肪重量、去脂体重，结果保留 1 位小数 */
export function estimateBodyMass(bodyFatPercent: number, weightKg: number): { fatMassKg: number; leanMassKg: number } {
  const percent = clamp(bodyFatPercent, 0, 100)
  const fatMassKg = roundTo((weightKg * percent) / 100, 1)
  return { fatMassKg, leanMassKg: roundTo(weightKg - fatMassKg, 1) }
}

function buildResult(
  rawPercent: number,
  gender: Gender,
  method: 'bmi' | 'measure',
  weightKg: number | null
): BodyFatResult {
  // 两种公式的结果都统一钳制在 1~70，避免极端输入出现负数或超过生理范围的数值
  const bodyFatPercent = roundTo(clamp(rawPercent, 1, 70), 1)
  const mass = weightKg === null ? null : estimateBodyMass(bodyFatPercent, weightKg)
  return {
    bodyFatPercent,
    category: describeBodyFat(bodyFatPercent, gender),
    method,
    gender,
    fatMassKg: mass ? mass.fatMassKg : null,
    leanMassKg: mass ? mass.leanMassKg : null
  }
}

/**
 * BMI 法（Deurenberg 公式）：
 * BF% = 1.20×BMI + 0.23×年龄 − 10.8×性别系数(男 1 女 0) − 5.4。
 * weightKg 为可选的体重参数，传入时同时给出脂肪重量与去脂体重。
 */
export function calcBodyFatByBmi(
  bmi: number,
  age: number,
  gender: Gender,
  weightKg?: number
): CalcResult<BodyFatResult> {
  if (gender !== 'male' && gender !== 'female') {
    return { ok: false, message: '请选择有效的性别' }
  }
  const b = readPositive(bmi, 'BMI')
  if (!b.ok) return b
  const a = readNumber(age, '年龄', 10, 100)
  if (!a.ok) return a
  const w = readWeight(weightKg)
  if (!w.ok) return w

  const sexCoefficient = gender === 'male' ? 1 : 0
  const percent = 1.2 * b.value + 0.23 * a.value - 10.8 * sexCoefficient - 5.4
  return { ok: true, value: buildResult(percent, gender, 'bmi', w.value) }
}

/**
 * 体围法（美国海军公式），各围度单位 cm，公式内部换算为英寸（cm / 2.54）：
 * 男：86.010×log10(腰−颈) − 70.041×log10(身高) + 36.76
 * 女：163.205×log10(腰+臀−颈) − 97.684×log10(身高) − 78.387
 * 要求参数为正且腰>颈、腰+臀>颈；weightKg 为可选体重参数。
 */
export function calcBodyFatByMeasure(
  gender: Gender,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm: number,
  weightKg?: number
): CalcResult<BodyFatResult> {
  if (gender !== 'male' && gender !== 'female') {
    return { ok: false, message: '请选择有效的性别' }
  }
  const h = readNumber(heightCm, '身高', 50, 250)
  if (!h.ok) return h
  const waist = readNumber(waistCm, '腰围', 20, 300)
  if (!waist.ok) return waist
  const neck = readNumber(neckCm, '颈围', 20, 300)
  if (!neck.ok) return neck
  const hip = readNumber(hipCm, '臀围', 20, 300)
  if (!hip.ok) return hip
  const w = readWeight(weightKg)
  if (!w.ok) return w
  if (waist.value <= neck.value) {
    return { ok: false, message: '腰围应大于颈围' }
  }
  if (waist.value + hip.value <= neck.value) {
    return { ok: false, message: '腰围与臀围之和应大于颈围' }
  }

  const heightIn = h.value / 2.54
  const waistIn = waist.value / 2.54
  const neckIn = neck.value / 2.54
  const hipIn = hip.value / 2.54
  let percent: number
  if (gender === 'male') {
    percent = 86.01 * Math.log10(waistIn - neckIn) - 70.041 * Math.log10(heightIn) + 36.76
  } else {
    percent = 163.205 * Math.log10(waistIn + hipIn - neckIn) - 97.684 * Math.log10(heightIn) - 78.387
  }
  if (!Number.isFinite(percent)) {
    return { ok: false, message: '围度数据无法计算体脂率，请检查后重试' }
  }
  return { ok: true, value: buildResult(percent, gender, 'measure', w.value) }
}

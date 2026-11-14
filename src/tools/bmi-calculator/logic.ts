import type { CalcResult } from '@/types/common'
import { roundTo, toFiniteNumber } from '@/utils/number'

/** BMI 判定标准：cn 为中国成人标准，who 为世界卫生组织国际标准 */
export type BmiStandard = 'cn' | 'who'

export interface BmiResult {
  /** 身体质量指数，保留 1 位小数 */
  bmi: number
  /** 分类中文名：偏瘦 / 正常 / 超重 / 肥胖 */
  category: string
  /** 采用的判定标准 */
  standard: BmiStandard
  /** 判定标准中文名称 */
  standardName: string
  /** 该标准的正常 BMI 区间，例如「18.5 ~ 23.9」 */
  normalRange: string
  /** 正常 BMI 下限（含） */
  normalMin: number
  /** 正常 BMI 上限（按 1 位小数表示的含本数值） */
  normalMax: number
  /** 按当前身高换算的理想体重下限，单位 kg，保留 1 位小数 */
  idealMinKg: number
  /** 按当前身高换算的理想体重上限，单位 kg，保留 1 位小数 */
  idealMaxKg: number
  /** 距离理想体重区间还需增减的公斤数：正数需增重、负数需减重、0 表示已在区间内 */
  adjustKg: number
  /** 增减建议的中文说明 */
  adjustText: string
}

interface StandardConfig {
  name: string
  normalMin: number
  /** 正常区间展示用上限（1 位小数下的含本数值） */
  normalMax: number
  /** 正常区间的排他上界，BMI 小于该值即为正常 */
  normalUpper: number
  /** 肥胖起点（含） */
  obeseMin: number
}

/**
 * 中国成人标准：<18.5 偏瘦，18.5~23.9 正常，24~27.9 超重，>=28 肥胖。
 * WHO 国际标准：<18.5 偏瘦，18.5~24.9 正常，25~29.9 超重，>=30 肥胖。
 * BMI 已保留 1 位小数，因此「<24」与「<=23.9」等价，用排他上界判断可避免区间缝隙。
 */
const STANDARDS: Record<BmiStandard, StandardConfig> = {
  cn: { name: '中国成人标准', normalMin: 18.5, normalMax: 23.9, normalUpper: 24, obeseMin: 28 },
  who: { name: 'WHO 国际标准', normalMin: 18.5, normalMax: 24.9, normalUpper: 25, obeseMin: 30 }
}

/** 统一处理空值、非有限数字与区间校验，返回中文错误 */
function readNumber(value: unknown, label: string, min: number, max: number): CalcResult<number> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, message: `请填写${label}` }
  }
  // 界面把空输入统一以 NaN 传入；NaN 与 Infinity 都视为无效数字
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

/**
 * 计算 BMI 及判定结果。BMI = 体重kg / (身高m)^2，保留 1 位小数。
 * 纯函数，不依赖 uni / wx / DOM。
 */
export function calcBmi(heightCm: number, weightKg: number, standard: BmiStandard): CalcResult<BmiResult> {
  const height = readNumber(heightCm, '身高', 50, 250)
  if (!height.ok) return height
  const weight = readNumber(weightKg, '体重', 2, 400)
  if (!weight.ok) return weight
  if (standard !== 'cn' && standard !== 'who') {
    return { ok: false, message: '请选择有效的 BMI 判定标准' }
  }

  const h = height.value
  const w = weight.value
  const config = STANDARDS[standard]
  const heightM2 = Math.pow(h / 100, 2)
  const bmi = roundTo(w / heightM2, 1)

  let category: string
  if (bmi < config.normalMin) category = '偏瘦'
  else if (bmi < config.normalUpper) category = '正常'
  else if (bmi < config.obeseMin) category = '超重'
  else category = '肥胖'

  // 理想体重由该标准的正常 BMI 区间按当前身高换算
  const rawMin = config.normalMin * heightM2
  const rawMax = config.normalMax * heightM2
  const idealMinKg = roundTo(rawMin, 1)
  const idealMaxKg = roundTo(rawMax, 1)

  let adjustKg = 0
  if (w < rawMin) adjustKg = roundTo(rawMin - w, 1)
  else if (w > rawMax) adjustKg = roundTo(rawMax - w, 1)

  let adjustText: string
  if (adjustKg > 0) adjustText = `还需增重 ${adjustKg} kg`
  else if (adjustKg < 0) adjustText = `还需减重 ${-adjustKg} kg`
  else adjustText = '体重在正常范围，无需增减'

  return {
    ok: true,
    value: {
      bmi,
      category,
      standard,
      standardName: config.name,
      normalRange: `${config.normalMin} ~ ${config.normalMax}`,
      normalMin: config.normalMin,
      normalMax: config.normalMax,
      idealMinKg,
      idealMaxKg,
      adjustKg,
      adjustText
    }
  }
}

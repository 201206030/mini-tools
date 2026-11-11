import type { CalcResult } from '@/types/common'

export interface RandomOptions {
  min: number
  max: number
  count: number
  unique: boolean
}

const MAX_COUNT = 100
const MAX_UNIQUE_SPAN = 1e9

/** 生成随机整数：不重复模式用 Set 做拒绝采样，避免生成整个区间数组 */
export function generateRandomNumbers(options: RandomOptions): CalcResult<number[]> {
  const { min, max, count, unique } = options
  if (!Number.isInteger(min) || !Number.isInteger(max) || !Number.isInteger(count)) {
    return { ok: false, message: '最小值、最大值和生成数量都必须是整数' }
  }
  if (min > max) {
    return { ok: false, message: '最小值不能大于最大值' }
  }
  if (count < 1 || count > MAX_COUNT) {
    return { ok: false, message: `生成数量请控制在 1 到 ${MAX_COUNT} 之间` }
  }

  const span = max - min + 1
  if (!Number.isFinite(span) || span > Number.MAX_SAFE_INTEGER) {
    return { ok: false, message: '数值范围过大，请缩小最大值与最小值的差距' }
  }
  if (unique && count > span) {
    return { ok: false, message: '开启不重复时，生成数量不能超过可选整数的个数' }
  }
  if (unique && span > MAX_UNIQUE_SPAN) {
    return { ok: false, message: '不重复抽取时数值范围过大，请缩小最大值与最小值的差距' }
  }

  const result: number[] = []
  if (unique) {
    const seen = new Set<number>()
    while (result.length < count) {
      const value = min + Math.floor(Math.random() * span)
      if (seen.has(value)) continue
      seen.add(value)
      result.push(value)
    }
  } else {
    for (let i = 0; i < count; i += 1) {
      result.push(min + Math.floor(Math.random() * span))
    }
  }
  return { ok: true, value: result }
}

/** 把结果拼成便于复制的中文分隔文本 */
export function formatRandomResult(list: number[]): string {
  return list.join('、')
}

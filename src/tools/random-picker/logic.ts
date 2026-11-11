import { splitLines } from '@/utils/text'

/** 按行切分，去掉空行与纯空白行，保留原始文本（含中文） */
export function parseOptions(text: string): string[] {
  return splitLines(text).filter((line) => line.trim().length > 0)
}

/** 不重复模式的剩余索引，初始为全部选项的下标 */
export function initialRemaining(count: number): number[] {
  const result: number[] = []
  for (let i = 0; i < count; i += 1) result.push(i)
  return result
}

export interface PickResult {
  value: string
  remaining: number[]
  exhausted: boolean
}

/**
 * 抽一次。不重复模式按「索引」记录剩余项，重复文本因下标不同而可分别抽到；
 * noRepeat 为 false 时不消耗剩余项，返回同一份剩余列表。
 */
export function pickOne(
  items: string[],
  remaining: number[],
  noRepeat: boolean
): PickResult | null {
  if (items.length === 0) return null

  if (noRepeat) {
    if (remaining.length === 0) return null
    const draw = Math.floor(Math.random() * remaining.length)
    const pickedIndex = remaining[draw]
    if (!Number.isInteger(pickedIndex) || pickedIndex < 0 || pickedIndex >= items.length) return null
    const nextRemaining = remaining.filter((_, index) => index !== draw)
    return {
      value: items[pickedIndex],
      remaining: nextRemaining,
      exhausted: nextRemaining.length === 0
    }
  }

  const index = Math.floor(Math.random() * items.length)
  return { value: items[index], remaining, exhausted: false }
}

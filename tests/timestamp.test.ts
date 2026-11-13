import { describe, expect, it } from 'vitest'
import {
  buildTimestampResult,
  datePartsToTimestamp,
  describeRelative,
  formatTimestampDetail,
  parseTimestamp
} from '@/tools/timestamp-converter/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('时间戳转换', () => {
  it('按位数自动识别秒与毫秒', () => {
    expect(must(parseTimestamp('1735689600'))).toBe(1735689600000)
    expect(must(parseTimestamp('1735689600000'))).toBe(1735689600000)
    expect(parseTimestamp('abc').ok).toBe(false)
    expect(parseTimestamp('').ok).toBe(false)
    expect(parseTimestamp('9'.repeat(30)).ok).toBe(false)
  })

  it('按本地时区输出日期时间与星期', () => {
    const ms = must(parseTimestamp('1735689600'))
    const result = must(buildTimestampResult(ms, 0))
    expect(result.seconds).toBe('1735689600')
    expect(result.milliseconds).toBe('1735689600000')
    expect(result.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(result.weekday).toMatch(/^星期/)
    expect(result.relative.length).toBeGreaterThan(0)
    expect(formatTimestampDetail(ms)).toContain(result.date)
  })

  it('日期时间转时间戳，拒绝不存在的日期', () => {
    const expected = String(Math.floor(new Date(2025, 0, 1, 0, 0, 0).getTime() / 1000))
    expect(must(datePartsToTimestamp(2025, 1, 1, 0, 0, 0, 0)).seconds).toBe(expected)
    expect(datePartsToTimestamp(2025, 2, 30, 0, 0, 0, 0).ok).toBe(false)
    expect(datePartsToTimestamp(2025, 13, 1, 0, 0, 0, 0).ok).toBe(false)
    expect(datePartsToTimestamp(2025, 1, 1, 25, 0, 0, 0).ok).toBe(false)
    expect(datePartsToTimestamp(999, 1, 1, 0, 0, 0, 0).ok).toBe(false)
  })

  it('相对时间描述', () => {
    expect(describeRelative(0, 0)).toBe('就是现在')
    expect(describeRelative(3600000, 0)).toBe('1 小时后')
    expect(describeRelative(-86400000, 0)).toBe('1 天前')
    expect(describeRelative(-60000, 0)).toBe('1 分钟前')
  })
})

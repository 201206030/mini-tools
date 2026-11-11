import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysInMonth,
  describeInterval,
  diffDays,
  diffYmd,
  formatDate,
  fromDayNumber,
  isLeapYear,
  isValidCivil,
  parseDate,
  toDayNumber,
  weekdayName,
  type CivilDate
} from '@/utils/date'
import {
  MAX_OFFSET_DAYS,
  buildIntervalSummary,
  calcCountdown,
  calcInterval,
  calcOffset
} from '@/tools/date-calculator/logic'

const d = (year: number, month: number, day: number): CivilDate => ({ year, month, day })

describe('utils/date 闰年与月份天数', () => {
  it('正确判断世纪闰年与平年', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2025)).toBe(false)
    expect(isLeapYear(2100)).toBe(false)
  })

  it('正确返回各月天数', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(2025, 4)).toBe(30)
    expect(daysInMonth(2025, 12)).toBe(31)
    expect(daysInMonth(2025, 13)).toBe(0)
  })

  it('严格校验 YYYY-MM-DD 与真实存在的日期', () => {
    expect(isValidCivil(d(2024, 2, 29))).toBe(true)
    expect(isValidCivil(d(2025, 2, 29))).toBe(false)
    expect(isValidCivil(d(2025, 0, 1))).toBe(false)
    expect(isValidCivil(d(2025, 1, 32))).toBe(false)
    expect(isValidCivil(d(10000, 1, 1))).toBe(false)
    expect(parseDate('2024-02-29')).toEqual(d(2024, 2, 29))
    expect(parseDate('2025-02-30')).toBeNull()
    expect(parseDate('2025-2-9')).toBeNull()
    expect(parseDate('2025/02/09')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate('0000-01-01')).toBeNull()
    expect(formatDate(d(1, 1, 2))).toBe('0001-01-02')
  })
})

describe('utils/date 纯整数民用历换算', () => {
  it('1970-01-01 为第 0 天且可往返换算', () => {
    expect(toDayNumber(d(1970, 1, 1))).toBe(0)
    expect(fromDayNumber(0)).toEqual(d(1970, 1, 1))
    for (const date of [d(2024, 2, 29), d(2000, 1, 1), d(1900, 12, 31), d(1, 1, 1), d(9999, 12, 31)]) {
      expect(fromDayNumber(toDayNumber(date))).toEqual(date)
    }
  })

  it('跨闰日、月末、年末、世纪边界加天数正确', () => {
    expect(addDays(d(2024, 2, 28), 1)).toEqual(d(2024, 2, 29))
    expect(addDays(d(2024, 2, 29), 1)).toEqual(d(2024, 3, 1))
    expect(addDays(d(2025, 2, 28), 1)).toEqual(d(2025, 3, 1))
    expect(addDays(d(2025, 12, 31), 1)).toEqual(d(2026, 1, 1))
    expect(addDays(d(2025, 1, 1), -1)).toEqual(d(2024, 12, 31))
    expect(addDays(d(1900, 3, 1), -1)).toEqual(d(1900, 2, 28))
  })

  it('自然日差不含起始日，且无时区/夏令时偏差', () => {
    expect(diffDays(d(2025, 1, 1), d(2025, 1, 2))).toBe(1)
    expect(diffDays(d(2024, 1, 1), d(2025, 1, 1))).toBe(366)
    expect(diffDays(d(2025, 1, 1), d(2024, 1, 1))).toBe(-366)
    expect(weekdayName(d(1970, 1, 1))).toBe('星期四')
    expect(weekdayName(d(2024, 2, 29))).toBe('星期四')
  })

  it('明确区分「不含起始日」与「包含首尾」两种口径', () => {
    expect(describeInterval(d(2025, 1, 1), d(2025, 1, 2))).toEqual({
      days: 1,
      absoluteDays: 1,
      inclusiveDays: 2
    })
    expect(describeInterval(d(2025, 1, 2), d(2025, 1, 1))).toEqual({
      days: -1,
      absoluteDays: 1,
      inclusiveDays: 2
    })
  })

  it('年月日差按月份实际天数推进，不产生负数分量', () => {
    expect(diffYmd(d(2024, 1, 1), d(2024, 12, 31))).toEqual({ years: 0, months: 11, days: 30 })
    expect(diffYmd(d(2025, 1, 1), d(2026, 1, 1))).toEqual({ years: 1, months: 0, days: 0 })
    expect(diffYmd(d(2024, 1, 1), d(2025, 12, 31))).toEqual({ years: 1, months: 11, days: 30 })
    // 月末借位：1 月 31 日推进 1 整月为 2 月 28 日，再到 3 月 1 日还差 1 天
    expect(diffYmd(d(2025, 1, 31), d(2025, 3, 1))).toEqual({ years: 0, months: 1, days: 1 })
    expect(diffYmd(d(2024, 1, 31), d(2024, 3, 1))).toEqual({ years: 0, months: 1, days: 1 })
    // 反向输入与正向结果一致
    expect(diffYmd(d(2025, 3, 1), d(2025, 1, 31))).toEqual({ years: 0, months: 1, days: 1 })
    for (const [a, b] of [
      [d(2024, 2, 29), d(2025, 2, 28)],
      [d(1999, 12, 31), d(2000, 3, 1)],
      [d(1, 1, 1), d(9999, 12, 31)]
    ] as [CivilDate, CivilDate][]) {
      const diff = diffYmd(a, b)
      expect(diff.years).toBeGreaterThanOrEqual(0)
      expect(diff.months).toBeGreaterThanOrEqual(0)
      expect(diff.months).toBeLessThan(12)
      expect(diff.days).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('日期计算器业务逻辑', () => {
  it('计算两个日期的相隔天数、年月日差与星期', () => {
    const result = calcInterval('2024-01-01', '2024-12-31')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.absoluteDays).toBe(365)
    expect(result.value.inclusiveDays).toBe(366)
    expect(result.value.ymd).toEqual({ years: 0, months: 11, days: 30 })
    expect(result.value.startWeekday).toBe('星期一')
  })

  it('同日相差 0 天，包含首尾为 1 天', () => {
    const result = calcInterval('2025-06-01', '2025-06-01')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.absoluteDays).toBe(0)
    expect(result.value.inclusiveDays).toBe(1)
  })

  it('非法日期返回中文错误而不抛异常', () => {
    const empty = calcInterval('', '2025-01-01')
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.message).toContain('YYYY-MM-DD')
    expect(calcInterval('2025-02-30', '2025-01-01').ok).toBe(false)
    expect(calcInterval('2025-01-01', 'abc').ok).toBe(false)
  })

  it('前后 N 天支持闰年、年末与负偏移，并生成可复制摘要', () => {
    const result = calcOffset('2024-02-28', 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.after).toBe('2024-02-29')
    expect(result.value.before).toBe('2024-02-27')
    expect(calcOffset('2025-12-31', 1).ok).toBe(true)
    const minus = calcOffset('2025-01-01', -3)
    expect(minus.ok && minus.value.after).toBe('2024-12-29')

    const interval = calcInterval('2024-01-01', '2024-12-31')
    expect(interval.ok).toBe(true)
    if (!interval.ok) return
    const summary = buildIntervalSummary('2024-01-01', '2024-12-31', interval.value)
    expect(summary).toContain('相隔 365 天（不含起始日）')
    expect(summary).toContain('包含首尾共 366 天')
    expect(summary).toContain('相差 0 年 11 个月 30 天')
  })

  it('拦截超大天数、小数与超出年份范围', () => {
    expect(calcOffset('2025-01-01', MAX_OFFSET_DAYS + 1).ok).toBe(false)
    expect(calcOffset('2025-01-01', 1.5).ok).toBe(false)
    expect(calcOffset('2025-01-01', NaN).ok).toBe(false)
    const outOfRange = calcOffset('0001-01-02', 2)
    expect(outOfRange.ok).toBe(false)
    if (!outOfRange.ok) expect(outOfRange.message).toContain('年份范围')
  })

  it('距离今天区分未来、今天、过去', () => {
    const today = d(2025, 6, 15)
    const future = calcCountdown('2025-06-20', today)
    expect(future.ok).toBe(true)
    if (future.ok) {
      expect(future.value.days).toBe(5)
      expect(future.value.direction).toBe('future')
    }
    const same = calcCountdown('2025-06-15', today)
    expect(same.ok && same.value.direction).toBe('today')
    const past = calcCountdown('2025-06-10', today)
    expect(past.ok && past.value.days).toBe(-5)
    expect(past.ok && past.value.direction).toBe('past')
    expect(calcCountdown('2025-02-30', today).ok).toBe(false)
  })
})

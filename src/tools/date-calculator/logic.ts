import type { CalcResult } from '@/types/common'
import {
  addDays,
  describeInterval,
  diffDays,
  diffYmd,
  formatDate,
  isValidCivil,
  parseDate,
  weekdayName,
  type CivilDate,
  type YmdDiff
} from '@/utils/date'

const MIN_YEAR = 1
const MAX_YEAR = 9999
export const MAX_OFFSET_DAYS = 365000

export interface IntervalResult {
  /** 有符号天数（不含起始日） */
  days: number
  absoluteDays: number
  /** 包含起始日与结束日的天数 */
  inclusiveDays: number
  ymd: YmdDiff
  startWeekday: string
  endWeekday: string
}

export interface OffsetResult {
  base: string
  baseWeekday: string
  after: string
  afterWeekday: string
  before: string
  beforeWeekday: string
  days: number
}

export interface CountdownResult {
  /** 目标日期减今天，正数表示还有多少天 */
  days: number
  direction: 'future' | 'today' | 'past'
  targetWeekday: string
  ymd: YmdDiff
}

function requireDate(value: string, label: string): { date?: CivilDate; error?: string } {
  const date = parseDate(value)
  if (!date) return { error: `${label}格式应为 YYYY-MM-DD，且日期必须真实存在` }
  return { date }
}

/** 两个日期之间的天数、年月日差 */
export function calcInterval(start: string, end: string): CalcResult<IntervalResult> {
  const a = requireDate(start, '开始日期')
  if (a.error || !a.date) return { ok: false, message: a.error || '开始日期无效' }
  const b = requireDate(end, '结束日期')
  if (b.error || !b.date) return { ok: false, message: b.error || '结束日期无效' }
  const interval = describeInterval(a.date, b.date)
  return {
    ok: true,
    value: {
      days: interval.days,
      absoluteDays: interval.absoluteDays,
      inclusiveDays: interval.inclusiveDays,
      ymd: diffYmd(a.date, b.date),
      startWeekday: weekdayName(a.date),
      endWeekday: weekdayName(b.date)
    }
  }
}

/** 指定日期前后 N 天的日期 */
export function calcOffset(base: string, days: number): CalcResult<OffsetResult> {
  const parsed = requireDate(base, '基准日期')
  if (parsed.error || !parsed.date) return { ok: false, message: parsed.error || '基准日期无效' }
  if (!Number.isInteger(days)) return { ok: false, message: '天数必须是整数' }
  if (Math.abs(days) > MAX_OFFSET_DAYS) {
    return { ok: false, message: `天数请控制在 ${MAX_OFFSET_DAYS} 天以内` }
  }
  const after = addDays(parsed.date, days)
  const before = addDays(parsed.date, -days)
  if (!isValidCivil(after) || !isValidCivil(before) || after.year > MAX_YEAR || before.year < MIN_YEAR) {
    return { ok: false, message: '计算结果超出可支持的年份范围（1—9999 年）' }
  }
  return {
    ok: true,
    value: {
      base: formatDate(parsed.date),
      baseWeekday: weekdayName(parsed.date),
      after: formatDate(after),
      afterWeekday: weekdayName(after),
      before: formatDate(before),
      beforeWeekday: weekdayName(before),
      days
    }
  }
}

/** 某个日期距离今天还有多少天 */
export function calcCountdown(target: string, today: CivilDate): CalcResult<CountdownResult> {
  const parsed = requireDate(target, '目标日期')
  if (parsed.error || !parsed.date) return { ok: false, message: parsed.error || '目标日期无效' }
  const days = diffDays(today, parsed.date)
  return {
    ok: true,
    value: {
      days,
      direction: days > 0 ? 'future' : days < 0 ? 'past' : 'today',
      targetWeekday: weekdayName(parsed.date),
      ymd: diffYmd(today, parsed.date)
    }
  }
}

/** 生成可复制的结果文本 */
export function buildIntervalSummary(start: string, end: string, result: IntervalResult): string {
  return [
    `${start} 到 ${end}`,
    `相隔 ${result.absoluteDays} 天（不含起始日）`,
    `包含首尾共 ${result.inclusiveDays} 天`,
    `相差 ${result.ymd.years} 年 ${result.ymd.months} 个月 ${result.ymd.days} 天`,
    `${start} ${result.startWeekday}，${end} ${result.endWeekday}`
  ].join('\n')
}

import type { CalcResult } from '@/types/common'
import {
  addDays,
  describeInterval,
  diffDays,
  diffYmd,
  formatDate,
  isValidCivil,
  parseDate,
  toDayNumber,
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

// ---------------------------------------------------------------------------
// 工作日计算
// ---------------------------------------------------------------------------

export interface WorkdayOptions {
  /** 额外休息日（法定假日 / 调休放假），YYYY-MM-DD */
  daysOff: string[]
  /** 周末补班日（调休上班），YYYY-MM-DD */
  makeUpDays: string[]
}

export interface WorkdayStat {
  /** 工作日天数 */
  workdays: number
  /** 区间含首尾的自然日总数 */
  totalDays: number
  /** 实际休息的周末天数 */
  weekendDays: number
  /** 命中的额外休息日天数 */
  daysOffCount: number
  /** 命中的补班工作日天数 */
  makeUpCount: number
}

export interface WorkdayOffsetResult {
  date: string
  weekday: string
  /** 实际扫描过的自然日数 */
  scannedDays: number
}

/** 区间跨度上限（含首尾的自然日） */
const MAX_WORKDAY_SPAN = 36500
/** 工作日偏移上限 */
const MAX_WORKDAY_OFFSET = 5000
/** 扫描自然日上限，防止极端配置导致死循环 */
const MAX_WORKDAY_SCAN = 100000

/**
 * 把 textarea 文本按换行 / 逗号 / 空格切成日期字符串数组。
 * 去空白、去空项、去重；日期合法性由 normalizeOptions 统一处理。
 */
export function parseWorkdayDateList(text: string): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const raw of String(text || '').split(/[\r\n,，\s]+/)) {
    const token = raw.trim()
    if (!token || seen.has(token)) continue
    seen.add(token)
    result.push(token)
  }
  return result
}

interface WorkdaySets {
  daysOff: Set<string>
  makeUpDays: Set<string>
}

/** 归一化：去 trim、去重、忽略非法日期，合法日期统一为 YYYY-MM-DD */
function normalizeOptions(options: WorkdayOptions): WorkdaySets {
  const daysOff = new Set<string>()
  const makeUpDays = new Set<string>()
  const list = (value: unknown): string[] => (Array.isArray(value) ? value : [])
  for (const raw of list(options && options.daysOff)) {
    const date = parseDate(String(raw).trim())
    if (date) daysOff.add(formatDate(date))
  }
  for (const raw of list(options && options.makeUpDays)) {
    const date = parseDate(String(raw).trim())
    if (date) makeUpDays.add(formatDate(date))
  }
  return { daysOff, makeUpDays }
}

function isWorkdayWithSets(date: CivilDate, sets: WorkdaySets): boolean {
  const key = formatDate(date)
  // 补班日优先级最高：即使在周末或额外休息日也强制上班
  if (sets.makeUpDays.has(key)) return true
  if (sets.daysOff.has(key)) return false
  // 0=星期日，1~5=工作日，6=星期六
  const weekday = ((toDayNumber(date) + 4) % 7 + 7) % 7
  return weekday >= 1 && weekday <= 5
}

/** 判断某个民用历日期是否为工作日 */
export function isWorkday(date: CivilDate, options: WorkdayOptions): boolean {
  return isWorkdayWithSets(date, normalizeOptions(options))
}

/** 统计区间（含首尾）内的工作日、周末、额外休息日与补班日 */
export function calcWorkdays(
  start: string,
  end: string,
  options: WorkdayOptions
): CalcResult<WorkdayStat & { startWeekday: string; endWeekday: string }> {
  const aParsed = requireDate(start, '开始日期')
  if (aParsed.error || !aParsed.date) return { ok: false, message: aParsed.error || '开始日期无效' }
  const bParsed = requireDate(end, '结束日期')
  if (bParsed.error || !bParsed.date) return { ok: false, message: bParsed.error || '结束日期无效' }

  // start > end 自动交换，结果按规范化后的起止呈现
  let a = aParsed.date
  let b = bParsed.date
  if (toDayNumber(a) > toDayNumber(b)) {
    const temp = a
    a = b
    b = temp
  }

  const startNumber = toDayNumber(a)
  const endNumber = toDayNumber(b)
  const totalDays = endNumber - startNumber + 1
  if (totalDays > MAX_WORKDAY_SPAN) {
    return { ok: false, message: `计算跨度请控制在 ${MAX_WORKDAY_SPAN} 天以内` }
  }

  const sets = normalizeOptions(options)
  let workdays = 0
  let weekendDays = 0
  let daysOffCount = 0
  let makeUpCount = 0

  let cursor = a
  for (let dayNumber = startNumber; dayNumber <= endNumber; dayNumber += 1) {
    const key = formatDate(cursor)
    if (sets.makeUpDays.has(key)) {
      // 补班日计入工作日，同时单独记一笔补班数
      workdays += 1
      makeUpCount += 1
    } else if (sets.daysOff.has(key)) {
      daysOffCount += 1
    } else {
      const weekday = ((dayNumber + 4) % 7 + 7) % 7
      if (weekday === 0 || weekday === 6) weekendDays += 1
      else workdays += 1
    }
    if (dayNumber < endNumber) cursor = addDays(cursor, 1)
  }

  return {
    ok: true,
    value: {
      workdays,
      totalDays,
      weekendDays,
      daysOffCount,
      makeUpCount,
      startWeekday: weekdayName(a),
      endWeekday: weekdayName(b)
    }
  }
}

/**
 * 从基准日向前 / 向后推算 N 个工作日。
 * days>0 向后、days<0 向前；days===0 时若基准日是工作日返回自身，否则顺延到下一个工作日。
 */
export function calcWorkdayOffset(
  base: string,
  days: number,
  options: WorkdayOptions
): CalcResult<WorkdayOffsetResult> {
  const parsed = requireDate(base, '基准日期')
  if (parsed.error || !parsed.date) return { ok: false, message: parsed.error || '基准日期无效' }
  if (!Number.isInteger(days)) return { ok: false, message: '天数必须是整数' }
  if (Math.abs(days) > MAX_WORKDAY_OFFSET) {
    return { ok: false, message: `工作日天数请控制在 ${MAX_WORKDAY_OFFSET} 天以内` }
  }

  const sets = normalizeOptions(options)
  const toResult = (date: CivilDate, scannedDays: number): CalcResult<WorkdayOffsetResult> => ({
    ok: true,
    value: { date: formatDate(date), weekday: weekdayName(date), scannedDays }
  })

  let scannedDays = 0

  if (days === 0) {
    let cursor = parsed.date
    while (scannedDays < MAX_WORKDAY_SCAN) {
      if (isWorkdayWithSets(cursor, sets)) return toResult(cursor, scannedDays)
      const next = addDays(cursor, 1)
      if (!isValidCivil(next)) break
      cursor = next
      scannedDays += 1
    }
    return { ok: false, message: '未能找到下一个工作日，请检查额外休息日设置' }
  }

  const step = days > 0 ? 1 : -1
  let remaining = Math.abs(days)
  let cursor = parsed.date
  while (scannedDays < MAX_WORKDAY_SCAN) {
    const next = addDays(cursor, step)
    if (!isValidCivil(next)) {
      return { ok: false, message: '推算结果超出可支持的年份范围（1—9999 年）' }
    }
    cursor = next
    scannedDays += 1
    if (isWorkdayWithSets(cursor, sets)) {
      remaining -= 1
      if (remaining === 0) return toResult(cursor, scannedDays)
    }
  }
  return { ok: false, message: '扫描超出上限，未能找到目标工作日，请检查额外休息日设置' }
}

/** 生成可复制的工作日统计文本 */
export function buildWorkdaySummary(start: string, end: string, stat: WorkdayStat): string {
  return [
    `${start} 到 ${end} 共 ${stat.totalDays} 个自然日`,
    `工作日 ${stat.workdays} 天`,
    `周末 ${stat.weekendDays} 天`,
    `额外休息日 ${stat.daysOffCount} 天`,
    `补班日 ${stat.makeUpCount} 天`
  ].join('\n')
}

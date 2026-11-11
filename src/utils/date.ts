/**
 * 日历日期工具（纯整数运算）。
 * 不使用 Date 对象的毫秒差来推算日历日，避免时区与夏令时造成的偏差。
 * daysFromCivil / civilFromDays 采用 Howard Hinnant 的民用历换算算法。
 */

export interface CivilDate {
  year: number
  month: number
  day: number
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0
  const table = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month === 2 && isLeapYear(year) ? 29 : table[month - 1]
}

export function isValidCivil(date: CivilDate): boolean {
  const { year, month, day } = date
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (year < 1 || year > 9999 || month < 1 || month > 12) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

/** 严格解析 YYYY-MM-DD，非法日期（如 2025-02-30）返回 null */
export function parseDate(value: string): CivilDate | null {
  const match = DATE_RE.exec(String(value || '').trim())
  if (!match) return null
  const date: CivilDate = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  }
  return isValidCivil(date) ? date : null
}

export function pad2(value: number): string {
  return value < 10 ? '0' + value : String(value)
}

export function formatDate(date: CivilDate): string {
  return `${String(date.year).padStart(4, '0')}-${pad2(date.month)}-${pad2(date.day)}`
}

/** 返回该日期距离 1970-01-01 的日历天数（可为负） */
export function toDayNumber(date: CivilDate): number {
  let y = date.year
  const m = date.month
  const d = date.day
  y -= m <= 2 ? 1 : 0
  const era = Math.floor((y >= 0 ? y : y - 399) / 400)
  const yoe = y - era * 400
  const mp = m + (m > 2 ? -3 : 9)
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

export function fromDayNumber(dayNumber: number): CivilDate {
  const z = dayNumber + 719468
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  )
  let y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp + (mp < 10 ? 3 : -9)
  y += m <= 2 ? 1 : 0
  return { year: y, month: m, day: d }
}

export function addDays(date: CivilDate, amount: number): CivilDate {
  return fromDayNumber(toDayNumber(date) + Math.trunc(amount))
}

/** 返回 end - start 的自然日差（不含起始日） */
export function diffDays(start: CivilDate, end: CivilDate): number {
  return toDayNumber(end) - toDayNumber(start)
}

/** 设备本地「今天」：只读取本地年月日分量，不做时区换算 */
export function todayCivil(): CivilDate {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function weekdayName(date: CivilDate): string {
  // 1970-01-01 是星期四
  const index = ((toDayNumber(date) + 4) % 7 + 7) % 7
  return WEEKDAYS[index]
}

export interface YmdDiff {
  years: number
  months: number
  days: number
}

/**
 * 按整月推进，并把日号钳制到目标月的实际天数。
 * 例：1 月 31 日 + 1 个整月 = 2 月 28 日（闰年 29 日）。
 */
function addMonthsClamped(date: CivilDate, months: number): CivilDate {
  const total = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(total / 12)
  const month = (((total % 12) + 12) % 12) + 1
  const day = Math.min(date.day, daysInMonth(year, month))
  return { year, month, day }
}

/**
 * 日历意义的年月日差（结果取绝对值，三个分量均非负）。
 * 先从起始日推进整年、再推进整月，最后用剩余的自然日数补齐，
 * 避免「1 月 31 日到 3 月 1 日」这类月末场景出现负数天数。
 */
export function diffYmd(start: CivilDate, end: CivilDate): YmdDiff {
  const a = toDayNumber(start) <= toDayNumber(end) ? start : end
  const b = toDayNumber(start) <= toDayNumber(end) ? end : start
  const bDayNumber = toDayNumber(b)

  // 整月数上限：到达 b 的年月后再多推一个月必然超过 b，因此从这里向下试探即可
  let totalMonths = (b.year - a.year) * 12 + (b.month - a.month)
  while (totalMonths > 0 && toDayNumber(addMonthsClamped(a, totalMonths)) > bDayNumber) {
    totalMonths -= 1
  }

  const cursor = addMonthsClamped(a, totalMonths)
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: bDayNumber - toDayNumber(cursor)
  }
}

/**
 * 相隔天数说明：
 * - days / absoluteDays 为不含起始日的自然日差（例如 1 日到 2 日为 1 天）
 * - inclusiveDays 为包含起始日与结束日的天数（例如 1 日到 2 日为 2 天）
 */
export function describeInterval(start: CivilDate, end: CivilDate): {
  days: number
  absoluteDays: number
  inclusiveDays: number
} {
  const signed = diffDays(start, end)
  const absoluteDays = Math.abs(signed)
  return {
    days: signed,
    absoluteDays,
    inclusiveDays: absoluteDays + 1
  }
}

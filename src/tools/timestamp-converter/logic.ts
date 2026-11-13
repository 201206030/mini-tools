import type { CalcResult } from '@/types/common'

/** Date 对象可表示的最大毫秒数 */
const MAX_TIMESTAMP = 8.64e15

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export interface TimestampResult {
  seconds: string
  milliseconds: string
  date: string
  time: string
  datetime: string
  weekday: string
  relative: string
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function pad3(value: number): string {
  return String(value).padStart(3, '0')
}

/** 手动格式化本地时间，不依赖 toISOString，避免时区被转成 UTC */
export function formatDateParts(date: Date): { date: string; time: string; weekday: string } {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  const second = pad2(date.getSeconds())
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    weekday: WEEKDAY_NAMES[date.getDay()] || ''
  }
}

/** 相对现在的时间描述，now 由调用方传入以便测试 */
export function describeRelative(target: number, now: number): string {
  const diff = target - now
  const abs = Math.abs(diff)
  const suffix = diff >= 0 ? '后' : '前'
  if (abs < 60 * 1000) return diff === 0 ? '就是现在' : `${Math.round(abs / 1000)} 秒${suffix}`
  if (abs < 60 * 60 * 1000) return `${Math.round(abs / 60000)} 分钟${suffix}`
  if (abs < 24 * 60 * 60 * 1000) return `${Math.round(abs / 3600000)} 小时${suffix}`
  return `${Math.round(abs / 86400000)} 天${suffix}`
}

export function buildTimestampResult(ms: number, now: number): CalcResult<TimestampResult> {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_TIMESTAMP) {
    return { ok: false, message: '时间戳超出可表示范围' }
  }
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return { ok: false, message: '时间戳无效' }
  const parts = formatDateParts(date)
  const seconds = Math.floor(ms / 1000)
  return {
    ok: true,
    value: {
      seconds: String(seconds),
      milliseconds: String(Math.trunc(ms)),
      date: parts.date,
      time: parts.time,
      datetime: `${parts.date} ${parts.time}`,
      weekday: parts.weekday,
      relative: describeRelative(ms, now)
    }
  }
}

/**
 * 解析用户输入的时间戳：
 * 纯数字时按位数自动判断单位（10 位左右为秒，13 位左右为毫秒），
 * 也支持显式携带小数。
 */
export function parseTimestamp(text: string): CalcResult<number> {
  const raw = text.trim()
  if (!raw) return { ok: false, message: '请输入时间戳' }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { ok: false, message: '时间戳只能是数字' }
  const value = Number(raw)
  if (!Number.isFinite(value)) return { ok: false, message: '时间戳数值无效' }
  const digits = raw.replace('-', '').split('.')[0].length
  const ms = digits <= 11 ? value * 1000 : value
  if (Math.abs(ms) > MAX_TIMESTAMP) return { ok: false, message: '时间戳超出可表示范围' }
  return { ok: true, value: ms }
}

/** 用「年/月/日 时:分:秒」构造本地时间，避免 iOS 上解析字符串格式失败 */
export function datePartsToTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  now: number
): CalcResult<TimestampResult> {
  const values = [year, month, day, hour, minute, second]
  if (values.some((item) => !Number.isInteger(item))) {
    return { ok: false, message: '日期时间中包含无效数字' }
  }
  if (year < 1000 || year > 9999) return { ok: false, message: '年份需在 1000 到 9999 之间' }
  if (month < 1 || month > 12) return { ok: false, message: '月份需在 1 到 12 之间' }
  if (day < 1 || day > 31) return { ok: false, message: '日期不合法' }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return { ok: false, message: '时间不合法' }
  }

  const date = new Date(year, month - 1, day, hour, minute, second, 0)
  // 拒绝 2 月 30 日这类被 Date 自动进位的非法日期
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return { ok: false, message: '这个日期不存在，请重新选择' }
  }
  return buildTimestampResult(date.getTime(), now)
}

export function formatTimestampDetail(ms: number): string {
  const date = new Date(ms)
  const parts = formatDateParts(date)
  return `${parts.date} ${parts.time}.${pad3(date.getMilliseconds())} ${parts.weekday}`
}

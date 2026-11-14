import type { CalcResult } from '@/types/common'
import { toFiniteNumber } from '@/utils/number'

/** wake：已知起床时间倒推入睡时间；sleep：已知入睡时间推算起床时间 */
export type SleepMode = 'wake' | 'sleep'

export interface SleepSuggestion {
  /** 建议时间，格式 HH:mm */
  time: string
  /** 完整睡眠周期数 */
  cycles: number
  /** 总睡眠时长，单位分钟（不含入睡耗时） */
  durationMinutes: number
  /** 总睡眠时长中文，例如「7 小时 30 分」 */
  durationText: string
  /** 建议时间是否落在次日 */
  crossDay: boolean
  /** 「当天」或「次日」 */
  dayLabel: string
  /** 一句中文说明 */
  note: string
}

const MINUTES_PER_DAY = 1440
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
/** 推荐顺序：先给睡得最完整的 6 个周期，再依次减少；count 最大为 6，因此保留到 1 个周期 */
const CYCLE_COUNTS = [6, 5, 4, 3, 2, 1]

/** 严格解析 HH:mm（00:00~23:59），返回当天分钟数；非法返回 null */
export function parseTime(text: string): number | null {
  if (typeof text !== 'string') return null
  const match = TIME_RE.exec(text.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** 把分钟数自动按 24 小时取模后格式化为 HH:mm，负数也能正确处理 */
export function formatTime(minutes: number): string {
  if (!Number.isFinite(minutes)) return '00:00'
  const normalized = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** 把分钟数格式化为「X 小时 Y 分」 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  return `${Math.floor(total / 60)} 小时 ${total % 60} 分`
}

function checkInteger(value: unknown, label: string, min: number, max: number): CalcResult<number> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, message: `请填写${label}` }
  }
  const parsed = toFiniteNumber(value)
  if (parsed === null) return { ok: false, message: `请填写${label}` }
  if (!Number.isInteger(parsed)) return { ok: false, message: `${label}必须是整数` }
  if (parsed < min || parsed > max) {
    return { ok: false, message: `${label}应在 ${min} 到 ${max} 之间` }
  }
  return { ok: true, value: parsed }
}

/**
 * 按睡眠周期推算建议时间。
 * wake：建议入睡 = 起床时间 − N×周期 − 入睡耗时，N 依次取 6、5、4、3、2（count 控制条数）。
 * sleep：建议起床 = 入睡时间 + 入睡耗时 + N×周期。
 * 结果按推荐顺序（周期数由多到少）排列。
 */
export function calcSleepTimes(
  mode: SleepMode,
  time: string,
  cycleMinutes = 90,
  latencyMinutes = 15,
  count = 5
): CalcResult<SleepSuggestion[]> {
  if (mode !== 'wake' && mode !== 'sleep') {
    return { ok: false, message: '请选择有效的计算方式' }
  }
  const base = parseTime(time)
  if (base === null) {
    return { ok: false, message: '时间格式不正确，请按 HH:mm 选择或填写' }
  }
  const cycle = checkInteger(cycleMinutes, '睡眠周期', 60, 120)
  if (!cycle.ok) return cycle
  const latency = checkInteger(latencyMinutes, '入睡耗时', 0, 60)
  if (!latency.ok) return latency
  const amount = checkInteger(count, '建议数量', 3, 6)
  if (!amount.ok) return amount

  const inputTime = formatTime(base)
  const suggestions: SleepSuggestion[] = []
  for (const cycles of CYCLE_COUNTS.slice(0, amount.value)) {
    const durationMinutes = cycles * cycle.value
    const durationText = formatDuration(durationMinutes)
    let raw: number
    let crossDay: boolean
    if (mode === 'wake') {
      // raw < 0 表示入睡时间在前一晚（当天晚上）；raw >= 0 表示已过午夜（次日凌晨）
      raw = base - durationMinutes - latency.value
      crossDay = raw >= 0
    } else {
      raw = base + latency.value + durationMinutes
      crossDay = raw >= MINUTES_PER_DAY
    }
    const timeText = formatTime(raw)
    const dayLabel = crossDay ? '次日' : '当天'
    const note =
      mode === 'wake'
        ? `若想 ${inputTime} 起床，建议${dayLabel}${timeText}入睡，睡满 ${cycles} 个周期。`
        : `${inputTime} 入睡，建议${dayLabel}${timeText}起床，睡满 ${cycles} 个周期。`
    suggestions.push({
      time: timeText,
      cycles,
      durationMinutes,
      durationText,
      crossDay,
      dayLabel,
      note
    })
  }
  return { ok: true, value: suggestions }
}

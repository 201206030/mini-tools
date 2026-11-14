import { describe, expect, it } from 'vitest'
import {
  calcSleepTimes,
  formatDuration,
  formatTime,
  parseTime,
  type SleepSuggestion
} from '@/tools/sleep-calculator/logic'

function ok(
  mode: 'wake' | 'sleep',
  time: string,
  cycleMinutes?: number,
  latencyMinutes?: number,
  count?: number
): SleepSuggestion[] {
  const result = calcSleepTimes(mode, time, cycleMinutes, latencyMinutes, count)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('时间解析与格式化', () => {
  it('parseTime 严格解析 HH:mm 为当天分钟数', () => {
    expect(parseTime('00:00')).toBe(0)
    expect(parseTime('07:00')).toBe(420)
    expect(parseTime('07:05')).toBe(425)
    expect(parseTime('12:30')).toBe(750)
    expect(parseTime('23:59')).toBe(1439)
    expect(parseTime(' 07:05 ')).toBe(425)
  })

  it('parseTime 拒绝非法格式与越界时间', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('7:05')).toBeNull()
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
    expect(parseTime('12:5')).toBeNull()
    expect(parseTime('12-30')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime('07:00abc')).toBeNull()
    expect(parseTime(null as any)).toBeNull()
  })

  it('formatTime 自动按 24 小时取模，可处理负数与跨天', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(425)).toBe('07:05')
    expect(formatTime(1439)).toBe('23:59')
    expect(formatTime(1440)).toBe('00:00')
    expect(formatTime(1935)).toBe('08:15')
    expect(formatTime(-135)).toBe('21:45')
    expect(formatTime(-1)).toBe('23:59')
    expect(formatTime(NaN)).toBe('00:00')
  })

  it('formatDuration 输出小时分钟', () => {
    expect(formatDuration(450)).toBe('7 小时 30 分')
    expect(formatDuration(540)).toBe('9 小时 0 分')
    expect(formatDuration(90)).toBe('1 小时 30 分')
    expect(formatDuration(0)).toBe('0 小时 0 分')
  })
})

describe('睡眠计算器 · 按起床时间倒推', () => {
  it('默认参数给出 5 条建议，时间与当日/次日标注正确', () => {
    const list = ok('wake', '07:00')
    expect(list).toHaveLength(5)
    expect(list.map((item) => item.cycles)).toEqual([6, 5, 4, 3, 2])
    expect(list[0]).toMatchObject({ time: '21:45', dayLabel: '当天', crossDay: false, durationText: '9 小时 0 分' })
    expect(list[1]).toMatchObject({ time: '23:15', dayLabel: '当天', crossDay: false, durationText: '7 小时 30 分' })
    expect(list[2]).toMatchObject({ time: '00:45', dayLabel: '次日', crossDay: true, durationText: '6 小时 0 分' })
    expect(list[3]).toMatchObject({ time: '02:15', dayLabel: '次日', crossDay: true, durationText: '4 小时 30 分' })
    expect(list[4]).toMatchObject({ time: '03:45', dayLabel: '次日', crossDay: true, durationText: '3 小时 0 分' })
    expect(list[0].note).toContain('起床')
  })

  it('自定义周期与入睡耗时生效', () => {
    const list = ok('wake', '07:00', 60, 0, 3)
    expect(list).toHaveLength(3)
    expect(list[0]).toMatchObject({ time: '01:00', cycles: 6, durationText: '6 小时 0 分', dayLabel: '次日' })
    expect(list[1].time).toBe('02:00')
    expect(list[2].time).toBe('03:00')
  })

  it('起床时间在中午时按同一日历日规则标注', () => {
    const list = ok('wake', '12:00', 90, 15, 3)
    expect(list[0].time).toBe('02:45')
    expect(list[0].dayLabel).toBe('次日')
  })
})

describe('睡眠计算器 · 按入睡时间推算', () => {
  it('夜间入睡的起床建议均在次日', () => {
    const list = ok('sleep', '23:00')
    expect(list).toHaveLength(5)
    expect(list.map((item) => item.time)).toEqual(['08:15', '06:45', '05:15', '03:45', '02:15'])
    expect(list.every((item) => item.dayLabel === '次日' && item.crossDay)).toBe(true)
    expect(list[0].durationText).toBe('9 小时 0 分')
    expect(list[0].note).toContain('入睡')
  })

  it('白天小睡不跨天', () => {
    const list = ok('sleep', '08:00', 90, 15, 3)
    expect(list[0].time).toBe('17:15')
    expect(list[0].dayLabel).toBe('当天')
    expect(list[0].crossDay).toBe(false)
  })

  it('count 控制条数，最多 6 条', () => {
    expect(ok('sleep', '23:00', 90, 15, 3)).toHaveLength(3)
    expect(ok('sleep', '23:00', 90, 15, 6)).toHaveLength(6)
    expect(ok('wake', '07:00', 90, 15, 6)[5].cycles).toBe(1)
  })
})

describe('睡眠计算器 · 边界值与非法输入', () => {
  it('周期、入睡耗时与建议数量的边界可通过', () => {
    expect(ok('wake', '07:00', 60, 0, 3)).toHaveLength(3)
    expect(ok('wake', '07:00', 120, 60, 6)).toHaveLength(6)
  })

  it('拦截非法模式与时间格式', () => {
    expect(calcSleepTimes('xx' as any, '07:00').ok).toBe(false)
    expect(calcSleepTimes('wake', '25:00').ok).toBe(false)
    expect(calcSleepTimes('wake', '7:00').ok).toBe(false)
    expect(calcSleepTimes('wake', '').ok).toBe(false)
    expect(calcSleepTimes('wake', '07:60').ok).toBe(false)
  })

  it('拦截越界或非整数的周期、入睡耗时、建议数量', () => {
    expect(calcSleepTimes('wake', '07:00', 59).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 121).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90.5).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', NaN).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, -1).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, 61).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, 15.5).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, 15, 2).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, 15, 7).ok).toBe(false)
    expect(calcSleepTimes('wake', '07:00', 90, 15, 3.5).ok).toBe(false)
  })

  it('错误文案为中文', () => {
    const error = calcSleepTimes('wake', '99:99')
    expect(error.ok).toBe(false)
    if (!error.ok) expect(error.message.length).toBeGreaterThan(0)
  })
})

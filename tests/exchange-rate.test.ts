import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENCIES, POPULAR_CODES, SOURCE_PRIMARY, SOURCE_SUPPLEMENT, SUPPLEMENT_CODES } from '@/tools/exchange-rate/currencies'
import {
  BASE_CURRENCY,
  CACHE_TTL_MS,
  CACHE_VERSION,
  MIN_REFRESH_INTERVAL_MS,
  availableCurrencies,
  convert,
  describeStatus,
  formatAmountText,
  formatRate,
  isRateCache,
  mergeRates,
  parseAmount,
  parseFrankfurter,
  parseSupplement,
  rateRequestUrls,
  resolveRefreshOutcome,
  searchCurrencies,
  shouldRefresh,
  sortCurrencies
} from '@/tools/exchange-rate/logic'
import type { RateCache } from '@/tools/exchange-rate/logic'
import * as storage from '@/services/storage'
import { loadCachedRates } from '@/services/exchange-rate'

/** 以下仅为接口返回结构的测试样本，不是产品内置的汇率；真实汇率一律来自网络与本地缓存 */
const PRIMARY_SAMPLE = {
  amount: 1,
  base: 'USD',
  date: '2026-11-12',
  rates: {
    CNY: 6.6683,
    EUR: 0.90245,
    GBP: 0.7544,
    JPY: 159.7,
    KRW: 1334.1,
    HKD: 7.8448,
    SGD: 1.2859,
    AUD: 1.4661,
    CAD: 1.4249,
    CHF: 0.83314,
    THB: 33.815,
    MYR: 4.0785,
    INR: 94.04
  }
}

const SUPPLEMENT_SAMPLE = {
  result: 'success',
  base_code: 'USD',
  rates: { USD: 1, TWD: 32.976133, RUB: 82.849685, CNY: 6.685071 }
}

const NOW = 1_800_000_000_000
const HOUR = 60 * 60 * 1000

function fullRates(): Record<string, number> {
  return { ...PRIMARY_SAMPLE.rates, [BASE_CURRENCY]: 1, TWD: 32.976133, RUB: 82.849685 }
}

function makeCache(overrides: Partial<RateCache> = {}): RateCache {
  return {
    version: CACHE_VERSION,
    base: BASE_CURRENCY,
    rates: fullRates(),
    updatedAt: NOW - HOUR,
    rateDate: PRIMARY_SAMPLE.date,
    sources: [SOURCE_PRIMARY, SOURCE_SUPPLEMENT],
    partial: false,
    ...overrides
  }
}

function createUniMock() {
  const map = new Map<string, string>()
  return {
    __map: map,
    getStorageSync: (key: string) => (map.has(key) ? map.get(key) : ''),
    setStorageSync: (key: string, value: string) => map.set(key, value),
    removeStorageSync: (key: string) => map.delete(key)
  }
}

let mock: ReturnType<typeof createUniMock>

beforeEach(() => {
  mock = createUniMock()
  ;(globalThis as any).uni = mock
  storage.clearAll()
})

afterEach(() => {
  delete (globalThis as any).uni
  vi.restoreAllMocks()
})

describe('汇率接口数据解析', () => {
  it('解析 Frankfurter 的 base / date / rates，并补上基准币种自身汇率', () => {
    const result = parseFrankfurter(PRIMARY_SAMPLE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rateDate).toBe('2026-11-12')
    expect(result.value.rates.USD).toBe(1)
    expect(result.value.rates.CNY).toBe(6.6683)
    expect(Object.keys(result.value.rates).length).toBeGreaterThan(10)
  })

  it('拒绝基准货币不符、缺少日期、汇率结构异常的数据', () => {
    expect(parseFrankfurter({ ...PRIMARY_SAMPLE, base: 'EUR' }).ok).toBe(false)
    expect(parseFrankfurter({ ...PRIMARY_SAMPLE, date: '2026/11/12' }).ok).toBe(false)
    expect(parseFrankfurter({ ...PRIMARY_SAMPLE, rates: { CNY: -1, USD: 1 } }).ok).toBe(false)
    expect(parseFrankfurter({ ...PRIMARY_SAMPLE, rates: {} }).ok).toBe(false)
    expect(parseFrankfurter(null).ok).toBe(false)
  })

  it('补充源只提取 Frankfurter 未覆盖的币种', () => {
    const result = parseSupplement(SUPPLEMENT_SAMPLE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.value).sort()).toEqual([...SUPPLEMENT_CODES].sort())
    expect(result.value.TWD).toBeCloseTo(32.976133, 5)
    expect(result.value.CNY).toBeUndefined()
    expect(parseSupplement({ ...SUPPLEMENT_SAMPLE, result: 'error' }).ok).toBe(false)
    expect(parseSupplement({ ...SUPPLEMENT_SAMPLE, base_code: 'EUR' }).ok).toBe(false)
  })
})

describe('数据合并与失败降级', () => {
  it('主源 + 补充源合并后覆盖全部支持币种，并记录两个来源', () => {
    const parsed = parseFrankfurter(PRIMARY_SAMPLE)
    const supplement = parseSupplement(SUPPLEMENT_SAMPLE)
    if (!parsed.ok || !supplement.ok) throw new Error('样本解析失败')
    const merged = mergeRates(parsed.value.rates, supplement.value, null)
    expect(merged.partial).toBe(false)
    expect(merged.sources).toEqual([SOURCE_PRIMARY, SOURCE_SUPPLEMENT])
    SUPPLEMENT_CODES.forEach((code) => expect(merged.rates[code]).toBeGreaterThan(0))
    expect(merged.rates.USD).toBe(1)
    // 测试样本是真实 29 币种响应的子集，断言样本里的每个币种都变为可用即可
    const list = availableCurrencies(merged.rates)
    expect(list).toHaveLength(Object.keys(PRIMARY_SAMPLE.rates).length + 1 + SUPPLEMENT_CODES.length)
    Object.keys(PRIMARY_SAMPLE.rates).forEach((code) => expect(list.some((item) => item.code === code)).toBe(true))
    SUPPLEMENT_CODES.forEach((code) => expect(list.some((item) => item.code === code)).toBe(true))
    expect(list.length).toBeLessThanOrEqual(CURRENCIES.length)
  })

  it('本次补充源成功时来源不标注沿用', () => {
    const parsed = parseFrankfurter(PRIMARY_SAMPLE)
    const supplement = parseSupplement(SUPPLEMENT_SAMPLE)
    if (!parsed.ok || !supplement.ok) throw new Error('样本解析失败')
    const merged = mergeRates(parsed.value.rates, supplement.value, makeCache())
    expect(merged.sources).toEqual([SOURCE_PRIMARY, SOURCE_SUPPLEMENT])
  })

  it('补充源失败时沿用上一次缓存里的旧值，不让已可用币种突然消失', () => {
    const previous = makeCache()
    const merged = mergeRates(PRIMARY_SAMPLE.rates, null, previous)
    expect(merged.partial).toBe(false)
    expect(merged.rates.TWD).toBe(previous.rates.TWD)
    expect(merged.rates.RUB).toBe(previous.rates.RUB)
    // 沿用旧值不能冒充本次从补充源新取的数据，来源里要如实标注
    expect(merged.sources).toEqual([SOURCE_PRIMARY, `${SOURCE_SUPPLEMENT}（部分沿用上次缓存）`])
  })

  it('首次使用且补充源失败时标记为部分缺失，缺失币种不会被伪装成可用', () => {
    const merged = mergeRates(PRIMARY_SAMPLE.rates, null, null)
    expect(merged.partial).toBe(true)
    expect(merged.rates.TWD).toBeUndefined()
    expect(availableCurrencies(merged.rates).some((item) => item.code === 'TWD')).toBe(false)
  })

  it('更新失败一定保留旧缓存，首次失败给出联网提示', () => {
    const previous = makeCache()
    const failed = resolveRefreshOutcome(previous, { ok: false, message: '网络连接失败' })
    expect(failed.cache).toBe(previous)
    expect(failed.updated).toBe(false)
    const firstTime = resolveRefreshOutcome(null, { ok: false, message: '网络连接失败' })
    expect(firstTime.cache).toBeNull()
    expect(firstTime.message).toContain('网络')
    const success = resolveRefreshOutcome(previous, { ok: true, cache: makeCache({ updatedAt: NOW }) })
    expect(success.updated).toBe(true)
    expect(success.cache?.updatedAt).toBe(NOW)
  })
})

describe('本地缓存结构与有效性校验', () => {
  it('接受结构完整的缓存', () => {
    expect(isRateCache(makeCache())).toBe(true)
  })

  it('拒绝损坏、版本不符、汇率非法与缺基准币种的数据', () => {
    expect(isRateCache(null)).toBe(false)
    expect(isRateCache('{broken')).toBe(false)
    expect(isRateCache(makeCache({ version: 99 }))).toBe(false)
    expect(isRateCache(makeCache({ base: 'EUR' }))).toBe(false)
    expect(isRateCache(makeCache({ rateDate: '昨天' }))).toBe(false)
    expect(isRateCache(makeCache({ updatedAt: Number.NaN }))).toBe(false)
    expect(isRateCache(makeCache({ rates: { ...fullRates(), JPY: -1 } }))).toBe(false)
    expect(isRateCache(makeCache({ rates: { ...fullRates(), CNY: '6.6' as unknown as number } }))).toBe(false)
    expect(isRateCache(makeCache({ rates: { USD: 1, CNY: 6.6 } }))).toBe(false)
    expect(isRateCache(makeCache({ partial: 'false' as unknown as boolean }))).toBe(false)
    const noUsd = fullRates()
    delete noUsd.USD
    expect(isRateCache(makeCache({ rates: noUsd }))).toBe(false)
  })

  it('通用本地读写可持久化，损坏数据与清除缓存都会安全回退', () => {
    const cache = makeCache()
    storage.writeLocalJSON('wntx_exchange_rates', cache)
    expect(loadCachedRates()).toEqual(cache)
    mock.__map.set('wntx_exchange_rates', '{broken json')
    expect(loadCachedRates()).toBeNull()
    storage.writeLocalJSON('wntx_exchange_rates', cache)
    storage.clearAll()
    expect(loadCachedRates()).toBeNull()
  })

  it('Storage 不可用时降级到内存态，本次会话仍可换算', () => {
    delete (globalThis as any).uni
    storage.clearAll()
    storage.writeLocalJSON('wntx_exchange_rates', makeCache())
    expect(loadCachedRates()).not.toBeNull()
  })
})

describe('按需更新机制', () => {
  it('首次无缓存时联网获取', () => {
    expect(shouldRefresh(null, NOW, 0)).toEqual({ refresh: true, reason: 'no-cache' })
  })

  it('24 小时内重复进入页面不发起请求', () => {
    expect(shouldRefresh(makeCache({ updatedAt: NOW - 23 * HOUR }), NOW, 0).refresh).toBe(false)
    expect(shouldRefresh(makeCache(), NOW, 0).reason).toBe('fresh')
    expect(CACHE_TTL_MS).toBe(24 * HOUR)
  })

  it('超过 24 小时自动尝试更新', () => {
    expect(shouldRefresh(makeCache({ updatedAt: NOW - 25 * HOUR }), NOW, 0)).toEqual({
      refresh: true,
      reason: 'expired'
    })
  })

  it('手动刷新触发更新，但 60 秒内不重复请求', () => {
    expect(shouldRefresh(makeCache(), NOW, 0, true).reason).toBe('manual')
    expect(shouldRefresh(makeCache(), NOW, NOW - 10_000).reason).toBe('throttled')
    expect(shouldRefresh(null, NOW, NOW - 10_000).refresh).toBe(false)
    expect(MIN_REFRESH_INTERVAL_MS).toBe(60 * 1000)
    expect(shouldRefresh(makeCache(), NOW, NOW - 61_000, true).refresh).toBe(true)
  })

  it('请求地址固定且不含任何用户输入的金额', () => {
    const urls = rateRequestUrls()
    expect(urls).toHaveLength(2)
    urls.forEach((url) => {
      expect(url.startsWith('https://')).toBe(true)
      expect(url).not.toContain('amount')
      expect(url).not.toContain('value')
      expect(url).not.toContain('100')
    })
    expect(urls[0]).toContain('api.frankfurter.dev/v1/latest?base=USD')
    expect(urls[1]).toContain('open.er-api.com/v6/latest/USD')
  })
})

describe('离线换算与金额校验', () => {
  const rates = fullRates()

  it('只要有本地汇率就能离线完成换算，不需要网络', () => {
    const result = convert(100, 'CNY', 'USD', rates)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // value 已按目标币种展示位数取整，rate 保留未取整的交叉汇率
    expect(result.value.value).toBeCloseTo(15, 2)
    expect(result.value.text).toBe('15.00')
    expect(result.value.rate).toBeCloseTo(0.14996, 4)
    expect(result.value.expression).toContain('人民币')
  })

  it('结果按目标币种的小数位展示并修正浮点尾差', () => {
    const jpy = convert(1, 'USD', 'JPY', rates)
    expect(jpy.ok).toBe(true)
    if (jpy.ok) {
      expect(jpy.value.digits).toBe(0)
      expect(jpy.value.text).toBe('160')
    }
    const cny = convert(1, 'USD', 'CNY', rates)
    expect(cny.ok).toBe(true)
    if (cny.ok) expect(cny.value.text).toBe('6.67')
    expect(formatAmountText(1.005, 2)).toBe('1.01')
    expect(formatAmountText(1234567.891, 2)).toBe('1,234,567.89')
    expect(formatRate(6.6683)).toContain('6.6683')
  })

  it('交换币种后交叉汇率互为倒数', () => {
    const a = convert(1, 'EUR', 'KRW', rates)
    const b = convert(1, 'KRW', 'EUR', rates)
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.value.rate * b.value.rate).toBeCloseTo(1, 10)
  })

  it('缺少所选币种汇率时给出明确中文提示', () => {
    const result = convert(100, 'CNY', 'TWD', { USD: 1, CNY: 6.6683 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('缺少')
  })

  it('空值、负数、非法字符与极大数值都要拒绝', () => {
    expect(parseAmount('').ok).toBe(false)
    expect(parseAmount('   ').ok).toBe(false)
    expect(parseAmount('abc').ok).toBe(false)
    expect(parseAmount('1.2.3').ok).toBe(false)
    const negative = parseAmount('-1')
    expect(negative.ok).toBe(false)
    if (!negative.ok) expect(negative.message).toContain('负数')
    const huge = parseAmount('1000000000000000000000')
    expect(huge.ok).toBe(false)
    if (!huge.ok) expect(huge.message).toContain('过大')
    expect(parseAmount('1e309').ok).toBe(false)
  })

  it('小数、零、首尾空格与千分位写法可正常处理', () => {
    const decimal = parseAmount('  12.345 ')
    expect(decimal.ok).toBe(true)
    if (decimal.ok) expect(decimal.value).toBeCloseTo(12.345, 5)
    const zero = parseAmount('0')
    expect(zero.ok).toBe(true)
    if (zero.ok) expect(zero.value).toBe(0)
    const grouped = parseAmount('1,000.5')
    expect(grouped.ok).toBe(true)
    if (grouped.ok) expect(grouped.value).toBeCloseTo(1000.5, 5)
    expect(convert(0, 'CNY', 'USD', rates).ok).toBe(true)
  })
})

describe('币种列表、搜索与排序', () => {
  const rates = fullRates()

  it('只展示本机已有汇率的币种，常用币种置顶', () => {
    const list = availableCurrencies(rates)
    expect(list[0].code).toBe(POPULAR_CODES[0])
    expect(list.every((item) => rates[item.code] > 0)).toBe(true)
    expect(availableCurrencies(null)).toEqual([])
    expect(availableCurrencies({ USD: 1, CNY: 6.6 }).map((item) => item.code).sort()).toEqual(['CNY', 'USD'])
  })

  it('按代码与按中文名称排序结果不同，且都不丢币种', () => {
    const list = availableCurrencies(rates)
    const byCode = sortCurrencies(list, 'code').map((item) => item.code)
    const byName = sortCurrencies(list, 'name').map((item) => item.code)
    expect(byCode).toHaveLength(list.length)
    expect(byName).toHaveLength(list.length)
    expect(new Set(byName)).toEqual(new Set(byCode))
    expect(byName).not.toEqual(byCode)
  })

  it('支持中文名、英文名、代码与符号搜索', () => {
    expect(searchCurrencies('日元', rates).map((item) => item.code)).toContain('JPY')
    expect(searchCurrencies('Japanese', rates).map((item) => item.code)).toContain('JPY')
    expect(searchCurrencies('jpy', rates)[0].code).toBe('JPY')
    expect(searchCurrencies('US', rates).map((item) => item.code)).toContain('USD')
    expect(searchCurrencies('不存在的币种xyz', rates)).toEqual([])
  })
})

describe('汇率状态展示', () => {
  it('无缓存、本地缓存、最新数据、已过期四种状态如实标注', () => {
    expect(describeStatus(null, NOW, false).status).toBe('missing')
    const cached = describeStatus(makeCache(), NOW, false)
    expect(cached.status).toBe('cached')
    expect(cached.label).toBe('本地缓存')
    expect(describeStatus(makeCache(), NOW, true).label).toBe('最新数据')
    const stale = describeStatus(makeCache({ updatedAt: NOW - 26 * HOUR }), NOW, false)
    expect(stale.status).toBe('stale')
    expect(stale.label).toBe('数据已过期')
    expect(stale.detail).toContain('24 小时')
    expect(stale.detail).toContain('参考汇率日期')
  })
})

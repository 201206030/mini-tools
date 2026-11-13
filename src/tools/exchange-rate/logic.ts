import type { CalcResult } from '@/types/common'
import { addThousandSeparators, formatNumber, isSafeAmount, roundTo, toFiniteNumber } from '@/utils/number'
import {
  CURRENCIES,
  POPULAR_CODES,
  PRIMARY_API,
  SOURCE_PRIMARY,
  SOURCE_SUPPLEMENT,
  SUPPLEMENT_API,
  SUPPLEMENT_CODES,
  getCurrency
} from './currencies'
import type { Currency } from './currencies'

/** 所有汇率统一以 USD 为基准，任意两币种通过交叉汇率换算，一次请求即可覆盖全部币种 */
export const BASE_CURRENCY = 'USD'
export const CACHE_VERSION = 1
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000
/** 短时间内重复点击刷新 / 反复进入页面的最小请求间隔 */
export const MIN_REFRESH_INTERVAL_MS = 60 * 1000

export interface RateCache {
  version: number
  base: string
  /** 相对 USD 的汇率表，形如 { USD: 1, CNY: 6.6683, ... } */
  rates: Record<string, number>
  /** 成功保存到本地的时间戳（毫秒） */
  updatedAt: number
  /** 参考汇率对应的数据日期，来自 Frankfurter 的 date 字段 */
  rateDate: string
  /** 本次成功使用的数据来源 */
  sources: string[]
  /** 补充源失败时为 true，此时部分币种可能缺失 */
  partial: boolean
}

export type RateStatus = 'fresh' | 'cached' | 'stale' | 'missing'

export interface RateStatusInfo {
  status: RateStatus
  label: string
  detail: string
  tone: 'ok' | 'warn' | 'danger'
}

export interface ConversionResult {
  value: number
  text: string
  /** 1 单位原始币种可兑换多少目标币种 */
  rate: number
  rateText: string
  digits: number
  expression: string
}

const ok = <T>(value: T): CalcResult<T> => ({ ok: true, value })
const fail = <T>(message: string): CalcResult<T> => ({ ok: false, message })

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isDateText(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** 缓存结构校验：损坏、版本不符、字段缺失、汇率非法一律视为无缓存 */
export function isRateCache(value: unknown): value is RateCache {
  if (!isRecord(value)) return false
  if (value.version !== CACHE_VERSION || value.base !== BASE_CURRENCY) return false
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt <= 0) return false
  if (!isDateText(value.rateDate)) return false
  if (!Array.isArray(value.sources) || !value.sources.every((item) => typeof item === 'string')) return false
  if (typeof value.partial !== 'boolean') return false
  if (!isRecord(value.rates)) return false
  const entries = Object.entries(value.rates)
  if (entries.length < 10) return false
  if (!entries.every(([, rate]) => isPositiveNumber(rate))) return false
  return value.rates[BASE_CURRENCY] === 1
}

/**
 * 解析 Frankfurter /v1/latest?base=USD 的返回。
 * 实测结构：{ amount: 1, base: "USD", date: "YYYY-MM-DD", rates: { ... } }，
 * rates 不含 base 自身，解析时补 1。
 */
export function parseFrankfurter(data: unknown): CalcResult<{ rates: Record<string, number>; rateDate: string }> {
  if (!isRecord(data)) return fail('汇率接口返回格式异常')
  if (data.base !== BASE_CURRENCY) return fail('汇率接口返回的基准货币不符合预期')
  if (!isDateText(data.date)) return fail('汇率接口缺少有效的数据日期')
  if (!isRecord(data.rates)) return fail('汇率接口缺少汇率数据')
  const rates: Record<string, number> = { [BASE_CURRENCY]: 1 }
  Object.entries(data.rates).forEach(([code, rate]) => {
    if (/^[A-Z]{3}$/.test(code) && isPositiveNumber(rate)) rates[code] = rate
  })
  if (Object.keys(rates).length < 10) return fail('汇率接口返回的有效币种过少')
  return ok({ rates, rateDate: data.date })
}

/** 解析补充源 open.er-api.com/v6/latest/USD 的返回 */
export function parseSupplement(data: unknown): CalcResult<Record<string, number>> {
  if (!isRecord(data)) return fail('补充汇率接口返回格式异常')
  if (data.result !== 'success') return fail('补充汇率接口未返回成功状态')
  if (data.base_code !== BASE_CURRENCY) return fail('补充汇率接口基准货币不符合预期')
  const rawRates = data.rates
  if (!isRecord(rawRates)) return fail('补充汇率接口缺少汇率数据')
  const rates: Record<string, number> = {}
  SUPPLEMENT_CODES.forEach((code) => {
    const rate = rawRates[code]
    if (isPositiveNumber(rate)) rates[code] = rate
  })
  if (Object.keys(rates).length === 0) return fail('补充汇率接口没有可用的补充币种')
  return ok(rates)
}

/**
 * 合并主源与补充源；补充源缺失的币种优先沿用上一次缓存里的旧值，
 * 保证某一次补充失败不会让已经可用的币种突然消失。
 */
export function mergeRates(
  primary: Record<string, number>,
  supplement: Record<string, number> | null,
  previous: RateCache | null
): { rates: Record<string, number>; partial: boolean; sources: string[] } {
  const rates: Record<string, number> = { ...primary }
  const sources: string[] = [SOURCE_PRIMARY]
  let missing = 0
  let reused = 0
  SUPPLEMENT_CODES.forEach((code) => {
    const fresh = supplement && supplement[code]
    const old = previous && previous.rates[code]
    if (isPositiveNumber(fresh)) {
      rates[code] = fresh
    } else if (isPositiveNumber(old)) {
      rates[code] = old
      reused += 1
    } else {
      missing += 1
    }
  })
  // 只要缓存里包含补充源币种，就如实列出该来源；沿用旧值时额外标注，避免冒充本次新取的数据
  const hasFreshSupplement = Boolean(supplement && Object.keys(supplement).length > 0)
  if (hasFreshSupplement || reused > 0) {
    sources.push(reused > 0 ? `${SOURCE_SUPPLEMENT}（部分沿用上次缓存）` : SOURCE_SUPPLEMENT)
  }
  return { rates, partial: missing > 0, sources }
}

/** 金额合法性：空值、非法字符、负数、超大数值都要给出中文提示 */
export function parseAmount(text: string): CalcResult<number> {
  const trimmed = String(text === null || text === undefined ? '' : text).trim()
  if (!trimmed) return fail('请输入要换算的金额')
  const value = toFiniteNumber(trimmed)
  if (value === null) return fail('金额请输入有效数字')
  if (value < 0) return fail('金额不能为负数')
  if (!isSafeAmount(value)) return fail('金额过大，请输入不超过 1 万亿的数值')
  return ok(value)
}

/** 结果按目标币种的小数位展示，先做尾差修正再补千分位，避免 1.005 这类浮点误差 */
export function formatAmountText(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1e15) return value.toExponential(4).replace('e+', 'e')
  const factor = Math.pow(10, Math.max(0, Math.min(6, digits)))
  const rounded = roundTo(Math.round(value * factor + 1e-7) / factor, digits)
  return addThousandSeparators(rounded.toFixed(digits))
}

export function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '—'
  return formatNumber(rate, rate >= 1 ? 8 : 6)
}

/** 纯本地换算，不依赖网络；任意两币种通过 USD 基准做交叉汇率 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): CalcResult<ConversionResult> {
  if (!Number.isFinite(amount) || amount < 0 || !isSafeAmount(amount)) return fail('金额不合法')
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!isPositiveNumber(fromRate) || !isPositiveNumber(toRate)) {
    return fail('当前缺少所选币种的汇率，请联网刷新后再试')
  }
  const rate = toRate / fromRate
  const raw = amount * rate
  if (!Number.isFinite(raw) || raw > 1e15) return fail('换算结果超出可显示范围，请减小金额')
  const digits = getCurrency(to)?.digits ?? 2
  const text = formatAmountText(raw, digits)
  const value = roundTo(raw, digits)
  const fromCurrency = getCurrency(from)
  const toCurrency = getCurrency(to)
  return ok({
    value,
    text,
    rate,
    rateText: formatRate(rate),
    digits,
    expression: `1 ${from} ≈ ${formatRate(rate)} ${to}（${fromCurrency?.nameCn || from} → ${toCurrency?.nameCn || to}）`
  })
}

/** 当前可选的币种由缓存里实际存在的汇率决定，绝不把缺失币种伪装成可用 */
export function availableCurrencies(rates: Record<string, number> | null): Currency[] {
  if (!rates) return []
  const codes = new Set(Object.keys(rates))
  const popular = POPULAR_CODES.map((code) => getCurrency(code)).filter(
    (item): item is Currency => Boolean(item && codes.has(item.code))
  )
  const rest = CURRENCIES.filter((item) => codes.has(item.code) && !POPULAR_CODES.includes(item.code))
  return [...popular, ...rest]
}

export type CurrencySort = 'code' | 'name'

/** 按代码（常用币种置顶、其余字母序）或按中文名称排序 */
export function sortCurrencies(list: Currency[], by: CurrencySort): Currency[] {
  if (by === 'name') {
    return list.slice().sort((a, b) => a.nameCn.localeCompare(b.nameCn, 'zh-CN') || a.code.localeCompare(b.code))
  }
  const popular = POPULAR_CODES.map((code) => list.find((item) => item.code === code)).filter(
    (item): item is Currency => Boolean(item)
  )
  const rest = list
    .filter((item) => !POPULAR_CODES.includes(item.code))
    .sort((a, b) => a.code.localeCompare(b.code))
  return [...popular, ...rest]
}

/** 支持中文名、英文名、代码与符号搜索；按匹配权重再按代码排序 */
export function searchCurrencies(
  query: string,
  rates: Record<string, number> | null,
  sortBy: CurrencySort = 'code'
): Currency[] {
  const list = availableCurrencies(rates)
  const keyword = query.trim().toLowerCase()
  if (!keyword) return sortCurrencies(list, sortBy)
  const scored = list
    .map((item) => {
      const code = item.code.toLowerCase()
      const cn = item.nameCn.toLowerCase()
      const en = item.nameEn.toLowerCase()
      const symbol = item.symbol.toLowerCase()
      let score = -1
      if (code === keyword) score = 0
      else if (code.startsWith(keyword)) score = 1
      else if (cn.includes(keyword)) score = 2
      else if (en.includes(keyword)) score = 3
      else if (code.includes(keyword) || symbol === keyword) score = 4
      return { item, score }
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.item.code.localeCompare(b.item.code))
  return scored.map((entry) => entry.item)
}

/**
 * 按需更新决策：无缓存、缓存超过 24 小时、用户手动刷新才更新；
 * 24 小时内重复进入页面不请求；60 秒内不重复请求。
 */
export function shouldRefresh(
  cache: RateCache | null,
  now: number,
  lastAttemptAt: number,
  force = false
): { refresh: boolean; reason: 'no-cache' | 'expired' | 'manual' | 'fresh' | 'throttled' } {
  if (lastAttemptAt > 0 && now - lastAttemptAt < MIN_REFRESH_INTERVAL_MS) {
    return { refresh: false, reason: 'throttled' }
  }
  if (!cache) return { refresh: true, reason: 'no-cache' }
  if (force) return { refresh: true, reason: 'manual' }
  if (now - cache.updatedAt >= CACHE_TTL_MS) return { refresh: true, reason: 'expired' }
  return { refresh: false, reason: 'fresh' }
}

/** 更新失败时保留旧缓存，绝不覆盖上一次有效数据 */
export function resolveRefreshOutcome(
  previous: RateCache | null,
  result: { ok: true; cache: RateCache } | { ok: false; message: string }
): { cache: RateCache | null; updated: boolean; message: string } {
  if (result.ok) return { cache: result.cache, updated: true, message: '汇率已更新' }
  return {
    cache: previous,
    updated: false,
    message: previous ? '更新失败，已继续使用上次保存的汇率' : '暂时无法获取汇率，请连接网络后重试'
  }
}

export function describeStatus(cache: RateCache | null, now: number, justUpdated: boolean): RateStatusInfo {
  if (!cache) {
    return { status: 'missing', label: '暂无汇率数据', detail: '请联网获取一次汇率，之后即可离线换算', tone: 'danger' }
  }
  const age = Math.max(0, now - cache.updatedAt)
  const time = formatDateTime(cache.updatedAt)
  const dateText = `参考汇率日期 ${cache.rateDate}`
  if (age >= CACHE_TTL_MS) {
    return {
      status: 'stale',
      label: '数据已过期',
      detail: `上次更新 ${time}，已超过 24 小时，${dateText}。有网络时会自动尝试更新`,
      tone: 'warn'
    }
  }
  if (justUpdated) {
    return { status: 'fresh', label: '最新数据', detail: `更新于 ${time}，${dateText}`, tone: 'ok' }
  }
  return { status: 'cached', label: '本地缓存', detail: `保存于 ${time}，${dateText}，24 小时内不会重复联网`, tone: 'ok' }
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** 手动按本地时间格式化，避免 iOS 对日期字符串的解析差异 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function describeAge(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/** 请求地址里只带固定基准货币，绝不含任何用户输入 */
export function rateRequestUrls(): string[] {
  return [PRIMARY_API, SUPPLEMENT_API]
}

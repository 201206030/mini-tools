import { readLocalJSON, writeLocalJSON } from './storage'
import { PRIMARY_API, SUPPLEMENT_API, SOURCE_PRIMARY } from '@/tools/exchange-rate/currencies'
import {
  BASE_CURRENCY,
  CACHE_VERSION,
  isRateCache,
  mergeRates,
  parseFrankfurter,
  parseSupplement,
  resolveRefreshOutcome,
  shouldRefresh
} from '@/tools/exchange-rate/logic'
import type { RateCache } from '@/tools/exchange-rate/logic'

const KEY = 'wntx_exchange_rates'
const REQUEST_TIMEOUT = 8000

/** 模块级状态：记录上次实际发起请求的时间，并合并并发请求，避免短时间重复联网 */
let lastAttemptAt = 0
let inFlight: Promise<RefreshOutcome> | null = null

export interface RefreshOutcome {
  cache: RateCache | null
  updated: boolean
  message: string
  throttled: boolean
}

/** 读取本地汇率缓存；数据缺失、损坏、结构不合法一律返回 null，不抛异常 */
export function loadCachedRates(): RateCache | null {
  return readLocalJSON<RateCache | null>(KEY, null, isRateCache)
}

/** 只有联网获取成功后才会调用，失败路径绝不写缓存 */
function saveRateCache(cache: RateCache): void {
  writeLocalJSON(KEY, cache)
}

function normalizeBody(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data
}

/**
 * 只向公开的汇率接口发起 GET 请求，URL 固定、无查询参数携带用户输入。
 * 项目里唯一的网络请求就在这里：请求内容只有「以 USD 为基准的最新汇率」。
 */
function requestJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      uni.request({
        url,
        method: 'GET',
        timeout: REQUEST_TIMEOUT,
        success: (res) => {
          if (res.statusCode !== 200) {
            reject(new Error('汇率服务暂时不可用'))
            return
          }
          const body = normalizeBody(res.data)
          if (!body || typeof body !== 'object') {
            reject(new Error('汇率数据格式异常'))
            return
          }
          resolve(body)
        },
        fail: () => reject(new Error('网络连接失败'))
      })
    } catch {
      reject(new Error('无法发起网络请求'))
    }
  })
}

/**
 * 主源 Frankfurter 必须成功，否则整次更新失败且不覆盖旧缓存；
 * 补充源只用于补齐 Frankfurter 不支持的 TWD / RUB，失败时沿用旧值或标记为缺失。
 */
async function fetchLatest(previous: RateCache | null): Promise<RateCache> {
  const primaryRaw = await requestJson(PRIMARY_API)
  const parsed = parseFrankfurter(primaryRaw)
  if (!parsed.ok) throw new Error(parsed.message)

  let supplement: Record<string, number> | null = null
  try {
    const supplementRaw = await requestJson(SUPPLEMENT_API)
    const parsedSupplement = parseSupplement(supplementRaw)
    if (parsedSupplement.ok) supplement = parsedSupplement.value
  } catch {
    // 补充源不可达不影响主源，缺失币种由 mergeRates 沿用旧缓存或标记 partial
  }

  const merged = mergeRates(parsed.value.rates, supplement, previous)
  return {
    version: CACHE_VERSION,
    base: BASE_CURRENCY,
    rates: merged.rates,
    updatedAt: Date.now(),
    rateDate: parsed.value.rateDate,
    sources: merged.sources,
    partial: merged.partial
  }
}

/**
 * 按需更新入口：页面进入时调用（force=false），手动点刷新时调用（force=true）。
 * 无缓存 / 超过 24 小时 / 手动刷新才会联网；60 秒内不重复请求；
 * 更新失败返回旧缓存，页面继续可用。
 */
export function refreshRates(force = false, now = Date.now()): Promise<RefreshOutcome> {
  const previous = loadCachedRates()
  const decision = shouldRefresh(previous, now, lastAttemptAt, force)
  if (!decision.refresh) {
    return Promise.resolve({
      cache: previous,
      updated: false,
      message: decision.reason === 'throttled' ? '刚刚检查过，请稍后再刷新' : '',
      throttled: decision.reason === 'throttled'
    })
  }
  if (inFlight) return inFlight

  lastAttemptAt = now
  inFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const cache = await fetchLatest(previous)
      saveRateCache(cache)
      const outcome = resolveRefreshOutcome(previous, { ok: true, cache })
      return { ...outcome, throttled: false }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '汇率更新失败'
      const outcome = resolveRefreshOutcome(previous, { ok: false, message: reason })
      return { ...outcome, throttled: false }
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** 供界面展示数据来源（不暴露接口细节之外的任何信息） */
export function describeSources(cache: RateCache | null): string {
  if (!cache) return SOURCE_PRIMARY
  if (cache.partial) return `${cache.sources.join('、')}（本次有部分币种未取到）`
  return cache.sources.join('、')
}

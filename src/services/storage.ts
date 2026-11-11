import type { Prefs } from '@/types/common'
import type { RecentItem } from '@/types/tool'

const PREFIX = 'wntx_'
const KEY_FAVORITES = PREFIX + 'favorites'
const KEY_RECENT = PREFIX + 'recent'
const KEY_PREFS = PREFIX + 'prefs'
const ALL_KEYS = [KEY_FAVORITES, KEY_RECENT, KEY_PREFS]

export const MAX_RECENT = 10

/**
 * 内存降级表：当小程序 Storage 不可用（受限环境、存储已满、宿主禁用）时，
 * 保证本次会话内功能仍然可用；数据损坏时也不会抛异常。
 */
const memory = new Map<string, string>()

function hasUni(): boolean {
  return typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function'
}

function rawGet(key: string): unknown {
  try {
    if (!hasUni()) return memory.get(key)
    const value = uni.getStorageSync(key)
    return value === '' || value === null || value === undefined ? undefined : value
  } catch {
    return memory.get(key)
  }
}

function rawSet(key: string, value: string): void {
  memory.set(key, value)
  try {
    if (hasUni()) uni.setStorageSync(key, value)
  } catch {
    // 只保留内存态
  }
}

/** 安全读取 JSON：兼容字符串、已解析对象、损坏内容与缺失 Storage */
function readJSON<T>(key: string, fallback: T, isValid: (value: unknown) => boolean): T {
  const raw = rawGet(key)
  if (raw === undefined) return fallback
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return fallback
    }
  }
  return isValid(value) ? (value as T) : fallback
}

function writeJSON(key: string, value: unknown): void {
  try {
    rawSet(key, JSON.stringify(value))
  } catch {
    // 序列化失败时忽略，不影响主流程
  }
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isRecentArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as RecentItem).id === 'string' &&
        typeof (item as RecentItem).time === 'number' &&
        Number.isFinite((item as RecentItem).time)
    )
  )
}

function isPrefs(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function readFavorites(): string[] {
  const list = readJSON<string[]>(KEY_FAVORITES, [], isStringArray)
  return Array.from(new Set(list)).slice(0, 50)
}

export function writeFavorites(ids: string[]): void {
  writeJSON(KEY_FAVORITES, Array.from(new Set(ids)).slice(0, 50))
}

export function readRecent(): RecentItem[] {
  const list = readJSON<RecentItem[]>(KEY_RECENT, [], isRecentArray)
  return list
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time)
    .slice(0, MAX_RECENT)
}

export function writeRecent(items: RecentItem[]): void {
  writeJSON(
    KEY_RECENT,
    items
      .slice()
      .sort((a, b) => b.time - a.time)
      .slice(0, MAX_RECENT)
  )
}

export function readPrefs(): Prefs {
  const value = readJSON<Prefs>(KEY_PREFS, {}, isPrefs)
  const result: Prefs = {}
  Object.keys(value).forEach((key) => {
    const item = value[key]
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      result[key] = item
    }
  })
  return result
}

export function writePrefs(prefs: Prefs): void {
  writeJSON(KEY_PREFS, prefs)
}

/** 清除本小程序写入的全部本地数据 */
export function clearAll(): void {
  memory.clear()
  if (!hasUni()) return
  try {
    ALL_KEYS.forEach((key) => uni.removeStorageSync(key))
  } catch {
    // 忽略
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import * as storage from '@/services/storage'

function createUniMock() {
  const map = new Map<string, string>()
  return {
    getStorageSync: (key: string) => (map.has(key) ? map.get(key) : ''),
    setStorageSync: (key: string, value: string) => map.set(key, value),
    removeStorageSync: (key: string) => map.delete(key)
  }
}

beforeEach(() => {
  ;(globalThis as any).uni = createUniMock()
  storage.clearAll()
  setActivePinia(createPinia())
})

afterEach(() => {
  delete (globalThis as any).uni
  vi.restoreAllMocks()
})

describe('全局状态：收藏、最近使用、偏好', () => {
  it('初始为空态', () => {
    const store = useAppStore()
    expect(store.favorites).toEqual([])
    expect(store.recent).toEqual([])
    expect(store.favoriteTools).toEqual([])
    expect(store.recentTools).toEqual([])
    expect(store.prefs).toEqual({})
  })

  it('收藏 / 取消收藏实时更新并持久化，可重新载入', () => {
    const store = useAppStore()
    expect(store.toggleFavorite('word-counter')).toBe(true)
    expect(store.isFavorite('word-counter')).toBe(true)
    expect(store.favoriteTools.map((tool) => tool.id)).toEqual(['word-counter'])
    expect(storage.readFavorites()).toEqual(['word-counter'])
    expect(store.toggleFavorite('word-counter')).toBe(false)
    expect(store.isFavorite('word-counter')).toBe(false)
    expect(storage.readFavorites()).toEqual([])

    store.toggleFavorite('date-calculator')
    store.toggleFavorite('qrcode-generator')
    expect(store.favoriteTools.map((tool) => tool.id)).toEqual(['qrcode-generator', 'date-calculator'])
    setActivePinia(createPinia())
    expect(useAppStore().favoriteTools.map((tool) => tool.id)).toEqual([
      'qrcode-generator',
      'date-calculator'
    ])
  })

  it('忽略无效工具 ID，removeFavorite 可单独移除', () => {
    const store = useAppStore()
    expect(store.toggleFavorite('不存在的工具')).toBe(false)
    expect(store.favorites).toEqual([])
    store.toggleFavorite('word-counter')
    store.toggleFavorite('tax-calculator')
    store.removeFavorite('word-counter')
    expect(store.favorites).toEqual(['tax-calculator'])
  })

  it('最近使用最多 10 条，重复打开更新排序，只保存 ID 与时间', () => {
    let clock = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => ++clock)
    const store = useAppStore()
    expect(() => store.recordRecent('不存在的工具')).not.toThrow()
    expect(store.recent).toEqual([])
    const ids = [
      'date-calculator',
      'unit-converter',
      'mortgage-calculator',
      'tax-calculator',
      'qrcode-generator',
      'random-number',
      'random-picker',
      'password-generator',
      'image-compressor',
      'image-resizer',
      'word-counter',
      'text-deduplicator'
    ]
    ids.forEach((id) => store.recordRecent(id))
    expect(store.recent).toHaveLength(10)
    expect(store.recent[0].id).toBe('text-deduplicator')
    expect(store.recentTools).toHaveLength(10)
    expect(Object.keys(store.recent[0]).sort()).toEqual(['id', 'time'])
    expect(JSON.stringify(store.recent)).not.toContain('输入的文本')

    store.recordRecent('date-calculator')
    expect(store.recent[0].id).toBe('date-calculator')
    expect(store.recent).toHaveLength(10)
    expect(store.recent.filter((item) => item.id === 'date-calculator')).toHaveLength(1)
  })

  it('清空历史与清除全部本地数据', () => {
    const store = useAppStore()
    store.toggleFavorite('word-counter')
    store.recordRecent('word-counter')
    store.setPref('quality', 60)
    expect(store.getPref('quality', 80)).toBe(60)
    expect(store.getPref('missing', '默认')).toBe('默认')

    store.clearRecent()
    expect(store.recent).toEqual([])
    expect(store.favorites).toEqual(['word-counter'])

    store.clearAllData()
    expect(store.favorites).toEqual([])
    expect(store.recent).toEqual([])
    expect(store.prefs).toEqual({})
    expect(storage.readFavorites()).toEqual([])
    expect(storage.readPrefs()).toEqual({})
  })

  it('hydrate 会过滤掉已下线的工具与无效记录', () => {
    storage.writeFavorites(['word-counter', '已下线工具'])
    storage.writeRecent([
      { id: 'word-counter', time: 2000 },
      { id: '已下线工具', time: 3000 }
    ])
    setActivePinia(createPinia())
    const store = useAppStore()
    expect(store.favoriteTools.map((tool) => tool.id)).toEqual(['word-counter'])
    expect(store.recentTools.map((tool) => tool.id)).toEqual(['word-counter'])
  })
})

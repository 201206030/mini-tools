import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RECOMMENDED_IDS,
  TOOLS,
  getTool,
  getToolsByCategory,
  getToolsByIds,
  searchTools
} from '@/data/tools'
import { CATEGORIES, getCategoryName } from '@/data/categories'
import * as storage from '@/services/storage'

/** 模拟微信小程序 Storage；同时保留一个真实 Map 便于断言写入内容 */
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

describe('统一工具注册表', () => {
  it('注册 22 个工具，ID 唯一，分属 6 个分类', () => {
    expect(TOOLS).toHaveLength(22)
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(22)
    expect(CATEGORIES).toHaveLength(6)
    expect(getToolsByCategory('calc')).toHaveLength(4)
    expect(getToolsByCategory('life')).toHaveLength(4)
    expect(getToolsByCategory('image')).toHaveLength(2)
    expect(getToolsByCategory('text')).toHaveLength(2)
    expect(getToolsByCategory('study')).toHaveLength(5)
    expect(getToolsByCategory('office')).toHaveLength(5)
  })

  it('所有工具元数据完整，分类合法、图标为单个中文字符', () => {
    const categoryIds = new Set(CATEGORIES.map((item) => item.id))
    for (const tool of TOOLS) {
      expect(tool.name.length).toBeGreaterThan(0)
      expect(tool.desc.length).toBeGreaterThan(0)
      expect(tool.keywords.length).toBeGreaterThan(0)
      expect(getCategoryName(tool.category)).not.toBe('')
      expect(categoryIds.has(tool.category)).toBe(true)
      expect([...tool.icon].length).toBe(1)
    }
  })

  it('按 ID / 分类 / ID 列表取工具，自动忽略已下线工具', () => {
    expect(getTool('date-calculator')?.name).toBe('日期计算器')
    expect(getTool('不存在')).toBeUndefined()
    expect(getToolsByIds(['none', 'word-counter', 'text-deduplicator'])).toHaveLength(2)
    expect(getToolsByCategory('image').map((tool) => tool.id)).toEqual([
      'image-compressor',
      'image-resizer'
    ])
  })

  it('实时搜索匹配名称、说明、分类与关键词', () => {
    expect(searchTools('')).toEqual([])
    expect(searchTools('   ')).toEqual([])
    expect(searchTools('不存在的功能xyz')).toEqual([])
    expect(searchTools('日期').map((tool) => tool.id)).toContain('date-calculator')
    expect(searchTools('斤').map((tool) => tool.id)).toContain('unit-converter')
    expect(searchTools('计算').map((tool) => tool.id)).toContain('tax-calculator')
    expect(searchTools('QR').map((tool) => tool.id)).toContain('qrcode-generator')
    expect(searchTools('去重').map((tool) => tool.id)).toContain('text-deduplicator')
    expect(searchTools('月供').map((tool) => tool.id)).toContain('mortgage-calculator')
    expect(searchTools('学习').map((tool) => tool.id)).toContain('periodic-table')
    expect(searchTools('JSON').map((tool) => tool.id)).toContain('json-formatter')
    expect(searchTools('Base64').map((tool) => tool.id)).toContain('base64-codec')
  })

  it('无收藏时提供默认推荐工具', () => {
    expect(DEFAULT_RECOMMENDED_IDS.length).toBeGreaterThan(0)
    expect(getToolsByIds(DEFAULT_RECOMMENDED_IDS)).toHaveLength(DEFAULT_RECOMMENDED_IDS.length)
    expect(DEFAULT_RECOMMENDED_IDS).toContain('word-counter')
  })
})

describe('统一本地存储服务', () => {
  it('默认空态，收藏去重且最多 50 条', () => {
    expect(storage.readFavorites()).toEqual([])
    expect(storage.readRecent()).toEqual([])
    expect(storage.readPrefs()).toEqual({})
    storage.writeFavorites(['a', 'b', 'a'])
    expect(storage.readFavorites()).toEqual(['a', 'b'])
    storage.writeFavorites(Array.from({ length: 80 }, (_, i) => 'id' + i))
    expect(storage.readFavorites()).toHaveLength(50)
  })

  it('最近使用按时间倒序，最多 10 条且只存 ID 与时间', () => {
    storage.writeRecent(
      Array.from({ length: 15 }, (_, i) => ({ id: 'tool' + i, time: i * 1000 }))
    )
    const list = storage.readRecent()
    expect(list).toHaveLength(storage.MAX_RECENT)
    expect(storage.MAX_RECENT).toBe(10)
    expect(list[0].id).toBe('tool14')
    expect(Object.keys(list[0]).sort()).toEqual(['id', 'time'])
    expect(JSON.stringify(list)).not.toContain('password')
  })

  it('偏好只保留字符串/数字/布尔基本类型', () => {
    mock.__map.set('wntx_prefs', JSON.stringify({ quality: 80, label: '高', enabled: true, bad: { x: 1 }, arr: [1] }))
    expect(storage.readPrefs()).toEqual({ quality: 80, label: '高', enabled: true })
  })

  it('损坏 JSON、类型不符、缺失数据均安全回退', () => {
    mock.__map.set('wntx_favorites', '{broken json')
    mock.__map.set('wntx_recent', 'not an array')
    mock.__map.set('wntx_prefs', '[]')
    expect(storage.readFavorites()).toEqual([])
    expect(storage.readRecent()).toEqual([])
    expect(storage.readPrefs()).toEqual({})
    mock.__map.set('wntx_recent', JSON.stringify([{ id: 'a', time: 'x' }]))
    expect(storage.readRecent()).toEqual([])
  })

  it('兼容已解析对象形式的存储内容', () => {
    ;(globalThis as any).uni = {
      ...mock,
      getStorageSync: (key: string) => (key === 'wntx_favorites' ? ['word-counter'] : '')
    }
    expect(storage.readFavorites()).toEqual(['word-counter'])
  })

  it('清除本地数据删除全部键', () => {
    storage.writeFavorites(['a'])
    storage.writeRecent([{ id: 'word-counter', time: 1 }])
    storage.writePrefs({ quality: 50 })
    expect(mock.__map.size).toBeGreaterThan(0)
    storage.clearAll()
    expect(mock.__map.size).toBe(0)
    expect(storage.readFavorites()).toEqual([])
  })

  it('Storage 不存在时降级为内存态，功能仍可用', () => {
    delete (globalThis as any).uni
    storage.clearAll()
    storage.writeFavorites(['offline-tool'])
    expect(storage.readFavorites()).toEqual(['offline-tool'])
    storage.clearAll()
    expect(storage.readFavorites()).toEqual([])
  })

  it('Storage 读写抛异常时不中断主流程', () => {
    ;(globalThis as any).uni = {
      getStorageSync: () => { throw new Error('denied') },
      setStorageSync: () => { throw new Error('denied') },
      removeStorageSync: () => { throw new Error('denied') }
    }
    expect(() => storage.writeFavorites(['x'])).not.toThrow()
    expect(storage.readFavorites()).toEqual(['x'])
    expect(() => storage.clearAll()).not.toThrow()
  })
})

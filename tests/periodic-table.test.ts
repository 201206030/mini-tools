import { describe, expect, it } from 'vitest'
import {
  ELEMENTS,
  ELEMENT_CATEGORIES,
  getCategoryName,
  getElementByNumber,
  periodOf,
  searchElements
} from '@/tools/periodic-table/elements'

describe('元素周期表数据', () => {
  it('收录 118 个元素，原子序数连续且符号唯一', () => {
    expect(ELEMENTS).toHaveLength(118)
    ELEMENTS.forEach((item, index) => {
      expect(item.number).toBe(index + 1)
      expect(item.symbol.length).toBeGreaterThan(0)
      expect(item.mass.length).toBeGreaterThan(0)
      expect(getCategoryName(item.category)).not.toBe('')
    })
    expect(new Set(ELEMENTS.map((item) => item.symbol)).size).toBe(118)
  })

  it('周期划分与常见元素信息正确', () => {
    expect(periodOf(1)).toBe(1)
    expect(periodOf(2)).toBe(1)
    expect(periodOf(3)).toBe(2)
    expect(periodOf(10)).toBe(2)
    expect(periodOf(11)).toBe(3)
    expect(periodOf(18)).toBe(3)
    expect(periodOf(19)).toBe(4)
    expect(periodOf(36)).toBe(4)
    expect(periodOf(37)).toBe(5)
    expect(periodOf(54)).toBe(5)
    expect(periodOf(55)).toBe(6)
    expect(periodOf(86)).toBe(6)
    expect(periodOf(87)).toBe(7)
    expect(periodOf(118)).toBe(7)
    expect(getElementByNumber(1)?.symbol).toBe('H')
    expect(getElementByNumber(26)?.name).toBe('铁')
    expect(getElementByNumber(26)?.mass).toBe('55.845')
    expect(getElementByNumber(119)).toBeUndefined()
  })

  it('支持按符号、中文名、序号与类别筛选', () => {
    expect(searchElements('Fe', 'all').some((item) => item.symbol === 'Fe')).toBe(true)
    expect(searchElements('铁', 'all').some((item) => item.number === 26)).toBe(true)
    expect(searchElements('8', 'all').some((item) => item.number === 8)).toBe(true)
    const nobles = searchElements('', 'noble')
    expect(nobles.length).toBeGreaterThan(0)
    expect(nobles.every((item) => item.category === 'noble')).toBe(true)
    expect(searchElements('', 'all')).toHaveLength(118)
    expect(searchElements('不存在的元素xyz', 'all')).toHaveLength(0)
    expect(ELEMENT_CATEGORIES.length).toBeGreaterThan(8)
  })
})

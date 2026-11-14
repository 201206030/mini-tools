import { describe, expect, it } from 'vitest'
import {
  ASCII_CATEGORIES,
  ASCII_CHARS,
  getAscii,
  searchAscii
} from '@/tools/ascii-table/ascii'

describe('ASCII 编码表 · 静态数据', () => {
  it('收录 0~127 共 128 项，码值连续、十六进制两位大写', () => {
    expect(ASCII_CHARS).toHaveLength(128)
    ASCII_CHARS.forEach((item, index) => {
      expect(item.code).toBe(index)
      expect(item.hex).toBe(index.toString(16).toUpperCase().padStart(2, '0'))
      expect(item.name.length).toBeGreaterThan(0)
    })
    expect(getAscii(0)?.hex).toBe('00')
    expect(getAscii(65)?.hex).toBe('41')
    expect(getAscii(127)?.hex).toBe('7F')
  })

  it('可打印字符带 char，控制字符 char 为空串', () => {
    expect(getAscii(65)?.char).toBe('A')
    expect(getAscii(48)?.char).toBe('0')
    expect(getAscii(32)?.char).toBe(' ')
    expect(getAscii(33)?.char).toBe('!')
    expect(getAscii(0)?.char).toBe('')
    expect(getAscii(10)?.char).toBe('')
    expect(getAscii(127)?.char).toBe('')
  })

  it('常见条目的中文名称与类别正确', () => {
    expect(getAscii(0)?.name).toBe('NULL 空字符')
    expect(getAscii(0)?.category).toBe('control')
    expect(getAscii(10)?.name).toBe('换行 LF')
    expect(getAscii(32)?.name).toBe('空格')
    expect(getAscii(32)?.category).toBe('space')
    expect(getAscii(48)?.name).toBe('数字 0')
    expect(getAscii(48)?.category).toBe('digit')
    expect(getAscii(65)?.name).toBe('大写字母 A')
    expect(getAscii(65)?.category).toBe('upper')
    expect(getAscii(97)?.name).toBe('小写字母 a')
    expect(getAscii(97)?.category).toBe('lower')
    expect(getAscii(33)?.name).toContain('感叹号')
    expect(getAscii(33)?.category).toBe('punct')
  })

  it('getAscii 越界返回 undefined', () => {
    expect(getAscii(-1)).toBeUndefined()
    expect(getAscii(128)).toBeUndefined()
    expect(getAscii(1.5)).toBeUndefined()
    expect(getAscii(Number.NaN)).toBeUndefined()
  })

  it('类别筛选项含全部与六类', () => {
    expect(ASCII_CATEGORIES[0].value).toBe('all')
    expect(ASCII_CATEGORIES).toHaveLength(7)
    ASCII_CATEGORIES.forEach((item) => {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.value.length).toBeGreaterThan(0)
    })
  })

  it('各类别数量之和为 128', () => {
    const counts: Record<string, number> = {}
    ASCII_CHARS.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1
    })
    expect(counts.control).toBe(33) // 0~31 与 127
    expect(counts.digit).toBe(10)
    expect(counts.upper).toBe(26)
    expect(counts.lower).toBe(26)
    expect(counts.punct).toBe(32)
    expect(counts.space).toBe(1)
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(128)
  })
})

describe('ASCII 编码表 · 搜索', () => {
  it('空查询按类别返回全部 / 对应类别', () => {
    expect(searchAscii('', 'all')).toHaveLength(128)
    expect(searchAscii('  ', 'all')).toHaveLength(128)
    expect(searchAscii('', 'control')).toHaveLength(33)
    expect(searchAscii('', 'digit')).toHaveLength(10)
    expect(searchAscii('', 'space')).toHaveLength(1)
  })

  it('支持十进制与十六进制码值', () => {
    expect(searchAscii('65', 'all').some((item) => item.code === 65)).toBe(true)
    expect(searchAscii('0x41', 'all').some((item) => item.code === 65)).toBe(true)
    expect(searchAscii('41', 'all').some((item) => item.code === 65)).toBe(true)
    expect(searchAscii('0X41', 'all').some((item) => item.code === 65)).toBe(true)
    expect(searchAscii('4A', 'all').some((item) => item.code === 74)).toBe(true)
    expect(searchAscii('7F', 'all').some((item) => item.code === 127)).toBe(true)
  })

  it('支持字符本身、中文名称与类别名', () => {
    expect(searchAscii('A', 'all').some((item) => item.code === 65)).toBe(true)
    expect(searchAscii('换行', 'all').some((item) => item.code === 10)).toBe(true)
    expect(searchAscii('空格', 'all').some((item) => item.code === 32)).toBe(true)
    expect(searchAscii('大写字母', 'all').length).toBeGreaterThan(0)
    expect(searchAscii('控制字符', 'all')).toHaveLength(33)
    expect(searchAscii('control', 'all')).toHaveLength(33)
  })

  it('类别过滤与查询同时生效', () => {
    const result = searchAscii('A', 'upper')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => item.category === 'upper')).toBe(true)
    expect(searchAscii('65', 'digit')).toHaveLength(0)
  })

  it('无匹配返回空数组，非法类别按全部处理', () => {
    expect(searchAscii('不存在的字符xyz', 'all')).toHaveLength(0)
    expect(searchAscii('ZZ', 'all')).toHaveLength(0)
    expect(searchAscii('', 'unknown')).toHaveLength(128)
  })
})

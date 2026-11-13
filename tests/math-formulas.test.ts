import { describe, expect, it } from 'vitest'
import {
  FORMULAS,
  FORMULA_GROUPS,
  countByGroup,
  getGroupName,
  searchFormulas
} from '@/tools/math-formulas/formulas'

describe('数学公式数据', () => {
  it('分组与公式条目完整，每个公式都归属有效分类', () => {
    expect(FORMULA_GROUPS.length).toBeGreaterThanOrEqual(10)
    expect(FORMULAS.length).toBeGreaterThan(60)
    expect(countByGroup('all')).toBe(FORMULAS.length)
    const groupedTotal = FORMULA_GROUPS.filter((item) => item.id !== 'all').reduce(
      (sum, item) => sum + countByGroup(item.id),
      0
    )
    expect(groupedTotal).toBe(FORMULAS.length)
    for (const item of FORMULAS) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.expr.length).toBeGreaterThan(0)
      expect(getGroupName(item.group)).not.toBe('')
    }
  })

  it('按分类与关键词筛选', () => {
    const plane = searchFormulas('', 'plane')
    expect(plane.length).toBeGreaterThan(0)
    expect(plane.every((item) => item.group === 'plane')).toBe(true)
    expect(searchFormulas('勾股', 'all').some((item) => item.name === '勾股定理')).toBe(true)
    expect(searchFormulas('sin', 'all').length).toBeGreaterThan(0)
    expect(searchFormulas('面积', 'plane').length).toBeGreaterThan(0)
    expect(searchFormulas('绝不存在的公式xyz', 'all')).toHaveLength(0)
  })
})

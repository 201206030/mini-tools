import { describe, expect, it } from 'vitest'
import type { CalcResult } from '@/types/common'
import {
  MAX_DIFF_LINES,
  buildDiffText,
  diffLines,
  type DiffLine,
  type DiffOptions
} from '@/tools/text-diff/logic'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

const defaults: DiffOptions = { ignoreCase: false, ignoreWhitespace: false }

describe('diffLines 行级差异', () => {
  it('常规差异：相同 / 删除 / 新增行、统计与行号都正确', () => {
    const result = must(diffLines('A\nB\nC', 'A\nB2\nC\nD', defaults))
    expect(result.identical).toBe(false)
    expect(result.stats).toEqual({ same: 2, added: 2, removed: 1 })
    expect(result.rows.map((row) => row.type)).toEqual(['same', 'removed', 'added', 'same', 'added'])
    expect(result.rows[0]).toMatchObject({ type: 'same', left: 'A', right: 'A', leftNo: 1, rightNo: 1 })
    expect(result.rows[1]).toMatchObject({ type: 'removed', left: 'B', leftNo: 2 })
    expect(result.rows[2]).toMatchObject({ type: 'added', right: 'B2', rightNo: 2 })
    expect(result.rows[3]).toMatchObject({ type: 'same', left: 'C', right: 'C', leftNo: 3, rightNo: 3 })
    expect(result.rows[4]).toMatchObject({ type: 'added', right: 'D', rightNo: 4 })
  })

  it('两段原始文本完全相同则 identical 为 true', () => {
    const result = must(diffLines('a\nb\nc', 'a\nb\nc', defaults))
    expect(result.identical).toBe(true)
    expect(result.stats).toEqual({ same: 3, added: 0, removed: 0 })
    expect(result.rows.every((row) => row.type === 'same')).toBe(true)
  })

  it('一侧为空时全部为新增或删除，且不产生虚假空行', () => {
    const added = must(diffLines('', 'x\ny', defaults))
    expect(added.stats).toEqual({ same: 0, added: 2, removed: 0 })
    expect(added.rows.map((row) => row.right)).toEqual(['x', 'y'])
    const removed = must(diffLines('x\ny', '', defaults))
    expect(removed.stats).toEqual({ same: 0, added: 0, removed: 2 })
    expect(removed.rows.map((row) => row.left)).toEqual(['x', 'y'])
  })

  it('忽略大小写、忽略空白只影响比较键，rows 保留原始文本', () => {
    const strict = must(diffLines('Apple', 'apple', defaults))
    expect(strict.stats).toEqual({ same: 0, added: 1, removed: 1 })

    const withCase = must(diffLines('Apple', 'apple', { ignoreCase: true, ignoreWhitespace: false }))
    expect(withCase.stats).toEqual({ same: 1, added: 0, removed: 0 })
    expect(withCase.identical).toBe(false)
    expect(withCase.rows[0].left).toBe('Apple')
    expect(withCase.rows[0].right).toBe('apple')

    const withSpace = must(diffLines('  a   b  ', 'a b', { ignoreCase: false, ignoreWhitespace: true }))
    expect(withSpace.stats.same).toBe(1)
    expect(withSpace.rows[0].left).toBe('  a   b  ')
    expect(withSpace.rows[0].right).toBe('a b')
  })

  it('CRLF 与 CR 统一按行切分', () => {
    const result = must(diffLines('a\r\nb\rc', 'a\nb\nc', defaults))
    expect(result.stats.same).toBe(3)
    expect(result.identical).toBe(false)
  })

  it('两侧都为空、单侧超行、非字符串输入给出中文错误', () => {
    const empty = diffLines('', '', defaults)
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.message).toContain('都为空')

    const tooMany = Array.from({ length: MAX_DIFF_LINES + 1 }, (_, i) => String(i)).join('\n')
    const overLeft = diffLines(tooMany, 'x', defaults)
    expect(overLeft.ok).toBe(false)
    if (!overLeft.ok) expect(overLeft.message).toContain('300')
    const overRight = diffLines('x', tooMany, defaults)
    expect(overRight.ok).toBe(false)

    expect(diffLines(null as unknown as string, 'x', defaults).ok).toBe(false)
    expect(diffLines('x', 42 as unknown as string, defaults).ok).toBe(false)
  })

  it('恰好 300 行是允许边界', () => {
    const text = Array.from({ length: MAX_DIFF_LINES }, (_, i) => `行${i}`).join('\n')
    const result = must(diffLines(text, text, defaults))
    expect(result.identical).toBe(true)
    expect(result.stats.same).toBe(MAX_DIFF_LINES)
    expect(result.rows).toHaveLength(MAX_DIFF_LINES)
  })

  it('options 传入 null 时不抛异常', () => {
    const result = must(diffLines('a', 'b', null as unknown as DiffOptions))
    expect(result.stats.added + result.stats.removed).toBe(2)
  })
})

describe('buildDiffText', () => {
  it('按 + / - / 两个空格前缀输出可复制文本', () => {
    const rows: DiffLine[] = [
      { type: 'same', left: 'x', right: 'x', leftNo: 1, rightNo: 1 },
      { type: 'removed', left: 'y', leftNo: 2 },
      { type: 'added', right: 'z', rightNo: 2 }
    ]
    expect(buildDiffText(rows)).toBe('  x\n- y\n+ z')
  })

  it('真实差异结果生成完整前缀文本', () => {
    const result = must(diffLines('A\nB\nC', 'A\nB2\nC\nD', defaults))
    expect(buildDiffText(result.rows)).toBe('  A\n- B\n+ B2\n  C\n+ D')
  })

  it('空列表与异常入参安全返回空串', () => {
    expect(buildDiffText([])).toBe('')
    expect(buildDiffText(null as unknown as DiffLine[])).toBe('')
  })
})

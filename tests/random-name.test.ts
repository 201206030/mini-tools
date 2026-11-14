import { describe, expect, it } from 'vitest'
import type { CalcResult } from '@/types/common'
import {
  SURNAMES,
  COMPOUND_SURNAMES,
  MALE_GIVEN,
  FEMALE_GIVEN,
  NEUTRAL_GIVEN
} from '@/tools/random-name/names'
import {
  MAX_NAME_COUNT,
  MAX_SURNAME_OPTIONS,
  MIN_NAME_COUNT,
  generateNames,
  parseSurnames,
  type GenerateNamesOptions,
  type NameGender,
  type NameLength
} from '@/tools/random-name/logic'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

/** 线性同余伪随机源，便于在 Node 环境稳定复现 */
function makePick(seed = 1): (max: number) => number {
  let state = seed >>> 0
  return (max: number): number => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return state % max
  }
}

function options(partial: Partial<GenerateNamesOptions> = {}): GenerateNamesOptions {
  return {
    count: 5,
    gender: 'all' as NameGender,
    length: 'mix' as NameLength,
    compoundRate: 0,
    pick: makePick(7),
    ...partial
  }
}

describe('随机姓名静态素材', () => {
  it('单姓不少于 100、复姓不少于 15，且包含百家姓常见姓与指定复姓', () => {
    expect(SURNAMES.length).toBeGreaterThanOrEqual(100)
    expect(COMPOUND_SURNAMES.length).toBeGreaterThanOrEqual(15)
    expect(SURNAMES).toContain('赵')
    expect(SURNAMES).toContain('钱')
    expect(SURNAMES).toContain('王')
    expect(COMPOUND_SURNAMES).toContain('欧阳')
    expect(COMPOUND_SURNAMES).toContain('司马')
    expect(COMPOUND_SURNAMES).toContain('上官')
    expect(COMPOUND_SURNAMES).toContain('诸葛')
  })

  it('单姓为一个汉字，名素材严格区分单字与双字', () => {
    for (const surname of SURNAMES) expect(Array.from(surname)).toHaveLength(1)
    for (const compound of COMPOUND_SURNAMES) expect(Array.from(compound)).toHaveLength(2)
    for (const set of [MALE_GIVEN, FEMALE_GIVEN, NEUTRAL_GIVEN]) {
      expect(set.single.length).toBeGreaterThan(0)
      expect(set.double.length).toBeGreaterThan(0)
      for (const char of set.single) expect(Array.from(char)).toHaveLength(1)
      for (const word of set.double) expect(Array.from(word)).toHaveLength(2)
    }
  })
})

describe('parseSurnames', () => {
  it('留空与纯空白表示随机取姓', () => {
    expect(parseSurnames('')).toEqual({ ok: true, value: [] })
    expect(parseSurnames('   \n\t ')).toEqual({ ok: true, value: [] })
  })

  it('支持单姓、复姓及多种分隔符，并按首次出现顺序去重', () => {
    const outcome = parseSurnames('  李，王  欧阳、司马;上官/诸葛|李  ')
    expect(outcome).toEqual({ ok: true, value: ['李', '王', '欧阳', '司马', '上官', '诸葛'] })
    expect(parseSurnames('欧阳')).toEqual({ ok: true, value: ['欧阳'] })
  })

  it('非汉字、数字、英文与超长输入给出中文错误', () => {
    for (const bad of ['张3', 'Smith', '李@', 'abc123', '中华人民共和国万年']) {
      const outcome = parseSurnames(bad)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.message).toContain('不是有效姓氏')
    }
    expect(parseSurnames(null as unknown as string).ok).toBe(false)
    expect(parseSurnames(123 as unknown as string).ok).toBe(false)
  })

  it('姓氏数量超过上限时拒绝', () => {
    const raw = Array.from({ length: MAX_SURNAME_OPTIONS + 1 }, (_, i) =>
      String.fromCharCode(0x4e00 + i)
    ).join(',')
    const outcome = parseSurnames(raw)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.message).toContain(String(MAX_SURNAME_OPTIONS))
  })
})

describe('generateNames 指定姓氏', () => {
  it('只指定一个姓时，所有结果都以该姓开头且仍互不重复', () => {
    const names = must(
      generateNames(options({ count: 20, length: 'mix', pick: makePick(101), surnames: ['李'] }))
    )
    expect(names).toHaveLength(20)
    for (const name of names) expect(name.startsWith('李')).toBe(true)
    expect(new Set(names).size).toBe(20)
  })

  it('指定复姓可用，且「包含复姓」开关与默认复姓不再生效', () => {
    const names = must(
      generateNames(
        options({ count: 10, length: 'single', compoundRate: 1, pick: makePick(102), surnames: ['欧阳'] })
      )
    )
    for (const name of names) expect(name.startsWith('欧阳')).toBe(true)
    for (const name of names) expect(Array.from(name)).toHaveLength(3)

    const randomSurnames = must(generateNames(options({ count: 10, compoundRate: 1, pick: makePick(103) })))
    for (const name of randomSurnames) {
      expect(COMPOUND_SURNAMES.some((item) => name.startsWith(item))).toBe(true)
    }
  })

  it('可指定多个姓氏，结果全部落在指定池内，性别与字数选项仍生效', () => {
    const surnames = ['赵', '钱', '欧阳']
    const names = must(
      generateNames(
        options({ count: 20, gender: 'female', length: 'double', pick: makePick(104), surnames })
      )
    )
    expect(names).toHaveLength(20)
    for (const name of names) {
      expect(surnames.some((item) => name.startsWith(item))).toBe(true)
      expect(Array.from(name).length).toBeGreaterThanOrEqual(3)
    }
    expect(new Set(names.filter((name) => name.startsWith('赵'))).size).toBeGreaterThan(0)
  })

  it('非法指定姓氏给出中文错误，重复姓氏被归一化', () => {
    expect(generateNames(options({ surnames: ['李3'] })).ok).toBe(false)
    expect(generateNames(options({ surnames: [''] })).ok).toBe(false)
    expect(generateNames(options({ surnames: '李' as unknown as string[] })).ok).toBe(false)
    expect(generateNames(options({ surnames: Array(MAX_SURNAME_OPTIONS + 1).fill('张') })).ok).toBe(false)
    const deduped = must(generateNames(options({ count: 5, surnames: ['李', '李'], pick: makePick(105) })))
    expect(deduped).toHaveLength(5)
    for (const name of deduped) expect(name.startsWith('李')).toBe(true)
  })
})

describe('generateNames', () => {
  it('正常生成指定数量姓名，均为 2 到 4 个汉字且互不重复', () => {
    const names = must(
      generateNames(
        options({ count: 20, gender: 'all', length: 'mix', compoundRate: 0.2, pick: makePick(123) })
      )
    )
    expect(names).toHaveLength(20)
    for (const name of names) expect(name).toMatch(/^[\u4e00-\u9fa5]{2,4}$/)
    expect(new Set(names).size).toBe(20)
  })

  it('单字名 / 双字名长度固定，复姓比例 0 与 1 可复现', () => {
    const single = must(
      generateNames(options({ count: 10, gender: 'female', length: 'single', compoundRate: 0, pick: makePick(11) }))
    )
    for (const name of single) expect(Array.from(name)).toHaveLength(2)

    const double = must(
      generateNames(options({ count: 10, gender: 'male', length: 'double', compoundRate: 0, pick: makePick(12) }))
    )
    for (const name of double) expect(Array.from(name)).toHaveLength(3)

    const compound = must(
      generateNames(options({ count: 10, compoundRate: 1, pick: makePick(13) }))
    )
    for (const name of compound) {
      expect(COMPOUND_SURNAMES.some((item) => name.startsWith(item))).toBe(true)
    }

    const noCompound = must(
      generateNames(options({ count: 10, compoundRate: 0, pick: makePick(14) }))
    )
    for (const name of noCompound) expect(SURNAMES).toContain(Array.from(name)[0])
  })

  it('existing 与本次结果共同参与去重', () => {
    const first = must(generateNames(options({ count: 20, pick: makePick(21) })))
    expect(new Set(first).size).toBe(20)
    const second = must(generateNames(options({ count: 20, pick: makePick(21) }), first))
    expect(new Set(second).size).toBe(20)
    for (const name of second) expect(first).not.toContain(name)
  })

  it('数量边界 1 与 20 通过，越界与非整数给出中文错误', () => {
    expect(must(generateNames(options({ count: MIN_NAME_COUNT, pick: makePick(1) })))).toHaveLength(1)
    expect(must(generateNames(options({ count: MAX_NAME_COUNT, pick: makePick(2) })))).toHaveLength(MAX_NAME_COUNT)
    for (const bad of [0, -1, 21, 1.5, NaN, Infinity]) {
      const outcome = generateNames(options({ count: bad }))
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.message).toContain('1 到 20')
    }
  })

  it('非法性别、字数、随机源与复姓比例给出中文错误', () => {
    expect(generateNames(options({ gender: 'unknown' as NameGender })).ok).toBe(false)
    expect(generateNames(options({ length: 'triple' as NameLength })).ok).toBe(false)
    expect(generateNames(options({ pick: undefined as unknown as (max: number) => number })).ok).toBe(false)
    expect(generateNames(options({ compoundRate: 1.5 })).ok).toBe(false)
    expect(generateNames(options({ compoundRate: -0.1 })).ok).toBe(false)
    expect(generateNames(options({ compoundRate: NaN })).ok).toBe(false)
    expect(generateNames(null as unknown as GenerateNamesOptions).ok).toBe(false)
    expect(generateNames(options({ count: 2, compoundRate: 0, pick: makePick(3) })).ok).toBe(true)
    expect(generateNames(options({ count: 2, compoundRate: 1, pick: makePick(4) })).ok).toBe(true)
  })

  it('异常 existing 与退化随机源仍能安全返回 count 个结果', () => {
    expect(must(generateNames(options({ count: 3, pick: makePick(31) }), undefined))).toHaveLength(3)
    const mixed = must(
      generateNames(options({ count: 3, pick: makePick(32) }), ['张三', 42 as unknown as string, '', '李四'])
    )
    expect(mixed).toHaveLength(3)
    const degenerate = must(generateNames(options({ count: 3, compoundRate: 0, pick: () => 0 })))
    expect(degenerate).toHaveLength(3)
    for (const name of degenerate) expect(name).toMatch(/^[\u4e00-\u9fa5]{2,3}$/)
  })
})

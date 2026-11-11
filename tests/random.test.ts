import { describe, expect, it } from 'vitest'
import { generateRandomNumbers, formatRandomResult } from '@/tools/random-number/logic'
import { initialRemaining, parseOptions, pickOne } from '@/tools/random-picker/logic'
import {
  AMBIGUOUS,
  CHARSETS,
  MAX_LENGTH,
  MIN_LENGTH,
  buildCharset,
  generatePassword,
  validatePasswordOptions,
  type PasswordOptions
} from '@/tools/password-generator/logic'
import { createRandomIntSource, secureRandomBytes, shuffle } from '@/utils/random'

const all: PasswordOptions = {
  upper: true,
  lower: true,
  digit: true,
  symbol: true,
  excludeAmbiguous: false
}

describe('随机数生成器', () => {
  it('在范围内生成指定数量的整数', () => {
    const result = generateRandomNumbers({ min: 5, max: 8, count: 50, unique: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(50)
    expect(result.value.every((n) => Number.isInteger(n) && n >= 5 && n <= 8)).toBe(true)
  })

  it('不重复模式生成的数互不相同且覆盖整个范围', () => {
    const result = generateRandomNumbers({ min: 1, max: 20, count: 20, unique: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(new Set(result.value).size).toBe(20)
    expect(result.value.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('min == max 时只能取到该值', () => {
    const result = generateRandomNumbers({ min: 7, max: 7, count: 3, unique: false })
    expect(result.ok && result.value).toEqual([7, 7, 7])
  })

  it('不重复数量超过范围时给出中文提示', () => {
    const result = generateRandomNumbers({ min: 1, max: 3, count: 4, unique: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('不能超过')
  })

  it('拦截非法输入：非整数、min>max、数量越界、超大范围', () => {
    expect(generateRandomNumbers({ min: 1.5, max: 5, count: 1, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 1, max: 5, count: 1.5, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 10, max: 1, count: 1, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 1, max: 5, count: 0, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 1, max: 5, count: 101, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 0, max: Number.MAX_SAFE_INTEGER, count: 1, unique: false }).ok).toBe(false)
    expect(generateRandomNumbers({ min: 0, max: 2e9, count: 2, unique: true }).ok).toBe(false)
  })

  it('负数区间与复制文本正常', () => {
    const result = generateRandomNumbers({ min: -3, max: 3, count: 7, unique: true })
    expect(result.ok && result.value.every((n) => n >= -3 && n <= 3)).toBe(true)
    expect(formatRandomResult([1, 2, 3])).toBe('1、2、3')
    expect(formatRandomResult([])).toBe('')
  })
})

describe('随机抽签', () => {
  it('按行解析中文选项，去掉空行与纯空白行，保留重复文本', () => {
    expect(parseOptions('苹果\n\n  \n香蕉\r\n苹果')).toEqual(['苹果', '香蕉', '苹果'])
    expect(parseOptions('')).toEqual([])
    expect(parseOptions('   ')).toEqual([])
    expect(initialRemaining(3)).toEqual([0, 1, 2])
  })

  it('不重复抽取会耗尽所有选项，重复文本按索引分别抽到', () => {
    const items = ['A', 'B', 'A']
    let remaining = initialRemaining(items.length)
    const drawn: string[] = []
    for (let i = 0; i < items.length; i += 1) {
      const result = pickOne(items, remaining, true)
      expect(result).not.toBeNull()
      if (!result) break
      drawn.push(result.value)
      remaining = result.remaining
    }
    expect(drawn.slice().sort()).toEqual(['A', 'A', 'B'])
    expect(remaining).toHaveLength(0)
    expect(pickOne(items, remaining, true)).toBeNull()
  })

  it('最后一次抽取标记 exhausted', () => {
    const result = pickOne(['甲', '乙'], [1], true)
    expect(result && result.exhausted).toBe(true)
  })

  it('允许重复时不消耗剩余项', () => {
    const remaining = [0, 1, 2]
    const result = pickOne(['甲', '乙', '丙'], remaining, false)
    expect(result).not.toBeNull()
    expect(result && result.remaining).toBe(remaining)
    expect(result && result.exhausted).toBe(false)
    if (result) expect(['甲', '乙', '丙']).toContain(result.value)
  })

  it('空选项与非法剩余索引安全返回 null', () => {
    expect(pickOne([], [], true)).toBeNull()
    expect(pickOne([], [], false)).toBeNull()
    expect(pickOne(['甲'], [9], true)).toBeNull()
  })
})

describe('密码生成器', () => {
  it('字符集与易混淆字符定义正确', () => {
    expect(CHARSETS.upper).toHaveLength(26)
    expect(CHARSETS.lower).toHaveLength(26)
    expect(CHARSETS.digit).toBe('0123456789')
    expect(AMBIGUOUS).toContain('0')
    expect(AMBIGUOUS).toContain('O')
    expect(AMBIGUOUS).toContain('1')
    expect(AMBIGUOUS).toContain('l')
    expect(AMBIGUOUS).toContain('I')
  })

  it('选项校验：长度 4..64、至少一种字符类型', () => {
    expect(validatePasswordOptions(16, all)).toBeNull()
    expect(validatePasswordOptions(MIN_LENGTH, all)).toBeNull()
    expect(validatePasswordOptions(MAX_LENGTH, all)).toBeNull()
    expect(validatePasswordOptions(3, all)).toContain('4 到 64')
    expect(validatePasswordOptions(65, all)).toContain('4 到 64')
    expect(validatePasswordOptions(16.5, all)).toContain('整数')
    expect(validatePasswordOptions(16, { ...all, upper: false, lower: false, digit: false, symbol: false })).toContain('至少选择一种')
  })

  it('排除易混淆字符后字符集中不再包含它们', () => {
    const charset = buildCharset({ ...all, excludeAmbiguous: true })
    for (const ch of AMBIGUOUS) expect(charset).not.toContain(ch)
    expect(charset.length).toBeGreaterThan(0)
  })

  it('生成的密码长度正确、每种已选类型至少出现一次、字符均来自字符集', () => {
    let seed = 12345
    const below = (max: number): number => {
      seed = (seed * 1103515245 + 12345) % 0x80000000
      return seed % max
    }
    for (const length of [4, 16, 64]) {
      const result = generatePassword(length, all, below)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.value).toHaveLength(length)
      const charset = buildCharset(all)
      expect(Array.from(result.value).every((ch) => charset.includes(ch))).toBe(true)
      expect(/[A-Z]/.test(result.value)).toBe(true)
      expect(/[a-z]/.test(result.value)).toBe(true)
      expect(/[0-9]/.test(result.value)).toBe(true)
      expect(/[^A-Za-z0-9]/.test(result.value)).toBe(true)
    }
  })

  it('长度小于已选类型数、非法选项时给出中文错误', () => {
    const below = () => 0
    expect(generatePassword(3, all, below).ok).toBe(false)
    expect(generatePassword(16, { ...all, upper: false, lower: false, digit: false, symbol: false }, below).ok).toBe(false)
    const onlyDigitExcluded = generatePassword(16, {
      upper: false,
      lower: false,
      digit: true,
      symbol: false,
      excludeAmbiguous: true
    }, below)
    expect(onlyDigitExcluded.ok).toBe(true) // 23456789 仍有可用字符
    if (onlyDigitExcluded.ok) expect(/[01]/.test(onlyDigitExcluded.value)).toBe(false)
  })
})

describe('随机源与洗牌', () => {
  it('secureRandomBytes 返回指定长度字节并标记安全状态', async () => {
    const result = await secureRandomBytes(24)
    expect(result.bytes).toHaveLength(24)
    expect(typeof result.secure).toBe('boolean')
    expect(result.bytes.every((b) => b >= 0 && b <= 255)).toBe(true)
  })

  it('拒绝采样 below 始终落在 [0, max) 内', () => {
    const bytes = new Uint8Array(4096)
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256
    const source = createRandomIntSource(bytes, true)
    for (const max of [2, 3, 10, 256, 1000, 1e6]) {
      for (let i = 0; i < 50; i += 1) {
        const n = source.below(max)
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThan(max)
      }
    }
    expect(source.below(1)).toBe(0)
    expect(source.below(0)).toBe(0)
  })

  it('字节耗尽后降级并反映在安全标记上', () => {
    const source = createRandomIntSource(new Uint8Array([1]), false)
    expect(source.isSecure()).toBe(false)
    expect(source.isDegraded()).toBe(true)
    const secure = createRandomIntSource(new Uint8Array(0), true)
    expect(secure.isSecure()).toBe(true)
    secure.below(10) // 无字节可用，触发降级
    expect(secure.isSecure()).toBe(false)
    expect(secure.isDegraded()).toBe(true)
  })

  it('洗牌不改变元素集合', () => {
    const list = [1, 2, 3, 4, 5]
    const result = shuffle(list, () => 0)
    expect(result.slice().sort()).toEqual(list)
    expect(list).toEqual([1, 2, 3, 4, 5])
  })
})

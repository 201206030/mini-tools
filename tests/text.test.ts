import { describe, expect, it } from 'vitest'
import { analyzeText, countGraphemes, splitLines } from '@/utils/text'
import { buildSummary, countText } from '@/tools/word-counter/logic'
import { dedupeLines, type DedupeOptions } from '@/tools/text-deduplicator/logic'

const defaults: DedupeOptions = {
  keep: 'first',
  ignoreEmpty: true,
  trim: false,
  caseSensitive: true
}

describe('Unicode 文本分析', () => {
  it('组合 Emoji、国旗、肤色、组合音符均计为 1 个可见字符', () => {
    expect(countGraphemes('👨‍👩‍👧')).toBe(1)
    expect(countGraphemes('🇨🇳')).toBe(1)
    expect(countGraphemes('👍🏽')).toBe(1)
    expect(countGraphemes('e\u0301')).toBe(1)
    expect(countGraphemes('')).toBe(0)
    expect(countGraphemes('abc')).toBe(3)
    expect(analyzeText('👨‍👩‍👧').codePoints).toBe(5)
    expect(analyzeText('👍🏽').codePoints).toBe(2)
  })

  it('中英文混排的汉字、单词、数字、标点统计正确', () => {
    const stats = countText('Hello, world! 你好 123')
    expect(stats.englishWords).toBe(2)
    expect(stats.chinese).toBe(2)
    expect(stats.digits).toBe(3)
    expect(stats.punctuation).toBe(2)
    expect(stats.lines).toBe(1)
    expect(stats.paragraphs).toBe(1)
    expect(stats.characters).toBe(20)
    expect(stats.noSpaces).toBe(17)
  })

  it('中文、全角标点、行数与段落数', () => {
    const stats = countText('中文abc 123！\n第二行')
    expect(stats.chinese).toBe(5)
    expect(stats.englishWords).toBe(1)
    expect(stats.digits).toBe(3)
    expect(stats.punctuation).toBe(1)
    expect(stats.lines).toBe(2)
    expect(stats.paragraphs).toBe(2)
    expect(stats.noSpaces).toBe(12)
  })

  it('CRLF 统一处理，\\r 不重复计入可见字符', () => {
    expect(splitLines('a\r\nb\rc')).toEqual(['a', 'b', 'c'])
    const stats = analyzeText('a\r\nb')
    expect(stats.lines).toBe(2)
    expect(stats.paragraphs).toBe(2)
    expect(stats.characters).toBe(3)
    expect(stats.codePoints).toBe(4)
    expect(stats.noSpaces).toBe(2)
  })

  it('空文本返回全 0，空行不计入段落', () => {
    expect(analyzeText('')).toMatchObject({
      characters: 0,
      codePoints: 0,
      chinese: 0,
      englishWords: 0,
      digits: 0,
      punctuation: 0,
      lines: 0,
      paragraphs: 0,
      noSpaces: 0
    })
    expect(analyzeText('\n\n  \n').paragraphs).toBe(0)
    expect(analyzeText('\n\n  \n').lines).toBe(4)
  })

  it('超长文本可正常统计', () => {
    const text = '中文abc123\n'.repeat(5000)
    const stats = countText(text)
    expect(stats.chinese).toBe(10000)
    expect(stats.englishWords).toBe(5000)
    expect(stats.digits).toBe(15000)
  })

  it('复制摘要包含全部 8 项统计', () => {
    const summary = buildSummary(countText('👨‍👩‍👧'))
    expect(summary).toContain('总字符数：1')
    for (const label of ['汉字数量', '英文单词数量', '数字数量', '标点符号数量', '行数', '段落数量', '不含空格的字符数']) {
      expect(summary).toContain(label)
    }
  })
})

describe('文本按行去重', () => {
  it('保留首次出现、忽略空行、保持原始顺序', () => {
    const result = dedupeLines('苹果\n香蕉\n苹果\n\n橘子', defaults)
    expect(result.lines).toEqual(['苹果', '香蕉', '橘子'])
    expect(result.resultText).toBe('苹果\n香蕉\n橘子')
    expect(result.originalCount).toBe(5)
    expect(result.resultCount).toBe(3)
    expect(result.removedCount).toBe(2)
  })

  it('保留最后一次出现，并按被保留项的原始位置输出', () => {
    const result = dedupeLines('苹果\n香蕉\n苹果\n\n橘子', { ...defaults, keep: 'last' })
    expect(result.lines).toEqual(['香蕉', '苹果', '橘子'])
    expect(result.removedCount).toBe(2)
  })

  it('忽略首尾空格只用于比较，输出保留原文', () => {
    const result = dedupeLines(' 苹果\n苹果\n 苹果 ', { ...defaults, trim: true })
    expect(result.lines).toEqual([' 苹果'])
    expect(result.removedCount).toBe(2)
    const noTrim = dedupeLines(' 苹果\n苹果', defaults)
    expect(noTrim.lines).toEqual([' 苹果', '苹果'])
  })

  it('区分大小写开关生效', () => {
    expect(dedupeLines('Apple\napple\nAPPLE', { ...defaults, caseSensitive: false }).lines).toEqual(['Apple'])
    expect(dedupeLines('Apple\napple\nAPPLE', defaults).lines).toEqual(['Apple', 'apple', 'APPLE'])
  })

  it('不忽略空行时空行参与去重但不被改写', () => {
    const result = dedupeLines('a\n\nb\n', { ...defaults, ignoreEmpty: false })
    expect(result.lines).toEqual(['a', '', 'b'])
    expect(result.originalCount).toBe(4)
    expect(result.removedCount).toBe(1)
  })

  it('CRLF 与空输入边界', () => {
    expect(dedupeLines('a\r\nb\r\na', defaults).lines).toEqual(['a', 'b'])
    const empty = dedupeLines('', defaults)
    expect(empty).toEqual({
      lines: [],
      resultText: '',
      originalCount: 0,
      resultCount: 0,
      removedCount: 0
    })
  })
})

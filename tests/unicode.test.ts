import { describe, expect, it } from 'vitest'
import {
  codePointText,
  convertUnicode,
  decodeUnicode,
  utf8BytesText
} from '@/tools/unicode-converter/logic'
import type { UnicodeFormat } from '@/tools/unicode-converter/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

const ALL_FORMATS: UnicodeFormat[] = ['u4', 'uBrace', 'uPlus', 'html', 'decimal', 'utf8']

describe('Unicode 转换 · 辅助函数', () => {
  it('codePointText 输出 U+XXXX 形式', () => {
    expect(codePointText(0x4e2d)).toBe('U+4E2D')
    expect(codePointText(0x1f600)).toBe('U+1F600')
    expect(codePointText(0x41)).toBe('U+0041')
    expect(codePointText(0x0a)).toBe('U+000A')
  })

  it('utf8BytesText 输出两位大写十六进制字节', () => {
    expect(utf8BytesText('中')).toBe('E4 B8 AD')
    expect(utf8BytesText('A')).toBe('41')
    expect(utf8BytesText('😀')).toBe('F0 9F 98 80')
    expect(utf8BytesText('é')).toBe('C3 A9')
  })
})

describe('Unicode 转换 · 编码方向', () => {
  it('六种格式对中文输出正确', () => {
    expect(must(convertUnicode('中', 'u4')).result).toBe('\\u4E2D')
    expect(must(convertUnicode('中', 'uBrace')).result).toBe('\\u{4E2D}')
    expect(must(convertUnicode('中', 'uPlus')).result).toBe('U+4E2D')
    expect(must(convertUnicode('中', 'html')).result).toBe('&#x4E2D;')
    expect(must(convertUnicode('中', 'decimal')).result).toBe('20013')
    expect(must(convertUnicode('中', 'utf8')).result).toBe('E4 B8 AD')
  })

  it('多个码点用空格连接，items 逐字符给出码点与输出', () => {
    const r = must(convertUnicode('中文', 'uPlus'))
    expect(r.result).toBe('U+4E2D U+6587')
    expect(r.items).toHaveLength(2)
    expect(r.items[0].char).toBe('中')
    expect(r.items[0].codePoint).toBe(0x4e2d)
    expect(r.items[0].output).toBe('U+4E2D')
    expect(r.items[1].codePoint).toBe(0x6587)
  })

  it('Emoji 增补平面：u4 拆代理对，其余格式用完整码点', () => {
    expect(must(convertUnicode('😀', 'u4')).result).toBe('\\uD83D\\uDE00')
    expect(must(convertUnicode('😀', 'uBrace')).result).toBe('\\u{1F600}')
    expect(must(convertUnicode('😀', 'uPlus')).result).toBe('U+1F600')
    expect(must(convertUnicode('😀', 'html')).result).toBe('&#x1F600;')
    expect(must(convertUnicode('😀', 'decimal')).result).toBe('128512')
    expect(must(convertUnicode('😀', 'utf8')).result).toBe('F0 9F 98 80')
    expect(must(convertUnicode('😀', 'u4')).items).toHaveLength(1)
  })

  it('组合字符按码点逐个处理', () => {
    const r = must(convertUnicode('e\u0301', 'decimal'))
    expect(r.items.map((item) => item.codePoint)).toEqual([101, 769])
    expect(r.result).toBe('101 769')
  })

  it('空输入与非法格式给中文错误', () => {
    expect(convertUnicode('', 'u4').ok).toBe(false)
    expect(convertUnicode('中', 'bad' as UnicodeFormat).ok).toBe(false)
  })
})

describe('Unicode 转换 · 解码方向', () => {
  it('解析各类转义与实体写法', () => {
    expect(must(decodeUnicode('\\u4E2D'))).toBe('中')
    expect(must(decodeUnicode('\\u{1F600}'))).toBe('😀')
    expect(must(decodeUnicode('U+4E2D'))).toBe('中')
    expect(must(decodeUnicode('&#x4E2D;'))).toBe('中')
    expect(must(decodeUnicode('&#20013;'))).toBe('中')
    expect(must(decodeUnicode('\\u4e2d'))).toBe('中') // 小写十六进制
    expect(must(decodeUnicode('u+4e2d'))).toBe('中')
  })

  it('解析代理对、十进制序列与 UTF-8 字节', () => {
    expect(must(decodeUnicode('\\uD83D\\uDE00'))).toBe('😀')
    expect(must(decodeUnicode('20013 25991'))).toBe('中文')
    expect(must(decodeUnicode('65 66'))).toBe('AB') // 纯十进制裸序列按码点解码
    expect(must(decodeUnicode('E4 B8 AD'))).toBe('中')
    expect(must(decodeUnicode('F0 9F 98 80'))).toBe('😀')
    expect(must(decodeUnicode('48 65 6C 6C 6F'))).toBe('Hello')
  })

  it('多种写法混排可还原', () => {
    expect(must(decodeUnicode('\\u4E2D U+6587 \\u{1F600} &#x41;'))).toBe('中文😀A')
    expect(must(decodeUnicode('&#x4E2D; E4 B8 AD'))).toBe('中中')
    expect(must(decodeUnicode('U+4E2D 20013'))).toBe('中中')
  })
})

describe('Unicode 转换 · 编码解码往返', () => {
  it('六种格式对中文 / Emoji / 组合字符均可往返', () => {
    const samples = ['中文', '一键工具狗 🐶', '😀', 'é', 'e\u0301', 'Hello 中文']
    for (const sample of samples) {
      for (const format of ALL_FORMATS) {
        const encoded = must(convertUnicode(sample, format)).result
        expect(must(decodeUnicode(encoded)), `${format} / ${sample}`).toBe(sample)
      }
    }
  })
})

describe('Unicode 转换 · 非法输入与中文报错', () => {
  it('空内容、非法序列、越界与不完整字节均报错', () => {
    const bad = [
      decodeUnicode(''),
      decodeUnicode('   '),
      decodeUnicode('\\uD83D'), // 孤立高代理项
      decodeUnicode('\\uDC00'), // 孤立低代理项
      decodeUnicode('\\uZZZZ'),
      decodeUnicode('not-a-number'),
      decodeUnicode('0xZZ'),
      decodeUnicode('999999999'), // 十进制越界
      decodeUnicode('\\u{FFFFFF}'), // 码点越界
      decodeUnicode('E4 B8') // UTF-8 不完整
    ]
    bad.forEach((r) => expect(r.ok).toBe(false))
  })

  it('报错文案均为中文', () => {
    const cases = [
      decodeUnicode(''),
      decodeUnicode('\\uD83D'),
      decodeUnicode('999999999'),
      decodeUnicode('E4 B8'),
      convertUnicode('', 'u4')
    ]
    cases.forEach((r) => {
      expect(r.ok).toBe(false)
      if (!r.ok) expect(/[\u4e00-\u9fa5]/.test(r.message)).toBe(true)
    })
  })
})

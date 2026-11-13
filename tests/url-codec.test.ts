import { describe, expect, it } from 'vitest'
import { convertUrl, urlDecode, urlEncode } from '@/tools/url-codec/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('URL 百分号编码', () => {
  it('按 UTF-8 逐字节编码中文', () => {
    expect(must(urlEncode('中文'))).toBe('%E4%B8%AD%E6%96%87')
    expect(must(urlDecode('%E4%B8%AD%E6%96%87'))).toBe('中文')
    expect(must(urlEncode('abc-._~'))).toBe('abc-._~')
  })

  it('空格默认 %20，可切换为表单格式 +', () => {
    expect(must(urlEncode('a b'))).toBe('a%20b')
    expect(must(urlEncode('a b', true))).toBe('a+b')
    expect(must(urlDecode('a%20b'))).toBe('a b')
    expect(must(urlDecode('a+b'))).toBe('a b')
    expect(must(urlDecode('a+b', false))).toBe('a+b')
  })

  it('网址与特殊字符', () => {
    const encoded = must(urlEncode('https://a.com/x?y=1&z=2'))
    expect(encoded).toContain('%3A%2F%2F')
    expect(encoded).toContain('%3F')
    expect(encoded).toContain('%26')
    expect(must(urlDecode(encoded))).toBe('https://a.com/x?y=1&z=2')
  })

  it('中文、Emoji 与混合输入可往返', () => {
    for (const text of ['一键工具狗 & 微信小程序', '🐶🎉 Hello', '中文%20abc']) {
      expect(must(urlDecode(must(urlEncode(text))))).toBe(text)
    }
    expect(must(urlDecode('中文%20abc'))).toBe('中文 abc')
    expect(must(convertUrl('中文', 'encode'))).toBe('%E4%B8%AD%E6%96%87')
    expect(must(convertUrl('%E4%B8%AD', 'decode'))).toBe('中')
  })

  it('非法百分号编码与空输入', () => {
    expect(urlEncode('').ok).toBe(false)
    expect(urlDecode('').ok).toBe(false)
    expect(urlDecode('abc%').ok).toBe(false)
    expect(urlDecode('%ZZ').ok).toBe(false)
    expect(urlDecode('%E4%B8').ok).toBe(false)
  })
})

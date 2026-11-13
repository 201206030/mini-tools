import { describe, expect, it } from 'vitest'
import { base64Decode, base64Encode, convertBase64 } from '@/tools/base64-codec/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('Base64 编解码', () => {
  it('ASCII 与补位符正确', () => {
    expect(must(base64Encode('Man'))).toBe('TWFu')
    expect(must(base64Decode('TWFu'))).toBe('Man')
    expect(must(base64Encode('Ma'))).toBe('TWE=')
    expect(must(base64Decode('TWE='))).toBe('Ma')
    expect(must(base64Encode('M'))).toBe('TQ==')
    expect(must(base64Decode('TQ=='))).toBe('M')
  })

  it('中文、混合文本与 Emoji 可往返', () => {
    for (const text of ['一键工具狗', '中文 Chinese 123', '🐶🎉 Hanä', 'a\nb\tc']) {
      const encoded = must(base64Encode(text))
      expect(must(base64Decode(encoded))).toBe(text)
    }
    expect(must(convertBase64('一键工具狗', 'encode')).length).toBeGreaterThan(0)
  })

  it('兼容无补位符、空白与 URL-safe 字符', () => {
    expect(must(base64Decode('TWE'))).toBe('Ma')
    expect(must(base64Decode('TQ'))).toBe('M')
    expect(must(base64Decode('TWFu\n  '))).toBe('Man')
    // URL-safe 变体（把 + / 换成 - _）仍可解码
    const original = '一键工具狗 中文测试 🚀'
    const encoded = must(base64Encode(original))
    const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_')
    expect(must(base64Decode(urlSafe))).toBe(original)
  })

  it('非法输入给出中文提示', () => {
    expect(base64Encode('').ok).toBe(false)
    expect(base64Decode('').ok).toBe(false)
    expect(base64Decode('A').ok).toBe(false)
    expect(base64Decode('TWFu!').ok).toBe(false)
    expect(base64Decode('****').ok).toBe(false)
    expect(convertBase64('', 'decode').ok).toBe(false)
  })
})

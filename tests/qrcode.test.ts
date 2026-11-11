import { describe, expect, it } from 'vitest'
import {
  MAX_QR_CHARS,
  buildContactCard,
  createQrMatrix,
  utf8Bytes,
  validateContactCard,
  validateQrContent
} from '@/tools/qrcode-generator/logic'

describe('二维码 UTF-8 编码', () => {
  it('ASCII、中文、Emoji 编码正确', () => {
    expect(utf8Bytes('A')).toEqual([0x41])
    expect(utf8Bytes('中')).toEqual([0xe4, 0xb8, 0xad])
    expect(utf8Bytes('😀')).toEqual([0xf0, 0x9f, 0x98, 0x80])
    expect(utf8Bytes('')).toEqual([])
    expect(utf8Bytes('é')).toEqual([0xc3, 0xa9])
  })

  it('孤立代理项替换为 U+FFFD 而不抛异常', () => {
    expect(utf8Bytes('\ud800')).toEqual([0xef, 0xbf, 0xbd])
  })
})

describe('二维码内容校验与点阵生成', () => {
  it('空内容禁止生成', () => {
    expect(validateQrContent('')).toContain('请输入')
    expect(validateQrContent('   ')).toContain('请输入')
    expect(validateQrContent('\n\t')).toContain('请输入')
    expect(createQrMatrix('').ok).toBe(false)
  })

  it('超长内容给出中文提示', () => {
    const error = validateQrContent('a'.repeat(MAX_QR_CHARS + 1))
    expect(error).toContain('800')
    expect(createQrMatrix('a'.repeat(MAX_QR_CHARS + 1)).ok).toBe(false)
  })

  it('普通文字、网址、中文与 Emoji 均可生成方阵', () => {
    for (const text of ['hello', 'https://example.com/a?b=1', '你好，世界！', '工具箱😀']) {
      const result = createQrMatrix(text)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      const { size, modules } = result.value
      expect(size).toBeGreaterThanOrEqual(21)
      expect(size % 4).toBe(1)
      expect(modules).toHaveLength(size)
      expect(modules.every((row) => row.length === size)).toBe(true)
      expect(modules.flat().some((v) => v === true)).toBe(true)
      expect(modules.flat().some((v) => v === false)).toBe(true)
    }
  })

  it('四档纠错级别都能生成，且内容越长点阵越大', () => {
    for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
      expect(createQrMatrix('万能工具箱', ecc).ok).toBe(true)
    }
    const short = createQrMatrix('a')
    const long = createQrMatrix('a'.repeat(200))
    expect(short.ok && long.ok).toBe(true)
    if (short.ok && long.ok) expect(long.value.size).toBeGreaterThan(short.value.size)
  })

  it('超出二维码字节容量时返回中文错误而非抛异常', () => {
    const result = createQrMatrix('中'.repeat(MAX_QR_CHARS))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('精简')
  })
})

describe('联系人名片', () => {
  it('至少填写姓名或电话', () => {
    expect(validateContactCard({ name: '', phone: '', email: '' })).toContain('至少填写')
    expect(validateContactCard({ name: '  ', phone: '', email: '' })).toContain('至少填写')
    expect(validateContactCard({ name: '', phone: '13800138000', email: '' })).toBeNull()
    expect(validateContactCard({ name: '张三', phone: '', email: '' })).toBeNull()
  })

  it('生成标准 MECARD 并转义分号、逗号、冒号与换行', () => {
    expect(buildContactCard({ name: '张三', phone: '13800138000', email: 'a@b.com' })).toBe(
      'MECARD:N:张三;TEL:13800138000;EMAIL:a@b.com;;'
    )
    expect(buildContactCard({ name: '张;三,李四', phone: '1\n2', email: '' })).toBe(
      'MECARD:N:张\\;三\\,李四;TEL:1 2;EMAIL:;;'
    )
  })

  it('名片文本可直接生成二维码', () => {
    const card = buildContactCard({ name: '张三', phone: '13800138000', email: 'a@b.com' })
    expect(createQrMatrix(card).ok).toBe(true)
  })
})

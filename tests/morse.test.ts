import { describe, expect, it } from 'vitest'
import {
  MORSE_TABLE,
  convertMorse,
  morseToText,
  textToMorse
} from '@/tools/morse-code/logic'

describe('摩斯电码转换', () => {
  it('电码表覆盖 26 个字母与 10 个数字', () => {
    expect(MORSE_TABLE.some((item) => item.char === 'A' && item.code === '.-')).toBe(true)
    expect(MORSE_TABLE.filter((item) => /^[A-Z]$/.test(item.char))).toHaveLength(26)
    expect(MORSE_TABLE.filter((item) => /^\d$/.test(item.char))).toHaveLength(10)
  })

  it('文字与电码互转，单词用 / 分隔', () => {
    const encoded = textToMorse('HELLO WORLD')
    expect(encoded.ok).toBe(true)
    if (encoded.ok) {
      expect(encoded.value.text).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..')
      expect(morseToText(encoded.value.text).ok).toBe(true)
      expect(morseToText(encoded.value.text)).toMatchObject({ ok: true })
    }
    const sos = convertMorse('SOS', 'encode')
    expect(sos.ok && sos.value.text).toBe('... --- ...')
    const decoded = convertMorse('... --- ...', 'decode')
    expect(decoded.ok && decoded.value.text).toBe('SOS')
  })

  it('支持小写、数字、标点与竖线分隔', () => {
    expect(morseToText('.... . .-.. .-.. --- | .-- --- .-. .-.. -..').ok).toBe(true)
    const lower = textToMorse('sos')
    expect(lower.ok && lower.value.text).toBe('... --- ...')
    const digits = convertMorse('.---- ..--- ...--', 'decode')
    expect(digits.ok && digits.value.text).toBe('123')
    expect(morseToText('... --- ...').ok).toBe(true)
  })

  it('中文等不支持字符会明确列出，非法电码用 ? 标出', () => {
    const chinese = textToMorse('中文')
    expect(chinese.ok).toBe(true)
    if (chinese.ok) expect(chinese.value.skipped).toEqual(['中', '文'])
    const unknown = morseToText('..... ???')
    expect(unknown.ok).toBe(true)
    if (unknown.ok) {
      expect(unknown.value.unknown).toContain('???')
      expect(unknown.value.text).toContain('?')
    }
    expect(morseToText('').ok).toBe(false)
    expect(textToMorse('   ').ok).toBe(false)
  })
})

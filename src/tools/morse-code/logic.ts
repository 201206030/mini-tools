import type { CalcResult } from '@/types/common'

/** 国际摩斯电码表：字母、数字与常用标点；中文不在标准电码表内 */
const CODE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
}

export interface MorseChar {
  char: string
  code: string
}

/** 供界面展示电码表 */
export const MORSE_TABLE: MorseChar[] = Object.keys(CODE_MAP).map((char) => ({
  char,
  code: CODE_MAP[char]
}))

const REVERSE_MAP: Record<string, string> = MORSE_TABLE.reduce<Record<string, string>>((map, item) => {
  map[item.code] = item.char
  return map
}, {})

export interface MorseConvertResult {
  text: string
  /** 编码时不支持、已跳过的字符 */
  skipped: string[]
  /** 解码时无法识别的电码 */
  unknown: string[]
}

/** 文本 → 摩斯电码：字符之间用空格，单词之间用 / */
export function textToMorse(text: string): CalcResult<MorseConvertResult> {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { ok: false, message: '请输入要转换的内容' }

  const skipped: string[] = []
  const encodedWords = words.map((word) => {
    const codes: string[] = []
    for (const char of word.toUpperCase()) {
      const code = CODE_MAP[char]
      if (code) {
        codes.push(code)
      } else if (!skipped.includes(char)) {
        skipped.push(char)
      }
    }
    return codes.join(' ')
  })

  return {
    ok: true,
    value: { text: encodedWords.join(' / '), skipped, unknown: [] }
  }
}

/** 摩斯电码 → 文本：/ 或 | 视为单词分隔，无法识别的电码用 ? 标出 */
export function morseToText(text: string): CalcResult<MorseConvertResult> {
  const normalized = text.trim().replace(/[−–—]/g, '-').replace(/\|/g, '/')
  if (!normalized) return { ok: false, message: '请输入要转换的摩斯电码' }

  const unknown: string[] = []
  const words = normalized.split('/').map((word) => {
    const codes = word.trim().split(/\s+/).filter(Boolean)
    return codes
      .map((code) => {
        const char = REVERSE_MAP[code]
        if (char) return char
        if (!unknown.includes(code)) unknown.push(code)
        return '?'
      })
      .join('')
  })

  const result = words.filter(Boolean).join(' ')
  if (!result) return { ok: false, message: '没有识别到有效的电码' }
  return { ok: true, value: { text: result, skipped: [], unknown } }
}

export function convertMorse(
  text: string,
  direction: 'encode' | 'decode'
): CalcResult<MorseConvertResult> {
  return direction === 'encode' ? textToMorse(text) : morseToText(text)
}

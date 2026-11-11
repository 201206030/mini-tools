/** 文本分析工具：正确处理中文、英文、数字、标点和 Emoji */

export interface TextStats {
  /** 总字符数（按可见字符，组合 Emoji 计为 1 个） */
  characters: number
  /** Unicode 码点数 */
  codePoints: number
  /** 汉字数量 */
  chinese: number
  /** 英文单词数量 */
  englishWords: number
  /** 数字数量 */
  digits: number
  /** 标点符号数量 */
  punctuation: number
  /** 行数 */
  lines: number
  /** 段落数（按非空行统计） */
  paragraphs: number
  /** 不含空格、换行、制表符的字符数 */
  noSpaces: number
}

const HAN_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u{20000}-\u{2A6DF}\u{2A700}-\u{2EBEF}]/gu
const WORD_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g
const DIGIT_RE = /[0-9\uFF10-\uFF19]/g
const PUNCT_RE =
  /[\u3001-\u303F\uFE10-\uFE1F\uFE30-\uFE4F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\u2010-\u2027\u2030-\u203B\u00A1-\u00BF\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/gu
const WHITESPACE_RE = /[\s\u3000\uFEFF]/g

/** 判断某个码点是否应并入前一个可见字符（组合符号、肤色、变体选择符、连接符等） */
function isContinuation(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0xfe20 && cp <= 0xfe2f) ||
    (cp >= 0xe0100 && cp <= 0xe01ef) ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    cp === 0x200d
  )
}

/**
 * 近似字素簇计数：把「👨‍👩‍👧」「👍🏽」「🇨🇳」「é」这类组合字符计为 1 个可见字符。
 * 小程序环境不一定提供 Intl.Segmenter，因此这里做本地轻量实现。
 */
export function countGraphemes(text: string): number {
  const chars = Array.from(text || '')
  let count = 0
  let previousWasJoiner = false
  let regionalRun = 0
  for (const char of chars) {
    const cp = char.codePointAt(0) || 0
    if (cp === 0x0d) continue // \r\n 中的 \r 不单独计数
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) {
      if (regionalRun % 2 === 0) count += 1
      regionalRun += 1
      previousWasJoiner = false
      continue
    }
    regionalRun = 0
    if (!previousWasJoiner && !isContinuation(cp)) count += 1
    previousWasJoiner = cp === 0x200d
  }
  return count
}

function countMatches(text: string, pattern: RegExp): number {
  const regex = new RegExp(pattern.source, pattern.flags)
  let count = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    count += 1
    if (match[0] === '') regex.lastIndex += 1
  }
  return count
}

export function analyzeText(text: string): TextStats {
  const source = String(text || '')
  const lines = source.length === 0 ? 0 : source.split(/\r\n|\n|\r/).length
  const paragraphs = source.length === 0 ? 0 : source.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0).length
  return {
    characters: countGraphemes(source),
    codePoints: Array.from(source).length,
    chinese: countMatches(source, HAN_RE),
    englishWords: countMatches(source, WORD_RE),
    digits: countMatches(source, DIGIT_RE),
    punctuation: countMatches(source, PUNCT_RE),
    lines,
    paragraphs,
    noSpaces: countGraphemes(source.replace(WHITESPACE_RE, ''))
  }
}

/** 按换行切分，统一 CRLF / CR */
export function splitLines(text: string): string[] {
  return String(text || '').split(/\r\n|\n|\r/)
}

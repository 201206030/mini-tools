import { splitLines } from '@/utils/text'

export interface DedupeOptions {
  keep: 'first' | 'last'
  ignoreEmpty: boolean
  trim: boolean
  caseSensitive: boolean
}

export interface DedupeResult {
  lines: string[]
  resultText: string
  originalCount: number
  resultCount: number
  removedCount: number
}

/**
 * 按行去重：保持原始顺序，trim 只用于比较、输出保留用户原始文本。
 * 保留最后一次时，按被保留项在原文本中的出现顺序输出。
 */
export function dedupeLines(text: string, options: DedupeOptions): DedupeResult {
  const source = String(text || '')
  const allLines = source.length === 0 ? [] : splitLines(source)
  const originalCount = allLines.length

  // ignoreEmpty：空行与纯空白行不参与去重，也不出现在结果中
  const candidates: string[] = []
  for (const line of allLines) {
    if (options.ignoreEmpty && line.trim().length === 0) continue
    candidates.push(line)
  }

  const keyOf = (line: string): string => {
    const base = options.trim ? line.trim() : line
    return options.caseSensitive ? base : base.toLowerCase()
  }

  const keepIndexByKey = new Map<string, number>()
  if (options.keep === 'first') {
    candidates.forEach((line, index) => {
      const key = keyOf(line)
      if (!keepIndexByKey.has(key)) keepIndexByKey.set(key, index)
    })
  } else {
    // 后出现的覆盖前面的下标，即保留最后一次出现
    candidates.forEach((line, index) => {
      keepIndexByKey.set(keyOf(line), index)
    })
  }

  // 按被保留项在原文本中的下标升序输出，保持原始顺序
  const keptIndices = Array.from(keepIndexByKey.values()).sort((a, b) => a - b)
  const lines = keptIndices.map((index) => candidates[index])
  const resultText = lines.join('\n')
  const resultCount = lines.length
  const removedCount = originalCount - resultCount

  return { lines, resultText, originalCount, resultCount, removedCount }
}

import type { CalcResult } from '@/types/common'
import { splitLines } from '@/utils/text'

export type DiffLineType = 'same' | 'added' | 'removed'

export interface DiffLine {
  type: DiffLineType
  /** 原文行（removed / same 时存在） */
  left?: string
  /** 新文行（added / same 时存在） */
  right?: string
  /** 原文行号，从 1 开始 */
  leftNo?: number
  /** 新文行号，从 1 开始 */
  rightNo?: number
}

export interface DiffOptions {
  ignoreCase: boolean
  ignoreWhitespace: boolean
}

export interface DiffStats {
  same: number
  added: number
  removed: number
}

export interface DiffResult {
  rows: DiffLine[]
  stats: DiffStats
  /** 两段原始文本逐字相同 */
  identical: boolean
}

/** 单侧允许的最大行数 */
export const MAX_DIFF_LINES = 300

/**
 * 归一化比较键：只用于 LCS 比较，rows 里仍保留原始文本。
 * ignoreWhitespace：去掉首尾空白，并把中间连续空白折叠为一个空格。
 * ignoreCase：英文字母统一转小写。
 */
function normalizeKey(line: string, options: DiffOptions): string {
  let key = line
  if (Boolean(options?.ignoreWhitespace)) key = key.replace(/\s+/g, ' ').trim()
  if (Boolean(options?.ignoreCase)) key = key.toLowerCase()
  return key
}

/**
 * 标准 LCS 动态规划的行级差异（不依赖第三方库）。
 * 先用 splitLines 切行（统一 CRLF / CR），再按选项归一化比较键。
 */
export function diffLines(
  leftText: string,
  rightText: string,
  options: DiffOptions
): CalcResult<DiffResult> {
  if (typeof leftText !== 'string' || typeof rightText !== 'string') {
    return { ok: false, message: '输入内容无效，请重新输入文本' }
  }
  if (leftText === '' && rightText === '') {
    return { ok: false, message: '两侧文本都为空，请输入要对比的内容' }
  }

  // 空字符串视为「零行」，避免 splitLines('') 产生的单个空行被当成一条内容
  const leftLines = leftText === '' ? [] : splitLines(leftText)
  const rightLines = rightText === '' ? [] : splitLines(rightText)
  if (leftLines.length > MAX_DIFF_LINES || rightLines.length > MAX_DIFF_LINES) {
    return { ok: false, message: `单侧文本最多 ${MAX_DIFF_LINES} 行，请减少内容后再对比` }
  }

  const leftKeys = leftLines.map((line) => normalizeKey(line, options))
  const rightKeys = rightLines.map((line) => normalizeKey(line, options))
  const n = leftLines.length
  const m = rightLines.length
  const width = m + 1
  // LCS 长度最大为 300，Uint16 足够
  const dp = new Uint16Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const index = i * width + j
      if (leftKeys[i] === rightKeys[j]) {
        dp[index] = dp[(i + 1) * width + (j + 1)] + 1
      } else {
        dp[index] = Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)])
      }
    }
  }

  const rows: DiffLine[] = []
  let i = 0
  let j = 0
  let leftNo = 1
  let rightNo = 1
  while (i < n && j < m) {
    if (leftKeys[i] === rightKeys[j]) {
      rows.push({ type: 'same', left: leftLines[i], right: rightLines[j], leftNo, rightNo })
      i += 1
      j += 1
      leftNo += 1
      rightNo += 1
    } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
      rows.push({ type: 'removed', left: leftLines[i], leftNo })
      i += 1
      leftNo += 1
    } else {
      rows.push({ type: 'added', right: rightLines[j], rightNo })
      j += 1
      rightNo += 1
    }
  }
  while (i < n) {
    rows.push({ type: 'removed', left: leftLines[i], leftNo })
    i += 1
    leftNo += 1
  }
  while (j < m) {
    rows.push({ type: 'added', right: rightLines[j], rightNo })
    j += 1
    rightNo += 1
  }

  const stats: DiffStats = { same: 0, added: 0, removed: 0 }
  for (const row of rows) stats[row.type] += 1
  return { ok: true, value: { rows, stats, identical: leftText === rightText } }
}

/** 输出带 `+ ` / `- ` / `  ` 前缀的可复制差异文本 */
export function buildDiffText(rows: DiffLine[]): string {
  const list = Array.isArray(rows) ? rows : []
  return list
    .map((row) => {
      const prefix = row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '
      const content =
        row.type === 'removed' ? (row.left ?? '') : (row.right ?? row.left ?? '')
      return prefix + content
    })
    .join('\n')
}

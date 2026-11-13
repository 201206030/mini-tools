import type { CalcResult } from '@/types/common'

export type JsonMode = 'pretty' | 'minify' | 'validate' | 'escape' | 'unescape'

export interface JsonResult {
  text: string
  info: string
}

export const JSON_MODES: Array<{ id: JsonMode; label: string }> = [
  { id: 'pretty', label: '美化' },
  { id: 'minify', label: '压缩' },
  { id: 'validate', label: '校验' },
  { id: 'escape', label: '转义' },
  { id: 'unescape', label: '反转义' }
]

/** 限制单次处理长度，避免超长文本造成页面卡顿 */
export const MAX_JSON_LENGTH = 200000

export function describeJsonValue(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `数组，${value.length} 个元素`
  if (typeof value === 'object') return `对象，${Object.keys(value as object).length} 个顶层字段`
  if (typeof value === 'string') return `字符串，${value.length} 个字符`
  if (typeof value === 'number') return `数字 ${value}`
  if (typeof value === 'boolean') return `布尔值 ${value}`
  return typeof value
}

/** 把任意文本转成合法的 JSON 字符串字面量（含首尾引号） */
export function escapeJsonString(text: string): string {
  return JSON.stringify(text)
}

/** 反转义：输入必须是带首尾双引号的 JSON 字符串 */
export function unescapeJsonString(text: string): CalcResult<string> {
  const raw = text.trim()
  if (!raw.startsWith('"') || !raw.endsWith('"') || raw.length < 2) {
    return { ok: false, message: '请粘贴带首尾双引号的 JSON 字符串' }
  }
  try {
    const value = JSON.parse(raw)
    if (typeof value !== 'string') return { ok: false, message: '内容不是 JSON 字符串' }
    return { ok: true, value }
  } catch {
    return { ok: false, message: '字符串转义格式不正确，请检查引号与反斜杠' }
  }
}

export function formatJson(input: string, mode: JsonMode, indent = 2): CalcResult<JsonResult> {
  if (input.length > MAX_JSON_LENGTH) {
    return { ok: false, message: '文本过长，请缩短后重试（上限 20 万字符）' }
  }
  const raw = input.trim()
  if (!raw) return { ok: false, message: '请输入 JSON 文本或要转义的内容' }

  if (mode === 'escape') {
    const text = escapeJsonString(input)
    return { ok: true, value: { text, info: '已转为 JSON 字符串字面量（含首尾引号）' } }
  }
  if (mode === 'unescape') {
    const result = unescapeJsonString(raw)
    return result.ok
      ? { ok: true, value: { text: result.value, info: `还原出 ${result.value.length} 个字符` } }
      : result
  }

  try {
    const value: unknown = JSON.parse(raw)
    const info = describeJsonValue(value)
    if (mode === 'validate') {
      return { ok: true, value: { text: 'JSON 格式正确，可以正常解析', info } }
    }
    const text = mode === 'pretty' ? JSON.stringify(value, null, indent) : JSON.stringify(value)
    if (typeof text !== 'string') {
      return { ok: false, message: '内容无法序列化，请检查是否包含无法处理的值' }
    }
    return { ok: true, value: { text, info: `${info}；输出 ${text.length} 个字符` } }
  } catch (error) {
    const detail = error instanceof Error ? error.message : '请检查引号、逗号与括号'
    return { ok: false, message: `JSON 解析失败：${detail}` }
  }
}

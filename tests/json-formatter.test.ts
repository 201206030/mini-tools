import { describe, expect, it } from 'vitest'
import {
  JSON_MODES,
  MAX_JSON_LENGTH,
  describeJsonValue,
  escapeJsonString,
  formatJson,
  unescapeJsonString
} from '@/tools/json-formatter/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

const SAMPLE = '{"name":"一键工具狗","local":true,"tools":["JSON 格式化","时间戳转换"],"count":2}'

describe('JSON 格式化', () => {
  it('美化、压缩与校验', () => {
    const pretty = must(formatJson(SAMPLE, 'pretty', 2))
    expect(pretty.text).toContain('\n')
    expect(pretty.text).toContain('  "name"')
    expect(pretty.info).toContain('对象')

    const minified = must(formatJson(SAMPLE, 'minify'))
    expect(minified.text).not.toContain('\n')
    expect(JSON.parse(minified.text)).toEqual(JSON.parse(SAMPLE))

    const validated = must(formatJson(SAMPLE, 'validate'))
    expect(validated.text).toContain('格式正确')
    expect(formatJson('[1,2,3]', 'validate').ok).toBe(true)
    expect(describeJsonValue([1, 2])).toBe('数组，2 个元素')
  })

  it('字符串转义与反转义', () => {
    const original = 'a"b\n中文'
    const escaped = escapeJsonString(original)
    expect(escaped).toBe(JSON.stringify(original))
    expect(must(unescapeJsonString(escaped))).toBe(original)
    expect(must(formatJson(original, 'escape')).text).toBe(escaped)
    expect(must(formatJson(escaped, 'unescape')).text).toBe(original)
    expect(unescapeJsonString('{"a":1}').ok).toBe(false)
  })

  it('非法 JSON、空输入与超长文本给出中文提示', () => {
    expect(formatJson('', 'pretty').ok).toBe(false)
    expect(formatJson('{"a":}', 'pretty').ok).toBe(false)
    expect(formatJson('x'.repeat(MAX_JSON_LENGTH + 1), 'pretty').ok).toBe(false)
    const invalid = formatJson('{"a":}', 'pretty')
    if (!invalid.ok) expect(invalid.message).toContain('JSON 解析失败')
  })

  it('模式表完整', () => {
    expect(JSON_MODES.map((item) => item.id)).toEqual([
      'pretty', 'minify', 'validate', 'escape', 'unescape'
    ])
  })
})

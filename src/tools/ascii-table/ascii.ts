import type { SelectOption } from '@/types/common'

/** ASCII 字符类别 */
export type AsciiCategory = 'control' | 'digit' | 'upper' | 'lower' | 'punct' | 'space'

export interface AsciiChar {
  /** 十进制码值 0~127 */
  code: number
  /** 两位大写十六进制，如 41 */
  hex: string
  /** 可打印字符本身；控制字符为空串 */
  char: string
  /** 中文名称 */
  name: string
  category: AsciiCategory
}

/** 0~31 控制字符的中文名称 */
const CONTROL_NAMES: string[] = [
  'NULL 空字符', // 0
  'SOH 标题开始', // 1
  'STX 正文开始', // 2
  'ETX 正文结束', // 3
  'EOT 传输结束', // 4
  'ENQ 询问', // 5
  'ACK 确认', // 6
  'BEL 响铃', // 7
  'BS 退格', // 8
  'TAB 水平制表符', // 9
  '换行 LF', // 10
  'VT 垂直制表符', // 11
  'FF 换页', // 12
  '回车 CR', // 13
  'SO 移出', // 14
  'SI 移入', // 15
  'DLE 数据链路转义', // 16
  'DC1 设备控制一', // 17
  'DC2 设备控制二', // 18
  'DC3 设备控制三', // 19
  'DC4 设备控制四', // 20
  'NAK 否认', // 21
  'SYN 同步空闲', // 22
  'ETB 传输块结束', // 23
  'CAN 取消', // 24
  'EM 介质结束', // 25
  'SUB 替换', // 26
  'ESC 转义', // 27
  'FS 文件分隔符', // 28
  'GS 组分隔符', // 29
  'RS 记录分隔符', // 30
  'US 单元分隔符' // 31
]

/** 可打印标点符号的中文名称 */
const PUNCT_NAMES: Record<string, string> = {
  '!': '感叹号',
  '"': '双引号',
  '#': '井号',
  '$': '美元符号',
  '%': '百分号',
  '&': '与号',
  '\'': '单引号',
  '(': '左圆括号',
  ')': '右圆括号',
  '*': '星号',
  '+': '加号',
  ',': '逗号',
  '-': '减号',
  '.': '句号',
  '/': '斜杠',
  ':': '冒号',
  ';': '分号',
  '<': '小于号',
  '=': '等号',
  '>': '大于号',
  '?': '问号',
  '@': '艾特符号',
  '[': '左方括号',
  '\\': '反斜杠',
  ']': '右方括号',
  '^': '脱字符',
  '_': '下划线',
  '`': '反引号',
  '{': '左花括号',
  '|': '竖线',
  '}': '右花括号',
  '~': '波浪号'
}

/** 类别中文名，用于界面与按类别名搜索 */
export const CATEGORY_LABELS: Record<AsciiCategory, string> = {
  control: '控制字符',
  digit: '数字',
  upper: '大写字母',
  lower: '小写字母',
  punct: '标点符号',
  space: '空格'
}

/** 筛选项，value 传 'all' 表示全部 */
export const ASCII_CATEGORIES: Array<SelectOption<string>> = [
  { label: '全部', value: 'all' },
  { label: '控制字符', value: 'control' },
  { label: '数字', value: 'digit' },
  { label: '大写字母', value: 'upper' },
  { label: '小写字母', value: 'lower' },
  { label: '标点符号', value: 'punct' },
  { label: '空格', value: 'space' }
]

function buildAsciiChars(): AsciiChar[] {
  const list: AsciiChar[] = []
  for (let code = 0; code <= 127; code += 1) {
    const hex = code.toString(16).toUpperCase().padStart(2, '0')
    if (code <= 31) {
      list.push({ code, hex, char: '', name: CONTROL_NAMES[code], category: 'control' })
    } else if (code === 32) {
      list.push({ code, hex, char: ' ', name: '空格', category: 'space' })
    } else if (code === 127) {
      list.push({ code, hex, char: '', name: 'DEL 删除', category: 'control' })
    } else if (code >= 48 && code <= 57) {
      const c = String.fromCharCode(code)
      list.push({ code, hex, char: c, name: `数字 ${c}`, category: 'digit' })
    } else if (code >= 65 && code <= 90) {
      const c = String.fromCharCode(code)
      list.push({ code, hex, char: c, name: `大写字母 ${c}`, category: 'upper' })
    } else if (code >= 97 && code <= 122) {
      const c = String.fromCharCode(code)
      list.push({ code, hex, char: c, name: `小写字母 ${c}`, category: 'lower' })
    } else {
      const c = String.fromCharCode(code)
      list.push({ code, hex, char: c, name: `${PUNCT_NAMES[c] || '标点'} ${c}`, category: 'punct' })
    }
  }
  return list
}

/** 完整 ASCII 0~127 共 128 项 */
export const ASCII_CHARS: AsciiChar[] = buildAsciiChars()

/** 按十进制码值取字符；越界返回 undefined */
export function getAscii(code: number): AsciiChar | undefined {
  if (!Number.isInteger(code) || code < 0 || code > 127) return undefined
  return ASCII_CHARS[code]
}

/** 把搜索词解析为若干候选十进制码值：支持十进制、0x 前缀及十六进制字面 */
function codeCandidates(query: string): Set<number> {
  const set = new Set<number>()
  const lower = query.toLowerCase()
  if (/^0x[0-9a-f]+$/.test(lower)) {
    set.add(parseInt(lower.slice(2), 16))
  } else if (/^[0-9]+$/.test(query)) {
    set.add(parseInt(query, 10)) // 十进制
    set.add(parseInt(query, 16)) // 纯数字也可能是十六进制字面，如 41 → 0x41
  } else if (query.length >= 2 && /^[0-9a-f]+$/i.test(query)) {
    set.add(parseInt(query, 16)) // 含字母的十六进制，如 4A、1F
  }
  return set
}

/**
 * 搜索 ASCII 表：支持十进制 / 十六进制码值、字符本身、中文名称、类别名。
 * category 传 'all'（或空）表示不按类别过滤。
 */
export function searchAscii(query: string, category: string): AsciiChar[] {
  const q = String(query == null ? '' : query).trim()
  const lower = q.toLowerCase()
  const codes = codeCandidates(q)
  // 只认已知类别，未知值 / 空值 / 'all' 都按「全部」处理
  const activeCategory: string = category in CATEGORY_LABELS ? category : 'all'

  return ASCII_CHARS.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false
    if (!q) return true
    if (codes.has(item.code)) return true
    if (item.hex === q.toUpperCase()) return true
    if (q.length === 1 && item.char === q) return true
    if (item.name.toLowerCase().includes(lower)) return true
    const label = CATEGORY_LABELS[item.category]
    if (label.includes(q) || item.category.includes(lower)) return true
    return false
  })
}

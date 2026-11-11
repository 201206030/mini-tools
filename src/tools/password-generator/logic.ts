import { shuffle } from '@/utils/random'
import type { CalcResult } from '@/types/common'

const DOUBLE_QUOTE = '"'
const SINGLE_QUOTE = "'"
const BACKTICK = '`'
const PIPE = '|'

export const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digit: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.?/' + PIPE + BACKTICK + DOUBLE_QUOTE + SINGLE_QUOTE
}

/** 易混淆字符：0 O 1 l I | ` " ' */
export const AMBIGUOUS = '0O1lI' + PIPE + BACKTICK + DOUBLE_QUOTE + SINGLE_QUOTE

export interface PasswordOptions {
  upper: boolean
  lower: boolean
  digit: boolean
  symbol: boolean
  excludeAmbiguous: boolean
}

export const MIN_LENGTH = 4
export const MAX_LENGTH = 64

function filterChars(chars: string, exclude: boolean): string {
  if (!exclude) return chars
  return Array.from(chars)
    .filter((ch) => AMBIGUOUS.indexOf(ch) === -1)
    .join('')
}

/** 按已选类型返回过滤后的字符分组 */
function selectedGroups(options: PasswordOptions): string[] {
  const groups: string[] = []
  if (options.upper) groups.push(filterChars(CHARSETS.upper, options.excludeAmbiguous))
  if (options.lower) groups.push(filterChars(CHARSETS.lower, options.excludeAmbiguous))
  if (options.digit) groups.push(filterChars(CHARSETS.digit, options.excludeAmbiguous))
  if (options.symbol) groups.push(filterChars(CHARSETS.symbol, options.excludeAmbiguous))
  return groups
}

/** 拼接所有已选类型的字符，并按需要排除易混淆字符 */
export function buildCharset(options: PasswordOptions): string {
  return selectedGroups(options).join('')
}

export function validatePasswordOptions(length: number, options: PasswordOptions): string | null {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    return `密码长度需为 ${MIN_LENGTH} 到 ${MAX_LENGTH} 之间的整数`
  }
  const groups = selectedGroups(options)
  if (groups.length === 0) return '请至少选择一种字符类型'
  if (groups.some((group) => group.length === 0)) {
    return '排除易混淆字符后，部分字符类型已无可用字符，请调整选项'
  }
  return null
}

/**
 * 生成密码：每种已选类型至少 1 个字符，其余从全字符集补齐，最后洗牌打乱。
 * below 由调用方提供（安全随机源），逻辑本身不产生随机数。
 */
export function generatePassword(
  length: number,
  options: PasswordOptions,
  below: (max: number) => number
): CalcResult<string> {
  const error = validatePasswordOptions(length, options)
  if (error) return { ok: false, message: error }

  const groups = selectedGroups(options)
  const all = groups.join('')
  const chars: string[] = []
  for (const group of groups) chars.push(group[below(group.length)])
  while (chars.length < length) chars.push(all[below(all.length)])

  const random = (): number => below(0x100000000) / 0x100000000
  return { ok: true, value: shuffle(chars, random).join('') }
}

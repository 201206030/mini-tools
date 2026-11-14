import type { CalcResult } from '@/types/common'
import {
  SURNAMES,
  COMPOUND_SURNAMES,
  MALE_GIVEN,
  FEMALE_GIVEN,
  NEUTRAL_GIVEN,
  type GivenNameSet
} from './names'

export type NameGender = 'male' | 'female' | 'all'
export type NameLength = 'single' | 'double' | 'mix'

export interface GenerateNamesOptions {
  count: number
  gender: NameGender
  length: NameLength
  /** 生成复姓的概率，取值 0 到 1；不传时使用 DEFAULT_COMPOUND_RATE */
  compoundRate?: number
  /**
   * 指定姓氏池：传入后所有姓名都从该池中取姓，复姓比例与内置百家姓不再生效。
   * 可由 parseSurnames 解析用户输入得到；不传或空数组表示随机取姓。
   */
  surnames?: readonly string[]
  /** 由调用方注入的 [0, maxExclusive) 随机整数来源，通常是安全随机源 */
  pick: (maxExclusive: number) => number
}

export const MIN_NAME_COUNT = 1
export const MAX_NAME_COUNT = 20
export const DEFAULT_COMPOUND_RATE = 0.15
/** 单个姓氏允许 1 到 4 个汉字（单姓、复姓及少见多字姓） */
export const MAX_SURNAME_CHARS = 4
/** 一次最多指定的不同姓氏数量，避免误粘贴长文本 */
export const MAX_SURNAME_OPTIONS = 20

/** 汉字姓氏合法字符范围，仅使用 BMP 转义以兼容小程序基础库 */
const SURNAME_PATTERN = new RegExp(`^[\\u3400-\\u9fff]{1,${MAX_SURNAME_CHARS}}$`)
/** 允许的分隔符：空白、中英文逗号、顿号、分号、竖线、斜杠 */
const SURNAME_SEPARATOR = /[\s,，、;；|｜\/／]+/

/**
 * 解析「指定姓氏」输入。留空返回空数组（表示随机取姓）；
 * 支持填写一个或多个姓氏，例如「李」「欧阳」「李,王 欧阳、司马」。
 * 纯函数，便于单测与在视图层提前给出中文错误提示。
 */
export function parseSurnames(raw: string): CalcResult<string[]> {
  if (raw === undefined) return { ok: true, value: [] }
  if (typeof raw !== 'string') return { ok: false, message: '姓氏格式无效，请重新输入' }
  const text = raw.trim()
  if (!text) return { ok: true, value: [] }

  const parts = text.split(SURNAME_SEPARATOR).filter((part) => part.length > 0)
  const result: string[] = []
  for (const part of parts) {
    if (!SURNAME_PATTERN.test(part)) {
      const preview = Array.from(part).slice(0, 12).join('')
      return {
        ok: false,
        message: `「${preview}」不是有效姓氏，请填写 1 到 ${MAX_SURNAME_CHARS} 个汉字，多个姓氏用空格或逗号分隔`
      }
    }
    if (!result.includes(part)) result.push(part)
  }
  if (result.length > MAX_SURNAME_OPTIONS) {
    return { ok: false, message: `一次最多指定 ${MAX_SURNAME_OPTIONS} 个姓氏` }
  }
  return { ok: true, value: result }
}

/** 单个姓名去重时的最大重试次数，属于「尽量去重」的有限重试 */
const MAX_RETRY = 30

const GENDERS: NameGender[] = ['male', 'female', 'all']
const LENGTHS: NameLength[] = ['single', 'double', 'mix']
const POOL_KINDS = ['male', 'female', 'neutral'] as const
type PoolKind = (typeof POOL_KINDS)[number]

/** 把随机源返回值约束成合法下标，避免异常随机源产生 undefined 姓名 */
function pickIndex(max: number, pick: (max: number) => number): number {
  if (max <= 0) return 0
  const raw = pick(max)
  if (!Number.isFinite(raw)) return 0
  return Math.min(max - 1, Math.max(0, Math.floor(raw)))
}

function pickItem<T>(list: readonly T[], pick: (max: number) => number): T {
  return list[pickIndex(list.length, pick)]
}

function choosePoolKind(gender: NameGender, pick: (max: number) => number): PoolKind {
  if (gender === 'male') return 'male'
  if (gender === 'female') return 'female'
  return POOL_KINDS[pickIndex(POOL_KINDS.length, pick)]
}

function poolOf(kind: PoolKind): GivenNameSet {
  if (kind === 'male') return MALE_GIVEN
  if (kind === 'female') return FEMALE_GIVEN
  return NEUTRAL_GIVEN
}

function chooseSurname(options: GenerateNamesOptions, pick: (max: number) => number): string {
  // 指定姓氏优先：不再消耗复姓随机数，使「包含复姓」开关在该模式下自然失效
  if (options.surnames && options.surnames.length > 0) return pickItem(options.surnames, pick)
  const rate = options.compoundRate === undefined ? DEFAULT_COMPOUND_RATE : options.compoundRate
  const useCompound = rate > 0 && pickIndex(10000, pick) < Math.round(rate * 10000)
  return pickItem(useCompound ? COMPOUND_SURNAMES : SURNAMES, pick)
}

function makeName(options: GenerateNamesOptions, pick: (max: number) => number): string {
  const surname = chooseSurname(options, pick)
  const pool = poolOf(choosePoolKind(options.gender, pick))
  const useDouble =
    options.length === 'double' || (options.length === 'mix' && pickIndex(2, pick) === 1)
  const given = pickItem(useDouble ? pool.double : pool.single, pick)
  return surname + given
}

function validate(options: GenerateNamesOptions): string | null {
  if (!options || typeof options !== 'object') return '生成参数无效'
  const { count, gender, length, compoundRate, surnames, pick } = options
  if (typeof pick !== 'function') return '缺少随机数来源，请重新进入页面再试'
  if (!Number.isInteger(count) || count < MIN_NAME_COUNT || count > MAX_NAME_COUNT) {
    return `生成数量需为 ${MIN_NAME_COUNT} 到 ${MAX_NAME_COUNT} 之间的整数`
  }
  if (!GENDERS.includes(gender)) return '性别选项无效'
  if (!LENGTHS.includes(length)) return '名字字数选项无效'
  if (
    compoundRate !== undefined &&
    (!Number.isFinite(compoundRate) || compoundRate < 0 || compoundRate > 1)
  ) {
    return '复姓比例需为 0 到 1 之间的数值'
  }
  if (surnames !== undefined) {
    if (!Array.isArray(surnames)) return '指定姓氏格式无效'
    if (surnames.length > MAX_SURNAME_OPTIONS) {
      return `一次最多指定 ${MAX_SURNAME_OPTIONS} 个姓氏`
    }
    for (const item of surnames) {
      if (typeof item !== 'string' || !SURNAME_PATTERN.test(item)) {
        return `姓氏仅支持 1 到 ${MAX_SURNAME_CHARS} 个汉字`
      }
    }
  }
  return null
}

/**
 * 生成随机中文姓名。纯函数：不调用 uni / wx / DOM，随机数完全由 options.pick 注入。
 * existing 为去重基准（例如上一次的生成结果），配合本次结果做有限重试去重。
 */
export function generateNames(
  options: GenerateNamesOptions,
  existing: string[] = []
): CalcResult<string[]> {
  const error = validate(options)
  if (error) return { ok: false, message: error }

  // 指定姓氏去重，避免重复填写导致某个姓被过度抽中
  const effective: GenerateNamesOptions =
    options.surnames && options.surnames.length > 0
      ? { ...options, surnames: Array.from(new Set(options.surnames)) }
      : options
  const { count, pick } = effective
  const base = Array.isArray(existing) ? existing : []
  const used = new Set<string>()
  for (const name of base) {
    if (typeof name === 'string') used.add(name)
  }

  const result: string[] = []
  for (let i = 0; i < count; i += 1) {
    let name = makeName(effective, pick)
    let attempts = 0
    while (used.has(name) && attempts < MAX_RETRY) {
      name = makeName(effective, pick)
      attempts += 1
    }
    // 素材空间足够大，正常随机源下重试后均可取到不重复结果；极端退化的随机源下做「尽量去重」，
    // 仍保证返回数量与 count 一致。
    used.add(name)
    result.push(name)
  }
  return { ok: true, value: result }
}

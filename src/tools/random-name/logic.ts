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
  /** 由调用方注入的 [0, maxExclusive) 随机整数来源，通常是安全随机源 */
  pick: (maxExclusive: number) => number
}

export const MIN_NAME_COUNT = 1
export const MAX_NAME_COUNT = 20
export const DEFAULT_COMPOUND_RATE = 0.15

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

function makeName(options: GenerateNamesOptions, pick: (max: number) => number): string {
  const rate = options.compoundRate === undefined ? DEFAULT_COMPOUND_RATE : options.compoundRate
  const useCompound = rate > 0 && pickIndex(10000, pick) < Math.round(rate * 10000)
  const surname = pickItem(useCompound ? COMPOUND_SURNAMES : SURNAMES, pick)

  const pool = poolOf(choosePoolKind(options.gender, pick))
  const useDouble =
    options.length === 'double' || (options.length === 'mix' && pickIndex(2, pick) === 1)
  const given = pickItem(useDouble ? pool.double : pool.single, pick)
  return surname + given
}

function validate(options: GenerateNamesOptions): string | null {
  if (!options || typeof options !== 'object') return '生成参数无效'
  const { count, gender, length, compoundRate, pick } = options
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

  const { count, pick } = options
  const base = Array.isArray(existing) ? existing : []
  const used = new Set<string>()
  for (const name of base) {
    if (typeof name === 'string') used.add(name)
  }

  const result: string[] = []
  for (let i = 0; i < count; i += 1) {
    let name = makeName(options, pick)
    let attempts = 0
    while (used.has(name) && attempts < MAX_RETRY) {
      name = makeName(options, pick)
      attempts += 1
    }
    // 素材空间足够大，正常随机源下重试后均可取到不重复结果；极端退化的随机源下做「尽量去重」，
    // 仍保证返回数量与 count 一致。
    used.add(name)
    result.push(name)
  }
  return { ok: true, value: result }
}

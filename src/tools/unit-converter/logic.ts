import type { CalcResult, SelectOption } from '@/types/common'
import { formatNumber } from '@/utils/number'

export interface UnitDef {
  id: string
  name: string
  /** 相对基准单位的换算系数（温度单位仅占位，不使用） */
  factor: number
}

export interface UnitCategory {
  id: string
  name: string
  units: UnitDef[]
}

/**
 * 六类常用单位。非温度类均以 base 字段为中间量：
 * 长度=米、重量=克、面积=平方米、容量=毫升、数据=B。
 */
export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: '长度',
    units: [
      { id: 'mm', name: '毫米', factor: 0.001 },
      { id: 'cm', name: '厘米', factor: 0.01 },
      { id: 'm', name: '米', factor: 1 },
      { id: 'km', name: '千米', factor: 1000 },
      { id: 'in', name: '英寸', factor: 0.0254 },
      { id: 'ft', name: '英尺', factor: 0.3048 }
    ]
  },
  {
    id: 'weight',
    name: '重量',
    units: [
      { id: 'mg', name: '毫克', factor: 0.001 },
      { id: 'g', name: '克', factor: 1 },
      { id: 'kg', name: '千克', factor: 1000 },
      { id: 't', name: '吨', factor: 1000000 },
      { id: 'jin', name: '斤', factor: 500 },
      { id: 'liang', name: '两', factor: 50 }
    ]
  },
  {
    id: 'area',
    name: '面积',
    units: [
      { id: 'm2', name: '平方米', factor: 1 },
      { id: 'km2', name: '平方千米', factor: 1000000 },
      { id: 'ha', name: '公顷', factor: 10000 },
      { id: 'mu', name: '亩', factor: 2000 / 3 },
      { id: 'ft2', name: '平方英尺', factor: 0.09290304 }
    ]
  },
  {
    id: 'volume',
    name: '容量',
    units: [
      { id: 'ml', name: '毫升', factor: 1 },
      { id: 'l', name: '升', factor: 1000 },
      { id: 'm3', name: '立方米', factor: 1000000 }
    ]
  },
  {
    id: 'temperature',
    name: '温度',
    units: [
      { id: 'c', name: '摄氏度', factor: 1 },
      { id: 'f', name: '华氏度', factor: 1 }
    ]
  },
  {
    id: 'data',
    name: '数据',
    units: [
      { id: 'b', name: 'B', factor: 1 },
      { id: 'kb', name: 'KB', factor: 1024 },
      { id: 'mb', name: 'MB', factor: 1024 * 1024 },
      { id: 'gb', name: 'GB', factor: 1024 * 1024 * 1024 },
      { id: 'tb', name: 'TB', factor: 1024 * 1024 * 1024 * 1024 }
    ]
  }
]

function findCategory(categoryId: string): UnitCategory | undefined {
  return UNIT_CATEGORIES.find((item) => item.id === categoryId)
}

/** 按分类返回单位选择项，分类不存在时返回空数组 */
export function getUnitOptions(categoryId: string): SelectOption[] {
  const category = findCategory(categoryId)
  if (!category) return []
  return category.units.map((unit) => ({ label: unit.name, value: unit.id }))
}

/** 单位换算：非温度类以基准单位为中间量，温度类用独立公式 */
export function convert(
  categoryId: string,
  fromId: string,
  toId: string,
  value: number
): CalcResult<number> {
  const category = findCategory(categoryId)
  if (!category) return { ok: false, message: '换算分类不存在' }
  const from = category.units.find((unit) => unit.id === fromId)
  const to = category.units.find((unit) => unit.id === toId)
  if (!from || !to) return { ok: false, message: '请选择有效的单位' }

  // 空值、NaN、Infinity 与非数值统一拦截
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: false, message: '请输入有效的数值' }
  }
  // 非温度类的物理量不允许为负数
  if (category.id !== 'temperature' && value < 0) {
    return { ok: false, message: '该分类的数值不能为负数' }
  }
  // 同单位换算直接返回原值
  if (from.id === to.id) return { ok: true, value }

  let result: number
  if (category.id === 'temperature') {
    result = from.id === 'c' ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9
  } else {
    const base = value * from.factor
    if (!Number.isFinite(base)) return { ok: false, message: '计算结果超出可支持的范围' }
    result = base / to.factor
  }
  if (!Number.isFinite(result)) return { ok: false, message: '计算结果超出可支持的范围' }
  return { ok: true, value: result }
}

/** 返回当前换算关系与常见单位常识（简体中文说明） */
export function describeConversion(categoryId: string, fromId: string, toId: string): string {
  const category = findCategory(categoryId)
  const from = category ? category.units.find((unit) => unit.id === fromId) : undefined
  const to = category ? category.units.find((unit) => unit.id === toId) : undefined

  const lines: string[] = []
  if (category && from && to) {
    if (category.id === 'temperature') {
      lines.push(`本次在${from.name}与${to.name}之间换算。`)
    } else if (from.id === to.id) {
      lines.push(`当前为同一单位（${from.name}），数值保持不变。`)
    } else {
      lines.push(`1 ${from.name} = ${formatNumber(from.factor / to.factor)} ${to.name}。`)
    }
  } else {
    lines.push('请选择换算分类与单位。')
  }
  lines.push(
    '常见换算关系：1 斤 = 500 克；1 亩 ≈ 666.6667 平方米；1 英寸 = 2.54 厘米；1 公顷 = 10000 平方米；1 KB = 1024 B。'
  )
  lines.push('数据单位按二进制 1024 换算，部分厂商标称用 1000。')
  lines.push('温度换算：华氏度 = 摄氏度 * 9 / 5 + 32，摄氏度 = (华氏度 - 32) * 5 / 9。')
  return lines.join('\n')
}

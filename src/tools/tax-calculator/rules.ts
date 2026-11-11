/**
 * 个人所得税政策参数（综合所得 · 年度汇算口径）
 *
 * 来源：国家税务总局公开口径——综合所得适用的年度七级超额累进税率表、
 *       基本减除费用标准与专项附加扣除标准。
 * 核实日期：2026-11-07
 *
 * 说明：本文件仅集中存放政策参数，供本机估算使用，不含任何运行时依赖。
 *       政策可能调整，请以税务机关最新规定为准。
 */

/** 规则版本标识，供界面展示 */
export const RULE_VERSION = '2026 年度综合所得口径 · 2026-11-07 核实'

/** 来源与免责说明，供界面展示 */
export const SOURCE_NOTE =
  '参数依据国家税务总局公开的综合所得税率表、基本减除费用与专项附加扣除标准整理，' +
  '核实日期 2026-11-07。政策可能调整，请以税务机关最新规定为准。'

/** 综合所得基本减除费用：60000 元/年（5000 元/月） */
export const BASIC_DEDUCTION_ANNUAL = 60000
export const BASIC_DEDUCTION_MONTHLY = 5000

export interface TaxBracket {
  /** 全年应纳税所得额上限（含本数），Infinity 表示最高档无上限 */
  upperLimit: number
  /** 税率，百分数，例如 3 表示 3% */
  rate: number
  /** 速算扣除数，单位：元 */
  quickDeduction: number
}

/** 年度七级超额累进税率表：全年应纳税所得额上限 / 税率 / 速算扣除数 */
export const TAX_BRACKETS: TaxBracket[] = [
  { upperLimit: 36000, rate: 3, quickDeduction: 0 },
  { upperLimit: 144000, rate: 10, quickDeduction: 2520 },
  { upperLimit: 300000, rate: 20, quickDeduction: 16920 },
  { upperLimit: 420000, rate: 25, quickDeduction: 31920 },
  { upperLimit: 660000, rate: 30, quickDeduction: 52920 },
  { upperLimit: 960000, rate: 35, quickDeduction: 85920 },
  { upperLimit: Infinity, rate: 45, quickDeduction: 181920 }
]

export interface SpecialDeductionItem {
  /** 扣除项目 */
  name: string
  /** 参考标准 */
  standard: string
}

/**
 * 专项附加扣除参考标准。
 * 仅作为说明展示，不会自动代入上方计算；实际可扣除金额请据实填写。
 */
export const SPECIAL_DEDUCTION_GUIDE: SpecialDeductionItem[] = [
  { name: '3 岁以下婴幼儿照护', standard: '每孩每月 2000 元' },
  { name: '子女教育', standard: '每孩每月 2000 元' },
  { name: '赡养老人', standard: '独生子女每月 3000 元；非独生子女每人每月不超过 1500 元' },
  { name: '继续教育', standard: '学历（学位）继续教育每月 400 元，或职业资格继续教育当年 3600 元' },
  { name: '住房贷款利息', standard: '每月 1000 元' },
  { name: '住房租金', standard: '按城市类别每月 1500 元、1100 元或 800 元' },
  { name: '大病医疗', standard: '自付超过 15000 元的部分据实扣除，年度上限 80000 元' },
  { name: '个人养老金等其他扣除', standard: '按政策执行' }
]

/** 集中汇总的政策参数对象 */
export const TAX_RULES = {
  version: RULE_VERSION,
  sourceNote: SOURCE_NOTE,
  basicDeductionAnnual: BASIC_DEDUCTION_ANNUAL,
  basicDeductionMonthly: BASIC_DEDUCTION_MONTHLY,
  brackets: TAX_BRACKETS,
  specialDeductionGuide: SPECIAL_DEDUCTION_GUIDE
}

import type { CalcResult } from '@/types/common'
import { formatMoney } from '@/utils/number'
import { TAX_BRACKETS, TAX_RULES, type TaxBracket } from './rules'

export interface TaxInput {
  /** 税前月工资，单位：元 */
  monthlySalary: number
  /** 社保个人缴纳金额（月），单位：元 */
  socialMonthly: number
  /** 公积金个人缴纳金额（月），单位：元 */
  housingFundMonthly: number
  /** 专项附加扣除（每月合计），单位：元 */
  specialAdditionalMonthly: number
  /** 全年已预缴税额，单位：元 */
  prepaidTax: number
}

export interface BracketInfo {
  /** 税率，百分数，例如 3 表示 3% */
  rate: number
  /** 速算扣除数，单位：元 */
  quickDeduction: number
  /** 税率表级数，从 1 开始 */
  level: number
}

export interface TaxResult {
  annualIncome: number
  annualSpecialDeduction: number
  annualSpecialAdditional: number
  basicDeduction: number
  taxableIncome: number
  tax: number
  annualAfterTax: number
  monthlyAfterTax: number
  rate: number
  quickDeduction: number
  level: number
  prepaidTax: number
  /** 正数表示应补缴，负数表示应退税 */
  refundOrOwe: number
}

/** 按全年应纳税所得额查找适用税率、速算扣除数与级数 */
export function findBracket(taxableIncome: number): BracketInfo {
  const income = Math.max(0, taxableIncome)
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const bracket: TaxBracket = TAX_BRACKETS[i]
    if (income <= bracket.upperLimit) {
      return { rate: bracket.rate, quickDeduction: bracket.quickDeduction, level: i + 1 }
    }
  }
  const last = TAX_BRACKETS[TAX_BRACKETS.length - 1]
  return { rate: last.rate, quickDeduction: last.quickDeduction, level: TAX_BRACKETS.length }
}

/**
 * 按全年综合所得口径做简化估算（不是逐月累计预扣预缴明细）：
 * annualIncome = 月工资*12；annualSpecialDeduction = (社保+公积金)*12；
 * annualSpecialAdditional = 专项附加扣除*12；
 * taxableIncome = max(0, annualIncome - 60000 - annualSpecialDeduction - annualSpecialAdditional)；
 * tax = max(0, taxableIncome*税率 - 速算扣除数)。
 * 专项附加扣除只是税前扣除项、不是现金支出，因此税后到手年收入只扣实际现金支出与个税。
 */
export function calculateAnnualTax(input: TaxInput): CalcResult<TaxResult> {
  const { monthlySalary, socialMonthly, housingFundMonthly, specialAdditionalMonthly, prepaidTax } = input

  const values = [monthlySalary, socialMonthly, housingFundMonthly, specialAdditionalMonthly, prepaidTax]
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, message: '各项金额请填写大于等于 0 的有效数字' }
    }
  }
  if (monthlySalary > 1e8) return { ok: false, message: '税前月工资不能超过 100000000 元' }
  if (socialMonthly > monthlySalary) return { ok: false, message: '社保个人缴纳金额（月）不能超过税前月工资' }
  if (housingFundMonthly > monthlySalary) return { ok: false, message: '公积金个人缴纳金额（月）不能超过税前月工资' }
  if (specialAdditionalMonthly > monthlySalary) return { ok: false, message: '专项附加扣除（每月合计）不能超过税前月工资' }
  if (prepaidTax > 1e9) return { ok: false, message: '全年已预缴税额不能超过 1000000000 元' }

  const annualIncome = monthlySalary * 12
  const annualSpecialDeduction = (socialMonthly + housingFundMonthly) * 12
  const annualSpecialAdditional = specialAdditionalMonthly * 12
  const basicDeduction = TAX_RULES.basicDeductionAnnual
  const taxableIncome = Math.max(
    0,
    annualIncome - basicDeduction - annualSpecialDeduction - annualSpecialAdditional
  )
  const bracket = findBracket(taxableIncome)
  const tax = Math.max(0, taxableIncome * (bracket.rate / 100) - bracket.quickDeduction)
  const annualAfterTax = annualIncome - annualSpecialDeduction - tax
  const monthlyAfterTax = annualAfterTax / 12
  const refundOrOwe = tax - prepaidTax

  return {
    ok: true,
    value: {
      annualIncome,
      annualSpecialDeduction,
      annualSpecialAdditional,
      basicDeduction,
      taxableIncome,
      tax,
      annualAfterTax,
      monthlyAfterTax,
      rate: bracket.rate,
      quickDeduction: bracket.quickDeduction,
      level: bracket.level,
      prepaidTax,
      refundOrOwe
    }
  }
}

/** 生成可复制的结果摘要文本 */
export function buildTaxSummary(input: TaxInput, result: TaxResult): string {
  const oweOrRefund = result.refundOrOwe >= 0 ? '预计应补税额' : '预计应退税额'
  return [
    '个人所得税估算（按全年综合所得口径简化测算，不是逐月累计预扣预缴明细）',
    `税前月工资：${formatMoney(input.monthlySalary)} 元`,
    `社保个人缴纳金额（月）：${formatMoney(input.socialMonthly)} 元`,
    `公积金个人缴纳金额（月）：${formatMoney(input.housingFundMonthly)} 元`,
    `专项附加扣除（每月合计）：${formatMoney(input.specialAdditionalMonthly)} 元`,
    `全年已预缴税额：${formatMoney(input.prepaidTax)} 元`,
    `预计全年税前收入：${formatMoney(result.annualIncome)} 元`,
    `基本减除费用：${formatMoney(result.basicDeduction)} 元/年`,
    `全年专项扣除（社保、公积金）：${formatMoney(result.annualSpecialDeduction)} 元`,
    `全年专项附加扣除：${formatMoney(result.annualSpecialAdditional)} 元`,
    `应纳税所得额：${formatMoney(result.taxableIncome)} 元`,
    `适用税率：${result.rate}%（第 ${result.level} 级），速算扣除数：${formatMoney(result.quickDeduction)} 元`,
    `预计全年应纳个税：${formatMoney(result.tax)} 元`,
    `税后到手年收入：${formatMoney(result.annualAfterTax)} 元`,
    `税后到手月均：${formatMoney(result.monthlyAfterTax)} 元`,
    `${oweOrRefund}：${formatMoney(Math.abs(result.refundOrOwe))} 元`,
    '本结果为简化估算，不等同于税务机关最终核定结果；政策可能调整，请核对最新规定。'
  ].join('\n')
}

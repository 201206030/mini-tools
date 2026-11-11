import { describe, expect, it } from 'vitest'
import {
  BASIC_DEDUCTION_ANNUAL,
  RULE_VERSION,
  SOURCE_NOTE,
  SPECIAL_DEDUCTION_GUIDE,
  TAX_BRACKETS,
  TAX_RULES
} from '@/tools/tax-calculator/rules'
import {
  buildTaxSummary,
  calculateAnnualTax,
  findBracket,
  type TaxInput,
  type TaxResult
} from '@/tools/tax-calculator/logic'

const base: TaxInput = {
  monthlySalary: 10000,
  socialMonthly: 1000,
  housingFundMonthly: 1000,
  specialAdditionalMonthly: 1000,
  prepaidTax: 0
}

function ok(input: TaxInput): TaxResult {
  const result = calculateAnnualTax(input)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('个税规则配置', () => {
  it('规则集中配置、七级税率与 60000 元基本减除费用', () => {
    expect(TAX_BRACKETS).toHaveLength(7)
    expect(TAX_BRACKETS.map((item) => item.rate)).toEqual([3, 10, 20, 25, 30, 35, 45])
    expect(TAX_BRACKETS.map((item) => item.quickDeduction)).toEqual([
      0, 2520, 16920, 31920, 52920, 85920, 181920
    ])
    expect(BASIC_DEDUCTION_ANNUAL).toBe(60000)
    expect(TAX_RULES.basicDeductionAnnual).toBe(60000)
    expect(RULE_VERSION).toContain('2026')
    expect(SOURCE_NOTE).toContain('以税务机关最新规定为准')
    expect(SPECIAL_DEDUCTION_GUIDE.length).toBeGreaterThan(0)
    expect(TAX_BRACKETS[6].upperLimit).toBe(Infinity)
  })

  it('税率分档边界（含本数）正确', () => {
    expect(findBracket(-100)).toEqual({ rate: 3, quickDeduction: 0, level: 1 })
    expect(findBracket(0)).toEqual({ rate: 3, quickDeduction: 0, level: 1 })
    expect(findBracket(36000)).toEqual({ rate: 3, quickDeduction: 0, level: 1 })
    expect(findBracket(36000.01)).toEqual({ rate: 10, quickDeduction: 2520, level: 2 })
    expect(findBracket(144000)).toEqual({ rate: 10, quickDeduction: 2520, level: 2 })
    expect(findBracket(144001)).toEqual({ rate: 20, quickDeduction: 16920, level: 3 })
    expect(findBracket(300000)).toEqual({ rate: 20, quickDeduction: 16920, level: 3 })
    expect(findBracket(420000)).toEqual({ rate: 25, quickDeduction: 31920, level: 4 })
    expect(findBracket(660000)).toEqual({ rate: 30, quickDeduction: 52920, level: 5 })
    expect(findBracket(960000)).toEqual({ rate: 35, quickDeduction: 85920, level: 6 })
    expect(findBracket(960001)).toEqual({ rate: 45, quickDeduction: 181920, level: 7 })
  })
})

describe('年度综合所得简化估算', () => {
  it('按年度口径计算应纳税所得额、税额与税后收入', () => {
    const result = ok(base)
    expect(result.annualIncome).toBe(120000)
    expect(result.annualSpecialDeduction).toBe(24000)
    expect(result.annualSpecialAdditional).toBe(12000)
    expect(result.basicDeduction).toBe(60000)
    expect(result.taxableIncome).toBe(24000)
    expect(result.rate).toBe(3)
    expect(result.tax).toBe(720)
    // 专项附加扣除是税前扣除项，不是现金支出，不从税后收入中重复扣减
    expect(result.annualAfterTax).toBe(120000 - 24000 - 720)
    expect(result.monthlyAfterTax).toBeCloseTo((120000 - 24000 - 720) / 12, 8)
    expect(result.refundOrOwe).toBe(720)
  })

  it('月工资 5000 元、无扣除时应纳税额为 0', () => {
    const result = ok({ ...base, monthlySalary: 5000, socialMonthly: 0, housingFundMonthly: 0, specialAdditionalMonthly: 0 })
    expect(result.annualIncome).toBe(60000)
    expect(result.taxableIncome).toBe(0)
    expect(result.tax).toBe(0)
    expect(result.rate).toBe(3)
  })

  it('税率跨档结果与税率表一致', () => {
    // 月薪 20000、无其他扣除：240000 - 60000 = 180000 → 20% 档
    const result = ok({ ...base, monthlySalary: 20000, socialMonthly: 0, housingFundMonthly: 0, specialAdditionalMonthly: 0 })
    expect(result.taxableIncome).toBe(180000)
    expect(result.rate).toBe(20)
    expect(result.level).toBe(3)
    expect(result.tax).toBeCloseTo(180000 * 0.2 - 16920, 8)
  })

  it('已预缴税额大于应纳税额时返回应退税（负数）', () => {
    const result = ok({ ...base, prepaidTax: 2000 })
    expect(result.refundOrOwe).toBe(-1280)
    expect(buildTaxSummary({ ...base, prepaidTax: 2000 }, result)).toContain('预计应退税额')
    expect(buildTaxSummary(base, ok(base))).toContain('预计应补税额')
  })

  it('摘要明确年度口径、免责声明与规则来源', () => {
    const text = buildTaxSummary(base, ok(base))
    expect(text).toContain('按全年综合所得口径')
    expect(text).toContain('不是逐月累计预扣预缴明细')
    expect(text).toContain('不等同于税务机关最终核定结果')
    expect(text).toContain('预计全年应纳个税')
    expect(text).toContain('速算扣除数')
  })
})

describe('个税输入校验', () => {
  it('拦截负数、NaN、Infinity 与超出范围金额', () => {
    expect(calculateAnnualTax({ ...base, monthlySalary: -1 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, monthlySalary: NaN }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, monthlySalary: Infinity }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, socialMonthly: -1 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, housingFundMonthly: NaN }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, specialAdditionalMonthly: -5 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, prepaidTax: -1 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, monthlySalary: 1e8 + 1 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, prepaidTax: 1e9 + 1 }).ok).toBe(false)
  })

  it('各项月度扣除不能超过税前月工资', () => {
    expect(calculateAnnualTax({ ...base, monthlySalary: 1000, socialMonthly: 1001 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, monthlySalary: 1000, housingFundMonthly: 1001 }).ok).toBe(false)
    expect(calculateAnnualTax({ ...base, monthlySalary: 1000, specialAdditionalMonthly: 1001 }).ok).toBe(false)
  })

  it('全 0 输入不报错且结果为 0', () => {
    const result = ok({
      monthlySalary: 0,
      socialMonthly: 0,
      housingFundMonthly: 0,
      specialAdditionalMonthly: 0,
      prepaidTax: 0
    })
    expect(result.tax).toBe(0)
    expect(result.annualAfterTax).toBe(0)
  })
})

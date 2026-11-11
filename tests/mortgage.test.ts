import { describe, expect, it } from 'vitest'
import {
  calculateMortgage,
  equalInstallment,
  equalPrincipal,
  type MortgageInput,
  type MortgageResult
} from '@/tools/mortgage-calculator/logic'

const base: MortgageInput = {
  loanType: 'commercial',
  commercialAmountWan: 100,
  fundAmountWan: 0,
  commercialRate: 4.9,
  fundRate: 3.1,
  years: 30,
  method: 'equal-installment'
}

function ok(input: MortgageInput): MortgageResult {
  const result = calculateMortgage(input)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe('等额本息 / 等额本金金融公式', () => {
  it('零利率时月供为等分本金、利息为 0、末期余额归零', () => {
    const r = equalInstallment(1200000, 0, 120)
    expect(r.monthly).toBeCloseTo(10000, 8)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPayment).toBe(1200000)
    expect(r.schedule).toHaveLength(120)
    expect(r.schedule[119].balance).toBe(0)
    expect(r.schedule.reduce((sum, item) => sum + item.principal, 0)).toBeCloseTo(1200000, 6)
  })

  it('等额本息符合 P*r*(1+r)^n/((1+r)^n-1)，本金之和等于贷款额', () => {
    const principal = 1000000
    const r = 0.049 / 12
    const n = 360
    const result = equalInstallment(principal, r, n)
    const factor = Math.pow(1 + r, n)
    expect(result.monthly).toBeCloseTo((principal * r * factor) / (factor - 1), 8)
    expect(result.totalPayment).toBeCloseTo(result.monthly * n, 6)
    expect(result.totalInterest).toBeCloseTo(result.totalPayment - principal, 6)
    expect(result.schedule.reduce((sum, item) => sum + item.principal, 0)).toBeCloseTo(principal, 4)
    expect(result.schedule[n - 1].balance).toBe(0)
    expect(result.schedule[0].interest).toBeCloseTo(principal * r, 8)
  })

  it('等额本金首月、递减额、总利息符合公式', () => {
    const principal = 1000000
    const r = 0.004
    const n = 120
    const result = equalPrincipal(principal, r, n)
    expect(result.firstMonth).toBeCloseTo(principal / n + principal * r, 8)
    expect(result.decrement).toBeCloseTo((principal / n) * r, 8)
    expect(result.totalInterest).toBeCloseTo((principal * r * (n + 1)) / 2, 8)
    expect(result.totalPayment).toBeCloseTo(principal + result.totalInterest, 8)
    expect(result.schedule[0].payment).toBeCloseTo(result.firstMonth, 8)
    expect(result.schedule[n - 1].balance).toBe(0)
    expect(result.schedule.reduce((sum, item) => sum + item.principal, 0)).toBeCloseTo(principal, 4)
  })

  it('同等条件下等额本金总利息低于等额本息', () => {
    const p = 1000000
    const r = 0.049 / 12
    const n = 360
    expect(equalPrincipal(p, r, n).totalInterest).toBeLessThan(equalInstallment(p, r, n).totalInterest)
  })
})

describe('房贷计算器 · 三种贷款类型与两种方式', () => {
  it('商业贷等额本息结果完整且明细按期数', () => {
    const result = ok(base)
    expect(result.loanTotal).toBe(1000000)
    expect(result.months).toBe(360)
    expect(result.method).toBe('equal-installment')
    expect(result.loanType).toBe('commercial')
    expect(result.decrement).toBe(0)
    expect(result.monthly).toBe(result.firstMonth)
    expect(result.schedule).toHaveLength(360)
    expect(result.schedule[359].balance).toBe(0)
    expect(result.totalPayment).toBeCloseTo(result.loanTotal + result.totalInterest, 4)
    expect(result.comparison.totalInterest).toBeLessThan(result.totalInterest)
  })

  it('等额本金首月最高且比较对象为等额本息', () => {
    const result = ok({ ...base, method: 'equal-principal' })
    expect(result.decrement).toBeGreaterThan(0)
    expect(result.firstMonth).toBeGreaterThan(result.monthly / 2)
    expect(result.comparison.totalInterest).toBeGreaterThan(result.totalInterest)
  })

  it('公积金贷只读取公积金字段，忽略商业贷的无效输入', () => {
    const result = ok({
      ...base,
      loanType: 'fund',
      fundAmountWan: 60,
      fundRate: 3.1,
      commercialAmountWan: NaN,
      commercialRate: NaN
    })
    expect(result.loanTotal).toBe(600000)
    expect(result.schedule[359].balance).toBe(0)
  })

  it('组合贷分两部分计算后按月合并，末期余额归零', () => {
    const result = ok({
      ...base,
      loanType: 'combo',
      commercialAmountWan: 80,
      fundAmountWan: 40,
      commercialRate: 4.9,
      fundRate: 3.1,
      years: 20
    })
    const singleCommercial = equalInstallment(800000, 0.049 / 12, 240)
    const singleFund = equalInstallment(400000, 0.031 / 12, 240)
    expect(result.loanTotal).toBe(1200000)
    expect(result.months).toBe(240)
    expect(result.monthly).toBeCloseTo(singleCommercial.monthly + singleFund.monthly, 6)
    expect(result.totalInterest).toBeCloseTo(
      singleCommercial.totalInterest + singleFund.totalInterest,
      4
    )
    expect(result.schedule[239].balance).toBe(0)
    expect(result.schedule[0].payment).toBeCloseTo(
      singleCommercial.schedule[0].payment + singleFund.schedule[0].payment,
      6
    )
  })

  it('零利率组合贷也能正常计算', () => {
    const result = ok({ ...base, commercialRate: 0 })
    expect(result.totalInterest).toBe(0)
    expect(result.monthly * result.months).toBeCloseTo(result.loanTotal, 4)
  })
})

describe('房贷计算器 · 参数校验', () => {
  it('拦截非法类型、年限、金额与利率', () => {
    expect(calculateMortgage({ ...base, loanType: 'x' as any }).ok).toBe(false)
    expect(calculateMortgage({ ...base, method: 'x' as any }).ok).toBe(false)
    expect(calculateMortgage({ ...base, years: 0 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, years: 31 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, years: 1.5 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, years: NaN }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialAmountWan: 0 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialAmountWan: -5 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialAmountWan: NaN }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialRate: -1 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialRate: 31 }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialRate: NaN }).ok).toBe(false)
    expect(calculateMortgage({ ...base, commercialAmountWan: 100001 }).ok).toBe(false)
  })

  it('1 年与 30 年边界可通过', () => {
    expect(ok({ ...base, years: 1 }).schedule).toHaveLength(12)
    expect(ok({ ...base, years: 30 }).schedule).toHaveLength(360)
  })
})

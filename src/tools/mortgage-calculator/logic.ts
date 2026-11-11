import type { CalcResult } from '@/types/common'

export type LoanType = 'commercial' | 'fund' | 'combo'
export type RepayMethod = 'equal-installment' | 'equal-principal'

export interface MortgageInput {
  loanType: LoanType
  /** 商业贷款金额，单位：万元 */
  commercialAmountWan: number
  /** 公积金贷款金额，单位：万元 */
  fundAmountWan: number
  /** 商业贷款年利率，百分数，例如 3.5 表示 3.5% */
  commercialRate: number
  /** 公积金贷款年利率，百分数，例如 3.5 表示 3.5% */
  fundRate: number
  /** 贷款年限，单位：年 */
  years: number
  method: RepayMethod
}

export interface ScheduleItem {
  month: number
  /** 当期月供，单位：元 */
  payment: number
  /** 当期偿还本金，单位：元 */
  principal: number
  /** 当期利息，单位：元 */
  interest: number
  /** 当期结束后剩余本金，单位：元 */
  balance: number
}

export interface InstallmentResult {
  monthly: number
  totalPayment: number
  totalInterest: number
  schedule: ScheduleItem[]
}

export interface PrincipalResult {
  firstMonth: number
  decrement: number
  totalPayment: number
  totalInterest: number
  schedule: ScheduleItem[]
}

/** 另一种还款方式下的对比数据 */
export interface MethodComparison {
  monthly: number
  firstMonth: number
  totalInterest: number
}

export interface MortgageResult {
  /** 贷款总额，单位：元 */
  loanTotal: number
  totalInterest: number
  totalPayment: number
  /** 等额本息为每月月供；等额本金为首月月供，单位：元 */
  monthly: number
  /** 首月月供，单位：元 */
  firstMonth: number
  /** 每月递减金额，单位：元；等额本息为 0 */
  decrement: number
  months: number
  schedule: ScheduleItem[]
  comparison: MethodComparison
  method: RepayMethod
  loanType: LoanType
}

const WAN_TO_YUAN = 10000
const MAX_TOTAL_WAN = 100000

function sum(values: number[]): number {
  return values.reduce((total, current) => total + current, 0)
}

/**
 * 等额本息。
 * 月供 = P*r*(1+r)^n / ((1+r)^n - 1)；r = 0 时月供 = P/n、总利息 = 0。
 * 每期利息 = 剩余本金*r，最后一期把浮点尾差并入本金，使剩余本金精确归零。
 */
export function equalInstallment(principal: number, monthlyRate: number, months: number): InstallmentResult {
  const r = monthlyRate
  const n = months
  const factor = Math.pow(1 + r, n)
  const monthly = r === 0 ? principal / n : (principal * r * factor) / (factor - 1)
  const totalPayment = r === 0 ? principal : monthly * n
  const totalInterest = r === 0 ? 0 : totalPayment - principal

  const schedule: ScheduleItem[] = []
  let balance = principal
  for (let k = 1; k <= n; k++) {
    const interest = balance * r
    const principalPart = k === n ? balance : monthly - interest
    const payment = principalPart + interest
    balance = balance - principalPart
    schedule.push({ month: k, payment, principal: principalPart, interest, balance })
  }

  return { monthly, totalPayment, totalInterest, schedule }
}

/**
 * 等额本金。
 * 第 k 月月供 = P/n + (P - (k-1)*P/n)*r；每月递减 = (P/n)*r；总利息 = P*r*(n+1)/2。
 * 最后一期把浮点尾差并入本金，使剩余本金精确归零。
 */
export function equalPrincipal(principal: number, monthlyRate: number, months: number): PrincipalResult {
  const r = monthlyRate
  const n = months
  const fixedPrincipal = principal / n
  const decrement = fixedPrincipal * r
  const firstMonth = fixedPrincipal + principal * r
  const totalInterest = (principal * r * (n + 1)) / 2
  const totalPayment = principal + totalInterest

  const schedule: ScheduleItem[] = []
  let balance = principal
  for (let k = 1; k <= n; k++) {
    const interest = balance * r
    const principalPart = k === n ? balance : fixedPrincipal
    const payment = principalPart + interest
    balance = balance - principalPart
    schedule.push({ month: k, payment, principal: principalPart, interest, balance })
  }

  return { firstMonth, decrement, totalPayment, totalInterest, schedule }
}

interface LoanPart {
  principal: number
  monthlyRate: number
}

interface MethodCalc {
  monthly: number
  firstMonth: number
  decrement: number
  totalInterest: number
  totalPayment: number
  schedule: ScheduleItem[]
}

/** 组合贷：各部分按期号逐月相加，最后一期各部分的余额均为 0，合并后仍为 0 */
function mergeSchedules(list: ScheduleItem[][], months: number): ScheduleItem[] {
  const merged: ScheduleItem[] = []
  for (let k = 0; k < months; k++) {
    let payment = 0
    let principalPart = 0
    let interest = 0
    let balance = 0
    for (const items of list) {
      const item = items[k]
      payment += item.payment
      principalPart += item.principal
      interest += item.interest
      balance += item.balance
    }
    merged.push({ month: k + 1, payment, principal: principalPart, interest, balance })
  }
  return merged
}

function computeMethod(parts: LoanPart[], months: number, method: RepayMethod): MethodCalc {
  if (method === 'equal-installment') {
    const results = parts.map((part) => equalInstallment(part.principal, part.monthlyRate, months))
    const monthly = sum(results.map((item) => item.monthly))
    return {
      monthly,
      firstMonth: monthly,
      decrement: 0,
      totalInterest: sum(results.map((item) => item.totalInterest)),
      totalPayment: sum(results.map((item) => item.totalPayment)),
      schedule: mergeSchedules(results.map((item) => item.schedule), months)
    }
  }
  const results = parts.map((part) => equalPrincipal(part.principal, part.monthlyRate, months))
  const firstMonth = sum(results.map((item) => item.firstMonth))
  return {
    monthly: firstMonth,
    firstMonth,
    decrement: sum(results.map((item) => item.decrement)),
    totalInterest: sum(results.map((item) => item.totalInterest)),
    totalPayment: sum(results.map((item) => item.totalPayment)),
    schedule: mergeSchedules(results.map((item) => item.schedule), months)
  }
}

function checkAmount(value: number, label: string): string | null {
  if (!Number.isFinite(value)) return `请填写${label}`
  if (value <= 0) return `${label}必须大于 0`
  return null
}

function checkRate(value: number, label: string): string | null {
  if (!Number.isFinite(value)) return `请填写${label}（0 到 30 之间的数字）`
  if (value < 0 || value > 30) return `${label}应在 0 到 30 之间`
  return null
}

/** 计算房贷：金额与利率按贷款类型只取需要的字段；月利率 = 年利率/100/12；n = 年数*12 */
export function calculateMortgage(input: MortgageInput): CalcResult<MortgageResult> {
  const { loanType, commercialAmountWan, fundAmountWan, commercialRate, fundRate, years, method } = input

  if (loanType !== 'commercial' && loanType !== 'fund' && loanType !== 'combo') {
    return { ok: false, message: '请选择有效的贷款类型' }
  }
  if (method !== 'equal-installment' && method !== 'equal-principal') {
    return { ok: false, message: '请选择有效的还款方式' }
  }
  if (!Number.isInteger(years) || years < 1 || years > 30) {
    return { ok: false, message: '贷款年限请填写 1 到 30 之间的整数' }
  }

  const useCommercial = loanType === 'commercial' || loanType === 'combo'
  const useFund = loanType === 'fund' || loanType === 'combo'

  if (useCommercial) {
    const error = checkAmount(commercialAmountWan, '商业贷款金额')
    if (error) return { ok: false, message: error }
    const rateError = checkRate(commercialRate, '商业贷款年利率')
    if (rateError) return { ok: false, message: rateError }
  }
  if (useFund) {
    const error = checkAmount(fundAmountWan, '公积金贷款金额')
    if (error) return { ok: false, message: error }
    const rateError = checkRate(fundRate, '公积金贷款年利率')
    if (rateError) return { ok: false, message: rateError }
  }

  const totalWan = (useCommercial ? commercialAmountWan : 0) + (useFund ? fundAmountWan : 0)
  if (totalWan > MAX_TOTAL_WAN) {
    return { ok: false, message: `贷款金额合计不能超过 ${MAX_TOTAL_WAN} 万元` }
  }

  const parts: LoanPart[] = []
  if (useCommercial) {
    parts.push({ principal: commercialAmountWan * WAN_TO_YUAN, monthlyRate: commercialRate / 100 / 12 })
  }
  if (useFund) {
    parts.push({ principal: fundAmountWan * WAN_TO_YUAN, monthlyRate: fundRate / 100 / 12 })
  }

  const months = years * 12
  const loanTotal = sum(parts.map((part) => part.principal))
  const chosen = computeMethod(parts, months, method)
  const otherMethod: RepayMethod = method === 'equal-installment' ? 'equal-principal' : 'equal-installment'
  const other = computeMethod(parts, months, otherMethod)

  return {
    ok: true,
    value: {
      loanTotal,
      totalInterest: chosen.totalInterest,
      totalPayment: chosen.totalPayment,
      monthly: chosen.monthly,
      firstMonth: chosen.firstMonth,
      decrement: chosen.decrement,
      months,
      schedule: chosen.schedule,
      comparison: {
        monthly: other.monthly,
        firstMonth: other.firstMonth,
        totalInterest: other.totalInterest
      },
      method,
      loanType
    }
  }
}

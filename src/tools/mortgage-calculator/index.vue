<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { formatMoney, toFiniteNumber } from '@/utils/number'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import {
  calculateMortgage,
  type LoanType,
  type RepayMethod,
  type MortgageInput,
  type MortgageResult
} from './logic'

const loanTypeOptions: Array<SelectOption<string>> = [
  { label: '商业贷款', value: 'commercial' },
  { label: '公积金贷款', value: 'fund' },
  { label: '组合贷款', value: 'combo' }
]
const methodOptions: Array<SelectOption<string>> = [
  { label: '等额本息', value: 'equal-installment' },
  { label: '等额本金', value: 'equal-principal' }
]

const loanType = ref<LoanType>('commercial')
const method = ref<RepayMethod>('equal-installment')

const commercialAmountWan = ref('')
const fundAmountWan = ref('')
const commercialRate = ref('')
const fundRate = ref('')
const years = ref('')

const showAllSchedule = ref(false)

const useCommercial = computed(() => loanType.value === 'commercial' || loanType.value === 'combo')
const useFund = computed(() => loanType.value === 'fund' || loanType.value === 'combo')

const mortgageInput = computed<MortgageInput>(() => ({
  loanType: loanType.value,
  commercialAmountWan: toFiniteNumber(commercialAmountWan.value) ?? NaN,
  fundAmountWan: toFiniteNumber(fundAmountWan.value) ?? NaN,
  commercialRate: toFiniteNumber(commercialRate.value) ?? NaN,
  fundRate: toFiniteNumber(fundRate.value) ?? NaN,
  years: toFiniteNumber(years.value) ?? NaN,
  method: method.value
}))

const result = computed(() => calculateMortgage(mortgageInput.value))

const hasResult = computed(() => result.value.ok)
const errorMessage = computed(() => {
  const r = result.value
  return r.ok ? '' : r.message
})

const loanTypeLabel = computed(() => {
  if (loanType.value === 'commercial') return '商业贷款'
  if (loanType.value === 'fund') return '公积金贷款'
  return '组合贷款'
})
const methodLabel = computed(() => (method.value === 'equal-installment' ? '等额本息' : '等额本金'))
const monthlyLabel = computed(() => (method.value === 'equal-installment' ? '每月月供' : '首月月供'))
const resultTitle = computed(() => `${loanTypeLabel.value} · ${methodLabel.value}`)

/** 统一把展示内容格式化为字符串，避免模板内直接调用格式化函数；无结果时用占位符 */
const display = computed(() => {
  const r = result.value
  const v: MortgageResult | null = r.ok ? r.value : null
  const money = (value: number | undefined): string => (value === undefined ? '—' : formatMoney(value))
  const eiInterest = v
    ? v.method === 'equal-installment'
      ? v.totalInterest
      : v.comparison.totalInterest
    : undefined
  const epInterest = v
    ? v.method === 'equal-principal'
      ? v.totalInterest
      : v.comparison.totalInterest
    : undefined
  const interestDiff = eiInterest !== undefined && epInterest !== undefined ? Math.abs(eiInterest - epInterest) : undefined
  return {
    loanTotal: money(v?.loanTotal),
    totalInterest: money(v?.totalInterest),
    totalPayment: money(v?.totalPayment),
    monthly: money(v?.monthly),
    firstMonth: money(v?.firstMonth),
    decrement: money(v?.decrement),
    months: v ? String(v.months) : '—',
    eiInterest: money(eiInterest),
    epInterest: money(epInterest),
    interestDiff: money(interestDiff),
    comparisonMonthly: money(v?.comparison.monthly),
    comparisonFirstMonth: money(v?.comparison.firstMonth)
  }
})

const copyText = computed(() => {
  const r = result.value
  if (!r.ok) return ''
  const v = r.value
  const eiInterest = v.method === 'equal-installment' ? v.totalInterest : v.comparison.totalInterest
  const epInterest = v.method === 'equal-principal' ? v.totalInterest : v.comparison.totalInterest
  return [
    `贷款类型：${loanTypeLabel.value}`,
    `还款方式：${methodLabel.value}`,
    `贷款总额：${formatMoney(v.loanTotal)} 元`,
    `${monthlyLabel.value}：${formatMoney(v.monthly)} 元`,
    `每月递减：${formatMoney(v.decrement)} 元`,
    `利息总额：${formatMoney(v.totalInterest)} 元`,
    `本息合计：${formatMoney(v.totalPayment)} 元`,
    `还款月数：${v.months} 期`,
    `等额本息总利息：${formatMoney(eiInterest)} 元`,
    `等额本金总利息：${formatMoney(epInterest)} 元`,
    '计算结果仅供参考，实际金额以银行合同和实际利率为准'
  ].join('\n')
})

const totalMonths = computed(() => {
  const r = result.value
  return r.ok ? r.value.months : 0
})
const scheduleRows = computed(() => {
  const r = result.value
  if (!r.ok) return []
  const rows = showAllSchedule.value ? r.value.schedule : r.value.schedule.slice(0, 12)
  return rows.map((item) => ({
    month: String(item.month),
    payment: formatMoney(item.payment),
    principal: formatMoney(item.principal),
    interest: formatMoney(item.interest),
    balance: formatMoney(item.balance)
  }))
})
const scheduleToggleLabel = computed(() => (showAllSchedule.value ? '收起明细' : '展开全部'))

function toggleSchedule() {
  showAllSchedule.value = !showAllSchedule.value
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="贷款类型" required>
        <Segmented v-model="loanType" :options="loanTypeOptions" />
      </FormField>

      <template v-if="useCommercial">
        <FormField label="商业贷款金额" required hint="单位：万元，1 万元 = 10000 元">
          <view class="input-row">
            <input class="field-input" type="digit" :value="commercialAmountWan" placeholder="请输入商业贷款金额，例如 100" @input="commercialAmountWan = $event.detail.value" />
            <text class="input-suffix">万元</text>
          </view>
        </FormField>
        <FormField label="商业贷款年利率" required hint="请按银行实际合同利率填写，本工具不获取政策数据">
          <view class="input-row">
            <input class="field-input" type="digit" :value="commercialRate" placeholder="请输入年利率，例如 3.5" @input="commercialRate = $event.detail.value" />
            <text class="input-suffix">%</text>
          </view>
        </FormField>
      </template>

      <template v-if="useFund">
        <FormField label="公积金贷款金额" required hint="单位：万元，1 万元 = 10000 元">
          <view class="input-row">
            <input class="field-input" type="digit" :value="fundAmountWan" placeholder="请输入公积金贷款金额，例如 60" @input="fundAmountWan = $event.detail.value" />
            <text class="input-suffix">万元</text>
          </view>
        </FormField>
        <FormField label="公积金贷款年利率" required hint="请按银行实际合同利率填写，本工具不获取政策数据">
          <view class="input-row">
            <input class="field-input" type="digit" :value="fundRate" placeholder="请输入年利率，例如 3.5" @input="fundRate = $event.detail.value" />
            <text class="input-suffix">%</text>
          </view>
        </FormField>
      </template>

      <FormField label="贷款年限" required hint="1 到 30 年之间的整数">
        <view class="input-row">
          <input class="field-input" type="number" :value="years" placeholder="请输入贷款年限，例如 30" @input="years = $event.detail.value" />
          <text class="input-suffix">年</text>
        </view>
      </FormField>

      <FormField label="还款方式" required>
        <Segmented v-model="method" :options="methodOptions" />
      </FormField>
    </view>

    <view v-if="errorMessage" class="note note--danger mortgage-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>

      <ResultPanel v-if="hasResult" :title="resultTitle" :copy-text="copyText">
        <view class="result__label">{{ monthlyLabel }}</view>
        <view class="result__value result__value--brand">{{ display.monthly }} <text class="mortgage-unit">元</text></view>
        <view class="divider"></view>
        <view class="result-grid">
          <view class="result-grid__item">
            <view class="result-grid__k">首月月供</view>
            <view class="result-grid__v">{{ display.firstMonth }} 元</view>
          </view>
          <view class="result-grid__item">
            <view class="result-grid__k">每月递减</view>
            <view class="result-grid__v">{{ display.decrement }} 元</view>
          </view>
          <view class="result-grid__item">
            <view class="result-grid__k">贷款总额</view>
            <view class="result-grid__v">{{ display.loanTotal }} 元</view>
          </view>
          <view class="result-grid__item">
            <view class="result-grid__k">利息总额</view>
            <view class="result-grid__v">{{ display.totalInterest }} 元</view>
          </view>
          <view class="result-grid__item">
            <view class="result-grid__k">本息合计</view>
            <view class="result-grid__v">{{ display.totalPayment }} 元</view>
          </view>
          <view class="result-grid__item">
            <view class="result-grid__k">还款月数</view>
            <view class="result-grid__v">{{ display.months }} 期</view>
          </view>
        </view>
      </ResultPanel>
      <view v-else class="muted small">请填写贷款信息后查看计算结果</view>

      <view v-if="hasResult" class="card card--flat mortgage-compare">
        <view class="section-title small">两种方式对比</view>
        <view class="stat-line">
          <text class="stat-line__k">等额本息总利息</text>
          <text class="stat-line__v">{{ display.eiInterest }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">等额本金总利息</text>
          <text class="stat-line__v">{{ display.epInterest }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">两种方式利息差额</text>
          <text class="stat-line__v brand">{{ display.interestDiff }} 元</text>
        </view>
        <view class="field-hint">同一组金额、利率与年限下计算；等额本金总利息通常更少，但前期月供更高。</view>
      </view>

      <view class="note note--info mortgage-note">计算结果仅供参考，实际金额以银行合同和实际利率为准。</view>
    </view>

    <view v-if="hasResult" class="section">
      <view class="section-head">
        <view class="section-title">还款明细</view>
        <view class="section-more" @click="toggleSchedule">{{ scheduleToggleLabel }}</view>
      </view>
      <view class="card card--flat">
        <view class="field-hint">默认展示前 12 期，共 {{ totalMonths }} 期；金额单位：元</view>
        <view class="divider"></view>
        <view class="sched-row sched-row--head">
          <text class="sched-cell sched-cell--idx">期数</text>
          <text class="sched-cell">月供</text>
          <text class="sched-cell">本金</text>
          <text class="sched-cell">利息</text>
          <text class="sched-cell">剩余本金</text>
        </view>
        <view class="sched-row" v-for="row in scheduleRows" :key="row.month">
          <text class="sched-cell sched-cell--idx">{{ row.month }}</text>
          <text class="sched-cell">{{ row.payment }}</text>
          <text class="sched-cell">{{ row.principal }}</text>
          <text class="sched-cell">{{ row.interest }}</text>
          <text class="sched-cell">{{ row.balance }}</text>
        </view>
        <view class="btn btn--plain btn--sm mortgage-sched-btn" @click="toggleSchedule">{{ scheduleToggleLabel }}</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mortgage-unit { font-size: 28rpx; font-weight: 400; }
.mortgage-error { margin-top: 20rpx; }
.mortgage-compare { margin-top: 20rpx; }
.mortgage-note { margin-top: 20rpx; }
.mortgage-sched-btn { margin-top: 20rpx; }
.sched-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f2f2f2;
}
.sched-row--head {
  background: #f7f8fa;
  font-weight: 600;
  border-radius: 8rpx;
  padding-left: 8rpx;
  padding-right: 8rpx;
}
.sched-cell {
  flex: 1;
  font-size: 20rpx;
  text-align: right;
  color: #444444;
}
.sched-cell--idx { flex: 0 0 64rpx; text-align: left; }
.sched-row--head .sched-cell { color: #666666; }
</style>

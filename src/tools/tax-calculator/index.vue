<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMoney, toFiniteNumber } from '@/utils/number'
import { formatPercent } from '@/utils/format'
import { isBlank } from '@/utils/validation'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import {
  calculateAnnualTax,
  buildTaxSummary,
  type TaxInput,
  type TaxResult
} from './logic'
import { TAX_BRACKETS, SPECIAL_DEDUCTION_GUIDE, RULE_VERSION, SOURCE_NOTE } from './rules'

const monthlySalary = ref('')
const socialMonthly = ref('')
const housingFundMonthly = ref('')
const specialAdditionalMonthly = ref('')
const prepaidTax = ref('')

const showBrackets = ref(false)
const showGuide = ref(false)

const ruleVersion = RULE_VERSION
const sourceNote = SOURCE_NOTE

/** 输入层面的校验：空输入按 0 处理，月工资为空或含非法字符时给中文提示 */
const inputError = computed(() => {
  if (isBlank(monthlySalary.value)) return '请填写税前月工资'
  const fields: Array<{ label: string; value: string }> = [
    { label: '税前月工资', value: monthlySalary.value },
    { label: '社保个人缴纳金额（月）', value: socialMonthly.value },
    { label: '公积金个人缴纳金额（月）', value: housingFundMonthly.value },
    { label: '专项附加扣除（每月合计）', value: specialAdditionalMonthly.value },
    { label: '全年已预缴税额', value: prepaidTax.value }
  ]
  for (const field of fields) {
    if (!isBlank(field.value) && toFiniteNumber(field.value) === null) {
      return `${field.label}请输入有效数字`
    }
  }
  return ''
})

const taxInput = computed<TaxInput>(() => ({
  monthlySalary: toFiniteNumber(monthlySalary.value) ?? 0,
  socialMonthly: toFiniteNumber(socialMonthly.value) ?? 0,
  housingFundMonthly: toFiniteNumber(housingFundMonthly.value) ?? 0,
  specialAdditionalMonthly: toFiniteNumber(specialAdditionalMonthly.value) ?? 0,
  prepaidTax: toFiniteNumber(prepaidTax.value) ?? 0
}))

const result = computed(() => calculateAnnualTax(taxInput.value))
const hasResult = computed(() => !inputError.value && result.value.ok)
const errorMessage = computed(() => {
  if (inputError.value) return inputError.value
  const r = result.value
  return r.ok ? '' : r.message
})

/** 统一把展示内容格式化为字符串，避免模板内直接调用格式化函数 */
const display = computed(() => {
  const r = result.value
  const v: TaxResult | null = !inputError.value && r.ok ? r.value : null
  const money = (value: number | undefined): string => (value === undefined ? '—' : formatMoney(value))
  return {
    tax: money(v?.tax),
    taxableIncome: money(v?.taxableIncome),
    annualIncome: money(v?.annualIncome),
    annualAfterTax: money(v?.annualAfterTax),
    monthlyAfterTax: money(v?.monthlyAfterTax),
    quickDeduction: money(v?.quickDeduction),
    annualSpecialDeduction: money(v?.annualSpecialDeduction),
    annualSpecialAdditional: money(v?.annualSpecialAdditional),
    rate: v ? formatPercent(v.rate, 0) : '—',
    level: v ? String(v.level) : '—',
    refundOrOweValue: v ? formatMoney(Math.abs(v.refundOrOwe)) : '—',
    refundOrOweLabel: v && v.refundOrOwe < 0 ? '预计应退税额' : '预计应补税额'
  }
})

const copyText = computed(() => {
  const r = result.value
  if (inputError.value || !r.ok) return ''
  return buildTaxSummary(taxInput.value, r.value)
})

/** 年度税率表展示数据，全部来自 rules.ts */
const bracketRows = computed(() => {
  let lower = 0
  return TAX_BRACKETS.map((bracket, index) => {
    const range = Number.isFinite(bracket.upperLimit)
      ? `${formatMoney(lower)} — ${formatMoney(bracket.upperLimit)} 元`
      : `${formatMoney(lower)} 元以上`
    lower = bracket.upperLimit
    return {
      level: String(index + 1),
      range,
      rate: formatPercent(bracket.rate, 0),
      quickDeduction: formatMoney(bracket.quickDeduction)
    }
  })
})

/** 专项附加扣除参考标准展示数据，全部来自 rules.ts */
const guideRows = computed(() => SPECIAL_DEDUCTION_GUIDE)

const bracketToggleLabel = computed(() => (showBrackets.value ? '收起税率表' : '查看年度税率表'))
const guideToggleLabel = computed(() => (showGuide.value ? '收起参考标准' : '查看专项附加扣除参考标准'))

function toggleBrackets() {
  showBrackets.value = !showBrackets.value
}
function toggleGuide() {
  showGuide.value = !showGuide.value
}
</script>

<template>
  <view>
    <view class="note note--info tax-scope">计算口径：按全年综合所得估算（年度汇算口径的简化测算），不是逐月累计预扣预缴明细。</view>

    <view class="card">
      <FormField label="税前月工资" required hint="单位：元 / 月">
        <view class="input-row">
          <input class="field-input" type="digit" :value="monthlySalary" placeholder="请输入税前月工资" @input="monthlySalary = $event.detail.value" />
          <text class="input-suffix">元</text>
        </view>
      </FormField>
      <FormField label="社保个人缴纳金额（月）" hint="选填，单位：元 / 月；留空按 0 处理">
        <view class="input-row">
          <input class="field-input" type="digit" :value="socialMonthly" placeholder="请输入每月个人缴纳的社保金额" @input="socialMonthly = $event.detail.value" />
          <text class="input-suffix">元</text>
        </view>
      </FormField>
      <FormField label="公积金个人缴纳金额（月）" hint="选填，单位：元 / 月；留空按 0 处理">
        <view class="input-row">
          <input class="field-input" type="digit" :value="housingFundMonthly" placeholder="请输入每月个人缴纳的公积金金额" @input="housingFundMonthly = $event.detail.value" />
          <text class="input-suffix">元</text>
        </view>
      </FormField>
      <FormField label="专项附加扣除（每月合计）" hint="选填，单位：元 / 月；按实际可扣除金额填写，留空按 0 处理">
        <view class="input-row">
          <input class="field-input" type="digit" :value="specialAdditionalMonthly" placeholder="请输入每月专项附加扣除合计" @input="specialAdditionalMonthly = $event.detail.value" />
          <text class="input-suffix">元</text>
        </view>
      </FormField>
      <FormField label="全年已预缴税额" hint="选填，指全年累计已预缴的个税，单位：元；留空按 0 处理">
        <view class="input-row">
          <input class="field-input" type="digit" :value="prepaidTax" placeholder="请输入全年已预缴税额" @input="prepaidTax = $event.detail.value" />
          <text class="input-suffix">元</text>
        </view>
      </FormField>
    </view>

    <view v-if="errorMessage" class="note note--danger tax-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>

      <ResultPanel v-if="hasResult" title="个税估算结果" :copy-text="copyText">
        <view class="result__label">预计全年应纳个税</view>
        <view class="result__value result__value--brand">{{ display.tax }} <text class="tax-unit">元</text></view>
        <view class="divider"></view>
        <view class="stat-line">
          <text class="stat-line__k">应纳税所得额</text>
          <text class="stat-line__v">{{ display.taxableIncome }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">适用税率与速算扣除数</text>
          <text class="stat-line__v">第 {{ display.level }} 级 · {{ display.rate }} · {{ display.quickDeduction }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">税后到手年收入</text>
          <text class="stat-line__v">{{ display.annualAfterTax }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">税后到手月均</text>
          <text class="stat-line__v">{{ display.monthlyAfterTax }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">预计全年税前收入</text>
          <text class="stat-line__v">{{ display.annualIncome }} 元</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">{{ display.refundOrOweLabel }}</text>
          <text class="stat-line__v brand">{{ display.refundOrOweValue }} 元</text>
        </view>
      </ResultPanel>
      <view v-else class="muted small">请填写税前月工资后查看计算结果</view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">规则来源</view></view>
      <view class="card card--flat">
        <view class="stat-line">
          <text class="stat-line__k">规则版本</text>
          <text class="stat-line__v tax-version">{{ ruleVersion }}</text>
        </view>
        <view class="tax-source">{{ sourceNote }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">年度税率表</view>
        <view class="section-more" @click="toggleBrackets">{{ bracketToggleLabel }}</view>
      </view>
      <view v-if="showBrackets" class="card card--flat">
        <view class="field-hint">综合所得年度七级超额累进税率表；全年应纳税所得额为扣除各项后的金额。</view>
        <view class="divider"></view>
        <view class="tax-row tax-row--head">
          <text class="tax-cell tax-cell--lv">级数</text>
          <text class="tax-cell tax-cell--range">全年应纳税所得额</text>
          <text class="tax-cell">税率</text>
          <text class="tax-cell">速算扣除数</text>
        </view>
        <view class="tax-row" v-for="row in bracketRows" :key="row.level">
          <text class="tax-cell tax-cell--lv">{{ row.level }}</text>
          <text class="tax-cell tax-cell--range">{{ row.range }}</text>
          <text class="tax-cell">{{ row.rate }}</text>
          <text class="tax-cell">{{ row.quickDeduction }} 元</text>
        </view>
        <view class="btn btn--plain btn--sm tax-toggle-btn" @click="toggleBrackets">{{ bracketToggleLabel }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">专项附加扣除参考标准</view>
        <view class="section-more" @click="toggleGuide">{{ guideToggleLabel }}</view>
      </view>
      <view v-if="showGuide" class="card card--flat">
        <view class="field-hint">以下标准仅供说明参考，不会自动代入上方计算；实际可扣除金额请据实填写。</view>
        <view class="divider"></view>
        <view class="tax-guide-item" v-for="row in guideRows" :key="row.name">
          <view class="tax-guide-name">{{ row.name }}</view>
          <view class="tax-guide-desc">{{ row.standard }}</view>
        </view>
        <view class="btn btn--plain btn--sm tax-toggle-btn" @click="toggleGuide">{{ guideToggleLabel }}</view>
      </view>
    </view>

    <view class="note note--danger tax-note">
      本结果按全年收入稳定、仅有工资薪金一项综合所得、无其他扣除（企业年金、商业健康险、个人养老金等）的简化假设计算；未考虑年终奖单独计税、劳务报酬、稿酬等情形；不等同于税务机关最终核定结果，年度汇算请以个人所得税 App 与税务机关数据为准；政策可能调整，请核对最新规定。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tax-scope { margin-bottom: 20rpx; }
.tax-unit { font-size: 28rpx; font-weight: 400; }
.tax-error { margin-top: 20rpx; }
.tax-version { font-size: 26rpx; }
.tax-source { font-size: 23rpx; color: #888888; line-height: 1.6; margin-top: 10rpx; }
.tax-note { margin-top: 24rpx; }
.tax-toggle-btn { margin-top: 20rpx; }
.tax-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f2f2f2;
}
.tax-row--head {
  background: #f7f8fa;
  font-weight: 600;
  border-radius: 8rpx;
  padding-left: 8rpx;
  padding-right: 8rpx;
}
.tax-cell { flex: 1; font-size: 21rpx; text-align: right; color: #444444; }
.tax-cell--lv { flex: 0 0 60rpx; text-align: left; }
.tax-cell--range { flex: 2; text-align: left; padding-left: 8rpx; }
.tax-guide-item { padding: 14rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.tax-guide-item:last-child { border-bottom: none; }
.tax-guide-name { font-size: 26rpx; color: #444444; font-weight: 500; }
.tax-guide-desc { font-size: 23rpx; color: #888888; margin-top: 4rpx; line-height: 1.55; }
</style>

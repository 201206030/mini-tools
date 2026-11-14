<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { toFiniteNumber } from '@/utils/number'
import FormField from '@/components/FormField.vue'
import Segmented from '@/components/Segmented.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { calcBmi, type BmiResult, type BmiStandard } from './logic'

const standardOptions: Array<SelectOption<string>> = [
  { label: '中国标准', value: 'cn' },
  { label: 'WHO 标准', value: 'who' }
]

const heightCm = ref('')
const weightKg = ref('')
const standard = ref<BmiStandard>('cn')

const result = computed(() =>
  calcBmi(
    toFiniteNumber(heightCm.value) ?? NaN,
    toFiniteNumber(weightKg.value) ?? NaN,
    standard.value
  )
)
const errorMessage = computed(() => (result.value.ok ? '' : result.value.message))

const display = computed(() => {
  const r: BmiResult | null = result.value.ok ? result.value.value : null
  return {
    bmi: r ? r.bmi.toFixed(1) : '—',
    category: r ? r.category : '—',
    standardName: r ? r.standardName : '—',
    normalRange: r ? r.normalRange : '—',
    idealRange: r ? `${r.idealMinKg.toFixed(1)} ~ ${r.idealMaxKg.toFixed(1)} kg` : '—',
    adjustText: r ? r.adjustText : '—'
  }
})

const copyText = computed(() => {
  if (!result.value.ok) return ''
  const r = result.value.value
  return [
    `BMI 计算器（${r.standardName}）`,
    `身高：${heightCm.value} cm`,
    `体重：${weightKg.value} kg`,
    `BMI：${r.bmi.toFixed(1)}`,
    `分类：${r.category}`,
    `正常 BMI 区间：${r.normalRange}`,
    `理想体重：${r.idealMinKg.toFixed(1)} ~ ${r.idealMaxKg.toFixed(1)} kg`,
    r.adjustText,
    '按成人标准估算，仅供参考'
  ].join('\n')
})
</script>

<template>
  <view>
    <view class="card">
      <FormField label="身高" required hint="单位：厘米，可填写 50 到 250">
        <view class="input-row">
          <input class="field-input" type="digit" :value="heightCm" placeholder="请输入身高，例如 170" @input="heightCm = $event.detail.value" />
          <text class="input-suffix">cm</text>
        </view>
      </FormField>
      <FormField label="体重" required hint="单位：公斤，可填写 2 到 400">
        <view class="input-row">
          <input class="field-input" type="digit" :value="weightKg" placeholder="请输入体重，例如 65" @input="weightKg = $event.detail.value" />
          <text class="input-suffix">kg</text>
        </view>
      </FormField>
      <FormField label="判定标准" required>
        <Segmented v-model="standard" :options="standardOptions" />
      </FormField>
    </view>

    <view v-if="errorMessage" class="note note--danger bmi-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>

      <ResultPanel v-if="result.ok" :title="display.standardName" :copy-text="copyText">
        <view class="result__label">身体质量指数（BMI）</view>
        <view class="result__value result__value--brand">{{ display.bmi }}</view>
        <view class="bmi-category">分类：{{ display.category }}</view>
        <view class="divider"></view>
        <view class="stat-line">
          <text class="stat-line__k">正常 BMI 区间</text>
          <text class="stat-line__v">{{ display.normalRange }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">理想体重范围</text>
          <text class="stat-line__v">{{ display.idealRange }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">增减建议</text>
          <text class="stat-line__v brand">{{ display.adjustText }}</text>
        </view>
      </ResultPanel>
      <view v-else class="muted small">请填写身高和体重后查看计算结果</view>

      <view class="note note--info bmi-note">按成人标准估算，儿童、孕妇、运动员不适用，仅供参考</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bmi-error { margin-top: 20rpx; }
.bmi-note { margin-top: 20rpx; }
.bmi-category {
  margin-top: 10rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: #3EAF7C;
}
</style>

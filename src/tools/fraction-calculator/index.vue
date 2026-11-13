<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalcResult, SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import {
  calculateFraction,
  decimalToFraction,
  describeFraction,
  fractionText,
  parseFraction
} from './logic'
import type { FractionOp, FractionResult } from './logic'

const modeOptions: Array<SelectOption<string>> = [
  { label: '分数四则运算', value: 'calc' },
  { label: '小数转分数', value: 'decimal' }
]
const mode = ref<string | number>('calc')

const leftText = ref('1/2')
const rightText = ref('1/3')
const op = ref<FractionOp>('+')
const decimalText = ref('0.75')

const operators: Array<{ label: string; value: FractionOp }> = [
  { label: '＋ 加', value: '+' },
  { label: '－ 减', value: '-' },
  { label: '× 乘', value: '*' },
  { label: '÷ 除', value: '/' }
]

const outcome = computed<CalcResult<FractionResult>>(() => {
  if (mode.value === 'decimal') {
    const fraction = decimalToFraction(decimalText.value)
    if (!fraction.ok) return { ok: false, message: fraction.message }
    const result = describeFraction(fraction.value)
    return {
      ok: true,
      value: { ...result, expression: `${decimalText.value} ≈ ${result.text}` }
    }
  }
  const left = parseFraction(leftText.value)
  if (!left.ok) return { ok: false, message: `第一个数：${left.message}` }
  const right = parseFraction(rightText.value)
  if (!right.ok) return { ok: false, message: `第二个数：${right.message}` }
  return calculateFraction(left.value, right.value, op.value)
})

const copyText = computed<string | undefined>(() =>
  outcome.value.ok ? outcome.value.value.expression : undefined
)
const opLabel = computed(() => ({ '+': '＋', '-': '－', '*': '×', '/': '÷' })[op.value])
const leftPreview = computed(() => {
  const result = parseFraction(leftText.value)
  return result.ok ? fractionText(result.value) : '—'
})
const rightPreview = computed(() => {
  const result = parseFraction(rightText.value)
  return result.ok ? fractionText(result.value) : '—'
})
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="mode" :options="modeOptions" />
      <view class="divider"></view>

      <template v-if="mode === 'calc'">
        <FormField label="第一个数" hint="支持 3/4、1 1/2、0.75、75% 等写法">
          <input
            class="field-input"
            type="text"
            :value="leftText"
            placeholder="例如 3/4"
            @input="leftText = $event.detail.value"
          />
        </FormField>

        <view class="fc-ops">
          <view
            v-for="item in operators"
            :key="item.value"
            class="fc-op"
            :class="{ 'fc-op--active': op === item.value }"
            @click="op = item.value"
          >{{ item.label }}</view>
        </view>

        <FormField label="第二个数" hint="除法时第二个数不能为 0">
          <input
            class="field-input"
            type="text"
            :value="rightText"
            placeholder="例如 2/5"
            @input="rightText = $event.detail.value"
          />
        </FormField>
        <view class="fc-preview">当前算式：{{ leftPreview }} {{ opLabel }} {{ rightPreview }}</view>
      </template>

      <template v-else>
        <FormField label="要转换的小数" hint="用连分数逼近，分母默认不超过 10000">
          <input
            class="field-input"
            type="text"
            :value="decimalText"
            placeholder="例如 0.75、3.14、0.3333"
            @input="decimalText = $event.detail.value"
          />
        </FormField>
      </template>
    </view>

    <view v-if="!outcome.ok" class="note note--danger fc-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>
      <ResultPanel title="最简分数" :copy-text="copyText">
        <template v-if="outcome.ok">
          <view class="result__value result__value--brand">{{ outcome.value.text }}</view>
          <view class="result__label">{{ outcome.value.expression }}</view>
          <view class="divider"></view>
          <view class="stat-line"><text class="stat-line__k">带分数</text><text class="stat-line__v">{{ outcome.value.mixed }}</text></view>
          <view class="stat-line"><text class="stat-line__k">小数</text><text class="stat-line__v">{{ outcome.value.decimal }}</text></view>
          <view class="stat-line"><text class="stat-line__k">百分数</text><text class="stat-line__v">{{ outcome.value.percent }}</text></view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info fc-note">
        结果会自动约分为最简分数；输入的小数与百分数也会先精确转成分数再计算，全程在本机完成。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 不使用 flex gap，保证低版本 WebView 上四个运算符按钮都有间距 */
.fc-ops { display: flex; margin-bottom: 24rpx; }
.fc-op {
  flex: 1;
  text-align: center;
  height: 66rpx;
  line-height: 66rpx;
  font-size: 25rpx;
  color: #666666;
  background: #f3f4f6;
  border-radius: 12rpx;
}
.fc-op + .fc-op { margin-left: 12rpx; }
.fc-op--active { background: #e8f6ef; color: #2e9b6b; font-weight: 600; }
.fc-preview { font-size: 24rpx; color: #888888; }
.fc-error { margin-top: 20rpx; }
.fc-note { margin-top: 20rpx; }
</style>

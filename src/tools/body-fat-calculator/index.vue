<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { roundTo, toFiniteNumber } from '@/utils/number'
import { showError } from '@/services/feedback'
import FormField from '@/components/FormField.vue'
import Segmented from '@/components/Segmented.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import {
  calcBodyFatByBmi,
  calcBodyFatByMeasure,
  type BodyFatResult,
  type Gender
} from './logic'

type Mode = 'bmi' | 'measure'

const modeOptions: Array<SelectOption<string>> = [
  { label: 'BMI 估算', value: 'bmi' },
  { label: '体围估算', value: 'measure' }
]
const genderOptions: Array<SelectOption<string>> = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' }
]

const mode = ref<Mode>('bmi')
const gender = ref<Gender>('male')
const weightKg = ref('')
const bmiInput = ref('')
const ageInput = ref('')
const heightCm = ref('')
const waistCm = ref('')
const neckCm = ref('')
const hipCm = ref('')

const result = computed(() => {
  const weight = toFiniteNumber(weightKg.value) ?? NaN
  if (mode.value === 'bmi') {
    return calcBodyFatByBmi(
      toFiniteNumber(bmiInput.value) ?? NaN,
      toFiniteNumber(ageInput.value) ?? NaN,
      gender.value,
      weight
    )
  }
  return calcBodyFatByMeasure(
    gender.value,
    toFiniteNumber(heightCm.value) ?? NaN,
    toFiniteNumber(waistCm.value) ?? NaN,
    toFiniteNumber(neckCm.value) ?? NaN,
    toFiniteNumber(hipCm.value) ?? NaN,
    weight
  )
})
const errorMessage = computed(() => (result.value.ok ? '' : result.value.message))

const display = computed(() => {
  const r: BodyFatResult | null = result.value.ok ? result.value.value : null
  return {
    percent: r ? r.bodyFatPercent.toFixed(1) : '—',
    category: r ? r.category : '—',
    fatMass: r && r.fatMassKg !== null ? `${r.fatMassKg.toFixed(1)} kg` : '—',
    leanMass: r && r.leanMassKg !== null ? `${r.leanMassKg.toFixed(1)} kg` : '—',
    methodName: r ? (r.method === 'bmi' ? 'BMI 估算法' : '体围估算法') : '—',
    genderName: gender.value === 'male' ? '男' : '女'
  }
})

const copyText = computed(() => {
  if (!result.value.ok) return ''
  const r = result.value.value
  return [
    `体脂率计算器（${display.value.methodName}）`,
    `性别：${display.value.genderName}`,
    `体重：${weightKg.value} kg`,
    `体脂率：${r.bodyFatPercent.toFixed(1)}%`,
    `分类：${r.category}`,
    `脂肪重量估算：${display.value.fatMass}`,
    `去脂体重：${display.value.leanMass}`,
    '公式估算，不等同于体脂秤或医学测量'
  ].join('\n')
})

function fillBmiFromBody() {
  const h = toFiniteNumber(heightCm.value)
  const w = toFiniteNumber(weightKg.value)
  if (h === null || w === null || h <= 0 || w <= 0) {
    showError('请先填写有效的身高和体重')
    return
  }
  bmiInput.value = String(roundTo(w / Math.pow(h / 100, 2), 1))
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="估算方式" required>
        <Segmented v-model="mode" :options="modeOptions" />
      </FormField>
      <FormField label="性别" required>
        <Segmented v-model="gender" :options="genderOptions" />
      </FormField>
      <FormField label="体重" required hint="单位：公斤，用于估算脂肪重量与去脂体重，可填写 2 到 400">
        <view class="input-row">
          <input class="field-input" type="digit" :value="weightKg" placeholder="请输入体重，例如 65" @input="weightKg = $event.detail.value" />
          <text class="input-suffix">kg</text>
        </view>
      </FormField>

      <template v-if="mode === 'bmi'">
        <FormField label="年龄" required hint="单位：岁，可填写 10 到 100">
          <view class="input-row">
            <input class="field-input" type="number" :value="ageInput" placeholder="请输入年龄，例如 28" @input="ageInput = $event.detail.value" />
            <text class="input-suffix">岁</text>
          </view>
        </FormField>
        <FormField label="BMI" required hint="可手动填写，也可由下方身高体重自动计算">
          <view class="input-row">
            <input class="field-input" type="digit" :value="bmiInput" placeholder="请输入 BMI，例如 22.5" @input="bmiInput = $event.detail.value" />
            <text class="input-suffix">BMI</text>
          </view>
        </FormField>
        <FormField label="身高（用于自动算 BMI）" hint="单位：厘米，可填写 50 到 250；填写后点击下方按钮即可算出 BMI">
          <view class="input-row">
            <input class="field-input" type="digit" :value="heightCm" placeholder="请输入身高，例如 170" @input="heightCm = $event.detail.value" />
            <text class="input-suffix">cm</text>
          </view>
        </FormField>
        <view class="btn btn--plain btn--sm bf-fill-btn" @click="fillBmiFromBody">由身高体重计算 BMI</view>
        <view class="field-hint">BMI 法使用 Deurenberg 公式，按 BMI、年龄与性别估算。</view>
      </template>

      <template v-else>
        <FormField label="身高" required hint="单位：厘米，可填写 50 到 250">
          <view class="input-row">
            <input class="field-input" type="digit" :value="heightCm" placeholder="请输入身高，例如 170" @input="heightCm = $event.detail.value" />
            <text class="input-suffix">cm</text>
          </view>
        </FormField>
        <FormField label="腰围" required hint="单位：厘米，可填写 20 到 300">
          <view class="input-row">
            <input class="field-input" type="digit" :value="waistCm" placeholder="请输入腰围，例如 80" @input="waistCm = $event.detail.value" />
            <text class="input-suffix">cm</text>
          </view>
        </FormField>
        <FormField label="颈围" required hint="单位：厘米，可填写 20 到 300">
          <view class="input-row">
            <input class="field-input" type="digit" :value="neckCm" placeholder="请输入颈围，例如 38" @input="neckCm = $event.detail.value" />
            <text class="input-suffix">cm</text>
          </view>
        </FormField>
        <FormField label="臀围" required hint="单位：厘米，可填写 20 到 300；男性公式不使用此项，但仍需填写有效数值">
          <view class="input-row">
            <input class="field-input" type="digit" :value="hipCm" placeholder="请输入臀围，例如 95" @input="hipCm = $event.detail.value" />
            <text class="input-suffix">cm</text>
          </view>
        </FormField>
        <view class="field-hint">体围法使用美国海军公式，按身高、腰围、颈围与臀围估算。</view>
      </template>
    </view>

    <view v-if="errorMessage" class="note note--danger bf-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">估算结果</view></view>

      <ResultPanel v-if="result.ok" :title="display.methodName" :copy-text="copyText">
        <view class="result__label">估算体脂率</view>
        <view class="result__value result__value--brand">{{ display.percent }}<text class="bf-unit">%</text></view>
        <view class="bf-category">分类：{{ display.category }}</view>
        <view class="divider"></view>
        <view class="stat-line">
          <text class="stat-line__k">脂肪重量估算</text>
          <text class="stat-line__v">{{ display.fatMass }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">去脂体重</text>
          <text class="stat-line__v">{{ display.leanMass }}</text>
        </view>
      </ResultPanel>
      <view v-else class="muted small">请填写对应数据后查看估算结果</view>

      <view class="note note--info bf-note">公式估算，不等同于体脂秤或医学测量</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bf-error { margin-top: 20rpx; }
.bf-note { margin-top: 20rpx; }
.bf-fill-btn { margin-top: 4rpx; margin-bottom: 16rpx; }
.bf-unit { font-size: 30rpx; font-weight: 400; }
.bf-category {
  margin-top: 10rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: #3EAF7C;
}
</style>

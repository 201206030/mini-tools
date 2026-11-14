<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { toFiniteNumber } from '@/utils/number'
import { copyText } from '@/services/clipboard'
import FormField from '@/components/FormField.vue'
import Segmented from '@/components/Segmented.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import EmptyState from '@/components/EmptyState.vue'
import { calcSleepTimes, type SleepMode, type SleepSuggestion } from './logic'

const modeOptions: Array<SelectOption<string>> = [
  { label: '按起床时间', value: 'wake' },
  { label: '按入睡时间', value: 'sleep' }
]

const mode = ref<SleepMode>('wake')
const time = ref('07:00')
const showAdvanced = ref(false)
const cycleInput = ref('90')
const latencyInput = ref('15')
const countInput = ref('5')

function onTimeChange(event: any) {
  const value = String((event && event.detail && event.detail.value) || '')
  if (value) time.value = value
}

const result = computed(() =>
  calcSleepTimes(
    mode.value,
    time.value,
    showAdvanced.value ? (toFiniteNumber(cycleInput.value) ?? NaN) : 90,
    showAdvanced.value ? (toFiniteNumber(latencyInput.value) ?? NaN) : 15,
    showAdvanced.value ? (toFiniteNumber(countInput.value) ?? NaN) : 5
  )
)
const errorMessage = computed(() => (result.value.ok ? '' : result.value.message))
const suggestions = computed(() => (result.value.ok ? result.value.value : []))
const actionLabel = computed(() => (mode.value === 'wake' ? '入睡' : '起床'))

function buildSuggestionCopy(item: SleepSuggestion): string {
  return [
    `建议${item.dayLabel}${item.time}${actionLabel.value}`,
    `${item.cycles} 个睡眠周期`,
    item.durationText,
    item.note
  ].join('\n')
}

function copySuggestion(item: SleepSuggestion) {
  copyText(buildSuggestionCopy(item))
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="计算方式" required>
        <Segmented v-model="mode" :options="modeOptions" />
      </FormField>
      <FormField
        :label="mode === 'wake' ? '起床时间' : '入睡时间'"
        required
        hint="按 24 小时制选择，例如 07:00"
      >
        <picker mode="time" :value="time" @change="onTimeChange">
          <view class="field-input picker-value">{{ time }}</view>
        </picker>
      </FormField>
      <SwitchRow
        v-model="showAdvanced"
        label="自定义睡眠参数"
        hint="默认按 90 分钟周期、15 分钟入睡耗时、5 条建议计算"
      />
      <template v-if="showAdvanced">
        <FormField label="单个睡眠周期" hint="单位：分钟，可填写 60 到 120">
          <view class="input-row">
            <input class="field-input" type="number" :value="cycleInput" placeholder="例如 90" @input="cycleInput = $event.detail.value" />
            <text class="input-suffix">分钟</text>
          </view>
        </FormField>
        <FormField label="入睡耗时" hint="单位：分钟，可填写 0 到 60">
          <view class="input-row">
            <input class="field-input" type="number" :value="latencyInput" placeholder="例如 15" @input="latencyInput = $event.detail.value" />
            <text class="input-suffix">分钟</text>
          </view>
        </FormField>
        <FormField label="建议数量" hint="可填写 3 到 6 条">
          <view class="input-row">
            <input class="field-input" type="number" :value="countInput" placeholder="例如 5" @input="countInput = $event.detail.value" />
            <text class="input-suffix">条</text>
          </view>
        </FormField>
      </template>
    </view>

    <view v-if="errorMessage" class="note note--danger sleep-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">建议时间</view>
        <view class="section-more">共 {{ suggestions.length }} 条 · 点击单条复制</view>
      </view>

      <EmptyState v-if="suggestions.length === 0" text="暂无建议时间" hint="请选择有效的时间与参数" />
      <view v-else class="card card--flat">
        <view
          v-for="(item, index) in suggestions"
          :key="index"
          class="list-item"
          @click="copySuggestion(item)"
        >
          <view class="list-item__body">
            <view class="sleep-row">
              <text class="sleep-time">{{ item.time }}</text>
              <text class="tag tag--brand sleep-tag">{{ item.dayLabel }}</text>
              <text class="sleep-cycles">{{ item.cycles }} 个周期</text>
            </view>
            <view class="list-item__desc">{{ item.durationText }}</view>
            <view class="sleep-item-note">{{ item.note }}</view>
          </view>
          <view class="sleep-copy">复制</view>
        </view>
      </view>

      <view class="note note--info sleep-bottom-note">按 90 分钟睡眠周期估算，个体差异较大</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.picker-value { line-height: 84rpx; }
.sleep-error { margin-top: 20rpx; }
.sleep-bottom-note { margin-top: 20rpx; }
.sleep-row { display: flex; align-items: center; }
.sleep-time { font-size: 32rpx; font-weight: 600; color: #222222; }
.sleep-tag { margin-left: 12rpx; }
.sleep-cycles { margin-left: 12rpx; font-size: 24rpx; color: #888888; }
.sleep-item-note { margin-top: 6rpx; font-size: 23rpx; color: #888888; line-height: 1.6; }
.sleep-copy { margin-left: 16rpx; font-size: 24rpx; color: #3EAF7C; }
</style>

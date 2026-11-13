<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalcResult, SelectOption } from '@/types/common'
import { formatDate, todayCivil } from '@/utils/date'
import { copyText as doCopyText } from '@/services/clipboard'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { buildTimestampResult, datePartsToTimestamp, parseTimestamp } from './logic'
import type { TimestampResult } from './logic'

const modeOptions: Array<SelectOption<string>> = [
  { label: '时间戳转日期', value: 'ts2date' },
  { label: '日期转时间戳', value: 'date2ts' }
]
const mode = ref<string | number>('ts2date')

const nowTick = ref(Date.now())
const tsInput = ref(String(Math.floor(Date.now() / 1000)))
const dateStr = ref(formatDate(todayCivil()))
const timeStr = ref('12:00')
const seconds = ref('0')

const currentSeconds = computed(() => String(Math.floor(nowTick.value / 1000)))

const outcome = computed<CalcResult<TimestampResult>>(() => {
  if (mode.value === 'ts2date') {
    const parsed = parseTimestamp(tsInput.value)
    if (!parsed.ok) return { ok: false, message: parsed.message }
    return buildTimestampResult(parsed.value, nowTick.value)
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.value)
  const timeParts = /^(\d{2}):(\d{2})$/.exec(timeStr.value)
  if (!dateParts || !timeParts) return { ok: false, message: '请选择有效的日期与时间' }
  const second = Number(seconds.value)
  if (!Number.isInteger(second) || second < 0 || second > 59) {
    return { ok: false, message: '秒数需在 0 到 59 之间' }
  }
  return datePartsToTimestamp(
    Number(dateParts[1]),
    Number(dateParts[2]),
    Number(dateParts[3]),
    Number(timeParts[1]),
    Number(timeParts[2]),
    second,
    nowTick.value
  )
})

const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value.seconds : undefined))

function refreshNow() {
  nowTick.value = Date.now()
}

function useNow() {
  refreshNow()
  tsInput.value = currentSeconds.value
}

function copyMilliseconds() {
  if (outcome.value.ok) doCopyText(outcome.value.value.milliseconds)
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="mode" :options="modeOptions" />
      <view class="divider"></view>

      <template v-if="mode === 'ts2date'">
        <FormField label="Unix 时间戳" hint="10 位按秒处理，13 位按毫秒处理，自动识别">
          <input
            class="field-input"
            type="text"
            :value="tsInput"
            placeholder="例如 1735689600"
            @input="tsInput = $event.detail.value"
          />
        </FormField>
        <view class="btn-row">
          <view class="btn btn--plain btn--sm" @click="useNow">使用当前时间</view>
          <view class="btn btn--plain btn--sm" @click="tsInput = ''">清空</view>
        </view>
      </template>

      <template v-else>
        <FormField label="日期">
          <picker mode="date" :value="dateStr" @change="dateStr = $event.detail.value">
            <view class="field-input picker-value">{{ dateStr }}</view>
          </picker>
        </FormField>
        <view class="tc-row">
          <view class="tc-col">
            <text class="field-label">时间</text>
            <picker mode="time" :value="timeStr" @change="timeStr = $event.detail.value">
              <view class="field-input picker-value">{{ timeStr }}</view>
            </picker>
          </view>
          <view class="tc-col">
            <text class="field-label">秒</text>
            <input
              class="field-input"
              type="number"
              :value="seconds"
              placeholder="0"
              @input="seconds = $event.detail.value"
            />
          </view>
        </view>
      </template>
    </view>

    <view class="card tc-now">
      <view class="tc-now__row">
        <view>
          <view class="tc-now__label">当前时间戳（秒）</view>
          <view class="tc-now__value">{{ currentSeconds }}</view>
        </view>
        <view class="btn btn--plain btn--sm" @click="refreshNow">刷新</view>
      </view>
    </view>

    <view v-if="!outcome.ok" class="note note--danger tc-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">换算结果</view></view>
      <ResultPanel title="时间戳与日期时间" :copy-text="copyText" copy-label="复制秒级">
        <template v-if="outcome.ok">
          <view class="result__value result__value--brand">{{ outcome.value.datetime }}</view>
          <view class="result__label">{{ outcome.value.weekday }} · {{ outcome.value.relative }}</view>
          <view class="divider"></view>
          <view class="stat-line"><text class="stat-line__k">秒级时间戳</text><text class="stat-line__v">{{ outcome.value.seconds }}</text></view>
          <view class="stat-line"><text class="stat-line__k">毫秒时间戳</text><text class="stat-line__v">{{ outcome.value.milliseconds }}</text></view>
          <view class="stat-line"><text class="stat-line__k">日期</text><text class="stat-line__v">{{ outcome.value.date }}</text></view>
          <view class="stat-line"><text class="stat-line__k">时间</text><text class="stat-line__v">{{ outcome.value.time }}</text></view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="btn btn--plain btn--sm tc-copy" @click="copyMilliseconds">复制毫秒时间戳</view>
      <view class="note note--info tc-note">
        按手机本地时区换算，不联网校准时间；日期用数值构造，避免部分 iOS 机型解析日期字符串失败。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tc-row { display: flex; align-items: flex-end; }
.tc-col { flex: 1; min-width: 0; }
.tc-col + .tc-col { margin-left: 20rpx; }
.picker-value { line-height: 84rpx; }
.tc-now__row { display: flex; align-items: center; justify-content: space-between; }
.tc-now__label { font-size: 24rpx; color: #888888; }
.tc-now__value { font-size: 34rpx; font-weight: 600; color: #222222; margin-top: 6rpx; }
.tc-error { margin-top: 20rpx; }
.tc-copy { margin-top: 20rpx; }
.tc-note { margin-top: 20rpx; }
</style>

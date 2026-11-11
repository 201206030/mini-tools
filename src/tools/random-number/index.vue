<script setup lang="ts">
import { computed, ref } from 'vue'
import { toFiniteNumber } from '@/utils/number'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { formatRandomResult, generateRandomNumbers } from './logic'

const minInput = ref('1')
const maxInput = ref('100')
const countInput = ref('5')
const unique = ref(false)
const results = ref<number[]>([])
const error = ref('')

/** 严格解析整数，拒绝小数与非数字 */
function parseIntegerInput(raw: string): number | null {
  const value = toFiniteNumber(raw)
  if (value === null || !Number.isInteger(value)) return null
  return value
}

function generate() {
  const min = parseIntegerInput(minInput.value)
  const max = parseIntegerInput(maxInput.value)
  const count = parseIntegerInput(countInput.value)
  if (min === null || max === null || count === null) {
    results.value = []
    error.value = '最小值、最大值和生成数量都需要填写有效整数'
    return
  }
  const outcome = generateRandomNumbers({ min, max, count, unique: unique.value })
  if (outcome.ok) {
    results.value = outcome.value
    error.value = ''
  } else {
    results.value = []
    error.value = outcome.message
  }
}

const hasResult = computed(() => results.value.length > 0)
const copyText = computed<string | undefined>(() =>
  hasResult.value ? formatRandomResult(results.value) : undefined
)
</script>

<template>
  <view>
    <view class="card">
      <FormField label="最小值" hint="包含该数值在内的最小整数，可为负数">
        <input
          class="field-input"
          type="text"
          :value="minInput"
          placeholder="例如 1"
          @input="minInput = $event.detail.value"
        />
      </FormField>
      <FormField label="最大值" hint="包含该数值在内的最大整数，需不小于最小值">
        <input
          class="field-input"
          type="text"
          :value="maxInput"
          placeholder="例如 100"
          @input="maxInput = $event.detail.value"
        />
      </FormField>
      <FormField label="生成数量" hint="最多一次生成 100 个">
        <input
          class="field-input"
          type="number"
          :value="countInput"
          placeholder="例如 5"
          @input="countInput = $event.detail.value"
        />
      </FormField>
      <SwitchRow v-model="unique" label="不重复" hint="开启后每个数字最多只出现一次" />
      <view class="btn-row rn-actions">
        <view class="btn btn--primary" @click="generate">生成随机数</view>
        <view class="btn btn--plain" @click="generate">重新生成</view>
      </view>
    </view>

    <view v-if="error" class="note note--danger rn-error">{{ error }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">生成结果</view></view>
      <ResultPanel title="本次生成" :copy-text="copyText">
        <template v-if="hasResult">
          <view class="rn-tags">
            <view v-for="(num, idx) in results" :key="idx" class="tag tag--brand rn-tag">{{ num }}</view>
          </view>
          <view class="result__label rn-count">共 {{ results.length }} 个数字</view>
        </template>
        <view v-else class="muted small">填写参数后点击「生成随机数」</view>
      </ResultPanel>
      <view class="note note--info rn-note">
        适用于日常抽号、抽签等普通随机场景，不适用于密码学或安全场景。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rn-actions { margin-top: 24rpx; }
.rn-error { margin-top: 20rpx; }
/* 不用 flex gap：结果标签横竖间距改用 margin，兼容低版本 WebView */
.rn-tags { display: flex; flex-wrap: wrap; }
.rn-tag { font-size: 30rpx; padding: 10rpx 22rpx; margin-right: 16rpx; margin-bottom: 16rpx; }
.rn-count { margin-top: 18rpx; }
.rn-note { margin-top: 20rpx; }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { formatNumber, toFiniteNumber } from '@/utils/number'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { UNIT_CATEGORIES, convert, describeConversion, getUnitOptions } from './logic'

const categoryList = UNIT_CATEGORIES
const categoryId = ref('length')
const amountInput = ref('1')
const fromIndex = ref(0)
const toIndex = ref(1)

const unitOptions = computed<SelectOption[]>(() => getUnitOptions(categoryId.value))
const unitNames = computed(() => unitOptions.value.map((option) => option.label))
const fromId = computed(() => unitOptions.value[fromIndex.value]?.value ?? '')
const toId = computed(() => unitOptions.value[toIndex.value]?.value ?? '')
const fromName = computed(() => unitOptions.value[fromIndex.value]?.label ?? '')
const toName = computed(() => unitOptions.value[toIndex.value]?.label ?? '')

function selectCategory(id: string) {
  categoryId.value = id
  const options = getUnitOptions(id)
  fromIndex.value = 0
  toIndex.value = options.length > 1 ? 1 : 0
}

/** 从选择器事件的 detail.value 中安全取出下标 */
function readPickerIndex(event: unknown): number | null {
  if (!event || typeof event !== 'object') return null
  const detail = (event as { detail?: unknown }).detail
  if (!detail || typeof detail !== 'object') return null
  const raw = (detail as { value?: unknown }).value
  const index = Number(raw)
  return Number.isInteger(index) && index >= 0 ? index : null
}

function onFromChange(event: unknown) {
  const index = readPickerIndex(event)
  if (index !== null && index < unitOptions.value.length) fromIndex.value = index
}

function onToChange(event: unknown) {
  const index = readPickerIndex(event)
  if (index !== null && index < unitOptions.value.length) toIndex.value = index
}

function swapUnits() {
  const temp = fromIndex.value
  fromIndex.value = toIndex.value
  toIndex.value = temp
}

const parsedAmount = computed(() => toFiniteNumber(amountInput.value))
const conversion = computed(() => {
  const amount = parsedAmount.value
  if (amount === null) return { ok: false as const, message: '请输入有效的数值' }
  return convert(categoryId.value, fromId.value, toId.value, amount)
})
const resultText = computed(() => {
  const outcome = conversion.value
  return outcome.ok ? formatNumber(outcome.value) : '—'
})
const activeError = computed(() => {
  const outcome = conversion.value
  return outcome.ok ? '' : outcome.message
})
const copyText = computed<string | undefined>(() => {
  const outcome = conversion.value
  if (!outcome.ok) return undefined
  return `${amountInput.value} ${fromName.value} = ${resultText.value} ${toName.value}`
})
const description = computed(() => describeConversion(categoryId.value, fromId.value, toId.value))
</script>

<template>
  <view>
    <view class="card">
      <scroll-view scroll-x class="pill-scroll">
        <view
          v-for="cat in categoryList"
          :key="cat.id"
          class="pill"
          :class="{ 'pill--active': categoryId === cat.id }"
          @click="selectCategory(cat.id)"
        >{{ cat.name }}</view>
      </scroll-view>
      <view class="divider"></view>

      <FormField label="数值" hint="请输入要换算的数字，支持小数">
        <input
          class="field-input"
          type="text"
          :value="amountInput"
          placeholder="例如 1，可为小数或负数"
          @input="amountInput = $event.detail.value"
        />
      </FormField>

      <view class="unit-row">
        <view class="unit-col">
          <text class="field-label">原始单位</text>
          <picker mode="selector" :range="unitNames" :value="fromIndex" @change="onFromChange">
            <view class="field-input picker-value">{{ fromName }}</view>
          </picker>
        </view>
        <view class="unit-swap" @click="swapUnits">交换</view>
        <view class="unit-col">
          <text class="field-label">目标单位</text>
          <picker mode="selector" :range="unitNames" :value="toIndex" @change="onToChange">
            <view class="field-input picker-value">{{ toName }}</view>
          </picker>
        </view>
      </view>
    </view>

    <view v-if="activeError" class="note note--danger uc-error">{{ activeError }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">换算结果</view></view>
      <ResultPanel title="换算结果" :copy-text="copyText">
        <template v-if="conversion.ok">
          <view class="result__value result__value--brand">{{ resultText }}</view>
          <view class="result__label">{{ toName }}</view>
          <view class="divider"></view>
          <view class="uc-expression">{{ amountInput }} {{ fromName }} = {{ resultText }} {{ toName }}</view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info uc-note">{{ description }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pill-scroll { width: 100%; white-space: nowrap; }
.pill-scroll .pill { display: inline-block; line-height: 60rpx; margin-right: 16rpx; }
.pill-scroll .pill:last-child { margin-right: 0; }
.unit-row { display: flex; align-items: flex-end; }
/* 替代 flex gap，保证两列单位选择器与「交换」按钮之间始终有间距 */
.unit-row .unit-swap { margin-left: 16rpx; margin-right: 16rpx; }
.unit-col { flex: 1; min-width: 0; }
.unit-swap {
  height: 84rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f3f4f6;
  color: #555555;
  border-radius: 12rpx;
  font-size: 25rpx;
}
.picker-value { line-height: 84rpx; }
.uc-expression { font-size: 26rpx; color: #555555; word-break: break-all; }
.uc-error { margin-top: 20rpx; }
.uc-note { margin-top: 20rpx; white-space: pre-line; }
</style>

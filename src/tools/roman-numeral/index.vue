<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { convertRoman, ROMAN_EXAMPLES } from './logic'

const directionOptions: Array<SelectOption<string>> = [
  { label: '数字转罗马', value: 'toRoman' },
  { label: '罗马转数字', value: 'toArabic' }
]
const direction = ref<string | number>('toRoman')
const text = ref('2026')

const outcome = computed(() =>
  convertRoman(text.value, direction.value === 'toArabic' ? 'toArabic' : 'toRoman')
)
const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value : undefined))

function useExample(value: string, toArabic: boolean) {
  text.value = value
  direction.value = toArabic ? 'toArabic' : 'toRoman'
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="direction" :options="directionOptions" />
      <view class="divider"></view>
      <FormField
        :label="direction === 'toArabic' ? '罗马数字' : '阿拉伯数字'"
        :hint="direction === 'toArabic' ? '只接受 I、V、X、L、C、D、M，且必须是规范写法' : '仅支持 1 到 3999 的整数'"
      >
        <input
          class="field-input"
          type="text"
          :value="text"
          :placeholder="direction === 'toArabic' ? '例如 MCMLXXXIV' : '例如 2026'"
          @input="text = $event.detail.value"
        />
      </FormField>
      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
        <view class="btn btn--plain btn--sm" @click="useExample('MMXXVI', true)">试试 MMXXVI</view>
      </view>
    </view>

    <view v-if="!outcome.ok" class="note note--danger rn-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <ResultPanel :title="direction === 'toArabic' ? '阿拉伯数字' : '罗马数字'" :copy-text="copyText">
        <template v-if="outcome.ok">
          <view class="result__value result__value--brand">{{ outcome.value }}</view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info rn-note">
        罗马数字采用标准减法规则，例如 4 写作 IV、9 写作 IX；IIII、VX 这类非规范写法会被拒绝。
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">常见对照</view>
        <view class="section-more">点击可填入输入框</view>
      </view>
      <view class="card rn-examples">
        <view v-for="(item, index) in ROMAN_EXAMPLES" :key="index" class="rn-examples__row">
          <view class="rn-examples__item" @click="useExample(item.arabic, false)">{{ item.arabic }}</view>
          <view class="rn-examples__arrow">⇄</view>
          <view class="rn-examples__item" @click="useExample(item.roman, true)">{{ item.roman }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rn-error { margin-top: 20rpx; }
.rn-note { margin-top: 20rpx; }
.rn-examples__row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f2f2f2;
}
.rn-examples__row:last-child { border-bottom: none; }
.rn-examples__item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #2e9b6b;
  font-weight: 600;
}
.rn-examples__item:active { opacity: 0.6; }
.rn-examples__arrow { width: 80rpx; text-align: center; color: #aaaaaa; font-size: 24rpx; }
</style>

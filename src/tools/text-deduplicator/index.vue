<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { dedupeLines, type DedupeResult } from './logic'

const keepOptions: SelectOption[] = [
  { label: '保留首次出现', value: 'first' },
  { label: '保留最后一次出现', value: 'last' }
]

const text = ref('')
const keep = ref<string | number>('first')
const ignoreEmpty = ref(true)
const trimSpaces = ref(true)
const caseSensitive = ref(false)
const result = ref<DedupeResult | null>(null)

function run() {
  result.value = dedupeLines(text.value, {
    keep: keep.value === 'last' ? 'last' : 'first',
    ignoreEmpty: ignoreEmpty.value,
    trim: trimSpaces.value,
    caseSensitive: caseSensitive.value
  })
}

function clearAll() {
  text.value = ''
  result.value = null
}

function fillBack() {
  if (result.value) text.value = result.value.resultText
}

const copyText = computed<string | undefined>(() => {
  const current = result.value
  return current && current.resultText ? current.resultText : undefined
})
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="keep" :options="keepOptions" />
      <view class="divider"></view>
      <SwitchRow v-model="ignoreEmpty" label="忽略空行" hint="结果中不包含空行与纯空白行" />
      <SwitchRow v-model="trimSpaces" label="忽略首尾空格" hint="仅用于比较，不会改写原文内容" />
      <SwitchRow v-model="caseSensitive" label="区分大小写" hint="关闭时不区分英文字母的大小写" />

      <FormField label="待处理文本" hint="每行一条。示例：苹果 / 香蕉 / 苹果 / 橙子 / 香蕉 → 苹果 / 香蕉 / 橙子">
        <textarea
          class="field-textarea td-textarea"
          v-model="text"
          :maxlength="-1"
          placeholder="在这里输入或粘贴要处理的文本，每行一条"
        />
      </FormField>

      <view class="btn-row td-actions">
        <view class="btn btn--primary" @click="run">开始处理</view>
        <view class="btn btn--plain" @click="clearAll">清空</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">处理结果</view></view>
      <ResultPanel title="去重结果" :copy-text="copyText">
        <template v-if="result">
          <view class="td-stats">
            <view class="td-stat">
              <text class="td-stat__k">处理前行数</text>
              <text class="td-stat__v">{{ result.originalCount }}</text>
            </view>
            <view class="td-stat">
              <text class="td-stat__k">处理后行数</text>
              <text class="td-stat__v">{{ result.resultCount }}</text>
            </view>
            <view class="td-stat">
              <text class="td-stat__k">删除重复行数</text>
              <text class="td-stat__v">{{ result.removedCount }}</text>
            </view>
          </view>
          <view class="divider"></view>
          <view v-if="result.resultText" class="td-text">{{ result.resultText }}</view>
          <view v-else class="muted small">去重后没有剩余内容</view>
        </template>
        <EmptyState v-else text="还没有处理结果" hint="输入文本后点击「开始处理」" />
      </ResultPanel>

      <view v-if="result" class="td-fillback">
        <view class="btn btn--plain btn--sm" @click="fillBack">把结果填回输入框</view>
      </view>

      <view class="note note--info td-note">
        保持原始顺序；忽略首尾空格仅用于比较，不会改写原文；保留最后一次出现时按其在原文中的先后位置输出。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.td-textarea { height: 400rpx; }
.td-actions { margin-top: 8rpx; }
.td-stats { display: flex; justify-content: space-around; }
.td-stat { display: flex; flex-direction: column; align-items: center; }
.td-stat__k { font-size: 23rpx; color: #7a8b84; }
.td-stat__v { font-size: 38rpx; font-weight: 700; color: #2e9b6b; margin-top: 6rpx; }
.td-text { font-size: 28rpx; line-height: 1.7; white-space: pre-wrap; word-break: break-all; }
.td-fillback { margin-top: 20rpx; }
.td-note { margin-top: 20rpx; }
</style>

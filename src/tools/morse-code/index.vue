<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { convertMorse, MORSE_TABLE } from './logic'

const directionOptions: Array<SelectOption<string>> = [
  { label: '文字转电码', value: 'encode' },
  { label: '电码转文字', value: 'decode' }
]
const direction = ref<string | number>('encode')
const text = ref('HELLO WORLD')
const showTable = ref(false)

const outcome = computed(() =>
  convertMorse(text.value, direction.value === 'decode' ? 'decode' : 'encode')
)
const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value.text : undefined))
const warning = computed(() => {
  if (!outcome.value.ok) return ''
  const { skipped, unknown } = outcome.value.value
  if (skipped.length > 0) return `已跳过不支持的字符：${skipped.join(' ')}（摩斯电码暂不支持中文）`
  if (unknown.length > 0) return `有 ${unknown.length} 个电码无法识别，已用 ? 标出：${unknown.slice(0, 5).join(' ')}`
  return ''
})

function useExample(value: string) {
  text.value = value
  direction.value = 'decode'
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="direction" :options="directionOptions" />
      <view class="divider"></view>
      <FormField
        :label="direction === 'decode' ? '摩斯电码' : '要转换的文字'"
        :hint="direction === 'decode' ? '字符之间用空格，单词之间用 / 或 | 分隔' : '支持英文字母、数字与常用标点，暂不支持中文'"
      >
        <textarea
          class="field-textarea mc-textarea"
          :value="text"
          :maxlength="-1"
          placeholder="在这里输入或粘贴内容"
          @input="text = $event.detail.value"
        />
      </FormField>
      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
        <view class="btn btn--plain btn--sm" @click="useExample('... --- ...')">试试 SOS</view>
      </view>
    </view>

    <view v-if="outcome.ok && warning" class="note note--danger mc-warning">{{ warning }}</view>
    <view v-else-if="!outcome.ok" class="note note--danger mc-warning">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <ResultPanel :title="direction === 'decode' ? '还原文字' : '摩斯电码'" :copy-text="copyText">
        <template v-if="outcome.ok">
          <view class="result__value result__value--brand mc-result">{{ outcome.value.text }}</view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info mc-note">
        国际摩斯电码用「·」和「—」表示，这里分别写作 . 和 -。转换全程在本机完成，内容不会上传。
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">电码对照表</view>
        <view class="section-more section-more--action" @click="showTable = !showTable">
          {{ showTable ? '收起' : '展开查看' }}
        </view>
      </view>
      <view v-if="showTable" class="card mc-table">
        <view v-for="(item, index) in MORSE_TABLE" :key="index" class="mc-table__row">
          <text class="mc-table__char">{{ item.char }}</text>
          <text class="mc-table__code">{{ item.code }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mc-textarea { height: 300rpx; }
.mc-result { font-size: 36rpx; line-height: 1.8; word-break: break-all; }
.mc-warning { margin-top: 20rpx; }
.mc-note { margin-top: 20rpx; }
.section-more--action { color: #3eaf7c; }
.mc-table { display: flex; flex-wrap: wrap; }
.mc-table__row {
  width: 50%;
  display: flex;
  align-items: center;
  padding: 8rpx 0;
  font-size: 25rpx;
}
.mc-table__char { width: 72rpx; font-weight: 600; color: #222222; }
.mc-table__code { color: #2e9b6b; }
</style>

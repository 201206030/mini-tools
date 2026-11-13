<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { convertBase64 } from './logic'

const directionOptions: Array<SelectOption<string>> = [
  { label: '编码为 Base64', value: 'encode' },
  { label: '解码为文本', value: 'decode' }
]
const direction = ref<string | number>('encode')
const text = ref('')

const outcome = computed(() => convertBase64(text.value, direction.value === 'decode' ? 'decode' : 'encode'))
const resultText = computed(() => (outcome.value.ok ? outcome.value.value : ''))
const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value : undefined))

function swap() {
  if (!outcome.value.ok) return
  text.value = outcome.value.value
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="direction" :options="directionOptions" />
      <view class="divider"></view>
      <FormField
        :label="direction === 'decode' ? 'Base64 内容' : '要编码的文本'"
        :hint="direction === 'decode' ? '自动忽略换行与空格，兼容 URL-safe 的 - 与 _' : '按 UTF-8 逐字节编码，中文与 Emoji 都能正确处理'"
      >
        <textarea
          class="field-textarea b64-input"
          :value="text"
          :maxlength="-1"
          placeholder="在这里输入或粘贴内容"
          @input="text = $event.detail.value"
        />
      </FormField>
      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
        <view class="btn btn--plain btn--sm" @click="swap">结果放回输入</view>
      </view>
    </view>

    <view v-if="!outcome.ok" class="note note--danger b64-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <ResultPanel :title="direction === 'decode' ? '解码文本' : 'Base64 编码'" :copy-text="copyText">
        <text v-if="outcome.ok" class="b64-output" selectable>{{ resultText }}</text>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info b64-note">
        小程序环境没有浏览器的 btoa / atob，这里用纯 TypeScript 实现 UTF-8 与 Base64 互转，全程在本机完成。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.b64-input { height: 320rpx; }
.b64-output {
  display: block;
  font-size: 27rpx;
  line-height: 1.75;
  color: #222222;
  word-break: break-all;
  white-space: pre-wrap;
}
.b64-error { margin-top: 20rpx; }
.b64-note { margin-top: 20rpx; }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { convertUrl } from './logic'

const directionOptions: Array<SelectOption<string>> = [
  { label: '编码', value: 'encode' },
  { label: '解码', value: 'decode' }
]
const direction = ref<string | number>('encode')
const text = ref('')
const spaceAsPlus = ref(false)

const outcome = computed(() =>
  convertUrl(text.value, direction.value === 'decode' ? 'decode' : 'encode', spaceAsPlus.value)
)
const resultText = computed(() => (outcome.value.ok ? outcome.value.value : ''))
const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value : undefined))

function swap() {
  if (!outcome.value.ok) return
  text.value = outcome.value.value
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
}

function useExample() {
  text.value = 'https://example.com/search?关键词=一键工具狗&from=小程序'
  direction.value = 'encode'
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="direction" :options="directionOptions" />
      <view class="divider"></view>
      <FormField
        :label="direction === 'decode' ? '百分号编码内容' : '要编码的文本或网址'"
        hint="按 UTF-8 逐字节编码，中文、空格与符号都能正确处理"
      >
        <textarea
          class="field-textarea url-input"
          :value="text"
          :maxlength="-1"
          placeholder="在这里输入或粘贴内容"
          @input="text = $event.detail.value"
        />
      </FormField>
      <SwitchRow
        v-model="spaceAsPlus"
        label="空格编码为 +"
        hint="表单提交格式；关闭时按标准编码为 %20"
      />
      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
        <view class="btn btn--plain btn--sm" @click="useExample">填入网址示例</view>
        <view class="btn btn--plain btn--sm" @click="swap">结果放回输入</view>
      </view>
    </view>

    <view v-if="!outcome.ok" class="note note--danger url-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <ResultPanel :title="direction === 'decode' ? '解码文本' : '编码结果'" :copy-text="copyText">
        <text v-if="outcome.ok" class="url-output" selectable>{{ resultText }}</text>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info url-note">
        编码基于 RFC 3986：字母、数字与 - . _ ~ 保持原样，其余字节转为 %XX（大写十六进制）。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.url-input { height: 300rpx; }
.url-output {
  display: block;
  font-size: 27rpx;
  line-height: 1.75;
  color: #222222;
  word-break: break-all;
  white-space: pre-wrap;
}
.url-error { margin-top: 20rpx; }
.url-note { margin-top: 20rpx; }
</style>

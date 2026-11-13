<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import FormField from '@/components/FormField.vue'
import Segmented from '@/components/Segmented.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { formatJson, JSON_MODES } from './logic'
import type { JsonMode } from './logic'

const mode = ref<JsonMode>('pretty')
const text = ref('')
const indentOptions: Array<SelectOption<number>> = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: '1 空格', value: 1 }
]
const indent = ref<string | number>(2)

const outcome = computed(() => formatJson(text.value, mode.value, Number(indent.value) || 2))
const copyText = computed<string | undefined>(() => (outcome.value.ok ? outcome.value.value.text : undefined))

function useExample() {
  text.value = '{"name":"一键工具狗","local":true,"tools":["JSON 格式化","时间戳转换"],"count":2}'
  mode.value = 'pretty'
}
</script>

<template>
  <view>
    <view class="card">
      <scroll-view scroll-x class="jf-scroll">
        <view
          v-for="item in JSON_MODES"
          :key="item.id"
          class="pill"
          :class="{ 'pill--active': mode === item.id }"
          @click="mode = item.id"
        >{{ item.label }}</view>
      </scroll-view>
      <view class="divider"></view>

      <FormField
        label="输入内容"
        :hint="mode === 'escape' ? '把任意文本转成可嵌入 JSON 的字符串' : mode === 'unescape' ? '请粘贴带首尾双引号的 JSON 字符串' : '在这里输入或粘贴 JSON 文本'"
      >
        <textarea
          class="field-textarea jf-input"
          :value="text"
          :maxlength="-1"
          placeholder="在这里粘贴 JSON，或点下方「填入示例」"
          @input="text = $event.detail.value"
        />
      </FormField>

      <view v-if="mode === 'pretty'" class="jf-indent">
        <text class="jf-indent__label">缩进</text>
        <Segmented v-model="indent" :options="indentOptions" />
      </view>

      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
        <view class="btn btn--plain btn--sm" @click="useExample">填入示例</view>
      </view>
    </view>

    <view v-if="!outcome.ok" class="note note--danger jf-error">{{ outcome.message }}</view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">处理结果</view>
        <view class="section-more">{{ outcome.ok ? outcome.value.info : '请检查输入' }}</view>
      </view>
      <ResultPanel title="输出" :copy-text="copyText">
        <template v-if="outcome.ok">
          <text class="jf-output" selectable>{{ outcome.value.text }}</text>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
      <view class="note note--info jf-note">
        解析与格式化都在手机本机完成，内容不会上传，也不会写入本地存储。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.jf-scroll { width: 100%; white-space: nowrap; }
.jf-scroll .pill { display: inline-block; line-height: 60rpx; margin-right: 14rpx; }
.jf-scroll .pill:last-child { margin-right: 0; }
.jf-input { height: 380rpx; }
.jf-indent { margin-bottom: 24rpx; }
.jf-indent__label { display: block; font-size: 27rpx; color: #444444; margin-bottom: 12rpx; font-weight: 500; }
.jf-output {
  display: block;
  font-size: 25rpx;
  line-height: 1.7;
  color: #222222;
  word-break: break-all;
  white-space: pre-wrap;
}
.jf-error { margin-top: 20rpx; }
.jf-note { margin-top: 20rpx; }
</style>

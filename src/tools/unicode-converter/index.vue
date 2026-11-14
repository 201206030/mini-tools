<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { copyText } from '@/services/clipboard'
import { convertUnicode, decodeUnicode, codePointText } from './logic'
import type { UnicodeFormat } from './logic'

interface DetailItem {
  char: string
  codePoint: number
  output: string
}

const directionOptions: Array<SelectOption<string>> = [
  { label: '编码', value: 'encode' },
  { label: '解码', value: 'decode' }
]
const formatOptions: Array<SelectOption<string>> = [
  { label: '转义', value: 'u4' },
  { label: '大括号', value: 'uBrace' },
  { label: '码点', value: 'uPlus' },
  { label: '实体', value: 'html' },
  { label: '十进制', value: 'decimal' },
  { label: '字节', value: 'utf8' }
]
const formatHints: Record<UnicodeFormat, string> = {
  u4: '\\uXXXX 形式；增补平面字符拆成代理对两条，如 \\uD83D\\uDE00',
  uBrace: '\\u{XXXX} 形式，如 \\u{1F600}',
  uPlus: 'U+XXXX 形式，如 U+4E2D',
  html: 'HTML 十六进制实体，如 &#x4E2D;',
  decimal: '十进制码点，如 20013',
  utf8: 'UTF-8 字节十六进制，如 E4 B8 AD'
}

const direction = ref<string | number>('encode')
const format = ref<string | number>('u4')
const text = ref('')

const isEncode = computed(() => direction.value !== 'decode')
const currentFormat = computed<UnicodeFormat>(() => format.value as UnicodeFormat)
const formatHint = computed(() => formatHints[currentFormat.value])

const placeholder = computed(() =>
  isEncode.value
    ? '输入要编码的文本，支持中文与 Emoji'
    : '粘贴 \\uXXXX、U+XXXX、&#x4E2D;、十进制码点或 UTF-8 字节'
)

const encoded = computed(() => convertUnicode(text.value, currentFormat.value))
const decoded = computed(() => decodeUnicode(text.value))

const resultText = computed(() => {
  if (isEncode.value) return encoded.value.ok ? encoded.value.value.result : ''
  return decoded.value.ok ? decoded.value.value : ''
})
const copyTextValue = computed<string | undefined>(() => {
  if (isEncode.value) return encoded.value.ok ? encoded.value.value.result : undefined
  return decoded.value.ok ? decoded.value.value : undefined
})
const errorMessage = computed(() => {
  const outcome = isEncode.value ? encoded.value : decoded.value
  return outcome.ok ? '' : outcome.message
})

const detailItems = computed<DetailItem[]>(() => {
  if (isEncode.value) return encoded.value.ok ? encoded.value.value.items : []
  if (!decoded.value.ok) return []
  return Array.from(decoded.value.value).map((char) => {
    const codePoint = char.codePointAt(0) || 0
    return { char, codePoint, output: codePointText(codePoint) }
  })
})

function copyDetail(item: DetailItem) {
  copyText(item.output)
}

function fillExample() {
  text.value = isEncode.value ? '一键工具狗 🐶' : '\\u4E2D U+6587 \\u{1F600} &#x41;'
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="direction" :options="directionOptions" />
      <view class="divider"></view>

      <view v-if="isEncode" class="uc-format-wrap">
        <text class="field-label">输出格式</text>
        <Segmented v-model="format" :options="formatOptions" />
        <view class="uc-format-hint">{{ formatHint }}</view>
      </view>

      <FormField
        :label="isEncode ? '输入文本' : '待解码内容'"
        :hint="isEncode ? '按码点逐个转换，结果用空格连接' : '可混排多种写法，自动识别'"
      >
        <textarea
          class="field-textarea uc-input"
          :value="text"
          :maxlength="-1"
          :placeholder="placeholder"
          @input="text = $event.detail.value"
        />
      </FormField>

      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="fillExample">填入示例</view>
        <view class="btn btn--plain btn--sm" @click="text = ''">清空</view>
      </view>
    </view>

    <view v-if="errorMessage" class="note note--danger uc-error">{{ errorMessage }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <ResultPanel :title="isEncode ? '编码结果' : '解码文本'" :copy-text="copyTextValue">
        <text v-if="!errorMessage" class="uc-output" selectable>{{ resultText }}</text>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">逐字符明细</view>
        <view class="section-more">共 {{ detailItems.length }} 项 · 点击复制单条</view>
      </view>
      <EmptyState v-if="detailItems.length === 0" text="暂无明细" hint="输入内容后这里会逐个字符列出" />
      <view v-else class="card">
        <view v-for="(item, index) in detailItems" :key="index" class="list-item" @click="copyDetail(item)">
          <view class="uc-detail__char">{{ item.char }}</view>
          <view class="list-item__body">
            <view class="list-item__title uc-detail__out">{{ item.output }}</view>
            <view class="list-item__desc">码点 {{ item.codePoint }} · {{ codePointText(item.codePoint) }}</view>
          </view>
          <view class="tag">复制</view>
        </view>
      </view>
    </view>

    <view class="note note--info uc-note">
      按 Unicode 码点处理，Emoji 等增补平面字符也能正确转换。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.uc-input { height: 260rpx; }
.uc-format-wrap { margin-bottom: 24rpx; }
.uc-format-hint { margin-top: 12rpx; font-size: 23rpx; color: #888888; line-height: 1.6; }
.uc-error { margin-top: 20rpx; }
.uc-output {
  display: block;
  font-size: 28rpx;
  line-height: 1.75;
  color: #222222;
  word-break: break-all;
  white-space: pre-wrap;
}
.uc-detail__char {
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: #f2fbf6;
  border: 1rpx solid #d7efe2;
  border-radius: 12rpx;
  font-size: 34rpx;
  color: #3EAF7C;
}
.uc-detail__out { word-break: break-all; }
.uc-note { margin-top: 24rpx; }
</style>

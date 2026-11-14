<script setup lang="ts">
import { computed, ref } from 'vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { chooseImage, readImageAsBase64, type PickedImage } from '@/services/image'
import { copyText } from '@/services/clipboard'
import { hideLoading, showLoading } from '@/services/feedback'
import { formatFileSize } from '@/utils/format'
import {
  buildCssBackground,
  buildDataUri,
  describeBase64,
  guessMimeType,
  validateBase64Length
} from './logic'

const picked = ref<PickedImage | null>(null)
const base64 = ref('')
const mime = ref('image/png')
const withPrefix = ref(true)
const busy = ref(false)
const errorMsg = ref('')

const dataUri = computed(() => buildDataUri(mime.value, base64.value))
const displayText = computed(() => (withPrefix.value ? dataUri.value : base64.value))
const description = computed(() => describeBase64(base64.value))
const previewText = computed(() => describeBase64(displayText.value).preview)
const cssText = computed(() => buildCssBackground(dataUri.value))
const cssPreview = computed(() => describeBase64(cssText.value).preview)

const sizeText = computed(() => formatFileSize(picked.value ? picked.value.size : 0))
const charsText = computed(() => `${description.value.chars} 字符`)
const bytesText = computed(() => formatFileSize(description.value.bytes))
const paddedText = computed(() => (description.value.padded ? '是' : '否'))

async function convert(image: PickedImage): Promise<void> {
  if (busy.value) return
  busy.value = true
  errorMsg.value = ''
  showLoading('正在转换')
  try {
    const raw = await readImageAsBase64(image.path)
    const lengthError = validateBase64Length(raw)
    if (lengthError) {
      base64.value = ''
      errorMsg.value = lengthError
      return
    }
    base64.value = raw
    mime.value = guessMimeType(image.path)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    base64.value = ''
    errorMsg.value = message || '图片转换失败，请重试'
  } finally {
    hideLoading()
    busy.value = false
  }
}

async function pickImage(): Promise<void> {
  try {
    const image = await chooseImage()
    picked.value = image
    await convert(image)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    // 用户主动取消选择：静默返回，不打扰
    if (message.indexOf('CANCELLED') !== -1) return
    errorMsg.value = message || '选择图片失败，请重试'
  }
}

async function reconvert(): Promise<void> {
  if (picked.value) await convert(picked.value)
}

function copyDataUri(): void {
  copyText(dataUri.value)
}

function copyPure(): void {
  copyText(base64.value)
}
</script>

<template>
  <view>
    <view class="card">
      <view v-if="!picked" class="btn btn--primary btn--block" @click="pickImage">选择图片</view>
      <template v-else>
        <!-- 微信小程序 image 组件对 data URI 支持不一致，预览统一用本地临时路径，data URI 仅用于文本与复制 -->
        <image class="b64-preview" :src="picked.path" mode="aspectFit"></image>
        <view class="btn-row b64-actions">
          <view class="btn btn--plain btn--sm" @click="pickImage">更换图片</view>
          <view class="btn btn--plain btn--sm" :class="{ 'btn--disabled': busy }" @click="reconvert">重新转换</view>
        </view>
      </template>
    </view>

    <view v-if="errorMsg" class="note note--danger b64-tip">{{ errorMsg }}</view>

    <template v-if="base64">
      <view class="section">
        <view class="section-head"><view class="section-title">转换结果</view></view>
        <view class="card">
          <SwitchRow v-model="withPrefix" label="带 data: 前缀" hint="开启后结果包含 data:image/...;base64, 前缀" />
          <view class="divider"></view>
          <ResultPanel title="结果文本" :copy-text="displayText">
            <view class="b64-text">{{ previewText }}</view>
            <view class="stat-line"><text class="stat-line__k">文件大小</text><text class="stat-line__v">{{ sizeText }}</text></view>
            <view class="stat-line"><text class="stat-line__k">Base64 字符数</text><text class="stat-line__v">{{ charsText }}</text></view>
            <view class="stat-line"><text class="stat-line__k">估算原始字节</text><text class="stat-line__v">{{ bytesText }}</text></view>
            <view class="stat-line"><text class="stat-line__k">含补位符</text><text class="stat-line__v">{{ paddedText }}</text></view>
          </ResultPanel>
          <view class="btn-row b64-copy">
            <view class="btn btn--primary" @click="copyDataUri">复制 Data URI</view>
            <view class="btn btn--plain" @click="copyPure">复制纯 Base64</view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><view class="section-title">CSS 用法</view></view>
        <ResultPanel title="background-image" :copy-text="cssText">
          <view class="b64-text b64-text--sm">{{ cssPreview }}</view>
        </ResultPanel>
      </view>
    </template>

    <EmptyState v-else-if="!busy && !errorMsg" text="还没有转换结果" hint="选择一张 1MB 以内的图片即可转换" />

    <view class="note note--info b64-tip">
      图片限制 1MB 以内，转换只在本机完成，不会上传；Base64 文本约为原文件体积的 4/3。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.b64-preview { width: 100%; height: 300rpx; background: #F7F8FA; border-radius: 16rpx; }
.b64-actions { margin-top: 24rpx; }
.b64-tip { margin-top: 24rpx; }
.b64-copy { margin-top: 24rpx; }
.b64-text {
  word-break: break-all;
  background: #F7F8FA;
  border: 1rpx solid #EEEEEE;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #222222;
  margin-bottom: 12rpx;
}
.b64-text--sm { font-size: 22rpx; color: #888888; }
</style>

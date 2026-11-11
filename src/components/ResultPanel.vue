<script setup lang="ts">
import { copyText as doCopyText } from '@/services/clipboard'

const props = withDefaults(
  defineProps<{
    title?: string
    copyText?: string
    copyLabel?: string
  }>(),
  { title: '结果', copyLabel: '复制' }
)

function handleCopy() {
  if (props.copyText !== undefined) doCopyText(props.copyText)
}
</script>

<template>
  <view class="result">
    <view v-if="title || copyText !== undefined" class="result__head">
      <text class="result__title">{{ title }}</text>
      <view v-if="copyText !== undefined" class="result__copy" @click="handleCopy">{{ copyLabel }}</view>
    </view>
    <slot></slot>
  </view>
</template>

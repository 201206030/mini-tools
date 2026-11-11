<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    hint?: string
  }>(),
  { text: '这里还没有内容', hint: '' }
)
</script>

<template>
  <view class="empty">
    <view class="empty__shape">
      <view class="empty__line empty__line--a"></view>
      <view class="empty__line empty__line--b"></view>
      <view class="empty__line empty__line--c"></view>
    </view>
    <view class="empty__text">{{ text }}</view>
    <view v-if="hint" class="empty__hint">{{ hint }}</view>
  </view>
</template>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 20rpx 64rpx;
}
.empty__shape {
  width: 108rpx;
  height: 108rpx;
  border: 3rpx solid #dfe7e3;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 24rpx;
}
.empty__line { height: 6rpx; border-radius: 6rpx; background: #dfe7e3; }
/* 替代 flex gap，保证三条示意线在低版本 WebView 上仍然分开 */
.empty__line + .empty__line { margin-top: 12rpx; }
.empty__line--a { width: 56rpx; }
.empty__line--b { width: 42rpx; }
.empty__line--c { width: 30rpx; }
.empty__text { font-size: 27rpx; color: #888888; }
.empty__hint { font-size: 23rpx; color: #b0b6b2; margin-top: 8rpx; }
</style>

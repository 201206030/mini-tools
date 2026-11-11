<script setup lang="ts">
import type { ToolMeta } from '@/types/tool'
import { getCategory } from '@/data/categories'
import ToolIcon from './ToolIcon.vue'

const props = defineProps<{
  tool: ToolMeta
  favorited?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-favorite'): void
}>()

const categoryName = getCategory(props.tool.category).name

function goBack() {
  try {
    uni.navigateBack({
      fail: () => uni.reLaunch({ url: '/pages/index/index' })
    })
  } catch {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<template>
  <view class="tool-header">
    <view class="tool-header__nav" @click="goBack">
      <view class="tool-header__back"></view>
      <text>返回</text>
    </view>

    <view class="tool-header__card card">
      <ToolIcon :glyph="tool.icon" :category="tool.category" :size="96" />
      <view class="tool-header__body">
        <view class="tool-header__name">{{ tool.name }}</view>
        <view class="tool-header__tag">{{ categoryName }}</view>
        <view class="tool-header__desc">{{ tool.desc }}</view>
      </view>
      <view
        class="tool-header__fav"
        :class="{ 'tool-header__fav--on': favorited }"
        @click="emit('toggle-favorite')"
      >
        {{ favorited ? '已收藏' : '收藏' }}
      </view>
    </view>

    <view v-if="tool.tip" class="note note--info tool-header__tip">{{ tool.tip }}</view>
  </view>
</template>

<style lang="scss" scoped>
.tool-header__nav {
  display: flex;
  align-items: center;
  height: 56rpx;
  font-size: 26rpx;
  color: #888888;
}
.tool-header__nav:active { opacity: 0.6; }

.tool-header__back {
  width: 16rpx;
  height: 16rpx;
  border-left: 3rpx solid #888888;
  border-bottom: 3rpx solid #888888;
  transform: rotate(45deg);
  /* 替代 flex gap，避免旧 WebView 上返回箭头与文字贴在一起 */
  margin-right: 8rpx;
}

.tool-header__card {
  display: flex;
  align-items: flex-start;
  margin-top: 8rpx;
  position: relative;
  padding-right: 120rpx;
}

.tool-header__body { flex: 1; min-width: 0; margin-left: 22rpx; }
.tool-header__name { font-size: 34rpx; font-weight: 700; color: #222222; line-height: 1.3; }
.tool-header__tag {
  display: inline-block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #888888;
  background: #f3f4f6;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}
.tool-header__desc { font-size: 24rpx; color: #888888; margin-top: 10rpx; line-height: 1.5; }

.tool-header__fav {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  font-size: 24rpx;
  color: #888888;
  border: 1rpx solid #dddddd;
  border-radius: 24rpx;
  padding: 6rpx 18rpx;
}
.tool-header__fav--on {
  color: #2e9b6b;
  border-color: #bfe4d1;
  background: #e8f6ef;
}
.tool-header__tip { margin-top: 20rpx; }
</style>

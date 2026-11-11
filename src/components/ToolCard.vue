<script setup lang="ts">
import type { ToolMeta } from '@/types/tool'
import ToolIcon from './ToolIcon.vue'

withDefaults(
  defineProps<{
    tool: ToolMeta
    favorited?: boolean
    showFavorite?: boolean
    layout?: 'grid' | 'list'
  }>(),
  { favorited: false, showFavorite: true, layout: 'grid' }
)

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'toggle-favorite', id: string): void
}>()
</script>

<template>
  <view class="tool-card" :class="'tool-card--' + layout" @click="emit('open', tool.id)">
    <view
      v-if="showFavorite"
      class="tool-card__fav"
      :class="{ 'tool-card__fav--on': favorited }"
      @click.stop="emit('toggle-favorite', tool.id)"
    >
      {{ favorited ? '已收藏' : '收藏' }}
    </view>

    <ToolIcon :glyph="tool.icon" :category="tool.category" :size="layout === 'grid' ? 86 : 76" />

    <view class="tool-card__body">
      <view class="tool-card__name">{{ tool.name }}</view>
      <view class="tool-card__desc">{{ tool.desc }}</view>
    </view>

    <view v-if="layout === 'list'" class="tool-card__arrow"></view>
  </view>
</template>

<style lang="scss" scoped>
.tool-card {
  position: relative;
  background: #ffffff;
  border: 1rpx solid #eeeeee;
  border-radius: 20rpx;
  overflow: hidden;
}
.tool-card:active { background: #fafcfb; }

.tool-card--grid {
  padding: 26rpx 22rpx 24rpx;
  min-height: 216rpx;
  display: flex;
  flex-direction: column;
}

.tool-card--list {
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  /* 纵向列表的卡片间距由卡片自身提供，不依赖父容器的 flex gap */
  margin-bottom: 20rpx;
}
/* 不用 flex gap：部分 Android WebView / 旧基础库不解析，图标会贴住文字 */
.tool-card--list .tool-card__body { margin-left: 22rpx; }
.tool-card--list .tool-card__arrow { margin-left: 22rpx; }

.tool-card__body {
  min-width: 0;
  flex: 1;
}
.tool-card--grid .tool-card__body { margin-top: 18rpx; }

.tool-card__name {
  font-size: 29rpx;
  font-weight: 600;
  color: #222222;
  line-height: 1.35;
}

.tool-card__desc {
  font-size: 22rpx;
  color: #999999;
  line-height: 1.45;
  margin-top: 6rpx;
}
.tool-card--grid .tool-card__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.tool-card--list .tool-card__desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-card__fav {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8rpx 16rpx;
  font-size: 21rpx;
  color: #aaaaaa;
  background: #f7f8fa;
  border-bottom-left-radius: 14rpx;
  z-index: 2;
}
.tool-card__fav--on {
  color: #2e9b6b;
  background: #e8f6ef;
}

.tool-card__arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #cccccc;
  border-right: 3rpx solid #cccccc;
  transform: rotate(45deg);
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
import type { Category } from '@/types/tool'
import { TOOLS } from '@/data/tools'

const props = defineProps<{
  categories: Category[]
  activeId?: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

function countOf(id: string): number {
  return TOOLS.filter((tool) => tool.category === id).length
}
</script>

<template>
  <view class="category-grid grid grid--2">
    <view
      v-for="item in categories"
      :key="item.id"
      class="category-card grid-cell"
      :class="{ 'category-card--active': activeId === item.id }"
      :style="{ background: item.tint }"
      @click="emit('select', item.id)"
    >
      <view class="category-card__icon" :style="{ background: item.color }">{{ item.icon }}</view>
      <view class="category-card__body">
        <view class="category-card__name">{{ item.name }}</view>
        <view class="category-card__desc">{{ item.desc }}</view>
      </view>
      <view class="category-card__count">{{ countOf(item.id) }} 个</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.category-card {
  position: relative;
  border-radius: 20rpx;
  padding: 24rpx 22rpx;
  /* 描述固定两行后，所有卡片的自然高度一致；这里再给一个统一的最小高度兜底，
     避免不同机型字体行高差异让某一排卡片变矮。 */
  min-height: 230rpx;
  box-sizing: border-box;
  border: 2rpx solid transparent;
}
.category-card--active { border-color: #3eaf7c; }
.category-card:active { opacity: 0.82; }

.category-card__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  color: #ffffff;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14rpx;
}
.category-card__name { font-size: 29rpx; font-weight: 600; color: #333333; }
.category-card__desc {
  font-size: 22rpx;
  color: #7c8580;
  margin-top: 4rpx;
  line-height: 1.45;
  /* 固定占两行：短描述（如「压缩、尺寸、取色与编码」）不再让中间一排卡片矮一截；
     超长描述最多显示两行，避免个别机型折三行再次撑高该排。 */
  min-height: 64rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.category-card__count {
  position: absolute;
  top: 24rpx;
  right: 22rpx;
  font-size: 21rpx;
  color: #7c8580;
}
</style>

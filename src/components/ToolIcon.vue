<script setup lang="ts">
import { computed } from 'vue'
import { getCategory } from '@/data/categories'
import type { CategoryId } from '@/types/tool'

const props = withDefaults(
  defineProps<{
    glyph: string
    category?: CategoryId | string
    size?: number
    radius?: number
  }>(),
  { size: 88, radius: 20 }
)

const style = computed(() => {
  const category = getCategory((props.category || 'calc') as CategoryId)
  return {
    width: `${props.size}rpx`,
    height: `${props.size}rpx`,
    borderRadius: `${props.radius}rpx`,
    background: category.tint,
    color: category.color,
    fontSize: `${Math.round(props.size * 0.44)}rpx`,
    border: `1rpx solid ${category.color}22`
  }
})
</script>

<template>
  <view class="icon-tile" :style="style">{{ glyph }}</view>
</template>

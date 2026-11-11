<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    hint?: string
    required?: boolean
  }>(),
  { hint: '', required: false }
)
</script>

<template>
  <view class="field">
    <text class="field-label" :class="{ 'field-label__req': required }">{{ label }}</text>
    <slot></slot>
    <view v-if="hint" class="field-hint">{{ hint }}</view>
  </view>
</template>

<!-- 表单间距由组件自己用 padding-bottom 保证，不依赖全局 .field 的 margin-bottom：
     1) 组件根节点在自身 WXML 中永远是唯一的子节点，必然命中 :last-child，
        任何全局 .field:last-child 清零规则都会误伤每一个表单字段；
     2) padding 渲染在组件内部，不受组件宿主节点、margin 折叠或基础库差异影响，
        在部分 Android WebView 上比根节点 margin 更稳定。
     label / hint 样式一并写在组件内，减少对 app.wxss 穿透的依赖。
     这里显式把全局 margin-bottom 归零，避免与 padding 叠加成双倍间距。 -->
<style lang="scss" scoped>
.field { margin-bottom: 0; padding-bottom: 24rpx; }
.field-label {
  display: block;
  font-size: 27rpx;
  color: #444444;
  margin-bottom: 12rpx;
  font-weight: 500;
}
.field-label__req::after {
  content: ' *';
  color: #e05252;
}
.field-hint {
  font-size: 23rpx;
  color: #999999;
  margin-top: 10rpx;
  line-height: 1.55;
}
</style>

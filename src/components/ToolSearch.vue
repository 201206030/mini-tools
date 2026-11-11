<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  { placeholder: '搜索工具，例如：日期、图片、抽签' }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(event: any) {
  emit('update:modelValue', String((event && event.detail && event.detail.value) || ''))
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <view class="tool-search">
    <view class="tool-search__icon"></view>
    <input
      class="tool-search__input"
      :value="modelValue"
      :placeholder="placeholder"
      placeholder-class="tool-search__placeholder"
      confirm-type="search"
      :adjust-position="true"
      @input="onInput"
    />
    <view v-if="modelValue" class="tool-search__clear" @click="clear">×</view>
  </view>
</template>

<style lang="scss" scoped>
.tool-search {
  display: flex;
  align-items: center;
  height: 84rpx;
  padding: 0 22rpx;
  background: #ffffff;
  border: 1rpx solid #eeeeee;
  border-radius: 18rpx;
}

.tool-search__icon {
  width: 26rpx;
  height: 26rpx;
  border: 3rpx solid #9aa3a0;
  border-radius: 50%;
  position: relative;
  margin-right: 22rpx;
  flex-shrink: 0;
}
.tool-search__icon::after {
  content: '';
  position: absolute;
  width: 14rpx;
  height: 3rpx;
  background: #9aa3a0;
  border-radius: 3rpx;
  right: -11rpx;
  bottom: -3rpx;
  transform: rotate(45deg);
}

.tool-search__input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #222222;
}
.tool-search__placeholder { color: #b5bbc0; font-size: 26rpx; }

.tool-search__clear {
  width: 40rpx;
  height: 40rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 50%;
  background: #e9ebee;
  color: #888888;
  font-size: 30rpx;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    content?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    title: '请确认',
    content: '',
    confirmText: '确定',
    cancelText: '取消',
    danger: false
  }
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <view v-if="visible" class="dialog-mask" @click="emit('cancel')">
    <view class="dialog" @click.stop>
      <view class="dialog__title">{{ title }}</view>
      <view v-if="content" class="dialog__content">{{ content }}</view>
      <view class="dialog__actions">
        <view class="dialog__btn" @click="emit('cancel')">{{ cancelText }}</view>
        <view class="dialog__btn dialog__btn--primary" :class="{ 'dialog__btn--danger': danger }" @click="emit('confirm')">
          {{ confirmText }}
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.dialog-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.dialog {
  width: 580rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  padding-top: 40rpx;
}
.dialog__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222222;
  text-align: center;
}
.dialog__content {
  font-size: 27rpx;
  color: #666666;
  line-height: 1.7;
  padding: 24rpx 44rpx 36rpx;
  text-align: center;
}
.dialog__actions {
  display: flex;
  border-top: 1rpx solid #eeeeee;
}
.dialog__btn {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  font-size: 29rpx;
  color: #666666;
  border-right: 1rpx solid #eeeeee;
}
.dialog__btn:last-child { border-right: none; }
.dialog__btn:active { background: #f7f8fa; }
.dialog__btn--primary { color: #3eaf7c; font-weight: 600; }
.dialog__btn--danger { color: #d05252; }
</style>

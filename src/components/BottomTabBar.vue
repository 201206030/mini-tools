<script setup lang="ts">
const props = defineProps<{
  active: 'home' | 'mine'
}>()

function go(target: 'home' | 'mine') {
  if (target === props.active) return
  uni.reLaunch({ url: target === 'home' ? '/pages/index/index' : '/pages/mine/index' })
}
</script>

<template>
  <view class="tabbar">
    <view class="tabbar__item" :class="{ 'tabbar__item--active': active === 'home' }" @click="go('home')">
      <image v-if="active === 'home'" class="tab-ico" src="/static/tab/home-active.png" mode="aspectFit" />
      <image v-else class="tab-ico" src="/static/tab/home.png" mode="aspectFit" />
      <text class="tabbar__label">首页</text>
    </view>
    <view class="tabbar__item" :class="{ 'tabbar__item--active': active === 'mine' }" @click="go('mine')">
      <image v-if="active === 'mine'" class="tab-ico" src="/static/tab/mine-active.png" mode="aspectFit" />
      <image v-else class="tab-ico" src="/static/tab/mine.png" mode="aspectFit" />
      <text class="tabbar__label">我的</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(108rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  background: #ffffff;
  border-top: 1rpx solid #eeeeee;
  z-index: 100;
}
.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.tabbar__label { font-size: 22rpx; color: #999999; margin-top: 6rpx; }
.tabbar__item--active .tabbar__label { color: #3eaf7c; font-weight: 600; }

/* 每个状态使用一张完整 PNG 图标，不再用 CSS 伪元素拼接上下两块，
   避免不同机型对伪元素盒模型与 rpx 舍入的差异导致图标上下错位。 */
.tab-ico {
  display: block;
  width: 40rpx;
  height: 40rpx;
}
</style>

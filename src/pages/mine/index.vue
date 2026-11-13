<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { showSuccess } from '@/services/feedback'
import ToolCard from '@/components/ToolCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'

const store = useAppStore()
const openedDoc = ref<'usage' | 'privacy' | 'about' | ''>('')
const showClearDialog = ref(false)

const favoriteCount = computed(() => store.favoriteTools.length)
const recentCount = computed(() => store.recentTools.length)

const usageText = [
  '1. 在首页搜索工具名称，或按「计算 / 生活 / 图片 / 文本 / 学习 / 办公」六大分类查找。',
  '2. 点击工具卡片进入详情页，按提示填写内容，结果会即时显示。',
  '3. 结果可以一键复制；二维码、图片类工具可保存到手机相册。',
  '4. 首次保存图片时会申请相册权限，拒绝后可在系统设置中重新开启。',
  '5. 点详情页右上角「收藏」，工具会出现在首页「我的常用」。',
  '6. 最近使用最多保留 10 条，只记录工具名称和打开时间。',
  '7. 汇率计算器首次使用需联网获取一次公开参考汇率，之后保存在本机，断网也能换算。',
  '8. 全部工具无需注册登录，关闭页面后不会保留输入的内容。'
]

const privacyText = [
  '· 一键工具狗没有后端服务；除汇率计算器获取公开参考汇率外，不依赖联网即可使用。',
  '· 你输入的文字、数字、金额、选择的图片都只在手机本机处理，不会上传到任何服务器。',
  '· 汇率计算器只在获取公开参考汇率时联网，请求地址固定，不会上传你输入的金额或换算记录。',
  '· 汇率数据保存在本机，24 小时内不会重复联网；页面会标明数据时间与状态，不会冒充实时汇率。',
  '· 图片工具仅在保存到相册时申请「添加到相册」权限，不会读取相册里的其他照片。',
  '· 本地只保存：收藏的工具、最近使用的工具编号与时间、少量使用偏好，以及一份公开汇率缓存。',
  '· 不保存你输入的文本、图片、生成的密码，也不保存计算与换算结果。',
  '· 不接入第三方统计、广告或用户识别服务，不申请与功能无关的权限。',
  '· 点击「复制」时只把结果写入系统剪贴板，不会读取剪贴板里已有的内容。',
  '· 二维码内容不会被上传；密码生成结果只在当前页面显示，不写入历史。',
  '· 个税、房贷与汇率结果仅供参考，请以官方口径、银行牌价和合同约定为准。',
  '· 你可以在本页「清除本地数据」一次性删除全部本地记录，包括汇率缓存。'
]

function toggleDoc(name: 'usage' | 'privacy' | 'about') {
  openedDoc.value = openedDoc.value === name ? '' : name
}

function openTool(id: string) {
  uni.navigateTo({ url: `/pages/tool/detail?id=${id}` })
}

function removeFavorite(id: string) {
  store.removeFavorite(id)
  showSuccess('已取消收藏')
}

function confirmClearRecent() {
  store.clearRecent()
  showSuccess('已清空最近使用')
}

function confirmClearAll() {
  showClearDialog.value = false
  store.clearAllData()
  showSuccess('本地数据已清除')
}

onShow(() => {
  store.hydrate()
})
</script>

<template>
  <view class="page page--tabbar mine">
    <view class="mine__hero">
      <image class="mine__logo" src="/static/logo.png" mode="aspectFit" />
      <view class="mine__hero-title">一键工具狗</view>
      <view class="mine__hero-slogan">汪！你需要的工具，这里都有。</view>
      <view class="mine__hero-tags">
        <text class="mine__hero-tag">无需登录</text>
        <text class="mine__hero-tag">本机处理</text>
        <text class="mine__hero-tag">没有广告</text>
      </view>
    </view>

    <!-- 我的收藏 -->
    <view class="section">
      <view class="section-head">
        <view class="section-title">我的收藏</view>
        <view class="section-more">共 {{ favoriteCount }} 个</view>
      </view>
      <EmptyState v-if="favoriteCount === 0" text="还没有收藏工具" hint="在工具详情页点「收藏」即可加入" />
      <view v-else class="mine__list">
        <ToolCard
          v-for="item in store.favoriteTools"
          :key="item.id"
          layout="list"
          :tool="item"
          :show-favorite="true"
          :favorited="true"
          @open="openTool"
          @toggle-favorite="removeFavorite"
        />
      </view>
    </view>

    <!-- 最近使用 -->
    <view class="section">
      <view class="section-head">
        <view class="section-title">最近使用</view>
        <view v-if="recentCount > 0" class="section-more section-more--action" @click="confirmClearRecent">清空历史</view>
        <view v-else class="section-more">最多保留 10 条</view>
      </view>
      <EmptyState v-if="recentCount === 0" text="还没有使用记录" hint="打开任意工具后会出现在这里" />
      <view v-else class="mine__list">
        <ToolCard
          v-for="item in store.recentTools"
          :key="item.id"
          layout="list"
          :tool="item"
          :show-favorite="false"
          @open="openTool"
        />
      </view>
    </view>

    <!-- 说明与关于 -->
    <view class="section">
      <view class="section-head"><view class="section-title">帮助与说明</view></view>
      <view class="card mine__docs">
        <view class="list-item" @click="toggleDoc('usage')">
          <view class="list-item__body">
            <view class="list-item__title">使用说明</view>
            <view class="list-item__desc">怎么找到工具、收藏、复制与保存</view>
          </view>
          <view class="mine__chevron" :class="{ 'mine__chevron--open': openedDoc === 'usage' }"></view>
        </view>
        <view v-if="openedDoc === 'usage'" class="mine__doc">
          <view v-for="(line, index) in usageText" :key="index" class="mine__doc-line">{{ line }}</view>
        </view>

        <view class="list-item" @click="toggleDoc('privacy')">
          <view class="list-item__body">
            <view class="list-item__title">隐私说明</view>
            <view class="list-item__desc">我们保存什么、不保存什么</view>
          </view>
          <view class="mine__chevron" :class="{ 'mine__chevron--open': openedDoc === 'privacy' }"></view>
        </view>
        <view v-if="openedDoc === 'privacy'" class="mine__doc">
          <view v-for="(line, index) in privacyText" :key="index" class="mine__doc-line">{{ line }}</view>
        </view>

        <view class="list-item" @click="toggleDoc('about')">
          <view class="list-item__body">
            <view class="list-item__title">关于一键工具狗</view>
            <view class="list-item__desc">版本 1.0.0</view>
          </view>
          <view class="mine__chevron" :class="{ 'mine__chevron--open': openedDoc === 'about' }"></view>
        </view>
        <view v-if="openedDoc === 'about'" class="mine__doc">
          <view class="mine__doc-line">一键工具狗 1.0.0 · 汪！你需要的工具，这里都有。</view>
          <view class="mine__doc-line">提供 6 大分类、23 个工具，覆盖计算、生活、图片、文本、学习与办公；除汇率计算器获取公开参考汇率外，全部在本机运行。</view>
          <view class="mine__doc-line">不设登录、会员、支付和广告，不自建后端服务；联网仅用于下载公开参考汇率，不上传任何输入内容。</view>
          <view class="mine__doc-line">计算与估算结果仅供参考，办理业务请以官方与合同信息为准。</view>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="section">
      <view class="section-head"><view class="section-title">本地数据</view></view>
      <view class="card">
        <view class="mine__data-row">
          <view>
            <view class="list-item__title">清除本地数据</view>
            <view class="list-item__desc">删除收藏、最近使用、偏好设置与已保存的汇率缓存，不影响手机其他数据</view>
          </view>
        </view>
        <view class="btn btn--danger btn--block btn--sm mine__data-btn" @click="showClearDialog = true">清除本地数据</view>
      </view>
    </view>

    <view class="mine__footer">一键工具狗 · 不采集、不上传、不打扰</view>

    <BottomTabBar active="mine" />

    <ConfirmDialog
      :visible="showClearDialog"
      title="清除本地数据？"
      content="将删除全部收藏、最近使用记录、偏好设置和已保存的汇率缓存。这个操作无法撤销，但不会影响你手机里的照片或其他应用的数据。"
      confirm-text="确定清除"
      danger
      @cancel="showClearDialog = false"
      @confirm="confirmClearAll"
    />
  </view>
</template>

<style lang="scss" scoped>
.mine__hero {
  background: #ffffff;
  border: 1rpx solid #eeeeee;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
}
.mine__logo {
  width: 124rpx;
  height: 124rpx;
  border-radius: 24rpx;
  background-color: #e8f6ef;
  margin-bottom: 22rpx;
}
.mine__hero-title { font-size: 40rpx; font-weight: 700; color: #222222; }
.mine__hero-slogan { font-size: 26rpx; color: #888888; margin-top: 8rpx; }
.mine__hero-tags { display: flex; margin-top: 26rpx; }
.mine__hero-tag {
  font-size: 22rpx;
  color: #2e9b6b;
  background: #e8f6ef;
  border-radius: 8rpx;
  padding: 6rpx 16rpx;
  /* 替代 flex gap，避免部分机型上标签贴在一起 */
  margin-right: 14rpx;
}
.mine__hero-tag:last-child { margin-right: 0; }

.mine__list { display: flex; flex-direction: column; }

.mine__docs { padding: 6rpx 28rpx; }
.mine__chevron {
  width: 16rpx;
  height: 16rpx;
  border-right: 3rpx solid #bbbbbb;
  border-bottom: 3rpx solid #bbbbbb;
  transform: rotate(-45deg);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.mine__chevron--open { transform: rotate(45deg); }
.mine__doc {
  background: #f7f8fa;
  border-radius: 14rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 20rpx;
}
.mine__doc-line { font-size: 24rpx; color: #666666; line-height: 1.75; }

.mine__data-row { padding: 4rpx 0 20rpx; }
.mine__data-btn { margin-top: 4rpx; }
.mine__footer { margin-top: 48rpx; text-align: center; font-size: 22rpx; color: #b3b9b6; }
</style>

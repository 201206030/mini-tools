<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTool } from '@/data/tools'
import { useAppStore } from '@/stores/app'
import { showInfo } from '@/services/feedback'
import ToolHeader from '@/components/ToolHeader.vue'
import EmptyState from '@/components/EmptyState.vue'

// 12 个工具均为独立业务模块，静态挂载以适配小程序不支持动态组件的约束
import DateCalculator from '@/tools/date-calculator/index.vue'
import UnitConverter from '@/tools/unit-converter/index.vue'
import MortgageCalculator from '@/tools/mortgage-calculator/index.vue'
import TaxCalculator from '@/tools/tax-calculator/index.vue'
import QrcodeGenerator from '@/tools/qrcode-generator/index.vue'
import RandomNumber from '@/tools/random-number/index.vue'
import RandomPicker from '@/tools/random-picker/index.vue'
import PasswordGenerator from '@/tools/password-generator/index.vue'
import ImageCompressor from '@/tools/image-compressor/index.vue'
import ImageResizer from '@/tools/image-resizer/index.vue'
import WordCounter from '@/tools/word-counter/index.vue'
import TextDeduplicator from '@/tools/text-deduplicator/index.vue'

const store = useAppStore()
const toolId = ref('')
const tool = computed(() => (toolId.value ? getTool(toolId.value) : undefined))

onLoad((options: any) => {
  toolId.value = String((options && options.id) || '')
  const current = getTool(toolId.value)
  if (current) {
    uni.setNavigationBarTitle({ title: current.name })
    store.recordRecent(current.id)
  } else {
    uni.setNavigationBarTitle({ title: '工具详情' })
  }
})

function toggleFavorite() {
  if (!tool.value) return
  const added = store.toggleFavorite(tool.value.id)
  showInfo(added ? '已加入常用工具' : '已取消收藏')
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page detail">
    <template v-if="tool">
      <ToolHeader :tool="tool" :favorited="store.isFavorite(tool.id)" @toggle-favorite="toggleFavorite" />

      <view class="detail__body">
        <DateCalculator v-if="tool.id === 'date-calculator'" />
        <UnitConverter v-else-if="tool.id === 'unit-converter'" />
        <MortgageCalculator v-else-if="tool.id === 'mortgage-calculator'" />
        <TaxCalculator v-else-if="tool.id === 'tax-calculator'" />
        <QrcodeGenerator v-else-if="tool.id === 'qrcode-generator'" />
        <RandomNumber v-else-if="tool.id === 'random-number'" />
        <RandomPicker v-else-if="tool.id === 'random-picker'" />
        <PasswordGenerator v-else-if="tool.id === 'password-generator'" />
        <ImageCompressor v-else-if="tool.id === 'image-compressor'" />
        <ImageResizer v-else-if="tool.id === 'image-resizer'" />
        <WordCounter v-else-if="tool.id === 'word-counter'" />
        <TextDeduplicator v-else-if="tool.id === 'text-deduplicator'" />
      </view>

      <view class="detail__footer">本工具在本机完成处理，不会上传你的输入内容</view>
    </template>

    <template v-else>
      <EmptyState text="没有找到这个工具" hint="可能链接已失效，请返回首页重新选择" />
      <view class="btn btn--primary btn--block" @click="goHome">回到首页</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.detail__body { margin-top: 28rpx; }
.detail__footer {
  margin-top: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b3b9b6;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTool } from '@/data/tools'
import { useAppStore } from '@/stores/app'
import { showInfo } from '@/services/feedback'
import ToolHeader from '@/components/ToolHeader.vue'
import EmptyState from '@/components/EmptyState.vue'

// 所有工具均为独立业务模块，静态挂载以适配小程序不支持动态组件的约束
import DateCalculator from '@/tools/date-calculator/index.vue'
import UnitConverter from '@/tools/unit-converter/index.vue'
import MortgageCalculator from '@/tools/mortgage-calculator/index.vue'
import TaxCalculator from '@/tools/tax-calculator/index.vue'
import ExchangeRate from '@/tools/exchange-rate/index.vue'
import QrcodeGenerator from '@/tools/qrcode-generator/index.vue'
import RandomNumber from '@/tools/random-number/index.vue'
import RandomPicker from '@/tools/random-picker/index.vue'
import PasswordGenerator from '@/tools/password-generator/index.vue'
import ImageCompressor from '@/tools/image-compressor/index.vue'
import ImageResizer from '@/tools/image-resizer/index.vue'
import WordCounter from '@/tools/word-counter/index.vue'
import TextDeduplicator from '@/tools/text-deduplicator/index.vue'
import MathFormulas from '@/tools/math-formulas/index.vue'
import PeriodicTable from '@/tools/periodic-table/index.vue'
import FractionCalculator from '@/tools/fraction-calculator/index.vue'
import MorseCode from '@/tools/morse-code/index.vue'
import RomanNumeral from '@/tools/roman-numeral/index.vue'
import JsonFormatter from '@/tools/json-formatter/index.vue'
import TimestampConverter from '@/tools/timestamp-converter/index.vue'
import Base64Codec from '@/tools/base64-codec/index.vue'
import UrlCodec from '@/tools/url-codec/index.vue'
import UuidGenerator from '@/tools/uuid-generator/index.vue'
import BmiCalculator from '@/tools/bmi-calculator/index.vue'
import BodyFatCalculator from '@/tools/body-fat-calculator/index.vue'
import SleepCalculator from '@/tools/sleep-calculator/index.vue'
import RandomName from '@/tools/random-name/index.vue'
import TextDiff from '@/tools/text-diff/index.vue'
import PrimeNumber from '@/tools/prime-number/index.vue'
import BaseConverter from '@/tools/base-converter/index.vue'
import AsciiTable from '@/tools/ascii-table/index.vue'
import UnicodeConverter from '@/tools/unicode-converter/index.vue'
import ImageColorPicker from '@/tools/image-color-picker/index.vue'
import ImageToBase64 from '@/tools/image-to-base64/index.vue'

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
        <ExchangeRate v-else-if="tool.id === 'exchange-rate'" />
        <QrcodeGenerator v-else-if="tool.id === 'qrcode-generator'" />
        <RandomNumber v-else-if="tool.id === 'random-number'" />
        <RandomPicker v-else-if="tool.id === 'random-picker'" />
        <PasswordGenerator v-else-if="tool.id === 'password-generator'" />
        <ImageCompressor v-else-if="tool.id === 'image-compressor'" />
        <ImageResizer v-else-if="tool.id === 'image-resizer'" />
        <WordCounter v-else-if="tool.id === 'word-counter'" />
        <TextDeduplicator v-else-if="tool.id === 'text-deduplicator'" />
        <MathFormulas v-else-if="tool.id === 'math-formulas'" />
        <PeriodicTable v-else-if="tool.id === 'periodic-table'" />
        <FractionCalculator v-else-if="tool.id === 'fraction-calculator'" />
        <MorseCode v-else-if="tool.id === 'morse-code'" />
        <RomanNumeral v-else-if="tool.id === 'roman-numeral'" />
        <JsonFormatter v-else-if="tool.id === 'json-formatter'" />
        <TimestampConverter v-else-if="tool.id === 'timestamp-converter'" />
        <Base64Codec v-else-if="tool.id === 'base64-codec'" />
        <UrlCodec v-else-if="tool.id === 'url-codec'" />
        <UuidGenerator v-else-if="tool.id === 'uuid-generator'" />
        <BmiCalculator v-else-if="tool.id === 'bmi-calculator'" />
        <BodyFatCalculator v-else-if="tool.id === 'body-fat-calculator'" />
        <SleepCalculator v-else-if="tool.id === 'sleep-calculator'" />
        <RandomName v-else-if="tool.id === 'random-name'" />
        <TextDiff v-else-if="tool.id === 'text-diff'" />
        <PrimeNumber v-else-if="tool.id === 'prime-number'" />
        <BaseConverter v-else-if="tool.id === 'base-converter'" />
        <AsciiTable v-else-if="tool.id === 'ascii-table'" />
        <UnicodeConverter v-else-if="tool.id === 'unicode-converter'" />
        <ImageColorPicker v-else-if="tool.id === 'image-color-picker'" />
        <ImageToBase64 v-else-if="tool.id === 'image-to-base64'" />
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

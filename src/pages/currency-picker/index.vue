<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import Segmented from '@/components/Segmented.vue'
import type { SelectOption } from '@/types/common'
import { loadCachedRates } from '@/services/exchange-rate'
import { searchCurrencies } from '@/tools/exchange-rate/logic'
import type { CurrencySort } from '@/tools/exchange-rate/logic'

const PICK_EVENT = 'currency-picker:select'

const field = ref<'from' | 'to'>('from')
const current = ref('')
const query = ref('')
const sortBy = ref<CurrencySort>('code')
const rates = ref<Record<string, number> | null>(null)

const sortOptions: SelectOption<string>[] = [
  { label: '按代码排序', value: 'code' },
  { label: '按名称排序', value: 'name' }
]

onLoad((options: any) => {
  field.value = options && options.field === 'to' ? 'to' : 'from'
  current.value = String((options && options.current) || '')
  rates.value = loadCachedRates()?.rates ?? null
  uni.setNavigationBarTitle({ title: field.value === 'from' ? '选择原始币种' : '选择目标币种' })
})

const list = computed(() => searchCurrencies(query.value, rates.value, sortBy.value))
const hasRates = computed(() => Object.keys(rates.value || {}).length > 0)

function onQueryInput(event: Event) {
  query.value = String((event.detail && event.detail.value) ?? '')
}

function setSort(value: string | number) {
  sortBy.value = String(value) === 'name' ? 'name' : 'code'
}

function choose(code: string) {
  uni.$emit(PICK_EVENT, { field: field.value, code })
  uni.navigateBack()
}
</script>

<template>
  <view class="page cp">
    <view class="card cp__search">
      <input
        class="field-input"
        type="text"
        :value="query"
        placeholder="搜索中文名、英文名或币种代码"
        @input="onQueryInput"
      />
      <view class="cp__sort">
        <Segmented :model-value="sortBy" :options="sortOptions" @update:model-value="setSort" />
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">{{ field === 'from' ? '原始币种' : '目标币种' }}</view>
        <view class="section-more">共 {{ list.length }} 种</view>
      </view>

      <EmptyState
        v-if="!hasRates"
        text="还没有汇率数据"
        hint="请返回汇率计算器，联网获取一次汇率后再选择币种"
      />
      <EmptyState
        v-else-if="list.length === 0"
        text="没有找到匹配的币种"
        hint="试试币种代码，例如 USD、JPY"
      />
      <view v-else class="card cp__list">
        <view
          v-for="item in list"
          :key="item.code"
          class="list-item cp__item"
          @click="choose(item.code)"
        >
          <view class="cp__symbol">{{ item.symbol }}</view>
          <view class="list-item__body">
            <view class="list-item__title">{{ item.nameCn }} · {{ item.code }}</view>
            <view class="list-item__desc">{{ item.nameEn }}</view>
          </view>
          <view v-if="item.code === current" class="tag tag--brand">当前</view>
        </view>
      </view>
    </view>

    <view class="note note--info cp__note">这里只展示本机已保存汇率的币种，不会显示没有参考汇率的币种。</view>
  </view>
</template>

<style lang="scss" scoped>
.cp__sort { margin-top: 20rpx; }
.cp__list { padding: 6rpx 28rpx; }
.cp__item { align-items: center; }
.cp__symbol {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #e8f6ef;
  color: #2e9b6b;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 20rpx;
}
.cp__note { margin-top: 24rpx; }
</style>

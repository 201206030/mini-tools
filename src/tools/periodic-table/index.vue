<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  ELEMENTS,
  ELEMENT_CATEGORIES,
  getCategoryColor,
  getCategoryName,
  searchElements
} from './elements'
import type { ChemicalElement, ElementCategory } from './elements'

const query = ref('')
const category = ref<ElementCategory | 'all'>('all')
const selectedNumber = ref(0)

const list = computed(() => searchElements(query.value, category.value))
const selected = computed<ChemicalElement | undefined>(() =>
  selectedNumber.value ? ELEMENTS.find((item) => item.number === selectedNumber.value) : undefined
)

function selectElement(element: ChemicalElement) {
  selectedNumber.value = selectedNumber.value === element.number ? 0 : element.number
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="查找元素" hint="可输入序号、元素符号、中文名或类别，例如 8、Fe、铁、稀有气体">
        <input
          class="field-input"
          type="text"
          :value="query"
          placeholder="留空则按类别显示全部元素"
          @input="query = $event.detail.value"
        />
      </FormField>
      <scroll-view scroll-x class="pt-scroll">
        <view
          v-for="item in ELEMENT_CATEGORIES"
          :key="item.id"
          class="pill"
          :class="{ 'pill--active': category === item.id }"
          @click="category = item.id"
        >{{ item.name }}</view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">元素列表</view>
        <view class="section-more">共 {{ list.length }} 种 · 点击查看详细信息</view>
      </view>
      <EmptyState v-if="list.length === 0" text="没有找到相关元素" hint="试试元素符号，或切回「全部」" />
      <view v-else class="grid grid--4 pt-grid">
        <view v-for="item in list" :key="item.number" class="grid-cell">
          <view
            class="pt-cell"
            :class="{ 'pt-cell--active': selectedNumber === item.number }"
            :style="{ borderColor: getCategoryColor(item.category) }"
            @click="selectElement(item)"
          >
            <view class="pt-cell__num">{{ item.number }}</view>
            <view class="pt-cell__symbol" :style="{ color: getCategoryColor(item.category) }">{{ item.symbol }}</view>
            <view class="pt-cell__name">{{ item.name || '—' }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="selected" class="card pt-detail">
      <view class="pt-detail__head">
        <view class="pt-detail__symbol" :style="{ color: getCategoryColor(selected.category) }">{{ selected.symbol }}</view>
        <view>
          <view class="pt-detail__title">{{ selected.name || '超重元素' }} · {{ selected.symbol }}</view>
          <view class="pt-detail__tag">{{ getCategoryName(selected.category) }} · 第 {{ selected.period }} 周期</view>
        </view>
      </view>
      <view class="divider"></view>
      <view class="stat-line"><text class="stat-line__k">原子序数</text><text class="stat-line__v">{{ selected.number }}</text></view>
      <view class="stat-line"><text class="stat-line__k">元素符号</text><text class="stat-line__v">{{ selected.symbol }}</text></view>
      <view class="stat-line"><text class="stat-line__k">中文名称</text><text class="stat-line__v">{{ selected.name || '以符号为准' }}</text></view>
      <view class="stat-line"><text class="stat-line__k">相对原子质量</text><text class="stat-line__v">{{ selected.mass }}</text></view>
      <view class="stat-line"><text class="stat-line__k">所属周期</text><text class="stat-line__v">第 {{ selected.period }} 周期</text></view>
      <view class="stat-line"><text class="stat-line__k">类别</text><text class="stat-line__v">{{ getCategoryName(selected.category) }}</text></view>
    </view>

    <view class="note note--info pt-note">
      相对原子质量取常用标准值；带方括号的数字是放射性元素最稳定同位素的质量数。104 号及以后元素的中文名用字较生僻，部分机型字体无法显示，因此这里统一以元素符号为准。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pt-scroll { width: 100%; white-space: nowrap; }
.pt-scroll .pill { display: inline-block; line-height: 60rpx; margin-right: 14rpx; }
.pt-scroll .pill:last-child { margin-right: 0; }
.pt-grid { justify-content: flex-start; }
.pt-grid > .grid-cell { width: 24%; margin-right: 1.3%; }
.pt-grid > .grid-cell:nth-child(4n) { margin-right: 0; }
.pt-cell {
  background: #ffffff;
  border: 2rpx solid #dddddd;
  border-radius: 12rpx;
  padding: 10rpx 4rpx;
  text-align: center;
  min-height: 116rpx;
}
.pt-cell--active { background: #f2fbf6; }
.pt-cell:active { opacity: 0.75; }
.pt-cell__num { font-size: 19rpx; color: #999999; line-height: 1.3; }
.pt-cell__symbol { font-size: 32rpx; font-weight: 700; line-height: 1.4; }
.pt-cell__name { font-size: 20rpx; color: #666666; line-height: 1.3; }
.pt-detail__head { display: flex; align-items: center; }
.pt-detail__symbol { font-size: 64rpx; font-weight: 700; width: 120rpx; }
.pt-detail__title { font-size: 30rpx; font-weight: 600; color: #222222; }
.pt-detail__tag { font-size: 23rpx; color: #888888; margin-top: 6rpx; }
.pt-note { margin-top: 24rpx; }
</style>

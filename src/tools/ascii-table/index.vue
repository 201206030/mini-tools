<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import EmptyState from '@/components/EmptyState.vue'
import { copyText } from '@/services/clipboard'
import {
  ASCII_CATEGORIES,
  CATEGORY_LABELS,
  getAscii,
  searchAscii
} from './ascii'
import type { AsciiCategory, AsciiChar } from './ascii'

const query = ref('')
const category = ref('all')

const list = computed(() => searchAscii(query.value, category.value))

const commonControls: AsciiChar[] = [0, 9, 10, 13, 27, 127].map((code) => getAscii(code)!)

function charLabel(item: AsciiChar): string {
  if (item.category === 'space') return 'SP'
  if (item.category === 'control') return 'CTL'
  return item.char
}

function categoryLabel(value: AsciiCategory): string {
  return CATEGORY_LABELS[value]
}

function copyRow(item: AsciiChar) {
  copyText(
    `十进制 ${item.code} · 十六进制 0x${item.hex} · ${charLabel(item)} · ${item.name} · ${categoryLabel(item.category)}`
  )
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="查找字符" hint="可输入码值（65、0x41、41）、字符本身、中文名称或类别名">
        <input
          class="field-input"
          type="text"
          :value="query"
          placeholder="留空则按类别显示全部字符"
          @input="query = $event.detail.value"
        />
      </FormField>
      <scroll-view scroll-x class="at-scroll">
        <view
          v-for="item in ASCII_CATEGORIES"
          :key="item.value"
          class="pill"
          :class="{ 'pill--active': category === item.value }"
          @click="category = item.value"
        >{{ item.label }}</view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">字符列表</view>
        <view class="section-more">共 {{ list.length }} 项 · 点击复制该行</view>
      </view>
      <EmptyState v-if="list.length === 0" text="没有找到相关字符" hint="换个关键词，或切回「全部」类别" />
      <view v-else class="card">
        <view v-for="item in list" :key="item.code" class="list-item" @click="copyRow(item)">
          <view class="at-char">{{ charLabel(item) }}</view>
          <view class="list-item__body">
            <view class="list-item__title">{{ item.name }}</view>
            <view class="list-item__desc">
              十进制 {{ item.code }} · 十六进制 {{ item.hex }} · {{ categoryLabel(item.category) }}
            </view>
          </view>
          <view class="tag">复制</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">常用控制字符</view></view>
      <view class="card">
        <view v-for="item in commonControls" :key="item.code" class="stat-line">
          <text class="stat-line__k">{{ item.name }}</text>
          <text class="stat-line__v">{{ item.hex }} · 十进制 {{ item.code }}</text>
        </view>
      </view>
    </view>

    <view class="note note--info at-note">
      ASCII 共 128 个字符，数据内置在本机，无需联网。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.at-scroll { width: 100%; white-space: nowrap; }
.at-scroll .pill { display: inline-block; line-height: 60rpx; margin-right: 14rpx; }
.at-scroll .pill:last-child { margin-right: 0; }
.at-char {
  width: 96rpx;
  height: 88rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: #f2fbf6;
  border: 1rpx solid #d7efe2;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #3EAF7C;
}
.at-note { margin-top: 24rpx; }
</style>

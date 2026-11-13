<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import EmptyState from '@/components/EmptyState.vue'
import { copyText } from '@/services/clipboard'
import { FORMULA_GROUPS, countByGroup, getGroupName, searchFormulas } from './formulas'
import type { FormulaItem } from './formulas'

const query = ref('')
const groupId = ref('all')
const list = computed(() => searchFormulas(query.value, groupId.value))

function copyFormula(item: FormulaItem) {
  copyText(item.expr)
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="搜索公式" hint="可搜公式名称、内容或分类，例如：勾股、面积、sin">
        <input
          class="field-input"
          type="text"
          :value="query"
          placeholder="输入关键词，留空显示当前分类全部公式"
          @input="query = $event.detail.value"
        />
      </FormField>
      <scroll-view scroll-x class="mf-scroll">
        <view
          v-for="group in FORMULA_GROUPS"
          :key="group.id"
          class="pill"
          :class="{ 'pill--active': groupId === group.id }"
          @click="groupId = group.id"
        >{{ group.name }} {{ countByGroup(group.id) }}</view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">{{ getGroupName(groupId) }}公式</view>
        <view class="section-more">共 {{ list.length }} 条 · 点击卡片复制</view>
      </view>

      <EmptyState v-if="list.length === 0" text="没有找到相关公式" hint="换个关键词，或切到「全部」分类" />
      <view
        v-for="(item, index) in list"
        :key="index"
        class="card mf-card"
        @click="copyFormula(item)"
      >
        <view class="mf-card__head">
          <view class="mf-card__name">{{ item.name }}</view>
          <view class="mf-card__tag">{{ getGroupName(item.group) }}</view>
        </view>
        <view class="mf-card__expr">{{ item.expr }}</view>
        <view v-if="item.note" class="mf-card__note">{{ item.note }}</view>
      </view>
    </view>

    <view class="note note--info mf-note">
      公式为纯文本速查，供学习与复习使用；上标可用 ^ 表示乘方，分数用 / 表示。所有内容内置在本机，无需联网。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mf-scroll { width: 100%; white-space: nowrap; }
.mf-scroll .pill { display: inline-block; line-height: 60rpx; margin-right: 14rpx; }
.mf-scroll .pill:last-child { margin-right: 0; }
.mf-card:active { background: #fafcfb; }
.mf-card__head { display: flex; align-items: center; justify-content: space-between; }
.mf-card__name { font-size: 28rpx; font-weight: 600; color: #222222; }
.mf-card__tag { font-size: 21rpx; color: #888888; }
.mf-card__expr {
  margin-top: 10rpx;
  font-size: 29rpx;
  color: #2e9b6b;
  line-height: 1.7;
  word-break: break-all;
}
.mf-card__note { margin-top: 8rpx; font-size: 23rpx; color: #888888; }
.mf-note { margin-top: 24rpx; }
</style>

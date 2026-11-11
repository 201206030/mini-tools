<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CATEGORIES, getCategory } from '@/data/categories'
import { DEFAULT_RECOMMENDED_IDS, getToolsByCategory, getToolsByIds, searchTools, TOOLS } from '@/data/tools'
import { useAppStore } from '@/stores/app'
import { showInfo } from '@/services/feedback'
import type { CategoryId } from '@/types/tool'
import ToolCard from '@/components/ToolCard.vue'
import ToolSearch from '@/components/ToolSearch.vue'
import CategorySection from '@/components/CategorySection.vue'
import EmptyState from '@/components/EmptyState.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'

const store = useAppStore()
const query = ref('')
const activeCategory = ref<CategoryId | ''>('')

const isSearching = computed(() => query.value.trim().length > 0)
const searchResults = computed(() => searchTools(query.value))
const commonTools = computed(() =>
  store.favoriteTools.length > 0 ? store.favoriteTools : getToolsByIds(DEFAULT_RECOMMENDED_IDS)
)
const hasCustomFavorites = computed(() => store.favoriteTools.length > 0)
const recentTools = computed(() => store.recentTools.slice(0, 5))
const categoryTools = computed(() => (activeCategory.value ? getToolsByCategory(activeCategory.value) : []))
const activeCategoryName = computed(() => (activeCategory.value ? getCategory(activeCategory.value).name : ''))

function openTool(id: string) {
  uni.navigateTo({ url: `/pages/tool/detail?id=${id}` })
}

function toggleFavorite(id: string) {
  const added = store.toggleFavorite(id)
  showInfo(added ? '已加入常用工具' : '已取消收藏')
}

function selectCategory(id: string) {
  activeCategory.value = activeCategory.value === id ? '' : (id as CategoryId)
}

function goMine() {
  uni.reLaunch({ url: '/pages/mine/index' })
}

onShow(() => {
  store.hydrate()
})
</script>

<template>
  <view class="page page--tabbar home">
    <view class="brand">
      <view class="brand__content">
        <view class="brand__title">一键工具狗</view>
        <view class="brand__slogan">汪！你需要的工具，这里都有。</view>
        <view class="brand__meta">{{ TOOLS.length }} 个实用工具 · 无需登录 · 本机处理</view>
      </view>
      <image class="brand__logo" src="/static/logo.png" mode="aspectFit" />
      <view class="brand__deco brand__deco--a"></view>
      <view class="brand__deco brand__deco--b"></view>
    </view>

    <view class="home__search">
      <ToolSearch v-model="query" />
    </view>

    <!-- 搜索结果 -->
    <template v-if="isSearching">
      <view class="section">
        <view class="section-head">
          <view class="section-title">搜索结果</view>
          <view class="section-more">共 {{ searchResults.length }} 个</view>
        </view>
        <EmptyState
          v-if="searchResults.length === 0"
          text="没有找到相关工具"
          hint="试试搜索：日期、图片、抽签、字数"
        />
        <view v-else class="grid grid--2">
          <view v-for="tool in searchResults" :key="tool.id" class="grid-cell">
            <ToolCard
              :tool="tool"
              :favorited="store.isFavorite(tool.id)"
              @open="openTool"
              @toggle-favorite="toggleFavorite"
            />
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <!-- 常用工具 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title">{{ hasCustomFavorites ? '我的常用' : '常用工具' }}</view>
          <view class="section-more">{{ hasCustomFavorites ? '可在我的页面管理' : '默认推荐，可点卡片收藏' }}</view>
        </view>
        <view class="grid grid--2">
          <view v-for="tool in commonTools" :key="tool.id" class="grid-cell">
            <ToolCard
              :tool="tool"
              :favorited="store.isFavorite(tool.id)"
              @open="openTool"
              @toggle-favorite="toggleFavorite"
            />
          </view>
        </view>
      </view>

      <!-- 工具分类 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title">工具分类</view>
          <view class="section-more">点分类查看全部工具</view>
        </view>
        <CategorySection :categories="CATEGORIES" :active-id="activeCategory" @select="selectCategory" />
      </view>

      <!-- 分类下的工具列表 -->
      <view v-if="activeCategory" class="section">
        <view class="section-head">
          <view class="section-title">{{ activeCategoryName }}</view>
          <view class="section-more section-more--action" @click="selectCategory(activeCategory)">收起</view>
        </view>
        <view class="grid grid--2">
          <view v-for="tool in categoryTools" :key="tool.id" class="grid-cell">
            <ToolCard
              :tool="tool"
              :favorited="store.isFavorite(tool.id)"
              @open="openTool"
              @toggle-favorite="toggleFavorite"
            />
          </view>
        </view>
      </view>

      <!-- 最近使用 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title">最近使用</view>
          <view class="section-more section-more--action" @click="goMine">查看全部</view>
        </view>
        <EmptyState v-if="recentTools.length === 0" text="还没有使用过工具" hint="打开一个工具后会出现在这里" />
        <view v-else class="home__recent">
          <ToolCard
            v-for="tool in recentTools"
            :key="tool.id"
            layout="list"
            :tool="tool"
            :show-favorite="false"
            @open="openTool"
          />
        </view>
      </view>

      <view class="home__footer">一键工具狗 · 所有计算与图片处理都在你的手机本机完成</view>
    </template>

    <BottomTabBar active="home" />
  </view>
</template>

<style lang="scss" scoped>
.brand {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #e8f6ef;
  border: 1rpx solid #d5ecdf;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
}
.brand__content { position: relative; z-index: 1; flex: 1; min-width: 0; }
.brand__logo {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 152rpx;
  height: 152rpx;
  margin-left: 16rpx;
  border-radius: 28rpx;
  background-color: #ffffff;
  border: 2rpx solid rgba(255, 255, 255, 0.9);
}
.brand__title { font-size: 46rpx; font-weight: 700; color: #237a55; letter-spacing: 2rpx; }
.brand__slogan { font-size: 28rpx; color: #3f8f6c; margin-top: 8rpx; }
.brand__meta { font-size: 22rpx; color: #6ba88b; margin-top: 22rpx; }
.brand__deco {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(62, 175, 124, 0.18);
}
.brand__deco--a { width: 190rpx; height: 190rpx; right: -40rpx; top: -70rpx; }
.brand__deco--b { width: 120rpx; height: 120rpx; right: 60rpx; bottom: -70rpx; }

.home__search { margin-top: 24rpx; }
.home__recent { display: flex; flex-direction: column; }
.section-more--action { color: #3eaf7c; }
.home__footer {
  margin-top: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b3b9b6;
  line-height: 1.6;
}
</style>

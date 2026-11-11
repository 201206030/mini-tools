<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showInfo } from '@/services/feedback'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { initialRemaining, parseOptions, pickOne } from './logic'

const text = ref('')
const noRepeat = ref(false)
const remaining = ref<number[]>([])
const pickedValue = ref('')
const history = ref<string[]>([])
const pickKey = ref(0)

const items = computed<string[]>(() => parseOptions(text.value))
const optionCount = computed(() => items.value.length)
const remainingCount = computed(() => (noRepeat.value ? remaining.value.length : items.value.length))

function resetDraw() {
  remaining.value = initialRemaining(items.value.length)
  pickedValue.value = ''
  history.value = []
}

// 文本或模式变化时重置抽取状态，避免剩余索引与选项不匹配
watch([text, noRepeat], () => resetDraw())

function pick() {
  if (items.value.length === 0) {
    showInfo('请先输入至少一个选项')
    return
  }
  if (noRepeat.value && remaining.value.length === 0) {
    showInfo('选项已全部抽完，请点击「重新抽取」')
    return
  }
  const outcome = pickOne(items.value, remaining.value, noRepeat.value)
  if (!outcome) {
    showInfo('暂时无法抽取，请重试')
    return
  }
  pickedValue.value = outcome.value
  remaining.value = outcome.remaining
  history.value = [...history.value, outcome.value]
  pickKey.value += 1
}

function redraw() {
  resetDraw()
}

function clearAll() {
  text.value = ''
  resetDraw()
}

const pickedCopyText = computed<string | undefined>(() =>
  pickedValue.value ? pickedValue.value : undefined
)
</script>

<template>
  <view>
    <view class="card">
      <FormField label="候选选项" hint="每行一个选项，支持中文，空行会自动忽略">
        <textarea
          class="field-textarea rp-textarea"
          v-model="text"
          :maxlength="-1"
          placeholder="每行一个选项，例如：苹果、香蕉、橙子"
        />
      </FormField>
      <view class="rp-count">当前共 {{ optionCount }} 个有效选项</view>
      <SwitchRow v-model="noRepeat" label="不重复抽取" hint="开启后每个条目只会被抽到一次" />
      <view class="btn-row rp-actions">
        <view class="btn btn--primary btn--sm" @click="pick">开始抽签</view>
        <view class="btn btn--plain btn--sm" @click="redraw">重新抽取</view>
        <view class="btn btn--plain btn--sm" @click="clearAll">清空</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">抽签结果</view>
        <view class="section-more">剩余 {{ remainingCount }} 项</view>
      </view>
      <ResultPanel title="本次抽到" :copy-text="pickedCopyText">
        <view v-if="pickedValue" :key="pickKey" class="rp-result">{{ pickedValue }}</view>
        <EmptyState
          v-else-if="optionCount === 0"
          text="还没有可抽取的选项"
          hint="请先在上方输入候选内容，每行一个"
        />
        <EmptyState v-else text="还没有抽签结果" hint="点击「开始抽签」试一试" />
      </ResultPanel>

      <view v-if="history.length" class="rp-history">
        <view class="rp-history__title">已抽取记录（共 {{ history.length }} 次）</view>
        <view v-for="(item, index) in history" :key="index" class="list-item">
          <view class="list-item__body">
            <view class="list-item__title">第 {{ index + 1 }} 次：{{ item }}</view>
          </view>
        </view>
      </view>

      <view class="note note--info rp-note">仅用于日常娱乐与选择，不涉及现金或赌博。</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rp-textarea { height: 400rpx; }
.rp-count { font-size: 24rpx; color: #7a8b84; margin: 4rpx 0 8rpx; }
.rp-actions { margin-top: 24rpx; }
.rp-result {
  font-size: 56rpx;
  font-weight: 700;
  color: #2e9b6b;
  text-align: center;
  padding: 28rpx 0;
  word-break: break-all;
  animation: rpFadeIn 0.28s ease-out;
}
@keyframes rpFadeIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
.rp-history { margin-top: 28rpx; }
.rp-history__title { font-size: 26rpx; color: #666666; font-weight: 600; margin-bottom: 8rpx; }
.rp-note { margin-top: 24rpx; }
</style>

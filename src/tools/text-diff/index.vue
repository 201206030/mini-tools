<script setup lang="ts">
import { computed, ref } from 'vue'
import SwitchRow from '@/components/SwitchRow.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { copyText as doCopyText } from '@/services/clipboard'
import {
  MAX_DIFF_LINES,
  buildDiffText,
  diffLines,
  type DiffLine,
  type DiffOptions,
  type DiffResult
} from './logic'

const leftText = ref('')
const rightText = ref('')
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)
const result = ref<DiffResult | null>(null)
const error = ref('')

const options = computed<DiffOptions>(() => ({
  ignoreCase: ignoreCase.value,
  ignoreWhitespace: ignoreWhitespace.value
}))

const diffText = computed<string>(() =>
  result.value ? buildDiffText(result.value.rows) : ''
)
const copyText = computed<string | undefined>(() => diffText.value || undefined)

function run(): void {
  const outcome = diffLines(leftText.value, rightText.value, options.value)
  if (!outcome.ok) {
    error.value = outcome.message
    result.value = null
    return
  }
  error.value = ''
  result.value = outcome.value
}

function copyDiff(): void {
  if (diffText.value) doCopyText(diffText.value)
}

function rowClass(type: DiffLine['type']): string {
  if (type === 'added') return 'td-row--added'
  if (type === 'removed') return 'td-row--removed'
  return 'td-row--same'
}

function rowSign(type: DiffLine['type']): string {
  if (type === 'added') return '+'
  if (type === 'removed') return '-'
  return ''
}

function rowText(row: DiffLine): string {
  if (row.type === 'removed') return row.left ?? ''
  return row.right ?? row.left ?? ''
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="原文（左侧）" :hint="`按行输入，最多 ${MAX_DIFF_LINES} 行`">
        <textarea
          class="field-textarea td-textarea"
          v-model="leftText"
          :maxlength="-1"
          placeholder="在这里粘贴或输入第一段文本"
        />
      </FormField>
      <FormField label="新文（右侧）" :hint="`按行输入，最多 ${MAX_DIFF_LINES} 行`">
        <textarea
          class="field-textarea td-textarea"
          v-model="rightText"
          :maxlength="-1"
          placeholder="在这里粘贴或输入第二段文本"
        />
      </FormField>
      <SwitchRow v-model="ignoreCase" label="忽略大小写" hint="对比时不区分英文字母大小写" />
      <SwitchRow v-model="ignoreWhitespace" label="忽略空白" hint="忽略首尾空白，并把连续空白折叠为一个空格" />
      <view class="btn btn--primary btn--block td-btn" @click="run">开始对比</view>
    </view>

    <view v-if="error" class="note note--danger td-error">{{ error }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">对比结果</view></view>
      <ResultPanel title="行级差异" :copy-text="copyText">
        <template v-if="result">
          <view class="td-stats">
            <view class="td-stat">
              <text class="td-stat__k">相同</text>
              <text class="td-stat__v">{{ result.stats.same }}</text>
            </view>
            <view class="td-stat">
              <text class="td-stat__k">新增</text>
              <text class="td-stat__v td-stat__v--added">{{ result.stats.added }}</text>
            </view>
            <view class="td-stat">
              <text class="td-stat__k">删除</text>
              <text class="td-stat__v td-stat__v--removed">{{ result.stats.removed }}</text>
            </view>
          </view>
          <view v-if="result.identical" class="note note--info td-state">两段文本完全一致</view>
          <view v-else-if="result.stats.added === 0 && result.stats.removed === 0" class="note note--info td-state">
            按当前对比选项没有发现差异（原文并不完全相同）
          </view>
          <view class="divider"></view>
          <view class="td-rows">
            <view
              v-for="(row, index) in result.rows"
              :key="index"
              class="td-row"
              :class="rowClass(row.type)"
            >
              <text class="td-row__no">{{ row.leftNo ?? '' }}</text>
              <text class="td-row__no">{{ row.rightNo ?? '' }}</text>
              <text class="td-row__sign">{{ rowSign(row.type) }}</text>
              <view class="td-row__text">{{ rowText(row) }}</view>
            </view>
          </view>
          <view class="td-copy">
            <view class="btn btn--plain btn--sm" @click="copyDiff">复制差异文本</view>
          </view>
        </template>
        <EmptyState v-else text="还没有对比结果" hint="输入两段文本后点击「开始对比」" />
      </ResultPanel>
      <view class="note note--info td-note">按行对比，最多各 300 行</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.td-textarea { height: 260rpx; }
.td-btn { margin-top: 24rpx; }
.td-error { margin-top: 20rpx; }
.td-stats { display: flex; justify-content: space-around; }
.td-stat { display: flex; flex-direction: column; align-items: center; }
.td-stat__k { font-size: 23rpx; color: #888888; }
.td-stat__v { font-size: 38rpx; font-weight: 700; color: #222222; margin-top: 6rpx; }
.td-stat__v--added { color: #3EAF7C; }
.td-stat__v--removed { color: #C94B4B; }
.td-state { margin-top: 20rpx; }
.td-rows { margin-top: 8rpx; }
.td-row {
  display: flex;
  align-items: flex-start;
  padding: 10rpx 12rpx;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}
.td-row--added { background: #EAF7EF; }
.td-row--removed { background: #FCEDED; }
.td-row--same { background: #FFFFFF; }
.td-row__no {
  width: 60rpx;
  flex-shrink: 0;
  font-size: 23rpx;
  color: #888888;
  margin-right: 12rpx;
  text-align: right;
}
.td-row__sign {
  width: 28rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: #222222;
  margin-right: 12rpx;
}
.td-row__text {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #222222;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.td-copy { margin-top: 20rpx; }
.td-note { margin-top: 20rpx; }
</style>

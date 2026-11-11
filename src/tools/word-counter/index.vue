<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { buildSummary, countText } from './logic'

const text = ref('')
const debouncedText = ref('')
// 小程序环境里定时器标识是数字；用显式收窄避免 DOM 与 Node 类型下 setTimeout 返回类型不一致
let timer: number | null = null

// 输入后 150ms 再统计，避免长文本每次按键都做全量分析
watch(text, (value) => {
  if (timer !== null) clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedText.value = value
    timer = null
  }, 150) as unknown as number
})

onUnmounted(() => {
  if (timer !== null) clearTimeout(timer)
})

const stats = computed(() => countText(debouncedText.value))
const statLines = computed(() => [
  { label: '总字符数', value: stats.value.characters },
  { label: '汉字数量', value: stats.value.chinese },
  { label: '英文单词数量', value: stats.value.englishWords },
  { label: '数字数量', value: stats.value.digits },
  { label: '标点符号数量', value: stats.value.punctuation },
  { label: '行数', value: stats.value.lines },
  { label: '段落数量', value: stats.value.paragraphs },
  { label: '不含空格的字符数', value: stats.value.noSpaces }
])
const copyText = computed<string | undefined>(() =>
  debouncedText.value ? buildSummary(stats.value) : undefined
)

function clearText() {
  text.value = ''
  debouncedText.value = ''
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="文本内容" hint="可粘贴或输入中文、英文、数字、标点与表情，支持超长文本">
        <textarea
          class="field-textarea wc-textarea"
          v-model="text"
          :maxlength="-1"
          placeholder="在这里输入或粘贴要统计的文字"
        />
      </FormField>
      <view class="btn-row wc-actions">
        <view class="btn btn--plain btn--sm" @click="clearText">一键清空</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">统计结果</view></view>
      <ResultPanel title="字数统计" :copy-text="copyText">
        <view v-for="line in statLines" :key="line.label" class="stat-line">
          <text class="stat-line__k">{{ line.label }}</text>
          <text class="stat-line__v">{{ line.value }}</text>
        </view>
      </ResultPanel>
      <view class="note note--info wc-note">
        组合 Emoji 等按可见字符计为 1 个；不含空格的字符数已排除空格、换行与制表符；段落数按非空行统计。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.wc-textarea { height: 480rpx; }
.wc-actions { margin-top: 8rpx; }
.wc-note { margin-top: 20rpx; }
</style>

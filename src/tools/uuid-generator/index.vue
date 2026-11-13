<script setup lang="ts">
import { ref } from 'vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { copyText as doCopyText } from '@/services/clipboard'
import { generateUuids, MAX_UUID_COUNT } from './logic'
import type { UuidResult } from './logic'

const countText = ref('1')
const uppercase = ref(false)
const noDash = ref(false)
const result = ref<UuidResult | null>(null)
const error = ref('')
const generating = ref(false)

async function generate() {
  if (generating.value) return
  generating.value = true
  try {
    const outcome = await generateUuids(Number(countText.value), uppercase.value, noDash.value)
    if (!outcome.ok) {
      error.value = outcome.message
      result.value = null
    } else {
      error.value = ''
      result.value = outcome.value
    }
  } finally {
    generating.value = false
  }
}

function copyAll() {
  if (result.value) doCopyText(result.value.items.join('\n'))
}

// 打开页面先给出一条示例结果，无需用户额外点击
void generate()
</script>

<template>
  <view>
    <view class="card">
      <FormField label="生成数量" :hint="`一次最多 ${MAX_UUID_COUNT} 条，结果只在当前页面显示`">
        <input
          class="field-input"
          type="number"
          :value="countText"
          placeholder="例如 5"
          @input="countText = $event.detail.value"
        />
      </FormField>
      <SwitchRow v-model="uppercase" label="使用大写字母" hint="默认输出小写十六进制" />
      <SwitchRow v-model="noDash" label="去掉横线" hint="输出 32 位连续字符" />
      <view class="btn btn--primary btn--block uuid-main-btn" :class="{ 'btn--disabled': generating }" @click="generate">
        {{ generating ? '生成中…' : '生成 UUID' }}
      </view>
    </view>

    <view v-if="error" class="note note--danger uuid-error">{{ error }}</view>

    <view v-if="result" class="section">
      <view class="section-head">
        <view class="section-title">生成结果</view>
        <view class="section-more section-more--action" @click="copyAll">复制全部</view>
      </view>
      <ResultPanel :title="`共 ${result.items.length} 条 UUID v4`" :copy-text="result.items.join('\n')">
        <view
          v-for="(item, index) in result.items"
          :key="index"
          class="uuid-item"
          @click="doCopyText(item)"
        >{{ item }}</view>
      </ResultPanel>
      <view v-if="!result.secure" class="note note--danger uuid-note">
        当前环境未提供系统安全随机源，已降级为普通随机数，结果不建议用于安全或身份识别场景。
      </view>
      <view v-else class="note note--info uuid-note">
        使用系统安全随机源生成，结果不写入历史、不上传，关闭页面后不会保留。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.uuid-main-btn { margin-top: 16rpx; }
.uuid-error { margin-top: 20rpx; }
.section-more--action { color: #3eaf7c; }
.uuid-item {
  font-size: 27rpx;
  color: #222222;
  line-height: 1.9;
  word-break: break-all;
  padding: 8rpx 0;
  border-bottom: 1rpx solid #e4f2ea;
}
.uuid-item:last-child { border-bottom: none; }
.uuid-item:active { opacity: 0.6; }
.uuid-note { margin-top: 20rpx; }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import FormField from '@/components/FormField.vue'
import Segmented from '@/components/Segmented.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { convertBase, describeBase } from './logic'

const presetOptions: Array<SelectOption<string>> = [
  { label: '2', value: '2' },
  { label: '8', value: '8' },
  { label: '10', value: '10' },
  { label: '16', value: '16' },
  { label: '32', value: '32' },
  { label: '36', value: '36' }
]

const value = ref('')
// 用字符串保存进制，点选常用档与自定义输入共用同一来源，避免受控输入抖动
const fromBaseText = ref<string | number>('10')
const toBaseText = ref<string | number>('2')
const uppercase = ref(true)

const fromBase = computed(() => Number(fromBaseText.value))
const toBase = computed(() => Number(toBaseText.value))

const outcome = computed(() =>
  convertBase(value.value, fromBase.value, toBase.value, uppercase.value)
)
const resultText = computed(() => (outcome.value.ok ? outcome.value.value : ''))
const copyTextValue = computed<string | undefined>(() =>
  outcome.value.ok ? outcome.value.value : undefined
)

const commonBases = [2, 8, 10, 16]
const overview = computed(() =>
  commonBases.map((base) => {
    const r = convertBase(value.value, fromBase.value, base, uppercase.value)
    return { base, label: describeBase(base), text: r.ok ? r.value : '—' }
  })
)
</script>

<template>
  <view>
    <view class="card">
      <FormField label="输入数值" hint="仅支持整数，可带负号；16 及以上进制可输入字母 A~Z / a~z">
        <input
          class="field-input"
          type="text"
          :value="value"
          :maxlength="-1"
          placeholder="例如 255、FF 或 -1A"
          @input="value = $event.detail.value"
        />
      </FormField>

      <FormField label="源进制" hint="常用进制直接点选，也可输入 2~36 之间的任意整数">
        <Segmented v-model="fromBaseText" :options="presetOptions" />
        <view class="bc-custom">
          <text class="bc-custom__label">自定义</text>
          <input
            class="field-input bc-custom__input"
            type="number"
            :value="fromBaseText"
            placeholder="2~36"
            @input="fromBaseText = $event.detail.value"
          />
        </view>
      </FormField>

      <FormField label="目标进制" hint="常用进制直接点选，也可输入 2~36 之间的任意整数">
        <Segmented v-model="toBaseText" :options="presetOptions" />
        <view class="bc-custom">
          <text class="bc-custom__label">自定义</text>
          <input
            class="field-input bc-custom__input"
            type="number"
            :value="toBaseText"
            placeholder="2~36"
            @input="toBaseText = $event.detail.value"
          />
        </view>
      </FormField>

      <SwitchRow v-model="uppercase" label="大写输出" hint="关闭后字母数码以小写 a~z 显示" />

      <view class="btn-row">
        <view class="btn btn--plain btn--sm" @click="value = ''">清空</view>
      </view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">转换结果</view></view>
      <view v-if="!outcome.ok" class="note note--danger bc-error">{{ outcome.message }}</view>
      <ResultPanel title="结果" :copy-text="copyTextValue">
        <text v-if="outcome.ok" class="bc-output" selectable>{{ resultText }}</text>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">常见进制一览</view>
        <view class="section-more">同一数值在 2 / 8 / 10 / 16 进制下的结果</view>
      </view>
      <view class="card">
        <view v-for="item in overview" :key="item.base" class="stat-line">
          <text class="stat-line__k bc-stat-key">{{ item.label }}（{{ item.base }}）</text>
          <text class="stat-line__v bc-stat-value">{{ item.text }}</text>
        </view>
      </view>
    </view>

    <view class="note note--info bc-note">
      仅支持整数，超大数值用字符串算法计算，不受数字精度限制。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bc-custom { display: flex; align-items: center; margin-top: 16rpx; }
.bc-custom__label { font-size: 26rpx; color: #888888; margin-right: 16rpx; }
.bc-custom__input { flex: 1; }
.bc-error { margin-top: 20rpx; }
.bc-output {
  display: block;
  font-size: 40rpx;
  line-height: 1.5;
  color: #222222;
  word-break: break-all;
}
.bc-stat-key { flex-shrink: 0; }
.bc-stat-value { flex: 1; margin-left: 20rpx; text-align: right; word-break: break-all; font-size: 27rpx; }
.bc-note { margin-top: 24rpx; }
</style>

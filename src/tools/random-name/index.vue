<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { copyText as doCopyText } from '@/services/clipboard'
import { createRandomIntSource, secureRandomBytes } from '@/utils/random'
import {
  generateNames,
  parseSurnames,
  MAX_NAME_COUNT,
  type GenerateNamesOptions,
  type NameGender,
  type NameLength
} from './logic'

const genderOptions: SelectOption[] = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '不限', value: 'all' }
]
const lengthOptions: SelectOption[] = [
  { label: '单字', value: 'single' },
  { label: '双字', value: 'double' },
  { label: '混合', value: 'mix' }
]

const gender = ref<string | number>('all')
const length = ref<string | number>('mix')
const countText = ref('5')
const surnameText = ref('')
const includeCompound = ref(false)
const names = ref<string[]>([])
const activeSurnames = ref<string[]>([])
const error = ref('')
const generating = ref(false)
const usedSecure = ref(true)

const hasResult = computed(() => names.value.length > 0)
const customSurname = computed(() => surnameText.value.trim().length > 0)
const copyText = computed<string | undefined>(() =>
  hasResult.value ? names.value.join('\n') : undefined
)
const resultTitle = computed(() => {
  const base = `共 ${names.value.length} 个姓名`
  const list = activeSurnames.value
  if (list.length === 0) return base
  // 指定多个姓氏时截断标题，避免长文本撑破结果栏
  const shown = list.slice(0, 3).join('、')
  return list.length > 3
    ? `${base} · 指定姓氏 ${shown} 等 ${list.length} 个`
    : `${base} · 指定姓氏 ${shown}`
})

async function generate(): Promise<void> {
  if (generating.value) return
  generating.value = true
  try {
    const parsed = parseSurnames(surnameText.value)
    if (!parsed.ok) {
      error.value = parsed.message
      names.value = []
      activeSurnames.value = []
      return
    }

    const count = Number(countText.value)
    const safeCount = Number.isFinite(count)
      ? Math.min(MAX_NAME_COUNT, Math.max(1, Math.floor(count)))
      : 1

    let bytes: Uint8Array = new Uint8Array(0)
    let secure = false
    try {
      const random = await secureRandomBytes(Math.max(64, safeCount * 12))
      bytes = random.bytes
      secure = random.secure
    } catch {
      error.value = '无法获取随机数，请重试'
      names.value = []
      activeSurnames.value = []
      return
    }

    const source = createRandomIntSource(bytes, secure)
    const options: GenerateNamesOptions = {
      count,
      gender: String(gender.value) as NameGender,
      length: String(length.value) as NameLength,
      compoundRate: includeCompound.value ? 0.2 : 0,
      surnames: parsed.value,
      pick: source.below
    }
    const outcome = generateNames(options, names.value)
    usedSecure.value = source.isSecure()
    if (!outcome.ok) {
      error.value = outcome.message
      names.value = []
      activeSurnames.value = []
      return
    }
    error.value = ''
    names.value = outcome.value
    activeSurnames.value = parsed.value
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <view>
    <view class="card">
      <FormField
        label="指定姓氏"
        hint="留空则从百家姓里随机取姓；只填姓氏（可填多个，用空格、逗号或顿号分隔），支持复姓，勿填全名"
      >
        <input
          class="field-input"
          type="text"
          :value="surnameText"
          :maxlength="60"
          placeholder="例如：李 或 欧阳、司马"
          @input="surnameText = $event.detail.value"
        />
      </FormField>
      <FormField label="性别">
        <Segmented v-model="gender" :options="genderOptions" />
      </FormField>
      <FormField label="名字字数" hint="单字为一字名，双字为两字名，混合随机选择">
        <Segmented v-model="length" :options="lengthOptions" />
      </FormField>
      <FormField label="生成数量" :hint="`一次最多 ${MAX_NAME_COUNT} 个`">
        <input
          class="field-input"
          type="number"
          :value="countText"
          placeholder="例如 5"
          @input="countText = $event.detail.value"
        />
      </FormField>
      <SwitchRow
        v-model="includeCompound"
        label="包含复姓"
        :disabled="customSurname"
        :hint="customSurname ? '已指定姓氏，复姓选项不生效，清空上方输入后可开启' : '开启后有机会生成欧阳、司马等复姓姓名'"
      />
      <view
        class="btn btn--primary btn--block rn-btn"
        :class="{ 'btn--disabled': generating }"
        @click="generate"
      >
        {{ generating ? '生成中…' : '生成姓名' }}
      </view>
    </view>

    <view v-if="error" class="note note--danger rn-error">{{ error }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">生成结果</view></view>
      <ResultPanel :title="resultTitle" :copy-text="copyText">
        <template v-if="hasResult">
          <view
            v-for="(name, index) in names"
            :key="index"
            class="list-item rn-item"
            @click="doCopyText(name)"
          >
            <view class="list-item__body">
              <view class="list-item__title">{{ name }}</view>
              <view class="list-item__desc">点击复制该姓名</view>
            </view>
            <text class="tag tag--brand">{{ index + 1 }}</text>
          </view>
        </template>
        <EmptyState v-else text="还没有生成姓名" hint="设置好选项后点击「生成姓名」" />
      </ResultPanel>

      <view v-if="!usedSecure && hasResult" class="note note--danger rn-note">
        当前环境未提供系统安全随机源，已降级为普通随机数，结果仅供娱乐与测试使用。
      </view>
      <view class="note note--info rn-note">
        姓名为随机组合，仅供取名参考、游戏昵称、测试数据使用，不代表真实人物
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rn-btn { margin-top: 16rpx; }
.rn-error { margin-top: 20rpx; }
.rn-item:active { opacity: 0.6; }
.rn-note { margin-top: 20rpx; }
</style>

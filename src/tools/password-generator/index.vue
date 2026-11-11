<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import { createRandomIntSource, secureRandomBytes } from '@/utils/random'
import { showError } from '@/services/feedback'
import { generatePassword, validatePasswordOptions, type PasswordOptions } from './logic'

const length = ref(16)
const upper = ref(true)
const lower = ref(true)
const digit = ref(true)
const symbol = ref(false)
const excludeAmbiguous = ref(true)

const password = ref('')
const usedSecure = ref(false)
const hasResult = ref(false)

const options = computed<PasswordOptions>(() => ({
  upper: upper.value,
  lower: lower.value,
  digit: digit.value,
  symbol: symbol.value,
  excludeAmbiguous: excludeAmbiguous.value
}))

const optionsError = computed(() => validatePasswordOptions(length.value, options.value))

const lengthText = computed(() => `当前长度 ${length.value} 位（可设置 4 到 64 位）`)

const strengthText = computed(() => {
  const types = [upper.value, lower.value, digit.value, symbol.value].filter(Boolean).length
  if (length.value >= 16 && types >= 3) return '强度：较强；长度足够且字符种类丰富'
  if (length.value >= 12 && types >= 2) return '强度：中等；可增加长度或多选字符类型'
  return '强度：偏低；建议加长并多选字符类型'
})

const securityText = computed(() =>
  usedSecure.value
    ? '本次使用设备提供的安全随机数'
    : '当前设备不支持安全随机数，本次结果不适合用于重要账号，请勿当作安全密码'
)

function onLengthChange(event: any): void {
  const value = Number((event && event.detail && event.detail.value) || 16)
  length.value = Number.isFinite(value) ? Math.round(value) : 16
}

async function generate(): Promise<void> {
  const error = optionsError.value
  if (error) {
    showError(error)
    return
  }
  let bytes: Uint8Array = new Uint8Array(0)
  let secure = false
  try {
    const result = await secureRandomBytes(Math.max(64, length.value * 8))
    bytes = result.bytes
    secure = result.secure
  } catch {
    showError('无法获取随机数，请重试')
    return
  }
  const source = createRandomIntSource(bytes, secure)
  const generated = generatePassword(length.value, options.value, source.below)
  if (!generated.ok) {
    showError(generated.message)
    return
  }
  password.value = generated.value
  usedSecure.value = secure && source.isSecure()
  hasResult.value = true
}
</script>

<template>
  <view>
    <view class="card">
      <FormField label="密码长度" :hint="lengthText">
        <slider :min="4" :max="64" :value="length" show-value activeColor="#3eaf7c" @change="onLengthChange" />
      </FormField>
      <view class="divider"></view>
      <SwitchRow v-model="upper" label="大写字母 A-Z" />
      <SwitchRow v-model="lower" label="小写字母 a-z" />
      <SwitchRow v-model="digit" label="数字 0-9" />
      <SwitchRow v-model="symbol" label="符号 !@# 等" />
      <SwitchRow v-model="excludeAmbiguous" label="排除容易混淆的字符" hint="例如 0 O 1 l I 等" />
    </view>

    <view v-if="optionsError" class="note note--danger pwd-tip">{{ optionsError }}</view>

    <view class="btn btn--primary btn--block pwd-btn" @click="generate">生成密码</view>

    <view v-if="hasResult" class="section">
      <ResultPanel title="生成的密码" :copy-text="password">
        <view class="result__value pwd-value">{{ password }}</view>
        <view class="result__label pwd-meta">{{ strengthText }}</view>
      </ResultPanel>
      <view class="note pwd-tip" :class="usedSecure ? 'note--info' : 'note--danger'">{{ securityText }}</view>
    </view>

    <view class="note note--info pwd-tip">请妥善保存，本工具不保存密码历史，也不会把结果写入任何存储。</view>
  </view>
</template>

<style lang="scss" scoped>
.pwd-value { word-break: break-all; font-size: 40rpx; line-height: 1.5; }
.pwd-meta { margin-top: 12rpx; }
.pwd-btn { margin-top: 24rpx; }
.pwd-tip { margin-top: 24rpx; }
</style>

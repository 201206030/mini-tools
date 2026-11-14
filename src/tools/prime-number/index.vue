<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { toFiniteNumber } from '@/utils/number'
import {
  MAX_PRIME_CHECK,
  MAX_RANGE_SPAN,
  describePrime,
  factorize,
  isPrime,
  primesInRange,
  type FactorizeResult,
  type PrimeRangeResult
} from './logic'

type Mode = 'check' | 'range' | 'factor'
const modeOptions: SelectOption[] = [
  { label: '判断质数', value: 'check' },
  { label: '区间质数', value: 'range' },
  { label: '质因数分解', value: 'factor' }
]
const mode = ref<string | number>('check')
const modeKey = computed<Mode>(() => {
  if (mode.value === 'range') return 'range'
  if (mode.value === 'factor') return 'factor'
  return 'check'
})

const checkText = ref('97')
const rangeStart = ref('1')
const rangeEnd = ref('100')
const factorText = ref('60')

const checkView = ref<{ description: string; prime: boolean } | null>(null)
const rangeView = ref<(PrimeRangeResult & { lo: number; hi: number }) | null>(null)
const factorView = ref<FactorizeResult | null>(null)
const error = ref('')

function parseInteger(raw: string): number | null {
  const value = toFiniteNumber(raw)
  return value !== null && Number.isInteger(value) ? value : null
}

const resultTitle = computed(() => {
  if (modeKey.value === 'range') return '区间质数'
  if (modeKey.value === 'factor') return '质因数分解结果'
  return '判断结论'
})

const copyText = computed<string | undefined>(() => {
  if (rangeView.value) return rangeView.value.primes.join('\n')
  if (factorView.value) return factorView.value.expression
  if (checkView.value) return checkView.value.description
  return undefined
})

const hasResult = computed(() =>
  Boolean(checkView.value || rangeView.value || factorView.value)
)

function run(): void {
  error.value = ''
  checkView.value = null
  rangeView.value = null
  factorView.value = null

  if (modeKey.value === 'check') {
    const n = parseInteger(checkText.value)
    if (n === null) {
      error.value = '请输入 0 到 10 亿之间的整数'
      return
    }
    if (n > MAX_PRIME_CHECK) {
      error.value = `数值上限为 ${MAX_PRIME_CHECK}（10 亿），请减小数值`
      return
    }
    checkView.value = { description: describePrime(n), prime: isPrime(n) }
    return
  }

  if (modeKey.value === 'range') {
    const start = parseInteger(rangeStart.value)
    const end = parseInteger(rangeEnd.value)
    if (start === null || end === null) {
      error.value = '区间起止值都需要填写整数'
      return
    }
    const outcome = primesInRange(start, end)
    if (!outcome.ok) {
      error.value = outcome.message
      return
    }
    rangeView.value = {
      ...outcome.value,
      lo: Math.min(start, end),
      hi: Math.max(start, end)
    }
    return
  }

  const n = parseInteger(factorText.value)
  if (n === null) {
    error.value = '请输入 2 到 10 亿之间的整数'
    return
  }
  const outcome = factorize(n)
  if (!outcome.ok) {
    error.value = outcome.message
    return
  }
  factorView.value = outcome.value
}
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="mode" :options="modeOptions" />
      <view class="divider"></view>

      <template v-if="modeKey === 'check'">
        <FormField label="待判断的整数" :hint="`支持 0、1 与负数；最大不超过 ${MAX_PRIME_CHECK}（10 亿）`">
          <input
            class="field-input"
            type="text"
            :value="checkText"
            placeholder="例如 97"
            @input="checkText = $event.detail.value"
          />
        </FormField>
      </template>

      <template v-else-if="modeKey === 'range'">
        <FormField label="区间起点" hint="可与终点互换，自动按从小到大排序">
          <input
            class="field-input"
            type="text"
            :value="rangeStart"
            placeholder="例如 1"
            @input="rangeStart = $event.detail.value"
          />
        </FormField>
        <FormField label="区间终点" :hint="`跨度不能超过 ${MAX_RANGE_SPAN}，最多展示 500 个质数`">
          <input
            class="field-input"
            type="text"
            :value="rangeEnd"
            placeholder="例如 100"
            @input="rangeEnd = $event.detail.value"
          />
        </FormField>
      </template>

      <template v-else>
        <FormField label="待分解的整数" :hint="`请输入 2 到 ${MAX_PRIME_CHECK}（10 亿）之间的整数`">
          <input
            class="field-input"
            type="text"
            :value="factorText"
            placeholder="例如 60"
            @input="factorText = $event.detail.value"
          />
        </FormField>
      </template>

      <view class="btn btn--primary btn--block pm-btn" @click="run">开始计算</view>
    </view>

    <view v-if="error" class="note note--danger pm-error">{{ error }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>
      <ResultPanel :title="resultTitle" :copy-text="copyText">
        <template v-if="hasResult">
          <view v-if="checkView" class="pm-check">
            <view class="result__value" :class="{ 'result__value--brand': checkView.prime }">
              {{ checkView.prime ? '质数' : '不是质数' }}
            </view>
            <view class="result__label pm-desc">{{ checkView.description }}</view>
          </view>

          <view v-if="rangeView">
            <view class="stat-line">
              <text class="stat-line__k">区间</text>
              <text class="stat-line__v">{{ rangeView.lo }} ~ {{ rangeView.hi }}</text>
            </view>
            <view class="stat-line">
              <text class="stat-line__k">质数总数</text>
              <text class="stat-line__v">{{ rangeView.total }} 个</text>
            </view>
            <view v-if="rangeView.truncated" class="note note--danger pm-warn">
              质数数量超过展示上限，这里只列出前 {{ rangeView.primes.length }} 个，完整数量见上方。
            </view>
            <view v-if="rangeView.primes.length" class="grid grid--4 pm-grid">
              <view v-for="(prime, index) in rangeView.primes" :key="index" class="grid-cell">
                <view class="pm-cell">{{ prime }}</view>
              </view>
            </view>
            <view v-else class="muted small">该区间内没有质数</view>
          </view>

          <view v-if="factorView">
            <view class="result__value result__value--sm pm-expr">{{ factorView.expression }}</view>
            <view class="divider"></view>
            <view class="stat-line">
              <text class="stat-line__k">是否质数</text>
              <text class="stat-line__v">{{ factorView.isPrime ? '是' : '否' }}</text>
            </view>
            <view class="stat-line">
              <text class="stat-line__k">质因数（含重复）</text>
              <text class="stat-line__v">{{ factorView.factors.join(' × ') }}</text>
            </view>
          </view>
        </template>
        <EmptyState v-else text="还没有计算结果" hint="填写数值后点击「开始计算」" />
      </ResultPanel>
      <view class="note note--info pm-note">1 不是质数；数值上限 10 亿，区间跨度上限 10000</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pm-btn { margin-top: 24rpx; }
.pm-error { margin-top: 20rpx; }
.pm-desc { margin-top: 12rpx; }
.pm-warn { margin-top: 20rpx; }
.pm-grid { margin-top: 20rpx; }
.pm-cell {
  background: #f2fbf6;
  border: 1rpx solid #d7efe2;
  border-radius: 10rpx;
  padding: 14rpx 0;
  text-align: center;
  font-size: 27rpx;
  color: #222222;
}
.pm-expr { word-break: break-all; }
.pm-note { margin-top: 20rpx; }
</style>

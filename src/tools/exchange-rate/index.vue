<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import { showInfo } from '@/services/feedback'
import { describeSources, loadCachedRates, refreshRates } from '@/services/exchange-rate'
import { getCurrency } from './currencies'
import {
  convert,
  describeAge,
  describeStatus,
  formatDateTime,
  parseAmount
} from './logic'
import type { RateCache } from './logic'

const PICK_EVENT = 'currency-picker:select'

const amountInput = ref('100')
const from = ref('CNY')
const to = ref('USD')
const cache = ref<RateCache | null>(null)
const refreshing = ref(false)
const justUpdated = ref(false)
const notice = ref('')

const rates = computed(() => cache.value?.rates ?? null)
const availableCodes = computed(() => Object.keys(rates.value || {}))
const fromCurrency = computed(() => getCurrency(from.value))
const toCurrency = computed(() => getCurrency(to.value))

const outcome = computed(() => {
  const parsed = parseAmount(amountInput.value)
  if (!parsed.ok) return parsed
  if (!rates.value) return { ok: false as const, message: '尚未获取汇率数据' }
  return convert(parsed.value, from.value, to.value, rates.value)
})
const resultValue = computed(() => (outcome.value.ok ? outcome.value.value : null))
const errorText = computed(() => (outcome.value.ok ? '' : outcome.value.message))
const status = computed(() => describeStatus(cache.value, Date.now(), justUpdated.value))
const sourceText = computed(() => describeSources(cache.value))
const updatedText = computed(() =>
  cache.value ? `${formatDateTime(cache.value.updatedAt)}（${describeAge(cache.value.updatedAt, Date.now())}）` : '尚未获取'
)
const rateText = computed(() =>
  resultValue.value ? `1 ${from.value} ≈ ${resultValue.value.rateText} ${to.value}` : '—'
)
const copyText = computed<string | undefined>(() =>
  resultValue.value ? `${amountInput.value} ${from.value} = ${resultValue.value.text} ${to.value}` : undefined
)
const statusNoteClass = computed(() => {
  if (status.value.tone === 'danger') return 'note--danger'
  if (status.value.tone === 'warn') return ''
  return 'note--info'
})

function onAmountInput(event: Event) {
  amountInput.value = String((event.detail && event.detail.value) ?? '')
}

function clearAmount() {
  amountInput.value = ''
}

function swapCurrencies() {
  const previous = from.value
  from.value = to.value
  to.value = previous
}

/** 缓存里没有默认币种时（例如补充源失败）自动切到实际可用的币种 */
function ensureValidSelection() {
  const codes = availableCodes.value
  if (!codes.length) return
  if (!codes.includes(from.value)) from.value = codes.includes('CNY') ? 'CNY' : codes[0]
  if (!codes.includes(to.value)) {
    to.value = codes.includes('USD') && from.value !== 'USD' ? 'USD' : codes.find((code) => code !== from.value) || from.value
  }
}

function openPicker(field: 'from' | 'to') {
  const current = field === 'from' ? from.value : to.value
  uni.navigateTo({ url: `/pages/currency-picker/index?field=${field}&current=${current}` })
}

function onCurrencyPicked(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  const data = payload as { field?: unknown; code?: unknown }
  const code = typeof data.code === 'string' ? data.code : ''
  if (!code || !getCurrency(code)) return
  if (!availableCodes.value.includes(code)) {
    showInfo('该币种暂无汇率，请先刷新汇率')
    return
  }
  if (data.field === 'from') from.value = code
  else if (data.field === 'to') to.value = code
}

async function doRefresh(force: boolean) {
  if (refreshing.value) return
  refreshing.value = true
  notice.value = ''
  try {
    const result = await refreshRates(force)
    if (result.cache) cache.value = result.cache
    justUpdated.value = result.updated
    ensureValidSelection()
    // 自动进入页面时若只是被 60 秒节流拦住，不打扰用户；手动刷新才提示
    if (result.message && (force || !result.throttled)) {
      notice.value = result.message
      if (force) showInfo(result.message)
    }
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  // 先同步读取本地缓存并渲染，页面加载不等待网络，断网也能立即换算
  cache.value = loadCachedRates()
  ensureValidSelection()
  uni.$on(PICK_EVENT, onCurrencyPicked)
  // 异步按需更新：24 小时内不会发起请求，失败也不影响上面的本地换算
  void doRefresh(false)
})

onUnmounted(() => {
  uni.$off(PICK_EVENT, onCurrencyPicked)
})
</script>

<template>
  <view>
    <view class="card">
      <FormField label="换算金额" hint="支持小数；金额只在本机计算，不会上传">
        <input
          class="field-input"
          type="text"
          :value="amountInput"
          placeholder="请输入要换算的金额"
          @input="onAmountInput"
        />
      </FormField>

      <view class="er-row">
        <view class="er-col" @click="openPicker('from')">
          <text class="field-label">原始币种</text>
          <view class="er-picker">
            <text class="er-picker__symbol">{{ fromCurrency?.symbol || '¤' }}</text>
            <view class="er-picker__body">
              <text class="er-picker__code">{{ from }}</text>
              <text class="er-picker__name">{{ fromCurrency?.nameCn || '请选择' }}</text>
            </view>
            <text class="er-picker__arrow">›</text>
          </view>
        </view>
        <view class="er-swap" @click="swapCurrencies">交换</view>
        <view class="er-col" @click="openPicker('to')">
          <text class="field-label">目标币种</text>
          <view class="er-picker">
            <text class="er-picker__symbol">{{ toCurrency?.symbol || '¤' }}</text>
            <view class="er-picker__body">
              <text class="er-picker__code">{{ to }}</text>
              <text class="er-picker__name">{{ toCurrency?.nameCn || '请选择' }}</text>
            </view>
            <text class="er-picker__arrow">›</text>
          </view>
        </view>
      </view>

      <view class="btn-row er-actions">
        <view class="btn btn--plain btn--sm" @click="clearAmount">清空</view>
        <view
          class="btn btn--primary btn--sm"
          :class="{ 'btn--disabled': refreshing }"
          @click="doRefresh(true)"
        >{{ refreshing ? '更新中…' : '刷新汇率' }}</view>
      </view>
    </view>

    <view v-if="errorText" class="note note--danger er-note">{{ errorText }}</view>
    <view v-if="notice" class="note note--info er-note">{{ notice }}</view>

    <view v-if="!cache" class="card er-empty">
      <EmptyState text="还没有汇率数据" hint="首次使用需要联网获取一次参考汇率，之后即可离线换算" />
      <view class="btn btn--primary btn--block" @click="doRefresh(true)">联网获取汇率</view>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">换算结果</view></view>
      <ResultPanel title="换算结果" :copy-text="copyText">
        <template v-if="resultValue">
          <view class="result__value result__value--brand">{{ resultValue.text }}</view>
          <view class="result__label">{{ to }} {{ toCurrency?.nameCn }}</view>
          <view class="divider"></view>
          <view class="er-expression">{{ amountInput }} {{ from }} = {{ resultValue.text }} {{ to }}</view>
        </template>
        <view v-else class="muted small">请检查金额，或先联网获取汇率</view>
      </ResultPanel>
    </view>

    <view class="section">
      <view class="section-head"><view class="section-title">汇率数据</view></view>
      <view class="card er-meta">
        <view class="stat-line">
          <text class="stat-line__k">当前参考汇率</text>
          <text class="stat-line__v er-meta__small">{{ rateText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">汇率更新时间</text>
          <text class="stat-line__v er-meta__small">{{ updatedText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">数据来源</text>
          <text class="stat-line__v er-meta__small">{{ sourceText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">数据状态</text>
          <text class="stat-line__v er-meta__small">{{ status.label }}</text>
        </view>
      </view>
      <view class="note er-note" :class="statusNoteClass">{{ status.detail }}</view>
      <view class="note note--info er-note">金额与换算结果只在本机计算，不会上传；仅在获取公开参考汇率时联网。</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.er-row { display: flex; align-items: flex-end; }
.er-col { flex: 1; min-width: 0; }
/* 不用 flex gap，避免部分机型把两列挤成一行 */
.er-swap {
  height: 84rpx;
  padding: 0 18rpx;
  margin-left: 16rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f3f4f6;
  color: #555555;
  border-radius: 12rpx;
  font-size: 25rpx;
}
.er-picker {
  display: flex;
  align-items: center;
  height: 84rpx;
  padding: 0 16rpx;
  background: #f7f8fa;
  border: 1rpx solid #eeeeee;
  border-radius: 12rpx;
}
.er-picker__symbol {
  font-size: 28rpx;
  color: #2e9b6b;
  font-weight: 600;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.er-picker__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.er-picker__code { font-size: 27rpx; font-weight: 600; color: #222222; }
.er-picker__name { font-size: 21rpx; color: #888888; }
.er-picker__arrow { font-size: 32rpx; color: #bbbbbb; margin-left: 8rpx; }
.er-actions { margin-top: 8rpx; }
.er-note { margin-top: 20rpx; }
.er-empty { margin-top: 20rpx; padding-bottom: 28rpx; }
.er-expression { font-size: 26rpx; color: #555555; word-break: break-all; }
.er-meta { padding: 6rpx 28rpx; }
.er-meta__small { font-size: 24rpx; font-weight: 500; }
.er-meta .stat-line__v { max-width: 64%; text-align: right; }
</style>

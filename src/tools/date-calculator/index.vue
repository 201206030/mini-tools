<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectOption } from '@/types/common'
import { formatDate, pad2, todayCivil } from '@/utils/date'
import { toInteger } from '@/utils/number'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import {
  buildIntervalSummary,
  buildWorkdaySummary,
  calcCountdown,
  calcInterval,
  calcOffset,
  calcWorkdays,
  calcWorkdayOffset,
  MAX_OFFSET_DAYS,
  parseWorkdayDateList
} from './logic'

const MIN_DATE = '1900-01-01'
const MAX_DATE = '2100-12-31'

type Mode = 'interval' | 'offset' | 'today' | 'workday'
const modeOptions: Array<SelectOption<string>> = [
  { label: '相隔天数', value: 'interval' },
  { label: '前后 N 天', value: 'offset' },
  { label: '距离今天', value: 'today' },
  { label: '工作日', value: 'workday' }
]

type WorkdayAlgo = 'range' | 'offset'
const workdayAlgoOptions: Array<SelectOption<string>> = [
  { label: '区间工作日', value: 'range' },
  { label: 'N 个工作日后', value: 'offset' }
]

const today = formatDate(todayCivil())
const mode = ref<Mode>('interval')
const startDate = ref(today)
const endDate = ref(today)
const baseDate = ref(today)
const targetDate = ref(today)
const offsetInput = ref('30')
const includeBothEnds = ref(false)

// 工作日模式
const workdayAlgo = ref<WorkdayAlgo>('range')
const wdStartDate = ref(today)
const wdEndDate = ref(today)
const wdBaseDate = ref(today)
const wdOffsetInput = ref('10')
const daysOffText = ref('')
const makeUpText = ref('')

function onDateChange(key: 'startDate' | 'endDate' | 'baseDate' | 'targetDate', event: any) {
  const value = String((event && event.detail && event.detail.value) || '')
  if (value) {
    if (key === 'startDate') startDate.value = value
    else if (key === 'endDate') endDate.value = value
    else if (key === 'baseDate') baseDate.value = value
    else targetDate.value = value
  }
}

type WorkdayDateKey = 'wdStartDate' | 'wdEndDate' | 'wdBaseDate'
function onWorkdayDateChange(key: WorkdayDateKey, event: any) {
  const value = String((event && event.detail && event.detail.value) || '')
  if (!value) return
  if (key === 'wdStartDate') wdStartDate.value = value
  else if (key === 'wdEndDate') wdEndDate.value = value
  else wdBaseDate.value = value
}

const intervalResult = computed(() => calcInterval(startDate.value, endDate.value))
const offsetResult = computed(() => {
  const days = toInteger(offsetInput.value)
  if (days === null) return { ok: false as const, message: '请填写有效的整数天数' }
  if (Math.abs(days) > MAX_OFFSET_DAYS) return { ok: false as const, message: `天数请控制在 ${MAX_OFFSET_DAYS} 天以内` }
  return calcOffset(baseDate.value, days)
})
const countdownResult = computed(() => calcCountdown(targetDate.value, todayCivil()))

const workdayOptions = computed(() => ({
  daysOff: parseWorkdayDateList(daysOffText.value),
  makeUpDays: parseWorkdayDateList(makeUpText.value)
}))
const workdayRangeResult = computed(() =>
  calcWorkdays(wdStartDate.value, wdEndDate.value, workdayOptions.value)
)
const workdayOffsetResult = computed(() => {
  const days = toInteger(wdOffsetInput.value)
  if (days === null) return { ok: false as const, message: '请填写有效的整数天数' }
  return calcWorkdayOffset(wdBaseDate.value, days, workdayOptions.value)
})

const activeError = computed(() => {
  if (mode.value === 'interval') return intervalResult.value.ok ? '' : intervalResult.value.message
  if (mode.value === 'offset') return offsetResult.value.ok ? '' : offsetResult.value.message
  if (mode.value === 'workday') {
    return workdayAlgo.value === 'range'
      ? (workdayRangeResult.value.ok ? '' : workdayRangeResult.value.message)
      : (workdayOffsetResult.value.ok ? '' : workdayOffsetResult.value.message)
  }
  return countdownResult.value.ok ? '' : countdownResult.value.message
})

const copyText = computed(() => {
  if (mode.value === 'interval' && intervalResult.value.ok) {
    return buildIntervalSummary(startDate.value, endDate.value, intervalResult.value.value)
  }
  if (mode.value === 'offset' && offsetResult.value.ok) {
    const r = offsetResult.value.value
    return `基准日期：${r.base}\n往后 ${r.days} 天：${r.after}（${r.afterWeekday}）\n往前 ${r.days} 天：${r.before}（${r.beforeWeekday}）`
  }
  if (mode.value === 'today' && countdownResult.value.ok) {
    const r = countdownResult.value.value
    const desc = r.direction === 'future' ? `还有 ${r.days} 天` : r.direction === 'past' ? `已过去 ${-r.days} 天` : '就是今天'
    return `${targetDate.value} 距离今天：${desc}\n相差 ${r.ymd.years} 年 ${r.ymd.months} 个月 ${r.ymd.days} 天`
  }
  if (mode.value === 'workday' && workdayAlgo.value === 'range' && workdayRangeResult.value.ok) {
    return buildWorkdaySummary(wdStartDate.value, wdEndDate.value, workdayRangeResult.value.value)
  }
  if (mode.value === 'workday' && workdayAlgo.value === 'offset' && workdayOffsetResult.value.ok) {
    const r = workdayOffsetResult.value.value
    return `基准日期：${wdBaseDate.value}\n目标工作日：${r.date}（${r.weekday}）\n实际扫描 ${r.scannedDays} 个自然日`
  }
  return ''
})

const displayedDays = computed(() => {
  if (!intervalResult.value.ok) return '—'
  const r = intervalResult.value.value
  return String(includeBothEnds.value ? r.inclusiveDays : r.absoluteDays)
})

function useToday(key: 'startDate' | 'endDate' | 'baseDate' | 'targetDate') {
  if (key === 'startDate') startDate.value = today
  else if (key === 'endDate') endDate.value = today
  else if (key === 'baseDate') baseDate.value = today
  else targetDate.value = today
}

function useWorkdayToday(key: WorkdayDateKey) {
  if (key === 'wdStartDate') wdStartDate.value = today
  else if (key === 'wdEndDate') wdEndDate.value = today
  else wdBaseDate.value = today
}

function swapDates() {
  const temp = startDate.value
  startDate.value = endDate.value
  endDate.value = temp
}

function swapWorkdayDates() {
  const temp = wdStartDate.value
  wdStartDate.value = wdEndDate.value
  wdEndDate.value = temp
}

// 供模板展示当前日期，避免模板内直接调用工具函数
const todayLabel = `${today.slice(0, 4)} 年 ${Number(today.slice(5, 7))} 月 ${pad2(Number(today.slice(8, 10)))} 日`
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="mode" :options="modeOptions" />
      <view class="divider"></view>

      <template v-if="mode === 'interval'">
        <FormField label="开始日期">
          <picker mode="date" :value="startDate" :start="MIN_DATE" :end="MAX_DATE" @change="onDateChange('startDate', $event)">
            <view class="field-input picker-value">{{ startDate }}</view>
          </picker>
        </FormField>
        <FormField label="结束日期">
          <picker mode="date" :value="endDate" :start="MIN_DATE" :end="MAX_DATE" @change="onDateChange('endDate', $event)">
            <view class="field-input picker-value">{{ endDate }}</view>
          </picker>
        </FormField>
        <view class="btn-row date-actions">
          <view class="btn btn--plain btn--sm" @click="swapDates">交换日期</view>
          <view class="btn btn--plain btn--sm" @click="useToday('startDate')">开始设为今天</view>
          <view class="btn btn--plain btn--sm" @click="useToday('endDate')">结束设为今天</view>
        </view>
        <view class="date-extra">
          <SwitchRow v-model="includeBothEnds" label="结果包含首尾两天" hint="关闭时按自然日差计算，例如 1 日到 2 日为 1 天" />
        </view>
      </template>

      <template v-else-if="mode === 'offset'">
        <FormField label="基准日期">
          <picker mode="date" :value="baseDate" :start="MIN_DATE" :end="MAX_DATE" @change="onDateChange('baseDate', $event)">
            <view class="field-input picker-value">{{ baseDate }}</view>
          </picker>
        </FormField>
        <FormField label="天数" hint="请输入整数，将同时算出之后和之前 N 天的日期">
          <view class="input-row">
            <input class="field-input" type="number" :value="offsetInput" placeholder="例如 30" @input="offsetInput = $event.detail.value" />
            <text class="input-suffix">天</text>
          </view>
        </FormField>
        <view class="btn btn--plain btn--sm date-actions" @click="useToday('baseDate')">基准日期设为今天</view>
      </template>

      <template v-else-if="mode === 'today'">
        <FormField label="目标日期" :hint="`今天是 ${todayLabel}`">
          <picker mode="date" :value="targetDate" :start="MIN_DATE" :end="MAX_DATE" @change="onDateChange('targetDate', $event)">
            <view class="field-input picker-value">{{ targetDate }}</view>
          </picker>
        </FormField>
        <view class="btn btn--plain btn--sm date-actions" @click="useToday('targetDate')">目标日期设为今天</view>
      </template>

      <template v-else-if="mode === 'workday'">
        <view class="wd-sub">
          <Segmented v-model="workdayAlgo" :options="workdayAlgoOptions" />
        </view>

        <template v-if="workdayAlgo === 'range'">
          <FormField label="开始日期">
            <picker mode="date" :value="wdStartDate" :start="MIN_DATE" :end="MAX_DATE" @change="onWorkdayDateChange('wdStartDate', $event)">
              <view class="field-input picker-value">{{ wdStartDate }}</view>
            </picker>
          </FormField>
          <FormField label="结束日期">
            <picker mode="date" :value="wdEndDate" :start="MIN_DATE" :end="MAX_DATE" @change="onWorkdayDateChange('wdEndDate', $event)">
              <view class="field-input picker-value">{{ wdEndDate }}</view>
            </picker>
          </FormField>
          <view class="btn-row date-actions">
            <view class="btn btn--plain btn--sm" @click="swapWorkdayDates">交换日期</view>
            <view class="btn btn--plain btn--sm" @click="useWorkdayToday('wdStartDate')">开始设为今天</view>
            <view class="btn btn--plain btn--sm" @click="useWorkdayToday('wdEndDate')">结束设为今天</view>
          </view>
        </template>

        <template v-else>
          <FormField label="基准日期">
            <picker mode="date" :value="wdBaseDate" :start="MIN_DATE" :end="MAX_DATE" @change="onWorkdayDateChange('wdBaseDate', $event)">
              <view class="field-input picker-value">{{ wdBaseDate }}</view>
            </picker>
          </FormField>
          <FormField label="工作日天数" hint="正数向后推算，负数向前推算；填 0 时若基准日是休息日则顺延到下一个工作日">
            <view class="input-row">
              <input class="field-input" type="number" :value="wdOffsetInput" placeholder="例如 10" @input="wdOffsetInput = $event.detail.value" />
              <text class="input-suffix">天</text>
            </view>
          </FormField>
          <view class="btn btn--plain btn--sm date-actions" @click="useWorkdayToday('wdBaseDate')">基准日期设为今天</view>
        </template>
      </template>
    </view>

    <view v-if="mode === 'workday'" class="card wd-settings">
      <view class="section-head"><view class="section-title">额外设置</view></view>
      <view class="note note--info wd-note">
        默认按周一至周五计算，不含国家法定节假日；如需精确到调休，请在下方自行添加放假与补班日期。
      </view>
      <FormField label="额外休息日" hint="法定假日、调休放假等，每行或逗号分隔一个 YYYY-MM-DD">
        <textarea
          class="field-textarea wd-textarea"
          :value="daysOffText"
          :maxlength="-1"
          placeholder="例如 2026-01-01"
          @input="daysOffText = $event.detail.value"
        />
      </FormField>
      <FormField label="周末补班日" hint="调休上班的周末，每行或逗号分隔一个 YYYY-MM-DD">
        <textarea
          class="field-textarea wd-textarea"
          :value="makeUpText"
          :maxlength="-1"
          placeholder="例如 2026-02-08"
          @input="makeUpText = $event.detail.value"
        />
      </FormField>
    </view>

    <view v-if="activeError" class="note note--danger date-error">{{ activeError }}</view>

    <view class="section">
      <view class="section-head"><view class="section-title">计算结果</view></view>

      <!-- 相隔天数 -->
      <ResultPanel v-if="mode === 'interval'" title="两个日期相差" :copy-text="copyText">
        <template v-if="intervalResult.ok">
          <view class="result__label">{{ includeBothEnds ? '包含起始日和结束日' : '不含起始日' }}</view>
          <view class="result__value result__value--brand">{{ displayedDays }} <text class="date-unit">天</text></view>
          <view class="date-alt">
            另一种口径：{{ includeBothEnds ? `不含起始日为 ${intervalResult.value.absoluteDays} 天` : `包含首尾共 ${intervalResult.value.inclusiveDays} 天` }}
          </view>
          <view class="divider"></view>
          <view class="result-grid">
            <view class="result-grid__item">
              <view class="result-grid__k">年月日差</view>
              <view class="result-grid__v">{{ intervalResult.value.ymd.years }} 年 {{ intervalResult.value.ymd.months }} 月 {{ intervalResult.value.ymd.days }} 天</view>
            </view>
            <view class="result-grid__item">
              <view class="result-grid__k">起止星期</view>
              <view class="result-grid__v">{{ intervalResult.value.startWeekday }} → {{ intervalResult.value.endWeekday }}</view>
            </view>
          </view>
        </template>
        <view v-else class="muted small">请检查日期后重试</view>
      </ResultPanel>

      <!-- 前后 N 天 -->
      <ResultPanel v-else-if="mode === 'offset'" title="推算结果" :copy-text="copyText">
        <template v-if="offsetResult.ok">
          <view class="result__label">之后 {{ offsetResult.value.days }} 天</view>
          <view class="result__value result__value--brand">{{ offsetResult.value.after }}</view>
          <view class="date-alt">{{ offsetResult.value.afterWeekday }}</view>
          <view class="divider"></view>
          <view class="result__label">之前 {{ offsetResult.value.days }} 天</view>
          <view class="result__value result__value--sm">{{ offsetResult.value.before }}</view>
          <view class="date-alt">{{ offsetResult.value.beforeWeekday }}</view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>

      <!-- 距离今天 -->
      <ResultPanel v-else-if="mode === 'today'" title="距离今天" :copy-text="copyText">
        <template v-if="countdownResult.ok">
          <view class="result__label">{{ targetDate }} · {{ countdownResult.value.targetWeekday }}</view>
          <view class="result__value result__value--brand">
            <template v-if="countdownResult.value.direction === 'future'">还有 {{ countdownResult.value.days }} 天</template>
            <template v-else-if="countdownResult.value.direction === 'past'">已过去 {{ -countdownResult.value.days }} 天</template>
            <template v-else>就是今天</template>
          </view>
          <view class="date-alt">
            相差 {{ countdownResult.value.ymd.years }} 年 {{ countdownResult.value.ymd.months }} 个月 {{ countdownResult.value.ymd.days }} 天
          </view>
        </template>
        <view v-else class="muted small">请检查日期后重试</view>
      </ResultPanel>

      <!-- 工作日：区间工作日 -->
      <ResultPanel v-else-if="mode === 'workday' && workdayAlgo === 'range'" title="区间工作日统计" :copy-text="copyText">
        <template v-if="workdayRangeResult.ok">
          <view class="result__label">工作日天数</view>
          <view class="result__value result__value--brand">{{ workdayRangeResult.value.workdays }} <text class="date-unit">天</text></view>
          <view class="date-alt">{{ wdStartDate }} {{ workdayRangeResult.value.startWeekday }} → {{ wdEndDate }} {{ workdayRangeResult.value.endWeekday }}</view>
          <view class="divider"></view>
          <view class="stat-line"><text class="stat-line__k">自然日</text><text class="stat-line__v">{{ workdayRangeResult.value.totalDays }} 天</text></view>
          <view class="stat-line"><text class="stat-line__k">周末休息日</text><text class="stat-line__v">{{ workdayRangeResult.value.weekendDays }} 天</text></view>
          <view class="stat-line"><text class="stat-line__k">额外休息日</text><text class="stat-line__v">{{ workdayRangeResult.value.daysOffCount }} 天</text></view>
          <view class="stat-line"><text class="stat-line__k">补班工作日</text><text class="stat-line__v">{{ workdayRangeResult.value.makeUpCount }} 天</text></view>
        </template>
        <view v-else class="muted small">请检查日期后重试</view>
      </ResultPanel>

      <!-- 工作日：N 个工作日后 -->
      <ResultPanel v-else-if="mode === 'workday' && workdayAlgo === 'offset'" title="推算结果" :copy-text="copyText">
        <template v-if="workdayOffsetResult.ok">
          <view class="result__label">目标工作日</view>
          <view class="result__value result__value--brand">{{ workdayOffsetResult.value.date }}</view>
          <view class="date-alt">{{ workdayOffsetResult.value.weekday }} · 实际扫描 {{ workdayOffsetResult.value.scannedDays }} 个自然日</view>
        </template>
        <view v-else class="muted small">请检查输入后重试</view>
      </ResultPanel>

      <view class="note note--info date-note">
        日期按日历天数逐日计算，自动考虑闰年与大小月，不受手机时区与夏令时影响。日期格式统一为 YYYY-MM-DD。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.picker-value { line-height: 84rpx; }
/* 表单与按钮行之间保留明确间距，不依赖组件内部 margin 是否穿透 */
.date-actions { margin-top: 16rpx; }
.date-extra { margin-top: 12rpx; }
.date-unit { font-size: 28rpx; font-weight: 400; }
.date-alt { font-size: 24rpx; color: #7a8b84; margin-top: 8rpx; }
.date-error { margin-top: 20rpx; }
.date-note { margin-top: 20rpx; }
/* 工作日模式：子切换、额外设置卡片与两个较短的输入框 */
.wd-sub { margin-top: 4rpx; margin-bottom: 16rpx; }
.wd-settings .section-head { margin-bottom: 16rpx; }
.wd-note { margin-bottom: 8rpx; }
.wd-textarea { height: 160rpx; }
</style>

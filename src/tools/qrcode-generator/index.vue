<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { SelectOption } from '@/types/common'
import Segmented from '@/components/Segmented.vue'
import FormField from '@/components/FormField.vue'
import { saveImageToAlbum, useCanvas2d } from '@/services/image'
import { showError } from '@/services/feedback'
import {
  buildContactCard,
  createQrMatrix,
  validateContactCard,
  validateQrContent,
  type EccLevel
} from './logic'

type ContentType = 'text' | 'url' | 'card'
interface ColorOption {
  label: string
  value: string
}

const contentTypeOptions: Array<SelectOption<string>> = [
  { label: '普通文字', value: 'text' },
  { label: '网址', value: 'url' },
  { label: '名片', value: 'card' }
]
const sizeOptions: Array<SelectOption<number>> = [
  { label: '小 200px', value: 200 },
  { label: '中 280px', value: 280 },
  { label: '大 360px', value: 360 }
]
const foregrounds: ColorOption[] = [
  { label: '墨黑', value: '#1a1a1a' },
  { label: '品牌绿', value: '#2e9b6b' },
  { label: '深蓝', value: '#1f3a8a' },
  { label: '深红', value: '#8b1a1a' }
]
const backgrounds: ColorOption[] = [
  { label: '纯白', value: '#ffffff' },
  { label: '浅黄', value: '#fff6d9' },
  { label: '浅灰', value: '#ececec' }
]

const ECC: EccLevel = 'M'
const contentType = ref<ContentType>('text')
const text = ref('')
const cardName = ref('')
const cardPhone = ref('')
const cardEmail = ref('')
const sizePx = ref(280)
const fgColor = ref(foregrounds[0].value)
const bgColor = ref(backgrounds[0].value)

const canvasHelper = useCanvas2d()
const generated = ref(false)
const canvasError = ref('')
const matrix = ref<boolean[][]>([])
const moduleCount = ref(0)
let qrCanvasNode: unknown = null

const canvasStyle = computed(() => ({ width: `${sizePx.value}px`, height: `${sizePx.value}px` }))

const content = computed(() => {
  if (contentType.value === 'card') {
    return buildContactCard({ name: cardName.value, phone: cardPhone.value, email: cardEmail.value })
  }
  return text.value
})

const contentError = computed(() => {
  if (contentType.value === 'card') {
    return validateContactCard({ name: cardName.value, phone: cardPhone.value, email: cardEmail.value })
  }
  return validateQrContent(text.value)
})

const canGenerate = computed(() => contentError.value === null)

const contentHint = computed(() => {
  const error = contentError.value
  if (!error || !content.value.trim()) return ''
  return error
})

const fieldLabel = computed(() => (contentType.value === 'url' ? '网址' : '二维码内容'))
const fieldHint = computed(() =>
  contentType.value === 'url'
    ? '建议以 https:// 开头，例如 https://example.com；网址不做强制校验'
    : '输入任意文字，中文与表情符号均可生成为二维码'
)
const textareaPlaceholder = computed(() =>
  contentType.value === 'url' ? '请输入网址，例如 https://example.com' : '请输入要生成二维码的文字'
)

function handleCanvasError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err || '')
  generated.value = false
  qrCanvasNode = null
  if (message.indexOf('CANVAS_2D_UNAVAILABLE') !== -1) {
    canvasError.value = '当前微信版本较低，请升级微信后重试'
  } else {
    showError('生成二维码失败，请重试')
  }
}

async function renderMatrix(): Promise<boolean> {
  if (!matrix.value.length) return false
  try {
    const { canvas, ctx } = await canvasHelper.select('#qrCanvas')
    const display = sizePx.value
    const quiet = 4
    const total = moduleCount.value + quiet * 2
    const cell = Math.max(1, Math.floor(display / total))
    const used = cell * total
    const offset = Math.floor((display - used) / 2)
    // 真实改变画布尺寸；设置 width/height 会清空画布并重置绘图状态
    canvas.width = display
    canvas.height = display
    // 先铺满背景色（含静区），再用前景色绘制模块，坐标保持整数对齐
    ctx.fillStyle = bgColor.value
    ctx.fillRect(0, 0, display, display)
    ctx.fillStyle = fgColor.value
    for (let row = 0; row < moduleCount.value; row += 1) {
      const line = matrix.value[row]
      if (!line) continue
      for (let col = 0; col < moduleCount.value; col += 1) {
        if (line[col]) {
          ctx.fillRect(offset + (col + quiet) * cell, offset + (row + quiet) * cell, cell, cell)
        }
      }
    }
    qrCanvasNode = canvas
    return true
  } catch (err) {
    handleCanvasError(err)
    return false
  }
}

async function generate(): Promise<void> {
  canvasError.value = ''
  const error = contentError.value
  if (error !== null) {
    showError(error)
    return
  }
  const result = createQrMatrix(content.value, ECC)
  if (!result.ok) {
    showError(result.message)
    return
  }
  matrix.value = result.value.modules
  moduleCount.value = result.value.size
  generated.value = true
  await nextTick()
  const ok = await renderMatrix()
  if (!ok) generated.value = false
}

async function saveToAlbum(): Promise<void> {
  if (!generated.value || !qrCanvasNode) {
    showError('请先生成二维码')
    return
  }
  try {
    const path = await canvasHelper.toTempFile(qrCanvasNode, sizePx.value, sizePx.value, { fileType: 'png' })
    if (!path) {
      showError('导出图片失败，请重试')
      return
    }
    await saveImageToAlbum(path)
  } catch {
    showError('导出图片失败，请重试')
  }
}

watch([sizePx, fgColor, bgColor], () => {
  if (generated.value) void renderMatrix()
})

watch([contentType, text, cardName, cardPhone, cardEmail], () => {
  generated.value = false
  qrCanvasNode = null
  canvasError.value = ''
})
</script>

<template>
  <view>
    <view class="card">
      <Segmented v-model="contentType" :options="contentTypeOptions" />
      <view class="divider"></view>

      <template v-if="contentType === 'card'">
        <FormField label="姓名">
          <input class="field-input" :value="cardName" placeholder="请输入姓名" @input="cardName = $event.detail.value" />
        </FormField>
        <FormField label="电话">
          <input class="field-input" type="number" :value="cardPhone" placeholder="请输入电话" @input="cardPhone = $event.detail.value" />
        </FormField>
        <FormField label="邮箱" hint="姓名或电话至少填写一项">
          <input class="field-input" :value="cardEmail" placeholder="请输入邮箱（选填）" @input="cardEmail = $event.detail.value" />
        </FormField>
      </template>
      <template v-else>
        <FormField :label="fieldLabel" :hint="fieldHint">
          <textarea
            class="field-textarea"
            :value="text"
            :maxlength="-1"
            :placeholder="textareaPlaceholder"
            @input="text = $event.detail.value"
          />
        </FormField>
      </template>
    </view>

    <view class="card">
      <FormField label="二维码尺寸" hint="小 200px / 中 280px / 大 360px，切换会真实改变画布大小">
        <Segmented v-model="sizePx" :options="sizeOptions" />
      </FormField>
      <FormField label="前景色">
        <view class="color-row">
          <view
            v-for="item in foregrounds"
            :key="item.value"
            class="color-chip"
            :class="{ 'color-chip--active': fgColor === item.value }"
            @click="fgColor = item.value"
          >
            <view class="color-chip__box" :style="{ backgroundColor: item.value }"></view>
            <text class="color-chip__label">{{ item.label }}</text>
          </view>
        </view>
      </FormField>
      <FormField label="背景色">
        <view class="color-row">
          <view
            v-for="item in backgrounds"
            :key="item.value"
            class="color-chip"
            :class="{ 'color-chip--active': bgColor === item.value }"
            @click="bgColor = item.value"
          >
            <view class="color-chip__box" :style="{ backgroundColor: item.value }"></view>
            <text class="color-chip__label">{{ item.label }}</text>
          </view>
        </view>
      </FormField>
    </view>

    <view class="btn btn--primary btn--block qr-main-btn" :class="{ 'btn--disabled': !canGenerate }" @click="generate">生成二维码</view>
    <view v-if="contentHint" class="note note--danger qr-tip">{{ contentHint }}</view>
    <view v-if="canvasError" class="note note--danger qr-tip">{{ canvasError }}</view>

    <view v-if="generated" class="section">
      <view class="section-head"><view class="section-title">二维码预览</view></view>
      <view class="qr-preview">
        <canvas type="2d" id="qrCanvas" :style="canvasStyle"></canvas>
      </view>
      <view class="btn-row qr-actions">
        <view class="btn btn--primary" @click="saveToAlbum">保存到相册</view>
      </view>
    </view>

    <view class="note note--info qr-tip">内容只在本机生成二维码，不会上传。</view>
  </view>
</template>

<style lang="scss" scoped>
/* 不用 flex gap：色块行列间距改用 margin，兼容低版本 WebView */
.color-row { display: flex; flex-wrap: wrap; }
.color-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120rpx;
  margin-right: 20rpx;
  margin-bottom: 20rpx;
}
.color-chip__box { width: 64rpx; height: 64rpx; border-radius: 12rpx; border: 2rpx solid #dddddd; }
.color-chip--active .color-chip__box { border: 4rpx solid #3eaf7c; }
.color-chip__label { font-size: 23rpx; color: #666666; margin-top: 8rpx; }
.color-chip--active .color-chip__label { color: #33996b; font-weight: 600; }
.qr-preview {
  display: flex;
  justify-content: center;
  padding: 24rpx;
  background: #ffffff;
  border: 1rpx solid #eeeeee;
  border-radius: 18rpx;
}
.qr-actions { margin-top: 24rpx; }
/* 主按钮紧跟上一张卡片，需要显式留出间距 */
.qr-main-btn { margin-top: 24rpx; }
.qr-actions > .btn { flex: 1; }
.qr-tip { margin-top: 24rpx; }
</style>

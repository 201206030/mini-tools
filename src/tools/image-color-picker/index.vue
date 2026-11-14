<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from 'vue'
import Segmented from '@/components/Segmented.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  chooseImage,
  clampCanvasSize,
  loadCanvasImage,
  useCanvas2d,
  type PickedImage
} from '@/services/image'
import { copyText } from '@/services/clipboard'
import { hideLoading, showError, showLoading } from '@/services/feedback'
import { formatPercent } from '@/utils/format'
import type { SelectOption } from '@/types/common'
import {
  averageColor,
  buildColorGrid,
  contrastTextColor,
  describeColor,
  extractDominant,
  rgbToHex,
  rgbToHsl,
  type Rgb
} from './logic'

const canvasHelper = useCanvas2d()
const picked = ref<PickedImage | null>(null)
const pixels = shallowRef<ArrayLike<number> | null>(null)
const imgW = ref(1)
const imgH = ref(1)
const canvasW = ref(1)
const canvasH = ref(1)
const canvasError = ref('')
const busy = ref(false)
const grid = ref<string | number>(6)
const selectedRgb = ref<Rgb | null>(null)

const gridOptions: SelectOption<string | number>[] = [
  { label: '6×6', value: 6 },
  { label: '8×8', value: 8 },
  { label: '10×10', value: 10 }
]

const canvasStyle = computed(() => ({ width: `${canvasW.value}px`, height: `${canvasH.value}px` }))
const originalPath = computed(() => (picked.value ? picked.value.path : ''))

const gridCells = computed(() => {
  const data = pixels.value
  if (!data) return []
  const colors = buildColorGrid(data, imgW.value, imgH.value, Number(grid.value))
  return colors.map((rgb) => ({ rgb, hex: rgbToHex(rgb), textColor: contrastTextColor(rgb) }))
})

const dominantList = computed(() => {
  const data = pixels.value
  if (!data) return []
  return extractDominant(data, 6).map((item) => ({
    rgb: item.rgb,
    hex: item.hex,
    ratioText: formatPercent(item.ratio),
    desc: describeColor(item.rgb)
  }))
})

const selectedHex = computed(() => (selectedRgb.value ? rgbToHex(selectedRgb.value) : ''))
const selectedRgbText = computed(() => {
  const c = selectedRgb.value
  return c ? `${c.r}, ${c.g}, ${c.b}` : ''
})
const selectedHslText = computed(() => {
  const c = selectedRgb.value
  const hsl = rgbToHsl(c || { r: 0, g: 0, b: 0 })
  return c ? `${hsl.h}°, ${hsl.s}%, ${hsl.l}%` : ''
})
const selectedDesc = computed(() => (selectedRgb.value ? describeColor(selectedRgb.value) : ''))
const selectedTextColor = computed(() => contrastTextColor(selectedRgb.value || { r: 0, g: 0, b: 0 }))

function pickColor(rgb: Rgb): void {
  selectedRgb.value = { ...rgb }
  copyText(rgbToHex(rgb))
}

function handleAnalyzeError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err || '')
  if (message.indexOf('NO_GET_IMAGE_DATA') !== -1) {
    canvasError.value = '当前微信版本不支持读取图片像素，请升级微信后重试'
  } else if (message.indexOf('CANVAS_2D_UNAVAILABLE') !== -1) {
    canvasError.value = '当前微信版本不支持画布 2D，请升级微信后重试'
  } else {
    canvasError.value = message || '图片分析失败，请重试'
  }
}

async function analyze(image: PickedImage): Promise<void> {
  if (busy.value) return
  busy.value = true
  canvasError.value = ''
  showLoading('正在分析图片')
  try {
    const { canvas, ctx } = await canvasHelper.select('#colorCanvas')
    const bitmap = await loadCanvasImage(canvas, image.path)
    const srcW = image.width > 0 ? image.width : Number(bitmap && bitmap.width) || 0
    const srcH = image.height > 0 ? image.height : Number(bitmap && bitmap.height) || 0
    const baseW = srcW > 0 ? srcW : 240
    const baseH = srcH > 0 ? srcH : 240
    // 绘制边长限制在 240px 左右，再交给 clampCanvasSize 做单边上限兜底
    const scale = Math.min(1, 240 / Math.max(baseW, baseH))
    const preW = Math.max(1, Math.round(baseW * scale))
    const preH = Math.max(1, Math.round(baseH * scale))
    const clamped = clampCanvasSize(preW, preH)
    const w = clamped.width
    const h = clamped.height
    canvasW.value = w
    canvasH.value = h
    await nextTick()
    canvas.width = w
    canvas.height = h
    ctx.drawImage(bitmap, 0, 0, w, h)
    if (typeof ctx.getImageData !== 'function') {
      throw new Error('NO_GET_IMAGE_DATA')
    }
    let data: ArrayLike<number> | null = null
    try {
      const imageData = ctx.getImageData(0, 0, w, h)
      data = imageData && imageData.data ? imageData.data : null
    } catch {
      throw new Error('NO_GET_IMAGE_DATA')
    }
    if (!data || data.length < 4) {
      throw new Error('图片像素为空，请更换图片重试')
    }
    pixels.value = data
    imgW.value = w
    imgH.value = h
    const dom = extractDominant(data, 1)
    selectedRgb.value = dom.length
      ? { ...dom[0].rgb }
      : averageColor(data, w, { x: 0, y: 0, w, h })
  } catch (err) {
    pixels.value = null
    selectedRgb.value = null
    handleAnalyzeError(err)
  } finally {
    hideLoading()
    busy.value = false
  }
}

async function pickImage(): Promise<void> {
  try {
    const image = await chooseImage()
    picked.value = image
    await analyze(image)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    if (message.indexOf('CANCELLED') !== -1) return
    showError(message || '选择图片失败，请重试')
  }
}

async function reanalyze(): Promise<void> {
  if (picked.value) await analyze(picked.value)
}
</script>

<template>
  <view>
    <view class="card">
      <view v-if="!picked" class="btn btn--primary btn--block" @click="pickImage">选择图片</view>
      <template v-else>
        <image class="cp-preview" :src="originalPath" mode="aspectFit"></image>
        <view class="btn-row cp-actions">
          <view class="btn btn--plain btn--sm" @click="pickImage">更换图片</view>
          <view class="btn btn--plain btn--sm" :class="{ 'btn--disabled': busy }" @click="reanalyze">重新分析</view>
        </view>
      </template>
    </view>

    <view v-if="canvasError" class="note note--danger cp-tip">{{ canvasError }}</view>

    <template v-if="pixels">
      <view class="section">
        <view class="section-head">
          <view class="section-title">取色网格</view>
          <view class="section-more">共 {{ gridCells.length }} 格 · 点击复制</view>
        </view>
        <view class="card">
          <Segmented v-model="grid" :options="gridOptions" />
          <view class="grid grid--4 cp-grid">
            <view v-for="(cell, idx) in gridCells" :key="idx" class="grid-cell">
              <view class="cp-cell" :style="{ backgroundColor: cell.hex }" @click="pickColor(cell.rgb)">
                <text class="cp-cell__hex" :style="{ color: cell.textColor }">{{ cell.hex }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view class="section-title">主色调 Top 6</view>
          <view class="section-more">点击复制</view>
        </view>
        <view class="card">
          <view v-for="(item, idx) in dominantList" :key="idx" class="list-item" @click="pickColor(item.rgb)">
            <view class="cp-swatch" :style="{ backgroundColor: item.hex }"></view>
            <view class="list-item__body">
              <view class="list-item__title">{{ item.hex }}</view>
              <view class="list-item__desc">{{ item.desc }}</view>
            </view>
            <text class="tag">{{ item.ratioText }}</text>
          </view>
        </view>
      </view>

      <view v-if="selectedRgb" class="section">
        <view class="section-head"><view class="section-title">当前选中色</view></view>
        <ResultPanel title="颜色信息" :copy-text="selectedHex">
          <view class="cp-current" :style="{ backgroundColor: selectedHex }">
            <text class="cp-current__hex" :style="{ color: selectedTextColor }">{{ selectedHex }}</text>
            <text class="cp-current__desc" :style="{ color: selectedTextColor }">{{ selectedDesc }}</text>
          </view>
          <view class="stat-line"><text class="stat-line__k">HEX</text><text class="stat-line__v">{{ selectedHex }}</text></view>
          <view class="stat-line"><text class="stat-line__k">RGB</text><text class="stat-line__v">{{ selectedRgbText }}</text></view>
          <view class="stat-line"><text class="stat-line__k">HSL</text><text class="stat-line__v">{{ selectedHslText }}</text></view>
          <view class="stat-line"><text class="stat-line__k">颜色描述</text><text class="stat-line__v">{{ selectedDesc }}</text></view>
        </ResultPanel>
      </view>
    </template>

    <EmptyState v-else-if="!busy && !canvasError" text="还没有分析图片" hint="选择一张图片后即可取色" />

    <view class="note note--info cp-tip">
      颜色按区域平均色计算，图片只在本机处理，不会上传。
    </view>

    <!-- 画布仅用于读取像素，真实挂载但移出屏幕，不使用 display:none -->
    <view class="offscreen">
      <canvas type="2d" id="colorCanvas" :style="canvasStyle"></canvas>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cp-preview { width: 100%; height: 300rpx; background: #F7F8FA; border-radius: 16rpx; }
.cp-actions { margin-top: 24rpx; }
.cp-tip { margin-top: 24rpx; }
.cp-grid { margin-top: 24rpx; }
.cp-cell {
  height: 96rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cp-cell:active { opacity: 0.75; }
.cp-cell__hex { font-size: 18rpx; font-weight: 600; }
.cp-swatch {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
  border: 1rpx solid #EEEEEE;
}
.cp-current {
  border-radius: 16rpx;
  padding: 36rpx 24rpx;
  text-align: center;
  margin-bottom: 12rpx;
}
.cp-current__hex { display: block; font-size: 46rpx; font-weight: 700; }
.cp-current__desc { display: block; font-size: 26rpx; margin-top: 8rpx; }
.offscreen { position: fixed; left: -9999px; top: 0; width: 1rpx; height: 1rpx; overflow: hidden; }
</style>

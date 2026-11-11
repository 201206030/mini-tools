<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import FormField from '@/components/FormField.vue'
import {
  chooseImage,
  clampCanvasSize,
  compressImage,
  getFileSize,
  loadCanvasImage,
  saveImageToAlbum,
  useCanvas2d,
  type PickedImage
} from '@/services/image'
import { hideLoading, showError, showInfo, showLoading } from '@/services/feedback'
import { formatFileSize, formatPercent } from '@/utils/format'
import { compressionStats, validateQuality } from './logic'

const canvasHelper = useCanvas2d()
const picked = ref<PickedImage | null>(null)
const quality = ref(70)
const resultPath = ref('')
const resultSize = ref(0)
const fallbackUsed = ref(false)
const canvasError = ref('')
const busy = ref(false)
const canvasW = ref(100)
const canvasH = ref(100)

const canvasStyle = computed(() => ({ width: `${canvasW.value}px`, height: `${canvasH.value}px` }))
const stats = computed(() => compressionStats(picked.value ? picked.value.size : 0, resultSize.value))
const originalSizeText = computed(() => (picked.value ? formatFileSize(picked.value.size) : '—'))
const originalPath = computed(() => (picked.value ? picked.value.path : ''))
const originalWidth = computed(() => (picked.value ? picked.value.width : 0))
const originalHeight = computed(() => (picked.value ? picked.value.height : 0))
const resultSizeText = computed(() => formatFileSize(resultSize.value))
const ratioText = computed(() => (resultSize.value > 0 ? formatPercent(stats.value.ratio) : '—'))
const savedText = computed(() => (stats.value.saved > 0 ? formatFileSize(stats.value.saved) : '0 B'))
const qualityHint = computed(() => `当前 ${quality.value}%（数值越小压缩越强）`)

function onQualityChange(event: any): void {
  const value = Number((event && event.detail && event.detail.value) || 70)
  quality.value = Number.isFinite(value) ? Math.round(value) : 70
}

async function pickImage(): Promise<void> {
  try {
    const image = await chooseImage()
    picked.value = image
    resultPath.value = ''
    resultSize.value = 0
    fallbackUsed.value = false
    canvasError.value = ''
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    // 用户主动取消选择：静默返回
    if (message.indexOf('CANCELLED') !== -1) return
    showError(message || '选择图片失败，请重试')
  }
}

/** 兜底路径：本机画布按目标尺寸重新编码为 JPG，真实生成压缩文件 */
async function compressWithCanvas(image: PickedImage, q: number): Promise<{ path: string; size: number }> {
  const { canvas, ctx } = await canvasHelper.select('#compressCanvas')
  const bitmap = await loadCanvasImage(canvas, image.path)
  const target = clampCanvasSize(image.width, image.height)
  canvasW.value = target.width
  canvasH.value = target.height
  await nextTick()
  // 先设置真实画布尺寸，再铺白底并绘制；PNG 透明区域会变成白色
  canvas.width = target.width
  canvas.height = target.height
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, target.width, target.height)
  ctx.drawImage(bitmap, 0, 0, target.width, target.height)
  const filePath = await canvasHelper.toTempFile(canvas, target.width, target.height, {
    fileType: 'jpg',
    quality: q / 100
  })
  if (!filePath) throw new Error('导出图片失败')
  const size = await getFileSize(filePath)
  return { path: filePath, size }
}

function handleCanvasError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err || '')
  if (message.indexOf('CANVAS_2D_UNAVAILABLE') !== -1) {
    canvasError.value = '当前微信版本较低，请升级微信后重试'
  } else {
    showError('图片压缩失败，请重试')
  }
}

async function startCompress(): Promise<void> {
  const image = picked.value
  if (!image) {
    showError('请先选择图片')
    return
  }
  if (busy.value) return
  const qError = validateQuality(quality.value)
  if (qError) {
    showError(qError)
    return
  }
  busy.value = true
  canvasError.value = ''
  showLoading('正在压缩')
  try {
    let outPath = ''
    let outSize = 0
    let needFallback = false
    try {
      outPath = await compressImage(image.path, quality.value)
      if (!outPath) throw new Error('压缩结果为空')
      outSize = await getFileSize(outPath)
      // 失败或结果没有变小，改用画布重新编码
      if (outSize <= 0 || outSize >= image.size) needFallback = true
    } catch {
      needFallback = true
    }
    if (needFallback) {
      const fallback = await compressWithCanvas(image, quality.value)
      outPath = fallback.path
      outSize = fallback.size
      fallbackUsed.value = true
    } else {
      fallbackUsed.value = false
    }
    if (!outPath) {
      showError('图片压缩失败，请重试')
      return
    }
    resultPath.value = outPath
    resultSize.value = outSize
    if (!stats.value.smaller) showInfo('压缩后体积未明显减小，可尝试降低质量后重试')
  } catch (err) {
    resultPath.value = ''
    resultSize.value = 0
    handleCanvasError(err)
  } finally {
    hideLoading()
    busy.value = false
  }
}

async function save(): Promise<void> {
  if (!resultPath.value) {
    showError('请先压缩图片')
    return
  }
  await saveImageToAlbum(resultPath.value)
}
</script>

<template>
  <view>
    <view class="card">
      <view v-if="!picked" class="btn btn--primary btn--block" @click="pickImage">选择图片</view>
      <template v-else>
        <image class="preview-img" :src="originalPath" mode="widthFix"></image>
        <view class="stat-line">
          <text class="stat-line__k">原始大小</text>
          <text class="stat-line__v">{{ originalSizeText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">原始尺寸</text>
          <text class="stat-line__v">{{ originalWidth }} × {{ originalHeight }}</text>
        </view>
      </template>
    </view>

    <view class="card">
      <FormField label="压缩质量" :hint="qualityHint">
        <slider :min="10" :max="100" :value="quality" show-value activeColor="#3eaf7c" @change="onQualityChange" />
      </FormField>
      <view class="btn-row">
        <view class="btn btn--primary" :class="{ 'btn--disabled': !picked || busy }" @click="startCompress">开始压缩</view>
        <view class="btn btn--plain" @click="pickImage">更换图片</view>
      </view>
    </view>

    <view v-if="canvasError" class="note note--danger cmp-tip">{{ canvasError }}</view>

    <view v-if="resultPath" class="section">
      <view class="section-head"><view class="section-title">压缩结果</view></view>
      <view class="card">
        <image class="preview-img" :src="resultPath" mode="widthFix"></image>
        <view class="stat-line">
          <text class="stat-line__k">压缩后大小</text>
          <text class="stat-line__v">{{ resultSizeText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">压缩后约为原图</text>
          <text class="stat-line__v">{{ ratioText }}</text>
        </view>
        <view class="stat-line">
          <text class="stat-line__k">节省空间</text>
          <text class="stat-line__v">{{ savedText }}</text>
        </view>
      </view>
      <view v-if="fallbackUsed" class="note note--info cmp-tip">已改用本机画布重新编码为 JPG，透明背景会变成白色。</view>
      <view class="btn btn--primary btn--block cmp-tip" @click="save">保存到相册</view>
    </view>

    <view class="note note--info cmp-tip">
      支持微信可选取的常见 JPG/PNG 等格式；微信压缩接口对 JPG 效果明显，PNG 等格式会自动改用本机画布重新编码为 JPG，透明背景会变成白色；图片全程不上传。
    </view>

    <!-- 画布必须可见可选取，仅移出屏幕，不使用 display:none -->
    <view class="offscreen">
      <canvas type="2d" id="compressCanvas" :style="canvasStyle"></canvas>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.preview-img { width: 100%; border-radius: 16rpx; }
.cmp-tip { margin-top: 24rpx; }
.offscreen { position: fixed; left: -9999px; top: 0; width: 1rpx; height: 1rpx; overflow: hidden; }
</style>

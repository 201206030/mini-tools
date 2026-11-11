<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import FormField from '@/components/FormField.vue'
import SwitchRow from '@/components/SwitchRow.vue'
import {
  chooseImage,
  loadCanvasImage,
  saveImageToAlbum,
  useCanvas2d,
  type PickedImage
} from '@/services/image'
import { hideLoading, showError, showLoading } from '@/services/feedback'
import { toInteger } from '@/utils/number'
import type { CalcResult } from '@/types/common'
import { calcTargetSize, MAX_SIDE, resizeInfo, type ChangedSide } from './logic'

const canvasHelper = useCanvas2d()
const picked = ref<PickedImage | null>(null)
const widthInput = ref('')
const heightInput = ref('')
const lockRatio = ref(true)
const lastChanged = ref<ChangedSide>('width')
const resultPath = ref('')
const canvasError = ref('')
const busy = ref(false)
const canvasW = ref(1)
const canvasH = ref(1)

const canvasStyle = computed(() => ({ width: `${canvasW.value}px`, height: `${canvasH.value}px` }))
const originalPath = computed(() => (picked.value ? picked.value.path : ''))
const originalWidth = computed(() => (picked.value ? picked.value.width : 0))
const originalHeight = computed(() => (picked.value ? picked.value.height : 0))

const sizeCheck = computed<CalcResult<{ width: number; height: number }> | null>(() => {
  const image = picked.value
  if (!image) return null
  const w = toInteger(widthInput.value)
  const h = toInteger(heightInput.value)
  if (w === null || h === null) return { ok: false, message: '宽高必须是整数' }
  return calcTargetSize(image.width, image.height, w, h, lockRatio.value, lastChanged.value)
})

const sizeError = computed(() => {
  const check = sizeCheck.value
  return check && !check.ok ? check.message : ''
})

const infoText = computed(() => {
  const image = picked.value
  const check = sizeCheck.value
  if (!image || !check || !check.ok) return ''
  return resizeInfo(image.width, image.height, check.value.width, check.value.height)
})

async function pickImage(): Promise<void> {
  try {
    const image = await chooseImage()
    picked.value = image
    // 原图可能超过单边上限，初始目标按比例缩放到合法范围
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
    widthInput.value = String(Math.max(1, Math.round(image.width * scale)))
    heightInput.value = String(Math.max(1, Math.round(image.height * scale)))
    resultPath.value = ''
    canvasError.value = ''
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    if (message.indexOf('CANCELLED') !== -1) return
    showError(message || '选择图片失败，请重试')
  }
}

/** 锁定比例时由 changed 边推算另一边；直接赋值不会触发 @input，避免循环 */
function syncLocked(changed: ChangedSide, raw: string): void {
  const image = picked.value
  if (!lockRatio.value || !image) return
  const primary = toInteger(raw)
  if (primary === null) return
  // 锁定模式下 calcTargetSize 只用 changed 边推算，另一边参数传占位值即可
  const result = calcTargetSize(image.width, image.height, primary, primary, true, changed)
  if (!result.ok) return
  if (changed === 'width') heightInput.value = String(result.value.height)
  else widthInput.value = String(result.value.width)
}

function onWidthInput(event: any): void {
  widthInput.value = String((event && event.detail && event.detail.value) || '')
  lastChanged.value = 'width'
  syncLocked('width', widthInput.value)
}

function onHeightInput(event: any): void {
  heightInput.value = String((event && event.detail && event.detail.value) || '')
  lastChanged.value = 'height'
  syncLocked('height', heightInput.value)
}

watch(lockRatio, (locked) => {
  if (locked) syncLocked(lastChanged.value, lastChanged.value === 'width' ? widthInput.value : heightInput.value)
})

function handleCanvasError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err || '')
  if (message.indexOf('CANVAS_2D_UNAVAILABLE') !== -1) {
    canvasError.value = '当前微信版本较低，请升级微信后重试'
  } else {
    showError('图片尺寸调整失败，请重试')
  }
}

async function preview(): Promise<void> {
  const image = picked.value
  const check = sizeCheck.value
  if (!image || !check || !check.ok) {
    showError(check && !check.ok ? check.message : '请先选择图片')
    return
  }
  if (busy.value) return
  const { width, height } = check.value
  busy.value = true
  canvasError.value = ''
  showLoading('正在生成预览')
  try {
    const { canvas, ctx } = await canvasHelper.select('#resizeCanvas')
    const bitmap = await loadCanvasImage(canvas, image.path)
    canvasW.value = width
    canvasH.value = height
    await nextTick()
    canvas.width = width
    canvas.height = height
    ctx.drawImage(bitmap, 0, 0, width, height)
    const filePath = await canvasHelper.toTempFile(canvas, width, height, { fileType: 'png' })
    if (!filePath) {
      showError('生成预览失败，请重试')
      return
    }
    resultPath.value = filePath
  } catch (err) {
    resultPath.value = ''
    handleCanvasError(err)
  } finally {
    hideLoading()
    busy.value = false
  }
}

async function save(): Promise<void> {
  if (!resultPath.value) {
    showError('请先预览调整结果')
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
          <text class="stat-line__k">原始尺寸</text>
          <text class="stat-line__v">{{ originalWidth }} × {{ originalHeight }}</text>
        </view>
      </template>
    </view>

    <view class="card">
      <FormField label="目标宽度" hint="1 到 4096 之间的整数">
        <input class="field-input" type="number" :value="widthInput" placeholder="请输入宽度" @input="onWidthInput" />
      </FormField>
      <FormField label="目标高度" hint="1 到 4096 之间的整数">
        <input class="field-input" type="number" :value="heightInput" placeholder="请输入高度" @input="onHeightInput" />
      </FormField>
      <SwitchRow v-model="lockRatio" label="锁定宽高比" hint="开启后修改任一边会按比例自动调整另一边" />
      <view v-if="sizeError" class="note note--danger rsz-tip">{{ sizeError }}</view>
      <view v-else-if="infoText" class="note note--info rsz-tip">{{ infoText }}</view>
      <view class="btn btn--primary btn--block rsz-tip" :class="{ 'btn--disabled': !picked || busy }" @click="preview">预览调整结果</view>
    </view>

    <view v-if="canvasError" class="note note--danger rsz-tip">{{ canvasError }}</view>

    <view v-if="resultPath" class="section">
      <view class="section-head"><view class="section-title">预览结果</view></view>
      <view class="card">
        <image class="preview-img" :src="resultPath" mode="widthFix"></image>
      </view>
      <view class="btn btn--primary btn--block rsz-tip" @click="save">保存到相册</view>
    </view>

    <view class="note note--info rsz-tip">
      大图会占用较多内存，建议按需缩小尺寸；处理结果只在本机，不会上传；画布绘制需要微信基础库 2.9.0 及以上，版本过低时请升级微信后重试。
    </view>

    <!-- 画布必须可见可选取，仅移出屏幕，不使用 display:none -->
    <view class="offscreen">
      <canvas type="2d" id="resizeCanvas" :style="canvasStyle"></canvas>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.preview-img { width: 100%; border-radius: 16rpx; }
.rsz-tip { margin-top: 24rpx; }
.offscreen { position: fixed; left: -9999px; top: 0; width: 1rpx; height: 1rpx; overflow: hidden; }
</style>

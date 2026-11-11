import type { CalcResult } from '@/types/common'

export const MAX_SIDE = 4096
export type ChangedSide = 'width' | 'height'

/**
 * 计算目标尺寸。
 * lockRatio 时按原图比例由 changed 边自动推算另一边；单边限制 1..4096。
 */
export function calcTargetSize(
  origW: number,
  origH: number,
  width: number,
  height: number,
  lockRatio: boolean,
  changed: ChangedSide
): CalcResult<{ width: number; height: number }> {
  if (!Number.isFinite(origW) || !Number.isFinite(origH) || origW <= 0 || origH <= 0) {
    return { ok: false, message: '原图尺寸无效，请重新选择图片' }
  }
  const primary = changed === 'width' ? width : height
  if (!Number.isInteger(primary) || primary < 1 || primary > MAX_SIDE) {
    return { ok: false, message: `宽高需为 1 到 ${MAX_SIDE} 之间的整数` }
  }
  if (lockRatio) {
    const outW = changed === 'width' ? primary : Math.round((primary * origW) / origH)
    const outH = changed === 'height' ? primary : Math.round((primary * origH) / origW)
    if (outW < 1 || outW > MAX_SIDE || outH < 1 || outH > MAX_SIDE) {
      return { ok: false, message: '按原图比例换算后超出 1 到 4096 的范围，请调小尺寸或关闭锁定宽高比' }
    }
    return { ok: true, value: { width: outW, height: outH } }
  }
  const other = changed === 'width' ? height : width
  if (!Number.isInteger(other) || other < 1 || other > MAX_SIDE) {
    return { ok: false, message: `宽高需为 1 到 ${MAX_SIDE} 之间的整数` }
  }
  return { ok: true, value: { width, height } }
}

/** 中文说明缩放比例 */
export function resizeInfo(origW: number, origH: number, targetW: number, targetH: number): string {
  if (!Number.isFinite(origW) || !Number.isFinite(origH) || origW <= 0 || origH <= 0) {
    return '原图尺寸无效'
  }
  const wRatio = Math.round((targetW / origW) * 100)
  const hRatio = Math.round((targetH / origH) * 100)
  return `宽度缩放为原图的 ${wRatio}%，高度缩放为原图的 ${hRatio}%（${origW}×${origH} → ${targetW}×${targetH}）`
}

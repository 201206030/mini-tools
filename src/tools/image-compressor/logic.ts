export interface CompressionStats {
  /** 压缩后 / 压缩前 的百分比 */
  ratio: number
  /** 节省的字节数 */
  saved: number
  /** 压缩后是否确实变小 */
  smaller: boolean
}

/** 压缩质量校验（滑块范围 10—100） */
export function validateQuality(q: number): string | null {
  if (!Number.isFinite(q) || !Number.isInteger(q) || q < 10 || q > 100) {
    return '压缩质量需为 10 到 100 之间的整数'
  }
  return null
}

/** 压缩效果统计：比例为压缩后占压缩前的百分比，saved 为节省字节数 */
export function compressionStats(before: number, after: number): CompressionStats {
  if (!Number.isFinite(before) || before <= 0 || !Number.isFinite(after) || after < 0) {
    return { ratio: 0, saved: 0, smaller: false }
  }
  return {
    ratio: (after / before) * 100,
    saved: before - after,
    smaller: after < before
  }
}

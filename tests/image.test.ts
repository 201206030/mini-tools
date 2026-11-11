import { describe, expect, it } from 'vitest'
import { compressionStats, validateQuality } from '@/tools/image-compressor/logic'
import { MAX_SIDE, calcTargetSize, resizeInfo } from '@/tools/image-resizer/logic'

describe('图片压缩参数与统计', () => {
  it('压缩质量只接受 10..100 的整数', () => {
    expect(validateQuality(10)).toBeNull()
    expect(validateQuality(100)).toBeNull()
    expect(validateQuality(75)).toBeNull()
    expect(validateQuality(9)).toContain('10 到 100')
    expect(validateQuality(101)).toContain('10 到 100')
    expect(validateQuality(50.5)).toContain('整数')
    expect(validateQuality(NaN)).toContain('10 到 100')
    expect(validateQuality(Infinity)).toContain('10 到 100')
  })

  it('压缩比例、节省空间与是否变小', () => {
    expect(compressionStats(1000, 400)).toEqual({ ratio: 40, saved: 600, smaller: true })
    expect(compressionStats(1000, 1000)).toEqual({ ratio: 100, saved: 0, smaller: false })
    expect(compressionStats(1000, 1200)).toEqual({ ratio: 120, saved: -200, smaller: false })
  })

  it('非法文件大小安全降级', () => {
    expect(compressionStats(0, 100)).toEqual({ ratio: 0, saved: 0, smaller: false })
    expect(compressionStats(-1, 100)).toEqual({ ratio: 0, saved: 0, smaller: false })
    expect(compressionStats(NaN, 100)).toEqual({ ratio: 0, saved: 0, smaller: false })
    expect(compressionStats(1000, NaN)).toEqual({ ratio: 0, saved: 0, smaller: false })
  })
})

describe('图片尺寸调整', () => {
  it('锁定宽高比时由改动边推算另一边', () => {
    const byWidth = calcTargetSize(1000, 500, 500, 0, true, 'width')
    expect(byWidth.ok && byWidth.value).toEqual({ width: 500, height: 250 })
    const byHeight = calcTargetSize(1000, 500, 0, 250, true, 'height')
    expect(byHeight.ok && byHeight.value).toEqual({ width: 500, height: 250 })
  })

  it('不锁定比例时两个输入框都生效', () => {
    expect(calcTargetSize(1000, 500, 400, 300, false, 'width').ok).toBe(true)
    const result = calcTargetSize(1000, 500, 400, 300, false, 'width')
    expect(result.ok && result.value).toEqual({ width: 400, height: 300 })
  })

  it('比例换算后超出上限时给出中文提示', () => {
    // 原图 100×1000，宽度放大到 4096 时高度会达到 40960，必须拦截
    const result = calcTargetSize(100, 1000, 4096, 0, true, 'width')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('超出')
  })

  it('拦截非法原图尺寸、非整数与越界宽高', () => {
    expect(calcTargetSize(0, 500, 100, 100, false, 'width').ok).toBe(false)
    expect(calcTargetSize(NaN, 500, 100, 100, false, 'width').ok).toBe(false)
    expect(calcTargetSize(1000, 500, 0, 100, true, 'width').ok).toBe(false)
    expect(calcTargetSize(1000, 500, MAX_SIDE + 1, 100, true, 'width').ok).toBe(false)
    expect(calcTargetSize(1000, 500, 100.5, 100, false, 'width').ok).toBe(false)
    expect(calcTargetSize(1000, 500, 100, 0, false, 'width').ok).toBe(false)
    expect(calcTargetSize(1000, 500, 100, NaN, false, 'width').ok).toBe(false)
  })

  it('1 像素与 4096 像素边界可通过', () => {
    expect(calcTargetSize(100, 100, 1, 1, false, 'width').ok).toBe(true)
    expect(calcTargetSize(100, 100, MAX_SIDE, MAX_SIDE, false, 'width').ok).toBe(true)
  })

  it('中文缩放说明与非法尺寸提示', () => {
    expect(resizeInfo(1000, 500, 500, 250)).toContain('宽度缩放为原图的 50%')
    expect(resizeInfo(1000, 500, 500, 250)).toContain('1000×500 → 500×250')
    expect(resizeInfo(0, 0, 0, 0)).toBe('原图尺寸无效')
    expect(resizeInfo(NaN, 500, 1, 1)).toBe('原图尺寸无效')
  })
})

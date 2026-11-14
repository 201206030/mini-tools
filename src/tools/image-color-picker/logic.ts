/**
 * 图片取色器纯函数逻辑。
 * 不依赖 uni / wx / DOM / Canvas，像素数据以 RGBA 顺序的 ArrayLike<number> 传入，便于 Node 环境单测。
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** 十六进制颜色字符串，形如大写 #RRGGBB */
export type HexColor = string

export interface Hsl {
  /** 色相 0..360 */
  h: number
  /** 饱和度 0..100（百分比数值） */
  s: number
  /** 明度 0..100（百分比数值） */
  l: number
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 }

/** 把任意输入收敛为 0..255 的整数通道值 */
function clampByte(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(255, Math.round(n)))
}

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

/** RGB 转大写 #RRGGBB，无效输入按黑色处理 */
export function rgbToHex(rgb: Rgb): string {
  const r = clampByte(rgb ? rgb.r : 0)
  const g = clampByte(rgb ? rgb.g : 0)
  const b = clampByte(rgb ? rgb.b : 0)
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`
}

/** 解析 #RGB / #RRGGBB（可省略 #，忽略大小写），非法返回 null */
export function hexToRgb(hex: string): Rgb | null {
  if (typeof hex !== 'string') return null
  let value = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2]
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  }
}

/** RGB 转 HSL，h/s/l 均四舍五入为整数，便于展示与断言 */
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = clampByte(rgb ? rgb.r : 0) / 255
  const g = clampByte(rgb ? rgb.g : 0) / 255
  const b = clampByte(rgb ? rgb.b : 0) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/** 计算矩形区域平均色（RGBA 四字节一像素，忽略 alpha），越界自动裁剪，异常返回黑色 */
export function averageColor(
  pixels: ArrayLike<number>,
  width: number,
  rect: { x: number; y: number; w: number; h: number }
): Rgb {
  const w = Math.floor(width)
  if (!Number.isFinite(width) || w <= 0 || !pixels || pixels.length < 4 || !rect) {
    return { ...BLACK }
  }
  const height = Math.floor(pixels.length / 4 / w)
  if (height <= 0) return { ...BLACK }
  const x0 = clampInt(Math.floor(rect.x), 0, w)
  const y0 = clampInt(Math.floor(rect.y), 0, height)
  const x1 = clampInt(Math.ceil(rect.x + rect.w), 0, w)
  const y1 = clampInt(Math.ceil(rect.y + rect.h), 0, height)
  if (x1 <= x0 || y1 <= y0) return { ...BLACK }
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4
      if (i + 2 >= pixels.length) break
      sumR += clampByte(pixels[i])
      sumG += clampByte(pixels[i + 1])
      sumB += clampByte(pixels[i + 2])
      count++
    }
  }
  if (count === 0) return { ...BLACK }
  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count)
  }
}

/** 把图分成 grid×grid 个格子，返回每格平均色，长度 grid*grid；非法输入返回 [] */
export function buildColorGrid(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  grid: number
): Rgb[] {
  const w = Math.floor(width)
  const h = Math.floor(height)
  const g = Math.floor(grid)
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(grid) ||
    w <= 0 ||
    h <= 0 ||
    g <= 0 ||
    !pixels ||
    pixels.length < 4
  ) {
    return []
  }
  const result: Rgb[] = []
  for (let gy = 0; gy < g; gy++) {
    const y0 = Math.round((gy * h) / g)
    const y1 = Math.round(((gy + 1) * h) / g)
    for (let gx = 0; gx < g; gx++) {
      const x0 = Math.round((gx * w) / g)
      const x1 = Math.round(((gx + 1) * w) / g)
      result.push(averageColor(pixels, w, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }))
    }
  }
  return result
}

export interface DominantColor {
  rgb: Rgb
  hex: string
  /** 占比，百分比数值（保留 1 位小数） */
  ratio: number
}

/**
 * 按 4bit 量化（每通道 16 级）做直方图统计，返回占比最高的若干颜色。
 * 返回色取量化桶的代表值，ratio 为百分比数值。空像素、非法 count 返回 []。
 */
export function extractDominant(pixels: ArrayLike<number>, count = 6): DominantColor[] {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (!pixels || pixels.length < 4 || n === 0) return []
  const total = Math.floor(pixels.length / 4)
  if (total <= 0) return []
  const histogram = new Map<number, number>()
  for (let p = 0; p < total; p++) {
    const i = p * 4
    const qR = clampByte(pixels[i]) >> 4
    const qG = clampByte(pixels[i + 1]) >> 4
    const qB = clampByte(pixels[i + 2]) >> 4
    const key = qR * 256 + qG * 16 + qB
    histogram.set(key, (histogram.get(key) || 0) + 1)
  }
  const entries = Array.from(histogram.entries())
  entries.sort((a, b) => b[1] - a[1] || a[0] - b[0])
  return entries.slice(0, n).map(([key, c]) => {
    const qR = Math.floor(key / 256)
    const qG = Math.floor(key / 16) % 16
    const qB = key % 16
    const rgb: Rgb = { r: qR * 17, g: qG * 17, b: qB * 17 }
    return {
      rgb,
      hex: rgbToHex(rgb),
      ratio: Math.round((c / total) * 1000) / 10
    }
  })
}

/** 用 HSL 粗略映射色相名 + 明度词，返回可读中文描述，如「明亮的蓝绿色」 */
export function describeColor(rgb: Rgb): string {
  const { h, s, l } = rgbToHsl(rgb)
  if (s < 12) {
    if (l < 12) return '近黑色'
    if (l < 38) return '深灰色'
    if (l < 68) return '灰色'
    if (l < 90) return '浅灰色'
    return '近白色'
  }
  let hue: string
  if (h < 15 || h >= 345) hue = '红色'
  else if (h < 45) hue = '橙色'
  else if (h < 70) hue = '黄色'
  else if (h < 160) hue = '绿色'
  else if (h < 200) hue = '蓝绿色'
  else if (h < 255) hue = '蓝色'
  else if (h < 290) hue = '紫色'
  else hue = '紫红色'

  let mod: string
  if (l < 20) mod = '深暗的'
  else if (l < 38) mod = '深'
  else if (l < 58) mod = s < 45 ? '柔和的' : '鲜艳的'
  else if (l < 80) mod = '明亮的'
  else mod = '浅'
  const gray = s < 28 ? '灰' : ''
  return `${mod}${gray}${hue}`
}

/** 按感知亮度选择叠加在色块上的前景文字颜色 */
export function contrastTextColor(rgb: Rgb): '#FFFFFF' | '#222222' {
  const r = clampByte(rgb ? rgb.r : 0)
  const g = clampByte(rgb ? rgb.g : 0)
  const b = clampByte(rgb ? rgb.b : 0)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#222222' : '#FFFFFF'
}

import { describe, expect, it } from 'vitest'
import {
  averageColor,
  buildColorGrid,
  contrastTextColor,
  describeColor,
  extractDominant,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  type Rgb
} from '@/tools/image-color-picker/logic'

/** 把 RGB 列表转成 RGBA 四字节一像素的数据 */
function px(colors: Rgb[]): number[] {
  const data: number[] = []
  for (const c of colors) data.push(c.r, c.g, c.b, 255)
  return data
}

const RED: Rgb = { r: 255, g: 0, b: 0 }
const GREEN: Rgb = { r: 0, g: 255, b: 0 }
const BLUE: Rgb = { r: 0, g: 0, b: 255 }
const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

describe('rgbToHex / hexToRgb', () => {
  it('RGB 转大写 #RRGGBB，并收敛越界与非法通道值', () => {
    expect(rgbToHex(RED)).toBe('#FF0000')
    expect(rgbToHex({ r: 0, g: 128, b: 255 })).toBe('#0080FF')
    expect(rgbToHex(BLACK)).toBe('#000000')
    expect(rgbToHex(WHITE)).toBe('#FFFFFF')
    expect(rgbToHex({ r: -10, g: 300, b: NaN })).toBe('#00FF00')
    expect(rgbToHex(null as unknown as Rgb)).toBe('#000000')
  })

  it('解析 6 位、3 位、无 #、小写十六进制', () => {
    expect(hexToRgb('#FF0000')).toEqual(RED)
    expect(hexToRgb('0080ff')).toEqual({ r: 0, g: 128, b: 255 })
    expect(hexToRgb('#F0A')).toEqual({ r: 255, g: 0, b: 170 })
    expect(hexToRgb('#FFF')).toEqual(WHITE)
  })

  it('非法输入返回 null', () => {
    expect(hexToRgb('#GGGGGG')).toBeNull()
    expect(hexToRgb('#12345')).toBeNull()
    expect(hexToRgb('')).toBeNull()
    expect(hexToRgb('   ')).toBeNull()
    expect(hexToRgb(123 as unknown as string)).toBeNull()
  })
})

describe('rgbToHsl', () => {
  it('纯色与灰阶的标准值', () => {
    expect(rgbToHsl(RED)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(GREEN)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(BLUE)).toEqual({ h: 240, s: 100, l: 50 })
    expect(rgbToHsl(WHITE)).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl(BLACK)).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
  })

  it('非法输入安全降级为黑色 HSL', () => {
    expect(rgbToHsl(null as unknown as Rgb)).toEqual({ h: 0, s: 0, l: 0 })
  })
})

describe('averageColor', () => {
  const image2x2 = px([RED, RED, BLUE, BLUE])

  it('全图与局部平均色', () => {
    expect(averageColor(image2x2, 2, { x: 0, y: 0, w: 2, h: 2 })).toEqual({ r: 128, g: 0, b: 128 })
    expect(averageColor(image2x2, 2, { x: 0, y: 0, w: 2, h: 1 })).toEqual(RED)
    expect(averageColor(image2x2, 2, { x: 1, y: 0, w: 1, h: 1 })).toEqual(RED)
  })

  it('越界 rect 自动裁剪，不抛异常', () => {
    expect(averageColor(image2x2, 2, { x: 10, y: 10, w: 5, h: 5 })).toEqual(BLACK)
    expect(averageColor(image2x2, 2, { x: -2, y: 0, w: 4, h: 1 })).toEqual(RED)
  })

  it('空像素、非法宽高、非法 rect 返回黑色', () => {
    expect(averageColor([], 2, { x: 0, y: 0, w: 2, h: 2 })).toEqual(BLACK)
    expect(averageColor(image2x2, 0, { x: 0, y: 0, w: 2, h: 2 })).toEqual(BLACK)
    expect(averageColor(image2x2, NaN, { x: 0, y: 0, w: 2, h: 2 })).toEqual(BLACK)
    expect(averageColor(image2x2, 2, { x: NaN, y: 0, w: NaN, h: 2 })).toEqual(BLACK)
    expect(averageColor(image2x2, 2, { x: 0, y: 0, w: 0, h: 0 })).toEqual(BLACK)
  })
})

describe('buildColorGrid', () => {
  it('按 grid×grid 返回每格平均色，长度 grid*grid', () => {
    const red4x4 = px(new Array(16).fill(RED))
    expect(buildColorGrid(red4x4, 4, 4, 2)).toEqual([RED, RED, RED, RED])
    expect(buildColorGrid(red4x4, 4, 4, 3)).toHaveLength(9)
  })

  it('四象限颜色落在正确的格子', () => {
    const data = px([RED, GREEN, BLUE, WHITE])
    expect(buildColorGrid(data, 2, 2, 2)).toEqual([RED, GREEN, BLUE, WHITE])
  })

  it('非法 grid 与空像素返回 []', () => {
    const red4x4 = px(new Array(16).fill(RED))
    expect(buildColorGrid(red4x4, 4, 4, 0)).toEqual([])
    expect(buildColorGrid(red4x4, 4, 4, -1)).toEqual([])
    expect(buildColorGrid(red4x4, 4, 4, NaN)).toEqual([])
    expect(buildColorGrid([], 4, 4, 2)).toEqual([])
    expect(buildColorGrid(red4x4, 0, 4, 2)).toEqual([])
  })
})

describe('extractDominant', () => {
  it('单色图占比 100%，返回量化代表色', () => {
    const data = px([RED, RED, RED, RED])
    const result = extractDominant(data)
    expect(result).toHaveLength(1)
    expect(result[0].hex).toBe('#FF0000')
    expect(result[0].rgb).toEqual(RED)
    expect(result[0].ratio).toBe(100)
  })

  it('两色各占一半，占比均为 50%', () => {
    const data = px([RED, RED, BLUE, BLUE])
    const result = extractDominant(data, 6)
    expect(result).toHaveLength(2)
    expect(result.map((item) => item.hex).sort()).toEqual(['#0000FF', '#FF0000'])
    expect(result.every((item) => item.ratio === 50)).toBe(true)
  })

  it('count 限制返回条数', () => {
    const data = px([RED, GREEN, BLUE, WHITE])
    expect(extractDominant(data)).toHaveLength(4)
    expect(extractDominant(data, 3)).toHaveLength(3)
    expect(extractDominant(data, 10)).toHaveLength(4)
  })

  it('空像素与非法 count 返回 []', () => {
    expect(extractDominant([])).toEqual([])
    expect(extractDominant(px([RED]), 0)).toEqual([])
    expect(extractDominant(px([RED]), -3)).toEqual([])
    expect(extractDominant(px([RED]), NaN)).toEqual([])
  })
})

describe('describeColor / contrastTextColor', () => {
  it('灰阶与色相的中文描述', () => {
    expect(describeColor(WHITE)).toBe('近白色')
    expect(describeColor(BLACK)).toBe('近黑色')
    expect(describeColor({ r: 128, g: 128, b: 128 })).toBe('灰色')
    expect(describeColor(RED)).toContain('红')
    expect(describeColor(GREEN)).toContain('绿')
    expect(describeColor(BLUE)).toContain('蓝')
    expect(describeColor({ r: 140, g: 220, b: 220 })).toBe('明亮的蓝绿色')
  })

  it('按亮度选择前景文字颜色', () => {
    expect(contrastTextColor(WHITE)).toBe('#222222')
    expect(contrastTextColor(BLACK)).toBe('#FFFFFF')
    expect(contrastTextColor({ r: 255, g: 255, b: 0 })).toBe('#222222')
    expect(contrastTextColor(RED)).toBe('#FFFFFF')
  })
})

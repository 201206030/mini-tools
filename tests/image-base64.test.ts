import { describe, expect, it } from 'vitest'
import {
  MAX_BASE64_CHARS,
  MAX_DATA_URI_PREVIEW,
  buildCssBackground,
  buildDataUri,
  describeBase64,
  guessMimeType,
  validateBase64Length
} from '@/tools/image-to-base64/logic'

describe('buildDataUri', () => {
  it('拼接标准 data URI', () => {
    expect(buildDataUri('image/png', 'TWFu')).toBe('data:image/png;base64,TWFu')
    expect(buildDataUri('image/jpeg', '/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ')
  })

  it('空 mime 回退 image/png，空 base64 返回空字符串', () => {
    expect(buildDataUri('', 'TWFu')).toBe('data:image/png;base64,TWFu')
    expect(buildDataUri('  image/webp  ', 'AAA')).toBe('data:image/webp;base64,AAA')
    expect(buildDataUri('image/png', '')).toBe('')
  })

  it('非法参数安全降级', () => {
    expect(buildDataUri(123 as unknown as string, 'TWFu')).toBe('data:image/png;base64,TWFu')
    expect(buildDataUri('image/png', null as unknown as string)).toBe('')
  })
})

describe('guessMimeType', () => {
  it('按后缀识别常见格式，忽略大小写', () => {
    expect(guessMimeType('a.PNG')).toBe('image/png')
    expect(guessMimeType('photo.JPG')).toBe('image/jpeg')
    expect(guessMimeType('x.jpeg')).toBe('image/jpeg')
    expect(guessMimeType('x.GIF')).toBe('image/gif')
    expect(guessMimeType('x.webp')).toBe('image/webp')
    expect(guessMimeType('x.BMP')).toBe('image/bmp')
  })

  it('忽略查询串与片段', () => {
    expect(guessMimeType('https://x.com/a.PNG?w=100&h=2')).toBe('image/png')
    expect(guessMimeType('wxfile://tmp_abc.JPEG#frag')).toBe('image/jpeg')
  })

  it('无法识别时返回 fallback', () => {
    expect(guessMimeType('file.svg')).toBe('image/png')
    expect(guessMimeType('file.svg', 'application/octet-stream')).toBe('application/octet-stream')
    expect(guessMimeType('noext')).toBe('image/png')
    expect(guessMimeType('')).toBe('image/png')
    expect(guessMimeType(123 as unknown as string)).toBe('image/png')
  })
})

describe('describeBase64', () => {
  it('字符数、估算字节数、补位符与预览正确', () => {
    expect(describeBase64('TWFu')).toEqual({ chars: 4, bytes: 3, padded: false, preview: 'TWFu' })
    expect(describeBase64('TWE=')).toEqual({ chars: 4, bytes: 2, padded: true, preview: 'TWE=' })
    expect(describeBase64('TQ==')).toEqual({ chars: 4, bytes: 1, padded: true, preview: 'TQ==' })
  })

  it('空串与非法输入安全降级', () => {
    expect(describeBase64('')).toEqual({ chars: 0, bytes: 0, padded: false, preview: '' })
    expect(describeBase64(null as unknown as string)).toEqual({ chars: 0, bytes: 0, padded: false, preview: '' })
  })

  it('超长文本截断并追加省略号', () => {
    const text = 'A'.repeat(MAX_DATA_URI_PREVIEW + 50)
    const result = describeBase64(text)
    expect(result.chars).toBe(MAX_DATA_URI_PREVIEW + 50)
    expect(result.preview.length).toBe(MAX_DATA_URI_PREVIEW + 1)
    expect(result.preview.endsWith('…')).toBe(true)
    expect(describeBase64('A'.repeat(MAX_DATA_URI_PREVIEW)).preview).not.toContain('…')
  })
})

describe('validateBase64Length', () => {
  it('正常长度返回 null', () => {
    expect(validateBase64Length('')).toBeNull()
    expect(validateBase64Length('TWFu')).toBeNull()
    expect(validateBase64Length('a'.repeat(MAX_BASE64_CHARS))).toBeNull()
  })

  it('过长给出中文提示', () => {
    expect(validateBase64Length('a'.repeat(MAX_BASE64_CHARS + 1))).toContain('过长')
  })
})

describe('buildCssBackground', () => {
  it('生成 background-image 声明', () => {
    const css = buildCssBackground('data:image/png;base64,AAA')
    expect(css).toBe('background-image: url("data:image/png;base64,AAA")')
    expect(css.startsWith('background-image: url("')).toBe(true)
    expect(css.endsWith('")')).toBe(true)
  })

  it('转义引号、反斜杠与换行', () => {
    expect(buildCssBackground('a"b')).toContain('\\"')
    expect(buildCssBackground('a\\b')).toContain('\\\\')
    expect(buildCssBackground('a\nb')).toContain('\\n')
  })

  it('空串与非法输入仍返回完整声明', () => {
    expect(buildCssBackground('')).toBe('background-image: url("")')
    expect(buildCssBackground(null as unknown as string)).toBe('background-image: url("")')
  })
})

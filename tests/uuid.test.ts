import { describe, expect, it } from 'vitest'
import { MAX_UUID_COUNT, generateUuids, uuidFromBytes } from '@/tools/uuid-generator/logic'
import type { CalcResult } from '@/types/common'

function must<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(result.message)
  return result.value
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('UUID v4 生成', () => {
  it('固定字节可得到规范的 v4 与 variant 位', () => {
    expect(uuidFromBytes(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000')
    const varied = uuidFromBytes(new Uint8Array(Array.from({ length: 16 }, (_, i) => i * 16 + 15)))
    expect(varied).toMatch(UUID_V4)
    expect(varied[14]).toBe('4')
    expect(['8', '9', 'a', 'b']).toContain(varied[19])
  })

  it('批量生成互不重复的标准 UUID', async () => {
    const result = must(await generateUuids(5))
    expect(result.items).toHaveLength(5)
    expect(new Set(result.items).size).toBe(5)
    for (const item of result.items) expect(item).toMatch(UUID_V4)
  })

  it('支持大写与去掉横线', async () => {
    const result = must(await generateUuids(2, true, true))
    for (const item of result.items) {
      expect(item).toHaveLength(32)
      expect(item).toBe(item.toUpperCase())
      expect(item).not.toContain('-')
    }
  })

  it('数量边界校验', async () => {
    expect((await generateUuids(0)).ok).toBe(false)
    expect((await generateUuids(MAX_UUID_COUNT + 1)).ok).toBe(false)
    expect((await generateUuids(-1)).ok).toBe(false)
    expect(must(await generateUuids(MAX_UUID_COUNT)).items).toHaveLength(MAX_UUID_COUNT)
  })
})

import type { CalcResult } from '@/types/common'
import { secureRandomBytes } from '@/utils/random'

export const MAX_UUID_COUNT = 20

export interface UuidResult {
  items: string[]
  /** 是否使用了系统加密安全随机源 */
  secure: boolean
}

/**
 * 由 16 字节生成标准 UUID v4 字符串。
 * 纯函数，便于单元测试；随机源由调用方提供。
 */
export function uuidFromBytes(source: Uint8Array): string {
  const bytes = Array.from(source.slice(0, 16))
  while (bytes.length < 16) bytes.push(0)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function generateUuids(
  count: number,
  uppercase = false,
  noDash = false
): Promise<CalcResult<UuidResult>> {
  const total = Math.floor(count)
  if (!Number.isFinite(total) || total < 1 || total > MAX_UUID_COUNT) {
    return { ok: false, message: `生成数量需在 1 到 ${MAX_UUID_COUNT} 之间` }
  }

  const { bytes, secure } = await secureRandomBytes(total * 16)
  const items: string[] = []
  for (let i = 0; i < total; i += 1) {
    let uuid = uuidFromBytes(bytes.slice(i * 16, (i + 1) * 16))
    if (noDash) uuid = uuid.replace(/-/g, '')
    if (uppercase) uuid = uuid.toUpperCase()
    items.push(uuid)
  }
  return { ok: true, value: { items, secure } }
}

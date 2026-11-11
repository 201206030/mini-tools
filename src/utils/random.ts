/**
 * 随机数基础能力。
 * 优先使用微信小程序的 wx.getRandomValues（加密安全），其次 Web Crypto；
 * 都不可用时会明确返回 secure=false，调用方必须提示用户，不得宣传为安全随机数。
 */

export interface SecureBytes {
  bytes: Uint8Array
  secure: boolean
}

function fromBuffer(value: unknown): Uint8Array | null {
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength))
  }
  if (value && typeof value === 'object') {
    const buffer = (value as any).buffer
    if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer)
  }
  return null
}

export async function secureRandomBytes(length: number): Promise<SecureBytes> {
  const size = Math.max(1, Math.round(length))
  const globalObject: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {}

  // 1) 微信小程序加密安全随机数（基础库 2.15.0+）
  const wxObject = globalObject.wx
  if (wxObject && typeof wxObject.getRandomValues === 'function') {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        wxObject.getRandomValues({ length: size, success: resolve, fail: reject })
      })
      const bytes = fromBuffer(result && (result.randomValues || result))
      if (bytes && bytes.length >= size) {
        return { bytes: bytes.slice(0, size), secure: true }
      }
    } catch {
      // 继续尝试下一种方式
    }
  }

  // 2) 标准 Web Crypto（H5 或支持的实现）
  const cryptoObject = globalObject.crypto
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(size)
      cryptoObject.getRandomValues(bytes)
      return { bytes, secure: true }
    } catch {
      // 继续降级
    }
  }

  // 3) 兜底：普通伪随机数，明确标记为不安全
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return { bytes, secure: false }
}

/**
 * 基于随机字节流生成无偏整数 [0, maxExclusive)，使用拒绝采样避免取模偏差。
 * 字节耗尽时会退化为 Math.random，并通过 isSecure() 反映出来。
 */
export function createRandomIntSource(bytes: Uint8Array, secure: boolean) {
  let cursor = 0
  let degraded = !secure

  function nextByte(): number {
    if (cursor < bytes.length) return bytes[cursor++]
    degraded = true
    return Math.floor(Math.random() * 256)
  }

  function below(maxExclusive: number): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 1) return 0
    const max = Math.floor(maxExclusive)
    if (max <= 256) {
      const limit = 256 - (256 % max)
      let value = nextByte()
      while (value >= limit) value = nextByte()
      return value % max
    }
    const byteCount = Math.min(6, Math.ceil(Math.ceil(Math.log2(max)) / 8))
    const range = Math.pow(2, byteCount * 8)
    const limit = range - (range % max)
    let value = 0
    do {
      value = 0
      for (let i = 0; i < byteCount; i += 1) value = value * 256 + nextByte()
    } while (value >= limit)
    return value % max
  }

  return {
    below,
    isSecure: () => secure && !degraded,
    isDegraded: () => degraded
  }
}

/** 洗牌（Fisher-Yates），使用调用方提供的 [0,1) 随机源 */
export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const result = list.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

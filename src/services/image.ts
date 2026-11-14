import { getCurrentInstance } from 'vue'
import { askConfirm, showError, showInfo, showSuccess } from './feedback'

/** 单张图片上限：超过后在内存中解码容易触发小程序内存告警 */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
/** 画布单边上限，控制解码与导出时的内存占用 */
export const MAX_CANVAS_SIDE = 4096
/** 图片转 Base64 的输入上限：1MB，避免生成过长的文本 */
export const MAX_BASE64_BYTES = 1024 * 1024

export interface PickedImage {
  path: string
  size: number
  width: number
  height: number
  type: string
}

export interface Canvas2DContext {
  canvas: any
  ctx: any
  width: number
  height: number
  dpr: number
}

export interface Canvas2DHelper {
  select: (selector: string) => Promise<Canvas2DContext>
  toTempFile: (
    canvas: any,
    width: number,
    height: number,
    options?: { destWidth?: number; destHeight?: number; fileType?: 'jpg' | 'png'; quality?: number }
  ) => Promise<string>
  proxy: any
}

/** 选择一张本地图片，并读取真实尺寸与文件大小 */
export function chooseImage(): Promise<PickedImage> {
  return new Promise((resolve, reject) => {
    try {
      uni.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album'],
        success: (res) => {
          const path = (res.tempFilePaths && res.tempFilePaths[0]) || ''
          if (!path) {
            reject(new Error('未选择图片'))
            return
          }
          uni.getImageInfo({
            src: path,
            success: (info) => {
              const base: PickedImage = {
                path,
                size: 0,
                width: Number(info.width) || 0,
                height: Number(info.height) || 0,
                type: String(info.type || '')
              }
              try {
                uni.getFileInfo({
                  filePath: path,
                  success: (file) => {
                    const size = Number(file.size) || 0
                    if (size > MAX_IMAGE_BYTES) {
                      reject(new Error('图片超过 20MB，请选择小一些的图片'))
                      return
                    }
                    resolve({ ...base, size })
                  },
                  fail: () => resolve(base)
                })
              } catch {
                resolve(base)
              }
            },
            fail: () => reject(new Error('读取图片信息失败'))
          })
        },
        fail: (err) => {
          const message = String((err && (err as any).errMsg) || '')
          reject(new Error(message.indexOf('cancel') !== -1 ? 'CANCELLED' : '选择图片失败'))
        }
      })
    } catch {
      reject(new Error('选择图片失败'))
    }
  })
}

/** 读取本地文件的真实字节数 */
export function getFileSize(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      uni.getFileInfo({
        filePath,
        success: (res) => resolve(Number(res.size) || 0),
        fail: () => resolve(0)
      })
    } catch {
      resolve(0)
    }
  })
}

/** 使用小程序本地压缩能力（quality: 0-100） */
export function compressImage(src: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      uni.compressImage({
        src,
        quality: Math.max(1, Math.min(100, Math.round(quality))),
        success: (res) => resolve(String(res.tempFilePath || '')),
        fail: () => reject(new Error('压缩失败'))
      })
    } catch {
      reject(new Error('压缩失败'))
    }
  })
}

/** 读取相册权限状态：true 已授权 / false 曾明确拒绝 / undefined 尚未申请 */
function readAlbumSetting(): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    try {
      uni.getSetting({
        success: (res) => {
          const auth = res.authSetting || {}
          resolve(auth['scope.writePhotosAlbum'] as boolean | undefined)
        },
        fail: () => resolve(undefined)
      })
    } catch {
      resolve(undefined)
    }
  })
}

function requestAlbumAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      uni.authorize({
        scope: 'scope.writePhotosAlbum',
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } catch {
      resolve(false)
    }
  })
}

function openSettingPage(): void {
  try {
    uni.openSetting({})
  } catch {
    // 忽略
  }
}

/**
 * 保存图片到相册。
 * 首次使用才申请权限；被拒绝后给出明确说明并提供「去设置」重新授权入口。
 */
export async function saveImageToAlbum(filePath: string): Promise<boolean> {
  if (!filePath) {
    showError('请先生成图片')
    return false
  }

  const setting = await readAlbumSetting()
  let authorized = false
  if (setting === true) {
    authorized = true
  } else if (setting === undefined) {
    authorized = await requestAlbumAuth()
  }

  if (!authorized) {
    const go = await askConfirm({
      title: '需要相册权限',
      content: savingPermissionText,
      confirmText: '去设置'
    })
    if (go) openSettingPage()
    showInfo('未获得相册权限，图片未保存')
    return false
  }

  return new Promise((resolve) => {
    try {
      uni.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          showSuccess('已保存到相册')
          resolve(true)
        },
        fail: () => {
          showError('保存失败，请重试')
          resolve(false)
        }
      })
    } catch {
      showError('保存失败，请重试')
      resolve(false)
    }
  })
}

const savingPermissionText =
  '保存图片需要「添加到相册」权限。请在设置中开启后重试。一键工具狗不会读取或上传相册中的其他照片。'

/**
 * Canvas 2D 辅助器。必须在 <script setup> 同步阶段调用，以便捕获组件实例。
 * 依赖微信基础库 2.9.0+ 的 canvas type="2d" 能力。
 */
export function useCanvas2d(): Canvas2DHelper {
  const proxy = getCurrentInstance()?.proxy

  const select = (selector: string): Promise<Canvas2DContext> =>
    new Promise((resolve, reject) => {
      try {
        // @dcloudio/types 对 SelectorQuery.fields 的声明偏旧，这里用宽松类型调用运行时真实 API
        const query: any = proxy ? uni.createSelectorQuery().in(proxy) : uni.createSelectorQuery()
        query
          .select(selector)
          .fields({ node: true, size: true })
          .exec((res: any[]) => {
            const item = res && res[0]
            if (!item || !item.node || typeof item.node.getContext !== 'function') {
              reject(new Error('CANVAS_2D_UNAVAILABLE'))
              return
            }
            let dpr = 1
            try {
              dpr = Number(uni.getSystemInfoSync().pixelRatio) || 1
            } catch {
              dpr = 1
            }
            resolve({
              canvas: item.node,
              ctx: item.node.getContext('2d'),
              width: Number(item.width) || 0,
              height: Number(item.height) || 0,
              dpr
            })
          })
      } catch {
        reject(new Error('CANVAS_2D_UNAVAILABLE'))
      }
    })

  const toTempFile = (
    canvas: any,
    width: number,
    height: number,
    options: { destWidth?: number; destHeight?: number; fileType?: 'jpg' | 'png'; quality?: number } = {}
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      try {
        // Canvas 2D 需要传 canvas 节点，旧版类型声明仍要求 canvasId，故此处绕过声明
        ;(uni as any).canvasToTempFilePath(
          {
            canvas,
            x: 0,
            y: 0,
            width,
            height,
            destWidth: options.destWidth || width,
            destHeight: options.destHeight || height,
            fileType: options.fileType || 'png',
            quality: options.quality === undefined ? 1 : Math.max(0, Math.min(1, options.quality)),
            success: (res: any) => resolve(String((res && res.tempFilePath) || '')),
            fail: () => reject(new Error('导出图片失败'))
          },
          proxy
        )
      } catch {
        reject(new Error('导出图片失败'))
      }
    })

  return { select, toTempFile, proxy }
}

/** 在 Canvas 2D 中加载本地图片 */
export function loadCanvasImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const image = canvas.createImage()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('图片解码失败'))
      image.src = src
    } catch {
      reject(new Error('图片解码失败'))
    }
  })
}

/** 把像素尺寸限制在安全范围内，同时尽量保持比例 */
export function clampCanvasSize(width: number, height: number): { width: number; height: number } {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const ratio = Math.min(1, MAX_CANVAS_SIDE / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio))
  }
}

/**
 * 以 base64 读取本地图片文件，返回不带 data: 前缀的纯 base64 字符串。
 * 先用 getFileInfo 判定大小，超过 maxBytes 直接拒绝；任何失败路径都给出中文 Error。
 */
export function readImageAsBase64(filePath: string, maxBytes = MAX_BASE64_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = (message: string) => reject(new Error(message))
    if (!filePath) {
      fail('图片路径为空，请重新选择图片')
      return
    }
    const readContent = () => {
      try {
        if (typeof (uni as any).getFileSystemManager !== 'function') {
          fail('当前环境不支持读取本地文件，请升级微信后重试')
          return
        }
        const manager = (uni as any).getFileSystemManager()
        if (!manager || typeof manager.readFile !== 'function') {
          fail('当前环境不支持读取本地文件，请升级微信后重试')
          return
        }
        manager.readFile({
          filePath,
          encoding: 'base64',
          success: (res: any) => {
            const data = String((res && res.data) || '')
            if (!data) {
              fail('图片内容为空，请重新选择图片')
              return
            }
            resolve(data)
          },
          fail: () => fail('读取图片内容失败，请重试')
        })
      } catch {
        fail('读取图片内容失败，请重试')
      }
    }
    try {
      uni.getFileInfo({
        filePath,
        success: (file: any) => {
          const size = Number(file && file.size) || 0
          if (size > maxBytes) {
            fail('图片超过 1MB，Base64 文本会很长，请选择小一些的图片')
            return
          }
          readContent()
        },
        fail: () => fail('读取图片大小失败，请重试')
      })
    } catch {
      fail('读取图片大小失败，请重试')
    }
  })
}

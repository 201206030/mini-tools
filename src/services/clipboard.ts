import { showError, showSuccess } from './feedback'

/** 真实调用微信小程序剪贴板能力，不做假成功提示 */
export function copyText(text: string): Promise<boolean> {
  const value = text === null || text === undefined ? '' : String(text)
  if (!value) {
    showError('没有可复制的内容')
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    try {
      uni.setClipboardData({
        data: value,
        success: () => {
          showSuccess('已复制')
          resolve(true)
        },
        fail: () => {
          showError('复制失败，请重试')
          resolve(false)
        }
      })
    } catch {
      showError('复制失败，请重试')
      resolve(false)
    }
  })
}

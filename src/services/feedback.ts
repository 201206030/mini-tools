/** 统一的提示与确认封装，所有提示文案均为简体中文 */
export function showInfo(message: string): void {
  try {
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } catch {
    // 提示能力不可用时静默降级
  }
}

export function showSuccess(message = '操作成功'): void {
  try {
    uni.showToast({ title: message, icon: 'success', duration: 1800 })
  } catch {
    // 忽略
  }
}

export function showError(message = '操作失败，请重试'): void {
  showInfo(message)
}

export function showLoading(title = '处理中'): void {
  try {
    uni.showLoading({ title, mask: true })
  } catch {
    // 忽略
  }
}

export function hideLoading(): void {
  try {
    uni.hideLoading()
  } catch {
    // 忽略
  }
}

export interface ConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
}

/** 明确使用回调方式包装，避免不同基础库对 Promise 化返回值格式的差异 */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      uni.showModal({
        title: options.title || '提示',
        content: options.content,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        confirmColor: options.confirmColor || '#3EAF7C',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false)
      })
    } catch {
      resolve(false)
    }
  })
}

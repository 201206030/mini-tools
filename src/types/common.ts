/** 通用选择项 */
export interface SelectOption<T extends string | number = string> {
  label: string
  value: T
}

/** 轻量结果类型，用于纯函数返回可预期的失败信息 */
export type CalcResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

/** 用户偏好设置（仅保存非敏感偏好，不保存输入内容） */
export type Prefs = Record<string, string | number | boolean>
